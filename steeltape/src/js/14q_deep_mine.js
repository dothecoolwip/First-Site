// The Old Woods Deep Mine: a separate, enclosed floor beneath the quarry.
// Surface and mine share map coordinates but never share interaction or collision layers.
const DEEP_MINE = { x: -256, z: -46, y: -25, halfX: 29, halfZ: 29, entrance: [-256, -42], entry: [-256, -23], exit: [-256, -20] };

function mineGroundY(x, z) { return TOWN.mineOn ? DEEP_MINE.y : gy(x, z); }
function mineCollide(P, r) {
  const M = DEEP_MINE;
  P.x = clamp(P.x, M.x - M.halfX + r, M.x + M.halfX - r);
  P.z = clamp(P.z, M.z - M.halfZ + r, M.z + M.halfZ - r);
  for (const o of TOWN.mineObst || []) {
    const dx = P.x - o.x, dz = P.z - o.z, d = Math.hypot(dx, dz), m = o.r + r;
    if (d < m) { P.x = o.x + (d > 0.0001 ? dx / d : 1) * m; P.z = o.z + (d > 0.0001 ? dz / d : 0) * m; }
  }
}
function mineChange(on) {
  if (!TOWN.on || !TOWN.mine || TOWN.mineOn === on) return;
  if (GATHER.on) stopGather(false);
  clearWaypoint(); TOWN.spec = null; TOWN.mounted = false; if (on && TOWN.horse) TOWN.horse.come = false; TOWN.mineOn = on;
  TOWN.mine.visible = on; TOWN.pos = on ? { x: DEEP_MINE.entry[0], z: DEEP_MINE.entry[1] } : { x: DEEP_MINE.entrance[0], z: DEEP_MINE.entrance[1] + 4 };
  TOWN.yaw = 0; TOWN.face = on ? Math.PI : 0; TOWN.cam = null; TOWN.near = null; TOWN.district = null;
  if (TOWN.me) TOWN.me.root.position.set(TOWN.pos.x, mineGroundY(TOWN.pos.x, TOWN.pos.z), TOWN.pos.z);
  if (WORLD.pet) WORLD.pet.visible = !on;
  if (TOWN.mineLight) { W3.sun.intensity = on ? 0.12 : TOWN.mineLight.sun; W3.hemi.intensity = on ? 0.35 : TOWN.mineLight.hemi; }
  if (W3.scene.fog && TOWN.mineFog) { W3.scene.fog.near = on ? 9 : TOWN.mineFog.near; W3.scene.fog.far = on ? 65 : TOWN.mineFog.far; }
  toastMenu(on ? 'Old Woods Deep Mine. Follow the lanterns; the lift is behind you.' : 'Back at the Old Woods quarry.');
  townPrompt();
}
function minePortal(R, x, z, underground) {
  const y = underground ? DEEP_MINE.y : gy(x, z), g = new THREE.Group(); g.position.set(x, y, z); R.add(g);
  const wood = tmat('#5c3820'), iron = tmat('#383c40', { metalness: 0.55 }), amber = tmat('#ffb34a', { emissive: '#ff7a24', emissiveIntensity: 1.6 });
  for (const sx of [-1.8, 1.8]) mk(g, geo('mine_post', () => new THREE.BoxGeometry(0.32, 3.7, 0.38)), wood, sx, 1.85, 0);
  mk(g, geo('mine_lintel', () => new THREE.BoxGeometry(4.1, 0.4, 0.5)), wood, 0, 3.65, 0);
  mk(g, geo('mine_dark', () => new THREE.PlaneGeometry(3.2, 3.3)), lmat({ color: '#0b1015', side: THREE.DoubleSide }), 0, 1.7, -0.13, false);
  for (const sx of [-2.4, 2.4]) { kpiece(g, 'mk_Torch_Metal', sx, 1.7, 0.55, 0, 0.8); mk(g, geo('mine_flame', () => new THREE.ConeGeometry(0.12, 0.35, 8)), amber, sx, 2.7, 0.55); }
  kpiece(g, 'rt_pulley_crate', 3.4, 0, 1.5, 0.4, 0.8); kpiece(g, 'mk_Chain_Coil', -3, 0, 1, 0, 0.8);
  const lab = townLabel(underground ? 'Surface lift' : 'Deep Mine', underground ? 'Return to daylight' : 'Old Woods quarry', '#d8984d'); lab.position.set(0, 4.4, 0.3); g.add(lab);
  const V = { key: underground ? 'mine:exit' : 'mine:enter', name: underground ? 'Surface lift' : 'Old Woods Deep Mine', role: underground ? 'Return to surface' : 'Mine entrance', icon: '⛏️' };
  TOWN.stalls.push({ V, g, x, z, ax: x, az: z + 2.5, ry: 0, label: lab, mine: underground, open: () => mineChange(!underground), verb: underground ? 'Ride the lift' : 'Descend' });
  if (!underground) TOWN.obst.push({ x: x - 2.3, z, r: 0.6 }, { x: x + 2.3, z, r: 0.6 });
  return g;
}
function buildDeepMine() {
  const M = DEEP_MINE, R = new THREE.Group(); TOWN.root.add(R); TOWN.mine = R; TOWN.mineOn = false; TOWN.mineObst = [];
  TOWN.mineLight = { sun: W3.sun.intensity, hemi: W3.hemi.intensity };
  TOWN.mineFog = W3.scene.fog ? { near: W3.scene.fog.near, far: W3.scene.fog.far } : null;
  const stone = lmat({ color: '#4c4a48', roughness: 1, flatShading: true }), roof = lmat({ color: '#272c31', roughness: 1, side: THREE.DoubleSide });
  const floor = mk(R, new THREE.BoxGeometry(60, 0.7, 60), stone, M.x, M.y - 0.35, M.z, false); floor.receiveShadow = true;
  mk(R, new THREE.BoxGeometry(60, 0.8, 60), roof, M.x, M.y + 6.9, M.z, false);
  for (const sx of [-1, 1]) mk(R, new THREE.BoxGeometry(1.5, 7, 60), stone, M.x + sx * 29.8, M.y + 3.3, M.z, false);
  for (const sz of [-1, 1]) mk(R, new THREE.BoxGeometry(60, 7, 1.5), stone, M.x, M.y + 3.3, M.z + sz * 29.8, false);
  // Layered pack-rock silhouettes hide the straight cave shell and make each chamber distinct.
  const rnd = seeded('old-woods-deep-mine');
  for (let i = 0; i < 80; i++) {
    const a = i / 80 * TAU, side = i % 4, x = M.x + (side === 0 ? -28 : side === 1 ? 28 : -27 + rnd() * 54), z = M.z + (side === 2 ? -28 : side === 3 ? 28 : -27 + rnd() * 54);
    kpiece(R, i % 3 ? 'fy_rock_medium_4' : 'fy_rock_big_3', x, M.y, z, a, 1.1 + rnd() * 1.4);
  }
  for (const [dx, dz] of [[-17, -8], [17, -7], [-13, 10], [13, 10]]) {
    kpiece(R, 'fy_rock_big_pillar', M.x + dx, M.y, M.z + dz, rnd() * TAU, 1.6);
    TOWN.mineObst.push({ x: M.x + dx, z: M.z + dz, r: 1.8 });
  }
  // The timber-supported haulage line leads from the lift to a flooded crystal grotto.
  const timber = tmat('#765035'), rail = tmat('#605b55', { metalness: 0.45 });
  for (let z = 15; z >= -18; z -= 7) {
    for (const sx of [-3.8, 3.8]) mk(R, geo('mine_support', () => new THREE.BoxGeometry(0.35, 5.4, 0.35)), timber, M.x + sx, M.y + 2.7, M.z + z);
    mk(R, geo('mine_beam', () => new THREE.BoxGeometry(8.1, 0.4, 0.45)), timber, M.x, M.y + 5.45, M.z + z);
  }
  for (const sx of [-0.8, 0.8]) mk(R, geo('mine_rail', () => new THREE.BoxGeometry(0.1, 0.05, 43)), rail, M.x + sx, M.y + 0.07, M.z - 1, false);
  for (let z = 19; z >= -21; z -= 1.6) mk(R, geo('mine_tie', () => new THREE.BoxGeometry(2.4, 0.13, 0.32)), timber, M.x, M.y + 0.05, M.z + z, false);
  kpiece(R, 'rt_pulley_crate', M.x - 7, M.y, M.z + 14, 0.4, 1.4);
  for (const [dx, dz, ry] of [[-10, 12, 0.4], [-12, 14, 1.1], [12, 12, 0.8], [20, 13, 0]]) kpiece(R, dx < 0 ? 'mk_Crate_Wooden' : 'mk_Barrel', M.x + dx, M.y, M.z + dz, ry, 1.1);
  const pool = mk(R, new THREE.CircleGeometry(10, 32), lmat({ color: '#1e6570', emissive: '#063b48', emissiveIntensity: 0.4, roughness: 0.25, side: THREE.DoubleSide }), M.x + 11, M.y + 0.025, M.z - 16, false); pool.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 13; i++) {
    const a = i * 2.4, x = M.x + 10 + Math.cos(a) * (4 + i % 3), z = M.z - 17 + Math.sin(a) * (4 + i % 3);
    const c = mk(R, geo('mine_crystal', () => new THREE.OctahedronGeometry(0.6, 0)), lmat({ color: i % 3 ? '#73bfd0' : '#b7f7ff', emissive: '#287b9a', emissiveIntensity: 1.2, flatShading: true }), x, M.y + 0.7, z);
    c.scale.set(0.7 + i % 3 * 0.25, 1.8 + i % 4 * 0.5, 0.7 + i % 3 * 0.25); c.rotation.y = a;
  }
  for (const [dx, dz, color] of [[0, 20, '#ffb15e'], [-19, 0, '#ffa85a'], [16, -15, '#6cc9ed'], [-7, -20, '#eab376']]) {
    const light = new THREE.PointLight(color, IS_TOUCH ? 1.2 : 1.7, 24); light.position.set(M.x + dx, M.y + 4.2, M.z + dz); R.add(light);
    kpiece(R, 'mk_Torch_Metal', M.x + dx, M.y + 1.5, M.z + dz, 0, 0.75);
  }
  const sign = townLabel('Crystal Grotto', 'Deep Mine · north chamber', '#78cfe5'); sign.position.set(M.x + 13, M.y + 3.4, M.z - 22); R.add(sign);
  minePortal(R, M.exit[0], M.exit[1], true);
  minePortal(TOWN.root, M.entrance[0], M.entrance[1], false);
  for (const [type, dx, dz] of [['copper', -23, 1], ['iron', -21, -13], ['coal', -24, 17], ['crystal', 20, -17], ['silver', 23, 5]]) {
    const N = NODES[type], x = M.x + dx, z = M.z + dz, g = new THREE.Group(); g.position.set(x, M.y, z); R.add(g);
    kpiece(g, 'fy_rock_medium_4', 0, 0, 0, rnd() * TAU, 1.3);
    const fruit = new THREE.Group(); g.add(fruit);
    const mat = lmat({ color: N.col, emissive: type === 'crystal' ? '#287b9a' : '#131313', emissiveIntensity: type === 'crystal' ? 1 : 0.15, flatShading: true });
    for (let i = 0; i < 7; i++) { const a = i * TAU / 7; const c = mk(fruit, geo('mine_ore', () => new THREE.OctahedronGeometry(0.22)), mat, Math.cos(a) * 0.6, 0.5 + (i % 3) * 0.23, Math.sin(a) * 0.6); if (type === 'crystal') c.scale.y = 2; }
    const lab = townLabel(N.name, `⛏️ Mining ${N.lvl}`, N.col); lab.position.y = 2.9; g.add(lab);
    const node = { id: 'deep:' + type, type, N, g, fruit, x, z, ax: x + 1.8, az: z + 1.4, until: 0, lab, mine: true };
    GATHER.nodes.push(node);
    TOWN.stalls.push({ V: { key: 'n:deep:' + type, name: N.name, role: `Mining ${N.lvl}`, icon: '⛏️' }, g, x, z, ax: node.ax, az: node.az, label: lab, node, mine: true, open: () => startGather(node), verb: 'Mine' });
    TOWN.mineObst.push({ x, z, r: 1 });
  }
  R.visible = false;
}

function drawDeepMineMap(ctx, w, h, round) {
  const M = DEEP_MINE, k = Math.min(w, h) / 70, X = x => w / 2 + (x - M.x) * k, Y = z => h / 2 + (z - M.z) * k;
  ctx.save(); ctx.fillStyle = '#171c20'; ctx.fillRect(0, 0, w, h);
  if (round) { ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 2, 0, TAU); ctx.clip(); }
  ctx.fillStyle = '#4a4844'; ctx.fillRect(X(M.x - 29), Y(M.z - 29), 58 * k, 58 * k);
  ctx.fillStyle = '#766c58'; ctx.fillRect(X(M.x - 4), Y(M.z - 25), 8 * k, 50 * k);
  ctx.fillStyle = '#265e68'; ctx.beginPath(); ctx.arc(X(M.x + 11), Y(M.z - 16), 10 * k, 0, TAU); ctx.fill();
  ctx.fillStyle = '#b7f3ff'; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.arc(X(M.x + 10 + Math.cos(a) * 5), Y(M.z - 17 + Math.sin(a) * 5), 2.5, 0, TAU); ctx.fill(); }
  for (const n of GATHER.nodes.filter(n => n.mine)) { ctx.fillStyle = n.N.col; ctx.beginPath(); ctx.arc(X(n.x), Y(n.z), 4, 0, TAU); ctx.fill(); }
  ctx.font = `bold ${w < 300 ? 10 : 12}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#f0dbb1';
  if (!round) { if (w >= 300) ctx.fillText('OLD WOODS DEEP MINE', w / 2, 22); ctx.fillText('CRYSTAL GROTTO', X(M.x + 12), Y(M.z - 25)); ctx.fillText('HAULAGE', X(M.x - 16), Y(M.z + 16)); ctx.fillText('SURFACE LIFT', X(M.x), Y(M.z + 26)); }
  ctx.fillStyle = '#ff4a43'; ctx.beginPath(); ctx.arc(X(TOWN.pos.x), Y(TOWN.pos.z), 5, 0, TAU); ctx.fill();
  ctx.restore();
}
function openDeepMineMap() {
  townPanel('Old Woods Deep Mine', box => {
    const cv = h('canvas', { 'aria-label': 'Map of the Old Woods Deep Mine' }); box.append(cv);
    const size = Math.max(220, Math.min(500, window.innerWidth - 75, window.innerHeight - 170)); cv.width = size; cv.height = size; cv.style.width = '100%'; cv.style.maxWidth = size + 'px';
    drawDeepMineMap(cv.getContext('2d'), size, size, false);
    box.append(h('p', { class: 'muted' }, 'The lift is at the south end. Ore seams line the west wall; the crystal grotto lies northeast. Mining still requires the right skill and pick.'),
      h('button', { class: 'btn primary flagtape', onclick: () => { closeVendor(); mineChange(false); } }, 'Ride the lift to the surface'));
  });
}
