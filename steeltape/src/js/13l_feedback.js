// ===================================================================
// Report a bug or ask for a feature (pause menu and the realm map menu), and a few small events the game sends home:
// a session when it starts, a match when it ends. The admin page (admin.html) reads them.
// ===================================================================
const EVENT_URL = BOS_URL + '/functions/v1/steeltape-event';
async function sendEvent(kind, data) {
  if (typeof fetch !== 'function' || G.autoflow || location.hash === '#autotest' || location.protocol === 'file:') return false;
  const headers = { 'Content-Type': 'application/json' };
  try { const s = BOS.sb && (await BOS.sb.auth.getSession()).data.session; if (s && s.access_token) headers.Authorization = 'Bearer ' + s.access_token; } catch (e) { }
  try { const r = await fetch(EVENT_URL, { method: 'POST', headers, body: JSON.stringify({ kind, name: myName(), data: data || {} }) }); return r.ok; } catch (e) { return false; }
}
function eventSession() { sendEvent('session', { level: CAREER.level || 1, matches: (CAREER.stats || {}).matches || 0, team: CAREER.club && CAREER.club.bos || null, touch: IS_TOUCH, w: window.innerWidth, h: window.innerHeight, ver: (window.BUILD_VER || '') }); }
function eventMatch(m, won) { if (!m || G.attract || m.training) return; sendEvent('match', { stage: m.stage || '', mode: m.mode, won: !!won, opp: m.opp, cat: m.category, online: !!m.online, trial: m.trial || null, throne: m.throne || null }); }
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
