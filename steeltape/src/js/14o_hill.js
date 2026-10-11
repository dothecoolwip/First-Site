// ===================================================================
// Castle Hill: the castle is a white-stone hill-city in three terraces. Nothing here is flat any more:
//   L0 (y 0)   the forecourt inside the bailey gate, with a grand ramp up the middle
//   L1 (y 5)   the Outer Bailey: the lower town on a terrace, walled, with the Castle arena, the halls, the mine
//   L2 (y 10)  the King's Court: the upper ward behind its own wall and ramp, gardens, the Great Hall, the keep above it
// gy(x, z) is the ground height anywhere in the realm (0 outside the castle); everything that stands on the ground asks it.
// Walls and towers are the Kenney Castle Kit (ck_*), the houses and the keep are KayKit's Medieval Builder (kb_*).
// ===================================================================
const HILL = { L1: 5, L2: 10, rampA: [-172, -192], rampB: [-212, -226], rampW: 7 };
function gy(x, z) {
  const B = BAILEY, W = WARD;
  if (x < B.x0 || x > B.x1 || z < B.z0 || z > B.z1) return 0;
  if (x > W.x0 && x < W.x1 && z < W.z1) { // the ward: a ramp just inside the royal gate, then the upper terrace
    if (z > HILL.rampB[1]) return Math.abs(x) <= HILL.rampW ? HILL.L1 + (HILL.L2 - HILL.L1) * clamp((HILL.rampB[0] - z) / (HILL.rampB[0] - HILL.rampB[1]), 0, 1) : HILL.L1;
    return HILL.L2;
  }
  if (z > HILL.rampA[0]) return 0; // the forecourt
  if (z > HILL.rampA[1]) return Math.abs(x) <= HILL.rampW ? HILL.L1 * clamp((HILL.rampA[0] - z) / (HILL.rampA[0] - HILL.rampA[1]), 0, 1) : 0;
  return HILL.L1;
}
// the slope under your feet (for leaning the camera and the horse a touch): dz of the ground per metre north
function gslope(x, z) { return (gy(x, z - 0.5) - gy(x, z + 0.5)); }
// ---- building blocks from the kits
const HILL_S = { wall: 5, tower: 5, parapet: 2.2, house: 5 };
// a run of Kenney wall blocks between two points at height Y, with a gap where gapAt says
function hillWall(R, x0, z0, x1, z1, Y, o) {
  o = o || {}; const s = o.s || HILL_S.wall, L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / s)), ang = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    if (o.gapAt && o.gapAt(x, z)) continue;
    kpiece(R, o.key || 'ck_wall', x, Y, z, ang, s);
    if (!o.noBlock) TOWN.obst.push({ x, z, r: s * 0.55 });
  }
}
// a Kenney tower: base block, mid blocks, a roof; h = number of blocks tall
function hillTower(R, x, z, Y, h, o) {
  o = o || {}; const s = o.s || HILL_S.tower, lift = 1.31 * s;
  for (let i = 0; i < h; i++) kpiece(R, i === 0 ? 'ck_tower_square' : (i === h - 1 ? 'ck_tower_square_mid_windows' : 'ck_tower_square_mid'), x, Y + i * lift, z, 0, s);
  const top = kpiece(R, o.flat ? 'ck_tower_square_top' : o.high ? 'ck_tower_square_top_roof_high' : 'ck_tower_square_top_roof', x, Y + h * lift, z, 0, s);
  if (o.flag) { const fl = kpiece(R, 'ck_flag', x + s * 0.25, Y + h * lift + (o.flat ? 0.3 : 1.0) * s, z, 0, s * 0.9); if (fl && o.flagCol) fl.traverse(m => { if (m.isMesh) m.material = TMAT['hflag' + o.flagCol] || (TMAT['hflag' + o.flagCol] = lmat({ color: o.flagCol, roughness: 0.9, flatShading: true })); }); }
  TOWN.obst.push({ x, z, r: s * 0.7 }); return top;
}
// a low parapet along a terrace edge (narrow wall blocks), with the drop below it blocked
function hillParapet(R, x0, z0, x1, z1, Y, gapAt) {
  const s = HILL_S.parapet, L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / s)), ang = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (gapAt && gapAt(x, z)) continue; kpiece(R, 'ck_wall_narrow', x, Y, z, ang, s); }
  const k = Math.max(1, Math.round(L / 1.4)); for (let i = 0; i <= k; i++) { const t = i / k, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (gapAt && gapAt(x, z)) continue; TOWN.obst.push({ x, z, r: 0.9 }); }
}
// the terrace itself: a stone top, white cliff faces on the open sides, and the ramp with its own walls
function hillTerrace(R, x0, x1, z0, z1, Y, col) {
  realmGround(R, x0, x1, z0, z1, col || '#cfc8bb', 'stone', Y + 0.02);
  const face = tmat('#d9d3c6', { roughness: 0.95 }), trim = tmat('#bfb7a8');
  const cliff = (cx, cz, len, rot) => { const m = mk(R, new THREE.BoxGeometry(len, Y, 1.2), face, cx, Y / 2, cz); m.rotation.y = rot; m.receiveShadow = true; m.userData.landmark = true; const b = mk(R, new THREE.BoxGeometry(len + 0.6, 0.5, 1.8), trim, cx, Y - 0.2, cz); b.rotation.y = rot; b.userData.landmark = true; };
  return cliff;
}
function hillRamp(R, x, z0, z1, y0, y1, w) {
  const L = z0 - z1, h = y1 - y0, len = Math.hypot(L, h), ang = Math.atan2(h, L);
  const g = mk(R, new THREE.PlaneGeometry(w, len), lmat({ map: venueTex('stone'), color: '#c9c2b4', roughness: 1 }), x, (y0 + y1) / 2 + 0.03, (z0 + z1) / 2, false);
  g.rotation.set(-Math.PI / 2 + ang, 0, 0); g.receiveShadow = true; g.userData.landmark = true;
  // the ramp's side walls: a wedge each side, and the edges blocked
  const face = tmat('#d9d3c6', { roughness: 0.95 });
  for (const sx of [-1, 1]) {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(-L, 0); sh.lineTo(-L, h); sh.closePath();
    const wedge = mk(R, new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }), face, x + sx * (w / 2 + 0.5), y0, z0); wedge.rotation.y = Math.PI / 2; wedge.userData.landmark = true;
    for (let t = 0; t <= 1.001; t += 1 / Math.round(L / 1.4)) TOWN.obst.push({ x: x + sx * (w / 2 + 0.9), z: z0 - L * t, r: 0.9 });
  }
  // every 4 m a lamp on the ramp wall
  for (let t = 0.15; t < 1; t += 0.28) for (const sx of [-1, 1]) kpiece(R, 'ps_lamp', x + sx * (w / 2 - 0.6), y0 + h * t, z0 - L * t, 0, 1);
}
// ---- the castle, built on the hill
function buildCastleHill(R, add) {
  const B = BAILEY, W = WARD, Y1 = HILL.L1, Y2 = HILL.L2, flag = CAREER.club.tabard, rw = HILL.rampW;
  // the ground: forecourt, bailey terrace, ward terrace
  realmGround(R, B.x0, B.x1, HILL.rampA[0], B.z1, '#b9b2a4', 'dirt', 0.015);
  realmGround(R, B.x0, B.x1, HILL.rampA[1], HILL.rampA[0], '#b9b2a4', 'dirt', 0.015);
  const cliff1 = hillTerrace(R, B.x0, B.x1, B.z0, HILL.rampA[1], Y1, '#cfc8bb');
  cliff1(-(rw + 1 + B.x1) / 2 + 0, HILL.rampA[1], B.x1 - rw - 1, 0); cliff1((rw + 1 + B.x1) / 2, HILL.rampA[1], B.x1 - rw - 1, 0);
  cliff1(B.x0, (B.z0 + HILL.rampA[1]) / 2, HILL.rampA[1] - B.z0, Math.PI / 2); cliff1(B.x1, (B.z0 + HILL.rampA[1]) / 2, HILL.rampA[1] - B.z0, Math.PI / 2); cliff1(0, B.z0, B.x1 - B.x0, 0);
  hillRamp(R, 0, HILL.rampA[0], HILL.rampA[1], 0, Y1, rw * 2);
  const cliff2 = hillTerrace(R, W.x0, W.x1, W.z0, HILL.rampB[1], Y2, '#d8d2c5');
  realmGround(R, W.x0, W.x1, HILL.rampB[1], W.z1, '#cfc8bb', 'stone', Y1 + 0.02);
  cliff2(-(rw + 1 + W.x1) / 2, HILL.rampB[1], W.x1 - rw - 1, 0); cliff2((rw + 1 + W.x1) / 2, HILL.rampB[1], W.x1 - rw - 1, 0);
  cliff2(W.x0, (W.z0 + HILL.rampB[1]) / 2, HILL.rampB[1] - W.z0, Math.PI / 2); cliff2(W.x1, (W.z0 + HILL.rampB[1]) / 2, HILL.rampB[1] - W.z0, Math.PI / 2); cliff2(0, W.z0, W.x1 - W.x0, 0);
  hillRamp(R, 0, HILL.rampB[0], HILL.rampB[1], Y1, Y2, rw * 2);
  landmark(R, () => {
    // the outer curtain wall on the ground, with the bailey gate in the south; it climbs the terrace at the sides
    const gapS = (x, z) => Math.abs(x) < 7;
    hillWall(R, B.x0, B.z1, B.x1, B.z1, 0, { gapAt: gapS });
    hillWall(R, B.x0, B.z1, B.x0, HILL.rampA[1], 0); hillWall(R, B.x1, B.z1, B.x1, HILL.rampA[1], 0);
    hillWall(R, B.x0, HILL.rampA[1], B.x0, B.z0, Y1); hillWall(R, B.x1, HILL.rampA[1], B.x1, B.z0, Y1);
    hillWall(R, B.x0, B.z0, B.x1, B.z0, Y1);
    for (const [x, z, y, h] of [[B.x0, B.z1, 0, 3], [B.x1, B.z1, 0, 3], [B.x0, HILL.rampA[1], 0, 3], [B.x1, HILL.rampA[1], 0, 3], [B.x0, -250, Y1, 2], [B.x1, -250, Y1, 2], [B.x0, B.z0, Y1, 3], [B.x1, B.z0, Y1, 3], [-60, B.z0, Y1, 2], [60, B.z0, Y1, 2]]) hillTower(R, x, z, y, h, { flag: true, flagCol: flag });
    castleGate(R, 0, B.z1, 'bailey', 'The Outer Bailey', 0);
    for (const sx of [-1, 1]) hillTower(R, sx * 16, B.z1, 0, 3, { high: true });
    // the parapet along the bailey terrace edge, open at the ramp
    hillParapet(R, B.x0 + 4, HILL.rampA[1] + 0.8, B.x1 - 4, HILL.rampA[1] + 0.8, Y1, (x) => Math.abs(x) < rw + 1.2);
    // the inner wall round the ward on the bailey terrace, with the royal gate; parapet on the upper terrace edge
    hillWall(R, W.x0, W.z1, W.x1, W.z1, Y1, { gapAt: gapS });
    hillWall(R, W.x0, W.z1, W.x0, HILL.rampB[1], Y1); hillWall(R, W.x1, W.z1, W.x1, HILL.rampB[1], Y1);
    hillWall(R, W.x0, HILL.rampB[1], W.x0, W.z0, Y2); hillWall(R, W.x1, HILL.rampB[1], W.x1, W.z0, Y2); hillWall(R, W.x0, W.z0, W.x1, W.z0, Y2);
    for (const [x, z, y] of [[W.x0, W.z1, Y1], [W.x1, W.z1, Y1], [W.x0, HILL.rampB[1], Y1], [W.x1, HILL.rampB[1], Y1], [W.x0, W.z0, Y2], [W.x1, W.z0, Y2]]) hillTower(R, x, z, y, 3, { flag: true, high: true, flagCol: '#e3b341' });
    castleGate(R, 0, W.z1, 'royal', 'The King’s Court', Y1);
    for (const sx of [-1, 1]) hillTower(R, sx * 15, W.z1, Y1, 3, { high: true });
    hillParapet(R, W.x0 + 4, HILL.rampB[1] + 0.8, W.x1 - 4, HILL.rampB[1] + 0.8, Y2, (x) => Math.abs(x) < rw + 1.2);
    // the keep: KayKit's castle on the north strip above the Great Hall, with a tall tower beside it
    const kp = kpiece(R, 'kb_castle', 0, Y1, -298, Math.PI, 8); if (kp) TOWN.obst.push({ x: 0, z: -298, r: 8 });
    hillTower(R, 13, -299, Y1, 5, { high: true, flag: true, flagCol: flag }); hillTower(R, -13, -299, Y1, 4, { high: true });
  });
  // the lower town: KayKit houses along the bailey's edges, a market, wells, a mill
  const houses = [[-100, -200, 0.4], [-100, -214, 0.2], [-100, -236, 0.3], [-100, -270, 0.1], [-100, -288, 0.6], [104, -200, -0.4], [104, -214, -0.2], [104, -236, -0.3], [104, -250, -0.1], [-62, -300, Math.PI], [-80, -300, Math.PI + 0.2], [60, -300, Math.PI], [78, -300, Math.PI - 0.2], [-68, -186, 0.9], [68, -186, -0.9], [-86, -160, 0.4], [86, -160, -0.4]];
  houses.forEach(([x, z, ry], i) => { const k = i % 4 === 3 ? 'kb_barracks' : 'kb_house'; add(k, x, z, ry, HILL_S.house, 4.6); });
  add('kb_market', 44, -186, 0.3, 5, 4); add('kb_well', -22, -200, 0, 4, 2); add('kb_mill', -98, -252, 0.8, 5, 4.6); add('kb_watchtower', 100, -268, 0, 5, 2.4);
  for (const [x, z] of [[-30, -300], [30, -300]]) add('kb_detail_rocks', x, z, 0, 5, 0);
  // the upper ward: fine houses and a market square
  add('kb_house', -48, -244, 0.9, 5, 4.6); add('kb_house', 48, -244, -0.9, 5, 4.6); add('kb_market', -22, -232, 0.4, 4.5, 3.6);
}
