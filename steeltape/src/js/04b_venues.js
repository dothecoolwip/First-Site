// ---------- venues: the summer arena, an outdoor summer field, a castle courtyard at night ----------
const VENUES = {
  arena:  { key: 'arena',  name: 'Arena',          sub: 'Westerner Park, Red Deer. Concrete pad, boards and glass.' },
  field:  { key: 'field',  name: 'Summer field',   sub: 'Outdoors on packed earth, tents and a roped-off crowd.' },
  castle: { key: 'castle', name: 'Castle at night', sub: 'Torchlit courtyard, stone walls, moon overhead.' },
};
const VTEX = {};
function venueTex(kind) {
  if (VTEX[kind]) return VTEX[kind];
  const c = cvs(512, 512), x = c.getContext('2d');
  if (kind === 'grass') {
    x.fillStyle = '#4f6b2e'; x.fillRect(0, 0, 512, 512);
    speckle(x, 512, 512, 7000, ['#3f5a24', '#5d7a36', '#6a8a3e', '#46632a'], 0.5, 1.8);
    for (let i = 0; i < 2600; i++) { x.strokeStyle = `rgba(${rand(70, 120) | 0},${rand(100, 150) | 0},${rand(40, 70) | 0},.5)`; x.lineWidth = 1; x.beginPath(); const px = rand(0, 512), py = rand(0, 512); x.moveTo(px, py); x.lineTo(px + rand(-2, 2), py - rand(3, 7)); x.stroke(); }
    VTEX[kind] = texFrom(c, [30, 40]);
  } else if (kind === 'dirt') {
    x.fillStyle = '#8a7556'; x.fillRect(0, 0, 512, 512);
    speckle(x, 512, 512, 8000, ['#76624a', '#9a8564', '#6b583f', '#a8936f'], 0.6, 2.2);
    speckle(x, 512, 512, 40, ['#6f5c43', '#7f6a4e'], 20, 70);
    for (let i = 0; i < 70; i++) { x.strokeStyle = 'rgba(70,55,35,.1)'; x.lineWidth = rand(1, 3); x.beginPath(); const px = rand(0, 512), py = rand(0, 512); x.moveTo(px, py); x.lineTo(px + rand(-18, 18), py + rand(-18, 18)); x.stroke(); } // boot scuffs
    VTEX[kind] = texFrom(c, [4, 6]);
  } else if (kind === 'whitestone') { // dressed white stone: the castle hill
    x.fillStyle = '#bdb6a9'; x.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 8; r++) for (let k = 0; k < 6; k++) { const w = 512 / 6, hgt = 512 / 8, ox = (r % 2) * w / 2; const g = rand(214, 238) | 0; x.fillStyle = `rgb(${g},${g - 3},${g - 10})`; x.fillRect(k * w + ox + 2, r * hgt + 2, w - 4, hgt - 4); x.fillRect(k * w + ox - 512 + 2, r * hgt + 2, w - 4, hgt - 4); }
    speckle(x, 512, 512, 2500, ['#cfc8ba', '#f2ede4', '#e0d9cc'], 0.5, 2);
    VTEX[kind] = texFrom(c, [10, 14]);
  } else if (kind === 'stone') {
    x.fillStyle = '#5a5c5e'; x.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 8; r++) for (let k = 0; k < 6; k++) { const w = 512 / 6, hgt = 512 / 8, ox = (r % 2) * w / 2; const g = rand(70, 110) | 0; x.fillStyle = `rgb(${g},${g + 2},${g + 5})`; x.fillRect(k * w + ox + 2, r * hgt + 2, w - 4, hgt - 4); x.fillRect(k * w + ox - 512 + 2, r * hgt + 2, w - 4, hgt - 4); }
    speckle(x, 512, 512, 4000, ['#3e4143', '#7d8083', '#55585a'], 0.5, 2);
    VTEX[kind] = texFrom(c, [10, 14]);
  } else if (kind === 'wall') {
    x.fillStyle = '#4a4744'; x.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 12; r++) for (let k = 0; k < 5; k++) { const w = 512 / 5, hgt = 512 / 12, ox = (r % 2) * w / 2; const g = rand(62, 96) | 0; x.fillStyle = `rgb(${g + 4},${g},${g - 4})`; x.fillRect(k * w + ox + 2, r * hgt + 2, w - 4, hgt - 3); x.fillRect(k * w + ox - 512 + 2, r * hgt + 2, w - 4, hgt - 3); }
    speckle(x, 512, 512, 3000, ['#2f2d2b', '#6d6964'], 0.5, 2);
    VTEX[kind] = texFrom(c, [6, 1.5]);
  } else if (kind === 'canvas') {
    const cols = ['#e9e1cc', '#8a1f2a']; for (let i = 0; i < 16; i++) { x.fillStyle = cols[i % 2]; x.fillRect(i * 32, 0, 32, 512); }
    speckle(x, 512, 512, 1500, ['#000'], 0.5, 2);
    VTEX[kind] = texFrom(c, [1, 1]);
  } else if (kind === 'canvas2') {
    const cols = ['#e9e1cc', '#1c3454']; for (let i = 0; i < 16; i++) { x.fillStyle = cols[i % 2]; x.fillRect(i * 32, 0, 32, 512); }
    VTEX[kind] = texFrom(c, [1, 1]);
  }
  return VTEX[kind];
}
// a crowd of simple people at the given spots
function buildCrowd(root, spots) {
  const n = spots.length; const bodyG = new THREE.BoxGeometry(0.46, 0.62, 0.34), headG = new THREE.IcosahedronGeometry(0.13, 1);
  const bodies = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ roughness: 0.85 }), n);
  const heads = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
  const shirt = ['#2f4b7c', '#7c2f3a', '#3a3f44', '#d6d1c4', '#526b3a', '#b87a2a', '#1f1f22', '#ff3d8b', '#3b93ff', '#6a5a8a', '#9c3d2a'], skins = ['#e0b896', '#c69373', '#8d5a3c', '#f1cfb4', '#5e3a26', '#b07b5a'];
  const col = new THREE.Color(); W3.crowdBase = [];
  spots.forEach((s, i) => { W3.crowdBase.push({ x: s[0], y: s[1], z: s[2], ph: rand(0, TAU), amp: rand(0.02, 0.06), ex: 0 }); bodies.setColorAt(i, col.set(pick(shirt))); heads.setColorAt(i, col.set(pick(skins))); });
  W3.crowd = { bodies, heads }; root.add(bodies, heads); updateCrowd(0, 0);
  // your club's supporters wave flags in its colours
  const C = CLUBS.reavers, nf = Math.floor(n / 9); if (nf > 0) {
    const fg = new THREE.PlaneGeometry(0.55, 0.36); fg.translate(0.3, 0, 0);
    const cv = cvs(64, 40), x = cv.getContext('2d'); x.fillStyle = C.tabard; x.fillRect(0, 0, 64, 40); x.fillStyle = C.trim; x.fillRect(0, 16, 64, 8); x.fillRect(28, 0, 8, 40);
    const flags = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ map: texFrom(cv), side: THREE.DoubleSide, roughness: 0.9 }), nf), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    W3.crowdFlags = []; for (let i = 0; i < nf; i++) { const s = spots[(i * 9 + 4) % n]; W3.crowdFlags.push({ x: s[0], y: s[1] + 0.95, z: s[2], ph: rand(0, TAU) }); m4.compose(new THREE.Vector3(s[0], s[1] + 0.95, s[2]), q, new THREE.Vector3(1, 1, 1)); flags.setMatrixAt(i, m4); }
    root.add(flags); W3.flagMesh = flags;
  }
}
function setVenue(key) {
  if (!VENUES[key]) key = 'arena';
  if (W3.venue === key && W3.venueRoot) return;
  if (W3.venueRoot) { W3.scene.remove(W3.venueRoot); W3.venueRoot.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  const root = new THREE.Group(); W3.scene.add(root); W3.venueRoot = root; W3.venue = key; W3.torches = []; W3.venueExtras = [];
  const S = W3.scene;
  if (key === 'arena') {
    S.background = new THREE.Color('#0c1013'); S.fog = new THREE.Fog('#0c1013', 40, 105);
    W3.hemi.color.set('#b9c6d2'); W3.hemi.groundColor.set('#3a332b'); W3.hemi.intensity = 0.5;
    W3.sun.color.set('#fff4e4'); W3.sun.intensity = 1.45; W3.sun.position.set(7, 26, 12); W3.fill.intensity = 0.35;
    buildVenueArena(root);
  } else if (key === 'field') buildVenueField(root);
  else if (key === 'fair') buildVenueFair(root);
  else if (key === 'rink') buildVenueRink(root);
  else if (key === 'stadium') buildVenueStadium(root);
  else if (VENUES[key].build) VENUES[key].build(root);
  else buildVenueCastle(root);
  store.set('venue', key); AU.amb(key);
  if (typeof applyGfx === 'function') applyGfx();
}

function buildVenueField(root) {
  const S = W3.scene, { W, L } = LIST;
  S.background = new THREE.Color('#a9cbe8'); S.fog = new THREE.Fog('#b9d3ea', 45, 150);
  W3.hemi.color.set('#cfe3f7'); W3.hemi.groundColor.set('#4d5e2c'); W3.hemi.intensity = 0.85;
  W3.sun.color.set('#fff1d6'); W3.sun.intensity = 1.9; W3.sun.position.set(-12, 30, 10); W3.fill.intensity = 0.25;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(220, 260), new THREE.MeshStandardMaterial({ map: venueTex('grass'), roughness: 1 })); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; root.add(grass);
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(W + 4, L + 4), new THREE.MeshStandardMaterial({ map: venueTex('dirt'), roughness: 1 })); dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.02; dirt.receiveShadow = true; root.add(dirt);
  // rope line on stakes around the list
  const RX = W / 2 + 4, RZ = L / 2 + 4, stake = new THREE.MeshStandardMaterial({ color: '#7a5a36', roughness: 0.9 }), rope = new THREE.MeshStandardMaterial({ color: '#d8ccaa', roughness: 0.9 });
  const sg = new THREE.CylinderGeometry(0.05, 0.06, 1.1, 6), stakes = [];
  for (let x = -RX; x <= RX + 0.01; x += 3) stakes.push([x, -RZ], [x, RZ]); for (let z = -RZ + 3; z <= RZ - 3 + 0.01; z += 3) stakes.push([-RX, z], [RX, z]);
  const st = new THREE.InstancedMesh(sg, stake, stakes.length); const m4 = new THREE.Matrix4(); stakes.forEach((p, i) => { m4.makeTranslation(p[0], 0.55, p[1]); st.setMatrixAt(i, m4); }); st.castShadow = true; root.add(st);
  for (const sz of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(RX * 2, 0.03, 0.03), rope); r.position.set(0, 0.95, sz * RZ); root.add(r); }
  for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, RZ * 2), rope); r.position.set(sx * RX, 0.95, 0); root.add(r); }
  // standing crowd behind the rope, three deep
  const spots = []; const n = IS_TOUCH ? 200 : 320;
  for (let i = 0; i < n; i++) { const side = i % 4, d = 1.2 + ((Math.random() * 3) | 0) * 0.8 + rand(-0.2, 0.2); let x, z; if (side < 2) { x = rand(-RX, RX); z = (side ? 1 : -1) * (RZ + d); } else { z = rand(-RZ + 2, RZ - 2); x = (side === 2 ? 1 : -1) * (RX + d); } spots.push([x, 0.95 + rand(-0.06, 0.08), z]); }
  buildCrowd(root, spots);
  // pavilions: striped tents with pennants
  const tents = [[-RX - 9, -10, 'canvas'], [-RX - 10, 4, 'canvas2'], [-RX - 9, 16, 'canvas'], [RX + 9, -14, 'canvas2'], [RX + 10, 2, 'canvas'], [RX + 9, 15, 'canvas2'], [-8, -RZ - 10, 'canvas'], [9, -RZ - 10, 'canvas2']];
  for (const [x, z, t] of tents) {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    const mat = new THREE.MeshStandardMaterial({ map: venueTex(t), roughness: 0.9, side: THREE.DoubleSide });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.2, 16, 1, true), mat); wall.position.y = 1.1; wall.castShadow = true; g.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.0, 16), mat); roof.position.y = 3.2; roof.castShadow = true; g.add(roof);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), stake); pole.position.y = 4.6; g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshStandardMaterial({ color: t === 'canvas' ? '#8a1f2a' : '#1c3454', side: THREE.DoubleSide })); flag.position.set(0.4, 5.05, 0); g.add(flag); W3.torches.push({ flag });
  }
  // a tree line on the horizon
  const trunk = new THREE.MeshStandardMaterial({ color: '#5a4430', roughness: 1 }), leaf = new THREE.MeshStandardMaterial({ color: '#3e5a2a', roughness: 1 });
  const tg = new THREE.ConeGeometry(2.6, 7, 7), kg = new THREE.CylinderGeometry(0.3, 0.4, 2, 6); const N = 60;
  const trees = new THREE.InstancedMesh(tg, leaf, N), trunks = new THREE.InstancedMesh(kg, trunk, N);
  for (let i = 0; i < N; i++) { const a = i / N * TAU + rand(-0.04, 0.04), r = rand(62, 78); const x = Math.cos(a) * r, z = Math.sin(a) * r * 1.15; const s = rand(0.8, 1.4); m4.makeScale(s, s, s).setPosition(x, 4.5 * s, z); trees.setMatrixAt(i, m4); m4.makeScale(s, s, s).setPosition(x, 1 * s, z); trunks.setMatrixAt(i, m4); }
  root.add(trees, trunks); (W3.venueExtras = W3.venueExtras || []).push(trees, trunks);
  buildHamlet(root);
  // the event banner on two poles at the far end
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ map: TEX.banner, side: THREE.DoubleSide })); ban.position.set(0, 4.2, -RZ - 3); root.add(ban);
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 6), stake); p.position.set(sx * 6.1, 3, -RZ - 3); root.add(p); }
}

function buildVenueCastle(root) {
  const S = W3.scene, { W, L } = LIST;
  S.background = new THREE.Color('#0b0f1c'); S.fog = new THREE.Fog('#0b0f1c', 30, 85);
  W3.hemi.color.set('#5b6c94'); W3.hemi.groundColor.set('#1c1712'); W3.hemi.intensity = 0.42;
  W3.sun.color.set('#a9bde6'); W3.sun.intensity = 0.65; W3.sun.position.set(14, 30, -10); W3.fill.intensity = 0.12;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 110), new THREE.MeshStandardMaterial({ map: venueTex('stone'), roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(W + 3, L + 3), new THREE.MeshStandardMaterial({ map: venueTex('dirt'), color: '#c9b48c', roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.y = 0.004; sand.receiveShadow = true; root.add(sand);
  // curtain walls with crenellations and a wall-walk crowd
  const CX = W / 2 + 9, CZ = L / 2 + 8, H = 7.5; const wm = new THREE.MeshStandardMaterial({ map: venueTex('wall'), roughness: 0.95 });
  const wall = (len, x, z, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(len, H, 2), wm); m.position.set(x, H / 2, z); m.rotation.y = ry; m.receiveShadow = true; root.add(m); };
  wall(CX * 2 + 2, 0, -CZ, 0); wall(CX * 2 + 2, 0, CZ, 0); wall(CZ * 2 + 2, -CX, 0, Math.PI / 2); wall(CZ * 2 + 2, CX, 0, Math.PI / 2);
  const mg = new THREE.BoxGeometry(0.9, 0.9, 0.5), merl = []; const m4 = new THREE.Matrix4();
  for (let x = -CX; x <= CX; x += 1.8) merl.push([x, -CZ + 0.75, 0], [x, CZ - 0.75, 0]);
  for (let z = -CZ + 1.8; z <= CZ - 1.8; z += 1.8) merl.push([-CX + 0.75, z, 1], [CX - 0.75, z, 1]);
  const mm = new THREE.InstancedMesh(mg, wm, merl.length); merl.forEach((p, i) => { m4.makeRotationY(p[2] ? Math.PI / 2 : 0).setPosition(p[0], H + 0.45, p[1]); mm.setMatrixAt(i, m4); }); root.add(mm);
  // corner towers
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, H + 4, 12), wm); t.position.set(sx * CX, (H + 4) / 2, sz * CZ); root.add(t); const r = new THREE.Mesh(new THREE.ConeGeometry(3.1, 3.2, 12), new THREE.MeshStandardMaterial({ color: '#2b3442', roughness: 0.8 })); r.position.set(sx * CX, H + 5.6, sz * CZ); root.add(r); }
  // hanging banners in club colours
  const banners = [['#6d1b28', -6], ['#1c3454', 6], ['#2a3d26', 0]];
  for (const [c, x] of banners) { const b = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide })); b.position.set(x, H - 2.6, -CZ + 1.02); root.add(b); }
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: TEX.banner })); ban.position.set(0, H + 2.4, -CZ - 0.5); root.add(ban);
  // crowd up on the walls and along the courtyard edge
  const spots = []; const n = IS_TOUCH ? 180 : 300;
  for (let i = 0; i < n; i++) {
    const side = i % 4, onWall = i % 3 !== 0;
    if (onWall) { if (side < 2) spots.push([rand(-CX + 2, CX - 2), H + 0.42 + 0.31, (side ? 1 : -1) * (CZ - 0.2)]); else spots.push([(side === 2 ? 1 : -1) * (CX - 0.2), H + 0.42 + 0.31, rand(-CZ + 2, CZ - 2)]); }
    else { const d = rand(3.5, 6.5); if (side < 2) spots.push([rand(-W / 2 - 3, W / 2 + 3), 0.95, (side ? 1 : -1) * (L / 2 + d)]); else spots.push([(side === 2 ? 1 : -1) * (W / 2 + d), 0.95, rand(-L / 2, L / 2)]); }
  }
  buildCrowd(root, spots);
  // torches: posts with flames round the list, and a few real lights
  const post = new THREE.MeshStandardMaterial({ color: '#2b2118', roughness: 0.9 });
  const flameM = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.95 });
  const glowM = new THREE.SpriteMaterial({ map: TEX.spark, color: '#ff9a3c', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 });
  const spotsT = []; for (const sx of [-1, 1]) for (const z of [-L / 2 + 1, -L / 4, 0, L / 4, L / 2 - 1]) spotsT.push([sx * (W / 2 + 2.2), z]);
  spotsT.push([0, -L / 2 - 2.4], [0, L / 2 + 2.4]);
  const lightIdx = new Set([0, 4, 7, 9]); // four real lights, the rest are glow
  spotsT.forEach(([x, z], i) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6), post); p.position.set(x, 1.1, z); p.castShadow = true; root.add(p);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.22, 8), MAT.steelDark); bowl.position.set(x, 2.3, z); root.add(bowl);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 7), flameM); flame.position.set(x, 2.62, z); root.add(flame);
    const glow = new THREE.Sprite(glowM); glow.position.set(x, 2.65, z); glow.scale.setScalar(1.6); root.add(glow);
    let light = null; if (lightIdx.has(i)) { light = new THREE.PointLight('#ff9a4a', 1.6, 16, 1.6); light.position.set(x, 2.8, z); root.add(light); }
    W3.torches.push({ flame, glow, light, ph: rand(0, TAU) });
  });
  // stars
  const sg = new THREE.BufferGeometry(); const pos = []; for (let i = 0; i < 500; i++) { const a = rand(0, TAU), e = rand(0.25, 1.3), r = 140; pos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  root.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#dfe8ff', size: 0.9, sizeAttenuation: true, fog: false })));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(5, 24), new THREE.MeshBasicMaterial({ color: '#e8eefc', fog: false })); moon.position.set(60, 75, -80); moon.lookAt(0, 0, 0); root.add(moon);
}
// torches flicker, pennants flap
function updateCrowdFlags(t) {
  const F = W3.crowdFlags, M = W3.flagMesh; if (!F || !M || !M.parent) return; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (let i = 0; i < F.length; i++) { const f = F[i]; e.set(0, Math.sin(t * 2 + f.ph) * 0.9, Math.sin(t * 3.1 + f.ph) * 0.15); q.setFromEuler(e); p.set(f.x, f.y + Math.max(0, Math.sin(t * 2.3 + f.ph)) * 0.1, f.z); m4.compose(p, q, one); M.setMatrixAt(i, m4); }
  M.instanceMatrix.needsUpdate = true;
}
function updateVenue(t) {
  updateCrowdFlags(t);
  for (const T of W3.torches || []) {
    if (T.flag) { T.flag.rotation.y = Math.sin(t * 3 + T.flag.position.x) * 0.35; continue; }
    const f = 0.85 + 0.15 * Math.sin(t * 13 + T.ph) + 0.08 * Math.sin(t * 29 + T.ph * 2);
    T.flame.scale.set(1, f * 1.1, 1); T.glow.material.opacity = 0.6 + 0.3 * f; if (T.light) T.light.intensity = 1.35 + 0.45 * f;
  }
}
