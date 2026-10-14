// ===================================================================
// Report a bug or ask for a feature (pause menu and the realm map menu), and a few small events the game sends home:
// a session when it starts, a match when it ends. The admin page (admin.html) reads them.
// ===================================================================
const EVENT_URL = BOS_URL + '/functions/v1/steeltape-event';
const EVENT_VISITOR_KEY = 'steeltape-visitor-id-v1';
const PRESENCE_SESSION = crypto.randomUUID();
let presenceToken = '';
function eventVisitor() {
  // This identifies the browser, never the person's account.
  // Only a verified BuhurtOS session can claim its previous guest activity.
  try {
    const existing = localStorage.getItem(EVENT_VISITOR_KEY);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(EVENT_VISITOR_KEY, id);
    return id;
  } catch (e) { return null; }
}
async function sendEvent(kind, data) {
  if (typeof fetch !== 'function' || G.autoflow || location.hash === '#autotest' || location.protocol === 'file:') return false;
  const headers = { 'Content-Type': 'application/json' };
  try { const s = BOS.sb && (await BOS.sb.auth.getSession()).data.session; if (s && s.access_token) { presenceToken = s.access_token; headers.Authorization = 'Bearer ' + s.access_token; } } catch (e) { }
  const payload = kind === 'heartbeat' ? { ...(data || {}), presenceSession: PRESENCE_SESSION,
    look: typeof lookLite === 'function' ? lookLite() : null } : data || {};
  try { const r = await fetch(EVENT_URL, { method: 'POST', headers, body: JSON.stringify({ kind, name: myName(), data: payload, visitor: eventVisitor() }) }); return r.ok; } catch (e) { return false; }
}
function presenceOffline() {
  if (!presenceToken || !BOS.user || location.hash === '#autotest') return;
  try { fetch(EVENT_URL, { method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + presenceToken },
    body: JSON.stringify({ kind: 'offline', data: { presenceSession: PRESENCE_SESSION } }) }); } catch (e) { }
}
window.addEventListener('pagehide', presenceOffline);
document.addEventListener('visibilitychange', () => { if (document.hidden) presenceOffline(); });
function eventIdentify() {
  if (!BOS.user) return;
  sendEvent('identify', { level: CAREER.level || 1, matches: (CAREER.stats || {}).matches || 0 });
  sendEvent('heartbeat', { level: CAREER.level || 1 });
  // Send any offline sessions waiting on this account's successful authentication.
  eventPlaySync();
}
function eventHeartbeat() {
  if (document.hidden || !G || G.autopilot || location.hash === '#autotest') return;
  sendEvent('heartbeat', { level: CAREER.level || 1 });
}
setInterval(eventHeartbeat, 60000);
// ---------- Account playtime (tracked from this release onward) ----------
// Count only visible, recently interacted-with gameplay. Store cumulative
// seconds by account and tab session so offline play survives refresh/restart.
// The backend uses a JWT and an idempotent session counter; it never trusts a
// client-supplied account id.
const PLAYTIME_PREFIX = 'steeltape-active-time-v1:';
let PLAYTIME_PREVIOUS = performance.now();
let PLAYTIME_LAST_INPUT = performance.now();
let PLAYTIME_SENDING = false;
let PLAYTIME_LAST_SEND = 0;
const PLAYTIME_TABS = {};
function eventPlayUID() {
  if (BOS.user && BOS.user.id) return BOS.user.id;
  // An account linked on this device can keep playing while disconnected.
  if (navigator.onLine === false) {
    try {
      const meta = JSON.parse(localStorage.getItem('steeltape-cloud-link-v1') || 'null');
      return typeof meta?.uid === 'string' ? meta.uid : null;
    } catch (e) { }
  }
  return null;
}
function eventPlayTab(uid) {
  if (PLAYTIME_TABS[uid]) return PLAYTIME_TABS[uid];
  const tabKey = PLAYTIME_PREFIX + 'tab:' + uid;
  let tab = null;
  try { tab = sessionStorage.getItem(tabKey); } catch(e) {}
  if (!tab || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tab)) {
    tab = crypto.randomUUID();
    try { sessionStorage.setItem(tabKey,tab); } catch(e) {}
  }
  PLAYTIME_TABS[uid] = tab;
  return tab;
}
function eventPlayEntry(uid,session) {
  const key = PLAYTIME_PREFIX + uid + ':' + session;
  try {
    const prior = JSON.parse(localStorage.getItem(key) || 'null');
    if (prior && prior.uid === uid && prior.session === session
        && Number.isFinite(prior.seconds) && prior.seconds >= 0) return prior;
  } catch(e) {}
  return {uid,session,seconds:0,acked:0,updated:Date.now()};
}
function eventPlayTick() {
  const now = performance.now(), gap = Math.max(0,now - PLAYTIME_PREVIOUS);
  PLAYTIME_PREVIOUS = now;
  const uid = eventPlayUID();
  if (!uid || document.hidden || G.autoflow || location.protocol === 'file:'
      || location.hash === '#autotest' || now - PLAYTIME_LAST_INPUT > 120000
      || gap <= 0 || gap > 15000) return;
  const session = eventPlayTab(uid), entry = eventPlayEntry(uid,session);
  // Bound a single clock tick to avoid counting sleep / background time.
  entry.seconds = Math.min(2592000, entry.seconds + Math.min(gap,10000)/1000);
  entry.updated = Date.now();
  try { localStorage.setItem(PLAYTIME_PREFIX + uid + ':' + session, JSON.stringify(entry)); }
  catch(e) { console.warn('Could not store offline playtime on this device'); }
}
async function eventPlaySync() {
  if (PLAYTIME_SENDING || !BOS.user?.id || navigator.onLine === false
      || location.protocol === 'file:' || location.hash === '#autotest') return;
  const uid = BOS.user.id;
  PLAYTIME_SENDING = true;
  try {
    const keys = [];
    for (let i=0; i<localStorage.length; i++) {
      const k=localStorage.key(i);
      if (k && k.startsWith(PLAYTIME_PREFIX + uid + ':')) keys.push(k);
    }
    // Never transfer an entry across accounts. Process older offline time first.
    for (const key of keys.slice(0,120)) {
      let entry;try {entry = JSON.parse(localStorage.getItem(key)||'null');}catch(e){continue;}
      if (!entry || entry.uid !== uid || !entry.session) continue;
      const whole = Math.floor(entry.seconds || 0);
      if (whole <= Math.floor(entry.acked || 0)) {
        if (Date.now() - (entry.updated || 0) > 7*86400000) localStorage.removeItem(key);
        continue;
      }
      const ok = await sendEvent('playtime', { session:entry.session, seconds:whole });
      if (!ok) break;
      // Reload to avoid overwriting seconds accumulated during the request.
      const current=eventPlayEntry(uid,entry.session);
      current.acked=Math.max(current.acked||0,whole);
      localStorage.setItem(key,JSON.stringify(current));
    }
  } finally { PLAYTIME_SENDING = false; }
}
function eventPlayActivity() { PLAYTIME_LAST_INPUT = performance.now(); }
for (const type of ['pointerdown','pointermove','keydown','touchstart','wheel','gamepadconnected']) {
  window.addEventListener(type,eventPlayActivity,{passive:true});
}
document.addEventListener('visibilitychange',()=>{
  PLAYTIME_PREVIOUS=performance.now();
  if (!document.hidden) eventPlayActivity();
  else eventPlaySync();
});
window.addEventListener('pagehide',()=>{eventPlayTick();eventPlaySync();});
window.addEventListener('online',()=>eventPlaySync());
setInterval(eventPlayTick,5000);
setInterval(()=>{eventPlayTick();eventPlaySync();},30000);

function eventSession() { sendEvent('session', { level: CAREER.level || 1, matches: (CAREER.stats || {}).matches || 0, team: CAREER.club && CAREER.club.bos || null, touch: IS_TOUCH, w: window.innerWidth, h: window.innerHeight, ver: (window.BUILD_VER || '') }); }
function eventMatch(m, won) { if (!m || G.attract || m.training) return; const cm = m.metrics || {}; sendEvent('match', { stage: m.stage || '', mode: m.mode, won: !!won, opp: m.opp, cat: m.category, online: !!m.online, trial: m.trial || null, throne: m.throne || null, difficulty: G.settings.difficulty, challengeLevel: challengeLevel(), challengeStage: challengeStage(), duration: Math.round(G.simTime - (cm.start == null ? G.simTime : cm.start)), takedowns: m.takedowns, hits: cm.hits, whiffs: cm.whiffs, guards: cm.guards, actions: cm.actions }); }
// the form
function openFeedback(back) {
  const ret = back || (() => showScreen(G.phase === 'fight' || G.phase === 'prefight' ? 'pause' : 'title'));
  msg('feedback', 'Report a bug or ask for a feature', `<div class="seg small" id="fbKind"><button data-k="bug" aria-pressed="true">Bug</button><button data-k="feature" aria-pressed="false">Feature idea</button></div>
    <label class="runcode col"><span id="fbLabel">What went wrong, and what were you doing?</span><textarea id="fbText" rows="5" maxlength="1500" placeholder="The more detail the better: where in the realm, which fight, which buttons…"></textarea></label>
    <p class="muted small">Sent with your fighter name${BOS.user ? ' and BuhurtOS account' : ''}, your device type and where you were in the game.</p><p class="muted small" id="fbMsg"></p>`,
    [['Send', async () => {
      const kind = $('#fbKind [aria-pressed="true"]').dataset.k, text = ($('#fbText').value || '').trim(), say = t => { const m = $('#fbMsg'); if (m) m.textContent = t; };
      if (text.length < 4) { say('Write a little more first.'); return; }
      say('Sending…');
      const ok = await sendEvent(kind, { text, where: G.phase || '', screen: G.screen || '', town: !!(typeof TOWN !== 'undefined' && TOWN.on), district: (typeof TOWN !== 'undefined' && TOWN.district) || null, stage: G.match && G.match.stage || null, level: CAREER.level || 1, mode: IN.mode });
      if (ok) { toastMenu(kind === 'bug' ? 'Bug reported. Thank you!' : 'Idea sent. Thank you!'); ret(); } else say('Couldn’t send it. Are you online?');
    }, true], ['Back', ret]]);
  $$('#fbKind button').forEach(b => b.onclick = () => { AU.click(); $$('#fbKind button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('#fbLabel').textContent = b.dataset.k === 'bug' ? 'What went wrong, and what were you doing?' : 'What would you like added or changed?'; });
}
