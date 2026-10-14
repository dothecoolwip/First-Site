// ---------- townsfolk who do things: sit by the fire, browse the stalls, watch the lists, chat at the fountain, fetch water,
// visit the graves, dance to the bard; a smith at the anvil, guards on the wall, a gardener in the pumpkins, kids playing tag.
// Each activity spot ("smart object") has an approach point, a place to be, a facing, an animation and how long it lasts.
// People pick a spot by what their role likes and how far it is, steer around obstacles to get there (no teleporting), settle in,
// do the thing, then pick something else. If they can't get somewhere they give up and choose again.
const NAV = { cell: 4, grid: new Map(), none: [] };
function navBuild() {
  NAV.grid.clear();
  for (const o of TOWN.obst) {
    if (o.r < 0.05) continue;
    for (let i = Math.floor((o.x - o.r) / NAV.cell); i <= Math.floor((o.x + o.r) / NAV.cell); i++)
      for (let j = Math.floor((o.z - o.r) / NAV.cell); j <= Math.floor((o.z + o.r) / NAV.cell); j++) { const k = i + ',' + j; let L = NAV.grid.get(k); if (!L) NAV.grid.set(k, L = []); L.push(o); }
  }
}
// a terrace edge: the ground within r drops or rises by more than a step (ramps are gentle, cliffs are not)
function cliffAt(x, z, r) {
  if (typeof gy !== 'function' || hillNd(HILL_T[0], x, z) > 1.04) return false;
  const y = gy(x, z), d = r + 0.6;
  return Math.abs(gy(x + d, z) - y) > 1.2 || Math.abs(gy(x - d, z) - y) > 1.2 || Math.abs(gy(x, z + d) - y) > 1.2 || Math.abs(gy(x, z - d) - y) > 1.2;
}
function navBlocked(x, z, r) {
  if (lakeBlocked(x, z, r)) return true;
  if (arenaBlocked(x, z, r)) return true;
  if (typeof gateBlocked === 'function' && gateBlocked(x, z, r)) return true;
  if (Math.hypot(x / TOWN_RX, z / TOWN_RZ) > 0.985) return true;
  if (cliffAt(x, z, r)) return true;
  for (let i = Math.floor((x - r) / NAV.cell); i <= Math.floor((x + r) / NAV.cell); i++) for (let j = Math.floor((z - r) / NAV.cell); j <= Math.floor((z + r) / NAV.cell); j++) {
    const L = NAV.grid.get(i + ',' + j) || NAV.none;
    for (const o of L) { const dx = x - o.x, dz = z - o.z, m = o.r + r; if (dx * dx + dz * dz < m * m) return true; }
  }
  if (gameplayShapeBlocked(x, z, r)) return true;
  return false;
}
// context steering: score 16 directions by how much they head for the goal, minus danger from obstacles close ahead
function navSteer(N, tx, tz) {
  const dx = tx - N.x, dz = tz - N.z, d = Math.hypot(dx, dz) || 1, gx = dx / d, gz = dz / d;
  let best = -1e9, bx = gx, bz = gz;
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * TAU, cx = Math.sin(a), cz = Math.cos(a);
    let v = cx * gx + cz * gz + 0.3 * (cx * N.hx + cz * N.hz) + 0.15 * (cx * N.sideX + cz * N.sideZ);
    for (const st of [0.45, 1.0, 1.7, 2.5]) { if (st > d + 0.4) break; if (navBlocked(N.x + cx * st, N.z + cz * st, 0.32)) { v -= 2.4 * (1.15 - st / 2.5); break; } }
    if (v > best) { best = v; bx = cx; bz = cz; }
  }
  return [bx, bz];
}
function navPushOut(N, beforeMove) { // a gentle positional correction, never a jump
  // World NPCs stay behind every list's rope. Fight participants are managed by
  // the bout engine inside the list, so this does not move fighters or corners.
  for (const A of ARENAS) {
    const dx = N.x - A.x, dz = N.z - A.z;
    if (Math.abs(dx) >= LIST_BLOCK.x + 0.3 || Math.abs(dz) >= LIST_BLOCK.z + 0.3) continue;
    const px = LIST_BLOCK.x + 0.3 - Math.abs(dx), pz = LIST_BLOCK.z + 0.3 - Math.abs(dz);
    if (px < pz) N.x = A.x + Math.sign(dx || 1) * (LIST_BLOCK.x + 0.3);
    else N.z = A.z + Math.sign(dz || 1) * (LIST_BLOCK.z + 0.3);
  }
  const L = new Set();
  for (let i = Math.floor((N.x - 0.32) / NAV.cell); i <= Math.floor((N.x + 0.32) / NAV.cell); i++) for (let j = Math.floor((N.z - 0.32) / NAV.cell); j <= Math.floor((N.z + 0.32) / NAV.cell); j++) for (const o of NAV.grid.get(i + ',' + j) || NAV.none) L.add(o);
  for (const o of L) { const dx = N.x - o.x, dz = N.z - o.z, d = Math.hypot(dx, dz), m = o.r + 0.32; if (d < m) { N.x = o.x + (d > 1e-4 ? dx / d : 1) * m; N.z = o.z + (d > 1e-4 ? dz / d : 0) * m; } }
  gameplayShapePush(N, 0.3);
  lakePush(N, 0.3);
  if (beforeMove && !castleWalkable(beforeMove.x, beforeMove.z, N.x, N.z, 0.3)) {
    const x = N.x, z = N.z;
    N.x = beforeMove.x; N.z = beforeMove.z;
    if (castleWalkable(beforeMove.x, beforeMove.z, x, beforeMove.z, 0.3)) N.x = x;
    if (castleWalkable(N.x, beforeMove.z, N.x, z, 0.3)) N.z = z;
  }
}
// a free point near (x, z), searching outward
function navFree(x, z, r = 0.4) {
  if (!navBlocked(x, z, r)) return { x, z };
  for (let rad = 0.6; rad < 6; rad += 0.6) for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, px = x + Math.sin(a) * rad, pz = z + Math.cos(a) * rad; if (!navBlocked(px, pz, r)) return { x: px, z: pz }; }
  return null;
}
const FOLK = { spots: [], people: [], routeBudget: 1, limit: 0, ema: 0.016, slow: 0, healthy: 0, nearGrid: new Map() };
function folkSpot(type, x, z, face, anim, dur, opt) {
  const ax = x + Math.sin(face) * (opt && opt.reach || 0), az = z + Math.cos(face) * (opt && opt.reach || 0);
  const ap = navFree(ax, az); if (!ap || (!opt?.seat && !folkLineFree(ap.x, ap.z, x, z))) return;
  FOLK.spots.push(Object.assign({ type, x, z, face, anim, dur, ax: ap.x, az: ap.z, occ: null }, opt || {}));
}
function folkSpots() {
  FOLK.spots = [];
  const face = (fx, fz, tx, tz) => Math.atan2(tx - fx, tz - fz);
  // sit on the stools round the tavern's campfire, and at the long table
  for (const a of [3.6, 2.6, 1.6]) { const x = 29 + Math.sin(a) * 2.6, z = 25 + Math.cos(a) * 2.6; folkSpot('sit', x, z, face(x, z, 29, 25), 'Sitting_Talking_Loop', [15, 40], { reach: 0.9, seat: true, alt: 'Sitting_Idle_Loop' }); }
  folkSpot('sit', 30.6, 14.6, 0, 'Sitting_Talking_Loop', [20, 50], { reach: -0.9, seat: true, alt: 'Sitting_Idle_Loop' });
  folkSpot('sit', 30.6, 16.6, Math.PI, 'Sitting_Idle_Loop', [20, 50], { reach: -0.9, seat: true, alt: 'Sitting_Talking_Loop' });
  // the castle's feast table
  folkSpot('sit', 18, -238.6, Math.PI, 'Sitting_Talking_Loop', [20, 50], { reach: -0.9, seat: true });
  folkSpot('sit', 18, -241.4, 0, 'Sitting_Idle_Loop', [20, 50], { reach: -0.9, seat: true });
  // warm hands at the fires (tavern and the clubs' camp)
  for (const a of [5.2, 0.4]) { const x = 29 + Math.sin(a) * 2.2, z = 25 + Math.cos(a) * 2.2; folkSpot('fire', x, z, face(x, z, 29, 25), 'Idle_Loop', [10, 25]); }
  for (const a of [0, 2.1, 4.2]) { const x = 45 + Math.sin(a) * 2, z = 59 + Math.cos(a) * 2; folkSpot('fire', x, z, face(x, z, 45, 59), a ? 'Idle_Talking_Loop' : 'Idle_Loop', [12, 30]); }
  // browse every shop and the food stalls
  for (const S of TOWN.stalls) { if (S.player || S.station || S.arena || S.secret || S.node || !S.V || !S.V.role) continue; for (const side of [-1, 1]) { const x = S.ax + Math.cos(S.ry) * 2.2 * side, z = S.az - Math.sin(S.ry) * 2.2 * side; if (TOWN.stalls.some(O => Math.hypot(x - O.ax, z - O.az) < 1.5)) continue; folkSpot('browse', x, z, S.ry + Math.PI, side < 0 ? 'Idle_Talking_Loop' : 'Interact', [8, 20], { stall: S.V.key }); } }
  for (let i = 0; i < 4; i++) { const x = 28 + i * 6.2; folkSpot('eat', x - 0.7, -4.2, Math.PI, 'Interact', [6, 14], { alt: 'Idle_Talking_Loop' }); folkSpot('eat', x + 0.8, -3.9, Math.PI, 'Idle_Loop', [6, 14]); }
  // watch the fights from every side of the rope
  for (const x of [-16.5, -13.5, -10.5, -4.4, 4.4, 10.5, 13.5, 16.5]) folkSpot('watch', x, 24.1, Math.PI, 'Idle_Loop', [20, 60], { alt: 'Idle_Talking_Loop' });
  for (const x of [-12, -5, 5, 12]) folkSpot('watch', x, -24.2, 0, 'Idle_Loop', [20, 60], { alt: 'Idle_Talking_Loop' });
  for (const sx of [-1, 1]) for (const z of [-19, -7, 7, 19]) folkSpot('watch', sx * 19.2, z, sx < 0 ? Math.PI / 2 : -Math.PI / 2, 'Idle_Loop', [20, 60], { alt: 'Idle_Talking_Loop' });
  // chat in a ring at the fountain
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4, x = Math.sin(a) * 3.3, z = 44 + Math.cos(a) * 3.3; folkSpot('chat', x, z, face(x, z, 0, 44), k % 2 ? 'Idle_Talking_Loop' : 'Idle_Loop', [15, 35], { ring: 'fountain' }); }
  // fetch water, read the notices, visit the graves, dance to the bard, try the archery, practise on the pells
  folkSpot('water', 53.4, -5.6, face(53.4, -5.6, 56, -8), 'PickUp_Table', [4, 6], { then: 'Interact' });
  folkSpot('board', 13.5, 28.1, Math.PI, 'Idle_Loop', [6, 14]);
  for (const x of [39, 42.5, 46, 49]) folkSpot('grave', x, -48.6, Math.PI, 'Crouch_Idle_Loop', [8, 18], { alt: 'Idle_Loop' });
  for (let k = 0; k < 4; k++) { const x = 29.5 + (k % 2) * 2.6, z = 3.8 + Math.floor(k / 2) * 2.4; folkSpot('dance', x, z, face(x, z, 37, 5), 'Dance_Loop', [10, 25]); }
  for (const z of [6, 10, 14]) folkSpot('archery', 52, z, Math.PI / 2, 'Interact', [8, 16], { alt: 'Idle_Loop' });
  for (const z of [-26, -30.5, -35]) folkSpot('train', -32.6, z, Math.PI / 2, 'Sword_Attack', [10, 20], { alt: 'Idle_Loop' });
  // jobs with an owner: the smith's anvil, the gardener's pumpkins, guards at the castle gate
  folkSpot('smith', -42, 19.9, Math.PI, 'Sword_Attack', [9999, 9999], { owner: 'smith', reach: 0.4 });
  folkSpot('garden', -31.4, 58, Math.PI / 2, 'Fixing_Kneeling', [12, 25], { owner: 'gardener', alt: 'Idle_Loop' });
  folkSpot('garden', -25.6, 62, -Math.PI / 2, 'Fixing_Kneeling', [12, 25], { owner: 'gardener', alt: 'Idle_Loop' });
  for (const sx of [-3.4, 3.4]) folkSpot('post', sx, CASTLE.z1 + 2.6, 0, 'Idle_Loop', [9999, 9999], { owner: 'gateguard' });
}
// what each role likes doing (weights), and how fast they walk
const FOLK_ROLES = {
  visitor: { browse: 4, eat: 2, chat: 1, board: 1, walk: 'Walk_Loop', spd: [1.1, 1.5] },
  walker: { browse: 1, water: 1, board: 1, grave: 1, walk: 'Walk_Loop', spd: [1.3, 1.7] },
  fan: { watch: 5, eat: 1, fire: 1, chat: 1, walk: 'Walk_Loop', spd: [1.1, 1.4] },
  towns: { sit: 1.2, fire: 1, browse: 2.2, eat: 1.4, watch: 1.8, chat: 1.4, water: 0.5, board: 0.6, grave: 0.4, dance: 0.6, archery: 0.6, train: 0.5, walk: 'Walk_Loop', spd: [1.15, 1.5] },
  kid: { dance: 1.5, watch: 1, eat: 0.8, chat: 0.3, board: 0.1, play: 3, walk: 'Jog_Fwd_Loop', spd: [3.2, 3.8] },
  gateguard: { post: 1, walk: 'Walk_Formal_Loop', spd: [1.1, 1.1] },
  smith: { smith: 1, walk: 'Walk_Loop', spd: [1.2, 1.2] },
  gardener: { garden: 3, water: 1, fire: 0.5, walk: 'Walk_Loop', spd: [1, 1.1] },
  guard: { patrol: 1, walk: 'Walk_Formal_Loop', spd: [1.1, 1.1] }
};
const GUARD_PATH = [[-14, -150], [14, -150], [30, -165], [14, -176], [-14, -176], [-30, -165]]; // round the outer bailey yard
function buildFolk() {
  FOLK.people = [];
  if (typeof UAL === 'undefined' || !UAL.ready) return;
  townCrowd(!buildSpectators());
  navBuild(); folkSpots();
  const cols = ['#6b4e16', '#2c4a8c', '#23704a', '#8c1f4f', '#4b1d6b', '#7a4a12', '#1f4a4a', '#5a5a5a', '#9a2a12', '#335c3f', '#c46a1c', '#2c2c54'];
  const roles = IS_TOUCH ? ['smith', 'guard', 'gateguard', 'gardener', 'towns', 'towns', 'towns', 'towns', 'towns', 'towns', 'kid', 'kid'] : ['smith', 'guard', 'guard', 'gateguard', 'gateguard', 'gardener', 'towns', 'towns', 'towns', 'towns', 'towns', 'towns', 'towns', 'towns', 'towns', 'towns', 'towns', 'towns', 'kid', 'kid', 'kid', 'kid'];
  while (roles.length < (IS_TOUCH ? 28 : 48)) roles.push(['visitor', 'walker', 'fan', 'towns'][roles.length % 4]);
  FOLK.limit = roles.length; FOLK.ema = 0.016; FOLK.slow = FOLK.healthy = 0;
  roles.forEach((role, i) => {
    const kid = role === 'kid', fit = folkOutfit(role, i), J = costumeOr({ main: role === 'guard' || role === 'gateguard' ? '#26344d' : role === 'smith' ? '#3a2a1a' : cols[i % cols.length], joints: role === 'guard' || role === 'gateguard' ? '#9aa3a8' : '#2a2e33', h: kid ? rand(1.1, 1.3) : rand(1.62, 1.86), anim: 'Idle_Loop' }, fit);
    if (J.costume) { if (role === 'guard' || role === 'gateguard') kettleHat(J); else if (J.costume.includes('Peasant') && role !== 'smith') { const hat = pick(['cap', 'flowers', 'none', 'none', 'hood']); if (hat !== 'none') dress(J, { b: pick(['#6b4e16', '#3a4a2a', '#5a2a2a', '#2a3a5a']), t: pick(['#c9b48a', '#e8e0cc', '#8a6a42']), h: hat, c: 'none', n: 'none' }); } }
    if ((role === 'guard' || role === 'gateguard') && J.handR) { const sp = grp(J.handR, 0, 0.06, 0.02); mk(sp, geo('f_spear', () => new THREE.CylinderGeometry(0.018, 0.018, 2.1, 6)), tmat('#5a3b24'), 0, 0.5, 0); mk(sp, geo('f_tip', () => new THREE.ConeGeometry(0.035, 0.18, 6)), tmat('#c9d2d6', { metalness: 0.8 }), 0, 1.62, 0); }
    if (role === 'smith' && J.handR) { const hm = grp(J.handR, 0, 0.06, 0.02); mk(hm, geo('t_hh', () => new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6)), tmat('#5a3b24'), 0, 0.12, 0); mk(hm, geo('t_hhead', () => new THREE.BoxGeometry(0.1, 0.07, 0.16)), tmat('#2b2e31', { metalness: 0.6 }), 0, 0.32, 0); }
    if (role === 'gardener' && !J.costume) dress(J, { b: '#6b4e16', t: '#c9b48a', h: 'cap', c: 'none', n: 'none' });
    const R0 = FOLK_ROLES[role], start = role === 'guard' ? navFree(GUARD_PATH[i % 2 ? 2 : 0][0], GUARD_PATH[i % 2 ? 2 : 0][1]) : role === 'gateguard' ? navFree(i % 2 ? 3.4 : -3.4, CASTLE.z1 + 4) : folkDistrictSpawn(i);
    if (!start) return;
    const N = { J, role, kid, x: start.x, z: start.z, hx: 0, hz: 1, sideX: 0, sideZ: 0, face: rand(0, TAU), state: 'choose', spot: null, tx: 0, tz: 0, timer: rand(0, 2), best: 1e9, stuck: 0, fails: 0, spd: rand(...R0.spd), pathI: i % GUARD_PATH.length, settle: 0, anim: 'Idle_Loop' };
    J.root.position.set(N.x, gy(N.x, N.z), N.z); J.root.userData.dyn = true; TOWN.root.add(J.root); FOLK.people.push(N);
  });
}
function folkPlay(N, name, fade = 0.3) { N.anim = name; if (N.J.ual) N.J.play(UAL.clips[name] ? name : 'Idle_Loop', fade); }
function folkChoose(N) {
  const R0 = FOLK_ROLES[N.role];
  N.route = null; N.routeSearch = null; N.detour = false;
  if (N.role === 'guard') { const p = GUARD_PATH[N.pathI = (N.pathI + 1) % GUARD_PATH.length]; N.spot = null; N.tx = p[0]; N.tz = p[1]; N.state = 'walk'; N.best = 1e9; N.stuck = 0; folkPlay(N, R0.walk); return; }
  if (N.role === 'kid' && Math.random() < (R0.play / 6)) { const leader = FOLK.people.find(o => o.kid && o !== N && o.state === 'walk'); const t = leader && Math.random() < 0.6 ? navFree(leader.x + rand(-2, 2), leader.z + rand(-2, 2)) : freeSpot(); if (!t) return; N.route = null; N.spot = null; N.tx = t.x; N.tz = t.z; N.state = 'walk'; N.best = 1e9; N.stuck = 0; folkPlay(N, R0.walk); return; }
  const opts = [];
  for (const S of FOLK.spots) {
    if (S.occ) continue; if (S.owner && S.owner !== N.role) continue; const w = R0[S.type] || 0; if (!w) continue;
    const d = Math.hypot(S.ax - N.x, S.az - N.z); opts.push([S, w / (1 + d / 18) * (0.7 + Math.random() * 0.6)]);
  }
  opts.sort((a, b) => b[1] - a[1]);
  const pick = opts.slice(0, 3); let tot = pick.reduce((s, o) => s + o[1], 0), r = Math.random() * tot, S = null;
  for (const [s, w] of pick) { r -= w; if (r <= 0) { S = s; break; } }
  if (!S) { const t = freeSpot(); if (!t) { N.timer = 2; return; } N.spot = null; N.tx = t.x; N.tz = t.z; } else { S.occ = N; N.spot = S; N.tx = S.ax; N.tz = S.az; }
  N.state = 'walk'; N.best = 1e9; N.stuck = 0; folkPlay(N, R0.walk);
}
function folkRelease(N) { if (N.spot && N.spot.occ === N) N.spot.occ = null; N.spot = null; }
function updateFolk(dt) {
  updateSpectators(dt);
  if (!FOLK.people.length) return;
  const P = TOWN.pos;
  folkPopulationTick(dt); FOLK.routeBudget = 1; folkNeighborBuild();
  FOLK.routeCursor = ((FOLK.routeCursor || 0) + 1) % FOLK.people.length;
  for (let index = 0; index < FOLK.people.length; index++) {
    const N = FOLK.people[(index + FOLK.routeCursor) % FOLK.people.length];
    if (N.suspended) continue;
    const distance = pd(N, P); N.elapsed = (N.elapsed || 0) + dt;
    if (distance > (IS_TOUCH ? 45 : 65) && N.elapsed < 0.3) continue;
    const stepDt = Math.min(N.elapsed, 0.3); N.elapsed = 0; N.elapsedStep = stepDt;
    const R0 = FOLK_ROLES[N.role];
    if (N.state === 'walk' || N.state === 'choose') {
      if (navBlocked(N.x, N.z, 0.32)) {
        const recovered = navFree(N.x, N.z, 0.32);
        if (!recovered) { N.J.root.visible = false; continue; }
        N.x = recovered.x; N.z = recovered.z; N.route = null; N.routeSearch = null;
      }
    }
    if (N.state === 'choose') { N.timer -= stepDt; if (N.timer <= 0) folkChoose(N); }
    else if (N.state === 'walk') {
      // step aside for the player and for each other
      N.sideX = 0; N.sideZ = 0;
      const pdx = N.x - P.x, pdz = N.z - P.z, pd = Math.hypot(pdx, pdz); if (pd < 1.6 && pd > 1e-3) { N.sideX += pdx / pd; N.sideZ += pdz / pd; }
      for (const O of folkNeighbors(N)) { if (O === N || O.suspended) continue; const ox = N.x - O.x, oz = N.z - O.z, od = ox * ox + oz * oz; if (od < 1 && od > 1e-4) { const q = Math.sqrt(od); N.sideX += ox / q * 0.6; N.sideZ += oz / q * 0.6; } }
      const waypoint = folkWaypoint(N);
      if (!waypoint) continue;
      const [cx, cz] = navSteer(N, waypoint[0], waypoint[1]);
      const [sx, sz] = gameplayFolkDirection(N, waypoint[0], waypoint[1], stepDt, cx, cz);
      N.hx += (sx - N.hx) * Math.min(1, stepDt * 6); N.hz += (sz - N.hz) * Math.min(1, stepDt * 6); const hl = Math.hypot(N.hx, N.hz) || 1; N.hx /= hl; N.hz /= hl;
      const walkSpeed = Math.min(N.spd, Math.max(0.6, Math.hypot(N.tx - N.x, N.tz - N.z) / 0.6));
      const beforeMove = { x: N.x, z: N.z };
      folkMove(N, N.hx * walkSpeed * stepDt, N.hz * walkSpeed * stepDt); navPushOut(N, beforeMove);
      N.face = Math.atan2(N.hx, N.hz);
      const d = Math.hypot(waypoint[0] - N.x, waypoint[1] - N.z);
      if (d < N.best - 0.05) { N.best = d; N.stuck = 0; } else if ((N.stuck += stepDt) > 2.5) { N.stuck = 0; N.best = 1e9; if (++N.fails >= 2) { N.fails = 0; folkRelease(N); N.state = 'choose'; N.timer = rand(0.5, 2); folkPlay(N, 'Idle_Loop'); continue; } N.route = null; N.routeWait = 0.5; }
      if (d < 0.25 && N.route && N.route.length > 1) { N.route.shift(); N.best = 1e9; N.stuck = 0; N.J.root.position.set(N.x, gy(N.x, N.z), N.z); continue; }
      if (d < 0.25) {
        if (N.detour && N.spot) { N.detour = false; N.tx = N.spot.ax; N.tz = N.spot.az; N.best = 1e9; }
        else if (N.spot) { N.fails = 0; N.state = 'settle'; N.settle = 0; N.sx = N.x; N.sz = N.z; }
        else { N.fails = 0; N.state = 'choose'; N.timer = N.kid ? rand(0.1, 0.8) : N.role === 'guard' ? rand(2, 5) : rand(1, 4); folkPlay(N, N.role === 'guard' ? 'Idle_Loop' : 'Idle_Loop'); }
      }
    } else if (N.state === 'settle') { // glide from the approach point into place, turning to face the spot's way
      const S = N.spot; N.settle = Math.min(1, N.settle + stepDt * 1.6);
      N.x = N.sx + (S.x - N.sx) * N.settle; N.z = N.sz + (S.z - N.sz) * N.settle;
      let df = S.face - N.face; df = Math.atan2(Math.sin(df), Math.cos(df)); N.face += df * Math.min(1, stepDt * 6);
      if (N.settle >= 1) { N.state = 'act'; N.timer = rand(S.dur[0], S.dur[1]); N.phase = 0; folkPlay(N, S.alt && Math.random() < 0.4 ? S.alt : S.anim, 0.4); if (N.J.ual && N.J.acts[N.anim]) { N.J.acts[N.anim].time = Math.random() * 2; N.J.acts[N.anim].timeScale = 0.9 + Math.random() * 0.2; } }
    } else if (N.state === 'act') {
      const S = N.spot; N.timer -= stepDt; N.phase += stepDt;
      if (S.then && N.phase > 2.2 && N.anim !== S.then) folkPlay(N, S.then);
      if (S.ring === 'fountain' && N.phase > 4) { N.phase = 0; folkPlay(N, N.anim === 'Idle_Talking_Loop' ? 'Idle_Loop' : 'Idle_Talking_Loop', 0.5); } // take turns talking
      if (!S.seat && S.type !== 'smith' && S.type !== 'garden' && pd(N, P) < 3.2 && TOWN.speed < 0.5) { const want = Math.atan2(P.x - N.x, P.z - N.z); let df = want - N.face; df = Math.atan2(Math.sin(df), Math.cos(df)); N.face += df * Math.min(1, stepDt * 2.5); } // turn to look at you when you stop by
      else { let df = S.face - N.face; df = Math.atan2(Math.sin(df), Math.cos(df)); N.face += df * Math.min(1, stepDt * 2); }
      if (N.timer <= 0) { N.state = 'leave'; N.settle = 0; folkPlay(N, 'Idle_Loop', 0.4); }
    } else if (N.state === 'leave') { // stand up and step back out to the approach point, then choose again
      const S = N.spot; N.settle = Math.min(1, N.settle + stepDt * 1.8);
      N.x = S.x + (S.ax - S.x) * N.settle; N.z = S.z + (S.az - S.z) * N.settle;
      if (N.settle >= 1) { folkRelease(N); N.state = 'choose'; N.timer = rand(0.3, 1.5); }
    }
    N.J.root.position.set(N.x, gy(N.x, N.z), N.z); N.J.root.rotation.y = N.face;
    if (N.J.ual && N.J.root.visible) N.J.mixer.update(stepDt);
  }
}
function pd(N, P) { return Math.hypot(N.x - P.x, N.z - P.z); }
