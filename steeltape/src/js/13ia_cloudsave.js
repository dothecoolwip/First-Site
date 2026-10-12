// Steel & Tape cloud-save synchronisation. Existing st-* data remains the local/offline save.
// Every saved game key is included so future shops, inventories, upgrades and activities are covered.
// Linked cloud revisions use server-side compare-and-swap and an archive of the previous revision.
const CLOUD = { uid:null, revision:0, ready:false, holding:false, loading:null, busy:false, timer:null, lastHash:'', optedOut:false, applying:false };
const CLOUD_META = 'steeltape-cloud-link-v1';
const CLOUD_BACKUP = 'steeltape-local-backup-v1-';

const CLOUD_GUEST_BACKUP = 'steeltape-unlinked-guest-save-v1-';
function cloudPrepareGuestLink() {
  // A name is not proof of account ownership. Before sign-in preserve the ENTIRE
  // unlinked game save on this device, then attach it only to the authenticated UID.
  try {
    const snapshot = cloudSnapshot(), hash = cloudHash(snapshot);
    if (!cloudMeaningful(snapshot)) return true;
    const prior = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CLOUD_GUEST_BACKUP)) prior.push(key);
    }
    prior.sort();
    if (prior.length) {
      try {
        const existing = JSON.parse(localStorage.getItem(prior[prior.length - 1]));
        if (existing && existing.hash === hash) return true;
      } catch (e) { /* make a fresh copy */ }
    }
    const key = CLOUD_GUEST_BACKUP + new Date().toISOString() + '-' + Math.floor(Math.random() * 10000);
    // Write new backup FIRST; never replace the only prior backup in place.
    localStorage.setItem(key, JSON.stringify({createdAt:new Date().toISOString(),hash,snapshot}));
    while (prior.length > 1) localStorage.removeItem(prior.shift());
    return true;
  } catch (error) {
    console.warn('Could not create additional guest backup. Existing local game data was not changed.',error);
    return false;
  }
}
function cloudReadMeta() { try { return JSON.parse(localStorage.getItem(CLOUD_META) || 'null'); } catch (e) { return null; } }
function cloudWriteMeta(uid, revision, hash) {
  localStorage.setItem(CLOUD_META, JSON.stringify({ uid, revision, hash, at:new Date().toISOString() }));
}
function cloudSnapshot() {
  // All persistent gameplay keys (including ones added in later releases) form ONE
  // atomic versioned snapshot. Never silently omit a key that cannot be read.
  if (typeof CAREER !== 'undefined') {
    const career = JSON.stringify(CAREER);
    if (!career) throw Error('Could not serialize your character; nothing was uploaded.');
    localStorage.setItem('st-career', career);
  }
  const snapshot = {};
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('st-') && !key.startsWith('st-cloud-')) keys.push(key);
  }
  keys.sort();
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw === null) throw Error('A save section disappeared while preparing your backup: ' + key);
    try { snapshot[key] = JSON.parse(raw); }
    catch (error) { throw Error('Cannot safely back up unreadable section ' + key + '. Your local data was preserved.'); }
  }
  if (!snapshot['st-career'] || typeof snapshot['st-career'] !== 'object' || Array.isArray(snapshot['st-career']))
    throw Error('The character save is missing or invalid. Nothing was uploaded.');
  return snapshot;
}
function cloudCanonical(value) {
  if (Array.isArray(value)) return value.map(cloudCanonical);
  if (value && typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value).sort()) result[key] = cloudCanonical(value[key]);
    return result;
  }
  return value;
}
function cloudHash(snapshot) {
  // Two independent 32-bit checksums plus length, rather than storing another complete
  // copy of the player's save inside the sync metadata (which could exhaust localStorage).
  const serialized = JSON.stringify(cloudCanonical(snapshot));
  let a = 2166136261, b = 0x9e3779b9;
  for (let i = 0; i < serialized.length; i++) {
    const ch = serialized.charCodeAt(i);
    a = Math.imul(a ^ ch, 16777619);
    b = Math.imul(b ^ ch, -2048144789) ^ (b >>> 13);
  }
  return serialized.length + ':' + (a >>> 0).toString(16) + ':' + (b >>> 0).toString(16);
}
function cloudMeaningful(snapshot) {
  const c = snapshot['st-career'];
  if (c && typeof c === 'object') {
    const level = Number(c.level || 1), purse = Number(c.purse == null ? 150 : c.purse);
    if (level > 1 || purse !== 150 || Number(c.xp || 0) > 0 || Number(c.sp || 0) > 0) return true;
    if (c.ach && Object.keys(c.ach).length) return true;
    if (c.stats && Object.values(c.stats).some(value => Number(value) > 0)) return true;
    if (c.upgrades && Object.values(c.upgrades).some(value => Number(value) > 0)) return true;
    // Shop and smith default objects are populated on a brand-new device: their
    // mere presence is NOT evidence of actual player progress.
    const shop = c.shop || {};
    if (Number(shop.spent || 0) > 0 ||
        ['wq','aq','owned','boost','lv'].some(key =>
          shop[key] && Object.values(shop[key]).some(value => value !== 0 && value !== false && value != null)) ||
        ['squires','hall','yard','home','spBought'].some(key => Number(shop[key] || 0) > 0)) return true;
    if (c.smith && c.smith.forged) return true;
    for (const k of ['trades','bag','skills','s2','items','gear','records','looks','housing','owned','inventory','furnish']) {
      if (c[k] && typeof c[k] === 'object' &&
          Object.values(c[k]).some(value => typeof value === 'object'
            ? value && Object.keys(value).length > 0
            : value !== 0 && value !== false && value != null && value !== '')) return true;
    }
    if (c.onboard && !['fight','start','new'].includes(c.onboard)) return true;
  }
  const harmless = new Set(['st-career','st-muted','st-settings3','st-split','st-loadout','st-category','st-onlineKit','st-onlineL','st-quickMods','st-couchPicks','st-bracketNames','st-bosRoster','st-lobbyName']);
  return Object.keys(snapshot).some(k => !harmless.has(k));
}
function cloudSummary(snapshot) {
  const c = snapshot && snapshot['st-career'] || {}, s = c.stats || {};
  return { level:Math.max(1,Number(c.level||1)), purse:Number(c.purse == null ? 150 : c.purse), matches:Number(s.matches||0), keys:snapshot?Object.keys(snapshot).length:0 };
}
function cloudBackup(uid, snapshot) {
  const prefix = CLOUD_BACKUP + String(uid).replace(/[^a-z0-9-]/gi,'') + '-';
  const existing = [];
  for (let i=0;i<localStorage.length;i++) { const key=localStorage.key(i);if(key && key.startsWith(prefix))existing.push(key); }
  existing.sort();
  const key = prefix + new Date().toISOString() + '-' + Math.floor(Math.random()*10000);
  // Never delete an earlier backup before successfully writing the replacement.
  localStorage.setItem(key, JSON.stringify({createdAt:new Date().toISOString(),account:uid,snapshot}));
  while(existing.length>=2) localStorage.removeItem(existing.shift());
  return key;
}
function cloudOverlay(title, description, actions) {
  let shade = document.getElementById('steeltapeCloudOverlay');
  if (shade) shade.remove();
  shade = document.createElement('div'); shade.id = 'steeltapeCloudOverlay';
  shade.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#0a0b0dea;display:flex;justify-content:center;align-items:center;padding:18px;overflow:auto;font:16px/1.5 system-ui,Arial,sans-serif;color:#f6f1e7';
  const panel = document.createElement('div');
  panel.style.cssText = 'max-width:600px;width:100%;background:#192027;border:2px solid #eabf35;padding:25px;border-radius:8px;box-shadow:0 15px 60px #000a';
  const heading=document.createElement('h2');heading.textContent=title;heading.style.cssText='margin:0 0 12px;color:#f4c738;font-size:24px';
  const body=document.createElement('p');body.textContent=description;body.style.cssText='white-space:pre-line;margin-bottom:22px';
  panel.append(heading,body);
  for (const action of actions) {
    const button = document.createElement('button');button.type='button';button.textContent=action.label;
    button.style.cssText='margin:5px 8px 5px 0;background:'+(action.secondary?'#3a424a':'#efc43a')+';color:'+(action.secondary?'#fff':'#171510')+';padding:12px 16px;border:0;border-radius:4px;cursor:pointer;font-weight:800';
    button.onclick=()=>{shade.remove();action.run();};
    panel.append(button);
  }
  shade.append(panel);document.body.append(shade);return shade;
}
async function cloudRpc(name,args) {
  if (!BOS.sb) throw Error('BuhurtOS connection is unavailable');
  const {data,error}=await BOS.sb.rpc(name,args||{});
  if(error) throw error;
  return data;
}
function cloudReady(uid,revision,snapshot) {
  if(CLOUD.uid!==uid)return;
  const hash = cloudHash(snapshot);
  // If the acknowledgement cannot be persisted locally, don't pretend this
  // device is synced: the next session must compare its save explicitly.
  cloudWriteMeta(uid,Number(revision),hash);
  CLOUD.revision=Number(revision);CLOUD.lastHash=hash;CLOUD.ready=true;CLOUD.holding=false;CLOUD.optedOut=false;
  if(typeof onbResumeAfterAuth==='function')setTimeout(onbResumeAfterAuth,0);
}
function cloudRestore(uid,revision,remoteSnapshot) {
  if(CLOUD.uid!==uid)return;
  const local=cloudSnapshot();
  if(!remoteSnapshot || typeof remoteSnapshot !== 'object' || Array.isArray(remoteSnapshot) || !remoteSnapshot['st-career']) throw Error('Cloud save was incomplete; the current device was not changed.');
  // Backup MUST succeed before any local key is touched. Other accounts' backups are never erased.
  cloudBackup(uid,local);
  CLOUD.applying=true;
  const oldKeys=Object.keys(local);
  try {
    for(const [key,value] of Object.entries(remoteSnapshot)) {
      if(!key.startsWith('st-')||key.startsWith('st-cloud-'))throw Error('Invalid key in cloud save');
      if(JSON.stringify(value)===undefined)throw Error('Invalid cloud save value');
    }
    for(const key of oldKeys) if(!(key in remoteSnapshot))localStorage.removeItem(key);
    for(const [key,value] of Object.entries(remoteSnapshot)) localStorage.setItem(key,JSON.stringify(value));
    cloudWriteMeta(uid,revision,cloudHash(remoteSnapshot));
  } catch(error) {
    // Restore the pre-migration device save if local writes fail.
    for(const key of Object.keys(remoteSnapshot))if(!(key in local))localStorage.removeItem(key);
    for(const [key,value]of Object.entries(local))localStorage.setItem(key,JSON.stringify(value));
    CLOUD.applying=false;throw error;
  }
  location.reload(); // Guarantees CAREER, inventory, cosmetics, loadout and boot state all rehydrate consistently.
}
async function cloudCommit(uid,expected,snapshot) {
  const answer=await cloudRpc('steeltape_cloud_commit',{p_expected_revision:expected,p_snapshot:snapshot});
  if(CLOUD.uid!==uid)return false;
  if(!answer || !answer.ok) return false;
  cloudReady(uid,answer.revision,snapshot);
  return true;
}
function cloudResolveChoice(uid,remote,local) {
  CLOUD.holding=true;CLOUD.ready=false;
  const a=cloudSummary(local), b=cloudSummary(remote.snapshot);
  const msg='This account already has progress in the cloud, but this device has a different saved game.\n\n'+
    'CLOUD: Level '+b.level+', $'+b.purse.toLocaleString()+', '+b.matches+' matches, '+b.keys+' saved sections.\n'+
    'THIS DEVICE: Level '+a.level+', $'+a.purse.toLocaleString()+', '+a.matches+' matches, '+a.keys+' saved sections.\n\n'+
    'Choose which save to continue. We keep a device backup before replacing local data, and the cloud keeps previous revisions before an overwrite. These saves cannot be safely auto-merged.';
  return new Promise(resolve=>{
    cloudOverlay('Choose your Steel & Tape save',msg,[
      {label:'Use cloud save',run:()=>{try{cloudRestore(uid,remote.revision,remote.snapshot);}catch(e){cloudProblem(uid,e);}resolve();}},
      {label:'Use this device',run:async()=>{try{
        const ok=await cloudCommit(uid,remote.revision,cloudSnapshot());
        if(!ok){await cloudStart(uid,true);}else {try{toastMenu('This device is now backed up to the cloud.');}catch(e){}}
      }catch(e){cloudProblem(uid,e);}resolve();}},
      {label:'Play locally for now',secondary:true,run:()=>{CLOUD.ready=false;CLOUD.holding=false;CLOUD.optedOut=true;if(typeof onbResumeAfterAuth==='function')onbResumeAfterAuth();resolve();}}
    ]);
  });
}
function cloudProblem(uid,error) {
  if(CLOUD.uid!==uid)return;
  CLOUD.ready=false;CLOUD.holding=false;
  const explanation = 'Your device save has not been deleted or replaced.\n\n'+String(error && error.message || error)+
   '\n\nCloud backup is not active on this device. You can keep playing locally and retry after reconnecting.';
  cloudOverlay('Cloud save needs attention',explanation,[{label:'Play locally for now',run:()=>{CLOUD.optedOut=true;if(typeof onbResumeAfterAuth==='function')onbResumeAfterAuth();}},{label:'Try again',secondary:true,run:()=>{CLOUD.optedOut=false;cloudOnAuth(uid,true);}}]);
}
async function cloudStart(uid,retry) {
  if(CLOUD.uid!==uid)return;
  const remote=await cloudRpc('steeltape_cloud_read');
  if(CLOUD.uid!==uid)return;
  const local=cloudSnapshot(), meta=cloudReadMeta(), localHash=cloudHash(local);
  if(!remote || !remote.snapshot) {
    if(meta && meta.uid!==uid && cloudMeaningful(local)) {
      CLOUD.holding=true;
      return new Promise(resolve=>cloudOverlay('Different account on this device',
        'This device has progress linked to a different account. To keep the two characters separate, start a new character or explicitly move the local save to this account. Your existing device save will be backed up.',
        [{label:'Start a new character',run:async()=>{try{
          cloudBackup(meta.uid,local);
          const blank={'st-career':CAREER_DEFAULT()};
          const ok=await cloudCommit(uid,0,blank);
          if(ok)cloudRestore(uid,CLOUD.revision,blank);else await cloudStart(uid,true);
        }catch(e){cloudProblem(uid,e);}resolve();}},
        {label:'Move this device save',secondary:true,run:async()=>{try{const ok=await cloudCommit(uid,0,local);if(!ok)await cloudStart(uid,true);}catch(e){cloudProblem(uid,e);}resolve();}},
        {label:'Not now',secondary:true,run:()=>{CLOUD.optedOut=true;CLOUD.holding=false;resolve();}}]));
    }
    const ok=await cloudCommit(uid,0,local);
    if(!ok)return cloudStart(uid,true);
    return;
  }
  const remoteHash=cloudHash(remote.snapshot);
  if(remoteHash===localHash){cloudReady(uid,remote.revision,local);return;}
  if(meta && meta.uid===uid && meta.hash===localHash){cloudRestore(uid,remote.revision,remote.snapshot);return;}
  if(!cloudMeaningful(local) && (!meta || meta.uid!==uid)){cloudRestore(uid,remote.revision,remote.snapshot);return;}
  if(meta && meta.uid===uid && Number(meta.revision)===Number(remote.revision)){
    const ok=await cloudCommit(uid,remote.revision,local);
    if(!ok)return cloudStart(uid,true);
    return;
  }
  return cloudResolveChoice(uid,remote,local);
}
function cloudOnAuth(uid,retry) {
  if(!uid||location.hash==='#autotest')return Promise.resolve();
  if(CLOUD.loading && CLOUD.uid===uid)return CLOUD.loading;
  if(CLOUD.uid===uid && CLOUD.ready && !retry)return Promise.resolve();
  if(CLOUD.uid!==uid){ CLOUD.uid=uid;CLOUD.revision=0;CLOUD.ready=false;CLOUD.optedOut=false;CLOUD.holding=false; }
  const promise=(async()=>{try{await cloudStart(uid,Boolean(retry));}catch(e){cloudProblem(uid,e);}})();
  CLOUD.loading=promise.finally(()=>{if(CLOUD.loading===done)CLOUD.loading=null;});
  const done=CLOUD.loading;
  return done;
}
function cloudOnSignOut() {
  CLOUD.uid=null;CLOUD.ready=false;CLOUD.holding=false;CLOUD.optedOut=false;
  if(CLOUD.timer){clearTimeout(CLOUD.timer);CLOUD.timer=null;}
  const shade=document.getElementById('steeltapeCloudOverlay');if(shade)shade.remove();
}
function cloudSchedule() {
  if(!CLOUD.uid||!CLOUD.ready||CLOUD.optedOut||CLOUD.applying)return;
  if(CLOUD.timer)clearTimeout(CLOUD.timer);
  CLOUD.timer=setTimeout(()=>{CLOUD.timer=null;cloudFlush();},3500);
}
async function cloudFlush() {
  if(!CLOUD.uid||!CLOUD.ready||CLOUD.optedOut||CLOUD.applying||CLOUD.busy)return;
  const uid=CLOUD.uid, snapshot=cloudSnapshot(),hash=cloudHash(snapshot);
  if(hash===CLOUD.lastHash)return;
  CLOUD.busy=true;
  try{
    const ok=await cloudCommit(uid,CLOUD.revision,snapshot);
    if(!ok && CLOUD.uid===uid){CLOUD.ready=false;await cloudStart(uid,true);}
  }catch(e){if(CLOUD.uid===uid){CLOUD.ready=false;cloudProblem(uid,e);}}
  finally{CLOUD.busy=false;if(CLOUD.uid===uid&&CLOUD.ready&&cloudHash(cloudSnapshot())!==CLOUD.lastHash)cloudSchedule();}
}
const cloudOriginalSet=store.set.bind(store),cloudOriginalDel=store.del.bind(store);
store.set=function(k,v){cloudOriginalSet(k,v);cloudSchedule();};
store.del=function(k){cloudOriginalDel(k);cloudSchedule();};
setInterval(()=>{if(CLOUD.ready)cloudFlush();},25000);
window.addEventListener('online',()=>{if(CLOUD.uid&&!CLOUD.ready&&!CLOUD.holding&&!CLOUD.optedOut)cloudOnAuth(CLOUD.uid,true);else cloudFlush();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cloudFlush();});
window.addEventListener('pagehide',()=>{cloudFlush();});
