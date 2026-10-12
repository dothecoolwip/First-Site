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
  [-72, -44, -76, -35],
  [33, 58, -68, -42], [-51, -27, -42, -18], [-52, -32, 44, 64], [-75, -54, 34, 70], [55, 72, 0, 20], [52, 80, -40, -2], [-33, -18, 26, 48], [-30, -18, -52, -40], [-86, -52, -60, -12]
];
function festReserved(x, z, pad = 0) { return FEST_RESERVED.some(([a, b, c, d]) => x > a - pad && x < b + pad && z > c - pad && z < d + pad); }
function buildFestival(R) {
  const O = TOWN.obst, add = (key, x, z, ry, s, r) => { const p = kpiece(R, key, x, 0, z, ry || 0, s || 1); if (r) O.push({ x, z, r }); return p; };
  const line = (x0, z0, x1, z1, r, gap) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / (r * 1.4))); for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (gap && gap(x, z)) continue; O.push({ x, z, r }); } };
  TOWN.mapRects = [];
  const ground = (x0, x1, z0, z1, col, tex) => { TOWN.mapRects.push([x0, x1, z0, z1, col]); const g = mk(R, new THREE.PlaneGeometry(x1 - x0, z1 - z0), lmat({ map: tex === false ? null : venueTex('dirt'), color: col, roughness: 1 }), (x0 + x1) / 2, 0.022 + Math.random() * 0.004, (z0 + z1) / 2, false); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; return g; };
  const sign = (text, col, x, y, z, ry, s) => { const sg = townSign(text, col); sg.position.set(x, y, z); sg.rotation.y = ry || 0; if (s) sg.scale.setScalar(s); R.add(sg); return sg; };
  const flame = (x, y, z, s, col) => { const f = mk(R, geo('fest_flame', () => new THREE.ConeGeometry(0.12, 0.34, 8)), tmat(col || '#ffb02e', { emissive: col === '#7dffb0' ? '#00c46a' : '#ff6a00', emissiveIntensity: 1.7 }), x, y, z); f.scale.setScalar(s || 1); WORLD.flick.push(f); return f; };
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  // ---- grass skirt under the whole town and the woods beyond it
  { const t = venueTex('grass'); let m = t; if (t && t.clone) { m = t.clone(); m.needsUpdate = true; m.wrapS = m.wrapT = THREE.RepeatWrapping; m.repeat.set(94, 101); }
    const g = mk(R, new THREE.PlaneGeometry(800, 860), lmat({ map: m || null, color: m ? '#f2f7ea' : '#8fc160', roughness: 1 }), 0, -0.03, -10, false); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; }
  // ---- paths and squares
  ground(-16, 16, 25, 70, '#b9a37c'); ground(-4.5, 4.5, -66, -24, '#b4a07a'); ground(-52, -28, -12, 31, '#b2a07a'); ground(25, 51, -10, 30, '#b9a37c');
  ground(-50, -28, -40, -20, '#a89068'); ground(29, 61, 40, 72, '#a8956c');
  // ---- the festival gate at the south end of main street
  for (const sx of [-7, 7]) { add('cs_tower_mid', sx, 69, 0, 0.9, 2.6); const t = add('cs_tower_top_1', sx, 69, 0, 0.9, 0); if (t) t.position.y = 3.6; const b = add(sx < 0 ? 'bannerRed' : 'bannerGreen', sx, 66.6, 0, 2.6, 0); if (b) b.position.y = 0.4; }
  for (const sx of [-4.6, 4.6]) mk(R, geo('fest_gpole', () => new THREE.CylinderGeometry(0.1, 0.12, 6.4, 8)), tmat('#4a3422'), sx, 3.2, 68.6);
  sign('BUHURT FESTIVAL', '#6d1b28', 0, 5.7, 68.7, Math.PI, 3.2); sign('BUHURT FESTIVAL', '#6d1b28', 0, 5.7, 68.5, 0, 3.2);
  // ---- main street: lanterns, banners, carts, the fountain, pumpkins for Halloween
  for (const z of [30, 38, 46, 54, 62]) for (const sx of [-16.6, 16.6]) add('lantern', sx, z, 0, 2, 0.3);
  add('fountainRoundDetail', 0, 44, 0, 2.3, 2.4);
  for (const [x, z, k] of [[-3.4, 24.4, 'bannerRed'], [3.4, 24.4, 'bannerGreen'], [-5, 66, 'bannerGreen'], [5, 66, 'bannerRed']]) add(k, x, z, 0, 2.2, 0.35);
  add('cartHigh', -15, 64.5, 0.5, 2, 1.4); add('cart', 14.5, 63.5, -0.4, 2, 1.3);
  for (const [x, z] of [[-6, 30], [6, 30], [-6, 38], [6, 38], [-3.2, 51.5], [3.2, 51.5], [-14, 26.5], [14, 26.5]]) add('pumpkinCarved', x, z, face(x, z, 0, 44), 1.4);
  add('slv_crate', -14.6, 39.6, 0.3, 1.2, 0.6); add('slv_veg', -14.4, 41.4, 0.2, 1.2, 0.5); add('fy_vil_barrel', -14.8, 49.6, 0, 1, 0.5); add('fy_asia_stone_lantern', -6.8, 62.4, 0, 1, 0.5); add('fy_asia_stone_lantern', 6.8, 62.4, 0, 1, 0.5);
  add('dp_gold_pile', 14, 53.4, 0.4, 0.7, 0.6); add('dp_chest_big', 14.4, 46.6, -Math.PI / 2, 1, 0.6);
  // ---- craftsmen's row (west): the forge yard behind the blacksmith, racks at the armourer, the guild's pillory and gold
  add('bf_furnace', -45, 24.6, Math.PI / 2, 1, 1.8); const glow = mk(R, geo('w_forgeglow', () => new THREE.BoxGeometry(0.7, 0.35, 0.05)), tmat('#ff7a1a', { emissive: '#ff4a00', emissiveIntensity: 1.8 }), -43.7, 0.75, 24.6); glow.rotation.y = Math.PI / 2; WORLD.flick.push(glow);
  add('bf_anvil', -42, 18.6, 0.2, 1, 0.5); add('bf_armor_rack', -45, 18.2, Math.PI / 2, 1, 0.6); add('bf_weapon_rack', -47, 21.4, Math.PI / 2, 1, 0.8); add('bf_barrel', -46.4, 27.6, 0, 1, 0.5); add('bf_crate', -48, 25.4, 0.3, 1, 0.6);
  add('ps_anvil', -42.4, 27, 0.4, 1.4, 0.5); add('ps_sharpener', -40.6, 28.8, 1.1, 1, 0.8); add('slv_barrel', -40, 15.6, 0, 1.2, 0.5);
  add('dp_weapon_rack', -42.6, 11, Math.PI / 2, 1, 0.6); add('dp_shield', -42.4, 7.8, Math.PI / 2, 1, 0.4); add('bf_crate', -44, 13, 0.6, 0.8, 0.5);
  add('dp_stocks', -31.4, -8, 0.3, 1, 0.8); add('dp_x_stocks', -31.2, 4.6, -0.3, 1, 0.8); add('dp_treasure_chest', -41.8, 1.4, Math.PI / 2, 1, 0.6);
  for (const z of [-10, 0, 10, 20, 30]) add('lantern', -29, z, 0, 2, 0.3);
  // ---- training grounds (north-west): pells to practise on, a rack, the watchtower, the wizard's cauldron
  for (const [x, z] of [[-31, -26], [-31, -30.5], [-31, -35]]) { mk(R, geo('fest_pell', () => new THREE.CylinderGeometry(0.13, 0.15, 1.9, 8)), tmat('#8a6a42'), x, 0.95, z).castShadow = true; mk(R, geo('fest_pellb', () => new THREE.CylinderGeometry(0.2, 0.2, 0.12, 8)), tmat('#5a4430'), x, 0.06, z); O.push({ x, z, r: 0.35 }); }
  add('dp_weapon_rack', -44, -26.6, Math.PI / 2, 1, 0.6); add('dp_bench', -44, -33.4, Math.PI / 2, 1, 0.5); add('bf_armor_rack', -44, -36.6, Math.PI / 2, 1, 0.6);
  add('slv_tower', -60, -30, 0.3, 1, 4.6); add('slv_cauldron', -27.6, -43.6, 0, 2.2, 0.7); { const brew = mk(R, geo('w_brew', () => new THREE.SphereGeometry(0.32, 12, 8, 0, TAU, 0, Math.PI / 2)), tmat('#7cff6b', { emissive: '#1aa000', emissiveIntensity: 1.2 }), -27.6, 0.62, -43.6); brew.rotation.x = Math.PI; WORLD.flick.push(brew); }
  // The tutorial is a place you can enter on foot, beside the trainer rather than a disconnected menu scene.
  arenaList(R, TRAINING_GROUND, { floor: '#b08d62', floorTex: 'dirt', post: '#70502d', rail: '#b88d53', signCol: '#a36b37', stands: false });
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
  for (const [x, z] of [[28.6, 9], [33.4, 9]]) add('lantern', x, z, 0, 2, 0.3);
  const FOOD = [['PIES', '#7a4a12', 'stallRed'], ['MEAD', '#2c4a8c', 'stallGreen'], ['SWEETS', '#8c1f4f', 'stallRed'], ['ROAST', '#6b4e16', 'stallGreen']];
  FOOD.forEach(([t, c, k], i) => { const x = 28 + i * 6.2, z = -6.5; add(k, x, z, 0, 2.6, 1.6); sign(t, c, x, 3.55, z + 1.25, 0, 0.9); });
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
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) add('crops_cornStageD', -70 + i * 1.6, 58 + j * 1.6, 0, 1.6);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) add(j % 2 ? 'crop_pumpkin' : 'pumpkin', -30 + i * 1.3, 58.5 + j * 1.5, (i * 7 + j) % 6, 1.6);
  add('nt_riverbed', -58, 72, 0, 2, 0); add('nt_riverbed', -54, 72, 0, 2, 0); for (const [x, z] of [[-57.4, 71.4], [-54.8, 72.8], [-56, 73.6]]) add('nt_lilypad', x, z, x, 1.3, 0); add('fy_asia_bridge', -56, 72, Math.PI / 2, 0.8, 0);
  add('slv_chest', -35, 50, face(-35, 50, -42, 54), 1, 0.8);
  // ---- the visiting clubs' camp (south-east): tents, a fire, banners, racks
  for (const [x, z] of [[36, 47], [44, 51], [52, 55]]) add('ps_tent', x, z, face(x, z, 45, 60), 1.3, 1.9);
  for (const [x, z] of [[37, 62], [48, 67], [57, 62]]) add(x > 50 ? 'tent_detailedOpen' : 'tent_detailedClosed', x, z, face(x, z, 45, 60), 2.6, 2.2);
  add('campfire_stones', 45, 59, 0, 2, 0.8); flame(45, 0.45, 59, 2.2); add('dp_weapon_rack', 56, 48, -0.6, 1, 0.6); add('ps_trough', 59, 52, 0.4, 1, 0.8);
  for (const [x, z, k] of [[33, 54, 'bannerRed'], [41, 57, 'bannerGreen'], [53, 66, 'bannerRed'], [60, 58, 'bannerGreen']]) add(k, x, z, 0, 2.2, 0.35);
  add('ps_house2', 68, 40, face(68, 40, 0, 30), 1, 5.5); add('ps_house4', 64, 60, face(64, 60, 0, 30), 1, 5.5);
  // ---- the rest of the realm round the fairground
  buildRealm(R);
  // ---- rocks and cliffs at the edges, and a ring of woods outside town
  for (const [k, x, z, r] of [['fy_rock_big_3', -84, 10, 0.4], ['fy_rock_big_1', -78, -40, 1.2], ['fy_rock_medium_4', 82, 24, 2], ['fy_rock_big_pillar', 74, -52, 0.7], ['nt_boulder', 20, -34, 0], ['nt_rock_mossy', -20, -36, 1], ['fy_rock_big_3', 40, 82, 1], ['fy_rock_big_1', -50, 88, 2]]) add(k, x, z, r, 1, 1.4);
  const rnd = seeded('festwoods');
  for (let i = 0; i < (IS_TOUCH ? 50 : 90); i++) { const a = i / (IS_TOUCH ? 50 : 90) * TAU + rnd() * 0.05, e = 1.04 + rnd() * 0.28; if (onRoad(Math.cos(a) * FAIR_RX * e * 1.12, Math.sin(a) * FAIR_RZ * e * 1.12, 5)) continue; add(['slv_tree1', 'slv_tree2', 'slv_tree6', 'fy_pine_2', 'nt_pine', 'fy_birch_1', 'tree_pineTallB_detailed'][i % 7], Math.cos(a) * FAIR_RX * e * 1.12, Math.sin(a) * FAIR_RZ * e * 1.12, rnd() * TAU, 0.9 + rnd() * 0.5, 0); }
  // ---- flora scattered where nothing is planned
  const kinds = [['treeHighRound', 2.6, 1], ['tree', 2.8, 1], ['treeCrooked', 2.6, 1], ['tree_oak_dark', 2.4, 1], ['nt_oak', 1, 1], ['nt_pine', 1, 1], ['nt_birch', 1, 1], ['fy_birch_6', 0.9, 1], ['slv_tree1', 1, 1], ['slv_tree6', 0.8, 1], ['plant_bushLarge', 2, 0.7], ['nt_bush', 1.3, 0.6], ['slv_bush3', 1, 0.6], ['nt_fern', 1.3, 0], ['nt_flowers', 1.6, 0], ['flower_yellowC', 2, 0], ['flower_purpleB', 2, 0], ['flower_redA', 2, 0], ['nt_grass', 2, 0], ['fy_grass_tuft', 1, 0], ['mushroom_red', 2.4, 0], ['nt_mushrooms', 1.6, 0], ['nt_boulder', 1.3, 0.8], ['nt_rocks', 1.3, 0.6], ['rockLarge', 1.8, 0.8], ['nt_stump', 1, 0.6], ['nt_log', 1, 0.7], ['nt_oak_sapling', 1.2, 0]];
  const fr = seeded('festflora'); let placed = 0;
  for (let tries = 0; tries < 3000 && placed < (IS_TOUCH ? 120 : 240); tries++) {
    const a = fr() * TAU, rr = 26 + fr() * 70, x = Math.cos(a) * rr, z = Math.sin(a) * rr * 1.06;
    if (Math.hypot(x / FAIR_RX, z / FAIR_RZ) > 1.02) continue;
    if (arenaBlocked(x, z, 3)) continue;
    if (festReserved(x, z, 1.5) || onRoad(x, z, 2)) continue;
    if (O.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 2.2)) continue;
    if (Object.values(STALL_AT).some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 6)) continue;
    const [k, s, r] = kinds[Math.floor(fr() * kinds.length)]; add(k, x, z, fr() * TAU, s * (0.85 + fr() * 0.3), r); placed++;
  }
}
// the graveyard: iron fence with a gate on the east side, stones, a crypt, tombs, candles, fire baskets, spooky decorations
const GRAVE = { x: 44, z: -56 };
function buildGraveyard(R, add) {
  const gx = GRAVE.x, gz = GRAVE.z, flame = (x, y, z, col) => { const f = mk(R, geo('w_fb', () => new THREE.ConeGeometry(0.22, 0.5, 8)), tmat(col, { emissive: col === '#7dffb0' ? '#00c46a' : '#ffa020', emissiveIntensity: 1.8 }), x, y, z); WORLD.flick.push(f); };
  for (let i = -3; i <= 3; i++) { add('ironFence', gx + i * 2, gz + 6, 0, 2, 0.75); add('ironFence', gx + i * 2, gz - 6, 0, 2, 0.75); }
  for (let j = -2; j <= 2; j++) { add('ironFence', gx - 7, gz + j * 2.2, Math.PI / 2, 2, 0.8); if (j !== 0) add('ironFence', gx + 7, gz + j * 2.2, Math.PI / 2, 2, 0.8); }
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
