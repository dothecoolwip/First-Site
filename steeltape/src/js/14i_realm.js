// ===================================================================
// The Realm: the festival grew into a whole country around it.
//   Fairground (centre)   the festival, the Dome with the original list, tier-1 vendors
//   Millbrook (south-west) the village: farm, fields, cottages, Peasants' arena
//   The Old Woods (west)   deep woods, the quarry, charcoal burners, Forest arena
//   Mirror Lake (east)     lake, jetties, boathouse, cliffs, Beach arena
//   The Outer Bailey (north) inside the first curtain wall: tier-2 vendors, Castle arena (gate: level 15 + writ)
//   The King's Court (far north) the inner ward and the Great Hall: tier-3 vendors (gate: level 40 + writ)
// You walk (or ride) everywhere; nothing teleports. Roads and signposts link the districts.
// ===================================================================
const FAIR_RX = 92, FAIR_RZ = 98; // the old town: the fairground is this big
const BAILEY = { x0: -114, x1: 114, z0: -306, z1: -150 };
const WARD = { x0: -54, x1: 54, z0: -294, z1: -210 };
const HALL = { x0: -19, x1: 19, z0: -286, z1: -238 };
const LAKE = { x: 222, z: 40, rx: 56, rz: 82 };
const DISTRICTS = [
  { key: 'fair', name: 'The Fairground', x: 0, z: 12, r: 100 },
  { key: 'village', name: 'Millbrook Village', x: -180, z: 135, r: 88 },
  { key: 'woods', name: 'The Old Woods', x: -205, z: -80, r: 100 },
  { key: 'lake', name: 'Mirror Lake', x: 200, z: 40, r: 95 },
  { key: 'bailey', name: 'The Outer Bailey', x: 0, z: -228, r: 120, gate: 'bailey' },
  { key: 'ward', name: 'The King’s Court', x: 0, z: -252, r: 46, gate: 'royal' }
];
// arenas: every one is a 20 x 30 list (LIST) so the fight engine runs unchanged; the bout plays at the nearest one
const ARENAS = [
  { key: 'dome', name: 'The Dome', x: 0, z: 0, bx: 18, bz: 23, district: 'fair' },
  { key: 'peasant', name: 'Peasants’ Arena', x: -176, z: 158, bx: 13, bz: 18, district: 'village' },
  { key: 'forest', name: 'Forest Arena', x: -214, z: -104, bx: 13, bz: 18, district: 'woods' },
  { key: 'beach', name: 'Beach Arena', x: 148, z: 78, bx: 13, bz: 18, district: 'lake' },
  { key: 'castle', name: 'Castle Arena', x: 70, z: -205, bx: 14, bz: 19, district: 'bailey', gate: 'bailey' },
  { key: 'hall', name: 'The Great Hall', x: 0, z: -262, bx: 12, bz: 17, district: 'ward', gate: 'royal', indoor: true }
];
const ROADS = [
  { name: 'north', pts: [[0, -24], [0, -150], [0, -210], [0, -238]], w: 6 },
  { name: 'west', pts: [[-52, -2], [-100, -16], [-150, -44], [-196, -78]], w: 5 },
  { name: 'southwest', pts: [[-16, 70], [-62, 96], [-118, 122], [-160, 140]], w: 5 },
  { name: 'east', pts: [[52, 6], [96, 26], [128, 58], [126, 84], [132, 100]], w: 5 },
  { name: 'woodsnorth', pts: [[-196, -78], [-170, -130], [-120, -150]], w: 4 },
  { name: 'lakenorth', pts: [[128, 58], [150, -10], [176, -60]], w: 4 },
  { name: 'south', pts: [[0, 70], [0, 120], [-30, 160]], w: 4 },
  { name: 'bailey', pts: [[-90, -170], [90, -170]], w: 5 }
];
function arenaBlocked(x, z, r) { for (const A of ARENAS) if (Math.abs(x - A.x) < A.bx + r && Math.abs(z - A.z) < A.bz + r) return A; return null; }
function lakeIn(x, z, pad = 0) { const dx = (x - LAKE.x) / (LAKE.rx + pad), dz = (z - LAKE.z) / (LAKE.rz + pad); return dx * dx + dz * dz < 1; }
function districtAt(x, z) {
  if (x > WARD.x0 && x < WARD.x1 && z > WARD.z0 && z < WARD.z1) return DISTRICTS[5];
  if (x > BAILEY.x0 && x < BAILEY.x1 && z > BAILEY.z0 && z < BAILEY.z1) return DISTRICTS[4];
  let best = null, bd = 1e9; for (const D of DISTRICTS.slice(0, 4)) { const d = Math.hypot(x - D.x, z - D.z) / D.r; if (d < bd) { bd = d; best = D; } }
  return bd < 1.25 ? best : { key: 'wild', name: 'The Open Country' };
}
function nearestArena(x, z) { let best = null, bd = 1e9; for (const A of ARENAS) { const d = Math.hypot(x - A.x, z - A.z); if (d < bd) { bd = d; best = A; } } return { A: best, d: bd }; }
// ---- builders
function realmGround(R, x0, x1, z0, z1, col, tex, y) {
  const g = mk(R, new THREE.PlaneGeometry(x1 - x0, z1 - z0), lmat({ map: tex === false ? null : venueTex(tex || 'dirt'), color: col, roughness: 1 }), (x0 + x1) / 2, y != null ? y : 0.02, (z0 + z1) / 2, false);
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; (TOWN.mapRects = TOWN.mapRects || []).push([x0, x1, z0, z1, col]); return g;
}
function realmRoad(R, pts, w) {
  const m = TMAT['road' + w] || (TMAT['road' + w] = lmat({ map: venueTex('dirt'), color: '#b5a079', roughness: 1 }));
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0);
    const s = mk(R, new THREE.PlaneGeometry(w, L + w * 0.6), m, (x0 + x1) / 2, 0.018 + i * 0.0005, (z0 + z1) / 2, false); s.receiveShadow = true;
    s.rotation.order = 'YXZ'; s.rotation.set(-Math.PI / 2, Math.atan2(x1 - x0, z1 - z0), 0);
  }
  (TOWN.mapRoads = TOWN.mapRoads || []).push({ pts, w });
}
// a stone-and-timber building: stone base, plastered timber upper floor, a pitched roof; door on the +z side
function realmHall(R, x, z, w, d, h, ry, o) {
  o = o || {}; const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; R.add(g);
  const stone = tmat(o.stone || '#9a948a'), plaster = tmat(o.plaster || '#cbb894'), timber = tmat('#5a3b24'), roofM = tmat(o.roof || '#7a3a2a');
  const base = Math.min(2.2, h * 0.45);
  mk(g, new THREE.BoxGeometry(w, base, d), stone, 0, base / 2, 0).receiveShadow = true;
  mk(g, new THREE.BoxGeometry(w * 0.98, h - base, d * 0.98), o.allStone ? stone : plaster, 0, base + (h - base) / 2, 0);
  if (!o.allStone) {
    for (const fz of [-1, 1]) for (let i = -1; i <= 1.001; i += 2 / Math.max(1, Math.round(w / 3))) mk(g, geo('rh_beam', () => new THREE.BoxGeometry(0.18, 1, 0.08)), timber, i * w * 0.49, base + (h - base) / 2, fz * d * 0.495).scale.y = h - base;
    for (const fx of [-1, 1]) for (let i = -1; i <= 1.001; i += 2 / Math.max(1, Math.round(d / 3))) { const b = mk(g, geo('rh_beam', () => new THREE.BoxGeometry(0.18, 1, 0.08)), timber, fx * w * 0.495, base + (h - base) / 2, i * d * 0.49); b.scale.y = h - base; b.rotation.y = Math.PI / 2; }
    for (const fz of [-1, 1]) mk(g, new THREE.BoxGeometry(w, 0.2, 0.1), timber, 0, base + (h - base) * 0.5, fz * d * 0.495);
    for (const fx of [-1, 1]) mk(g, new THREE.BoxGeometry(0.1, 0.2, d), timber, fx * w * 0.495, base + (h - base) * 0.5, 0);
  }
  // roof: two slopes
  const rise = o.flat ? 0.3 : Math.min(w, d) * 0.42, sl = Math.hypot(w / 2, rise) + 0.3;
  for (const sx of [-1, 1]) { const p = mk(g, new THREE.BoxGeometry(sl, 0.22, d + 0.8), roofM, sx * w / 4, h + rise / 2, 0); p.rotation.z = -sx * Math.atan2(rise, w / 2); }
  { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, rise); sh.closePath(); const gg = new THREE.ShapeGeometry(sh); for (const sz of [-1, 1]) { const t = mk(g, gg, o.allStone ? stone : plaster, 0, h, sz * d / 2 * 0.99); t.rotation.y = sz < 0 ? Math.PI : 0; } }
  // door and windows
  mk(g, geo('rh_door', () => new THREE.BoxGeometry(1.4, 2.3, 0.12)), timber, 0, 1.15, d / 2 + 0.03);
  const win = tmat('#ffd27a', { emissive: '#a06010', emissiveIntensity: 0.6 });
  for (let i = 0; i < Math.max(1, Math.floor(w / 4)); i++) for (const sx of [-1, 1]) { const wx = sx * (1.8 + i * 3); if (Math.abs(wx) > w / 2 - 0.8) continue; mk(g, geo('rh_win', () => new THREE.BoxGeometry(0.8, 1, 0.1)), win, wx, base + (h - base) * 0.55, d / 2 + 0.02); }
  if (o.sign) { const s = townSign(o.sign, o.signCol || '#5a3b24'); s.position.set(0, Math.min(h - 0.4, 3.1), d / 2 + 0.12); g.add(s); }
  if (o.tower) { mk(g, new THREE.BoxGeometry(2.6, h + 7, 2.6), stone, -w / 2 + 1.3, (h + 7) / 2, -d / 2 + 1.3); mk(g, new THREE.ConeGeometry(2.2, 3.4, 4), roofM, -w / 2 + 1.3, h + 8.7, -d / 2 + 1.3).rotation.y = Math.PI / 4; }
  // obstacles along the footprint
  const c = Math.cos(ry || 0), s = Math.sin(ry || 0), step = 1.6;
  for (let u = -w / 2 + 0.8; u <= w / 2 - 0.8 + 1e-6; u += step) for (let v = -d / 2 + 0.8; v <= d / 2 - 0.8 + 1e-6; v += step) TOWN.obst.push({ x: x + u * c + v * s, z: z - u * s + v * c, r: 1.0 });
  return g;
}
// a wall run of castle pieces from (x0,z0) to (x1,z1); pieces 12 m long at scale 1.5
function castleRun(R, x0, z0, x1, z1, gapAt) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 12), ry = Math.abs(z1 - z0) < 1e-3 ? Math.PI / 2 : 0;
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (gapAt && gapAt(x, z)) continue; kpiece(R, 'cs_wall_2x4_walkway', x, 0, z, ry, 1.5); }
  const k = Math.max(1, Math.round(L / 1.7));
  for (let i = 0; i <= k; i++) { const t = i / k, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (gapAt && gapAt(x, z, true)) continue; TOWN.obst.push({ x, z, r: 1.25 }); }
}
function castleTower(R, x, z, h, flagCol) {
  kpiece(R, 'cs_tower_mid', x, 0, z, 0, 1.5); if (h > 1) { const t = kpiece(R, 'cs_tower_mid', x, 0, z, 0, 1.5); if (t) t.position.y = 6; }
  const top = kpiece(R, 'cs_tower_top_1', x, 0, z, 0, 1.5); if (top) top.position.y = h > 1 ? 12 : 6;
  const cone = kpiece(R, 'cs_roof_cone', x, 0, z, 0, 1.5); if (cone) cone.position.y = h > 1 ? 18.4 : 12.4;
  if (flagCol) { const fl = mk(R, geo('rlm_flag', () => new THREE.PlaneGeometry(1.8, 1.1)), lmat({ color: flagCol, side: THREE.DoubleSide }), x + 0.9, (h > 1 ? 25.5 : 19.5), z); WORLD.bob.push({ o: fl, k: 'flag' }); mk(R, geo('rlm_pole', () => new THREE.CylinderGeometry(0.05, 0.05, 3, 6)), tmat('#2b2e31'), x, h > 1 ? 24.6 : 18.6, z); }
  TOWN.obst.push({ x, z, r: 3.4 });
}
// the gate: a gatehouse, two towers, banners and torches; the gate itself is a gate obstacle that opens with the writ
function castleGate(R, x, z, key, label) {
  kpiece(R, 'cs_gate_2x4_doorway', x, 0, z, Math.PI / 2, 1.5);
  for (const sx of [-1, 1]) { const t = kpiece(R, 'cs_tower_mid', x + sx * 8.4, 0, z - 0.2, 0, 1.2); const tt = kpiece(R, 'cs_tower_top_1', x + sx * 8.4, 0, z - 0.2, 0, 1.2); if (tt) tt.position.y = 4.8; TOWN.obst.push({ x: x + sx * 8.4, z: z - 0.2, r: 2.6 }); }
  for (const sx of [-3.6, 3.6]) { const b = kpiece(R, 'dp_banner_large', x + sx, 0, z + 0.9, 0, 1.4); if (b) b.position.y = 1.6; }
  for (const sx of [-2.8, 2.8]) { const f = mk(R, geo('w_wtf', () => new THREE.ConeGeometry(0.08, 0.22, 8)), tmat('#ffb02e', { emissive: '#ff6a00', emissiveIntensity: 1.6 }), x + sx, 3.7, z + 0.8); WORLD.flick.push(f); kpiece(R, 'mk_Torch_Metal', x + sx, 2.6, z + 0.75, Math.PI, 1.4); }
  // the portcullis: drawn while you lack the writ
  const port = new THREE.Group(); port.position.set(x, 0, z + 0.2); R.add(port); const iron = tmat('#3a3d40', { metalness: 0.7, roughness: 0.5 });
  for (let i = -2; i <= 2; i++) mk(port, geo('rlm_pbar', () => new THREE.BoxGeometry(0.12, 4.2, 0.12)), iron, i * 0.95, 2.1, 0);
  for (let j = 0; j < 4; j++) mk(port, geo('rlm_pbar2', () => new THREE.BoxGeometry(4.6, 0.12, 0.12)), iron, 0, 0.6 + j * 1.1, 0);
  const G = { key, label, x, z: z + 0.2, port, r: 2.6 }; (TOWN.gates = TOWN.gates || []).push(G); return G;
}
// a list for one of the outer arenas: fence, rope, posts, stands on the long sides, a scoreboard and torches
function arenaList(R, A, o) {
  o = o || {}; const W = LIST.W, L = LIST.L, x = A.x, z = A.z;
  const post = tmat(o.post || '#6e4d31'), rail = tmat(o.rail || '#8a6a42');
  for (const [px, pz, len, rot] of [[0, -L / 2, W, 0], [0, L / 2, W, 0], [-W / 2, 0, L, Math.PI / 2], [W / 2, 0, L, Math.PI / 2]]) {
    for (const yy of [0.55, 1.05]) { const r = mk(R, geo('ar_rail' + len, () => new THREE.BoxGeometry(len, 0.09, 0.09)), rail, x + px, yy, z + pz); r.rotation.y = rot; }
    const n = Math.round(len / 2.5); for (let i = 0; i <= n; i++) { const t = -len / 2 + i * len / n; mk(R, geo('ar_post', () => new THREE.BoxGeometry(0.14, 1.25, 0.14)), post, x + (rot ? px : px + t), 0.62, z + (rot ? pz + t : pz)); }
  }
  if (o.floor) { const f = mk(R, new THREE.PlaneGeometry(W, L), lmat({ map: venueTex(o.floorTex || 'dirt'), color: o.floor, roughness: 1 }), x, 0.025, z, false); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; }
  // stands: tiered benches on both long sides
  if (o.stands !== false) for (const sx of [-1, 1]) for (let row = 0; row < 3; row++) {
    const bx = x + sx * (W / 2 + 1.6 + row * 0.9), b = mk(R, geo('ar_bench', () => new THREE.BoxGeometry(0.7, 0.12, L * 0.8)), tmat(o.bench || '#7a5a3a'), bx, 0.45 + row * 0.5, z); b.receiveShadow = true;
    mk(R, geo('ar_benchleg', () => new THREE.BoxGeometry(0.7, 1, 0.2)), tmat('#4a3422'), bx, (0.45 + row * 0.5) / 2, z - L * 0.38).scale.y = 0.45 + row * 0.5;
    mk(R, geo('ar_benchleg', () => new THREE.BoxGeometry(0.7, 1, 0.2)), tmat('#4a3422'), bx, (0.45 + row * 0.5) / 2, z + L * 0.38).scale.y = 0.45 + row * 0.5;
  }
  if (o.stands !== false) arenaSeatFolk(R, A);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { kpiece(R, 'mk_Torch_Metal', x + sx * (W / 2 + 0.6), 1.2, z + sz * (L / 2 + 0.6), 0, 1.6); const f = mk(R, geo('w_wtf', () => new THREE.ConeGeometry(0.08, 0.22, 8)), tmat('#ffb02e', { emissive: '#ff6a00', emissiveIntensity: 1.6 }), x + sx * (W / 2 + 0.6), 2.2, z + sz * (L / 2 + 0.6)); WORLD.flick.push(f); }
  // the board: arena name, and the bout when one is on
  const board = townSign(A.name, o.signCol || '#6d1b28'); board.position.set(x, 3.4, z - L / 2 - 2.2); board.scale.setScalar(2); R.add(board);
  for (const sx of [-2.4, 2.4]) mk(R, geo('ar_bpost', () => new THREE.CylinderGeometry(0.08, 0.1, 3.6, 6)), post, x + sx, 1.8, z - L / 2 - 2.3);
  // block the stands so nobody walks through them (the list itself is blocked by arenaBlocked)
  return board;
}
// the original list sits under a great wooden dome: a ring of posts and a conical roof with an open top
function buildDome(R) {
  const rad = 27, posts = 20, wood = tmat('#5a3b24'), roof = lmat({ color: '#c2a777', roughness: 1, side: THREE.DoubleSide });
  for (let i = 0; i < posts; i++) { const a = i / posts * TAU; if (Math.abs(Math.sin(a)) > 0.97 && Math.cos(a) > 0) { } const x = Math.cos(a) * rad, z = Math.sin(a) * rad * 1.18; const p = mk(R, geo('dome_post', () => new THREE.CylinderGeometry(0.3, 0.36, 9, 8)), wood, x, 4.5, z); p.castShadow = true; TOWN.obst.push({ x, z, r: 0.5 }); }
  const cone = new THREE.CylinderGeometry(4, rad + 1.5, 7, 32, 1, true); const c = mk(R, cone, roof, 0, 12.5, 0, false); c.scale.z = 1.18;
  const ring = mk(R, new THREE.TorusGeometry(rad, 0.35, 6, 48), wood, 0, 9, 0); ring.rotation.x = Math.PI / 2; ring.scale.y = 1.18;
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const b = mk(R, geo('dome_flag', () => new THREE.PlaneGeometry(1.1, 2.2)), lmat({ color: i % 2 ? CAREER.club.tabard : '#e8e1cf', side: THREE.DoubleSide }), Math.cos(a) * (rad - 0.2), 7.6, Math.sin(a) * (rad - 0.2) * 1.18); b.lookAt(0, 7.6, 0); }
  const s = townSign('THE DOME', '#6d1b28'); s.position.set(0, 10.4, rad * 1.18 + 0.3); s.scale.setScalar(2.2); R.add(s);
}
// trees: a forest patch scattered in a circle, avoiding roads, obstacles and the given clear zones
function realmForest(R, cx, cz, rad, n, kinds, seed, clear) {
  const rnd = seeded(seed); let placed = 0;
  for (let t = 0; t < n * 6 && placed < n; t++) {
    const a = rnd() * TAU, rr = Math.sqrt(rnd()) * rad, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
    if (Math.hypot(x / TOWN_RX, z / TOWN_RZ) > 0.99) continue;
    if (arenaBlocked(x, z, 6) || lakeIn(x, z, 4) || onRoad(x, z, 4) || (clear && clear(x, z))) continue;
    if (x > BAILEY.x0 - 6 && x < BAILEY.x1 + 6 && z > BAILEY.z0 - 6 && z < BAILEY.z1 + 6) continue;
    const [k, s, r] = kinds[Math.floor(rnd() * kinds.length)];
    kpiece(R, k, x, 0, z, rnd() * TAU, s * (0.8 + rnd() * 0.45)); if (r) TOWN.obst.push({ x, z, r }); placed++;
  }
  return placed;
}
function onRoad(x, z, pad) {
  for (const Rd of ROADS) for (let i = 0; i < Rd.pts.length - 1; i++) {
    const [x0, z0] = Rd.pts[i], [x1, z1] = Rd.pts[i + 1], dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz;
    const t = clamp(((x - x0) * dx + (z - z0) * dz) / L2, 0, 1), px = x0 + dx * t, pz = z0 + dz * t;
    if (Math.hypot(x - px, z - pz) < Rd.w / 2 + pad) return true;
  }
  return false;
}
function signpost(R, x, z, ry, lines) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; R.add(g);
  mk(g, geo('sp_post', () => new THREE.CylinderGeometry(0.09, 0.11, 3.2, 6)), tmat('#5a3b24'), 0, 1.6, 0);
  lines.forEach(([txt, a], i) => { const s = townSign(txt, '#4a3422'); s.scale.set(0.55, 0.55, 0.55); s.position.set(Math.sin(a) * 0.7, 2.7 - i * 0.42, Math.cos(a) * 0.7); s.rotation.y = a + Math.PI / 2; g.add(s); });
  TOWN.obst.push({ x, z, r: 0.3 });
}
// ---- the whole realm
function buildRealm(R) {
  TOWN.gates = []; TOWN.mapRoads = []; TOWN.realmBoards = {};
  const O = TOWN.obst, add = (key, x, z, ry, s, r) => { const p = kpiece(R, key, x, 0, z, ry || 0, s || 1); if (r) O.push({ x, z, r }); return p; };
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  // roads, then signposts where they leave the fairground
  for (const Rd of ROADS) realmRoad(R, Rd.pts, Rd.w);
  signpost(R, 5, -28, 0, [['CASTLE ↑', 0], ['FAIRGROUND ↓', Math.PI]]);
  signpost(R, -56, 4, -Math.PI / 2, [['THE OLD WOODS', -Math.PI / 2], ['FAIRGROUND', Math.PI / 2]]);
  signpost(R, 56, 10, Math.PI / 2, [['MIRROR LAKE', Math.PI / 2], ['FAIRGROUND', -Math.PI / 2]]);
  signpost(R, -22, 74, 0, [['MILLBROOK', -2.2], ['FAIRGROUND', 0.9]]);
  signpost(R, 6, -144, 0, [['OUTER BAILEY', 0], ['FAIRGROUND', Math.PI]]);
  signpost(R, -192, -70, 0, [['QUARRY', -1.6], ['FOREST ARENA', 2.8], ['CASTLE', 0.6]]);
  signpost(R, 134, 62, 0, [['BEACH ARENA', 1.2], ['CLIFFS', 0]]);
  for (const Rd of ROADS) for (let i = 1; i < Rd.pts.length - 1; i += 1) { const [x, z] = Rd.pts[i]; if (Math.hypot(x, z) > 110) { add('ps_lamp', x + Rd.w / 2 + 1, z, 0, 1, 0.3); } }
  landmark(R, () => buildDome(R));
  buildRealmCastle(R, add, face);
  buildVillage(R, add, face);
  buildWoods(R, add, face);
  buildLake(R, add, face);
  // the open country between: meadows, lone trees, rocks, hedges, a few farmsteads in the distance
  const meadow = [['kf_tree_1_a', 1.1, 1], ['kf_tree_3_a', 1.1, 1], ['kf_tree_4_a', 1, 1], ['nt_oak', 1.1, 1], ['kf_bush_3_a', 1.6, 0.6], ['kf_rock_1_e', 1.3, 0.8], ['kf_rock_3_a', 1.6, 0.9], ['cr_flowers_crop', 1, 0], ['kf_grass_2_a', 2, 0], ['cr_grass_1', 1, 0], ['nt_flowers', 1.6, 0], ['mushroom_red', 2.2, 0]];
  const rings = [[0, -100, 70], [-110, 60, 60], [110, -60, 70], [100, 140, 70], [-110, -150, 50], [130, -150, 60], [-240, 20, 50], [-250, 210, 50], [200, 200, 70], [250, -140, 60], [-60, 200, 60], [60, 220, 60]];
  rings.forEach(([x, z, r], i) => realmForest(R, x, z, r, IS_TOUCH ? 22 : 45, meadow, 'meadow' + i, (px, pz) => Math.hypot(px / FAIR_RX, pz / FAIR_RZ) < 1.12));
  // the edge of the world: a thick wood all round
  const rnd = seeded('realmedge'), N = IS_TOUCH ? 130 : 260;
  for (let i = 0; i < N; i++) { const a = i / N * TAU + rnd() * 0.02, e = 0.97 + rnd() * 0.12; add(['kf_tree_2_c', 'kf_tree_4_b', 'kf_tree_1_c', 'tree_pineTallB_detailed', 'nt_pine', 'kf_tree_2_d'][i % 6], Math.cos(a) * TOWN_RX * e, Math.sin(a) * TOWN_RZ * e, rnd() * TAU, 1 + rnd() * 0.6, 0); }
  // a few far farmsteads (Kenney retro pieces) to fill the horizon
  for (const [x, z, ry] of [[250, 190, 0.6], [-260, 230, 2.2], [260, -200, 1.1], [-270, -230, 0.3]]) { realmHall(R, x, z, 7, 5, 3, ry, { roof: '#6b4a2a' }); add('fb_silo', x + 7, z - 4, ry, 0.8, 2); }
}
// ---- the castle: the outer bailey (tier 2) and the inner ward with the Great Hall (tier 3)
function buildRealmCastle(R, add, face) {
  const B = BAILEY, W = WARD, flag = CAREER.club.tabard;
  realmGround(R, B.x0, B.x1, B.z0, B.z1, '#a9a092', 'dirt', 0.015);
  realmGround(R, W.x0, W.x1, W.z0, W.z1, '#b4ab9c', 'dirt', 0.02);
  // outer curtain wall with the bailey gate in the south
  const gapS = (x, z) => Math.abs(z - B.z1) < 1 && Math.abs(x) < 6.5;
  landmark(R, () => {
  castleRun(R, B.x0, B.z1, B.x1, B.z1, (x, z, o) => o ? Math.abs(x) < 2.6 : Math.abs(x) < 6.5);
  castleRun(R, B.x0, B.z0, B.x1, B.z0); castleRun(R, B.x0, B.z0, B.x0, B.z1); castleRun(R, B.x1, B.z0, B.x1, B.z1);
  for (const [x, z] of [[B.x0, B.z1], [B.x1, B.z1], [B.x0, B.z0], [B.x1, B.z0], [B.x0, -228], [B.x1, -228], [-57, B.z1], [57, B.z1]]) castleTower(R, x, z, 2, flag);
  castleGate(R, 0, B.z1, 'bailey', 'The Outer Bailey');
  // inner wall with the royal gate
  castleRun(R, W.x0, W.z1, W.x1, W.z1, (x, z, o) => o ? Math.abs(x) < 2.6 : Math.abs(x) < 6.5);
  castleRun(R, W.x0, W.z0, W.x1, W.z0); castleRun(R, W.x0, W.z0, W.x0, W.z1); castleRun(R, W.x1, W.z0, W.x1, W.z1);
  for (const [x, z] of [[W.x0, W.z1], [W.x1, W.z1], [W.x0, W.z0], [W.x1, W.z0]]) castleTower(R, x, z, 2, '#e3b341');
  castleGate(R, 0, W.z1, 'royal', 'The King’s Court');
  });
  // ---- the outer bailey: a working castle yard
  realmHall(R, -80, -180, 18, 9, 5, Math.PI / 2, { sign: 'ARMOURY', signCol: '#3d4a57', tower: true });
  realmHall(R, -80, -215, 16, 9, 4.5, Math.PI / 2, { sign: 'MASTER SMITH', signCol: '#7a2b1c' });
  { add('bf_furnace', -71, -222, Math.PI / 2, 1.2, 1.6); add('mk_Anvil', -71.5, -212, Math.PI / 2, 1.3, 0.6); add('mk_Whetstone', -72, -207, 0, 1, 0.6); add('mk_WeaponStand', -71.4, -229, Math.PI / 2, 1, 0.8); }
  realmHall(R, -80, -255, 20, 10, 6, Math.PI / 2, { sign: 'BARRACKS', signCol: '#26344d' });
  realmHall(R, -38, -296, 16, 10, 4, 0, { sign: 'STABLES', signCol: '#6b4e16', flat: true });
  { const ch = realmHall(R, 88, -278, 14, 22, 7, -Math.PI / 2, { sign: 'CHAPEL', signCol: '#4a3a6a', allStone: true, tower: true, roof: '#4a4e52' }); }
  realmHall(R, 30, -296, 18, 9, 4.5, 0, { sign: 'GUILD HALL', signCol: '#6d1b28' });
  // the training yard with pells and archery in the north-west of the bailey
  for (let i = 0; i < 5; i++) { const x = -48 + i * 4, z = -178; mk(R, geo('fest_pell', () => new THREE.CylinderGeometry(0.13, 0.15, 1.9, 8)), tmat('#8a6a42'), x, 0.95, z).castShadow = true; O_push(x, z, 0.35); }
  add('mk_Dummy', -30, -185, 0.3, 1, 0.5); add('mk_Dummy', -26, -186, -0.2, 1, 0.5); add('mk_WeaponStand', -52, -186, 0.2, 1, 0.8);
  for (const [x, z] of [[-48, -196], [-42, -198], [-36, -200]]) add('fy_vil_archery_target', x, z, 0, 1.2, 0.6);
  // courtyard life: well, carts, crates, a feast table, stacked barrels, banners
  add('fb_well', 22, -180, 0, 1.2, 1.2); add('mk_Stall_Cart_Empty', 40, -168, -0.3, 1.2, 1.6); add('mk_Crate_Wooden', 44, -172, 0.2, 1.2, 0.6); add('mk_Barrel', 46, -170, 0, 1.2, 0.5); add('mk_Barrel_Holder', -60, -165, 0, 1.2, 1);
  add('mk_Table_Large', 18, -240, 0, 1.2, 1.4); add('mk_Bench', 18, -238.6, 0, 1, 0); add('mk_Bench', 18, -241.4, 0, 1, 0); add('mk_Chalice', 18, -240, 0, 2.4, 0);
  for (const [x, z] of [[-14, -160], [14, -160], [-14, -200], [14, -200]]) { const b = add('mk_Banner_1', x, z, 0, 1.4, 0.4); add('mk_Banner_1_Cloth', x, z, 0, 1.4, 0); }
  for (const z of [-165, -185, -205]) for (const sx of [-5, 5]) add('ps_lamp', sx, z, 0, 1, 0.3);
  // the Castle arena: stone floor, wooden stands
  arenaList(R, ARENAS[4], { floor: '#b8ae9e', floorTex: 'dirt', bench: '#6a5a4a', signCol: '#26344d' });
  // the mine shaft in the north-east corner (gold and silver live here)
  realmGround(R, 60, 108, -302, -262, '#8e8478', 'dirt', 0.03);
  add('fy_rock_big_1', 104, -296, 0.6, 1.4, 3); add('fy_rock_big_3', 96, -300, 1.4, 1.3, 3); add('rt_pulley_crate', 70, -266, 0, 3, 0.8); add('mk_Chain_Coil', 74, -268, 0, 1.2, 0);
  { const sg = townSign('MINE SHAFT', '#5a4a3a'); sg.position.set(64, 3, -262); R.add(sg); }
  // ---- the inner ward: gardens, the treasury, the Great Hall
  for (const [x, z] of [[-38, -228], [38, -228], [-38, -280], [38, -280]]) { add('fountainRoundDetail', x, z, 0, 1.6, 1.8); }
  for (let i = 0; i < 8; i++) { add('kf_bush_3_a', -44 + i * 2, -236, 0, 1.8, 0.5); add('kf_bush_3_a', 30 + i * 2, -236, 0, 1.8, 0.5); }
  for (const sx of [-1, 1]) for (const z of [-222, -232]) { add('cr_flowers_crop', sx * 30, z, 0, 1.2, 0); add('cr_flowers_crop', sx * 40, z, 1, 1.2, 0); }
  realmHall(R, 40, -262, 12, 14, 5, -Math.PI / 2, { sign: 'TREASURY', signCol: '#8a6a12', allStone: true, roof: '#5a4a2a' });
  add('rp_chest_ingots', 32, -256, 0.3, 1.2, 0.8); add('rp_gold_ingots', 32, -260, 0, 1.2, 0.4);
  realmHall(R, -40, -262, 12, 14, 5, Math.PI / 2, { sign: 'ROYAL TAILOR', signCol: '#5b2a86' });
  landmark(R, () => buildGreatHall(R, add));
  // the king's guard and court in the ward (static figures; the walking guards are townsfolk)
  for (const [k, x, z, ry] of [['po_male_standing', -6, -236, 0], ['po_male_standing', 6, -236, 0], ['po_female_standing_hips', -24, -246, 0.8], ['po_male_standing_hips', 24, -250, -0.6], ['po_female_lookingup', -16, -270, 0.4]]) { const p = add(k, x, z, ry, 1, 0.4); if (p) p.traverse(o => { if (o.isMesh) o.material = TMAT.court || (TMAT.court = lmat({ vertexColors: true, roughness: 0.9, flatShading: true, color: '#c8b8ff' })); }); }
}
function O_push(x, z, r) { TOWN.obst.push({ x, z, r }); }
// whatever fn adds to R stays visible from afar (castle walls, towers, the dome, the hall)
function landmark(R, fn) { const n0 = R.children.length; fn(); for (let i = n0; i < R.children.length; i++) R.children[i].userData.landmark = true; }
// the Great Hall: stone walls with buttresses and lit windows, a roof that lifts away when you're inside, the king's dais
function buildGreatHall(R, add) {
  const H = HALL, w = H.x1 - H.x0, d = H.z1 - H.z0, cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2, ht = 11;
  const stone = tmat('#8f8a82'), dark = tmat('#4a4640'), win = tmat('#ffcf6a', { emissive: '#c07010', emissiveIntensity: 0.9 });
  const wall = (x, z, len, rot) => { const m = mk(R, new THREE.BoxGeometry(len, ht, 1.2), stone, x, ht / 2, z); m.rotation.y = rot; return m; };
  wall(cx, H.z0, w, 0); wall(H.x0, cz, d, Math.PI / 2); wall(H.x1, cz, d, Math.PI / 2);
  for (const sx of [-1, 1]) wall(cx + sx * (w / 4 + 1.6), H.z1, w / 2 - 3.2, 0); // door gap in the middle of the south wall
  mk(R, new THREE.BoxGeometry(6.4, ht - 5, 1.2), stone, cx, 5 + (ht - 5) / 2, H.z1);
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const z = H.z0 + 5 + i * (d - 10) / 4; mk(R, geo('gh_but', () => new THREE.BoxGeometry(1.4, ht * 0.8, 1.4)), dark, cx + sx * (w / 2 + 0.9), ht * 0.4, z); mk(R, geo('gh_win', () => new THREE.BoxGeometry(0.12, 3.2, 1.4)), win, cx + sx * (w / 2 + 0.62), ht * 0.62, z + 3); mk(R, geo('gh_win', () => new THREE.BoxGeometry(0.12, 3.2, 1.4)), win, cx + sx * (w / 2 - 0.62), ht * 0.62, z + 3); }
  // the roof: hidden while you're inside so the camera can see
  const roof = new THREE.Group(); R.add(roof); const rm = tmat('#3e3a36'); const rise = 6;
  for (const sx of [-1, 1]) { const p = mk(roof, new THREE.BoxGeometry(Math.hypot(w / 2, rise) + 0.6, 0.3, d + 1.4), rm, cx + sx * w / 4, ht + rise / 2, cz); p.rotation.z = -sx * Math.atan2(rise, w / 2); }
  TOWN.hallRoof = roof;
  // inside: flagstones, banners, chandeliers, the king's dais and throne, torches on the walls
  const fl = mk(R, new THREE.PlaneGeometry(w - 1, d - 1), lmat({ map: venueTex('dirt'), color: '#8a8478', roughness: 1 }), cx, 0.03, cz, false); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true;
  arenaList(R, ARENAS[5], { post: '#3a2a1a', rail: '#6a4a2a', bench: '#5a3a2a', signCol: '#8a6a12' });
  mk(R, new THREE.BoxGeometry(10, 0.8, 4), dark, cx, 0.4, H.z0 + 3.2); add('mk_Chair_1', cx, H.z0 + 3.4, 0, 2.2, 0); { const cr = kpiece(R, 'rp_crown', cx, 2.9, H.z0 + 3.2, 0, 0.5); }
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const b = mk(R, geo('gh_ban', () => new THREE.PlaneGeometry(1.4, 3.6)), lmat({ color: i % 2 ? '#8a1a2a' : '#e3b341', side: THREE.DoubleSide }), cx + sx * (w / 2 - 0.66), 6.4, H.z0 + 8 + i * 9); b.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; }
  for (let i = 0; i < 3; i++) { const c = kpiece(R, 'mk_Chandelier', cx, 7.6, H.z0 + 10 + i * 14, 0, 1.6); }
  if (typeof buildThrone === 'function') buildThrone(R);
  // walls block you, except the door
  const k = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 1.6); for (let i = 0; i <= n; i++) TOWN.obst.push({ x: x0 + (x1 - x0) * i / n, z: z0 + (z1 - z0) * i / n, r: 1 }); };
  k(H.x0, H.z0, H.x1, H.z0); k(H.x0, H.z0, H.x0, H.z1); k(H.x1, H.z0, H.x1, H.z1); k(H.x0, H.z1, cx - 3.2, H.z1); k(cx + 3.2, H.z1, H.x1, H.z1);
  TOWN.obst.push({ x: cx, z: H.z0 + 3.2, r: 2.4 }, { x: cx - 3, z: H.z0 + 3.2, r: 2 }, { x: cx + 3, z: H.z0 + 3.2, r: 2 });
}
// ---- Millbrook: the village, its farm and fields, the Peasants' arena
function buildVillage(R, add, face) {
  const cx = -180, cz = 135;
  realmGround(R, cx - 24, cx + 24, cz - 30, cz - 6, '#b9a37c'); // the green
  add('fb_well', cx, cz - 18, 0, 1.2, 1.2);
  const homes = [[-210, 100], [-196, 96], [-160, 98], [-146, 108], [-214, 122], [-216, 140], [-150, 128], [-140, 145], [-204, 170], [-150, 175]];
  homes.forEach(([x, z], i) => { if (typeof cottage === 'function' && typeof VILLAGE_GEO !== 'undefined' && i % 3 !== 2) { cottage(R, x, z, face(x, z, cx, cz - 18), 'mill' + i); TOWN.obst.push({ x, z, r: 3.6 }); } else realmHall(R, x, z, 7, 6, 3.4, face(x, z, cx, cz - 18), { roof: ['#7a3a2a', '#6b5a3a', '#5a4a3a'][i % 3] }); });
  add('ps_house1', -232, 112, 1.2, 1, 5); add('ps_house4', -128, 120, -1.3, 1, 5.5);
  // the farm: barns, coop, silo, a windmill, fences, fields of wheat and corn, a pumpkin patch
  add('fb_bigbarn', -248, 160, 1.6, 1, 5); add('fb_openbarn', -232, 180, 1.2, 1, 4); add('fb_chickencoop', -224, 196, 0.6, 1, 1.6); add('fb_silo_house', -262, 140, 1.6, 1, 4);
  add('fb_windmill', -120, 186, -0.6, 1.1, 3); add('fb_watertower', -116, 160, 0, 1, 1.6);
  for (let i = 0; i < 8; i++) add('fb_fence', -270 + i * 6, 210, 0, 1, 0);
  for (let i = 0; i < 6; i++) add('fb_fence2', -276, 174 + i * 6, Math.PI / 2, 1, 0);
  realmGround(R, -270, -236, 200, 210, '#8a7a4a', 'dirt', 0.03);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) add('cr_wheat_crop', -268 + i * 2, 201.5 + j * 2.4, (i * 3 + j) % 6, 2.2);
  realmGround(R, -138, -112, 196, 216, '#7a6a3a', 'dirt', 0.03);
  for (let i = 0; i < 12; i++) for (let j = 0; j < 9; j++) add(j % 3 ? 'crops_cornStageD' : 'cr_corn_crop', -136 + i * 2.2, 198 + j * 2.1, 0, j % 3 ? 1.6 : 3);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) add(j % 2 ? 'cr_pumpkin_crop' : 'pumpkin', -196 + i * 2, 196 + j * 2, (i + j) % 6, j % 2 ? 1.4 : 1.6);
  for (let i = 0; i < 5; i++) add('cr_lettuce_crop', -160 + i * 1.6, 196, 0, 1.6); for (let i = 0; i < 5; i++) add('cr_carrot_crop', -160 + i * 1.6, 199, 0, 1.6);
  // market corner: a stall cart, crates, barrels
  add('mk_Stall_Cart_Empty', -168, 112, 0.3, 1.2, 1.6); add('mk_FarmCrate_Apple', -165, 115, 0, 1.4, 0.4); add('mk_FarmCrate_Carrot', -171, 115.5, 0.4, 1.4, 0.4); add('mk_Barrel_Apples', -164, 110, 0, 1.2, 0.5);
  // the Peasants' arena: mud floor, hay bales for seats
  arenaList(R, ARENAS[1], { floor: '#6e5a3e', bench: '#c9b06a', signCol: '#6b4e16' });
  for (let i = 0; i < 8; i++) add(i % 2 ? 'fy_vil_hay_1' : 'fy_vil_hay_2', ARENAS[1].x - 16 + i * 4.4, ARENAS[1].z + 20, i, 1, 0.8);
  // villagers standing about (cheap posed figures)
  for (const [k, x, z, ry] of [['po_male_standing_waving', -186, 120, 0.3], ['po_female_pickingup', -198, 200, 1.2], ['po_male_pickingup', -142, 205, -0.6], ['po_female_standing', -172, 128, 2.6], ['po_male_sitting_cheering', ARENAS[1].x - 14.2, ARENAS[1].z - 2, Math.PI / 2], ['po_female_sitting_cheering', ARENAS[1].x + 14.2, ARENAS[1].z + 4, -Math.PI / 2], ['po_male_lookingup', ARENAS[1].x - 4, ARENAS[1].z + 21, Math.PI]]) add(k, x, z, ry, 1, 0.4);
  // a millpond and a stream
  { const w = mk(R, new THREE.CircleGeometry(9, 28), lmat({ color: '#4f8fb8', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }), -230, 0.05, 96, false); w.rotation.x = -Math.PI / 2; w.scale.y = 0.7; TOWN.obst.push({ x: -230, z: 96, r: 7.5 }); }
  for (let i = 0; i < 8; i++) add('cr_rice_crop', -238 + Math.cos(i) * 9, 96 + Math.sin(i) * 6.5, i, 2);
  // trees round the village
  realmForest(R, cx, cz, 95, IS_TOUCH ? 30 : 60, [['kf_tree_1_a', 1.1, 1], ['kf_tree_3_b', 1, 1], ['cr_apple_crop', 1, 1], ['kf_bush_3_a', 1.6, 0.6], ['kf_tree_2_b', 1, 1]], 'village', (x, z) => Math.hypot(x - cx, z - cz) < 70 && !(z > 196 || x < -244));
}
// ---- the Old Woods: dense KayKit forest, a glade with the Forest arena, the quarry, a charcoal burners' camp, a hunter's lodge
function buildWoods(R, add, face) {
  const A = ARENAS[2];
  realmGround(R, A.x - 16, A.x + 16, A.z - 22, A.z + 22, '#7a8a52', 'grass', 0.02);
  arenaList(R, A, { floor: '#6e7a48', floorTex: 'grass', post: '#4a3422', rail: '#5a4030', bench: '#5a4030', signCol: '#335c3f' });
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const x = A.x + Math.cos(a) * 21, z = A.z + Math.sin(a) * 26; add('nt_log', x, z, a, 1.4, 0.8); }
  // the quarry (moved out here from the fairground)
  realmGround(R, -276, -236, -64, -20, '#a89a86', 'dirt', 0.03);
  for (const [k, x, z, ry, s] of [['fy_rock_big_1', -286, -46, 0.5, 1.4], ['fy_rock_big_3', -282, -62, 1.2, 1.2], ['fy_rock_block_1', -270, -70, 0.3, 1.4], ['fy_rock_medium_4', -286, -26, 2, 1.3], ['fy_rock_big_pillar', -278, -12, 0.9, 0.9]]) { add(k, x, z, ry, s, 2.2); }
  add('cart', -240, -24, 1.3, 2, 1.3); add('mk_Barrel', -242, -30, 0, 1.2, 0.5); add('lantern', -240, -18, 0, 2, 0.3); add('rt_pulley_crate', -246, -60, 0, 3, 0.8);
  { const sg = townSign('QUARRY', '#5a4a3a'); sg.position.set(-236, 3.1, -22); sg.rotation.y = Math.PI / 2; R.add(sg); }
  // charcoal burners: a smoking mound, logs, a hut
  add('slv_logs', -160, -110, 0.4, 0.9, 2); add('campfire_stones', -170, -118, 0, 2.2, 1); add('slv_hovel', -176, -126, 0.6, 1.2, 1.8); add('mk_Anvil_Log', -164, -122, 0, 1, 0.6);
  // the hunter's lodge
  realmHall(R, -250, -140, 9, 7, 3.4, 0.6, { sign: 'HUNTER’S LODGE', signCol: '#335c3f', roof: '#4a3a2a' }); add('mk_Peg_Rack', -244, -138, 0.6, 1.2, 0); add('mk_Shield_Wooden', -246, -134, 0.2, 1.2, 0);
  // the forest itself
  const trees = [['kf_tree_1_c', 1.1, 1.1], ['kf_tree_2_c', 1.1, 0.9], ['kf_tree_2_d', 1, 1], ['kf_tree_3_b', 1.2, 1.2], ['kf_tree_4_b', 1.1, 0.8], ['kf_tree_4_c', 1, 0.8], ['kf_tree_1_b', 1.2, 1], ['kf_tree_bare_1_a', 1.6, 0.5], ['kf_bush_1_a', 4, 0.6], ['kf_bush_4_a', 2.4, 0.6], ['kf_rock_3_e', 1.4, 0.9], ['kf_grass_1_a', 2.4, 0], ['nt_mushrooms', 1.6, 0], ['nt_fern', 1.4, 0], ['nt_stump', 1, 0.6], ['nt_log', 1, 0.7]];
  realmForest(R, -205, -80, 100, IS_TOUCH ? 160 : 330, trees, 'oldwoods', (x, z) => Math.hypot(x - A.x, z - A.z) < 30 || (x < -232 && x > -290 && z > -70 && z < -14) || Math.hypot(x + 168, z + 118) < 12 || Math.hypot(x + 250, z + 140) < 9);
}
// ---- Mirror Lake: water, a sandy shore with the Beach arena, jetties, a boathouse, reeds, cliffs on the far side
function buildLake(R, add, face) {
  const L = LAKE;
  { const w = mk(R, new THREE.CircleGeometry(1, 48), lmat({ color: '#3f7fae', roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.9 }), L.x, 0.06, L.z, false); w.rotation.x = -Math.PI / 2; w.scale.set(L.rx, L.rz, 1); TOWN.lake = w; }
  { const s = mk(R, new THREE.CircleGeometry(1, 48), lmat({ map: venueTex('dirt'), color: '#e8d6a0', roughness: 1 }), L.x, 0.03, L.z, false); s.rotation.x = -Math.PI / 2; s.scale.set(L.rx + 12, L.rz + 14, 1); }
  realmGround(R, 128, 168, 52, 104, '#e2cf96', 'dirt', 0.035);
  arenaList(R, ARENAS[3], { floor: '#efdca4', bench: '#a08a6a', post: '#8a7a6a', rail: '#b0a080', signCol: '#1f4a6b' });
  for (let i = 0; i < 6; i++) add('nt_log', ARENAS[3].x - 15 + i * 6, ARENAS[3].z - 21, 0.1 * i, 1.2, 0.6);
  // jetties and the boathouse on the west shore
  const jetty = (x, z, n, ry) => { for (let i = 0; i < n; i++) { const p = kpiece(R, 'rt_dock_side', x + Math.sin(ry) * i * 3, 0, z + Math.cos(ry) * i * 3, ry, 3); if (p) p.position.y = -0.4; } };
  jetty(168, 20, 6, Math.PI / 2); jetty(172, 70, 5, Math.PI / 2 - 0.3);
  realmHall(R, 156, 6, 9, 7, 3.6, Math.PI / 2, { sign: 'BOATHOUSE', signCol: '#1f4a6b', roof: '#3a4a5a' });
  for (const [x, z] of [[184, 22], [188, 70]]) add('rt_barrels', x, z, 0, 3, 0);
  // reeds and lily pads round the edge
  for (let i = 0; i < (IS_TOUCH ? 30 : 60); i++) { const a = i / 60 * TAU * (IS_TOUCH ? 2 : 1), x = L.x + Math.cos(a) * (L.rx + 1.5), z = L.z + Math.sin(a) * (L.rz + 1.5); if (x < 176 && Math.abs(z - 45) < 35) continue; add('cr_rice_crop', x, z, a, 2.2); }
  for (let i = 0; i < 14; i++) add('nt_lilypad', L.x - 30 + Math.cos(i * 2.1) * 18, L.z + Math.sin(i * 1.7) * 40, i, 1.6, 0);
  // the cliffs on the far (east) shore, where crystal and silver show in the rock
  for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3, x = L.x + Math.cos(a) * (L.rx + 22), z = L.z + Math.sin(a) * (L.rz + 18); add(i % 2 ? 'fy_rock_big_1' : 'fy_rock_big_3', x, z, a, 1.5 + (i % 3) * 0.2, 3.4); }
  // a few people enjoying the shore
  for (const [k, x, z, ry] of [['po_female_sitting', 160, 40, 1.4], ['po_male_sitting', 162, 44, 1.8], ['po_male_standing_hips', 176, 72, 1.2], ['po_female_standing_coveringeyes', 140, 96, 0.4]]) add(k, x, z, ry, 1, 0.4);
  // the lake is water: walk round it
  const N = 60; for (let i = 0; i < N; i++) { const a = i / N * TAU; for (const f of [0.92, 0.6, 0.3]) TOWN.obst.push({ x: L.x + Math.cos(a) * L.rx * f, z: L.z + Math.sin(a) * L.rz * f, r: Math.min(L.rx, L.rz) * 0.32 }); }
}
// ---- culling: group the static scenery into 60 m cells and hide the far ones
const REALM_CELL = 60;
function realmCells() {
  const R = TOWN.root, cells = new Map(); TOWN.cells = [];
  const kids = R.children.slice(), v = new THREE.Vector3();
  for (const o of kids) {
    if (o.userData.dyn || o.userData.landmark || o === TOWN.hallRoof || o === TOWN.lake) continue;
    let rad = 0; if (o.isMesh && o.geometry) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); rad = o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z); }
    if (rad > 25) continue; // big ground planes and roads stay put
    v.copy(o.position); const i = Math.floor(v.x / REALM_CELL), j = Math.floor(v.z / REALM_CELL), key = i + ',' + j;
    let C = cells.get(key); if (!C) { const g = new THREE.Group(); g.userData.cell = true; R.add(g); C = { g, x: (i + 0.5) * REALM_CELL, z: (j + 0.5) * REALM_CELL }; cells.set(key, C); TOWN.cells.push(C); }
    C.g.add(o);
  }
  // then fold each cell's static meshes into one mesh per material: thousands of draw calls become a few hundred
  const live = new Set();
  for (const o of WORLD.spin || []) live.add(o); for (const o of WORLD.flick || []) live.add(o); for (const b of WORLD.bob || []) live.add(b.o);
  for (const S of TOWN.stalls || []) live.add(S.g); for (const N of GATHER.nodes || []) live.add(N.g); for (const Gt of TOWN.gates || []) live.add(Gt.port);
  if (TOWN.flag) live.add(TOWN.flag);
  TOWN.root.updateMatrixWorld(true);
  for (const C of TOWN.cells) realmMerge(C.g, live);
}
function realmMerge(root, live) {
  const groups = new Map(), take = [];
  const walk = o => {
    if (!o.visible || live.has(o) || o.userData.dyn || o.userData.nomerge) return;
    if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && !Array.isArray(o.material) && o.geometry && o.geometry.attributes.position && !o.geometry.morphAttributes.position) {
      const g = o.geometry, names = Object.keys(g.attributes).sort(), sig = names.map(n => n + g.attributes[n].itemSize).join(',');
      const key = o.material.uuid + '|' + sig + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '|' + o.renderOrder;
      let L = groups.get(key); if (!L) groups.set(key, L = []); L.push(o);
    }
    for (const c of o.children) walk(c);
  };
  for (const c of root.children) walk(c);
  const m3 = new THREE.Matrix3(), v = new THREE.Vector3();
  for (const L of groups.values()) {
    if (L.length < 2) continue;
    const g0 = L[0].geometry, names = Object.keys(g0.attributes);
    let nv = 0, ni = 0; for (const o of L) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const out = {}; for (const n of names) out[n] = new Float32Array(nv * g0.attributes[n].itemSize);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const o of L) {
      const g = o.geometry, cnt = g.attributes.position.count, M = o.matrixWorld; m3.getNormalMatrix(M);
      for (const n of names) {
        const a = g.attributes[n], sz = a.itemSize, dst = out[n];
        for (let i = 0; i < cnt; i++) {
          if (n === 'position') { v.fromBufferAttribute(a, i).applyMatrix4(M); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
          else if (n === 'normal') { v.fromBufferAttribute(a, i).applyMatrix3(m3).normalize(); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
          else { dst[(vo + i) * sz] = a.getX(i); if (sz > 1) dst[(vo + i) * sz + 1] = a.getY(i); if (sz > 2) dst[(vo + i) * sz + 2] = a.getZ(i); if (sz > 3) dst[(vo + i) * sz + 3] = a.getW(i); }
        }
      }
      if (g.index) { const I = g.index; for (let i = 0; i < I.count; i++) idx[io++] = I.getX(i) + vo; } else for (let i = 0; i < cnt; i++) idx[io++] = i + vo;
      vo += cnt;
    }
    const bg = new THREE.BufferGeometry(); for (const n of names) bg.setAttribute(n, new THREE.BufferAttribute(out[n], g0.attributes[n].itemSize)); bg.setIndex(new THREE.BufferAttribute(idx, 1)); bg.computeBoundingSphere();
    const me = new THREE.Mesh(bg, L[0].material); me.castShadow = L[0].castShadow; me.receiveShadow = L[0].receiveShadow; me.renderOrder = L[0].renderOrder; me.userData.merged = L.length; root.add(me);
    for (const o of L) if (o.parent) o.parent.remove(o);
  }
}
function realmCull() {
  if (!TOWN.cells) return;
  const cam = W3.camera.position, far = IS_TOUCH ? 115 : 150;
  for (const C of TOWN.cells) { const d = Math.hypot(C.x - cam.x, C.z - cam.z); C.g.visible = d < far + REALM_CELL * 0.71; }
  // the Great Hall's roof lifts away while you're inside
  if (TOWN.hallRoof && TOWN.pos) TOWN.hallRoof.visible = !(TOWN.pos.x > HALL.x0 && TOWN.pos.x < HALL.x1 && TOWN.pos.z > HALL.z0 && TOWN.pos.z < HALL.z1 + 1);
}
// ---- where you are: a banner when you walk into a new district
function realmDistrictTick() {
  if (!TOWN.pos) return;
  const D = districtAt(TOWN.pos.x, TOWN.pos.z);
  if (D.key !== TOWN.district) { const first = TOWN.district == null; TOWN.district = D.key; if (!first) { const el = $('#townArea'); if (el) { el.innerHTML = ''; el.append(h('small', null, 'Now entering'), h('b', null, D.name)); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); } } }
}
// ---- gates: shut unless you hold the writ
function gateOpen(key) { return realmHasWrit(key); }
function realmHasWrit(key) { const w = (CAREER.writs = CAREER.writs || {}); return !!w[key]; }
function realmGateCollide(P, r) {
  for (const G of TOWN.gates || []) {
    const open = gateOpen(G.key); if (G.port) G.port.position.y += ((open ? 4.4 : 0) - G.port.position.y) * 0.1;
    if (open) continue;
    const dx = P.x - G.x, dz = P.z - G.z, d = Math.hypot(dx, dz), m = G.r + r;
    if (d < m) { if (d < 1e-4) { P.z = G.z + m; } else { P.x = G.x + dx / d * m; P.z = G.z + dz / d * m; } if (!TOWN.gateMsgT || window.performance.now() - TOWN.gateMsgT > 4000) { TOWN.gateMsgT = window.performance.now(); gateRefused(G); } }
  }
}
function gateRefused(G) { const T = REALM_TIERS[G.key]; toastMenu(`${G.label}: ${T ? T.need : 'closed'}`); }
// the castle, for the folk (gate guards stand outside the bailey gate) and the map
const CASTLE = { x0: BAILEY.x0, x1: BAILEY.x1, z0: BAILEY.z0, z1: BAILEY.z1, gate: 2.4 };
function gateBlocked(x, z, r) { for (const G of TOWN.gates || []) if (!gateOpen(G.key) && Math.hypot(x - G.x, z - G.z) < G.r + r) return true; return false; }
const REALM_TIERS = {
  bailey: { level: 15, need: 'Level 15 and the Bailey writ. Beat Sergeant Brask at the gate in a duel to earn it.', name: 'Bailey writ' },
  royal: { level: 40, need: 'Level 40 and the Royal writ. Beat the King’s Guard in the Castle arena to earn it.', name: 'Royal writ' }
};
