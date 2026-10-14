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
// the castle hill's bounding boxes (the real shape is in 14o_hill.js: HILL.tiers); HALL is the Great Hall on the citadel
const BAILEY = { x0: -116, x1: 116, z0: -312, z1: -140 };
const WARD = { x0: -50, x1: 50, z0: -306, z1: -206 };
const HALL = { x0: -19, x1: 19, z0: -288, z1: -240 };
const LAKE = { x: 222, z: 40, rx: 56, rz: 82 };
const DISTRICTS = [
  { key: 'fair', name: 'The Fairground', x: 0, z: 12, r: 100 },
  { key: 'village', name: 'Millbrook Village', x: -180, z: 135, r: 88 },
  { key: 'woods', name: 'The Old Woods', x: -205, z: -80, r: 100 },
  { key: 'lake', name: 'Mirror Lake', x: 200, z: 40, r: 95 },
  { key: 'bailey', name: 'The Outer Bailey', x: 0, z: -228, r: 120, gate: 'bailey' },
  { key: 'ward', name: 'The King’s Court', x: 0, z: -252, r: 46, gate: 'royal' }
  ,{ key: 'ashmarket', name: 'Ashmarket', x: -840, z: -250, r: 120 }
  ,{ key: 'stoneford', name: 'Stoneford', x: 890, z: 140, r: 130 }
  ,{ key: 'southmere', name: 'Southmere', x: -90, z: 900, r: 135 }
  ,{ key: 'northwatch', name: 'Northwatch Fortress', x: 0, z: -1030, r: 125 }
];
// arenas: every one is a 20 x 30 list (LIST) so the fight engine runs unchanged; the bout plays at the nearest one
const ARENAS = [
  { key: 'dome', name: 'The Red Deer Dome', x: 0, z: 0, bx: 18, bz: 23, district: 'fair', icon: '🏟️', accent: '#b43135', entry: [0, 27] },
  { key: 'peasant', name: 'Millbrook Mudlists', x: -176, z: 158, bx: 13, bz: 18, district: 'village', icon: '🌾', accent: '#a56b30', entry: [-176, 134] },
  { key: 'forest', name: 'Old Woods Clearing', x: -214, z: -104, bx: 13, bz: 18, district: 'woods', icon: '🌲', accent: '#3d7650', entry: [-214, -74] },
  { key: 'beach', name: 'Mirror Lake Strand', x: 148, z: 78, bx: 13, bz: 18, district: 'lake', icon: '🌊', accent: '#3185ac', entry: [148, 103] },
  { key: 'castle', name: 'Bailey Stone Lists', x: -74, z: -204, bx: 14, bz: 19, district: 'bailey', gate: 'bailey', icon: '🏰', accent: '#647084', entry: [-74, -179] },
  { key: 'hall', name: 'King’s Great Hall', x: 0, z: -264, bx: 12, bz: 15, district: 'ward', gate: 'royal', indoor: true, icon: '👑', accent: '#b78a35', entry: [0, -244] }
  ,{ key: 'foundry', name: 'Foundry Pit', x: -902, z: -260, bx: 14, bz: 19, district: 'ashmarket', icon: '⚒️', accent: '#ad6135', entry: [-902, -236] }
  ,{ key: 'bridge', name: 'Bridge Lists', x: 947, z: 161, bx: 14, bz: 19, district: 'stoneford', icon: '🌉', accent: '#4c7290', entry: [947, 185] }
  ,{ key: 'orchard', name: 'Orchard Lists', x: -22, z: 943, bx: 14, bz: 19, district: 'southmere', icon: '🌿', accent: '#7d9855', entry: [-22, 967] }
  ,{ key: 'northwatch', name: 'Northwatch Yard', x: 58, z: -1060, bx: 14, bz: 19, district: 'northwatch', icon: '🏰', accent: '#536d79', entry: [58, -1036] }
];
// A walk-in practice list, separate from the six competitive/spectator arenas.
const TRAINING_GROUND = { key: 'training', name: 'Fairground Training Yard', x: -58, z: -56, bx: 12, bz: 17,
  district: 'fair', icon: '🥊', accent: '#c38c36', entry: [-58, -37], practice: true };
// Local crews share services, not identities. The Dome retains its original three hosts.
const ARENA_CREWS = [
  ['peasant', [-7, 134], [0, 134], [7, 134], ['Hilda of Millbrook', 'Tomas the Thresher', 'Pip the Bellringer'], ['#86513b', '#697641', '#b87932']],
  ['forest', [-221, -74], [-214, -74], [-207, -74], ['Rowan Ashshield', 'Bram of the Pines', 'Mara Mossbell'], ['#4a6240', '#765437', '#596d58']],
  ['beach', [141, 103], [148, 103], [155, 103], ['Captain Irena Shore', 'Dagan Driftwood', 'Nessa Tidecaller'], ['#335d79', '#a27b4c', '#36919a']],
  ['castle', [-81, -179], [-74, -179], [-67, -179], ['Ser Corvin Vale', 'Odo Stonevoice', 'Lady Elspeth Grey'], ['#48566f', '#74544c', '#775578']],
  ['hall', [-7, -233], [0, -233], [7, -233], ['Dame Ysabel Crown', 'Lord Roderic Gold', 'Herald Celestine'], ['#65496b', '#a47b31', '#784057']]
];
for (const [arena, marshalAt, heraldAt, crierAt, names, colours] of ARENA_CREWS) {
  const A = ARENAS.find(a => a.key === arena);
  [marshalAt, heraldAt, crierAt].forEach((at, i) => STATIONS.push({
    key: `${arena}:${['marshal', 'giant', 'crier'][i]}`, service: ['marshal', 'giant', 'crier'][i], arena,
    name: names[i], role: ['Lists marshal', 'Tournament herald', 'Online crier'][i],
    icon: ['⚔️', '📜', '🔔'][i], at, ry: Math.PI, col: colours[i], look: i,
    district: A.district
  }));
}
STATIONS.push({ key: 'training:coach', service: 'training', name: 'Coach Sigrid', role: 'Learn the moves',
  icon: '🥊', at: [-53, -35], ry: Math.PI, col: '#a36b37', look: 2, practice: true });
const ROADS = [
  // The fair's walkable spine reaches the Dome entrance; shops branch off it.
  { name: 'fair-main', pts: [[0, 70], [0, 58], [1, 48], [0, 38], [0, 27]], w: 9 },
  { name: 'fair-crafts', pts: [[0, 38], [-18, 38], [-31, 29], [-42, 20]], w: 5 },
  { name: 'fair-market', pts: [[0, 38], [17, 38], [29, 32], [44, 30]], w: 5 },
  { name: 'north', pts: [[0, -24], [-2, -45], [-1, -67], [-4, -88], [-2, -111], [0, -140]], w: 6 },
  { name: 'west', pts: [[-42, 20], [-52, 10], [-52, -2], [-74, 7], [-95, -11], [-119, -10], [-137, -30], [-162, -39], [-178, -61], [-196, -78]], w: 5 },
  { name: 'southwest', pts: [[-16, 70], [-38, 81], [-58, 101], [-87, 101], [-111, 123], [-135, 127], [-160, 140]], w: 5 },
  { name: 'millpond-east', pts: [[-38, 81], [-47, 75], [-49.7, 72]], w: 2.8 },
  { name: 'millpond-farm', pts: [[-62.3, 72], [-61, 64], [-61, 55], [-68, 44]], w: 2.6 },
  { name: 'east', pts: [[44, 30], [53, 25], [52, 6], [74, 17], [92, 17], [105, 36], [121, 49], [128, 58], [122, 79], [132, 100]], w: 5 },
  { name: 'woodsnorth', pts: [[-196, -78], [-190, -104], [-169, -122], [-148, -135], [-120, -150]], w: 4 },
  { name: 'quarry-spur', pts: [[-196, -78], [-218, -71], [-237, -58], [-251, -45]], w: 3.5 },
  { name: 'lakenorth', pts: [[128, 58], [145, 38], [139, 12], [156, -11], [153, -33], [176, -60]], w: 4 },
  { name: 'south', pts: [[0, 70], [12, 92], [2, 116], [-23, 133], [-30, 160]], w: 4 },
  { name: 'millbrook-lists', pts: [[-160, 140], [-176, 134]], w: 3 },
  { name: 'millbrook-green', pts: [[-160, 140], [-174, 128], [-184, 115], [-198, 121], [-218, 116], [-230, 106]], w: 3.2 },
  { name: 'woods-lists', pts: [[-196, -78], [-214, -74]], w: 3 },
  { name: 'shore-lists', pts: [[132, 100], [148, 103]], w: 3 },
  // A long rideable circuit through the farm valley and high forest, with meaningful shortcuts.
  { name: 'country-loop', pts: [[-160, 140], [-211, 174], [-248, 215], [-261, 271], [-226, 326], [-166, 354], [-91, 371], [-12, 392], [67, 365], [138, 319], [193, 276], [225, 223], [183, 160], [132, 100]], w: 5 },
  { name: 'ridge-trail', pts: [[-196, -78], [-239, -83], [-275, -61], [-309, -17], [-333, 48], [-310, 113], [-274, 169], [-248, 215]], w: 4 },
  { name: 'riverford-shortcut', pts: [[-30, 160], [-57, 202], [-41, 251], [-70, 302], [-91, 371]], w: 4 },
  { name: 'lakeside-path', pts: [[183, 160], [240, 170], [304, 145], [340, 94], [322, 34], [289, -12], [228, -31], [176, -60]], w: 4 },
  { name: 'northern-hunter-road', pts: [[-309, -17], [-336, -79], [-345, -133], [-315, -202], [-276, -271], [-213, -320], [-138, -351], [-61, -351], [27, -369], [101, -344], [157, -293], [196, -222], [197, -147], [176, -60]], w: 4 }
];
// Forest belts follow the high ridges and valley edges, leaving the roads and
// inhabited clearings navigable. The same footprints are drawn on the map.
const COUNTRY_FORESTS = [
  [-350, -95, 115, 195], [-374, 89, 104, 170], [-298, 302, 105, 145],
  [-115, 326, 92, 125], [116, 320, 96, 125], [327, 183, 100, 135],
  [282, -145, 112, 160], [105, -218, 82, 95],
  [-233, -396, 87, 120], [54, -434, 98, 135], [270, -266, 91, 110]
];
function arenaBlocked(x, z, r) { for (const A of ARENAS) if (Math.abs(x - A.x) < Math.max(A.bx, LIST.W / 2 + 4) + r && Math.abs(z - A.z) < Math.max(A.bz, LIST.L / 2 + 4) + r) return A; return null; }
function lakeIn(x, z, pad = 0) { const dx = (x - LAKE.x) / (LAKE.rx + pad), dz = (z - LAKE.z) / (LAKE.rz + pad); return dx * dx + dz * dz < 1; }
function districtAt(x, z) {
  { const k = tierOf(x, z); if (k >= 3) return DISTRICTS[5]; if (k) return DISTRICTS[4]; }
  let best = null, bd = 1e9; for (const D of [...DISTRICTS.slice(0, 4), ...DISTRICTS.slice(6)]) { const d = Math.hypot(x - D.x, z - D.z) / D.r; if (d < bd) { bd = d; best = D; } }
  return bd < 1.25 ? best : { key: 'wild', name: 'The Open Country' };
}
function nearestArena(x, z) { let best = null, bd = 1e9; for (const A of ARENAS) { const d = Math.hypot(x - A.x, z - A.z); if (d < bd) { bd = d; best = A; } } return { A: best, d: bd }; }
// ---- builders
function buildRealmTerrain(R) {
  const makeMaterial = repeat => { const t = venueTex('grass').clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.needsUpdate = true; return lmat({ map: t, vertexColors: true, roughness: 1, side: THREE.DoubleSide }); };
  const centralMat = makeMaterial(65), outerMat = makeMaterial(12);
  const patch = (x0, x1, z0, z1, material) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const g = new THREE.PlaneGeometry(w, d, Math.ceil(w / 9.5), Math.ceil(d / 9.5)); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, colours = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = cx + p.getX(i), z = cz + p.getZ(i), y = realmHeight(x, z);
      p.setY(i, y - 0.055);
      const rocky = x < -230 && y > 4, farmland = z > 185 && x > -280 && x < 60;
      c.set(rocky ? '#a6a08d' : farmland ? '#c5bf8b' : y > 7 ? '#9faa82' : '#b4c7a0').convertSRGBToLinear();
      colours[i * 3] = c.r; colours[i * 3 + 1] = c.g; colours[i * 3 + 2] = c.b;
    }
    p.needsUpdate = true; g.setAttribute('color', new THREE.BufferAttribute(colours, 3)); g.computeVertexNormals();
    const m = mk(R, g, material, cx, 0, cz, false); m.receiveShadow = true; m.userData.landmark = true; return m;
  };
  // Keep the original central collision mesh for the castle. Outer terrain is visible in nearby tiles only.
  TOWN.terrain = patch(-620, 620, -640, 640, centralMat);
  TOWN.terrainOuter = [];
  const strip = (x0, x1, z0, z1) => {
    for (let x = x0; x < x1; x += 200) for (let z = z0; z < z1; z += 200) {
      const m = patch(x, Math.min(x + 200, x1), z, Math.min(z + 200, z1), outerMat);
      TOWN.terrainOuter.push({ m, x: m.position.x, z: m.position.z });
    }
  };
  strip(-TOWN_RX, TOWN_RX, -TOWN_RZ, -640);
  strip(-TOWN_RX, TOWN_RX, 640, TOWN_RZ);
  strip(-TOWN_RX, -620, -640, 640);
  strip(620, TOWN_RX, -640, 640);
}
// Soft borders let worked earth, clearings and tracks settle into the grass.
// The old opaque quads made each district look like props on a dark rectangle.
const REALM_MASKS = {};
function realmEdgeMask(kind) {
  if (REALM_MASKS[kind]) return REALM_MASKS[kind];
  const size = kind === 'road' ? 64 : 128, h = kind === 'road' ? 1 : size;
  const data = new Uint8Array(size * h * 4);
  const smooth = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  for (let y = 0; y < h; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size, v = (y + 0.5) / h;
    const edge = kind === 'road' ? Math.min(u, 1 - u) : kind === 'shore' ? 0.5 - Math.hypot(u - 0.5, v - 0.5) : Math.min(u, 1 - u, v, 1 - v);
    const wobble = kind === 'road' ? 0 : 0.013 * Math.sin(x * 0.41 + y * 0.33) * Math.sin(x * 0.17 - y * 0.62);
    const a = Math.round(255 * smooth((edge + wobble) / (kind === 'road' ? 0.13 : kind === 'shore' ? 0.12 : 0.115)));
    const i = (y * size + x) * 4; data[i] = data[i + 1] = data[i + 2] = a; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, h, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return REALM_MASKS[kind] = t;
}
// Crops and reeds share a restrained palette instead of the oversized neon
// crop props that read as loose objects from the road.
function realmCropField(R, x0, x1, z0, z1, nx, nz, kind) {
  const corn = kind === 'corn', n = nx * nz, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const root = new THREE.Group(); root.position.set(cx, 0, cz); R.add(root);
  const soil = lmat({ color: '#745f43', roughness: 1, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false });
  for (let j = 0; j < nz; j++) {
    const z = z0 + (j + 0.5) * (z1 - z0) / nz, half = Math.min(0.55, (z1 - z0) / nz * 0.31);
    const pos = [], idx = [];
    for (let i = 0; i <= nx; i++) { const x = x0 + i * (x1 - x0) / nx; for (const side of [-1, 1]) { const pz = z + side * half; pos.push(x - cx, gy(x, pz) + 0.058, pz - cz); } if (i < nx) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const bed = new THREE.Mesh(g, soil); bed.frustumCulled = false; root.add(bed);
  }
  const stalkH = corn ? 1.45 : 0.9;
  const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(corn ? 0.045 : 0.025, 0.04, stalkH, 5), lmat({ color: corn ? '#67783c' : '#aa965d', roughness: 1 }), n);
  const head = new THREE.InstancedMesh(new THREE.ConeGeometry(corn ? 0.105 : 0.065, corn ? 0.33 : 0.25, 5), lmat({ color: corn ? '#bfa75e' : '#c5ae70', roughness: 1 }), n);
  const leaves = new THREE.InstancedMesh(new THREE.BoxGeometry(corn ? 0.48 : 0.3, 0.025, 0.09), lmat({ color: corn ? '#768247' : '#a89b60', roughness: 1, side: THREE.DoubleSide }), n * 2);
  const d = new THREE.Object3D(); let at = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = x0 + (i + 0.5) * (x1 - x0) / nx, z = z0 + (j + 0.5) * (z1 - z0) / nz;
    const y = gy(x, z), turn = (i * 2.1 + j * 1.7) % TAU;
    d.rotation.set(0, turn, 0); d.scale.set(1, 1, 1); d.position.set(x - cx, y + stalkH / 2, z - cz); d.updateMatrix(); stem.setMatrixAt(at, d.matrix);
    d.position.y = y + stalkH + (corn ? 0.1 : 0.07); d.updateMatrix(); head.setMatrixAt(at, d.matrix);
    for (let k = 0; k < 2; k++) { d.position.y = y + stalkH * (k ? 0.48 : 0.67); d.rotation.set(k ? -0.27 : 0.24, turn + k * Math.PI / 2, 0); d.updateMatrix(); leaves.setMatrixAt(at * 2 + k, d.matrix); }
    at++;
  }
  for (const mesh of [stem, head, leaves]) { mesh.frustumCulled = false; mesh.instanceMatrix.needsUpdate = true; root.add(mesh); }
  return root;
}
function realmReeds(R, points) {
  if (!points.length) return;
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length, cz = points.reduce((s, p) => s + p[1], 0) / points.length;
  const root = new THREE.Group(); root.position.set(cx, 0, cz); R.add(root);
  const n = points.length * 3, stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.017, 0.025, 1, 4), lmat({ color: '#697b54', roughness: 1 }), n);
  const head = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.17, 5), lmat({ color: '#765b3f', roughness: 1 }), n);
  const d = new THREE.Object3D(); let at = 0;
  for (let i = 0; i < points.length; i++) for (let j = 0; j < 3; j++) {
    const [px, pz] = points[i], x = px + Math.sin(i * 2.7 + j * 4.1) * 0.24, z = pz + Math.cos(i * 1.9 + j * 3.2) * 0.24;
    const y = gy(x, z), h = 0.55 + ((i * 7 + j * 3) % 5) * 0.12;
    d.rotation.set(0, 0, 0); d.scale.set(1, h, 1); d.position.set(x - cx, y + h / 2, z - cz); d.updateMatrix(); stem.setMatrixAt(at, d.matrix);
    d.scale.set(1, 1, 1); d.position.y = y + h + 0.08; d.updateMatrix(); head.setMatrixAt(at, d.matrix); at++;
  }
  for (const mesh of [stem, head]) { mesh.frustumCulled = false; mesh.instanceMatrix.needsUpdate = true; root.add(mesh); }
}
function realmGround(R, x0, x1, z0, z1, col, tex, y) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.ceil((x1 - x0) / 2), Math.ceil((z1 - z0) / 2));
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, y != null && y > 1 ? y : gy(cx + pos.getX(i), cz + pos.getZ(i)) + (y || 0.03));
  pos.needsUpdate = true; geo.computeVertexNormals();
  const g = mk(R, geo, lmat({ map: tex === false ? null : venueTex(tex || 'path'), alphaMap: realmEdgeMask('patch'), transparent: true, depthWrite: false, color: col, roughness: 1, side: THREE.DoubleSide }), cx, 0, cz, false);
  g.receiveShadow = true; (TOWN.mapRects = TOWN.mapRects || []).push([x0, x1, z0, z1, col]); return g;
}
function roadPath(Rd) {
  if (Rd.path) return Rd.path;
  // Keep the hill ramps and streets exact: their edges must track walls and
  // gates. The earth roads can turn gradually without losing their endpoints.
  if (/^(street|yard|ramp|t[234])/.test(Rd.name) || Rd.pts.length < 3) return Rd.path = Rd.pts;
  const pts = Rd.pts, path = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1], at = pts[i], next = pts[i + 1];
    const ax = at[0] - prev[0], az = at[1] - prev[1], bx = next[0] - at[0], bz = next[1] - at[1];
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    if (la < 0.01 || lb < 0.01) { path.push(at); continue; }
    const openCountry = /^(country|ridge|riverford|lakeside|northern)/.test(Rd.name);
    const reach = Math.min(openCountry ? 13 : 6, la * (openCountry ? 0.3 : 0.22), lb * (openCountry ? 0.3 : 0.22));
    const a = [at[0] - ax / la * reach, at[1] - az / la * reach];
    const b = [at[0] + bx / lb * reach, at[1] + bz / lb * reach];
    path.push(a);
    for (const t of [0.25, 0.5, 0.75]) { const u = 1 - t; path.push([u * u * a[0] + 2 * u * t * at[0] + t * t * b[0], u * u * a[1] + 2 * u * t * at[1] + t * t * b[1]]); }
    path.push(b);
  }
  path.push(pts[pts.length - 1]);
  return Rd.path = path;
}
function realmRoad(R, pts, w) {
  const m = TMAT['road' + w] || (TMAT['road' + w] = lmat({ map: venueTex('path'), alphaMap: realmEdgeMask('road'), transparent: true, depthWrite: false, color: '#91876d', roughness: 1, side: THREE.DoubleSide }));
  // A single ribbon shares its corner vertices. Independent strips left visible
  // square gaps and overlaps at every bend, especially on the country circuit.
  const pos = [], uv = [], idx = []; let distance = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0);
    if (L < 0.01) continue;
    const n = Math.max(1, Math.ceil(L / 2.5));
    for (let j = i ? 1 : 0; j <= n; j++) {
      const t = j / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      const before = pts[Math.max(0, i - (j === 0 ? 1 : 0))], after = pts[Math.min(pts.length - 1, i + (j === n ? 2 : 1))];
      const tx = after[0] - before[0], tz = after[1] - before[1], len = Math.hypot(tx, tz) || 1;
      const nx = tz / len, nz = -tx / len, v = (distance + t * L) / 7;
      for (const side of [-1, 1]) { const px = x + nx * side * w / 2, pz = z + nz * side * w / 2; pos.push(px, gy(px, pz) + 0.048, pz); uv.push(side < 0 ? 0 : 1, v); }
      if (pos.length > 6) { const k = pos.length / 3 - 4; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    distance += L;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const s = mk(R, g, m, 0, 0, 0, false); s.receiveShadow = true;
  (TOWN.mapRoads = TOWN.mapRoads || []).push({ pts, w });
}
// a stone-and-timber building: stone base, plastered timber upper floor, a pitched roof; door on the +z side
function realmHall(R, x, z, w, d, h, ry, o) {
  o = o || {}; const g = new THREE.Group(); g.position.set(x, gy(x, z), z); g.rotation.y = ry || 0; R.add(g);
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
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (gapAt && gapAt(x, z)) continue; kpiece(R, 'cs_wall_2x4_walkway', x, gy(x, z), z, ry, 1.5); }
  const k = Math.max(1, Math.round(L / 1.7));
  for (let i = 0; i <= k; i++) { const t = i / k, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (gapAt && gapAt(x, z, true)) continue; TOWN.obst.push({ x, z, r: 1.25 }); }
}
function castleTower(R, x, z, h, flagCol) {
  const baseY = gy(x, z);
  kpiece(R, 'cs_tower_mid', x, baseY, z, 0, 1.5); if (h > 1) { const t = kpiece(R, 'cs_tower_mid', x, baseY, z, 0, 1.5); if (t) t.position.y = baseY + 6; }
  const top = kpiece(R, 'cs_tower_top_1', x, baseY, z, 0, 1.5); if (top) top.position.y = baseY + (h > 1 ? 12 : 6);
  const cone = kpiece(R, 'cs_roof_cone', x, baseY, z, 0, 1.5); if (cone) cone.position.y = baseY + (h > 1 ? 18.4 : 12.4);
  if (flagCol) { const fl = mk(R, geo('rlm_flag', () => new THREE.PlaneGeometry(1.8, 1.1)), lmat({ color: flagCol, side: THREE.DoubleSide }), x + 0.9, baseY + (h > 1 ? 25.5 : 19.5), z); WORLD.bob.push({ o: fl, k: 'flag' }); mk(R, geo('rlm_pole', () => new THREE.CylinderGeometry(0.05, 0.05, 3, 6)), tmat('#2b2e31'), x, baseY + (h > 1 ? 24.6 : 18.6), z); }
  TOWN.obst.push({ x, z, r: 3.4 });
}
// the gate: a gatehouse, two towers, banners and torches; the gate itself is a gate obstacle that opens with the writ
function castleGate(R, x, z, key, label, Y, ry) {
  Y = Y || 0; ry = ry || 0; const g = new THREE.Group(); g.position.set(x, Y, z); g.rotation.y = ry; R.add(g);
  kpiece(g, 'cs_gate_2x4_doorway', 0, 0, 0, Math.PI / 2, 1.5);
  for (const sx of [-3.6, 3.6]) kpiece(g, 'dp_banner_large', sx, 1.6, 0.9, 0, 1.4);
  for (const sx of [-2.8, 2.8]) { const f = mk(g, geo('w_wtf', () => new THREE.ConeGeometry(0.08, 0.22, 8)), tmat('#ffb02e', { emissive: '#ff6a00', emissiveIntensity: 1.6 }), sx, 3.7, 0.8); WORLD.flick.push(f); kpiece(g, 'mk_Torch_Metal', sx, 2.6, 0.75, Math.PI, 1.4); }
  // the portcullis: drawn while you lack the writ
  const port = new THREE.Group(); port.position.set(0, 0, 0.2); g.add(port); const iron = tmat('#3a3d40', { metalness: 0.7, roughness: 0.5 });
  for (let i = -2; i <= 2; i++) mk(port, geo('rlm_pbar', () => new THREE.BoxGeometry(0.12, 3.6, 0.12)), iron, i * 0.95, 1.8, 0);
  for (let j = 0; j < 4; j++) mk(port, geo('rlm_pbar2', () => new THREE.BoxGeometry(4.6, 0.12, 0.12)), iron, 0, 0.5 + j * 0.95, 0);
  // the gatehouse walls either side of the opening (so nobody slips past the portcullis)
  for (const sx of [-4, 4]) TOWN.obst.push({ x: x + Math.cos(ry) * sx, z: z - Math.sin(ry) * sx, r: 1.5 });
  const G = { key, label, x: x + Math.sin(ry) * 0.2, z: z + Math.cos(ry) * 0.2, port, r: 4.5 }; (TOWN.gates = TOWN.gates || []).push(G); return G;
}
// a list for one of the outer arenas: fence, rope, posts, stands on the long sides, a scoreboard and torches
function arenaRope(R, A) {
  const rx = LIST.W / 2 + 4, rz = LIST.L / 2 + 4;
  const wood = tmat('#755536'), cord = tmat('#e6dcc0');
  const stakeGeo = geo('arena_rope_stake', () => new THREE.CylinderGeometry(0.055, 0.065, 1.15, 6));
  const cordGeo = geo('arena_rope_cord', () => new THREE.BoxGeometry(1, 0.04, 0.04));
  const up = new THREE.Vector3(1, 0, 0);
  const side = (x0, z0, x1, z1) => {
    const count = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 3);
    let prev = null;
    for (let i = 0; i <= count; i++) {
      const t = i / count, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = gy(x, z);
      mk(R, stakeGeo, wood, x, y + 0.575, z);
      const at = new THREE.Vector3(x, y + 0.96, z);
      if (prev) {
        const delta = at.clone().sub(prev), rope = mk(R, cordGeo, cord, (at.x + prev.x) / 2, (at.y + prev.y) / 2, (at.z + prev.z) / 2);
        rope.scale.x = delta.length(); rope.quaternion.setFromUnitVectors(up, delta.normalize());
      }
      prev = at;
    }
  };
  side(A.x - rx, A.z - rz, A.x + rx, A.z - rz);
  side(A.x + rx, A.z - rz, A.x + rx, A.z + rz);
  if (A.practice) {
    // Match the practice list's walk-in gate; all four sides still have rope.
    side(A.x + rx, A.z + rz, A.x + 2.5, A.z + rz);
    side(A.x - 2.5, A.z + rz, A.x - rx, A.z + rz);
  } else side(A.x + rx, A.z + rz, A.x - rx, A.z + rz);
  side(A.x - rx, A.z + rz, A.x - rx, A.z - rz);
}
function arenaList(R, A, o) {
  o = o || {}; const W = LIST.W, L = LIST.L, x = A.x, z = A.z, Y = gy(x, z);
  const post = tmat(o.post || '#6e4d31'), rail = tmat(o.rail || '#8a6a42');
  for (const [px, pz, len, rot] of [[0, -L / 2, W, 0], [0, L / 2, W, 0], [-W / 2, 0, L, Math.PI / 2], [W / 2, 0, L, Math.PI / 2]]) {
    const practiceGate = A.practice && pz === L / 2 && !rot;
    for (const yy of [0.55, 1.05]) {
      if (practiceGate) {
        const half = (W - 5) / 2;
        for (const sx of [-1, 1]) mk(R, new THREE.BoxGeometry(half, 0.09, 0.09), rail, x + sx * (W + 5) / 4, Y + yy, z + pz);
      } else { const r = mk(R, geo('ar_rail' + len, () => new THREE.BoxGeometry(len, 0.09, 0.09)), rail, x + px, Y + yy, z + pz); r.rotation.y = rot; }
    }
    const n = Math.round(len / 2.5); for (let i = 0; i <= n; i++) { const t = -len / 2 + i * len / n; if (practiceGate && Math.abs(t) < 2.5) continue; mk(R, geo('ar_post', () => new THREE.BoxGeometry(0.14, 1.25, 0.14)), post, x + (rot ? px : px + t), Y + 0.62, z + (rot ? pz + t : pz)); }
  }
  if (o.floor) { const f = mk(R, new THREE.PlaneGeometry(W, L), lmat({ map: venueTex(o.floorTex || 'dirt'), color: o.floor, roughness: 1 }), x, Y + 0.025, z, false); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; }
  if (o.stands !== false) arenaStands(R, A, o);
  arenaRope(R, A);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { kpiece(R, 'mk_Torch_Metal', x + sx * (W / 2 + 0.6), Y + 1.2, z + sz * (L / 2 + 0.6), 0, 1.6); const f = mk(R, geo('w_wtf', () => new THREE.ConeGeometry(0.08, 0.22, 8)), tmat('#ffb02e', { emissive: '#ff6a00', emissiveIntensity: 1.6 }), x + sx * (W / 2 + 0.6), Y + 2.2, z + sz * (L / 2 + 0.6)); WORLD.flick.push(f); }
  // the board: arena name, and the bout when one is on
  const board = townSign(A.name, o.signCol || '#6d1b28'); board.position.set(x, Y + 3.4, z - L / 2 - 2.2); board.scale.setScalar(2); R.add(board);
  for (const sx of [-2.4, 2.4]) mk(R, geo('ar_bpost', () => new THREE.CylinderGeometry(0.08, 0.1, 3.6, 6)), post, x + sx, Y + 1.8, z - L / 2 - 2.3);
  // A visible entrance arch on the road-facing side gives each list a distinct silhouette in the realm.
  const [ex, ez] = A.entry, EY = gy(ex, ez), stone = A.key === 'castle' || A.key === 'hall', beach = A.key === 'beach';
  const gateMat = beach ? lmat({ color: '#3c2b1e', roughness: 1 }) : tmat(stone ? '#a9a49b' : '#6b4a2c');
  for (const sx of [-1, 1]) {
    const postH = stone ? 4.8 : beach ? 2.8 : A.key === 'forest' ? 4.2 : 3.5;
    const halfSpan = beach ? 2.6 : 3.4;
    mk(R, new THREE.BoxGeometry(stone ? 0.8 : beach ? 0.26 : 0.35, postH, stone ? 0.8 : beach ? 0.26 : 0.35), gateMat, ex + sx * halfSpan, EY + postH / 2, ez);
    if (!beach) {
      const flag = mk(R, new THREE.PlaneGeometry(0.9, 1.4), lmat({ color: A.accent, side: THREE.DoubleSide }), ex + sx * halfSpan, EY + postH - 1.1, ez + 0.45);
      flag.rotation.y = sx * 0.14;
    }
  }
  mk(R, new THREE.BoxGeometry(beach ? 5.45 : 7.2, stone ? 0.8 : beach ? 0.22 : 0.38, stone ? 0.9 : beach ? 0.26 : 0.45), gateMat, ex, EY + (stone ? 4.5 : beach ? 2.7 : A.key === 'forest' ? 4.0 : 3.3), ez);
  if (A.key === 'peasant') for (const sx of [-1, 1]) kpiece(R, 'fy_vil_hay_1', ex + sx * 5.4, EY, ez + 1, 0, 1.1);
  if (A.key === 'forest') for (const sx of [-1, 1]) kpiece(R, 'nt_log', ex + sx * 5.4, EY, ez + 1, Math.PI / 2, 1.1);
  // block the stands so nobody walks through them (the list itself is blocked by arenaBlocked)
  return board;
}
// Seating belongs outside the field venue's rope (four metres beyond the wooden list).
// The Dome uses this too, without building a second set of list rails over its live fight.
function arenaStands(R, A, o) {
  const Y = gy(A.x, A.z), L = LIST.L, W = LIST.W;
  for (const sx of [-1, 1]) for (let row = 0; row < 3; row++) {
    const bx = A.x + sx * (W / 2 + 6.3 + row * 2.2);
    const b = mk(R, geo('ar_bench', () => new THREE.BoxGeometry(1.2, 0.12, L * 0.8)), tmat(o.bench || '#7a5a3a'), bx, Y + 0.45 + row * 0.5, A.z); b.receiveShadow = true; gameplayShape(bx, A.z, 0.6, L * 0.4, 0, 0.9 + row * 0.5);
    for (const sz of [-1, 1]) mk(R, geo('ar_benchleg', () => new THREE.BoxGeometry(1.2, 1, 0.2)), tmat('#4a3422'), bx, Y + (0.45 + row * 0.5) / 2, A.z + sz * L * 0.38).scale.y = 0.45 + row * 0.5;
  }
  arenaSeatFolk(R, A);
}
// the original list sits under a great wooden dome: a ring of posts and a conical roof with an open top
function buildDome(R) {
  const rad = 27, posts = 20, wood = tmat('#5a3b24'), roof = lmat({ color: '#c2a777', roughness: 1, side: THREE.DoubleSide });
  for (let i = 0; i < posts; i++) { const a = i / posts * TAU; if (Math.sin(a) > 0.97) continue; // open the south entrance on the fair's main road
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad * 1.18; const p = mk(R, geo('dome_post', () => new THREE.CylinderGeometry(0.3, 0.36, 9, 8)), wood, x, 4.5, z); p.castShadow = true; TOWN.obst.push({ x, z, r: 0.5 }); }
  const cone = new THREE.CylinderGeometry(4, rad + 1.5, 7, 32, 1, true); const c = mk(R, cone, roof, 0, 12.5, 0, false); c.scale.z = 1.18;
  const ring = mk(R, new THREE.TorusGeometry(rad, 0.35, 6, 48), wood, 0, 9, 0); ring.rotation.x = Math.PI / 2; ring.scale.y = 1.18;
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const b = mk(R, geo('dome_flag', () => new THREE.PlaneGeometry(1.1, 2.2)), lmat({ color: i % 2 ? CAREER.club.tabard : '#e8e1cf', side: THREE.DoubleSide }), Math.cos(a) * (rad - 0.2), 7.6, Math.sin(a) * (rad - 0.2) * 1.18); b.lookAt(0, 7.6, 0); }
  const s = townSign(ARENAS[0].name.toUpperCase(), '#6d1b28'); s.position.set(0, 10.4, rad * 1.18 + 0.3); s.scale.setScalar(2.2); R.add(s);
  arenaStands(R, ARENAS[0], { bench: '#69452d' });
}
// trees: a forest patch scattered in a circle, avoiding roads, obstacles and the given clear zones
function realmForest(R, cx, cz, rad, n, kinds, seed, clear) {
  const rnd = seeded(seed); let placed = 0;
  for (let t = 0; t < n * 6 && placed < n; t++) {
    const a = rnd() * TAU, rr = Math.sqrt(rnd()) * rad, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
    if (Math.hypot(x / TOWN_RX, z / TOWN_RZ) > 0.99) continue;
    if (arenaBlocked(x, z, 6) || (Math.abs(x - TRAINING_GROUND.x) < TRAINING_GROUND.bx + 6 && Math.abs(z - TRAINING_GROUND.z) < TRAINING_GROUND.bz + 6) || lakeIn(x, z, 4) || onRoad(x, z, 4) || (clear && clear(x, z))) continue;
    if (x > BAILEY.x0 - 6 && x < BAILEY.x1 + 6 && z > BAILEY.z0 - 6 && z < BAILEY.z1 + 6) continue;
    const [k, s, r] = kinds[Math.floor(rnd() * kinds.length)];
    if (TOWN.obst.some(o => Math.hypot(o.x - x, o.z - z) < o.r + Math.max(r, 0.4) + 1.5)) continue;
    if (Math.hypot(x + 56, z - 72) < 15 || Math.hypot(x + 230, z - 96) < 13) continue;
    kpiece(R, k, x, gy(x, z), z, rnd() * TAU, s * (0.8 + rnd() * 0.45)); if (r) TOWN.obst.push({ x, z, r }); placed++;
  }
  return placed;
}
function onRoad(x, z, pad) {
  for (const Rd of ROADS) { const pts = roadPath(Rd); for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz;
    const t = clamp(((x - x0) * dx + (z - z0) * dz) / L2, 0, 1), px = x0 + dx * t, pz = z0 + dz * t;
    if (Math.hypot(x - px, z - pz) < Rd.w / 2 + pad) return true;
  } }
  return false;
}
function signpost(R, x, z, ry, lines) {
  const g = new THREE.Group(); g.position.set(x, gy(x, z), z); g.rotation.y = ry; R.add(g);
  mk(g, geo('sp_post', () => new THREE.CylinderGeometry(0.09, 0.11, 3.2, 6)), tmat('#5a3b24'), 0, 1.6, 0);
  lines.forEach(([txt, a], i) => { const s = townSign(txt, '#4a3422'); s.scale.set(0.55, 0.55, 0.55); s.position.set(Math.sin(a) * 0.7, 2.7 - i * 0.42, Math.cos(a) * 0.7); s.rotation.y = a + Math.PI / 2; g.add(s); });
  TOWN.obst.push({ x, z, r: 0.3 });
}
// ---- the whole realm
function buildRealm(R) {
  TOWN.gates = []; TOWN.mapRoads = []; TOWN.realmBoards = {};
  if (!ROADS.some(r => r.name === 'street')) ROADS.push(...hillRoads());
  const O = TOWN.obst, add = (key, x, z, ry, s, r) => { const p = kpiece(R, key, x, gy(x, z), z, ry || 0, s || 1); if (r) O.push({ x, z, r }); return p; };
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  // roads, then signposts where they leave the fairground
  for (const Rd of ROADS) if (!Rd.navOnly) realmRoad(R, roadPath(Rd), Rd.w);
  signpost(R, 5, -28, 0, [['CASTLE ↑', 0], ['FAIRGROUND ↓', Math.PI]]);
  signpost(R, -56, 4, -Math.PI / 2, [['THE OLD WOODS', -Math.PI / 2], ['FAIRGROUND', Math.PI / 2]]);
  signpost(R, 56, 10, Math.PI / 2, [['MIRROR LAKE', Math.PI / 2], ['FAIRGROUND', -Math.PI / 2]]);
  signpost(R, -22, 74, 0, [['MILLBROOK', -2.2], ['FAIRGROUND', 0.9]]);
  signpost(R, 6, -126, 0, [['OUTER BAILEY', 0], ['FAIRGROUND', Math.PI]]);
  signpost(R, -192, -70, 0, [['QUARRY', -1.6], ['OLD WOODS LISTS', 2.8], ['CASTLE', 0.6]]);
  signpost(R, 134, 62, 0, [['MIRROR LAKE STRAND', 1.2], ['CLIFFS', 0]]);
  // The open-country routes remain unlit. Lamps at every bend looked like
  // scattered poles and often sat on diagonal tracks rather than beside them.
  landmark(R, () => buildDome(R));
  buildRealmCastle(R, add, face);
  buildVillage(R, add, face);
  buildWoods(R, add, face);
  buildLake(R, add, face);
  buildExpandedCities(R);
  // the open country between: meadows, lone trees, rocks, hedges, a few farmsteads in the distance
  const meadow = [['kf_tree_1_a', 1.1, 1], ['kf_tree_3_a', 1.1, 1], ['kf_tree_4_a', 1, 1], ['kf_bush_3_a', 1.4, 0.6], ['kf_rock_1_e', 1.2, 0.8], ['kf_rock_3_a', 1.3, 0.9], ['kf_grass_2_a', 1.3, 0]];
  const rings = [[0, -100, 70], [-110, 60, 60], [110, -60, 70], [100, 140, 70], [-110, -150, 50], [130, -150, 60], [-240, 20, 50], [-250, 210, 50], [200, 200, 70], [250, -140, 60], [-60, 200, 60], [60, 220, 60]];
  rings.forEach(([x, z, r], i) => realmForest(R, x, z, r, IS_TOUCH ? 22 : 45, meadow, 'meadow' + i, (px, pz) => Math.hypot(px / FAIR_RX, pz / FAIR_RZ) < 1.25));
  const wildTrees = [['kf_tree_1_c', 1.1, 1.1], ['kf_tree_2_d', 1, 1], ['kf_tree_4_b', 1, 1], ['kf_bush_4_a', 1.4, 0.5], ['kf_grass_1_a', 1.2, 0], ['kf_rock_3_e', 1, 0.7]];
  COUNTRY_FORESTS.forEach(([x, z, r, n], i) => realmForest(R, x, z, r, IS_TOUCH ? Math.round(n * 1.2) : Math.round(n * 1.8), wildTrees, 'countryforest' + i, (px, pz) => Math.hypot(px / FAIR_RX, pz / FAIR_RZ) < 1.25));
  // A hunter's fire and a weathered waystation give the northern circuit
  // places to discover without adding another copy of the festival vendors.
  realmHall(R, -224, -340, 8, 6, 3.2, 0.5, { sign: 'HUNTER’S REST', signCol: '#34583c', roof: '#48503d' });
  add('campfire_stones', -213, -337, 0, 1.7, 1);
  add('nt_log', -216, -332, 0.4, 1.3, 0.7);
  realmHall(R, 113, -351, 8, 6, 3.2, -0.3, { sign: 'RIDGE WAYSTATION', signCol: '#65543c', roof: '#66543f' });
  add('rt_pulley_crate', 120, -346, 0.3, 1.1, 0.8);
  add('ps_lamp', 108, -344, 0, 1, 0.3);
  // the edge of the world: a thick wood all round
  const rnd = seeded('realmedge'), N = IS_TOUCH ? 130 : 260;
  for (let i = 0; i < N; i++) { const a = i / N * TAU + rnd() * 0.02, e = 0.97 + rnd() * 0.12; add(['kf_tree_2_c', 'kf_tree_4_b', 'kf_tree_1_c', 'kf_tree_2_d'][i % 4], Math.cos(a) * TOWN_RX * e, Math.sin(a) * TOWN_RZ * e, rnd() * TAU, 1 + rnd() * 0.35, 0); }
  // a few far farmsteads (Kenney retro pieces) to fill the horizon
  for (const [x, z, ry] of [[250, 190, 0.6], [-260, 230, 2.2], [260, -200, 1.1], [-270, -230, 0.3]]) { realmHall(R, x, z, 7, 5, 3, ry, { roof: '#6b4a2a' }); add('fb_silo', x + 7, z - 4, ry, 0.8, 2); }
}
// ---- the castle: the outer bailey (tier 2) and the inner ward with the Great Hall (tier 3)
function buildRealmCastle(R, add, face) {
  buildCastleHill(R, add);
  // ---- tier 1, the yard inside the curtain wall: the street up the middle, the arena west, the training yard and armoury east
  add('kb_market', 16, -150, 0.3, 5, 4); add('fb_well', -14, -152, 0, 1.2, 1.2);
  for (const z of [-148, -160, -172]) for (const sx of [-9, 9]) { add('mk_Banner_1', sx, z, 0, 1.4, 0.4); add('mk_Banner_1_Cloth', sx, z, 0, 1.4, 0); }
  for (const z of [-154, -166, -178]) for (const sx of [-5, 5]) add('ps_lamp', sx, z, 0, 1, 0.3);
  realmHall(R, 80, -200, 18, 9, 5, -Math.PI / 2, { sign: 'ARMOURY', signCol: '#3d4a57', tower: true });
  for (let i = 0; i < 5; i++) { const x = 24 + i * 4, z = -158; mk(R, geo('fest_pell', () => new THREE.CylinderGeometry(0.13, 0.15, 1.9, 8)), tmat('#8a6a42'), x, 0.95 + gy(x, z), z).castShadow = true; O_push(x, z, 0.35); }
  add('mk_Dummy', 40, -166, 0.3, 1, 0.5); add('mk_Dummy', 44, -167, -0.2, 1, 0.5); add('mk_WeaponStand', 22, -166, 0.2, 1, 0.8);
  for (const [x, z] of [[30, -174], [36, -176], [42, -178]]) add('fy_vil_archery_target', x, z, 0, 1.2, 0.6);
  add('mk_Stall_Cart_Empty', 56, -160, -0.3, 1.2, 1.6); add('mk_Crate_Wooden', 60, -164, 0.2, 1.2, 0.6); add('mk_Barrel', 62, -162, 0, 1.2, 0.5);
  libraryPlace(R, 'Pickaxe_Bronze', -72, -253, 1.15, 0.7);
  libraryPlace(R, 'Rope_1', -65, -256, 0.42, 0.1);
  libraryPlace(R, 'Chest_Wood', -72, -235, 0.88, 0.3);
  libraryPlace(R, 'Bucket_Wooden_1', 82, -253, 0.68, 0.4);
  libraryPlace(R, 'Bench', 88, -262, 0.9, Math.PI / 2);
  // the Castle arena: stone floor, wooden stands
  arenaList(R, ARENAS[4], { floor: '#b8ae9e', floorTex: 'cobble', bench: '#6a5a4a', signCol: '#26344d' });
  // the flanks of the yard: the chapel, the guild hall and the stables east; the barracks and the mine shaft west
  realmHall(R, 90, -240, 14, 22, 7, 0, { sign: 'CHAPEL', signCol: '#4a3a6a', allStone: true, tower: true, roof: '#4a4e52' });
  realmHall(R, 76, -235, 18, 9, 4.5, -Math.PI / 2, { sign: 'GUILD HALL', signCol: '#6d1b28' });
  realmHall(R, 86, -258, 16, 10, 4, 0, { sign: 'STABLES', signCol: '#6b4e16', flat: true });
  realmHall(R, -84, -244, 20, 10, 6, Math.PI / 2, { sign: 'BARRACKS', signCol: '#26344d' });
  add('mk_Barrel_Holder', -76, -256, 0, 1.2, 1); add('mk_WeaponStand', -76, -232, 0.2, 1, 0.8);
  realmGround(R, -82, -68, -270, -250, '#8e8478', 'dirt', 0.03 + gy(-75, -260));
  add('fy_rock_big_1', -78, -266, 0.6, 1.4, 3); add('fy_rock_big_3', -72, -268, 1.4, 1.3, 3); add('rt_pulley_crate', -70, -254, 0, 3, 0.8); add('mk_Chain_Coil', -68, -256, 0, 1.2, 0);
  { const sg = townSign('MINE SHAFT', '#5a4a3a'); sg.position.set(-75, 3 + gy(-75, -249), -249); R.add(sg); }
  // ---- tier 2, the lower terrace: the master smith west, a market square and a feast east
  { const T2 = HILL_T[1], P = (r, th) => hillPolar(T2, r, th); // the smith stands along the terrace's curve, its door toward the cliff side
    realmHall(R, ...P(55, -1.0), 14, 8, 4.5, -1.0 + Math.PI, { sign: 'MASTER SMITH', signCol: '#7a2b1c' });
    add('bf_furnace', ...P(55, -0.83), -0.83 + Math.PI, 1.2, 1.6); add('mk_Anvil', ...P(50.5, -1.05), -1.05, 1.3, 0.6); add('mk_Whetstone', ...P(50.5, -1.1), 0, 1, 0.6); }
  add('fountainRoundDetail', 46, -212, 0, 1.6, 1.8);
  add('mk_Table_Large', 48, -224, 0, 1.2, 1.4); add('mk_Bench', 48, -222.6, 0, 1, 0); add('mk_Bench', 48, -225.4, 0, 1, 0); add('mk_Chalice', 48, -224, 0, 2.4, 0);
  add('mk_Stall_Cart_Empty', 40, -208, 0.6, 1.2, 1.6); add('mk_Barrel_Apples', 44, -206, 0, 1.2, 0.5);
  // ---- tier 3, the King's Court: gardens either side of the gate
  for (const [x, z] of [[30, -226], [42, -240]]) add('fountainRoundDetail', x, z, 0, 1.6, 1.8);
  for (let i = 0; i < 6; i++) add('kf_bush_3_a', 22 + i * 2, -225, 0, 1.8, 0.5);
  for (const [x, z] of [[36, -232], [26, -236], [36, -250], [40, -256]]) { add('cr_flowers_crop', x, z, 0, 1.2, 0); add('cr_flowers_crop', x + 2, z + 1, 1, 1.2, 0); }
  // ---- tier 4, the citadel: the treasury and the royal tailor flank the Great Hall's forecourt
  realmHall(R, 25, -262, 10, 12, 5, 0, { sign: 'TREASURY', signCol: '#8a6a12', allStone: true, roof: '#5a4a2a' });
  add('rp_chest_ingots', 20, -258, 0.3, 1.2, 0.8);
  realmHall(R, -25, -262, 10, 12, 5, 0, { sign: 'ROYAL TAILOR', signCol: '#5b2a86' });
  landmark(R, () => buildGreatHall(R, add));
  // the king's guard and court in the forecourt (static figures; the walking guards are townsfolk)
  for (const [k, x, z, ry] of [['po_male_standing', -6, -238, 0], ['po_male_standing', 6, -238, 0], ['po_female_standing_hips', -11, -232, 0.8], ['po_male_standing_hips', 11, -232, -0.6]]) { const p = add(k, x, z, ry, 1, 0.4); if (p) p.traverse(o => { if (o.isMesh) o.material = TMAT.court || (TMAT.court = lmat({ vertexColors: true, roughness: 0.9, flatShading: true, color: '#c8b8ff' })); }); }
  // and the town itself: houses packed along every wall and cliff
  TOWN.hillHouses = hillHouses(R, add);
}
function O_push(x, z, r) { TOWN.obst.push({ x, z, r }); }
// whatever fn adds to R stays visible from afar (castle walls, towers, the dome, the hall)
function landmark(R, fn) { const n0 = R.children.length; fn(); for (let i = n0; i < R.children.length; i++) R.children[i].userData.landmark = true; }
// the Great Hall: stone walls with buttresses and lit windows, a roof that lifts away when you're inside, the king's dais
function buildGreatHall(R0, add) {
  const H = HALL, w = H.x1 - H.x0, d = H.z1 - H.z0, cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2, ht = 11, Y = gy(cx, cz);
  const R = new THREE.Group(); R.position.y = Y; R0.add(R); R.userData.landmark = true;
  const stone = TMAT.ghstone || (TMAT.ghstone = lmat({ map: venueTex('whitestone'), color: '#e6e1d6', roughness: 0.9 })), dark = tmat('#4a4640'), win = tmat('#ffcf6a', { emissive: '#c07010', emissiveIntensity: 0.9 });
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
  // The Hall's side aisles must stay open so visitors can reach the throne.
  arenaList(R0, ARENAS[5], { post: '#3a2a1a', rail: '#6a4a2a', stands: false, signCol: '#8a6a12' });
  mk(R, new THREE.BoxGeometry(10, 0.8, 4), dark, cx, 0.4, H.z0 + 3.2); add('mk_Chair_1', cx, H.z0 + 3.4, 0, 2.2, 0); { const cr = kpiece(R, 'rp_crown', cx, 2.9, H.z0 + 3.2, 0, 0.5); }
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const b = mk(R, geo('gh_ban', () => new THREE.PlaneGeometry(1.4, 3.6)), lmat({ color: i % 2 ? '#8a1a2a' : '#e3b341', side: THREE.DoubleSide }), cx + sx * (w / 2 - 0.66), 6.4, H.z0 + 8 + i * 9); b.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; }
  for (let i = 0; i < 3; i++) { const c = kpiece(R, 'mk_Chandelier', cx, 7.6, H.z0 + 10 + i * 14, 0, 1.6); }
  if (typeof buildThrone === 'function') buildThrone(R0);
  // walls block you, except the door
  const k = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 1.6); for (let i = 0; i <= n; i++) TOWN.obst.push({ x: x0 + (x1 - x0) * i / n, z: z0 + (z1 - z0) * i / n, r: 1 }); };
  k(H.x0, H.z0, H.x1, H.z0); k(H.x0, H.z0, H.x0, H.z1); k(H.x1, H.z0, H.x1, H.z1); k(H.x0, H.z1, cx - 3.2, H.z1); k(cx + 3.2, H.z1, H.x1, H.z1);
  TOWN.obst.push({ x: cx, z: H.z0 + 3.2, r: 2.4 }, { x: cx - 3, z: H.z0 + 3.2, r: 2 }, { x: cx + 3, z: H.z0 + 3.2, r: 2 });
}
// ---- Millbrook: the village, its farm and fields, the Peasants' arena
function buildVillage(R, add, face) {
  const cx = -180, cz = 135;
  realmGround(R, cx - 24, cx + 24, cz - 30, cz - 6, '#d2bea0'); // the green
  add('fb_well', cx, cz - 18, 0, 1.2, 1.2);
  const homes = [[-210, 100], [-196, 96], [-160, 98], [-146, 108], [-214, 122], [-216, 140], [-150, 128], [-140, 145], [-204, 170], [-150, 175]];
  homes.forEach(([x, z], i) => { if (typeof cottage === 'function' && typeof VILLAGE_GEO !== 'undefined' && i % 3 !== 2) { cottage(R, x, z, face(x, z, cx, cz - 18), 'mill' + i); TOWN.obst.push({ x, z, r: 3.6 }); } else realmHall(R, x, z, 7, 6, 3.4, face(x, z, cx, cz - 18), { roof: ['#7a3a2a', '#6b5a3a', '#5a4a3a'][i % 3] }); });
  add('ps_house1', -232, 112, 1.2, 1, 5); add('ps_house4', -128, 120, -1.3, 1, 5.5);
  // the farm: barns, coop, silo, a windmill, fences, fields of wheat and corn, a pumpkin patch
  add('fb_bigbarn', -248, 160, 1.6, 1, 5); add('fb_openbarn', -232, 180, 1.2, 1, 4); add('fb_chickencoop', -224, 196, 0.6, 1, 1.6); add('fb_silo_house', -262, 140, 1.6, 1, 4);
  add('fb_windmill', -120, 186, -0.6, 1.1, 3); add('fb_watertower', -116, 160, 0, 1, 1.6);
  for (let i = 0; i < 8; i++) add('fb_fence', -270 + i * 6, 210, 0, 1, 0);
  for (let i = 0; i < 6; i++) add('fb_fence2', -276, 174 + i * 6, Math.PI / 2, 1, 0);
  realmGround(R, -270, -236, 200, 210, '#b6a17b', 'path', 0.03);
  realmCropField(R, -268, -238, 200.5, 209, 16, 5, 'wheat');
  realmGround(R, -138, -112, 196, 216, '#b8a27d', 'path', 0.03);
  realmCropField(R, -136, -114, 198, 214, 12, 9, 'corn');
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) add('pumpkin', -196 + i * 2, 196 + j * 2, (i + j) % 6, 1.4);
  for (let i = 0; i < 5; i++) add('cr_lettuce_crop', -160 + i * 1.6, 196, 0, 1.6); for (let i = 0; i < 5; i++) add('cr_carrot_crop', -160 + i * 1.6, 199, 0, 1.6);
  // market corner: a stall cart, crates, barrels
  add('mk_Stall_Cart_Empty', -168, 112, 0.3, 1.2, 1.6); add('mk_FarmCrate_Apple', -165, 115, 0, 1.4, 0.4); add('mk_FarmCrate_Carrot', -171, 115.5, 0.4, 1.4, 0.4); add('mk_Barrel_Apples', -164, 110, 0, 1.2, 0.5);
  for (const [key, x, z, height, yaw] of [
    ['Bench', -188, 116, 0.88, Math.PI / 2],
    ['Bucket_Wooden_1', -177, 119, 0.65, 0.3],
    ['Barrel_Holder', -162, 114, 1.05, 0.2],
    ['Cage_Small', -226, 191, 0.62, 0.4],
    ['Rope_1', -233, 178, 0.42, 0.3],
    ['Flower_3_Group', -205, 111, 0.5, 0.3],
    ['Flower_3_Group', -198, 129, 0.45, 1.4],
    ['Plant_1', -239, 105, 0.85, 0.6],
    ['Rock_Medium_2', -245, 89, 1.15, 0.2],
  ]) libraryPlace(R, key, x, z, height, yaw);
  // the Peasants' arena: mud floor, hay bales for seats
  arenaList(R, ARENAS[1], { floor: '#6e5a3e', bench: '#c9b06a', signCol: '#6b4e16' });
  for (let i = 0; i < 8; i++) add(i % 2 ? 'fy_vil_hay_1' : 'fy_vil_hay_2', ARENAS[1].x - 16 + i * 4.4, ARENAS[1].z + 20, i, 1, 0.8);
  // villagers standing about (cheap posed figures)
  for (const [k, x, z, ry] of [['po_male_standing_waving', -186, 120, 0.3], ['po_female_pickingup', -198, 200, 1.2], ['po_male_pickingup', -142, 205, -0.6], ['po_female_standing', -172, 128, 2.6], ['po_male_sitting_cheering', ARENAS[1].x - 14.2, ARENAS[1].z - 2, Math.PI / 2], ['po_female_sitting_cheering', ARENAS[1].x + 14.2, ARENAS[1].z + 4, -Math.PI / 2], ['po_male_lookingup', ARENAS[1].x - 4, ARENAS[1].z + 21, Math.PI]]) add(k, x, z, ry, 1, 0.4);
  // a millpond and a stream
  { const bank = mk(R, new THREE.CircleGeometry(10, 32), lmat({ color: '#665942', roughness: 1 }), -230, gy(-230, 96) + 0.025, 96, false); bank.rotation.x = -Math.PI / 2; bank.scale.y = 0.72;
    const w = mk(R, new THREE.CircleGeometry(8.7, 32), lmat({ color: '#294f5b', roughness: 0.82, metalness: 0 }), -230, gy(-230, 96) + 0.045, 96, false); w.rotation.x = -Math.PI / 2; w.scale.y = 0.7; TOWN.obst.push({ x: -230, z: 96, r: 5.5 }); }
  { const timber = tmat('#382a1d'), post = tmat('#271f17');
    for (let i = 0; i < 9; i++) { const z = 104 - i * 0.72; mk(R, geo('millpond_dock_plank', () => new THREE.BoxGeometry(2.5, 0.13, 0.68)), timber, -230, gy(-230, 96) + 0.23, z); }
    for (const x of [-231.2, -228.8]) for (const z of [103.7, 100.5, 98.1]) mk(R, geo('millpond_dock_post', () => new THREE.BoxGeometry(0.13, 1.1, 0.13)), post, x, gy(-230, 96) + 0.22, z);
  }
  realmReeds(R, Array.from({ length: 15 }, (_, i) => { const a = i / 15 * TAU; return [-230 + Math.cos(a) * 9.1, 96 + Math.sin(a) * 6.4]; }));
  for (const [x, z] of [[-240, 95], [-224, 90], [-225, 102]]) add('kf_rock_1_e', x, z, x, 0.6, 0.4);
  // trees round the village
  realmForest(R, cx, cz, 95, IS_TOUCH ? 30 : 60, [['kf_tree_1_a', 1.1, 1], ['kf_tree_3_b', 1, 1], ['kf_tree_1_b', 1, 1], ['kf_bush_3_a', 1.6, 0.6], ['kf_tree_2_b', 1, 1]], 'village', (x, z) => Math.hypot(x - cx, z - cz) < 70 && !(z > 196 || x < -244));
}
// ---- the Old Woods: dense KayKit forest, a glade with the Forest arena, the quarry, a charcoal burners' camp, a hunter's lodge
function buildWoods(R, add, face) {
  const A = ARENAS[2];
  realmGround(R, A.x - 16, A.x + 16, A.z - 22, A.z + 22, '#7a8a52', 'forest', 0.02);
  arenaList(R, A, { floor: '#6e7a48', floorTex: 'forest', post: '#4a3422', rail: '#5a4030', bench: '#5a4030', signCol: '#335c3f' });
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const x = A.x + Math.cos(a) * 21, z = A.z + Math.sin(a) * 26; add('nt_log', x, z, a, 1.4, 0.8); }
  // the quarry (moved out here from the fairground)
  realmGround(R, -276, -236, -64, -20, '#aaa18d', 'path', 0.03);
  for (const [k, x, z, ry, s] of [['fy_rock_big_1', -286, -46, 0.5, 1.4], ['fy_rock_big_3', -282, -62, 1.2, 1.2], ['fy_rock_block_1', -270, -70, 0.3, 1.4], ['fy_rock_medium_4', -286, -26, 2, 1.3], ['fy_rock_big_pillar', -278, -12, 0.9, 0.9]]) { add(k, x, z, ry, s, 2.2); }
  add('cart', -240, -24, 1.3, 2, 1.3); add('mk_Barrel', -242, -30, 0, 1.2, 0.5); add('ps_lamp', -240, -18, 0, 1, 0.3); libraryPlace(R, 'Crate_Wooden', -246, -60, 0.9, 0.2);
  for (const [key, x, z, height, yaw] of [
    ['Pickaxe_Bronze', -249, -58, 1.2, 0.5],
    ['Bucket_Wooden_1', -251, -54, 0.67, 0.8],
    ['Rope_1', -246, -27, 0.4, 0.2],
    ['Rock_Medium_2', -282, -42, 1.4, 1.1],
    ['Anvil_Log', -164, -128, 1.0, -0.3],
    ['Chest_Wood', -256, -137, 0.82, 0.6],
    ['Mushroom_Common', -274, -112, 0.38, 0.4],
    ['Mushroom_Common', -269, -118, 0.3, 1.2],
    ['DeadTree_2', -278, -153, 4.9, 0.8],
    ['Pine_2', -293, -121, 7.0, 0.5],
  ]) libraryPlace(R, key, x, z, height, yaw);
  { const sg = townSign('QUARRY', '#5a4a3a'); sg.position.set(-235, gy(-235, -58) + 2.7, -58); sg.rotation.y = Math.PI / 2; R.add(sg); }
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
  { const w = mk(R, new THREE.CircleGeometry(1, 48), lmat({ color: '#315967', roughness: 0.75, metalness: 0 }), L.x, 0.06, L.z, false); w.rotation.x = -Math.PI / 2; w.scale.set(L.rx, L.rz, 1); TOWN.lake = w; }
  { const s = mk(R, new THREE.CircleGeometry(1, 64), lmat({ map: venueTex('path'), alphaMap: realmEdgeMask('shore'), transparent: true, depthWrite: false, color: '#ac9b7b', roughness: 1 }), L.x, 0.035, L.z, false); s.rotation.x = -Math.PI / 2; s.scale.set(L.rx + 12, L.rz + 14, 1); }
  realmGround(R, 128, 168, 52, 104, '#e0d0a9', 'path', 0.035);
  arenaList(R, ARENAS[3], { floor: '#e8d7ad', floorTex: 'path', bench: '#a08a6a', post: '#8a7a6a', rail: '#b0a080', signCol: '#1f4a6b' });
  for (let i = 0; i < 6; i++) add('nt_log', ARENAS[3].x - 15 + i * 6, ARENAS[3].z - 21, 0.1 * i, 1.2, 0.6);
  // jetties and the boathouse on the west shore
  const jetty = (x, z, n, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; R.add(g);
    const plank = tmat('#382a1d'), post = tmat('#271f17');
    for (let i = 0; i < n * 4; i++) {
      const p = mk(g, geo('lake_dock_plank', () => new THREE.BoxGeometry(2.7, 0.14, 0.68)), i % 6 ? plank : post, 0, 0.3, i * 0.75);
      p.castShadow = SHADOWS;
    }
    for (let i = 0; i <= n * 3; i += 3) for (const sx of [-1.18, 1.18]) {
      mk(g, geo('lake_dock_post', () => new THREE.BoxGeometry(0.17, 1.5, 0.17)), post, sx, -0.26, i);
    }
  };
  jetty(168, 20, 6, Math.PI / 2); jetty(172, 70, 5, Math.PI / 2 - 0.3);
  realmHall(R, 156, 6, 9, 7, 3.6, Math.PI / 2, { sign: 'BOATHOUSE', signCol: '#1f4a6b', roof: '#3a4a5a' });
  // Boats give the working shore a purpose; keep the landing ends of both
  // jetties open so players can still walk and see the water.
  libraryPlace(R, 'Dock_Boat_A_1', 182, 13, 1.1, -0.2);
  libraryPlace(R, 'Dock_Boat_B_2', 191, 65, 1.15, 0.5);
  libraryPlace(R, 'Dock_Boat_A_2', 165, -2, 0.95, 1.1);
  for (const [key, x, z, height, yaw] of [
    ['Rope_1', 163, 10, 0.42, 0.3],
    ['Bucket_Wooden_1', 162, 4, 0.68, 0.8],
    ['Bench', 142, 39, 0.9, Math.PI / 2],
    ['Plant_1', 135, 48, 0.8, 1.3],
    ['Rock_Medium_2', 133, 20, 1.2, 0.2],
    ['Flower_3_Group', 141, 103, 0.48, 0.6],
  ]) libraryPlace(R, key, x, z, height, yaw);
  for (const [x, z] of [[184, 22], [188, 70]]) add('rt_barrels', x, z, 0, 3, 0);
  // reeds and lily pads round the edge
  { const reeds = []; const N = IS_TOUCH ? 30 : 60; for (let i = 0; i < N; i++) { const a = i / N * TAU, x = L.x + Math.cos(a) * (L.rx + 1.5), z = L.z + Math.sin(a) * (L.rz + 1.5); if (x < 176 && Math.abs(z - 45) < 35) continue; reeds.push([x, z]); } realmReeds(R, reeds); }
  for (let i = 0; i < 14; i++) add('nt_lilypad', L.x - 30 + Math.cos(i * 2.1) * 18, L.z + Math.sin(i * 1.7) * 40, i, 1.6, 0);
  // the cliffs on the far (east) shore, where crystal and silver show in the rock
  for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3, x = L.x + Math.cos(a) * (L.rx + 22), z = L.z + Math.sin(a) * (L.rz + 18); add(i % 2 ? 'fy_rock_big_1' : 'fy_rock_big_3', x, z, a, 1.5 + (i % 3) * 0.2, 3.4); }
  // a few people enjoying the shore
  for (const [k, x, z, ry] of [['po_female_sitting', 160, 40, 1.4], ['po_male_sitting', 162, 44, 1.8], ['po_male_standing_hips', 176, 72, 1.2], ['po_female_standing_coveringeyes', 140, 96, 0.4]]) add(k, x, z, ry, 1, 0.4);
  // Water collision follows the visible shore (lakeBlocked/lakePush), rather
  // than overlapping circles that also blocked the beach seats and wreck.
}
function lakeBlocked(x, z, r) {
  return Math.hypot((x - LAKE.x) / (LAKE.rx + r), (z - LAKE.z) / (LAKE.rz + r)) < 1;
}
function lakePush(P, r) {
  const dx = P.x - LAKE.x, dz = P.z - LAKE.z;
  const d = Math.hypot(dx / (LAKE.rx + r), dz / (LAKE.rz + r));
  if (d >= 1) return;
  if (d < 1e-6) { P.x = LAKE.x - LAKE.rx - r; P.z = LAKE.z; return; }
  P.x = LAKE.x + dx / d; P.z = LAKE.z + dz / d;
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
  for (const T of TOWN.terrainOuter || []) T.m.visible = Math.hypot(T.x - cam.x, T.z - cam.z) < far + 160;
  // the Great Hall's roof lifts away while you're inside
  if (TOWN.hallRoof && TOWN.pos) TOWN.hallRoof.visible = !(TOWN.pos.x > HALL.x0 && TOWN.pos.x < HALL.x1 && TOWN.pos.z > HALL.z0 && TOWN.pos.z < HALL.z1 + 1);
}
// ---- where you are: a banner when you walk into a new district
function realmDistrictTick() {
  if (!TOWN.pos) return;
  const D = districtAt(TOWN.pos.x, TOWN.pos.z);
  if (D.key !== TOWN.district) { const first = TOWN.district == null; TOWN.district = D.key; if (typeof questEvent === 'function') questEvent('visit', { district: D.key }); if (!first) { const el = $('#townArea'); if (el) { el.innerHTML = ''; el.append(h('small', null, 'Now entering'), h('b', null, D.name)); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); } } }
}
// ---- gates: shut unless you hold the writ
function gateOpen(key) { return realmHasWrit(key); }
function realmHasWrit(key) { const w = (CAREER.writs = CAREER.writs || {}); return !!w[key]; }
function realmGateCollide(P, r) {
  for (const G of TOWN.gates || []) {
    const open = gateOpen(G.key); if (G.port) G.port.position.y += ((open ? 3.0 : 0) - G.port.position.y) * 0.1;
    if (open) continue;
    const dx = P.x - G.x, dz = P.z - G.z, d = Math.hypot(dx, dz), m = G.r + r;
    if (d < m) { if (d < 1e-4) { P.z = G.z + m; } else { P.x = G.x + dx / d * m; P.z = G.z + dz / d * m; } if (!TOWN.gateMsgT || window.performance.now() - TOWN.gateMsgT > 4000) { TOWN.gateMsgT = window.performance.now(); gateRefused(G); } }
  }
}
function gateRefused(G) {
  const T = REALM_TIERS[G.key];
  if (!T) { toastMenu(`${G.label}: closed`); return; }
  if (typeof BOS !== 'undefined' && BOS.testAdmin) testAdminApply();
  const level = CAREER.level || 1;
  toastMenu(level < T.level
    ? `${G.label}: level ${T.level} needed (you’re level ${level}), plus the ${T.name}.`
    : `${G.label}: level met (${level}). Earn the ${T.name} from the gatekeeper to enter.`);
}
// the castle, for the folk (gate guards stand outside the bailey gate) and the map
const CASTLE = { x0: BAILEY.x0, x1: BAILEY.x1, z0: BAILEY.z0, z1: BAILEY.z1, gate: 2.4 };
function gateBlocked(x, z, r) { for (const G of TOWN.gates || []) if (!gateOpen(G.key) && Math.hypot(x - G.x, z - G.z) < G.r + r) return true; return false; }
const REALM_TIERS = {
  bailey: { level: 15, need: 'Level 15 and the Bailey writ. Beat Sergeant Brask at the gate in a duel to earn it.', name: 'Bailey writ' },
  royal: { level: 40, need: 'Level 40 and the Royal writ. Beat the King’s Guard in the Castle arena to earn it.', name: 'Royal writ' }
};
