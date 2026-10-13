// ---------- the festival plan: a medieval tournament fair around the lists ----------
//  North      the castle: curtain walls, four corner towers, a gatehouse you can walk through, a keep in the courtyard
//  North-west training grounds (pells, the trainer) and the watchtower; the wizard's tent
//  North-east the Halloween graveyard (it's October) with Sir Reginald the "ghost"
//  West       craftsmen's row: the blacksmith's forge yard, the armourer, the guild and its pillory
//  East       food and fun: the tavern and campfire, the bard's stage and dance floor, food stalls, the archery range
//  South      the festival gate and main street: shops, the fountain, the statue plaza
//  South-west homes and the farm: your house, cottages, the windmill, the cornfield, the pumpkin patch, a pond
//  South-east the visiting clubs' camp
// Everything that blocks you goes into TOWN.obst (circles); flora is scattered only outside the planned areas.
const FEST_RESERVED = [ // [x0, x1, z0, z1] kept clear of random trees and rocks
  [-18, 18, 22, 72], [-31, 31, -108, -57], [-7, 7, -64, -22], [-53, -26, -13, 33], [23, 53, -12, 32], [27, 64, 38, 74],
  [-72, -44, -76, -35], [-70, -42, 65, 86],
  [33, 58, -68, -42], [-51, -27, -42, -18], [-52, -32, 44, 64], [-75, -54, 34, 70], [55, 72, 0, 20], [52, 80, -40, -2], [-33, -18, 26, 48], [-30, -18, -52, -40], [-86, -52, -60, -12]
];
function festReserved(x, z, pad = 0) { return FEST_RESERVED.some(([a, b, c, d]) => x > a - pad && x < b + pad && z > c - pad && z < d + pad); }
function buildFestival(R) {
  const O = TOWN.obst, add = (key, x, z, ry, s, r) => { const p = kpiece(R, key, x, gy(x, z), z, ry || 0, s || 1); if (r) O.push({ x, z, r }); return p; };
  const line = (x0, z0, x1, z1, r, gap) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / (r * 1.4))); for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (gap && gap(x, z)) continue; O.push({ x, z, r }); } };
  TOWN.mapRects = [];
  const ground = (x0, x1, z0, z1, col, tex) => {
    TOWN.mapRects.push([x0, x1, z0, z1, col]);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.ceil((x1 - x0) / 2), Math.ceil((z1 - z0) / 2));
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, gy(cx + pos.getX(i), cz + pos.getZ(i)) + 0.025);
    pos.needsUpdate = true; geo.computeVertexNormals();
    const g = mk(R, geo, lmat({ map: tex === false ? null : venueTex(tex || 'path'), alphaMap: realmEdgeMask('patch'), transparent: true, depthWrite: false, color: col, roughness: 1, side: THREE.DoubleSide }), cx, 0, cz, false);
    g.receiveShadow = true; return g;
  };
  const sign = (text, col, x, y, z, ry, s) => { const sg = townSign(text, col); sg.position.set(x, y, z); sg.rotation.y = ry || 0; if (s) sg.scale.setScalar(s); R.add(sg); return sg; };
  const flame = (x, y, z, s, col) => { const f = mk(R, geo('fest_flame', () => new THREE.ConeGeometry(0.12, 0.34, 8)), tmat(col || '#ffb02e', { emissive: col === '#7dffb0' ? '#00c46a' : '#ff6a00', emissiveIntensity: 1.7 }), x, y, z); f.scale.setScalar(s || 1); WORLD.flick.push(f); return f; };
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  // ---- the world heightfield replaces the old featureless grass plane
  buildRealmTerrain(R);
  // ---- paths and squares
  ground(-17, -5, 37, 52, '#d2bea0'); ground(-4.5, 4.5, -66, -24, '#cbbb9f'); ground(-52, -28, -12, 31, '#c5b192'); ground(25, 51, -10, 30, '#c8b79a');
  ground(-50, -28, -40, -20, '#bea989'); ground(29, 61, 40, 72, '#c2b193');
  // Downloaded CC0 details fill the crafts, food, training, and woodland edges.
  const librarySolid = { Anvil: 0.45, WeaponStand: 0.55, Barrel_Apples: 0.5, Crate_Wooden: 0.45,
    Stall_Empty: 1.4, Stall_Cart_Empty: 1.2, Barrel: 0.5,
    Workbench: 0.8, Dummy: 0.4, Table_Large: 1.2, Bookcase_2: 0.65,
    CommonTree_1: 1.1, Pine_1: 1.1, Rock_Medium_1: 0.7,
    Bench: 0.85, Cauldron: 0.7, Chest_Wood: 0.6,
    CommonTree_2: 1.1, Pine_2: 1.1, Rock_Medium_2: 0.7 };
  const libraryFootprint = { Stall_Empty: [1.35, 0.85], Stall_Cart_Empty: [1.15, 0.75],
    Workbench: [0.85, 0.42], Table_Large: [1.1, 0.58], Bench: [0.8, 0.32],
    WeaponStand: [0.55, 0.35], Chest_Wood: [0.55, 0.4] };
  for (const [key, x, z, height, yaw] of [
    ['Anvil', -51, 27.5, 0.9, 0], ['WeaponStand', -48.5, 16.5, 1.4, 0.6],
    ['Barrel_Apples', 41, 24, 0.95, 0], ['FarmCrate_Carrot', 45, 47, 0.65, 0.3],
    ['Crate_Wooden', -47, 7, 0.75, 0.2], ['Bag', -16, 54, 0.55, 0],
    ['Bush_Common_Flowers', 76, 34, 1.1, 0], ['Fern_1', -77, -6, 0.8, 0.4],
    ['CommonTree_1', 80, -27, 6.5, 0.7], ['Pine_1', -81, -33, 7.2, 0.4],
    ['Workbench', -49, 29, 1.1, 0.3], ['Shield_Wooden', -48, 18, 0.8, 0.2],
    ['Dummy', -63, -65, 1.7, 0], ['Table_Large', 48, 20, 1.1, 0.4],
    ['Chair_1', 50, 18, 0.9, 0.6],
    ['Bush_Common', -82, 28, 1.2, 0.3], ['Grass_Common_Short', 73, -19, 0.5, 0],
    ['Rock_Medium_1', -79, 15, 1.3, 0.5],
    ['Stall_Empty', -20, 58, 2.4, 0.2], ['Stall_Cart_Empty', 20, 59, 2.2, -0.2],
    ['FarmCrate_Apple', -18, 53, 0.7, 0], ['Barrel', 18, 53, 0.95, 0],
    // The newer models form small, readable scenes at the edges of each yard.
    ['Bucket_Wooden_1', -51.5, 23.5, 0.65, 0.4],
    ['Anvil_Log', -53.5, 17.5, 1.0, -0.3],
    ['Barrel_Holder', -51.5, 10, 1.0, 0.7],
    ['Chest_Wood', -47.5, -32.5, 0.85, 0.5],
    ['Bench', -38.5, -28, 0.85, Math.PI / 2],
    ['Cauldron', -34.5, -43, 0.85, 0.2],
    ['Mug', 34, 18.6, 0.33, 0.2],
    ['Bucket_Wooden_1', 64, -24, 0.68, 0.2],
    ['Rope_1', 60, -17.5, 0.4, 0.6],
    ['Bench', 51, 58, 0.9, 0.6],
    ['Chest_Wood', 54, 54, 0.8, 0.2],
    ['Flower_3_Group', -82, 44, 0.45, 0.2],
    ['Flower_3_Group', -80, 47, 0.5, 1.1],
    ['Grass_Wispy_Short', -76, 69, 0.65, 0.4],
    ['Rock_Medium_2', -67, 80, 1.25, 0.7],
    ['CommonTree_2', -87, 61, 6.5, 0.4],
    ['Pine_2', 88, -40, 7.5, -0.2],
  ]) { libraryPlace(R, key, x, z, height, yaw);
    if (libraryFootprint[key]) gameplayShape(x, z, ...libraryFootprint[key], yaw, height);
    else if (librarySolid[key]) O.push({ x, z, r: librarySolid[key] }); }
  // ---- the festival gate at the south end of main street
  for (const sx of [-7, 7]) { add('cs_tower_mid', sx, 69, 0, 0.9, 2.6); const t = add('cs_tower_top_1', sx, 69, 0, 0.9, 0); if (t) t.position.y = 3.6; const b = add(sx < 0 ? 'bannerRed' : 'bannerGreen', sx, 66.6, 0, 2.6, 0); if (b) b.position.y = 0.4; }
  for (const sx of [-4.6, 4.6]) mk(R, geo('fest_gpole', () => new THREE.CylinderGeometry(0.1, 0.12, 6.4, 8)), tmat('#4a3422'), sx, 3.2, 68.6);
  sign('BUHURT FESTIVAL', '#6d1b28', 0, 5.7, 68.6, 0, 3.2);
  // ---- main street: a clear processional route; furnishings belong to its side plaza and stalls
  for (const z of [30, 42, 54, 66]) for (const sx of [-16.6, 16.6]) add('ps_lamp', sx, z, 0, 1, 0.3);
  // Keep the fountain in the side square, clear of the herald's awning.
  add('fountainRoundDetail', -19, 48, 0, 2.3, 2.4);
  for (const [x, z, k] of [[-3.4, 24.4, 'bannerRed'], [3.4, 24.4, 'bannerGreen'], [-5, 66, 'bannerGreen'], [5, 66, 'bannerRed']]) add(k, x, z, 0, 2.2, 0.35);
  add('cartHigh', -15, 64.5, 0.5, 2, 1.4); add('cart', 14.5, 63.5, -0.4, 2, 1.3);
  for (const [x, z] of [[-14, 38], [-15, 49], [-14, 26.5], [14, 26.5]]) add('pumpkinCarved', x, z, face(x, z, -19, 48), 1.4);
  add('slv_crate', -14.6, 39.6, 0.3, 1.2, 0.6); add('slv_veg', -14.4, 41.4, 0.2, 1.2, 0.5); add('fy_vil_barrel', -14.8, 49.6, 0, 1, 0.5);
  // ---- craftsmen's row (west): the forge yard behind the blacksmith, racks at the armourer, the guild's pillory and gold
  add('bf_furnace', -45, 24.6, Math.PI / 2, 1, 1.8); const glow = mk(R, geo('w_forgeglow', () => new THREE.BoxGeometry(0.7, 0.35, 0.05)), tmat('#ff7a1a', { emissive: '#ff4a00', emissiveIntensity: 1.8 }), -43.7, 0.75, 24.6); glow.rotation.y = Math.PI / 2; WORLD.flick.push(glow);
  add('bf_anvil', -42, 18.6, 0.2, 1, 0.5); add('bf_armor_rack', -45, 18.2, Math.PI / 2, 1, 0.6); add('bf_weapon_rack', -47, 21.4, Math.PI / 2, 1, 0.8); add('bf_barrel', -46.4, 27.6, 0, 1, 0.5); add('bf_crate', -48, 25.4, 0.3, 1, 0.6);
  add('ps_anvil', -42.4, 27, 0.4, 1.4, 0.5); add('ps_sharpener', -40.6, 28.8, 1.1, 1, 0.8); add('slv_barrel', -40, 15.6, 0, 1.2, 0.5);
  add('dp_weapon_rack', -42.6, 11, Math.PI / 2, 1, 0.6); add('dp_shield', -42.4, 7.8, Math.PI / 2, 1, 0.4); add('bf_crate', -44, 13, 0.6, 0.8, 0.5);
  add('dp_stocks', -31.4, -8, 0.3, 1, 0.8); add('dp_x_stocks', -31.2, 4.6, -0.3, 1, 0.8); add('dp_treasure_chest', -41.8, 1.4, Math.PI / 2, 1, 0.6);
  for (const z of [-10, 2, 14, 26]) add('ps_lamp', -29, z, 0, 1, 0.3);
  // ---- training grounds (north-west): pells to practise on, a rack, the watchtower, the wizard's cauldron
  for (const [x, z] of [[-31, -26], [-31, -30.5], [-31, -35]]) { mk(R, geo('fest_pell', () => new THREE.CylinderGeometry(0.13, 0.15, 1.9, 8)), tmat('#8a6a42'), x, 0.95, z).castShadow = true; mk(R, geo('fest_pellb', () => new THREE.CylinderGeometry(0.2, 0.2, 0.12, 8)), tmat('#5a4430'), x, 0.06, z); O.push({ x, z, r: 0.35 }); }
  add('dp_weapon_rack', -44, -26.6, Math.PI / 2, 1, 0.6); add('dp_bench', -44, -33.4, Math.PI / 2, 1, 0.5); add('bf_armor_rack', -44, -36.6, Math.PI / 2, 1, 0.6);
  add('slv_tower', -60, -30, 0.3, 1, 4.6); add('slv_cauldron', -27.6, -43.6, 0, 2.2, 0.7); { const brew = mk(R, geo('w_brew', () => new THREE.SphereGeometry(0.32, 12, 8, 0, TAU, 0, Math.PI / 2)), tmat('#7cff6b', { emissive: '#1aa000', emissiveIntensity: 1.2 }), -27.6, 0.62, -43.6); brew.rotation.x = Math.PI; WORLD.flick.push(brew); }
  // The tutorial is a place you can enter on foot, beside the trainer rather than a disconnected menu scene.
  arenaList(R, TRAINING_GROUND, { floor: '#c6ad83', floorTex: 'path', post: '#70502d', rail: '#b88d53', signCol: '#a36b37', stands: false });
  for (const x of [-63, -58, -53]) {
    mk(R, geo('training_pell', () => new THREE.CylinderGeometry(0.16, 0.2, 2.2, 8)), tmat('#8a6a42'), x, 1.1, -59);
    add('mk_Dummy', x, -66, 0, 0.9, 0.45);
    O.push({ x, z: -59, r: 0.3 });
  }
  // Collide with the rails but leave a clear four-metre entrance on the south side.
  for (let z = -71; z <= -41; z += 2.5) for (const x of [-68, -48]) O.push({ x, z, r: 0.3 });
  for (let x = -66; x <= -50; x += 2.5) O.push({ x, z: -71, r: 0.3 });
  for (let x = -66; x <= -50; x += 2.5) if (Math.abs(x + 58) > 2.5) O.push({ x, z: -41, r: 0.3 });
  // ---- the north road and the castle
  for (const z of [-30, -40, -50, -59]) for (const sx of [-5.6, 5.6]) add('ps_lamp', sx, z, face(sx, z, 0, z), 1, 0.3);
  // ---- food and fun (east): the tavern's campfire and long table, the bard's stage, food stalls, the archery range
  add('campfire_stones', 29, 25, 0, 2.2, 0.9); flame(29, 0.45, 25, 2.4);
  for (const a of [3.6, 2.6, 1.6]) { const x = 29 + Math.sin(a) * 2.6, z = 25 + Math.cos(a) * 2.6; add('stallStool', x, z, 0, 2, 0.3); }
  add('dp_table', 30.6, 15.6, 0.1, 1, 1); add('dp_bench', 30.6, 14.6, 0.1, 1, 0); add('dp_bench', 30.6, 16.6, 0.1, 1, 0);
  for (const [x, z] of [[30, 15.4], [31.2, 15.8]]) { const m = add('dp_ale_mug', x, z, 0, 1.4, 0); if (m) m.position.y = 0.72; } { const j = add('dp_jug', 30.6, 15.6, 0, 1.2, 0); if (j) j.position.y = 0.72; }
  add('ps_barrel', 40.6, 23.6, 0, 1.6, 0.5); add('ps_barrel', 41.4, 22.2, 1, 1.5, 0.5); add('fy_vil_beer_barrel', 41, 17, 0.6, 1, 0.7); add('fy_asia_brazier', 33.6, 27.6, 0, 1, 0.6);
  { const fl = mk(R, geo('fest_dance', () => new THREE.PlaneGeometry(6, 5)), tmat('#8a6a42'), 31, 0.03, 5, false); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; }
  for (const [x, z] of [[28.6, 9], [33.4, 9]]) add('ps_lamp', x, z, 0, 1, 0.3);
  const FOOD = [['PIES', '#7a4a12'], ['MEAD', '#2c4a8c'], ['SWEETS', '#8c1f4f'], ['ROAST', '#6b4e16']];
  FOOD.forEach(([t, c], i) => { const x = 28 + i * 6.2, z = -6.5; add('mk_Stall_Cart_Empty', x, z, 0, 1.15, 1.4); sign(t, c, x, gy(x, z) + 2.7, z + 1.25, 0, 0.8); });
  for (const [x, z] of [[62, 4], [64.5, 10], [67, 16]]) add('fy_vil_archery_target', x, z, -Math.PI / 2, 1, 0.6);
  add('fy_vil_hay_1', 56, 8, 0.3, 1, 0.7); add('fy_vil_hay_2', 56.6, 12.6, 1.1, 1, 0.6); sign('ARCHERY', '#23704a', 56.2, 1.6, 10.4, -Math.PI / 2, 0.8);
  // ---- the farm (east): barn, granary, hay, the well
  add('slv_shed', 68, -18, -Math.PI / 2, 0.9, 5); add('fy_vil_granary', 74, -2, -1.4, 1, 2); add('fy_vil_hay_1', 59, -24, 0.4, 1, 0.7); add('fy_vil_hay_2', 60.6, -25.8, 1.4, 1, 0.6);
  add('slv_wheel', 56, -8, 1.1, 1, 3); add('dp_bucket', 53.4, -6.6, 0, 1, 0.3); add('slv_logs', 72, -34, 0.15, 0.7, 0); O.push({ x: 72, z: -39, r: 2.5 }, { x: 72, z: -29, r: 2.5 });
  // ---- the Halloween graveyard (north-east)
  buildGraveyard(R, add);
  // ---- homes and farm (south-west): cottages, houses, the windmill, the cornfield, the pumpkin patch, the pond, the loo
  if (typeof cottage === 'function' && typeof VILLAGE_GEO !== 'undefined') for (const [x, z, s] of [[-27, 41, 1], [-27, 31, 0.9], [-58, 54, 1.1], [-62, 18, 1]]) { const c = cottage(R, x, z, face(x, z, 0, 30), 'fest' + x); c.scale.setScalar(s); O.push({ x, z, r: 3.6 * s }); }
  add('ps_house1', -58, 38, face(-58, 38, 0, 30), 1, 5); add('ps_house8', -30, 78, face(-30, 78, 0, 40), 1, 3.8); add('slv_penthouse', -76, 24, face(-76, 24, 0, 0), 0.9, 4.6); add('fy_vil_house_1', -74, -8, 0.7, 1, 4.2);
  add('slv_hovel', -64, 6, 0.8, 1.2, 1.6); add('slv_bale', -62.4, 8.6, 0.3, 2.2, 0.6); add('ps_trough', -65.4, 9.2, 1.2, 1, 0.8); add('slv_loo', -22, 72, face(-22, 72, 0, 40), 1, 1.8);
  { const tw = mk(R, geo('w_mill', () => new THREE.CylinderGeometry(1.4, 1.9, 7, 12)), tmat('#cdbfa6'), -68, 3.5, 44); tw.castShadow = true; mk(R, geo('w_millroof', () => new THREE.ConeGeometry(1.9, 2.4, 12)), tmat('#a4472a'), -68, 8.2, 44); const sails = kpiece(R, 'windmill', -68, 7.2, 45.9, Math.PI / 2, 2.6); if (sails) WORLD.spin.push(sails); O.push({ x: -68, z: 44, r: 2.1 }); }
  realmCropField(R, -71, -64, 57, 65, 5, 5, 'corn');
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) add(j % 2 ? 'crop_pumpkin' : 'pumpkin', -30 + i * 1.3, 58.5 + j * 1.5, (i * 7 + j) % 6, 1.6);
  buildFairPond(R);
  add('slv_chest', -35, 50, face(-35, 50, -42, 54), 1, 0.8);
  // ---- the visiting clubs' camp (south-east): tents, a fire, banners, racks
  for (const [x, z] of [[36, 47], [44, 51], [52, 55]]) add('ps_tent', x, z, face(x, z, 45, 60), 1.3, 1.9);
  for (const [x, z] of [[37, 62], [48, 67], [57, 62]]) add(x > 50 ? 'tent_detailedOpen' : 'tent_detailedClosed', x, z, face(x, z, 45, 60), 2.6, 2.2);
  add('campfire_stones', 45, 59, 0, 2, 0.8); flame(45, 0.45, 59, 2.2); add('dp_weapon_rack', 56, 48, -0.6, 1, 0.6); add('ps_trough', 59, 52, 0.4, 1, 0.8);
  for (const [x, z, k] of [[33, 54, 'bannerRed'], [41, 57, 'bannerGreen'], [53, 66, 'bannerRed'], [60, 58, 'bannerGreen']]) add(k, x, z, 0, 2.2, 0.35);
  add('ps_house2', 68, 40, face(68, 40, 0, 30), 1, 5.5); add('ps_house4', 64, 60, face(64, 60, 0, 30), 1, 5.5);
  // ---- the rest of the realm round the fairground
  buildRealm(R);
  // ---- the wooded perimeter stays beyond the inhabited plots, not in the walking lanes
  const rnd = seeded('festwoods');
  for (let i = 0; i < (IS_TOUCH ? 50 : 90); i++) { const a = i / (IS_TOUCH ? 50 : 90) * TAU + rnd() * 0.05, e = 1.04 + rnd() * 0.28; if (onRoad(Math.cos(a) * FAIR_RX * e * 1.12, Math.sin(a) * FAIR_RZ * e * 1.12, 5)) continue; add(['kf_tree_1_a', 'kf_tree_2_b', 'kf_tree_3_b', 'kf_tree_4_b'][i % 4], Math.cos(a) * FAIR_RX * e * 1.12, Math.sin(a) * FAIR_RZ * e * 1.12, rnd() * TAU, 1 + rnd() * 0.25, 0); }
  // ---- flora scattered where nothing is planned
  const kinds = [['kf_tree_1_a', 1.1, 1], ['kf_tree_2_b', 1, 1], ['kf_tree_3_b', 1, 1], ['kf_bush_3_a', 1.4, 0.6], ['kf_bush_4_a', 1.2, 0.6], ['kf_grass_1_a', 1.4, 0], ['kf_rock_1_e', 1, 0.7]];
  const fr = seeded('festflora'); let placed = 0;
  for (let tries = 0; tries < 2000 && placed < (IS_TOUCH ? 55 : 100); tries++) {
    const a = fr() * TAU, rr = 75 + fr() * 25, x = Math.cos(a) * rr, z = Math.sin(a) * rr * 1.06;
    if (Math.hypot(x / FAIR_RX, z / FAIR_RZ) > 1.02) continue;
    if (arenaBlocked(x, z, 3)) continue;
    if (festReserved(x, z, 1.5) || Math.hypot(x + 56, z - 72) < 22 || onRoad(x, z, 4)) continue;
    if (O.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 2.2)) continue;
    if (Object.values(STALL_AT).some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 6)) continue;
    const [k, s, r] = kinds[Math.floor(fr() * kinds.length)]; add(k, x, z, fr() * TAU, s * (0.85 + fr() * 0.3), r); placed++;
  }
  // The pond is a small destination; keep its immediate sightline free of
  // random canopy trees from the country scatter and the fairground ring.
  for (const o of R.children.slice()) {
    if (!/tree|birch|pine|oak/i.test(o.userData.assetKey || '') || Math.hypot(o.position.x + 56, o.position.z - 72) >= 16) continue;
    R.remove(o);
    const i = O.findIndex(c => Math.abs(c.x - o.position.x) < 0.01 && Math.abs(c.z - o.position.z) < 0.01);
    if (i >= 0) O.splice(i, 1);
  }
}
function buildFairPond(R) {
  const cx = -56, cz = 72;
  const oval = (rx, rz, lift, mat) => {
    const g = new THREE.CircleGeometry(1, 48); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getZ(i), a = Math.atan2(v, u), wobble = 1 + 0.065 * Math.sin(3 * a + 0.4) + 0.035 * Math.sin(7 * a - 0.8); const x = cx + u * rx * wobble, z = cz + v * rz * wobble; p.setXYZ(i, x, gy(x, z) + lift, z); }
    p.needsUpdate = true; g.computeVertexNormals();
    const m = mk(R, g, mat, 0, 0, 0, false); m.receiveShadow = true; return m;
  };
  oval(6.1, 4.1, 0.035, lmat({ color: '#594f3a', roughness: 1, side: THREE.DoubleSide }));
  oval(5.0, 3.05, 0.052, lmat({ color: '#294f56', roughness: 0.82, metalness: 0, side: THREE.DoubleSide }));
  const wood = tmat('#38291d'), edge = tmat('#281e18');
  for (let i = -8; i <= 8; i++) {
    const x = cx + i * 0.75;
    const plank = mk(R, geo('pond_plank', () => new THREE.BoxGeometry(0.72, 0.13, 2.35)), i % 4 ? wood : edge, x, gy(x, cz) + 0.24, cz);
    plank.castShadow = SHADOWS;
  }
  for (const sz of [-1, 1]) {
    for (const dx of [-5.7, -2.9, 0, 2.9, 5.7]) {
      const x = cx + dx, z = cz + sz * 1.17;
      mk(R, geo('pond_post', () => new THREE.BoxGeometry(0.13, 1.05, 0.13)), edge, x, gy(x, z) + 0.67, z);
    }
    const rail = mk(R, new THREE.BoxGeometry(12.1, 0.11, 0.12), wood, cx, gy(cx, cz + sz * 1.17) + 1.1, cz + sz * 1.17); rail.castShadow = SHADOWS;
  }
  realmReeds(R, Array.from({ length: 14 }, (_, i) => { const a = i / 14 * TAU; return [cx + Math.cos(a) * 5.3, cz + Math.sin(a) * 3.35]; }).filter(([x, z]) => Math.abs(z - cz) > 1.5));
  for (const [x, z] of [[-61.5, 68.7], [-51.4, 68.6], [-59.4, 76]]) kpiece(R, 'kf_rock_1_e', x, gy(x, z), z, x, 0.6);
}
// the graveyard: iron fence with a gate on the east side, stones, a crypt, tombs, candles, fire baskets, spooky decorations
const GRAVE = { x: 44, z: -56 };
function buildGraveyard(R, add) {
  const gx = GRAVE.x, gz = GRAVE.z, flame = (x, y, z, col) => { const f = mk(R, geo('w_fb', () => new THREE.ConeGeometry(0.22, 0.5, 8)), tmat(col, { emissive: col === '#7dffb0' ? '#00c46a' : '#ffa020', emissiveIntensity: 1.8 }), x, y, z); WORLD.flick.push(f); };
  const iron = tmat('#353b3d'), fence = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, gy(x, z), z); g.rotation.y = ry; R.add(g);
    for (const h of [0.42, 1.12]) mk(g, geo('grave_rail', () => new THREE.BoxGeometry(2.12, 0.075, 0.075)), iron, 0, h, 0);
    for (let i = -2; i <= 2; i++) { const px = i * 0.48; mk(g, geo('grave_bar', () => new THREE.BoxGeometry(0.065, 1.4, 0.065)), iron, px, 0.75, 0); mk(g, geo('grave_tip', () => new THREE.ConeGeometry(0.09, 0.18, 4)), iron, px, 1.53, 0); }
    TOWN.obst.push({ x, z, r: 0.72 });
  };
  for (let i = -3; i <= 3; i++) { fence(gx + i * 2, gz + 6, 0); fence(gx + i * 2, gz - 6, 0); }
  for (let j = -2; j <= 2; j++) { fence(gx - 7, gz + j * 2.2, Math.PI / 2); if (j !== 0) fence(gx + 7, gz + j * 2.2, Math.PI / 2); }
  const stones = ['gravestoneCross', 'gravestoneRound', 'gravestoneDecorative', 'gravestoneBroken'];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) add(stones[(i + j) % 4], gx - 4.5 + i * 2.4, gz - 1 + j * 2.6, Math.PI, 1.8, 0.5);
  add('crypt', gx, gz - 4, Math.PI, 2.2, 2.4); add('coffin', gx + 5, gz + 2, 0.4, 1.8, 0.8); add('urn', gx - 5.5, gz + 3.5, 0, 1.8, 0.4);
  add('fy_cem_tomb_statue', gx - 4, gz - 4.6, 0, 1, 0.7); add('fy_cem_tomb_1', gx + 4, gz - 4.4, 0, 1, 0.7);
  for (const [k, x, z] of [['fy_cem_headstone_1', gx - 5.6, gz + 1.8], ['fy_cem_headstone_2', gx - 2.2, gz + 4.4], ['fy_cem_headstone_3', gx + 1.4, gz + 4.6]]) add(k, x, z, Math.PI, 1, 0.4);
  add('fy_cem_bones_group', gx - 1, gz + 2.2, 0.8, 1, 0);
  for (const [x, z] of [[gx - 3, gz + 1.6], [gx + 2.6, gz + 3], [gx + 4.2, gz - 2.8]]) { add('dp_candle_big', x, z, 0, 1.6, 0); const fl = mk(R, geo('w_cand', () => new THREE.ConeGeometry(0.03, 0.09, 6)), tmat('#ffd27a', { emissive: '#ffa020', emissiveIntensity: 2 }), x, 0.55, z); WORLD.flick.push(fl); }
  for (const [x, z] of [[gx - 6.5, gz + 6.5], [gx + 6.5, gz + 6.5]]) { add('fireBasket', x, z, 0, 2, 0.4); flame(x, 1.75, z, '#7dffb0'); }
  for (const [k, x, z, ry] of [['skeleton', gx + 3.5, gz + 4, 2.4], ['zombie', gx - 3, gz + 4.5, 0.6], ['vampire', gx + 5.5, gz - 3, -0.5]]) { const p = add(k, x, z, ry, 1.6, 0.5); if (p) WORLD.bob.push({ o: p, k: 'sway', ph: x }); }
  for (const [x, z] of [[gx - 2, gz - 2], [gx + 2.5, gz + 1]]) { const gh = kpiece(R, 'ghost', x, 1, z, 0, 1.6); if (gh) WORLD.bob.push({ o: gh, k: 'float', ph: x, cx: x, cz: z }); }
  for (const [x, z] of [[30, -66], [58, -64], [36, -72], [54, -71], [28, -50]]) add(x % 2 ? 'fy_creepy_tree_1' : 'fy_creepy_tree_2', x, z, x, 1, 0.8);
  add('dp_cage', 58, -48, -0.6, 1, 0.8); add('dp_guillotine', 31, -60, 0.5, 1, 1.2); add('fy_cem_lamp', 37.6, -48.8, 0, 1.2, 0.3); add('fy_cem_lamp', 50.4, -48.8, 0, 1.2, 0.3);
  add('ps_tent', 60, -56, -0.6, 1.2, 1.8); add('ps_fire', 57.6, -58, 0, 1.6, 0.6); add('fy_ancient_tree_autumn', 20, -60, 0.4, 1, 2.2); add('nt_deadtree', 62, -40, 1, 1, 0.8);
}

