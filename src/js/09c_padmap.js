// ---------- controllers: one clean, standard-layout view of every pad, whatever the browser reports ----------
// Browsers differ: Chrome and Safari give most pads the "standard" mapping, but Firefox (and some pads in any browser)
// report raw layouts with the d-pad as a hat axis and the triggers as axes. Some computers also list phantom devices
// (Steam's virtual pads, wheels, keyboards with a gamepad interface) that never get pressed, or that sit with an axis
// stuck at -1. So every pad is normalised to the standard layout, and only pads that have actually been used count:
// the game reads the pad(s) you touch, and couch play seats players in the order they first press something.
const PADS = { seen: {}, list: [], active: [], joined: [], last: null, merged: null };
const STD_N = 17;
function padBtn(v) { return { pressed: v > 0.5, value: v }; }
// d-pad as a single "hat" axis (DirectInput / Firefox): -1 up, going clockwise in steps of 2/7, above 1 when centred
function hatToDpad(v) {
  if (v == null || v > 1.05 || v < -1.05) return [0, 0, 0, 0];
  const i = Math.round((v + 1) / (2 / 7)); // 0 up, 1 up-right, 2 right, 3 down-right, 4 down, 5 down-left, 6 left, 7 up-left
  return [i === 7 || i === 0 || i === 1 ? 1 : 0, i >= 3 && i <= 5 ? 1 : 0, i >= 5 && i <= 7 ? 1 : 0, i >= 1 && i <= 3 ? 1 : 0];
}
function isXboxId(id) { return /xbox|x-box|xinput|045e/i.test(id || ''); }
// saved per controller name from Settings > Set up controller: where this pad's RT and LT really are
function padMaps() { PADS.maps = PADS.maps || store.get('padmap2', {}); return PADS.maps; }
function trigFrom(src, raw, ax) {
  if (!src) return null;
  if (src.t === 'b') return raw[src.i] || 0;
  const a = ax[src.i]; if (a == null) return 0;
  return clamp((a - src.rest) / ((src.dir || 1) - src.rest), 0, 1);
}
function srcVal(src, raw, ax) {
  if (!src) return 0;
  if (src.t === 'b') return raw[src.i] || 0;
  const a = ax[src.i]; if (a == null) return 0;
  return clamp((a - src.rest) / ((src.dir || 1) - src.rest), 0, 1);
}
// EasySMX D10 (and similar) in its Xbox mode on Android: the browser reports it as a standard Xbox pad, but the buttons
// arrive shifted (X on 3, Y on 4, LB on 8, RB on 9) and the triggers, right stick, stick clicks, View and Menu never arrive.
const PRESET_SHIFTED = { preset: true, b: { 0: { t: 'b', i: 0 }, 1: { t: 'b', i: 1 }, 2: { t: 'b', i: 3 }, 3: { t: 'b', i: 4 }, 4: { t: 'b', i: 8 }, 5: { t: 'b', i: 9 }, 12: { t: 'b', i: 12 }, 13: { t: 'b', i: 13 }, 14: { t: 'b', i: 14 }, 15: { t: 'b', i: 15 } }, miss: [6, 7, 8, 9, 10, 11, 'rs'] };
function fullMap(gp, S, raw) {
  const M = padMaps()[gp.id || '']; if (M && M.full) return M;
  if (!(gp.buttons.length === 16 && /product: 02e0/i.test(gp.id || ''))) return null;
  // a real Xbox pad with this id would press 2, 5, 6, 7, 10 or 11 sooner or later: then it is not the shifted layout
  if (S) { if (!S.notShifted && [2, 5, 6, 7, 10, 11].some(i => (raw[i] || 0) > 0.5)) S.notShifted = true; if (S.notShifted) return null; }
  return PRESET_SHIFTED;
}
function normPad(gp, S) {
  const raw = gp.buttons.map(b => typeof b === 'number' ? b : (b.pressed ? Math.max(b.value, 1) : b.value || 0));
  const ax = gp.axes.slice();
  let v, axes;
  const FM = fullMap(gp, S, raw);
  if (FM) {
    v = new Array(STD_N).fill(0);
    for (const k in FM.b) v[+k] = srcVal(FM.b[k], raw, ax);
    const usedAx = new Set(Object.values(FM.b).filter(x => x && x.t === 'a').map(x => x.i));
    axes = [ax[0] || 0, ax[1] || 0, 0, 0];
    if (FM.rx) axes[2] = clamp((ax[FM.rx.i] || 0) * FM.rx.dir, -1, 1); else if (!FM.miss.includes('rs') && !usedAx.has(2)) axes[2] = ax[2] || 0;
    if (FM.ry) axes[3] = clamp((ax[FM.ry.i] || 0) * FM.ry.dir, -1, 1); else if (!FM.miss.includes('rs') && !usedAx.has(3)) axes[3] = ax[3] || 0;
    const out = finishPad(gp, v, axes); out.missing = FM.miss; out.preset = !!FM.preset; return out;
  }
  const M = padMaps()[gp.id || ''];
  if (M && (M.rt || M.lt || M.rx || M.ry)) { // the player told us where the triggers are: use exactly that
    v = raw.slice(0, STD_N); while (v.length < STD_N) v.push(0);
    const used = new Set([M.rt, M.lt].filter(x => x && x.t === 'a').map(x => x.i));
    const sticks = ax.map((a, i) => [a, i]).filter(([a, i]) => !used.has(i) && !(ax.length >= 10 && i === 9)).map(([a]) => a);
    axes = gp.mapping === 'standard' ? ax.slice(0, 4).map((a, i) => used.has(i) ? 0 : a) : [sticks[0] || 0, sticks[1] || 0, sticks[2] || 0, sticks[3] || 0];
    if (M.rx) axes[2] = clamp((ax[M.rx.i] || 0) * M.rx.dir, -1, 1); if (M.ry) axes[3] = clamp((ax[M.ry.i] || 0) * M.ry.dir, -1, 1);
    if (M.rt) v[7] = Math.max(v[7], trigFrom(M.rt, raw, ax)); if (M.lt) v[6] = Math.max(v[6], trigFrom(M.lt, raw, ax));
    if (gp.mapping !== 'standard' && ax.length >= 10) { const hat = hatToDpad(ax[9]); for (let i = 0; i < 4; i++) v[12 + i] = Math.max(v[12 + i], hat[i]); }
    return finishPad(gp, v, axes);
  }
  if (gp.mapping === 'standard' || (raw.length >= STD_N && ax.length === 4)) {
    v = raw.slice(0, STD_N); while (v.length < STD_N) v.push(0); axes = ax.slice(0, 4);
  } else {
    // generic raw pad (phones and tablets often report these): face buttons usually already sit bottom/right/left/top.
    // Axes that rest at -1 are analog triggers (sticks rest at 0); a hat axis carries the d-pad; the rest are the sticks.
    v = raw.slice(0, STD_N); while (v.length < STD_N) v.push(0);
    const hatI = ax.length >= 10 ? 9 : -1, base = S ? S.rawBase : ax;
    const trig = [], sticks = [];
    ax.forEach((a, i) => { if (i === hatI) return; if (i >= 2 && base[i] != null && base[i] < -0.9) trig.push(i); else sticks.push(i); });
    if (hatI >= 0) { const hat = hatToDpad(ax[hatI]); for (let i = 0; i < 4; i++) v[12 + i] = Math.max(v[12 + i], hat[i]); }
    if (trig.length >= 2) { v[6] = Math.max(v[6], clamp((ax[trig[0]] + 1) / 2, 0, 1)); v[7] = Math.max(v[7], clamp((ax[trig[1]] + 1) / 2, 0, 1)); }
    axes = sticks.slice(0, 4).map(i => ax[i] || 0); while (axes.length < 4) axes.push(0);
    if (hatI < 0 && sticks.length >= 6) { const dx = ax[sticks[4]] || 0, dy = ax[sticks[5]] || 0; if (dy < -0.5) v[12] = 1; if (dy > 0.5) v[13] = 1; if (dx < -0.5) v[14] = 1; if (dx > 0.5) v[15] = 1; } // d-pad as two axes
  }
  return finishPad(gp, v, axes);
}
function finishPad(gp, v, axes) {
  v = v.map(x => Number.isFinite(x) ? x : 0);
  axes = axes.map(a => Number.isFinite(a) ? clamp(a, -1, 1) : 0);
  return { index: gp.index, id: gp.id || '', connected: true, mapping: 'standard', timestamp: gp.timestamp, axes, buttons: v.map(padBtn), vibrationActuator: gp.vibrationActuator, raw: gp };
}
// a pad counts as used once a button goes down, or a stick moves well away from where it sat when first seen
function padsUpdate() {
  const now = performance.now(), list = [];
  let pads = [];
  try { pads = navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : []; }
  catch (e) { if (!PADS.blocked) { PADS.blocked = true; if (typeof toastMenu === 'function') toastMenu('This view blocks controllers. Open the game full page or as the app to use one.'); } }
  for (const gp of pads) {
    if (!gp || !gp.connected) continue;
    const key = gp.index + '|' + (gp.id || ''); let S = PADS.seen[key];
    const n = normPad(gp, S);
    let act = false;
    if (!S && gp.mapping !== 'standard' && !padMaps()[gp.id || ''] && !PADS.tipped) { PADS.tipped = true; setTimeout(() => typeof toastMenu === 'function' && toastMenu('Controller found. If a trigger does nothing: Settings, Set up controller.'), 600); }
    if (!S) { S = PADS.seen[key] = { rawBase: gp.axes.slice(), base: n.axes.slice(), moved: n.axes.map(() => false), down: n.buttons.map(b => b.pressed), born: now, first: 0, t: 0 }; act = S.down.some(Boolean); } // browsers often reveal a pad on the press that wakes it
    n.axes.forEach((a, i) => { if (Math.abs(a - S.base[i]) > 0.45) S.moved[i] = true; });
    n.axes = n.axes.map((a, i) => Math.abs(S.base[i]) > 0.5 && !S.moved[i] ? 0 : a); // an axis parked off-centre since it appeared (pedal, phantom) reads as centred
    n.buttons.forEach((b, i) => { if (b.pressed && !S.down[i]) act = S.real = true; if (!b.pressed) S.down[i] = false; });
    if (n.axes.some((a, i) => S.moved[i] && Math.abs(a) > 0.45)) act = S.real = true;
    if (act) { S.t = now; if (!S.first) S.first = now; }
    // a button held since the pad appeared counts (that is usually the press that woke it), but if it is still
    // held two seconds later it is stuck (phantom devices, a pad resting on something) and is ignored until released
    if (now - S.born > 2000) {
      n.buttons = n.buttons.map((b, i) => S.down[i] ? padBtn(0) : b);
      if (!S.real && S.down.some(Boolean)) S.first = 0; // never touched since, only a stuck button: not a player
    }
    n.used = !!S.first; n.lastUse = S.t; n.firstUse = S.first; list.push(n);
  }
  for (const k in PADS.seen) if (!list.some(n => n.index + '|' + n.id === k)) delete PADS.seen[k];
  PADS.list = list; PADS.raw = pads.filter(p => p && p.connected);
  PADS.active = list.filter(n => n.used);
  PADS.joined = PADS.active.slice().sort((a, b) => a.firstUse - b.firstUse);
  PADS.last = PADS.active.reduce((best, n) => !best || n.lastUse > best.lastUse ? n : best, null);
  // one player: every used pad drives the game together, so it never matters which one the browser lists first
  if (!PADS.active.length) { PADS.merged = null; return; }
  const m = { ...PADS.last, axes: [0, 0, 0, 0], buttons: [] };
  for (let i = 0; i < STD_N; i++) m.buttons.push(padBtn(Math.max(...PADS.active.map(n => n.buttons[i].value))));
  for (const [x, y] of [[0, 1], [2, 3]]) { const best = PADS.active.reduce((b, n) => Math.hypot(n.axes[x], n.axes[y]) > Math.hypot(b.axes[x], b.axes[y]) ? n : b); m.axes[x] = best.axes[x]; m.axes[y] = best.axes[y]; }
  PADS.merged = m;
}
// the pad the game listens to for one player (null until a controller has been pressed)
function currentPad() { return PADS.merged; }
// couch play: players in the order they first pressed something, then any other connected pads
function seatPads() { return PADS.joined.concat(PADS.list.filter(n => !n.used)); }
function padCount() { return PADS.list.length; }

// ---- Settings > Set up controller: pull each trigger once and the game remembers where it is on this controller ----
// Needed when a phone, tablet or browser reports a controller in a raw layout (common with Xbox pads on Android).
function rawPads() { try { return navigator.getGamepads ? Array.from(navigator.getGamepads() || []).filter(p => p && p.connected) : []; } catch (e) { return []; } }
function rawSnap(gp) { return { b: gp.buttons.map(b => typeof b === 'number' ? b : (b.pressed ? Math.max(1, b.value) : b.value || 0)), a: gp.axes.slice() }; }
const PAD_STEPS = [[0, 'Press A'], [1, 'Press B'], [2, 'Press X'], [3, 'Press Y'], [4, 'Press LB', 'left bumper, top left'], [5, 'Press RB', 'right bumper, top right'],
  [6, 'Pull LT all the way', 'left trigger, hold it'], [7, 'Pull RT all the way', 'right trigger, hold it'], ['rx', 'Push the RIGHT stick RIGHT', 'all the way, hold it'], ['ry', 'Push the RIGHT stick DOWN', 'all the way, hold it'],
  [10, 'Click the LEFT stick in'], [11, 'Click the RIGHT stick in'], [8, 'Press View', 'small button, two squares'], [9, 'Press Menu', 'small button, three lines'],
  [12, 'D-pad UP'], [13, 'D-pad DOWN'], [14, 'D-pad LEFT'], [15, 'D-pad RIGHT']];
function openPadSetup(back) {
  const done = back || (() => showScreen(G.paused ? 'pause' : 'settings'));
  msg('controller', 'Set up controller', `<div class="pswiz"><div class="psprompt" id="psText">Press any button on the controller</div><div class="muted" id="psSub">One button at a time. If something does nothing, tap Skip.</div>
    <div class="psprog"><i id="psProg"></i></div></div>
    <div class="psbtns"><button class="btn tape" id="psSkip">Nothing happens: skip</button></div>
    <div class="res" id="psRes"></div>
    <p class="muted small" id="psName"></p><pre id="psRaw" class="psraw">No controller yet.</pre>`,
    [['Done', () => { PADS.calib = null; done(); }, true], ['Start over', () => { PADS.calib = null; openPadSetup(back); }]]);
  const C = PADS.calib = { step: -1, phase: 'start', base: null, peak: null, t0: 0, id: null, map: { full: true, b: {}, miss: [] }, log: [] };
  const NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L3', 'R3', 'D-up', 'D-down', 'D-left', 'D-right'];
  const label = k => k === 'rx' ? 'Right stick ←→' : k === 'ry' ? 'Right stick ↑↓' : NAMES[k];
  const show = () => { const st = PAD_STEPS[C.step]; $('#psText').textContent = st ? st[1] : 'All set!'; $('#psSub').textContent = st ? (st[2] || '') : 'Saved for this controller. Press Done.'; $('#psProg').style.width = (Math.max(0, C.step) / PAD_STEPS.length * 100) + '%'; };
  const finish = () => {
    if (C.map.miss.includes('rx') || C.map.miss.includes('ry')) { C.map.miss = C.map.miss.filter(x => x !== 'rx' && x !== 'ry'); C.map.miss.push('rs'); }
    const M = padMaps(); M[C.id] = C.map; store.set('padmap2', M); PADS.seen = {}; // re-read the pad with its new map
    $('#psProg').style.width = '100%'; show(); AU.cheer && AU.cheer(0.4);
  };
  const record = (src) => {
    const k = PAD_STEPS[C.step][0];
    if (src) { if (k === 'rx' || k === 'ry') C.map[k] = src; else C.map.b[k] = src; } else C.map.miss.push(k);
    C.log.push(`<b>${label(k)}</b><span class="${src ? 'ok' : 'bad'}">${src ? (src.t === 'b' ? 'button ' + src.i : 'axis ' + src.i) : 'not received'}</span>`);
    $('#psRes').innerHTML = C.log.join(''); AU.click();
    C.step++; C.phase = 'release'; C.t1 = performance.now();
    if (C.step >= PAD_STEPS.length) { finish(); C.phase = 'done'; } else { $('#psText').textContent = 'Got it. Let go…'; }
  };
  $('#psSkip').onclick = () => { if (C.step >= 0 && C.step < PAD_STEPS.length && C.phase !== 'done') { C.peak = null; record(null); C.phase = 'arm'; show(); } };
  const tick = () => {
    if (PADS.calib !== C || G.screen !== 'msgScr') { if (PADS.calib === C) PADS.calib = null; return; }
    requestAnimationFrame(tick);
    const pads = rawPads();
    const gp = (C.id && pads.find(p => p.id === C.id)) || pads.reduce((x, y) => !x || (y.timestamp || 0) > (x.timestamp || 0) ? y : x, null); if (!gp) return;
    const now = rawSnap(gp);
    $('#psRaw').textContent = `axes: ${now.a.map((v, i) => i + ':' + (v >= 0 ? '+' : '') + v.toFixed(2)).join('  ')}\nheld: ${now.b.map((v, i) => v > 0.05 ? i + '=' + v.toFixed(2) : '').filter(Boolean).join('  ') || 'none'}`;
    if (!C.id) { C.id = gp.id; $('#psName').textContent = gp.id; }
    if (C.phase === 'done') return;
    const st = PAD_STEPS[C.step], stick = st && (st[0] === 'rx' || st[0] === 'ry');
    // what changed since the baseline: buttons, and axes other than the left stick (which drifts and gets bumped)
    const change = (base) => {
      let best = null, bm = 0.5;
      if (!stick) now.b.forEach((v, i) => { const d = v - (base.b[i] || 0); if (d > bm) { bm = d; best = { t: 'b', i }; } });
      now.a.forEach((v, i) => { if (i < 2) return; const r = base.a[i] || 0, d = Math.abs(v - r); if (d > Math.max(bm, 0.6)) { bm = d; const rest = r < -0.6 ? -1 : r > 0.6 ? 1 : 0; best = { t: 'a', i, rest, dir: v > rest ? 1 : -1 }; } });
      return best;
    };
    if (C.phase === 'start') { if (!C.base) C.base = now; if (change(C.base) || now.b.some(v => v > 0.5)) { C.phase = 'release'; C.t1 = performance.now(); C.step = 0; $('#psText').textContent = 'Got it. Let go…'; } return; }
    if (C.phase === 'release') { // move on once everything is back where it was, or after a moment
      const quiet = !now.b.some((v, i) => v - (C.base.b[i] || 0) > 0.3) && !now.a.some((v, i) => i >= 2 && Math.abs(v - (C.base.a[i] || 0)) > 0.3);
      if (quiet || performance.now() - C.t1 > 1500) { C.phase = 'arm'; show(); }
      return;
    }
    if (C.phase === 'arm') { C.base = now; C.phase = 'listen'; C.t0 = 0; return; }
    if (C.phase === 'listen') {
      const c = change(C.base);
      if (c) { if (!C.t0) C.t0 = performance.now(); if (performance.now() - C.t0 > 150) record(c); } else C.t0 = 0;
    }
  };
  requestAnimationFrame(tick);
}

