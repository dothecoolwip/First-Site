// ===================================================================
// Spectating: walk up to any arena and watch from the stands. The bout moves to that arena, the camera
// takes a spectator's view (orbit, follow a fighter, broadcast angle), and you leave by walking off or pressing Leave.
// Arenas you aren't at still have results on their boards: they tick cheaply in the background.
// ===================================================================
const SPEC = { results: {}, t: 0, follow: 0 };
const SPEC_MODES = ['Rail', 'Follow', 'Orbit', 'Broadcast'];
// the stands of every arena are somewhere to talk to (no NPC: the prompt just says Watch)
function buildArenaSeats() {
  for (const A of ARENAS) {
    const x = A.x + A.bx + 0.9, z = A.z, lab = new THREE.Object3D();
    TOWN.stalls.push({ V: { key: 'a:' + A.key, name: A.name, role: 'Watch from the stands', icon: '🏟️' }, g: lab, npc: null, ry: -Math.PI / 2, x, z, ax: x, az: z, label: lab, arena: A, open: () => spectate(A), verb: 'Watch' });
  }
}
// festival clothes for the posed crowd (a few shared materials, so the stands still merge into a handful of meshes)
const SEAT_COLS = ['#7a2b2b', '#2f4a6b', '#4a6b3a', '#8a6a3a', '#5b3a6b', '#6b6b6b', '#a0522d', '#2a5a5a'], SEAT_MAT = {};
const SEAT_MATS = SEAT_COLS.map(c => () => SEAT_MAT[c] || (SEAT_MAT[c] = lmat({ color: c, roughness: 0.9, flatShading: true })));
// posed spectators sitting on the benches (static meshes: cheap enough for every arena)
function arenaSeatFolk(R, A, sides) {
  const rnd = seeded('seat' + A.key), keep = IS_TOUCH ? 0.22 : 0.45, L = LIST.L, W = LIST.W;
  const kinds = ['po_male_sitting', 'po_female_sitting', 'po_male_sitting_cheering', 'po_female_sitting_cheering'];
  for (const sx of sides || [-1, 1]) for (let row = 0; row < 3; row++) for (let zz = -L * 0.38; zz <= L * 0.38; zz += 1.3) {
    if (rnd() > keep) continue;
    const bx = A.x + sx * (W / 2 + 1.6 + row * 0.9), y = 0.45 + row * 0.5 + 0.06;
    const p = kpiece(R, kinds[Math.floor(rnd() * kinds.length)], bx, gy(A.x, A.z) + y - 0.5, A.z + zz + (rnd() - 0.5) * 0.3, sx < 0 ? Math.PI / 2 : -Math.PI / 2, 1);
    if (p) { const m = SEAT_MATS[Math.floor(rnd() * SEAT_MATS.length)](); p.traverse(o => { if (o.isMesh) o.material = m; }); }
  }
}
function spectate(A) {
  if (!BOUT.on || TOWN.boutArena !== A.key) { TOWN.forceArena = A.key; boutStop(); boutStart(); }
  TOWN.forceArena = A.key; TOWN.spec = { A, mode: 0, t: 0 }; TOWN.cam = null; AU.click && AU.click();
  $('#townPrompt').hidden = true; specHud();
  toastMenu(`Watching at ${A.name}. Walk off or press Leave to stop.`);
}
function stopSpectating() { if (!TOWN.spec) return; TOWN.spec = null; TOWN.forceArena = null; TOWN.cam = null; specHud(); townPrompt(); }
function specHud() {
  const el = $('#townSpec'); if (!el) return;
  const S = TOWN.spec; el.hidden = !S || !!G.screen; if (!S) return;
  if (!el.firstChild) el.append(h('span', { class: 'spectxt' }, h('small'), h('b')),
    h('button', { class: 'btn tape small', onclick: e => { e.stopPropagation(); if (TOWN.spec) { TOWN.spec.mode = (TOWN.spec.mode + 1) % SPEC_MODES.length; SPEC.follow++; specHud(); } } }, 'Angle'),
    h('button', { class: 'btn tape small', onclick: e => { e.stopPropagation(); stopSpectating(); } }, 'Leave'));
  const m = G.match, w = m && m.wins ? m.wins : [0, 0];
  el.querySelector('.spectxt small').textContent = `${S.A.name} · ${SPEC_MODES[S.mode]}`;
  el.querySelector('.spectxt b').textContent = BOUT.on ? `${BOUT.vs} · ${w[0]}–${w[1]}` : 'Next pairing walking on…';
}
// the spectator camera (called from updateTownCamera)
function specCamera(dt) {
  const S = TOWN.spec, A = S.A, cam = W3.camera; S.t += dt;
  const o = W3.matchRoot.position, live = (G.fighters || []).filter(f => !f.out && f.pos);
  let cx = 0, cz = 0; for (const f of live) { cx += f.pos.x; cz += f.pos.z; } if (live.length) { cx /= live.length; cz /= live.length; }
  const look = new THREE.Vector3(o.x + cx, o.y + 1.1, o.z + cz); let want;
  if (S.mode === 0) { // from the rope where you stand, head high, leaning in toward the action
    const px = TOWN.pos.x, pz = TOWN.pos.z, dx = look.x - px, dz = look.z - pz, d = Math.hypot(dx, dz) || 1, inn = Math.max(0, d - 9);
    want = new THREE.Vector3(px + dx / d * inn, o.y + 2.4, pz + dz / d * inn);
  } else if (S.mode === 1 && live.length) { const f = live[SPEC.follow % live.length], b = (f.facing || 0) + Math.PI; want = new THREE.Vector3(o.x + f.pos.x + Math.sin(b) * 3.6, o.y + 2.4, o.z + f.pos.z + Math.cos(b) * 3.6); look.set(o.x + f.pos.x, o.y + 1.3, o.z + f.pos.z); }
  else if (S.mode === 2) { const a = S.t * 0.12; want = new THREE.Vector3(look.x + Math.sin(a) * 9, o.y + (A.indoor ? 3.6 : 4.2), look.z + Math.cos(a) * 9); }
  else want = new THREE.Vector3(o.x + LIST.W / 2 + 4, o.y + (A.indoor ? 4 : 5.5), o.z + cz * 0.5);
  if (!TOWN.cam) { TOWN.cam = want.clone(); TOWN.look = look.clone(); }
  const k = 1 - Math.exp(-3 * dt); TOWN.cam.lerp(want, k); TOWN.look.lerp(look, k);
  cam.position.copy(TOWN.cam); cam.lookAt(TOWN.look);
  if ((G.frameN || 0) % 20 === 0) specHud();
}
// arenas you're not at: a pairing and a result every minute or two, so the boards and the map always have news
function arenaTicker(dt) {
  SPEC.t -= dt; if (SPEC.t > 0) return; SPEC.t = 20;
  const clubs = ['reavers', 'wardens', 'rabble', ...Object.keys(CLUBS).filter(k => /^ladder\d$/.test(k))];
  for (const A of ARENAS) {
    if (A.key === TOWN.boutArena) continue;
    const R = SPEC.results[A.key]; if (R && R.until > G.realTime) continue;
    const a = pick(clubs); let b = pick(clubs), g = 0; while (b === a && g++ < 10) b = pick(clubs);
    const wa = Math.random() < 0.5, s = wa ? [2, Math.random() < 0.5 ? 1 : 0] : [Math.random() < 0.5 ? 1 : 0, 2];
    SPEC.results[A.key] = { text: `${CLUBS[a].name} ${s[0]}–${s[1]} ${CLUBS[b].name}`, until: G.realTime + 60 + Math.random() * 90 };
  }
}
function arenaNews(A) { if (A.live && A.liveText) return A.liveText; if (TOWN.boutArena === A.key && BOUT.on) return `On now: ${BOUT.vs}`; const R = SPEC.results[A.key]; return R ? `Last: ${R.text}` : ''; }
