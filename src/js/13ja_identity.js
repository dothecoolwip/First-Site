// Cosmetic identity is verified separately from player names and permissions.
const CREATOR_IDENTITY = { proofs: {}, pending: false, nextAttempt: 0, remote: new Map() };
function creatorLocal() { return !!(BOS.creator && BOS.user && BOS.creatorUser === BOS.user.id); }
function creatorProof(audience) {
  const p = CREATOR_IDENTITY.proofs[audience];
  const subject = audience === 'town' ? LOBBY.me : ONL.peers.find(x => x.isMe && x.sameTab)?.peer;
  return creatorLocal() && p && p.subject === subject && p.exp > Date.now() ? p.proof : null;
}
function creatorReset() {
  BOS.creator = false; BOS.creatorUser = null; CREATOR_IDENTITY.proofs = {}; CREATOR_IDENTITY.nextAttempt = 0;
  creatorRefreshCharacters();
}
async function creatorIssue() {
  if (!creatorLocal() || !BOS.sb || CREATOR_IDENTITY.pending) return;
  if (Date.now() < CREATOR_IDENTITY.nextAttempt) return;
  CREATOR_IDENTITY.nextAttempt = Date.now()+30000;
  CREATOR_IDENTITY.pending = true;
  const uid = BOS.user.id;
  try {
    const { data } = await BOS.sb.auth.getSession();
    if (!data.session?.access_token) return;
    const combatPeer = ONL.peers.find(p => p.isMe && p.sameTab)?.peer;
    for (const [audience, subject] of [['town', LOBBY.me], ['combat', combatPeer]]) {
      if (!subject) continue;
      const old = CREATOR_IDENTITY.proofs[audience];
      if (old && old.subject === subject && old.exp > Date.now()+60000) continue;
      const r = await fetch(BOS_URL+'/functions/v1/steeltape-identity', {method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({action:'issue',audience,subject})});
      if (!r.ok) continue;
      const result = await r.json();
      if (!creatorLocal() || BOS.user.id !== uid) return;
      if (result.role === 'Creator' && result.proof) CREATOR_IDENTITY.proofs[audience] = {...result,subject};
    }
    lobbySet({pr:myProfile()});
    if (NET.room) NET.room.presence({lo:myLo()});
  } catch (e) { /* An unavailable identity service never grants a remote badge. */ }
  finally { CREATOR_IDENTITY.pending = false; }
}
function creatorRemote(proof, audience, subject) {
  if (!proof || typeof proof !== 'string' || proof.length > 2048 || !subject) return false;
  const key = audience + ':' + subject + ':' + proof, now = Date.now(), cached = CREATOR_IDENTITY.remote.get(key);
  if (cached && cached.until > now) return cached.role === 'Creator';
  if (CREATOR_IDENTITY.remote.size >= 128) CREATOR_IDENTITY.remote.delete(CREATOR_IDENTITY.remote.keys().next().value);
  CREATOR_IDENTITY.remote.set(key,{until:now+10000,role:null});
  fetch(BOS_URL+'/functions/v1/steeltape-identity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify',proof,audience,subject})})
    .then(r => r.ok ? r.json() : null).then(d => {
      CREATOR_IDENTITY.remote.set(key,{role:d?.role === 'Creator' && d.exp > Date.now() ? 'Creator' : null,until:d?.exp > Date.now() ? Math.min(d.exp,Date.now()+120000) : Date.now()+30000});
      creatorRefreshCharacters();
    }).catch(() => { CREATOR_IDENTITY.remote.set(key,{role:null,until:Date.now()+30000}); });
  return false;
}
function creatorRefreshCharacters() {
  if (typeof TOWN !== 'undefined' && TOWN.me) fighterGlow({model:TOWN.me,isPlayer:true,spec:{player:true},name:myName(),club:CLUBS.reavers});
  if (typeof WORLD !== 'undefined') for (const O of Object.values(WORLD.others)) {
    const p = O.p, creator = creatorRemote(p?.presence?.pr?.creatorProof,'town',p?.peer);
    fighterGlow({model:O.J,spec:{},creatorVerified:creator,name:p?.presence?.name,club:null});
  }
  if (typeof G !== 'undefined') for (const f of G.fighters || []) {
    if (f.netUid && f.netUid !== ONL.me) {
      const peer = ONL.peers.find(p => p.presence?.uid === f.netUid);
      const proof = peer ? peer.presence?.lo?.creatorProof : f.creatorProof;
      f.creatorVerified = !!peer && creatorRemote(proof,'combat',peer.peer);
    }
    fighterGlow(f);
  }
}
setInterval(() => { creatorIssue(); creatorRefreshCharacters(); }, 1000);


