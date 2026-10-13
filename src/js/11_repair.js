// ---------- the repair bench: rip, wrap, smooth (BR 2.1.5, BR 2.3, WR 7.2.2) ----------
const REP = { piece: null, tape: null, roll: 'black', step: null, timer: 45, ripT: 0, wraps: [], sloppy: 0, side: 0, wrinkles: [], smoothT: 0, q: {}, ptr: null, active: false, onDone: null, onFail: null, log: [], squire: 1, pop: null, lastSec: 99, trail: [], forcedPiece: null, failuresOnly: false, emergency: false };
const PIECE_SHORT = { helmet: ['Helmet', '⛑️'], armL: ['Left arm', '💪'], armR: ['Right arm', '💪'], legs: ['Legs', '🦵'], haft: ['Haft', '🪓'] };
const ZONE = { a: 0.36, b: 0.64 }; // the tear, as a fraction of the bench width
const BAND = { top: 0.42, bot: 0.6 };

function openRepair(seconds, onDone, options) {
  options = options || {};
  if (!options.emergency && CAREER.skills && CAREER.skills['show.tape']) seconds += 15; // Tape artist
  if (!options.emergency && typeof shopFx === 'function') seconds += shopFx('repairSec'); // good scissors
  Object.assign(REP, { piece: null, tape: null, step: null, timer: seconds, active: true, onDone, onFail: options.onFail || null, wraps: [], wrinkles: [], squire: 1 + (G.boon && G.boon.squire ? 1 : 0) + (typeof shopState === 'function' ? shopState().squires : 0), pop: null, lastSec: 99, trail: [], forcedPiece: options.forcedPiece || null, failuresOnly: !!options.failuresOnly, emergency: !!options.emergency });
  REP.roll = REP.roll && TAPES[REP.roll] && TAPES[REP.roll].legal && tapeLeft(REP.roll) > 0 ? REP.roll : (['black', 'grey', 'white', 'pro', 'kevlar'].find(x => tapeLeft(x) > 0) || 'black');
  renderKitList(); renderDrawer(); setSteps(null);
  const worst = worstPiece();
  $('#benchMsg').textContent = worst ? `Tap a strap to fix it. ${PIECE_SHORT[worst][0]} is the worst.` : 'Everything is in good shape. Tap Done, or top anything up.';
  if (REP.forcedPiece || REP.failuresOnly) {
    $('#benchMsg').textContent = G.match && G.match.duel ? 'Run back to your corner! Your squire helps repair the failed armour. Tap a failed piece to begin.' : 'Between rounds: repair the failed armour before returning. Tap a failed piece to begin.';
    if (REP.forcedPiece) selectPiece(REP.forcedPiece);
  }
  showScreen('repair'); sizeBench();
}
function worstPiece() { const kit = G.player.kit; let w = null; for (const k of pieceKeys()) { const pc = kit[k]; const v = pc.failed ? -1 : pc.cond; if (v < 0.75 && (w === null || v < (kit[w].failed ? -1 : kit[w].cond))) w = k; } return w; }
// the bench canvas matches its box on screen (sharp on phones, no clipping)
function sizeBench() {
  const cv = $('#bench'); if (!cv) return; const r = cv.getBoundingClientRect(); if (r.width < 10) return;
  const d = Math.min(2, window.devicePixelRatio || 1); const w = Math.round(r.width * d), hh = Math.round(r.height * d);
  if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
}
window.addEventListener('resize', () => { if (G.screen === 'repair') sizeBench(); });
function repPop(text, col) { REP.pop = { text, col: col || '#ece8de', t: 1.4 }; }
function pieceKeys() {
  const p = G.player; const keys = ['helmet', 'armL', 'armR', 'legs'];
  if (WEAPONS[p.spec.weapon].haft) keys.push('haft');
  return keys;
}
function pieceStatus(k, pc) {
  const bits = [Math.round(pc.cond * 100) + '%'];
  if (k === 'haft' && pc.failed) bits.push('torn: weapon refused until rewrapped');
  else if (pc.failed && pc.covered) bits.push('let go, covered for now');
  else if (pc.cond < 0.3) bits.push('about to let go');
  if (pc.tape) bits.push('taped: ' + TAPES[pc.tape].name.toLowerCase());
  return bits.join(' · ');
}
function renderKitList() {
  const box = $('#kitlist'); box.innerHTML = '';
  const kit = G.player.kit, worst = worstPiece();
  for (const k of pieceKeys().filter(k => (!REP.forcedPiece || k === REP.forcedPiece) && (!REP.failuresOnly || G.player.kit[k].failed))) {
    const pc = kit[k]; const col = pc.failed || pc.cond < 0.3 ? 'var(--card-red)' : pc.cond < 0.55 ? 'var(--marshal)' : pc.cond < 0.8 ? '#9fb0b4' : 'var(--card-green)';
    const [nm, ic] = PIECE_SHORT[k];
    const st = k === 'haft' && pc.failed ? 'torn!' : pc.failed ? 'broken' : pc.cond < 0.3 ? 'about to go' : pc.cond >= 0.9 ? 'solid' : pc.tape ? TAPES[pc.tape].name.split(' ')[0].toLowerCase() + ' tape' : '';
    const b = h('button', { class: 'piece' + (k === worst ? ' worst' : '') + (k === 'armL' ? ' flipx' : ''), 'aria-pressed': String(REP.piece === k), title: PIECE_NAMES[k], onclick: () => selectPiece(k) },
      h('span', { class: 'pic' }, ic), h('span', { class: 'nm' }, nm), h('span', { class: 'pct num', style: `color:${col}` }, Math.round(pc.cond * 100) + '%'),
      h('span', { class: 'meter', html: `<i style="width:${Math.round(pc.cond * 100)}%;--c:${col}"></i>` }), h('span', { class: 'st' }, k === worst ? 'fix first' : st));
    box.append(b);
  }
  const sq = $('#btnSquire'); if (sq) { sq.hidden = REP.squire <= 0; sq.textContent = `Squire, patch it for me (${REP.squire})`; }
}function renderDrawer() {
  const box = $('#drawer'); box.innerHTML = '';
  for (const k of ['gold', 'kevlar', 'pro', 'black', 'white', 'grey', 'duct', 'zip']) {
    const t = TAPES[k]; const onHaft = REP.piece === 'haft', left = tapeLeft(k);
    if ((k === 'pro' || k === 'kevlar' || k === 'gold') && left <= 0) continue; // premium rolls only show once you've bought some
    let lg = t.legal ? 'legal' : 'not legal', cls = t.legal ? 'ok' : 'no';
    if (onHaft && t.haft === 'warn') { lg = 'odd on a haft'; cls = 'warn'; }
    if (left !== Infinity) lg += left > 0 ? ` · ${left} left` : ' · empty';
    const b = h('button', { class: 'tapechip' + (t.legal ? '' : ' illegal') + (left <= 0 ? ' empty' : ''), 'aria-pressed': String(REP.roll === k), title: t.note, onclick: () => selectTape(k) },
      h('span', { class: 'roll', style: `--c:${t.color}` }), h('span', null, h('div', null, t.name.replace(' hockey tape', '').replace(' cloth tape', ' cloth')), h('div', { class: 'lg ' + cls }, lg)));
    box.append(b);
  }
}
function setSteps(s) { $('#repair').dataset.stage = s ? 'bench' : 'pick'; $$('#steps span').forEach(e => { const order = ['rip', 'wrap', 'smooth']; e.classList.toggle('on', e.dataset.s === s); e.classList.toggle('done', s && order.indexOf(e.dataset.s) < order.indexOf(s)); }); }

function selectPiece(k) {
  if (REP.step) { $('#benchMsg').textContent = 'Finish this strap first.'; return; }
  AU.click(); REP.piece = k; renderKitList(); renderDrawer();
  startTaping(REP.roll);
}
function selectTape(k) {
  if (REP.step) return;
  if (tapeLeft(k) <= 0) { // an empty roll: refill it right here if the purse allows
    const T = TAPE_STOCK[k];
    if (CAREER.purse >= T.refill && refillTape(k)) { REP.roll = k; renderDrawer(); const say = `Bought ${T.pack} more wraps of ${TAPES[k].name.toLowerCase()} for ${fmtMoney(T.refill)}.`; if (REP.piece) startTaping(k); $('#benchMsg').textContent = say + (REP.piece ? ' ' + $('#benchMsg').textContent : ' Now tap a strap.'); return; }
    else { $('#benchMsg').textContent = `That roll is empty. A refill costs ${fmtMoney(T.refill)}. Use another roll, or let your squire do it.`; AU.click(); return; }
  }
  AU.click(); REP.roll = k; renderDrawer();
  if (REP.piece) startTaping(k); else $('#benchMsg').textContent = `${TAPES[k].name} ready. Now tap a strap.`;
}
function startTaping(k) {
  if (tapeLeft(k) <= 0) { const alt = ['black', 'grey', 'white', 'pro', 'kevlar'].find(x => tapeLeft(x) > 0); if (!alt) { $('#benchMsg').textContent = 'All your legal tape is used up. Refill in the Shop, or use your squire.'; return; } k = REP.roll = alt; renderDrawer(); }
  REP.tape = k; const t = TAPES[k]; const pc = G.player.kit[REP.piece];
  if (t.instant) { // duct tape and zip ties: fast, strong, and they fail the kit check
    AU.rip(1); pc.cond = Math.min(0.92, pc.cond + (k === 'duct' ? 0.55 : 0.42)); pc.tape = k; pc.failed = false; pc.covered = false;
    logTape(REP.piece, k, null); repPop(k === 'duct' ? 'SLAPPED ON' : 'ZIPPED', '#f08a3c');
    $('#benchMsg').textContent = `${t.name}: it holds, but ${t.note.split('. ')[0].toLowerCase()} (BR 2.1.5). The Technical Marshal noticed.`;
    finishPiece(); return;
  }
  REP.step = 'rip'; REP.ripT = 0; REP.wraps = []; REP.sloppy = 0; REP.side = 0; REP.q = {}; REP.trail = []; setSteps('rip'); sizeBench();
  $('#benchMsg').textContent = IN.mode === 'pad' ? 'Rip: press A when the needle is in the gold.' : 'Rip: tap when the needle is in the gold.';
}
// your squire tapes a strap for you: decent, not as good as doing it well yourself
function squirePatch() {
  if (REP.squire <= 0 || REP.step) return;
  const k = REP.forcedPiece || (REP.piece && G.player.kit[REP.piece].cond < 0.92 ? REP.piece : worstPiece()); if (!k) { $('#benchMsg').textContent = 'Nothing needs patching.'; return; }
  REP.squire--; REP.piece = k; REP.tape = 'black';
  const pc = G.player.kit[k], q = 0.62; pc.cond = Math.min(0.92, pc.cond + 0.12 + 0.62 * q); pc.tape = 'black'; pc.failed = false; pc.covered = false;
  logTape(k, 'black', q); AU.wrap(); AU.rip(0.6); repPop('SQUIRE DID IT', '#62c462');
  $('#benchMsg').textContent = `Your squire taped the ${PIECE_SHORT[k][0].toLowerCase()} strap: ${Math.round(pc.cond * 100)}%.`;
  finishPiece();
}
function finishPiece() {
  REP.step = null; setSteps(null); renderKitList(); applyTapeVisuals(G.player);
  if (REP.piece === 'helmet' && !G.player.kit.helmet.failed) rebuildHelmet(G.player);
}
function rebuildHelmet(f) {
  if (!f.model || !W3.matchRoot) return;
  W3.matchRoot.remove(f.model.root); buildFighterModel(f); W3.matchRoot.add(f.model.root); f.model.root.visible = !f.out;
}
function logTape(piece, tape, q) {
  const where = G.match ? `${G.match.stage}, after round ${G.match.round}` : 'practice';
  const entry = { piece: piece === 'haft' ? `${WEAPONS[G.player.spec.weapon].name} haft wrap` : PIECE_NAMES[piece], tape: TAPES[tape].name, q, where };
  REP.log.push(entry); if (G.tourney) G.tourney.tapeLog.push(entry);
  ev('repair'); MT.tape = (MT.tape || 0) + 1;
}

function benchPos(e) { const r = $('#bench').getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
// one set of bench handlers for finger, mouse and the controller cursor
function benchDown(p) {
  REP.ptr = p;
  if (REP.step === 'rip') { const n = ripNeedle(), d = Math.abs(n - 0.5); const q = d < 0.05 ? 1 : clamp(1 - (d - 0.05) / 0.4, 0, 1); REP.q.rip = q; AU.rip(0.5 + q * 0.6); REP.step = 'wrap'; setSteps('wrap'); REP.side = p.y < BAND.top ? -1 : p.y > BAND.bot ? 1 : 0; repPop(q >= 1 ? 'PERFECT RIP!' : q > 0.7 ? 'CLEAN' : q > 0.4 ? 'RAGGED' : 'FRAYED', q >= 1 ? '#f2c40f' : q > 0.4 ? '#ece8de' : '#ff5a4a'); $('#benchMsg').textContent = IN.mode === 'pad' ? 'Wrap: sweep the left stick up and down across the strap. Fill the red gaps.' : 'Wrap: swipe up and down across the strap. Fill the red gaps.'; rumble(0.2, 0.5, 90); }
}
function benchMove(p) {
  if (REP.step === 'wrap') {
    const s = p.y < BAND.top - 0.03 ? -1 : p.y > BAND.bot + 0.03 ? 1 : 0;
    if (s !== 0 && REP.side !== 0 && s !== REP.side) { REP.wraps.push({ x: p.x, skew: rand(-0.025, 0.025) }); AU.wrap(); rumble(0.05, 0.25, 40); if (p.x < ZONE.a - 0.04 || p.x > ZONE.b + 0.04) REP.sloppy++; checkWrap(); }
    if (s !== 0) REP.side = s;
  } else if (REP.step === 'smooth') {
    if (p.y > BAND.top - 0.1 && p.y < BAND.bot + 0.1) for (const w of REP.wrinkles) if (!w.gone && Math.abs(w.x - p.x) < 0.045) { w.gone = true; AU.wrap(); rumble(0.03, 0.2, 30); }
    if (REP.wrinkles.every(w => w.gone)) finishSmooth();
  }
  if (REP.step) { REP.trail.push({ x: p.x, y: p.y, t: 0.35 }); if (REP.trail.length > 24) REP.trail.shift(); }
  REP.ptr = p;
}
function initBench() {
  const cv = $('#bench');
  cv.addEventListener('pointerdown', e => { AU.init(); try { cv.setPointerCapture(e.pointerId); } catch (er) { } benchDown(benchPos(e)); });
  cv.addEventListener('pointermove', e => {
    if (!REP.ptr && e.pointerType !== 'mouse') return; const down = e.buttons || e.pointerType !== 'mouse';
    if (down) benchMove(benchPos(e));
  });
  const up = () => { REP.ptr = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
}
function coverage() {
  const w = 0.07; const segs = REP.wraps.map(r => [r.x - w / 2, r.x + w / 2]).sort((a, b) => a[0] - b[0]);
  let cov = 0, cur = ZONE.a;
  for (const [a, b] of segs) { const s = Math.max(a, cur), e = Math.min(b, ZONE.b); if (e > s) { cov += e - s; cur = e; } }
  return cov / (ZONE.b - ZONE.a);
}
function checkWrap() {
  const c = coverage();
  if (c >= 0.97 || REP.wraps.length >= 11) {
    REP.q.wrap = clamp(c * (1 - 0.09 * REP.sloppy), 0, 1);
    REP.step = 'smooth'; setSteps('smooth'); REP.smoothT = 6;
    REP.wrinkles = Array.from({ length: 6 }, () => ({ x: rand(ZONE.a + 0.02, ZONE.b - 0.02), y: rand(BAND.top + 0.03, BAND.bot - 0.03), gone: false }));
    repPop(REP.q.wrap > 0.9 ? 'NICE WRAP' : 'WRAPPED', '#ece8de'); $('#benchMsg').textContent = IN.mode === 'pad' ? 'Smooth: run the cursor along the strap to pop the bubbles.' : 'Smooth: rub along the strap to pop the bubbles.';
  }
}
function finishSmooth() {
  if (REP.step !== 'smooth') return;
  REP.q.smooth = REP.wrinkles.filter(w => w.gone).length / REP.wrinkles.length;
  let q = 0.25 * (REP.q.rip || 0) + 0.5 * (REP.q.wrap || 0) + 0.25 * REP.q.smooth;
  const pc = G.player.kit[REP.piece];
  if (CAREER.skills && CAREER.skills['show.tape']) q = Math.min(1, q * 1.15);
  q = Math.min(1, q * (1 + shopFx('tapeQ'))); // the taping manual
  pc.cond = Math.min(0.92, pc.cond + 0.12 + 0.62 * q); pc.tape = REP.tape; pc.failed = false; pc.covered = false;
  logTape(REP.piece, REP.tape, q); useTape(REP.tape); renderDrawer();
  const haftNote = REP.piece === 'haft' && REP.tape === 'white' ? ' White on a haft may draw a look from the authenticity officer.' : '';
  const stars = q > 0.85 ? 3 : q > 0.6 ? 2 : 1; repPop('★'.repeat(stars) + '☆'.repeat(3 - stars), '#f2c40f'); AU.cheer && stars === 3 && AU.cheer(0.25);
  const next = worstPiece();
  $('#benchMsg').textContent = `${PIECE_SHORT[REP.piece][0]} back to ${Math.round(pc.cond * 100)}%.${haftNote} ${next ? 'Next: ' + PIECE_SHORT[next][0].toLowerCase() + '.' : 'All good. Tap Done.'}`;
  finishPiece();
}
function ripNeedle() { return 0.5 + 0.5 * Math.sin(REP.ripT * 3.4); }

function updateRepair(dt) {
  if (!REP.active) return;
  REP.timer -= dt; $('#repTimer').textContent = fmtClock(REP.timer);
  const sec = Math.ceil(REP.timer); $('#repTimer').classList.toggle('low', REP.timer <= 10);
  if (sec !== REP.lastSec) { REP.lastSec = sec; if (sec <= 10 && sec > 0) AU.tone(sec <= 3 ? 1320 : 880, 0.06, 0.06, 'square'); }
  if (REP.pop) { REP.pop.t -= dt; if (REP.pop.t <= 0) REP.pop = null; }
  REP.trail.forEach(t => t.t -= dt); REP.trail = REP.trail.filter(t => t.t > 0);
  if (REP.step === 'rip') REP.ripT += dt;
  if (REP.step === 'smooth') { REP.smoothT -= dt; if (REP.smoothT <= 0) finishSmooth(); }
  sizeBench(); drawBench();
  if (REP.timer <= 0) { $('#benchMsg').textContent = 'Time. The Technical Marshal calls it.'; closeRepair(); }
}
function closeRepair() {
  if (!REP.active) return;
  const unfixed = REP.emergency && G.player && ['helmet', 'armL', 'armR', 'legs'].filter(k => G.player.kit[k].failed);
  if (unfixed && unfixed.length && REP.timer > 0) {
    $('#benchMsg').textContent = `Repair ${unfixed.map(k => PIECE_SHORT[k][0].toLowerCase()).join(', ')} before returning to the list.`;
    return;
  }
  if (REP.step === 'wrap') { REP.q.wrap = coverage() * 0.8; REP.step = 'smooth'; REP.wrinkles = [{ x: 0.5, gone: false }]; }
  if (REP.step === 'smooth') finishSmooth();
  if (REP.step === 'rip') { REP.step = null; setSteps(null); }
  REP.active = false;
  const cb = unfixed && unfixed.length ? (REP.onFail || REP.onDone) : REP.onDone;
  REP.onDone = REP.onFail = null;
  if (cb) cb();
}

function drawBench() {
  const cv = $('#bench'); const x = cv.getContext('2d'); const W = cv.width, H = cv.height; const k = H / 300, t = G.realTime;
  const font = (px, f) => `${Math.round(px * k)}px ${f || '"Permanent Marker", cursive'}`;
  x.fillStyle = '#3b2c1f'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = k; for (let i = 0; i < 18; i++) { const yy = i * H / 14; x.beginPath(); x.moveTo(0, yy + 6 * k); x.bezierCurveTo(W * 0.3, yy + 2 * k, W * 0.6, yy + 12 * k, W, yy + 5 * k); x.stroke(); }
  if (!REP.step) {
    x.fillStyle = 'rgba(236,232,222,.6)'; x.font = font(30); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(REP.piece && !REP.pop ? 'tap another strap' : REP.pop ? '' : 'tap a strap above', W / 2, H / 2);
    drawPop(x, W, H, k); return;
  }
  const top = BAND.top * H, bot = BAND.bot * H;
  if (REP.piece === 'haft') {
    const g = x.createLinearGradient(0, top - 8 * k, 0, bot + 8 * k); g.addColorStop(0, '#5a3d24'); g.addColorStop(0.45, '#9a7048'); g.addColorStop(1, '#3d2816');
    x.fillStyle = g; x.fillRect(0, top - 8 * k, W, bot - top + 16 * k);
  } else {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5c6468'); g.addColorStop(0.3, '#c9d0d3'); g.addColorStop(0.5, '#8d969a'); g.addColorStop(0.75, '#d2d8da'); g.addColorStop(1, '#5c6468');
    x.fillStyle = g; x.beginPath(); x.ellipse(W / 2, H / 2, W * 0.46, H * 0.44, 0, 0, TAU); x.fill();
    x.fillStyle = '#5e3a21'; x.fillRect(0, top, W, bot - top);
    x.strokeStyle = 'rgba(230,210,180,.45)'; x.setLineDash([8 * k, 7 * k]); x.lineWidth = 2 * k; x.beginPath(); x.moveTo(0, top + 6 * k); x.lineTo(W, top + 6 * k); x.moveTo(0, bot - 6 * k); x.lineTo(W, bot - 6 * k); x.stroke(); x.setLineDash([]);
    x.strokeStyle = '#b8913f'; x.lineWidth = 6 * k; x.strokeRect(W * 0.84, top - 12 * k, W * 0.07, bot - top + 24 * k);
  }
  // the tear
  x.strokeStyle = 'rgba(15,10,6,.9)'; x.lineWidth = 3 * k; x.beginPath(); x.moveTo(W * 0.5, top); for (let i = 1; i <= 6; i++) x.lineTo(W * (0.5 + (i % 2 ? 0.015 : -0.012)), top + (bot - top) * i / 6); x.stroke();
  // wrap: the gaps still to cover glow red
  if (REP.step === 'wrap') {
    const w = 0.07, segs = REP.wraps.map(r => [r.x - w / 2, r.x + w / 2]).sort((a, b) => a[0] - b[0]); let cur = ZONE.a; const gaps = [];
    for (const [a, b] of segs) { if (a > cur) gaps.push([cur, Math.min(a, ZONE.b)]); cur = Math.max(cur, b); if (cur >= ZONE.b) break; } if (cur < ZONE.b) gaps.push([cur, ZONE.b]);
    x.fillStyle = `rgba(255,70,60,${0.28 + 0.14 * Math.sin(t * 6)})`; for (const [a, b] of gaps) if (b > a) x.fillRect(a * W, top - 14 * k, (b - a) * W, bot - top + 28 * k);
    if (gaps.length) { // a bouncing up-down arrow over the first gap shows the swipe
      const gx = ((gaps[0][0] + gaps[0][1]) / 2) * W, bob = Math.sin(t * 5) * 22 * k, cy = (top + bot) / 2 + bob;
      x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 4 * k; x.lineCap = 'round'; x.beginPath(); x.moveTo(gx, cy - 34 * k); x.lineTo(gx, cy + 34 * k);
      x.moveTo(gx - 10 * k, cy - 24 * k); x.lineTo(gx, cy - 34 * k); x.lineTo(gx + 10 * k, cy - 24 * k); x.moveTo(gx - 10 * k, cy + 24 * k); x.lineTo(gx, cy + 34 * k); x.lineTo(gx + 10 * k, cy + 24 * k); x.stroke(); x.lineCap = 'butt';
    }
  } else { x.strokeStyle = 'rgba(242,196,15,.7)'; x.setLineDash([6 * k, 6 * k]); x.lineWidth = 2 * k; x.strokeRect(W * ZONE.a, top - 16 * k, W * (ZONE.b - ZONE.a), bot - top + 32 * k); x.setLineDash([]); }
  // wraps laid so far
  const col = REP.tape ? TAPES[REP.tape].color : '#18191a';
  for (const w of REP.wraps) {
    const cx = w.x * W, hw = W * 0.035;
    x.fillStyle = col; x.beginPath(); x.moveTo(cx - hw + w.skew * W, top - 10 * k); x.lineTo(cx + hw + w.skew * W, top - 10 * k); x.lineTo(cx + hw - w.skew * W, bot + 10 * k); x.lineTo(cx - hw - w.skew * W, bot + 10 * k); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = k; for (let j = 0; j < 5; j++) { x.beginPath(); x.moveTo(cx - hw + j * hw / 2.5, top - 10 * k); x.lineTo(cx - hw + j * hw / 2.5, bot + 10 * k); x.stroke(); }
  }
  if (REP.step === 'smooth') for (const w of REP.wrinkles) {
    if (w.gone) continue; const r = (10 + 2 * Math.sin(t * 7 + w.x * 20)) * k;
    x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.ellipse(w.x * W, w.y * H, r * 1.6, r, 0.3, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 1.5 * k; x.stroke();
    x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(w.x * W - r * 0.5, w.y * H - r * 0.3, r * 0.25, 0, TAU); x.fill();
  }
  if (REP.step === 'rip') {
    const gx = W * 0.12, gw = W * 0.76, gy = H * 0.07, gh = 34 * k;
    x.fillStyle = 'rgba(10,13,15,.88)'; x.fillRect(gx - 10 * k, gy - 10 * k, gw + 20 * k, gh + 20 * k);
    x.fillStyle = '#2a3136'; x.fillRect(gx, gy, gw, gh);
    x.fillStyle = 'rgba(236,232,222,.85)'; x.fillRect(gx + gw * 0.3, gy, gw * 0.4, gh);
    x.fillStyle = '#f2c40f'; x.fillRect(gx + gw * 0.45, gy, gw * 0.1, gh);
    const n = ripNeedle(); x.fillStyle = '#ff3d8b'; x.fillRect(gx + gw * n - 4 * k, gy - 8 * k, 8 * k, gh + 16 * k);
    x.fillStyle = col; x.fillRect(W * 0.08, H * 0.7, W * 0.84, 34 * k);
    x.fillStyle = 'rgba(236,232,222,.92)'; x.font = font(26); x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText(IN.mode === 'pad' ? 'press A in the gold' : 'tap in the gold', W / 2, H * 0.94);
  }
  // finger trail
  for (const p of REP.trail) { x.fillStyle = `rgba(255,255,255,${p.t * 0.9})`; x.beginPath(); x.arc(p.x * W, p.y * H, 6 * k * (p.t / 0.35), 0, TAU); x.fill(); }
  if (IN.mode === 'pad' && REP.step) { const cx = PAD.cursor.x * W, cy = PAD.cursor.y * H; x.strokeStyle = '#f2c40f'; x.lineWidth = 3 * k; x.beginPath(); x.arc(cx, cy, 13 * k, 0, TAU); x.moveTo(cx - 20 * k, cy); x.lineTo(cx - 6 * k, cy); x.moveTo(cx + 6 * k, cy); x.lineTo(cx + 20 * k, cy); x.moveTo(cx, cy - 20 * k); x.lineTo(cx, cy - 6 * k); x.moveTo(cx, cy + 6 * k); x.lineTo(cx, cy + 20 * k); x.stroke(); }
  if (REP.step === 'wrap') { // progress bar along the top
    const c = coverage(); x.fillStyle = 'rgba(10,13,15,.8)'; x.fillRect(W * 0.25, H * 0.06, W * 0.5, 22 * k); x.fillStyle = c > 0.96 ? '#62c462' : '#ece8de'; x.fillRect(W * 0.25 + 3 * k, H * 0.06 + 3 * k, (W * 0.5 - 6 * k) * c, 16 * k);
    x.fillStyle = '#ece8de'; x.font = font(18); x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText(`covered ${Math.round(c * 100)}%`, W / 2, H * 0.06 + 44 * k);
  }
  if (REP.step === 'smooth') { const left = REP.wrinkles.filter(w => !w.gone).length; x.fillStyle = '#ece8de'; x.font = font(20); x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText(`${left} bubble${left === 1 ? '' : 's'} left · ${Math.ceil(REP.smoothT)}s`, W / 2, H * 0.14); }
  drawPop(x, W, H, k);
}
function drawPop(x, W, H, k) {
  const P = REP.pop; if (!P) return;
  const a = Math.min(1, P.t / 0.4), s = 1 + (1.4 - P.t) * 0.15;
  x.save(); x.globalAlpha = a; x.translate(W / 2, H * 0.5); x.scale(s, s); x.rotate(-0.05);
  x.font = `${Math.round(54 * k)}px "Big Shoulders Display", Impact, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8 * k; x.strokeStyle = 'rgba(10,13,15,.9)'; x.strokeText(P.text, 0, 0); x.fillStyle = P.col; x.fillText(P.text, 0, 0); x.restore();
}

