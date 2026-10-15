// ===================================================================
// Castle Hill: the castle is a white-stone hill-city in four stacked terraces, each ringed by its own wall, climbed by
// ramps that hug the cliff of the terrace above. The back of the hill is sheer (the terraces stack tight there);
// the front opens into wide yards. Nothing here is flat:
//   tier 1 (y 0)   the Outer Bailey yard inside the curtain wall: the arena, the armoury, the training yard, the lower town
//   tier 2 (y 6)   the lower terrace: the master smith, the market, houses
//   tier 3 (y 12)  the King's Court behind the Royal gate: gardens, houses
//   tier 4 (y 18)  the citadel: the Great Hall, the treasury, the royal tailor, the keep above it all
// gy(x, z) is the ground height anywhere in the realm (0 outside the castle); everything that stands on the ground asks it.
// Walls and towers are the Kenney Castle Kit (ck_*), the houses and the keep are KayKit's Medieval Builder (kb_*).
// ===================================================================
const HILL = {
  tiers: [ // tier 1 is an ellipse at ground; the rest are circles. h = the floor height
    { cx: 0, cz: -226, rx: 116, rz: 86, h: 0 },
    { cx: 0, cz: -246, rx: 65, rz: 65, h: 6 },
    { cx: 0, cz: -258, rx: 52, rz: 52, h: 12 },
    { cx: 0, cz: -264, rx: 40, rz: 40, h: 18 }
  ],
  rampW: 9, rise: 6, rampLanding: 1.6,
  // ramps: from tier k up to tier k+1, hugging the cliff of tier k+1, from angle a (bottom) to b (top). Angles are from the
  // tier's centre, 0 = south, positive = east.
  ramps: [{ k: 1, a: 0.12, b: 0.66 }, { k: 2, a: 0.6, b: -0.06 }, { k: 3, a: -0.2, b: -1.09 }],
  gateA: 0 // the Bailey gate is at the south of tier 1
};
const HILL_T = HILL.tiers, HILL_S = { wall: 5, tower: 5, house: 4.2 };
// a point on a tier's rim at angle th (and f of the radius: 1 = the edge)
function hillPt(T, th, f) { return [T.cx + T.rx * (f == null ? 1 : f) * Math.sin(th), T.cz + T.rz * (f == null ? 1 : f) * Math.cos(th)]; }
// a point r metres from a tier's centre at angle th
function hillPolar(T, r, th) { return [T.cx + r * Math.sin(th), T.cz + r * Math.cos(th)]; }
// normalised distance from a tier's centre (1 = on the rim)
function hillNd(T, x, z) { const dx = (x - T.cx) / T.rx, dz = (z - T.cz) / T.rz; return Math.sqrt(dx * dx + dz * dz); }
// which tier a point is on (0 = outside the castle)
function tierOf(x, z) { for (let k = HILL_T.length; k >= 1; k--) if (hillNd(HILL_T[k - 1], x, z) <= 1) return k; return 0; }
// on a ramp? returns { ramp, t (0 at the bottom, 1 at the top), r, th }
function rampAt(x, z) {
  for (const Rp of HILL.ramps) {
    const U = HILL_T[Rp.k], dx = x - U.cx, dz = z - U.cz, r = Math.hypot(dx, dz);
    if (r < U.rx || r > U.rx + HILL.rampW) continue;
    const th = Math.atan2(dx, dz), progress = (th - Rp.a) / (Rp.b - Rp.a);
    const landing = HILL.rampLanding / (r * Math.abs(Rp.b - Rp.a));
    if (progress < -landing || progress > 1 + landing) continue;
    const t = Math.max(0, Math.min(1, progress));
    return { ramp: Rp, t, r, th };
  }
  return null;
}
// Deterministic, continuous heightfield for the country. Built sites are deliberately
// graded into it; the castle and its existing tier geometry retain their exact heights.
function realmHeight(x, z) {
  const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const broad = 4.2 * Math.sin(x / 105) * Math.cos(z / 133) + 2.3 * Math.sin((x + z) / 59);
  const folds = 2.0 * Math.sin(x / 24 + z / 37) * Math.cos(z / 29);
  const ridge = 18 * smooth((-x - 115) / 320) * (0.65 + 0.35 * Math.cos(z / 105));
  const north = 5 * smooth((-z - 85) / 310);
  let h = broad + folds + ridge + north;
  // Smooth land-use clearings; no building, list or water surface floats above a slope.
  for (const [cx, cz, inner, outer] of [[0, 0, 100, 145], [-180, 135, 72, 112], [-214, -104, 38, 65], [-256, -42, 42, 72], [222, 40, 98, 136], [0, -226, 122, 155], [-510, -250, 115, 155], [530, 140, 135, 170], [-90, 620, 145, 185], [0, -690, 135, 175],
    // Authored city geometry samples gy at these source coordinates before
    // translation; keep the sampled floor level identical at both sites.
    [-840, -250, 115, 155], [890, 140, 135, 170], [-90, 900, 145, 185], [0, -1030, 135, 175]]) {
    const d = Math.hypot(x - cx, z - cz);
    h *= smooth((d - inner) / (outer - inner));
  }
  return h;
}
function gy(x, z) {
  const surface=worldMapSurfaceAt(x,z);if(surface!=null)return surface;
  if (z > HILL_T[0].cz + HILL_T[0].rz + 1) return realmHeight(x, z);
  const rp = rampAt(x, z); if (rp) return HILL_T[rp.ramp.k - 1].h + HILL.rise * rp.t;
  const k = tierOf(x, z); return k ? HILL_T[k - 1].h : realmHeight(x, z);
}
// A walking body needs floor under its full footprint. Checking the travelled
// segment as well prevents a fast movement frame from skipping a thin cliff.
function castleSurfaceSafe(x, z, radius) {
  if (hillNd(HILL_T[0], x, z) > 1.08) return true;
  const y = gy(x, z);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    if (Math.abs(gy(x + Math.cos(a) * radius, z + Math.sin(a) * radius) - y) > 1.2) return false;
  }
  return true;
}
function castleWalkable(x0, z0, x1, z1, radius) {
  const length = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(length / 0.25));
  let oldY = gy(x0, z0);
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = gy(x, z);
    if (Math.abs(y - oldY) > 1.2 || !castleSurfaceSafe(x, z, radius)) return false;
    oldY = y;
  }
  return true;
}
// the slope under your feet (for leaning the horse a touch): dy of the ground per metre north
function gslope(x, z) { return (gy(x, z - 0.5) - gy(x, z + 0.5)); }
// ---- building blocks from the kits
// a Kenney tower: base block, mid blocks, a roof; h = number of blocks tall
function hillTower(R, x, z, Y, h, o) {
  o = o || {}; const s = o.s || HILL_S.tower, lift = 1.31 * s;
  for (let i = 0; i < h; i++) kpiece(R, i === 0 ? 'ck_tower_square' : (i === h - 1 ? 'ck_tower_square_mid_windows' : 'ck_tower_square_mid'), x, Y + i * lift, z, 0, s);
  const top = kpiece(R, o.flat ? 'ck_tower_square_top' : o.high ? 'ck_tower_square_top_roof_high' : 'ck_tower_square_top_roof', x, Y + h * lift, z, 0, s);
  if (o.flag) { const fl = kpiece(R, 'ck_flag', x + s * 0.25, Y + h * lift + (o.flat ? 0.3 : 1.0) * s, z, 0, s * 0.9); if (fl && o.flagCol) fl.traverse(m => { if (m.isMesh) m.material = TMAT['hflag' + o.flagCol] || (TMAT['hflag' + o.flagCol] = lmat({ color: o.flagCol, roughness: 0.9, flatShading: true })); }); }
  TOWN.obst.push({ x, z, r: s * (o.rim ? 0.8 : 0.7) }); return top;
}
// a wall of Kenney blocks along a tier's rim (just inside the edge), blocks overlapping so there are no gaps.
// gaps: a list of [angle, halfWidth in metres]. Where the terrace below is within 7 m (the sheer back of the hill) the wall is left out.
function hillRimWall(R, k, Y, gaps, flagCol) {
  const T = HILL_T[k - 1], s = HILL_S.wall, f = 1 - 2.6 / Math.min(T.rx, T.rz), L = Math.PI * (1.5 * (T.rx + T.rz) - Math.sqrt(T.rx * T.rz)) * f, n = Math.round(L / (s * 0.88));
  const below = k > 1 ? HILL_T[k - 2] : null, toweri = Math.max(5, Math.round(n / 9));
  for (let i = 0; i < n; i++) {
    const th = (i + 0.5) / n * TAU - Math.PI, [x, z] = hillPt(T, th, f);
    if (gaps.some(([ga, gw]) => Math.abs(Math.atan2(Math.sin(th - ga), Math.cos(th - ga))) * T.rx < gw)) continue;
    if (below && hillNd(below, x, z) > 1 - 7 / Math.min(below.rx, below.rz)) continue;
    const [x2, z2] = hillPt(T, th + 0.01, f), ang = Math.atan2(x2 - x, z2 - z);
    if (i % toweri === 0) { hillTower(R, x, z, Y, k === 1 ? 3 : 2, { flag: i % (toweri * 2) === 0, flagCol, high: k > 2, rim: k === 1 }); continue; }
    kpiece(R, 'ck_wall', x, Y, z, ang, s);
    TOWN.obst.push({ x, z, r: s * (k === 1 ? 0.78 : 0.55) });
  }
}
// the terrace top and its cliff: a disc at height Y, and a cylinder of white rock down to the terrace below
function hillTerrace(R, k) {
  const T = HILL_T[k - 1], Y = T.h, below = k > 1 ? HILL_T[k - 2].h : 0;
  const top = mk(R, new THREE.CircleGeometry(1, 96), lmat({ map: venueTex(k === 1 ? 'dirt' : 'whitestone'), color: k === 1 ? '#b9b2a4' : ['#d8d2c6', '#e0dbd0', '#e8e4da'][k - 2], roughness: 1 }), T.cx, Y + 0.02, T.cz, false);
  top.rotation.x = -Math.PI / 2; top.scale.set(T.rx, T.rz, 1); top.receiveShadow = true; top.userData.landmark = true;
  if (k === 1) return;
  const tex = venueTex('whitestone').clone(); tex.repeat.set(Math.round(T.rx / 2.5), 2); tex.needsUpdate = true;
  const H = Y - below + 0.6, cyl = mk(R, new THREE.CylinderGeometry(T.rx, T.rx + 1.4, H, 128, 1, true), lmat({ map: tex, color: '#ffffff', roughness: 0.95, side: THREE.DoubleSide }), T.cx, below + H / 2 - 0.3, T.cz, false);
  cyl.receiveShadow = true; cyl.userData.landmark = true;
  const band = mk(R, new THREE.CylinderGeometry(T.rx + 0.15, T.rx + 0.25, 0.7, 128, 1, true), tmat('#c5bdae'), T.cx, Y - 0.35, T.cz, false); band.userData.landmark = true;
}
// a ramp: a curved stone slab up the cliff of tier k+1 from angle a to b, with a parapet on the drop side
function hillRamp(R, Rp) {
  const U = HILL_T[Rp.k], y0 = HILL_T[Rp.k - 1].h, y1 = U.h, n = 28, r0 = U.rx + 0.25, r1 = U.rx + HILL.rampW, W = HILL.rampW;
  const pos = [], uv = [], idx = [], wpos = [], widx = [];
  for (let i = 0; i <= n; i++) {
    const landing = HILL.rampLanding / (r1 * Math.abs(Rp.b - Rp.a));
    const progress = -landing + i / n * (1 + 2 * landing);
    const t = Math.max(0, Math.min(1, progress)), th = Rp.a + (Rp.b - Rp.a) * progress, y = y0 + (y1 - y0) * t + 0.04, sn = Math.sin(th), cs = Math.cos(th);
    pos.push(U.cx + r0 * sn, y, U.cz + r0 * cs, U.cx + r1 * sn, y, U.cz + r1 * cs); uv.push(t * 10, 0, t * 10, 1);
    if (i) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    const rw = r1 + 0.5; wpos.push(U.cx + rw * sn, y0 - 0.4, U.cz + rw * cs, U.cx + rw * sn, y + 1.15, U.cz + rw * cs);
    if (i) { const b = (i - 1) * 2; widx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    if (i % 3 === 1 && i > 5) TOWN.obst.push({ x: U.cx + (r1 + 0.9) * sn, z: U.cz + (r1 + 0.9) * cs, r: 0.9 }); // the parapet blocks once the drop is real; the foot of the ramp stays open sideways
    if (i % 7 === 3) kpiece(R, 'ps_lamp', U.cx + (r1 - 0.7) * sn, y, U.cz + (r1 - 0.7) * cs, 0, 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const slab = new THREE.Mesh(g, lmat({ map: venueTex('whitestone'), color: '#cfc8ba', roughness: 1, side: THREE.DoubleSide })); slab.receiveShadow = true; slab.userData.landmark = true; R.add(slab);
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3)); wg.setIndex(widx); wg.computeVertexNormals();
  const wall = new THREE.Mesh(wg, lmat({ color: '#d9d3c6', roughness: 0.95, side: THREE.DoubleSide })); wall.userData.landmark = true; R.add(wall);
  // the top end: a short wall across the band so the ramp ends at the arch, not in thin air
  const thE = Rp.b + Math.sign(Rp.b - Rp.a) * 4.2 / r1, sn = Math.sin(thE), cs = Math.cos(thE), ang = Math.atan2(sn, cs);
  for (const rr of [r0 + W * 0.25, r0 + W * 0.7]) { kpiece(R, 'ck_wall', U.cx + rr * sn, y1, U.cz + rr * cs, ang, 4.2); TOWN.obst.push({ x: U.cx + rr * sn, z: U.cz + rr * cs, r: 2.3 }); }
}
// an open arch in a tier's wall at the top of a ramp: two towers either side and a banner
function hillArch(R, k, th, Y) {
  const T = HILL_T[k - 1], f = 1 - 2.6 / T.rx;
  for (const d of [-1, 1]) { const [x, z] = hillPt(T, th + d * 7.5 / T.rx, f); hillTower(R, x, z, Y, 2, { high: true }); }
  const [x, z] = hillPt(T, th, f); const b = kpiece(R, 'ck_flag_banner_long', x, Y, z, th, 3.2); if (b) b.position.y = Y + 1;
}
// houses packed along the rings: just inside each wall and against each cliff, in as many rows as the terrace has room for,
// with a lane left open every few houses so you can get between the rows
function hillHouses(R, add) {
  const rnd = seeded('hill'), kinds = ['kb_house', 'kb_house', 'kb_house', 'kb_house', 'kb_barracks', 'kb_market', 'kb_lumbermill', 'kb_house', 'kb_mill', 'kb_house'];
  // keep clear of what is built later: the vendors, the stations, the hidden places, the arenas, the roads
  const keep = [...Object.values(STALL_AT).map(([x, z]) => ({ x, z, r: 4.5 })), ...STATIONS.map(st => ({ x: st.at[0], z: st.at[1], r: 4.5 })), ...SECRETS.map(sc => ({ x: sc.x, z: sc.z, r: 6 }))];
  for (const Rd of ROADS) for (let i = 0; i < Rd.pts.length - 1; i++) { const [x0, z0] = Rd.pts[i], [x1, z1] = Rd.pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 3); for (let j = 0; j <= n; j++) keep.push({ x: x0 + (x1 - x0) * j / n, z: z0 + (z1 - z0) * j / n, r: Rd.w / 2 + 0.6 }); }
  const inArena = (x, z) => ARENAS.some(A => Math.abs(x - A.x) < A.bx + 7 && Math.abs(z - A.z) < A.bz + 3.5);
  // the strip beside each ramp stays open: it is the only way along that terrace
  const byRamp = (x, z) => HILL.ramps.some(Rp => { if (Rp.k === 1) return false; const U = HILL_T[Rp.k], r = Math.hypot(x - U.cx, z - U.cz), th = Math.atan2(x - U.cx, z - U.cz), lo = Math.min(Rp.a, Rp.b) - 0.7, hi = Math.max(Rp.a, Rp.b) + 0.7; return r > U.rx && r < U.rx + HILL.rampW + 9 && th > lo && th < hi; });
  const clear = (x, z, r) => { if (inArena(x, z) || byRamp(x, z)) return false; for (const o of keep) if (Math.hypot(o.x - x, o.z - z) < r + o.r) return false; for (const o of TOWN.obst) { const d = Math.hypot(o.x - x, o.z - z); if (d < r + o.r) return false; } return true; };
  const S = 3.4, half = 0.85 * S, step = 7.4; let made = 0;
  for (let k = 1; k <= HILL_T.length; k++) {
    const T = HILL_T[k - 1], rings = [];
    for (let off = 9.5; off < Math.min(T.rx, T.rz) - 6; off += 6.4) rings.push({ T, f: 1 - off / Math.min(T.rx, T.rz) });
    if (k < HILL_T.length) { const U = HILL_T[k]; for (let off = 5; off < 24; off += 6.4) rings.push({ U, r: U.rx + HILL.rampW + off }); }
    for (const ring of rings) {
      const Tc = ring.U || ring.T, L = ring.U ? TAU * ring.r : Math.PI * 1.5 * (T.rx + T.rz) * ring.f, n = Math.round(L / step);
      for (let i = 0; i < n; i++) {
        if (i % 6 === 5) continue; // a lane
        const th = (i + 0.5) / n * TAU - Math.PI + (rnd() - 0.5) * 0.02;
        const [x, z] = ring.U ? [Tc.cx + ring.r * Math.sin(th), Tc.cz + ring.r * Math.cos(th)] : hillPt(T, th, ring.f);
        if (tierOf(x, z) !== k || rampAt(x, z) || cliffAt(x, z, half) || !clear(x, z, half + 0.4)) continue;
        if (k === 1 && z > T.cz + T.rz - 52 && Math.abs(x) < 14) continue; // the street stays open
        const kind = kinds[Math.floor(rnd() * kinds.length)], ry = Math.atan2(Tc.cx - x, Tc.cz - z) + (ring.U ? Math.PI : 0) + (rnd() - 0.5) * 0.3;
        add(kind, x, z, ry, S * (0.9 + rnd() * 0.2), half); made++;
      }
    }
  }
  // then the infill: random plots in the yards wherever a house still fits (a little back from the roads, so the lanes stay)
  const roadKeep = keep.filter(o => o.r < 4.5);
  for (let k = 1; k <= 3; k++) {
    const T = HILL_T[k - 1];
    for (let i = 0, n = [520, 170, 90][k - 1]; i < n; i++) {
      const a = rnd() * TAU, rr = Math.sqrt(rnd()) * 0.96, x = T.cx + T.rx * rr * Math.sin(a), z = T.cz + T.rz * rr * Math.cos(a);
      if (tierOf(x, z) !== k || rampAt(x, z) || cliffAt(x, z, half) || !clear(x, z, half + 0.6)) continue;
      if (roadKeep.some(o => Math.hypot(o.x - x, o.z - z) < o.r + half + 2.4)) continue;
      if (k === 1 && z > T.cz + T.rz - 52 && Math.abs(x) < 14) continue;
      const kind = kinds[Math.floor(rnd() * kinds.length)];
      add(kind, x, z, rnd() * TAU, S * (0.85 + rnd() * 0.25), half); made++;
    }
  }
  return made;
}
// ---- the castle, built on the hill
function buildCastleHill(R, add) {
  const flag = CAREER.club.tabard, T1 = HILL_T[0], T3 = HILL_T[2], T4 = HILL_T[3];
  for (let k = 1; k <= HILL_T.length; k++) hillTerrace(R, k);
  for (const Rp of HILL.ramps) hillRamp(R, Rp);
  landmark(R, () => {
    // the curtain wall round the yard with the Bailey gate in the south, then each terrace's wall with its arch or gate
    hillRimWall(R, 1, 0, [[HILL.gateA, 7]], flag);
    castleGate(R, ...hillPt(T1, HILL.gateA, 1 - 2.6 / T1.rz), 'bailey', 'The Outer Bailey', 0, HILL.gateA);
    for (const d of [-1, 1]) { const [x, z] = hillPt(T1, d * 9.5 / T1.rx, 1 - 2.6 / T1.rz); hillTower(R, x, z, 0, 3, { high: true, flag: true, flagCol: flag }); }
    hillRimWall(R, 2, HILL_T[1].h, [[HILL.ramps[0].b, 7]], flag); hillArch(R, 2, HILL.ramps[0].b, HILL_T[1].h);
    hillRimWall(R, 3, T3.h, [[HILL.ramps[1].b, 7]], '#e3b341');
    castleGate(R, ...hillPt(T3, HILL.ramps[1].b, 1 - 2.6 / T3.rx), 'royal', 'The King’s Court', T3.h, HILL.ramps[1].b);
    for (const d of [-1, 1]) { const [x, z] = hillPt(T3, HILL.ramps[1].b + d * 9.5 / T3.rx, 1 - 2.6 / T3.rx); hillTower(R, x, z, T3.h, 3, { high: true, flag: true, flagCol: '#e3b341' }); }
    hillRimWall(R, 4, T4.h, [[HILL.ramps[2].b, 7]], '#e3b341'); hillArch(R, 4, HILL.ramps[2].b, T4.h);
    // the keep on the citadel's north side, with its tall towers: the top of the whole hill
    const kp = kpiece(R, 'kb_castle', T4.cx, T4.h, T4.cz - 30, Math.PI, 6); if (kp) TOWN.obst.push({ x: T4.cx, z: T4.cz - 30, r: 6.5 });
    hillTower(R, T4.cx + 22, T4.cz - 28, T4.h, 7, { high: true, flag: true, flagCol: flag, s: 4 }); hillTower(R, T4.cx - 22, T4.cz - 28, T4.h, 6, { high: true, s: 4 });
    hillTower(R, T4.cx, T4.cz - 33, T4.h, 9, { high: true, flag: true, flagCol: '#e3b341', s: 3.6 });
  });
}
// the castle's roads: the main street to the first ramp, each ramp as a few short legs (so the route follows the curve), the streets between
function hillRoads() {
  const out = [], T1 = HILL_T[0];
  const ramp = (Rp, n) => { const U = HILL_T[Rp.k], r = U.rx + HILL.rampW * 0.55, pts = []; for (let i = 0; i <= n; i++) { const th = Rp.a + (Rp.b - Rp.a) * i / n; pts.push([U.cx + r * Math.sin(th), U.cz + r * Math.cos(th)]); } return pts; };
  const r1 = ramp(HILL.ramps[0], 4), r2 = ramp(HILL.ramps[1], 4), r3 = ramp(HILL.ramps[2], 4);
  const gate = hillPt(T1, HILL.gateA, 1), g2 = hillPt(HILL_T[1], HILL.ramps[0].b, 1 - 5 / HILL_T[1].rx), g3 = hillPt(HILL_T[2], HILL.ramps[1].b, 1 - 5 / HILL_T[2].rx), g4 = hillPt(HILL_T[3], HILL.ramps[2].b, 1 - 5 / HILL_T[3].rx);
  const rd = (name, pts, w) => out.push({ name, pts: pts.map(([x, z]) => [+x.toFixed(1), +z.toFixed(1)]), w });
  rd('street', [gate, [0, gate[1] - 22], [r1[0][0] - 2, r1[0][1] + 4], r1[0]], 6);
  rd('yardW', [[0, gate[1] - 22], [-40, -170], [-70, -176], [-100, -200], [-100, -232], [-80, -250], [-72, -262]], 4);
  rd('yardE', [[0, gate[1] - 22], [40, -170], [66, -184], [68, -206], [70, -236], [72, -258]], 4);
  rd('ramp1', r1, 7); rd('t2', [r1[4], g2, [g2[0] - 4, g2[1] - 8], r2[0]], 5);
  rd('ramp2', r2, 7); rd('t3', [r2[4], g3, [g3[0] - 1, g3[1] - 9], r3[0]], 5);
  rd('ramp3', r3, 7); rd('t4', [r3[4], g4, [-24, -244], [-21.5, -240.5], [-21, -237.5], [-17, -236.5], [-14, -236], [0, -236], [0, HALL.z1 + 1]], 3.5);
  rd('t4east', [[0, -236], [14, -236], [20.5, -237.5], [21.5, -240.5], [21.5, -251.3]], 3.5);
  rd('t4hall', [[0, -239], [0, -242], [10, -242], [15.8, -246.5], [15.8, -280], [13, -284.5], [7, -285.4]], 2);
  out[out.length - 1].navOnly = true; // the Hall already has flagstones
  return out;
}
