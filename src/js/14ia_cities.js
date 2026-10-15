// Four authored destinations. Streets, lots and planting are deliberate; no settlement uses random prop scatter.
const CITY_SITES = {
  ashmarket: { x: -510, z: -250, name: 'Ashmarket', colour: '#984f31' },
  stoneford: { x: 530, z: 140, name: 'Stoneford', colour: '#496f85' },
  southmere: { x: -90, z: 620, name: 'Southmere', colour: '#71884c' },
  northwatch: { x: 0, z: -690, name: 'Northwatch Fortress', colour: '#526574' }
};
const STONEFORD_RIVER = { x0: 607.5, x1: 642.5, z0: -70, z1: 350 };
function stonefordWaterBlocked(x, z, r = 0) {
  if(worldMapSurfaceAt(x,z)!=null)return false;
  const W = STONEFORD_RIVER;
  return x > W.x0 - r && x < W.x1 + r && z > W.z0 - r && z < W.z1 + r;
}
function stonefordWaterPush(P, r) {
  if (!stonefordWaterBlocked(P.x, P.z, r)) return;
  const W = STONEFORD_RIVER;
  P.x = Math.abs(P.x - W.x0) < Math.abs(P.x - W.x1) ? W.x0 - r : W.x1 + r;
}
ROADS.push(
  { name: 'ashmarket-road', pts: [[-333, 48], [-369, 9], [-401, -38], [-432, -91], [-467, -143], [-500, -194], [-510, -220], [-510, -250]], w: 6 },
  { name: 'stoneford-road', pts: [[340, 94], [392, 103], [440, 117], [490, 132], [530, 140]], w: 6 },
  { name: 'southmere-road', pts: [[-12, 392], [-27, 451], [-48, 505], [-69, 560], [-90, 620]], w: 6 },
  { name: 'northwatch-road', pts: [[27, -369], [29, -433], [22, -497], [12, -559], [0, -622], [0, -690]], w: 6 },
  { name: 'ashmarket-forge-street', pts: [[-510, -220], [-510, -250], [-510, -295]], w: 7 },
  { name: 'stoneford-armour-lane', pts: [[490, 140], [530, 140], [570, 140]], w: 7 },
  { name: 'southmere-stable-lane', pts: [[-90, 620], [-90, 570], [-90, 530]], w: 6 },
  { name: 'northwatch-yard', pts: [[0, -630], [0, -690], [0, -755]], w: 7 }
);
const CITY_VENDORS = [
  { key: 'asmith', as: 'smith', tier: 3, siteBuilding: true, name: 'Mara Flint', role: 'Ashmarket master weapon smith', col: '#80513b', awn: '#984f31', hi: 'Bring your steel to the foundry. I can balance and finish what the fairground cannot.', icon: '⚒️', at: [-520, -271], ry: Math.PI / 2 },
  { key: 'sarmour', as: 'armour', tier: 3, siteBuilding: true, name: 'Aldric Platewright', role: 'Stoneford master armourer', col: '#4c6473', awn: '#496f85', hi: 'A fitted harness is measured, tested and repaired at the bench.', icon: '🛡️', at: [523, 140], ry: Math.PI / 2 },
  { key: 'ntrainer', as: 'trainer', tier: 3, siteBuilding: true, name: 'Drillmaster Kael', role: 'Northwatch master trainer', col: '#536677', awn: '#526574', hi: 'Tuition earns instruction. Practice earns the strength to use it.', icon: '🏋️', at: [-16, -731], ry: Math.PI / 2 }
];
VENDORS.push(...CITY_VENDORS);
for (const V of CITY_VENDORS) {
  VENDOR_BY[V.key] = V; STALL_AT[V.key] = V.at; STALL_FACE[V.key] = V.ry;
  VENDOR_FIT[V.key] = V.key === 'sarmour' ? 'Male_Ranger' : V.key === 'asmith' ? 'Female_Peasant' : 'Male_Ranger';
}
STATIONS.push({ key: 'southmere:riding', name: 'Edda of Southmere', role: 'Riding school', icon: '🐴', at: [-97, 577], ry: Math.PI, district: 'southmere' });
for (const [arena, x, z, names, district] of [
  ['foundry', -572, -236, ['Foundry Marshal', 'Ashmarket Herald', 'Foundry Crier'], 'ashmarket'],
  ['bridge', 587, 185, ['Bridge Marshal', 'Stoneford Herald', 'Bridge Crier'], 'stoneford'],
  ['orchard', -22, 687, ['Orchard Marshal', 'Southmere Herald', 'Orchard Crier'], 'southmere'],
  ['northwatch', 58, -696, ['Yard Marshal', 'Northwatch Herald', 'Yard Crier'], 'northwatch']
]) ['marshal', 'giant', 'crier'].forEach((service, i) => STATIONS.push({
  key: `${arena}:${service}`, service, arena, name: names[i],
  role: ['Lists marshal', 'Tournament herald', 'Online crier'][i],
  icon: ['⚔️', '📜', '🔔'][i], at: [x + (i - 1) * 7, z], ry: Math.PI,
  col: CITY_SITES[district].colour, look: i, district
}));
function buildCityVendor(V) {
  const [x, z] = V.at, g = new THREE.Group(); g.position.set(x, gy(x, z), z); g.rotation.y = V.ry; TOWN.root.add(g);
  const npc = costumeOr({ main: V.col, joints: '#30353a', h: 1.76, anim: 'Idle_Loop' }, vendorOutfit(V));
  g.add(npc.root);
  const sign = townLabel(V.name, `${V.icon} ${V.role}`, V.awn); sign.position.set(0, 2.75, 0); g.add(sign);
  const S = { V, g, npc, ry: V.ry, x, z, ax: x, az: z, label: sign };
  TOWN.stalls.push(S); TOWN.obst.push({ x, z, r: 0.5 }); return S;
}
function openCityStation(key) {
  if (key.startsWith('quest:')) { openQuestJournal(); return true; }
  if (key !== 'southmere:riding') return false;
  townPanel('Southmere riding school', box => renderRidingSchool(box)); return true;
}
function cityPiece(R, key, x, z, ry = 0, s = 1, radius = 0) {
  const p = kpiece(R, key, x, gy(x, z), z, ry, s);
  if (p && radius) TOWN.obst.push({ x, z, r: radius });
  return p;
}
function cityHouse(R, x, z, w, d, ry, opt) {
  if (opt.model) {
    const built = cityPiece(R, opt.model, x, z, ry, opt.scale || 1, opt.radius || 4.3);
    if (built) return built;
  }
  return realmHall(R, x, z, w, d, opt.h || 5, ry, opt);
}
function citySign(R, text, x, z, ry, col) {
  const g = townSign(text, col); g.position.set(x, gy(x, z) + 2.8, z); g.rotation.y = ry; g.scale.setScalar(0.72); R.add(g);
}
function cityLamp(R, x, z) { cityPiece(R, 'ps_lamp', x, z, 0, 1, 0.3); }
function cityTree(R, key, x, z, scale = 1) { cityPiece(R, key, x, z, 0, scale, 1); }
function cityPennant(R, x, z, colour) {
  const y = gy(x, z), pole = tmat('#4a4039');
  mk(R, new THREE.CylinderGeometry(0.09, 0.11, 5.2, 6), pole, x, y + 2.6, z);
  const flag = mk(R, new THREE.PlaneGeometry(1.8, 2.1), lmat({ color: colour, roughness: 1, side: THREE.DoubleSide }), x + 0.9, y + 4, z, false);
  flag.rotation.y = 0.22;
}
function cityPaving(R, x, z, w, d, colour) {
  if (!TMAT.cityPavingTexture) {
    const canvas = cvs(256, 256), ctx = canvas.getContext('2d');
    ctx.fillStyle = '#696864'; ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const shade = 72 + (row * 13 + col * 17) % 22;
      ctx.fillStyle = `rgb(${shade},${shade - 2},${shade - 7})`;
      ctx.fillRect(col * 32 + (row % 2) * 16 + 1, row * 32 + 1, 30, 30);
    }
    const tex = new THREE.CanvasTexture(canvas); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace; TMAT.cityPavingTexture = tex;
  }
  const tex = TMAT.cityPavingTexture.clone(); tex.repeat.set(w / 16, d / 16); tex.needsUpdate = true;
  const g = mk(R, new THREE.PlaneGeometry(w, d), lmat({ map: tex, color: colour, roughness: 1, side: THREE.DoubleSide }), x, gy(x, z) + 0.09, z, false);
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true;
}
function buildExpandedCities(R) {
  // Preserve the authored blocks, then flatten their translated objects so
  // realmCells indexes every building at its final world position.
  for (const [build, dx, dz] of [[buildAshmarket, 330, 0], [buildStoneford, -360, 0], [buildSouthmere, 0, -280], [buildNorthwatch, 0, 340]]) {
    const local = new THREE.Group(), firstObstacle = TOWN.obst.length;
    build(local);
    for (const child of [...local.children]) { child.position.x += dx; child.position.z += dz; R.add(child); }
    for (let i = firstObstacle; i < TOWN.obst.length; i++) { TOWN.obst[i].x += dx; TOWN.obst[i].z += dz; }
  }
  for (const [key, look] of [
    ['foundry', { floor: '#725f52', floorTex: 'dirt', bench: '#65473a', signCol: '#984f31' }],
    ['bridge', { floor: '#a6a19a', floorTex: 'cobble', bench: '#6a6b69', signCol: '#496f85' }],
    ['orchard', { floor: '#9eaf70', floorTex: 'forest', bench: '#8b784d', signCol: '#71884c' }],
    ['northwatch', { floor: '#91928c', floorTex: 'dirt', bench: '#4e5861', signCol: '#526574' }]
  ]) arenaList(R, ARENAS.find(a => a.key === key), look);
  // Plant the approaches as belts. Settled blocks stay under the explicit city layouts below.
  for (const [x, z, r, seed] of [[-415, -95, 50, 'ashroad'], [420, 175, 55, 'riverroad'], [-115, 510, 50, 'southroad'], [115, -555, 55, 'northroad']])
    realmForest(R, x, z, r, IS_TOUCH ? 15 : 28, [['kf_tree_1_a', 1.1, 1], ['kf_tree_2_b', 1.1, 1], ['kf_bush_3_a', 1.2, 0.5]], seed);
}
function buildAshmarket(R) {
  const x = -840, z = -250;
  realmGround(R, -893, -795, -308, -203, '#9a806d', 'cobble');
  cityPaving(R, -840, -256, 13, 108, '#897465');
  // Facing rows create a narrow workers' street; the central square is kept open.
  for (const zz of [-214, -230, -298]) {
    cityHouse(R, -858, zz, 10, 7, Math.PI / 2, { model: zz === -230 ? 'fy_vil_house_2' : 'fy_vil_house_1', roof: '#5f4034', plaster: '#9c856e' });
    cityHouse(R, -822, zz, 10, 7, -Math.PI / 2, { model: 'fy_vil_house_2', roof: '#4f3d38', plaster: '#9b806b' });
  }
  cityHouse(R, -861, -271, 15, 10, Math.PI / 2, { roof: '#6a3d30', stone: '#776d66', allStone: true, sign: 'MASTER WEAPON FORGE', signCol: '#984f31' });
  cityHouse(R, -818, -270, 12, 9, -Math.PI / 2, { roof: '#704536', plaster: '#9d846e', sign: 'WORKERS HALL' });
  cityHouse(R, -861, -322, 13, 9, Math.PI / 2, { model: 'fy_vil_house_2', roof: '#684536' });
  cityHouse(R, -820, -321, 12, 8, -Math.PI / 2, { model: 'fy_vil_house_2', roof: '#684536' });
  for (const zz of [-211, -242, -306, -329]) for (const xx of [-879, -803]) cityPiece(R, 'rt_pulley_crate', xx, zz, 0, 0.85, 0.5);
  for (const zz of [-220, -292, -334]) { cityTree(R, 'kf_tree_2_b', -887, zz, 0.85); cityTree(R, 'kf_tree_2_b', -794, zz, 0.85); }
  for (const zz of [-243, -313]) { cityTree(R, 'kf_tree_2_b', -853, zz, 1.25); cityTree(R, 'kf_tree_2_b', -827, zz, 1.25); }
  for (const zz of [-212, -302]) { cityPennant(R, -850, zz, '#8c3b28'); cityPennant(R, -830, zz, '#b97138'); }
  cityPiece(R, 'bf_furnace', -873, -282, 0, 1.5, 1.5);
  for (const [xx, zz] of [[-876, -286], [-870, -288]]) {
    const stack = mk(R, new THREE.CylinderGeometry(0.8, 1.05, 11, 8), tmat('#584c47'), xx, gy(xx, zz) + 5.5, zz);
    stack.castShadow = true;
  }
  for (const [xx, zz] of [[-871, -283], [-868, -285], [-865, -283]]) cityPiece(R, 'bf_anvil', xx, zz, 0, 1, 0.5);
  for (const [xx, zz] of [[-879, -247], [-877, -250], [-875, -253]]) cityPiece(R, 'rt_pulley_crate', xx, zz, 0, 0.9, 0.5);
  for (const [xx, zz] of [[-814, -242], [-814, -259], [-814, -277]]) cityLamp(R, xx, zz);
  citySign(R, 'ASHMARKET · WEAPON FORGES', -864, -197, 0, '#984f31');
}
function buildStoneford(R) {
  realmGround(R, 830, 955, 103, 198, '#a6a7a2', 'cobble');
  cityPaving(R, 890, 140, 13, 100, '#797c7a');
  // Armour lane faces the market street. Docks follow the water-facing eastern edge.
  for (const [xx, zz, ry] of [[870, 115, Math.PI / 2], [870, 165, Math.PI / 2], [910, 115, -Math.PI / 2], [910, 170, -Math.PI / 2]])
    cityHouse(R, xx, zz, 12, 8, ry, { model: zz < 130 ? 'fy_vil_house_1' : 'fy_vil_house_2', roof: '#714d45', allStone: zz < 130 });
  cityHouse(R, 871, 140, 17, 10, Math.PI / 2, { roof: '#536779', stone: '#657581', allStone: true, sign: 'MASTER ARMOURY', signCol: '#496f85' });
  cityHouse(R, 912, 139, 15, 10, -Math.PI / 2, { roof: '#694d42', sign: 'RIVER MARKET' });
  for (const zz of [88, 191]) {
    cityHouse(R, 870, zz, 11, 8, Math.PI / 2, { model: 'fy_vil_house_1' });
    cityHouse(R, 910, zz, 11, 8, -Math.PI / 2, { model: 'fy_vil_house_2' });
  }
  for (const zz of [93, 188]) for (const xx of [847, 930]) cityTree(R, 'kf_tree_2_b', xx, zz, 0.8);
  for (const zz of [100, 180]) { cityTree(R, 'kf_tree_2_b', 878, zz, 1.25); cityTree(R, 'kf_tree_2_b', 902, zz, 1.25); }
  for (const zz of [105, 174]) { cityPennant(R, 883, zz, '#355c72'); cityPennant(R, 897, zz, '#718fa0'); }
  for (const [xx, zz] of [[869, 131], [869, 151]]) cityPiece(R, 'bf_armor_rack', xx, zz, Math.PI / 2, 1, 0.7);
  for (const [xx, zz] of [[962, 108], [962, 123], [962, 138]]) cityPiece(R, 'rt_dock_side', xx, zz, Math.PI / 2, 1.1, 1);
  // Leave a dry strip outside Bridge Lists' rope and the spectator approach.
  const water = mk(R, new THREE.PlaneGeometry(35, 420), lmat({ color: '#486e79', roughness: 0.3, metalness: 0.08, transparent: true, opacity: 0.88, side: THREE.DoubleSide }), 985, gy(985, 140) + 0.07, 140, false);
  water.rotation.x = -Math.PI / 2; water.receiveShadow = true;
  cityPiece(R, 'ck_bridge_straight', 973, 140, Math.PI / 2, 1, 2);
  for (const [xx, zz] of [[934, 110], [938, 128]]) cityPiece(R, 'rt_pulley_crate', xx, zz, 0, 1, 0.6);
  for (const zz of [110, 140, 174]) cityLamp(R, 900, zz);
  // Citadel: four walls around a court, with an ungated entrance toward the market.
  castleRun(R, 846, 55, 878, 55); castleRun(R, 902, 55, 935, 55);
  castleRun(R, 846, 12, 935, 12); castleRun(R, 846, 12, 846, 55); castleRun(R, 935, 12, 935, 55);
  for (const [xx, zz] of [[846, 12], [935, 12], [846, 55], [935, 55]]) castleTower(R, xx, zz, 1, '#496f85');
  cityHouse(R, 890, 30, 22, 13, 0, { h: 8, allStone: true, roof: '#4b5e70', sign: 'STONEFORD CITADEL' });
  citySign(R, 'STONEFORD · MASTER ARMOURERS', 865, 204, 0, '#496f85');
}
function buildSouthmere(R) {
  realmGround(R, -155, -12, 835, 990, '#b8ab83', 'path');
  cityPaving(R, -90, 907, 12, 134, '#8f8466');
  for (const [xx, zz, ry] of [[-110, 885, Math.PI / 2], [-110, 915, Math.PI / 2], [-70, 885, -Math.PI / 2], [-70, 915, -Math.PI / 2]])
    cityHouse(R, xx, zz, 12, 8, ry, { model: zz === 885 ? 'fy_vil_house_1' : 'fy_vil_house_2', roof: '#a87448', plaster: '#d5c7a7' });
  cityHouse(R, -112, 857, 18, 10, Math.PI / 2, { roof: '#8b704d', sign: 'RIDING SCHOOL', signCol: '#71884c' });
  for (const zz of [942, 966]) {
    cityHouse(R, -110, zz, 11, 8, Math.PI / 2, { model: 'fy_vil_house_1', roof: '#9a754d' });
    cityHouse(R, -70, zz, 11, 8, -Math.PI / 2, { model: 'fy_vil_house_2', roof: '#9a754d' });
  }
  cityPiece(R, 'fb_barn', -57, 837, Math.PI / 2, 1, 4);
  cityPiece(R, 'fb_smallbarn', -133, 824, 0, 1, 3);
  // Paddocks form contiguous rectangles, leaving a wide mounting and practice lane.
  for (const xx of [-147, -125, -45, -23]) for (const zz of [812, 823, 834]) cityPiece(R, 'fb_fence', xx, zz, 0, 1, 0.4);
  for (const zz of [812, 834]) for (const xx of [-147, -136, -125, -45, -34, -23]) cityPiece(R, 'fb_fence', xx, zz, Math.PI / 2, 1, 0.4);
  for (const [xx, zz] of [[-144, 948], [-134, 958], [-120, 965], [-58, 965], [-45, 976], [-119, 988], [-60, 990]]) cityTree(R, 'kf_tree_1_a', xx, zz, 1.15);
  for (const zz of [928, 952, 982]) { cityTree(R, 'kf_tree_1_a', -103, zz, 1.4); cityTree(R, 'kf_tree_1_a', -77, zz, 1.4); }
  for (const xx of [-165, -153, -141, -129]) for (const zz of [1008, 1023, 1038]) cityTree(R, 'kf_tree_1_a', xx, zz, 1.0);
  for (const [xx, zz] of [[-107, 888], [-75, 888], [-107, 932], [-75, 932]]) cityLamp(R, xx, zz);
  citySign(R, 'SOUTHMERE · STABLES & RIDING', -114, 1006, 0, '#71884c');
}
function buildNorthwatch(R) {
  realmGround(R, -75, 98, -1108, -959, '#919694', 'cobble');
  cityPaving(R, 0, -1033, 13, 142, '#737a7d');
  // Two walls and tower pairs define a real gate and a protected drill court.
  castleRun(R, -75, -1108, 98, -1108); castleRun(R, -75, -959, -9, -959); castleRun(R, 9, -959, 98, -959);
  castleRun(R, -75, -1108, -75, -959); castleRun(R, 98, -1108, 98, -959);
  cityPiece(R, 'cs_gate_2x4_doorway', 0, -959, Math.PI / 2, 1.5, 0);
  for (const [xx, zz] of [[-75, -1108], [98, -1108], [-75, -959], [98, -959]]) castleTower(R, xx, zz, 1, '#526574');
  cityHouse(R, -29, -1071, 18, 10, Math.PI / 2, { h: 7, roof: '#465462', stone: '#5e6871', allStone: true, sign: 'MASTER TRAINER', signCol: '#526574' });
  cityHouse(R, -29, -1005, 20, 10, Math.PI / 2, { h: 7, roof: '#465462', stone: '#5e6871', allStone: true, sign: 'BARRACKS' });
  cityHouse(R, 40, -986, 21, 10, -Math.PI / 2, { h: 8, roof: '#465462', stone: '#5e6871', allStone: true, sign: 'COMMAND HALL' });
  for (const zz of [-1044, -1016]) {
    cityHouse(R, -33, zz, 13, 8, Math.PI / 2, { model: 'fy_vil_house_1', roof: '#4d5a62' });
    cityHouse(R, 35, zz, 14, 8, -Math.PI / 2, { model: 'fy_vil_house_2', roof: '#4d5a62' });
  }
  for (const zz of [-1091, -1060, -1026, -989]) for (const xx of [-58, 79]) cityPiece(R, 'bf_weapon_rack', xx, zz, Math.PI / 2, 0.85, 0.5);
  for (const zz of [-1087, -1044, -1001]) { cityPennant(R, -11, zz, '#385469'); cityPennant(R, 13, zz, '#627b89'); }
  for (const [xx, zz] of [[-22, -1072], [-22, -1064], [-22, -1056]]) cityPiece(R, 'mk_Dummy', xx, zz, 0, 1, 0.5);
  for (const zz of [-1035, -1015, -995]) cityPiece(R, 'bf_weapon_rack', -16, zz, Math.PI / 2, 1, 0.5);
  for (const zz of [-989, -1030, -1086]) for (const xx of [-6, 13]) cityLamp(R, xx, zz);
  citySign(R, 'NORTHWATCH · FIGHTER TRAINING', -25, -949, 0, '#526574');
  for (const xx of [-113, -99, 116, 130]) for (const zz of [-987, -1012, -1040, -1072]) cityTree(R, 'kf_tree_2_b', xx, zz, 1.15);
}
