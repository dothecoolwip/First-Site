// ---------- more venues: a rainy medieval fair, a winter outdoor rink, and the floodlit stadium final ----------
Object.assign(VENUES, {
  fair: { key: 'fair', name: 'Medieval fair', sub: 'Market stalls, bunting and grey skies over the fairground.', weather: 'rain' },
  rink: { key: 'rink', name: 'Winter rink', sub: 'An outdoor rink at dusk, snowbanks and string lights.', weather: 'snow' },
  stadium: { key: 'stadium', name: 'Stadium final', sub: 'Floodlights, a packed bowl and the Prairie Cup on the line.' },
});
function buildVenueFair(root) {
  buildVenueField(root);
  const S = W3.scene; S.background = new THREE.Color('#9aa6ad'); S.fog = new THREE.Fog('#a3adb3', 35, 120);
  W3.hemi.color.set('#c5cdd2'); W3.hemi.intensity = 0.75; W3.sun.intensity = 1.0; W3.sun.color.set('#e8eef2');
  const { W, L } = LIST, stripes = [['#8a1f2a', '#e8e1cf'], ['#1c3454', '#e8e1cf'], ['#2a5a2a', '#f2c40f'], ['#5a2a6a', '#e8e1cf']];
  const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.9 }), goods = ['#c9a227', '#8a1f2a', '#d6d1c4', '#526b3a', '#b87a2a'];
  for (let i = 0; i < 12; i++) { // market stalls in a loose ring behind the crowd
    const a = i / 12 * TAU + 0.15, r = 27 + (i % 3) * 2.5, x = Math.sin(a) * r * 0.85, z = Math.cos(a) * r;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = a + Math.PI; root.add(g);
    mk(g, geo('stallT', () => new THREE.BoxGeometry(3, 0.9, 1.4)), wood, 0, 0.45, 0);
    for (const sx of [-1.4, 1.4]) for (const sz of [-0.6, 0.6]) mk(g, geo('stallP', () => new THREE.BoxGeometry(0.1, 2.4, 0.1)), wood, sx, 1.2, sz);
    const [c1, c2] = stripes[i % stripes.length]; const cv = cvs(64, 64), x2 = cv.getContext('2d'); for (let s = 0; s < 8; s++) { x2.fillStyle = s % 2 ? c1 : c2; x2.fillRect(s * 8, 0, 8, 64); }
    const aw = mk(g, geo('awn', () => new THREE.BoxGeometry(3.4, 0.08, 1.9)), new THREE.MeshStandardMaterial({ map: texFrom(cv), roughness: 0.9 }), 0, 2.45, 0.15); aw.rotation.x = -0.2;
    for (let k = 0; k < 4; k++) mk(g, geo('good', () => new THREE.BoxGeometry(0.4, 0.3, 0.4)), new THREE.MeshStandardMaterial({ color: goods[(i + k) % goods.length], roughness: 0.8 }), -1.1 + k * 0.7, 1.05, 0);
  }
}
function buildVenueRink(root) {
  const S = W3.scene, { W, L } = LIST;
  S.background = new THREE.Color('#2b2d4a'); S.fog = new THREE.Fog('#3a3c5c', 35, 110);
  W3.hemi.color.set('#aab6e0'); W3.hemi.groundColor.set('#e6ecf2'); W3.hemi.intensity = 0.7;
  W3.sun.color.set('#ffd2b0'); W3.sun.intensity = 0.9; W3.sun.position.set(-20, 14, -12); W3.fill.intensity = 0.3;
  const snow = new THREE.Mesh(new THREE.PlaneGeometry(220, 260), new THREE.MeshStandardMaterial({ color: '#eef2f6', roughness: 0.95 })); snow.rotation.x = -Math.PI / 2; snow.receiveShadow = true; root.add(snow);
  const ice = new THREE.Mesh(new THREE.PlaneGeometry(W + 6, L + 6), new THREE.MeshStandardMaterial({ color: '#d9ecf5', roughness: 0.18, metalness: 0.05 })); ice.rotation.x = -Math.PI / 2; ice.position.y = 0.02; ice.receiveShadow = true; root.add(ice);
  // snowbanks around the boards, a crowd in parkas, pines and string lights
  const bankM = new THREE.MeshStandardMaterial({ color: '#f4f7fa', roughness: 1 });
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, x = Math.sin(a) * (W / 2 + 6.5) * 1.05, z = Math.cos(a) * (L / 2 + 6.5); const b = mk(root, geo('bank', () => new THREE.SphereGeometry(1.6, 10, 6, 0, TAU, 0, Math.PI / 2)), bankM, x, 0, z); b.scale.set(1.3, rand(0.4, 0.7), 1); }
  const spots = []; const RX = W / 2 + 4, RZ = L / 2 + 4; for (let i = 0; i < (IS_TOUCH ? 160 : 260); i++) { const side = i % 4, d = 1.2 + ((Math.random() * 3) | 0) * 0.8; let x, z; if (side < 2) { x = rand(-RX, RX); z = (side ? 1 : -1) * (RZ + d); } else { z = rand(-RZ + 2, RZ - 2); x = (side === 2 ? 1 : -1) * (RX + d); } spots.push([x, 0.95, z]); }
  buildCrowd(root, spots);
  const pine = new THREE.MeshStandardMaterial({ color: '#2c4a36', roughness: 1 }), trunk = new THREE.MeshStandardMaterial({ color: '#4a3626' });
  const N = 50, tg = new THREE.ConeGeometry(2.4, 8, 7), trees = new THREE.InstancedMesh(tg, pine, N), m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { const a = i / N * TAU, r = rand(48, 70), s = rand(0.8, 1.3); m4.makeScale(s, s, s).setPosition(Math.cos(a) * r, 4 * s, Math.sin(a) * r * 1.1); trees.setMatrixAt(i, m4); } root.add(trees);
  const bulbCols = ['#ffd27a', '#ff6a6a', '#7fd8ff', '#9cff8a'];
  for (const [ax, az, bx, bz] of [[-W / 2 - 2, -L / 2 - 2, W / 2 + 2, -L / 2 - 2], [-W / 2 - 2, L / 2 + 2, W / 2 + 2, L / 2 + 2]]) for (let k = 0; k <= 24; k++) { const t = k / 24; const b = mk(root, geo('bulb', () => new THREE.SphereGeometry(0.07, 6, 4)), new THREE.MeshBasicMaterial({ color: bulbCols[k % 4] }), lerp(ax, bx, t), 4.2 - Math.sin(Math.PI * t) * 0.8, lerp(az, bz, t), false); }
  const glow = new THREE.PointLight('#ffcf8a', 0.8, 40); glow.position.set(0, 6, 0); root.add(glow);
}
function buildVenueStadium(root) {
  const S = W3.scene, { W, L } = LIST;
  S.background = new THREE.Color('#05070c'); S.fog = new THREE.Fog('#05070c', 60, 150);
  W3.hemi.color.set('#9fb0c8'); W3.hemi.groundColor.set('#202020'); W3.hemi.intensity = 0.55;
  W3.sun.color.set('#ffffff'); W3.sun.intensity = 1.8; W3.sun.position.set(0, 40, 8); W3.fill.intensity = 0.45;
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(120, 150), new THREE.MeshStandardMaterial({ color: '#2f5a2a', roughness: 1 })); turf.rotation.x = -Math.PI / 2; turf.receiveShadow = true; root.add(turf);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(W + 4, L + 4), new THREE.MeshStandardMaterial({ map: TEX.concrete, roughness: 0.9 })); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.02; pad.receiveShadow = true; root.add(pad);
  // the bowl: rings of seating stepping up, packed with fans
  const seatM = new THREE.MeshStandardMaterial({ color: '#30343a', roughness: 0.9 }); const spots = [];
  for (let r = 0; r < 9; r++) { const rx = 22 + r * 2.2, rz = 28 + r * 2.2, y = 0.6 + r * 1.1;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 4, 48), seatM); ring.scale.set(rx, rz, 12); ring.rotation.x = Math.PI / 2; ring.position.y = y - 0.3; root.add(ring);
    const n = IS_TOUCH ? 40 : 70; for (let i = 0; i < n; i++) { const a = i / n * TAU + r * 0.05; spots.push([Math.cos(a) * rx, y + 0.35, Math.sin(a) * rz]); } }
  buildCrowd(root, spots);
  const towerM = new THREE.MeshStandardMaterial({ color: '#6d747a', metalness: 0.6, roughness: 0.5 });
  for (const [x, z] of [[-30, -36], [30, -36], [-30, 36], [30, 36]]) { mk(root, geo('ftower', () => new THREE.CylinderGeometry(0.4, 0.6, 26, 8)), towerM, x, 13, z); const lamp = mk(root, geo('flamp', () => new THREE.BoxGeometry(4, 2, 0.6)), new THREE.MeshBasicMaterial({ color: '#fffbe6' }), x, 26.5, z, false); lamp.lookAt(0, 0, 0); }
  const c = cvs(1024, 256), x = c.getContext('2d'); x.fillStyle = '#0f1316'; x.fillRect(0, 0, 1024, 256); x.fillStyle = '#f2c40f'; x.fillRect(0, 0, 1024, 12); x.fillRect(0, 244, 1024, 12); x.fillStyle = '#ece8de'; x.textAlign = 'center'; x.font = '900 120px "Big Shoulders Display", Impact, sans-serif'; x.fillText('PRAIRIE CUP FINAL', 512, 160);
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: texFrom(c) })); ban.position.set(0, 12, -48); root.add(ban);
}
