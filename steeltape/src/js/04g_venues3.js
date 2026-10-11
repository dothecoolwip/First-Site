// ---------- the realm's arenas as venues you can fight in: Peasants' arena, Forest arena, Beach arena, the Great Hall ----------
// (the Dome is the summer field's list, the Castle arena is the castle courtyard)
Object.assign(VENUES, {
  peasant: { key: 'peasant', name: 'Peasants’ arena', sub: 'Millbrook village: mud, hay bales and the pigs watching.', build: buildVenuePeasant },
  forest: { key: 'forest', name: 'Forest arena', sub: 'A glade in the Old Woods, a log fence and torches.', build: buildVenueForest },
  beach: { key: 'beach', name: 'Beach arena', sub: 'Mirror Lake’s sandy shore, driftwood and gulls.', build: buildVenueBeach },
  hall: { key: 'hall', name: 'The Great Hall', sub: 'Inside the keep: banners, chandeliers and the king watching.', build: buildVenueHall }
});
function v3ring(root, keys, n, r0, r1, seed, s0, s1) {
  const rnd = seeded(seed);
  for (let i = 0; i < n; i++) { const a = rnd() * TAU, r = r0 + rnd() * (r1 - r0); const x = Math.cos(a) * r * 0.85, z = Math.sin(a) * r; if (Math.abs(x) < LIST.W / 2 + 9 && Math.abs(z) < LIST.L / 2 + 9) continue; kpiece(root, keys[Math.floor(rnd() * keys.length)], x, 0, z, rnd() * TAU, s0 + rnd() * (s1 - s0)); }
}
function v3plane(root, w, l, col, tex, y) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ map: tex ? venueTex(tex) : null, color: col, roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; root.add(m); return m; }
function buildVenuePeasant(root) {
  buildVenueField(root);
  const { W, L } = LIST;
  v3plane(root, W + 3, L + 3, '#6b5236', 'dirt', 0.03);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, x = Math.cos(a) * (W / 2 + 7), z = Math.sin(a) * (L / 2 + 7); kpiece(root, i % 3 ? 'cr_wheat_crop' : 'mk_Barrel', x, 0, z, a, i % 3 ? 1.2 : 1.1); }
  const hay = new THREE.MeshStandardMaterial({ color: '#d8bf6a', roughness: 1 }), hg = new THREE.CylinderGeometry(0.6, 0.6, 1.1, 14);
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(hg, hay); m.rotation.z = Math.PI / 2; m.position.set((i % 2 ? 1 : -1) * (W / 2 + 5.4), 0.6, -L / 2 + 3 + i * 2.2); m.castShadow = true; root.add(m); }
  for (const [k, x, z, r] of [['fb_barn', -34, -18, 1.2], ['fb_smallbarn', 30, -30, -0.8], ['fb_windmill', 36, 22, -1.4], ['fb_chickencoop', -30, 24, 0.6], ['fb_well', 22, 34, 0], ['fb_silo', -40, 6, 0]]) kpiece(root, k, x, 0, z, r, 1.6);
  v3ring(root, ['kf_tree_1_c', 'kf_tree_2_c', 'kf_bush_1_a'], IS_TOUCH ? 20 : 40, 48, 80, 'peasantv', 1, 1.5);
}
function buildVenueForest(root) {
  buildVenueField(root);
  const S = W3.scene; S.background = new THREE.Color('#9fbcc9'); S.fog = new THREE.Fog('#7f9a7a', 30, 95); W3.sun.intensity = 1.4; W3.hemi.color.set('#b9d6b0');
  const { W, L } = LIST;
  v3plane(root, W + 3, L + 3, '#6e7a48', 'grass', 0.03);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; kpiece(root, 'nt_log', Math.cos(a) * (W / 2 + 6), 0, Math.sin(a) * (L / 2 + 6), a + Math.PI / 2, 1.5); }
  v3ring(root, ['kf_tree_1_c', 'kf_tree_2_c', 'kf_tree_2_d', 'kf_tree_3_b', 'kf_tree_4_b', 'kf_tree_1_b', 'kf_bush_1_a', 'kf_rock_3_e'], IS_TOUCH ? 60 : 120, 26, 75, 'forestv', 1, 1.8);
}
function buildVenueBeach(root) {
  buildVenueField(root);
  const S = W3.scene; S.background = new THREE.Color('#9fd0f0'); S.fog = new THREE.Fog('#bfe0f4', 50, 170); W3.sun.intensity = 2.0;
  const { W, L } = LIST;
  v3plane(root, 230, 270, '#d8c690', 'dirt', 0.01);
  v3plane(root, W + 3, L + 3, '#cdb67c', 'dirt', 0.03);
  const water = v3plane(root, 260, 120, '#4f8fb8', null, 0.05); water.position.set(0, 0.05, -L / 2 - 75); water.material.roughness = 0.2; water.material.metalness = 0.1;
  for (const [k, x, z, r, s] of [['rt_dock_side', -12, -L / 2 - 18, 0, 3], ['rt_dock_side', -12, -L / 2 - 24, 0, 3], ['nt_log', W / 2 + 7, 4, 0.4, 1.6], ['nt_log', -W / 2 - 8, -6, 1.2, 1.6], ['rt_barrels', W / 2 + 9, -12, 0, 2.5], ['fy_rock_big_1', -40, 20, 0.5, 1.6], ['fy_rock_big_3', 44, 10, 1.2, 1.4]]) kpiece(root, k, x, 0, z, r, s);
  v3ring(root, ['kf_tree_4_b', 'kf_tree_4_c', 'kf_bush_4_a'], IS_TOUCH ? 14 : 28, 50, 85, 'beachv', 1, 1.4);
}
function buildVenueHall(root) {
  buildVenueCastle(root);
  const S = W3.scene; S.background = new THREE.Color('#1a120c'); S.fog = new THREE.Fog('#1a120c', 30, 80);
  W3.hemi.color.set('#ffd9a6'); W3.hemi.groundColor.set('#2a1c12'); W3.hemi.intensity = 0.62; W3.sun.color.set('#ffcf8a'); W3.sun.intensity = 0.9; W3.sun.position.set(6, 30, 8); W3.fill.intensity = 0.25;
  const { W, L } = LIST, CX = W / 2 + 9, CZ = L / 2 + 8;
  // a timber roof on great beams, stone pillars, a royal dais, banners and chandeliers
  const wood = new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.9 }), stone = new THREE.MeshStandardMaterial({ map: venueTex('wall'), roughness: 0.95 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(CX * 2 + 4, 0.6, CZ * 2 + 4), wood); roof.position.y = 13.5; root.add(roof);
  for (let z = -CZ + 4; z <= CZ - 4; z += 6) { const b = new THREE.Mesh(new THREE.BoxGeometry(CX * 2, 0.7, 0.6), wood); b.position.set(0, 12.6, z); root.add(b); }
  for (const sx of [-1, 1]) for (let z = -CZ + 4; z <= CZ - 4; z += 8) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 12.6, 10), stone); p.position.set(sx * (CX - 3), 6.3, z); p.castShadow = true; root.add(p); }
  const dais = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 4), stone); dais.position.set(0, 0.4, -CZ + 3.5); root.add(dais);
  kpiece(root, 'mk_Chair_1', 0, 0.8, -CZ + 3.5, 0, 2.2); kpiece(root, 'rp_crown', 0, 3.2, -CZ + 3.5, 0, 1);
  for (const [c, x] of [['#5b2a86', -9], ['#8a6a12', 9], ['#1c2a5a', -15], ['#6d1b28', 15]]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide })); b.position.set(x, 8, -CZ + 1.1); root.add(b); }
  for (const z of [-10, 0, 10]) { kpiece(root, 'mk_Chandelier', 0, 9.5, z, 0, 2.4); const l = new THREE.PointLight('#ffb35a', 0.6, 26, 2); l.position.set(0, 9, z); root.add(l); }
}
