// ===================================================================
// Festival bouts: while you walk the realm there's always a fight on at the arena nearest you.
// Real fighters on the real sim, but with no player, no prize, no stats and no awards (G.attract keeps all of that off).
// The town keeps G.phase === 'town'; the bout keeps its own phase and borrows G.phase only while its sim steps run.
// ===================================================================
const BOUT = { on: false, phase: '', next: false, acc: 0, inSim: false, label: '', vs: '', n: 0 };
const BOUT_TOUCH = () => IN.mode === 'touch' || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
function boutPick() {
  const lad = Object.keys(CLUBS).filter(k => /^ladder\d+$/.test(k)), teams = ['reavers', 'wardens', 'rabble'];
  const two = arr => { const a = pick(arr); let b = pick(arr), g = 0; while (b === a && g++ < 20) b = pick(arr); return [a, b]; };
  const cat = pick(['men', 'men', 'women']), small = BOUT_TOUCH(), r = Math.random();
  BOUT.n++;
  if (r < 0.34 && lad.length > 1) { const [a, b] = two(lad); return { mode: 1, clubA: a, opp: b, category: cat, label: 'Adult duel' }; }
  const bosK = typeof rosterClubKeys === 'function' ? rosterClubKeys(3) : [];
  const [a, b] = bosK.length >= 2 && Math.random() < 0.7 ? two(bosK) : two(teams);
  if (r < 0.52) return { mode: 2, clubA: a, opp: b, category: cat, label: '2 v 2' };
  if (r < 0.74 || small) return { mode: 3, clubA: a, opp: b, category: cat, label: '3 v 3' };
  if (r < 0.92) return { mode: 5, clubA: a, opp: b, category: cat, label: '5 v 5 melee' };
  return { mode: 12, clubA: a, opp: b, category: cat, label: '12 v 12 massacre' };
}
// which arena the bout plays in: the nearest one to you (the Great Hall only when you're inside it)
function boutArenaFor(x, z) {
  if (TOWN.forceArena) return ARENAS.find(a => a.key === TOWN.forceArena) || ARENAS[0];
  const inHall = x > HALL.x0 && x < HALL.x1 && z > HALL.z0 && z < HALL.z1;
  let best = ARENAS[0], bd = 1e9; for (const A of ARENAS) { if (A.indoor && !inHall) continue; const d = Math.hypot(x - A.x, z - A.z); if (d < bd) { bd = d; best = A; } }
  return inHall ? ARENAS.find(a => a.indoor) : best;
}
function boutOff() { return W3.matchRoot ? W3.matchRoot.position : { x: 0, z: 0 }; }
function boutStart() {
  if (!TOWN.on) return;
  const Ar = boutArenaFor(TOWN.pos.x, TOWN.pos.z); TOWN.boutArena = Ar.key; W3.matchRoot.position.set(Ar.x, gy(Ar.x, Ar.z), Ar.z);
  const lv = typeof liveBoutPick === 'function' ? liveBoutPick(Ar) : null, o = lv || boutPick(), ph = G.phase, cat0 = G.category; BOUT.live = lv ? lv.live : null;
  G.attract = true; G.paused = false;
  try {
    setupMatch({ ...o, stage: 'Festival bout', attract: true, townBout: true });
    startRound();
  } catch (e) { console.warn('bout', e); BOUT.on = false; G.attract = false; G.phase = ph; return; }
  G.category = cat0; BOUT.phase = 'fight'; G.phase = ph; BOUT.on = true; BOUT.next = false; BOUT.acc = 0;
  const A = CLUBS[o.clubA] || CLUBS.reavers, B = CLUBS[o.opp];
  BOUT.label = o.label; BOUT.vs = o.mode === 1 ? `${G.fighters[0] ? G.fighters[0].name : A.name} vs ${G.fighters[1] ? G.fighters[1].name : B.name}` : `${A.name} vs ${B.full || B.name}`;
  boutHud();
}
function boutStop() {
  if (!BOUT.on) return;
  BOUT.on = false; BOUT.next = false; BOUT.phase = ''; G.attract = false; clearMatch(); TOWN.boutArena = null;
  const el = $('#townBout'); if (el) el.hidden = true;
}
// called from endRound's attract branch, inside the bout's sim step (G.phase is the bout's here)
function boutAfterRound() {
  const m = G.match; if (!m) return;
  const w = m.wins || [0, 0], best = m.mode === 1 ? 2 : 2;
  if (w[0] >= best || w[1] >= best || m.round >= 3) { BOUT.next = true; if (TOWN.spec) unlock('spectator', true); return; } // match done: a new pairing walks on
  startRound(); G.phase = 'fight';
}
function boutTick(dt) {
  if (!BOUT.on || !TOWN.on) return;
  if (BOUT.next) { BOUT.next = false; boutStart(); return; }
  // walked off to another arena? the next pairing walks on there instead
  if ((G.frameN || 0) % 90 === 0 && TOWN.pos && !TOWN.forceArena) { const A = boutArenaFor(TOWN.pos.x, TOWN.pos.z); if (A.key !== TOWN.boutArena) { const o = boutOff(); if (Math.hypot(TOWN.pos.x - o.x, TOWN.pos.z - o.z) > 70 || A.indoor) { boutStop(); boutStart(); return; } } }
  if (!G.match) return;
  const ph = G.phase; G.phase = BOUT.phase; BOUT.inSim = true;
  try {
    BOUT.acc += Math.min(dt, 0.1); const h = 1 / 60; let n = 0;
    while (BOUT.acc >= h && n < 6) { simStep(h); BOUT.acc -= h; n++; }
    if (n >= 6) BOUT.acc = 0;
  } finally { BOUT.phase = G.phase; G.phase = ph; BOUT.inSim = false; }
  if ((G.frameN || 0) % 30 === 0) boutHud();
}
// how loud the list is from where you stand (sounds the bout makes go through this)
function boutEar(x, z) {
  if (!BOUT.inSim || !TOWN.pos) return 1;
  const o = boutOff(), ear = TOWN.spec ? W3.camera.position : TOWN.pos, d = Math.hypot(ear.x - (x || 0) - o.x, ear.z - (z || 0) - o.z);
  return clamp(1.1 - d / 34, 0, 0.75);
}
// a little "in the list" ticker when you're near the rope
function boutHud() {
  const el = $('#townBout'); if (!el) return;
  const o = boutOff(), near = !TOWN.spec && TOWN.on && BOUT.on && TOWN.pos && Math.abs(TOWN.pos.x - o.x) < LIST.W / 2 + 22 && Math.abs(TOWN.pos.z - o.z) < LIST.L / 2 + 22 && !G.screen;
  el.hidden = !near; if (!near) return;
  const m = G.match, w = m && m.wins ? m.wins : [0, 0];
  el.innerHTML = '';
  const Ar = ARENAS.find(a => a.key === TOWN.boutArena);
  el.append(h('small', null, (Ar ? Ar.name : 'In the list') + ' · ' + BOUT.label), h('b', null, BOUT.vs), h('span', { class: 'num' }, BOUT.live ? `Real score ${BOUT.live.score[0]}–${BOUT.live.score[1]} · ${BOUT.live.phase}` : m ? `Round ${m.round} · ${w[0]}–${w[1]}` : ''));
}

