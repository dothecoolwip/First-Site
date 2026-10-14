// ---------- cottages, wagons and crates from Quaternius' Medieval Village MegaKit (CC0), flat-coloured ----------
const VMAT = {};
const VCOL = { MI_WoodTrim: '#6e4d31', MI_WoodTrim_Wear: '#6a4b30', MI_Plaster: '#d9ccb0', MI_RoundTiles: '#a4472a', MI_UnevenBrick: '#8d8478', MI_Brick: '#9a6a52', MI_RockTrim: '#8f877c' };
function vmat(m) { return VMAT[m.n] || (VMAT[m.n] = new THREE.MeshStandardMaterial({ color: VCOL[m.n] || new THREE.Color(m.c[0], m.c[1], m.c[2]), roughness: 0.92, flatShading: true })); }
function vpiece(parent, key, x, y, z, ry = 0, s = 1) {
  const src = typeof VILLAGE_GEO !== 'undefined' && VILLAGE_GEO[key]; if (!src) return null;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); parent.add(g);
  src.mats.forEach((m, i) => {
    const gg = geo('vil:' + key + i, () => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(m.v.map(q => q / 100), 3)); b.setIndex(m.i); const nb = b.toNonIndexed(); nb.computeVertexNormals(); nb.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(nb.attributes.position.count * 2), 2)); nb.computeBoundingSphere(); return nb; });
    const me = new THREE.Mesh(gg, vmat(m)); me.castShadow = SHADOWS; me.receiveShadow = true; g.add(me);
  });
  return g;
}
// a 4x4 m (or 4x6) cottage: plaster or stone walls, a window or two, a door facing the list, a tiled roof and a chimney
function cottage(parent, x, z, ry, seed) {
  const r = seeded('cot' + seed), h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry; parent.add(h);
  const long = r() < 0.5, D = long ? 3 : 2, stone = r() < 0.4;
  const plain = stone ? 'Wall_UnevenBrick_Straight' : r() < 0.5 ? 'Wall_Plaster_WoodGrid' : 'Wall_Plaster_Straight';
  const win = stone ? 'Wall_UnevenBrick_Window_Wide_Round' : 'Wall_Plaster_Window_Wide_Round';
  // front and back (along x, 2 segments), sides (along z, D segments)
  for (const [sx, nm] of [[-1, 'Wall_Plaster_Door_Round'], [1, win]]) vpiece(h, nm, sx, 0, D, 0);
  for (const sx of [-1, 1]) vpiece(h, r() < 0.5 ? win : plain, sx, 0, -D, Math.PI);
  for (let i = 0; i < D; i++) { const zc = -D + 1 + i * 2; vpiece(h, i === 1 ? win : plain, 2, 0, zc, Math.PI / 2); vpiece(h, plain, -2, 0, zc, -Math.PI / 2); }
  vpiece(h, long ? 'Roof_RoundTiles_4x6' : 'Roof_RoundTiles_4x4', 0, 3.1, 0, long ? Math.PI / 2 : 0);
  vpiece(h, 'Prop_Chimney', 1.2, 3.1, -D + 0.9, 0, 0.8);
  mergeChildren(h);
  return h;
}
function buildHamlet(root0) {
  if (typeof VILLAGE_GEO === 'undefined') return;
  const root = new THREE.Group(); root0.add(root); (W3.venueExtras = W3.venueExtras || []).push(root); // hidden in town, where the festival has its own layout
  const spots = IS_TOUCH ? [[-36, -30], [37, -26], [-38, 26], [35, 31], [-2, -50]] : [[-36, -30], [37, -26], [-38, 26], [35, 31], [-2, -50], [-20, -47], [19, 49], [46, 2], [-47, -4]];
  spots.forEach(([x, z], i) => cottage(root, x, z, Math.atan2(-x, -z) + rand(-0.25, 0.25), i));
  // a hay wagon and crates behind the tents, a fence run past the cottages
  vpiece(root, 'Prop_Wagon', -LIST.W / 2 - 13, 0, -4, 0.4);
  for (const [x, z, s] of [[-LIST.W / 2 - 11.5, 7, 1], [-LIST.W / 2 - 12.2, 8.2, 0.8], [LIST.W / 2 + 12.5, -6, 0.9], [LIST.W / 2 + 13.3, -5, 0.7]]) vpiece(root, 'Prop_Crate', x, 0, z, rand(0, 1.5), s);
  for (let i = 0; i < 8; i++) vpiece(root, 'Prop_WoodenFence_Single', -30 + i * 2.05, 0, -40, 0);
}
