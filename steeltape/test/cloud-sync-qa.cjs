// Isolated, network-free regression tests for cloud-authoritative saves and offline edits.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/js/13ia_cloudsave.js'),'utf8');
const server=new Map(),history=[];
const copy=v=>JSON.parse(JSON.stringify(v));
function device(uid,initial={},online=true){
 const map=new Map(Object.entries(initial).map(([k,v])=>[k,JSON.stringify(v)]));
 const fresh={name:'You',onboard:'fight',purse:150,level:1,stats:{matches:0},upgrades:{},shop:{spent:0,owned:{}},smith:{forged:null}};
 const CAREER=copy(initial['st-career']||fresh);
 if(!map.has('st-career'))map.set('st-career',JSON.stringify(CAREER));
 const localStorage={
  get length(){return map.size},key:i=>[...map.keys()][i]??null,
  getItem:k=>map.has(k)?map.get(k):null,
  setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)
 };
 const store={set:(k,v)=>localStorage.setItem('st-'+k,JSON.stringify(v)),del:k=>localStorage.removeItem('st-'+k)};
 const events={};let reloadCount=0;
 const navigator={onLine:online};
 const sb={rpc:async(name,args)=>{
  if(!navigator.onLine)throw Error('network unavailable');
  const old=server.get(uid);
  if(name==='steeltape_cloud_read')return {data:old?copy(old):null,error:null};
  if(name==='steeltape_cloud_commit'){
   if(Number(args.p_expected_revision)!==(old?old.revision:0))return{data:{ok:false,conflict:true},error:null};
   if(old)history.push({uid,...copy(old)});
   const next={revision:(old?.revision||0)+1,snapshot:copy(args.p_snapshot)};
   server.set(uid,next);
   return{data:{ok:true,revision:next.revision},error:null};
  }
  throw Error('unexpected RPC '+name);
 }};
 const ctx={localStorage,store,CAREER,CAREER_DEFAULT:()=>copy(fresh),BOS:{sb},navigator,
  window:{addEventListener:(name,fn)=>events[name]=fn},document:{addEventListener(){},getElementById(){return null}},
  location:{protocol:'https:',hash:'',reload(){reloadCount++}},console:{warn(){}},
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,toastMenu(){},onbResumeAfterAuth(){}};
 vm.createContext(ctx);
 vm.runInContext(source+'\ncloudOverlay=function(){throw Error("Save choices must never appear online");};',ctx);
 const call=(name,...args)=>vm.runInContext(name,ctx)(...args);
 return {
  uid,events,map,localStorage,store,navigator,CAREER,
  auth:(retry=false)=>call('cloudOnAuth',uid,retry),
  flush:()=>call('cloudFlush'),
  prepare:()=>call('cloudPrepareGuestLink'),
  snapshot:()=>call('cloudSnapshot'),
  offlineDirty:()=>call('cloudOfflineDirty',uid),
  meta:()=>JSON.parse(localStorage.getItem('steeltape-cloud-link-v1')||'null'),
  get reloads(){return reloadCount}
 };
}
async function test(){
 const career={name:'Knight',onboard:'done',purse:1013,level:5,xp:197,
  stats:{matches:18,wins:7},upgrades:{helmet:2},shop:{spent:1000,owned:{armour:true}},bag:{iron:5},
  skills:{strength:3},ach:{firstWin:true}};
 const keys={'st-career':career,'st-loadout':{sword:'long'},'st-tourney':{round:3},
  'st-daily':{streak:5},'st-run':{best:8},'st-settings3':{volume:.8},'st-extra-future':{x:42}};
 const a=device('alpha',keys);
 a.localStorage.setItem('buhurt-game-buhurtos','secret-session');
 assert(a.prepare(),'guest progress is backed up locally');
 await a.auth();
 assert.equal(server.get('alpha').revision,1);
 assert.deepEqual(Object.keys(server.get('alpha').snapshot).sort(),Object.keys(keys).sort());
 assert(!JSON.stringify(server.get('alpha').snapshot).includes('secret-session'));
 const b=device('alpha');
 await b.auth();assert.equal(b.reloads,1);
 assert.equal(JSON.parse(b.localStorage.getItem('st-career')).purse,1013);
 assert.equal(JSON.parse(b.localStorage.getItem('st-extra-future')).x,42);
 assert.equal(server.get('alpha').revision,1,'fresh device must not overwrite cloud');
 // Any unmarked LOCAL divergence is overwritten by cloud even if the server revision did not move.
 const unmarked=device('alpha',{'st-career':{...career,purse:9000000}});
 unmarked.localStorage.setItem('steeltape-cloud-link-v1',JSON.stringify({uid:'alpha',revision:1,hash:'old-version'}));
 await unmarked.auth();assert.equal(unmarked.reloads,1);
 assert.equal(JSON.parse(unmarked.localStorage.getItem('st-career')).purse,1013);
 assert([...unmarked.map.keys()].some(k=>k.startsWith('steeltape-local-backup-v1-alpha')));
 // Offline edits on the SAME linked account can sync if cloud is unchanged.
 a.navigator.onLine=false;a.events.offline();
 a.CAREER.purse=2077;a.store.set('career',a.CAREER);
 assert(a.offlineDirty());
 a.navigator.onLine=true;await a.auth(true);
 assert.equal(server.get('alpha').revision,2);
 assert.equal(server.get('alpha').snapshot['st-career'].purse,2077);
 assert(!a.offlineDirty());
 // Newer server revision wins even over genuine offline changes.
 const newer=device('alpha',server.get('alpha').snapshot);
 await newer.auth();
 a.navigator.onLine=false;a.events.offline();
 a.CAREER.purse=2999;a.store.set('career',a.CAREER);
 newer.CAREER.purse=3333;newer.store.set('career',newer.CAREER);
 await newer.flush();
 assert.equal(server.get('alpha').revision,3);
 a.navigator.onLine=true;await a.auth(true);
 assert.equal(a.reloads,1);
 assert.equal(JSON.parse(a.localStorage.getItem('st-career')).purse,3333);
 assert.equal(server.get('alpha').revision,3);
 assert([...a.map.keys()].some(k=>k.startsWith('steeltape-local-backup-v1-alpha')));
 assert.equal(history.length,2);
 // Another login on a shared device must not steal the previous account's character.
 const mixed=device('beta',{'st-career':career});
 mixed.localStorage.setItem('steeltape-cloud-link-v1',JSON.stringify({uid:'alpha',revision:3,hash:'abc'}));
 await mixed.auth();
 assert.equal(server.get('beta').snapshot['st-career'].purse,150);
 assert.equal(JSON.parse(mixed.localStorage.getItem('st-career')).purse,150);
 assert([...mixed.map.keys()].some(k=>k.startsWith('steeltape-local-backup-v1-alpha')));
 // Offline mode has NO sign-in choice and no attempt to reach the cloud.
 const off=device('gamma',keys,false);
 await off.auth();assert.equal(server.has('gamma'),false);
 assert.equal(off.localStorage.getItem('st-career')!==null,true);
 // Invalid sections must not silently disappear from cloud backups.
 off.localStorage.setItem('st-corrupt','not-json');
 assert.throws(()=>off.snapshot(),/unreadable section/);
 console.log('PASS: cloud first online, complete save, first login, offline sync, conflict cloud wins, local backups, account separation, no choice modal, malformed save protected');
}
test().catch(e=>{console.error(e);process.exitCode=1});
