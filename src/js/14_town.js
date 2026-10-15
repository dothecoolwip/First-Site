// ---------- the town: walk around outside the list and buy from the vendors ----------
// Uses the field venue (tents, cottages, the crowd at the rope) with ten market stalls around it, your house at the south end and,
// if you paid for one, a statue of you in the middle. Walk with the move stick (or WASD / left stick), turn the camera with the
// right stick, Q / E or a drag on the right of the screen, and press A / E / Space or tap the bubble to talk to a vendor.
const TOWN = { on: false, root: null, me: null, people: false, pos: { x: 0, z: 26 }, face: 0, yaw: Math.PI, pitch: 0.36, dist: 7.5, prevVenue: null, near: null, stalls: [], obst: [], actPrev: true, home: null, statue: null, cam: null, look: null, fpYaw: 0, vendor: null };
// where everything is: a medieval festival around the lists (see 14d_festival.js for the plan)
const TOWN_RX = 900, TOWN_RZ = 850; // linked cities form a closer, continuous circuit
const STALL_AT = { quarter: [-11, 35], herald: [-11, 45], wardrobe: [-12.5, 56], barber: [-23, 56], estate: [11, 50], smith: [-38, 22], armour: [-38, 10], guild: [-38, -2], artificer: [-38, -13], trainer: [-38, -30], wizard: [-24, -46], tavern: [36, 20], bard: [37, 5], ghost: [44, -47.4] };
const STALL_FACE = { quarter: Math.PI / 2, herald: Math.PI / 2, wardrobe: Math.PI / 2, barber: Math.PI / 2, estate: -Math.PI / 2, smith: Math.PI / 2, armour: Math.PI / 2, guild: Math.PI / 2, artificer: Math.PI / 2, trainer: Math.PI / 2, tavern: -Math.PI / 2, bard: -Math.PI / 2, ghost: 0 };
const HOME_AT = [-42, 54], STATUE_AT = [0, 58];
const LIST_BLOCK = { x: LIST.W / 2 + 4, z: LIST.L / 2 + 4 }; // field venue's visible rope

function townLabel(top, sub, col) {
  const c = cvs(512, 150), x = c.getContext('2d');
  x.fillStyle = 'rgba(12,14,16,.78)'; x.beginPath(); x.roundRect ? x.roundRect(6, 6, 500, 138, 22) : x.rect(6, 6, 500, 138); x.fill();
  x.fillStyle = col || '#f2c40f'; x.fillRect(6, 132, 500, 12);
  x.textAlign = 'center'; x.fillStyle = '#f4efe3'; x.font = '700 54px "Barlow Semi Condensed", sans-serif'; x.fillText(top, 256, 66);
  x.fillStyle = '#c9c2b2'; x.font = '600 38px "Barlow Semi Condensed", sans-serif'; x.fillText(sub, 256, 114);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFrom(c), transparent: true, depthWrite: false }));
  sp.scale.set(2.3, 0.67, 1); return sp;
}
function townSign(text, col) {
  const c = cvs(512, 112), x = c.getContext('2d');
  x.fillStyle = '#3a2a1a'; x.fillRect(0, 0, 512, 112); x.fillStyle = col; x.fillRect(8, 8, 496, 96);
  x.fillStyle = '#f7f1e3'; x.textAlign = 'center'; x.font = '900 60px "Big Shoulders Display", sans-serif'; x.fillText(text.toUpperCase(), 256, 78);
  const g = new THREE.Group(), face = new THREE.PlaneGeometry(2.5, 0.55), mat = lmat({ map: texFrom(c), roughness: 0.9 });
  const front = new THREE.Mesh(face, mat), back = new THREE.Mesh(face, mat);
  front.position.z = 0.005; back.position.z = -0.005; back.rotation.y = Math.PI; g.add(front, back);
  return g;
}
const TMAT = {};
// this three.js takes hex colours as linear, which washes picked colours out; the town converts them so they look as chosen
function lmat(o) { if (o && (typeof o.color === 'string' || typeof o.color === 'number')) o = Object.assign({}, o, { color: new THREE.Color(o.color).convertSRGBToLinear() }); return new THREE.MeshStandardMaterial(o); }
function tmat(col, o) { return TMAT[col] || (TMAT[col] = new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.85 }, o || {}))); }
function townPerson(o) {
  o = Object.assign({}, o, { main: new THREE.Color(o.main || '#1a1d21').convertSRGBToLinear(), joints: new THREE.Color(o.joints || '#2a2e33').convertSRGBToLinear() });
  if (typeof UAL !== 'undefined' && UAL.ready) { const J = ualPerson(o); return J; }
  const J = buildPerson({ top: o.main, pants: o.joints || '#22262b' }); return J;
}
// a market stall: counter, posts, an awning in the vendor's colour, a sign, the vendor behind the counter and a few props
function buildStall(V) {
  if (V.siteBuilding && typeof buildCityVendor === 'function') return buildCityVendor(V);
  const [x, z] = STALL_AT[V.key], ry = STALL_FACE[V.key] != null ? STALL_FACE[V.key] : Math.atan2(0 - x, 22 - z);
  const g = new THREE.Group(); g.position.set(x, gy(x, z), z); g.rotation.y = ry; TOWN.root.add(g);
  const wood = tmat('#6e4d31'), dark = tmat('#4a3422');
  mk(g, geo('t_counter', () => new THREE.BoxGeometry(2.8, 1.0, 0.7)), wood, 0, 0.5, 0);
  mk(g, geo('t_top', () => new THREE.BoxGeometry(2.95, 0.08, 0.85)), dark, 0, 1.03, 0);
  for (const [px, pz] of [[-1.4, 0.38], [1.4, 0.38], [-1.4, -1.7], [1.4, -1.7]]) mk(g, geo('t_post', () => new THREE.CylinderGeometry(0.06, 0.07, 2.7, 6)), dark, px, 1.35, pz);
  const awn = mk(g, geo('t_awn', () => new THREE.BoxGeometry(3.2, 0.07, 2.6)), tmat(V.awn), 0, 2.72, -0.65); awn.rotation.x = 0.16;
  for (let i = 0; i < 6; i++) mk(g, geo('t_flap', () => new THREE.BoxGeometry(0.5, 0.32, 0.03)), tmat(i % 2 ? '#f1ead8' : V.awn), -1.3 + i * 0.52, 2.42, 0.62);
  const sign = townSign(V.role, V.awn); sign.position.set(0, 3.25, 0.5); g.add(sign);
  stallProps(g, V);
  const npc = costumeOr({ main: V.col, joints: '#2a2e33', h: V.key === 'tavern' ? 1.7 : V.key === 'trainer' ? 1.84 : 1.78, anim: 'Idle_Loop' }, vendorOutfit(V));
  npc.root.position.set(0, 0, -0.85); g.add(npc.root); npcProps(npc, V);
  const lab = townLabel(V.name, `${V.icon} ${V.role}`, V.awn); lab.position.set(0, 4.05, 0.2); g.add(lab);
  const fx = Math.sin(ry), fz = Math.cos(ry);
  const S = { V, g, npc, ry, x, z, ax: x + fx * 1.7, az: z + fz * 1.7, label: lab };
  TOWN.stalls.push(S);
  TOWN.obst.push({ x: x - fx * 0.6, z: z - fz * 0.6, r: 1.85 });
  return S;
}
function stallProps(g, V) {
  const k = V.as || V.key;
  if (k === 'smith') { const anvil = grp(g, 0.9, 1.07, 0.05); mk(anvil, geo('t_anv', () => new THREE.BoxGeometry(0.45, 0.16, 0.2)), tmat('#2b2e31', { metalness: 0.6, roughness: 0.4 }), 0, 0.08, 0); try { const w = buildWeapon('longaxe', CLUBS.reavers); w.position.set(-0.8, 1.1, 0.1); w.rotation.z = Math.PI / 2; g.add(w); } catch (e) { } const forge = mk(g, geo('t_forge', () => new THREE.BoxGeometry(1, 0.9, 0.9)), tmat('#5c514a'), -2.2, 0.45, -0.8); mk(forge, geo('t_coal', () => new THREE.BoxGeometry(0.7, 0.05, 0.6)), tmat('#ff6a1a', { emissive: '#ff4a00', emissiveIntensity: 1.2 }), 0, 0.47, 0); }
  else if (k === 'artificer') { [['fw_dragonfang', 'sword', -0.8], ['orc_skullsplitter', 'axe', 0], ['fw_crystal', 'mace', 0.8]].forEach(([sk, wk, x]) => { const w = buildSkinWeapon(sk, wk); if (w) { w.position.set(x - 0.2, 1.1, 0.05); w.rotation.set(0, 0, -Math.PI / 2 + 0.15); g.add(w); } }); }
  else if (k === 'armour') { try { const hd = grp(g, -0.7, 1.25, 0); buildHelmet(hd, 'pigface'); hd.scale.setScalar(1.1); const hd2 = grp(g, 0.6, 1.25, 0); buildHelmet(hd2, 'greathelm'); } catch (e) { } }
  else if (k === 'quarter') { for (let i = 0; i < 7; i++) { const t = Object.values(TAPES)[i % 8]; const r = mk(g, geo('t_roll', () => new THREE.TorusGeometry(0.09, 0.05, 6, 12)), tmat(t.color), -1.1 + i * 0.36, 1.13, 0.1); r.rotation.x = Math.PI / 2; } mk(g, geo('t_crate', () => new THREE.BoxGeometry(0.7, 0.6, 0.7)), tmat('#8a6a42'), 1.9, 0.3, -0.3); }
  else if (k === 'wizard') { mk(g, geo('t_orb', () => new THREE.SphereGeometry(0.16, 16, 12)), tmat('#a98bff', { emissive: '#6a3cff', emissiveIntensity: 1.1, roughness: 0.2 }), 0.7, 1.25, 0.05); for (let i = 0; i < 4; i++) mk(g, geo('t_pot', () => new THREE.CylinderGeometry(0.06, 0.08, 0.2, 8)), tmat(['#ff4d6d', '#4dd6ff', '#7cff6b', '#ffd24d'][i], { emissive: ['#5a0010', '#004a5a', '#105a00', '#5a4200'][i] }), -1.1 + i * 0.25, 1.17, 0.1); }
  else if (k === 'tavern') { for (const [bx, bz] of [[-2.1, -0.4], [-2.1, 0.5], [2.1, -0.2]]) { const b = mk(g, geo('t_barrel', () => new THREE.CylinderGeometry(0.4, 0.4, 0.95, 12)), tmat('#7a5230'), bx, 0.48, bz); b.castShadow = true; } for (let i = 0; i < 3; i++) mk(g, geo('t_mug', () => new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8)), tmat('#c9b48a'), -0.5 + i * 0.3, 1.14, 0.1); }
  else if (k === 'trainer') { const pell = mk(g, geo('t_pell', () => new THREE.CylinderGeometry(0.12, 0.14, 1.8, 8)), tmat('#8a6a42'), 2.3, 0.9, 0.4); pell.castShadow = true; mk(g, geo('t_bag', () => new THREE.CylinderGeometry(0.22, 0.22, 0.9, 10)), tmat('#6b3a2a'), -2.2, 1.4, -0.4); }
  else if (k === 'herald') { for (let i = 0; i < 4; i++) { const c = SHOP_TABARDS[i * 2][0]; const cl = mk(g, geo('t_cloth', () => new THREE.PlaneGeometry(0.5, 0.9)), lmat({ color: c, side: THREE.DoubleSide }), -1.1 + i * 0.72, 1.85, -1.68); cl.castShadow = true; } }
  else if (k === 'bard') { const st = mk(g, geo('t_stool', () => new THREE.CylinderGeometry(0.22, 0.22, 0.5, 8)), tmat('#6e4d31'), 1.9, 0.25, 0.4); st.castShadow = true; }
  else if (k === 'guild') { const pole = mk(g, geo('t_bpole', () => new THREE.CylinderGeometry(0.04, 0.04, 4.2, 6)), tmat('#4a3422'), 2.0, 2.1, 0.3); const fl = mk(g, geo('t_bflag', () => new THREE.PlaneGeometry(1.1, 0.7)), lmat({ color: CAREER.club.tabard, side: THREE.DoubleSide }), 2.55, 3.8, 0.3); TOWN.flag = fl; }
  else if (k === 'estate') { const plan = mk(g, geo('t_plan', () => new THREE.PlaneGeometry(0.8, 0.55)), tmat('#e9dfc6'), 0, 1.075, 0.05); plan.rotation.x = -Math.PI / 2; }
}
function npcProps(J, V) {
  if (V.as) V = VENDOR_BY[V.as] || V;
  const B = J.bones || {}, head = B.Head || J.torso || J.root;
  if (V.key === 'wizard') { const hat = grp(head, 0, J.ual ? 0.2 : 0.75, 0); mk(hat, geo('t_hat', () => new THREE.ConeGeometry(0.16, 0.5, 14)), tmat('#2a1a5a'), 0, 0.22, 0); mk(hat, geo('t_brim', () => new THREE.CylinderGeometry(0.27, 0.27, 0.02, 18)), tmat('#2a1a5a'), 0, 0, 0); for (let i = 0; i < 3; i++) mk(hat, geo('t_star', () => new THREE.OctahedronGeometry(0.03)), tmat('#ffd24d', { emissive: '#7a5a00' }), Math.cos(i * 2) * 0.11, 0.12 + i * 0.09, Math.sin(i * 2) * 0.11); if (J.handR) { const st = grp(J.handR, 0, 0.05, 0); mk(st, geo('t_staff', () => new THREE.CylinderGeometry(0.02, 0.025, 1.6, 6)), tmat('#5a3b24'), 0, 0.3, 0); mk(st, geo('t_gem', () => new THREE.OctahedronGeometry(0.07)), tmat('#9b7bff', { emissive: '#5a2cff', emissiveIntensity: 1.2 }), 0, 1.12, 0); } }
  else if (V.key === 'smith' && J.handR) { const hm = grp(J.handR, 0, 0.06, 0.02); mk(hm, geo('t_hh', () => new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6)), tmat('#5a3b24'), 0, 0.12, 0); mk(hm, geo('t_hhead', () => new THREE.BoxGeometry(0.1, 0.07, 0.16)), tmat('#2b2e31', { metalness: 0.6 }), 0, 0.32, 0); }
  else if (V.key === 'bard' && J.handR) { const lute = grp(J.handR, 0.05, 0.05, 0.05); mk(lute, geo('t_lute', () => new THREE.SphereGeometry(0.15, 12, 10)), tmat('#a8743a'), 0, 0.12, 0).scale.z = 0.4; mk(lute, geo('t_neck', () => new THREE.BoxGeometry(0.04, 0.4, 0.03)), tmat('#5a3b24'), 0, 0.4, 0); }
  else if (V.key === 'guild' || V.key === 'estate') { const cap = grp(head, 0, J.ual ? 0.14 : 0.7, 0); mk(cap, geo('t_cap', () => new THREE.CylinderGeometry(0.12, 0.13, 0.12, 12)), tmat(V.key === 'guild' ? '#6d1b28' : '#3a2a1a'), 0, 0.03, 0); }
}
// your house at the south end grows with every purchase
function buildHome() {
  if (TOWN.home) { TOWN.root.remove(TOWN.home); TOWN.home = null; }
  const lv = shopState().home; const g = new THREE.Group(); g.position.set(HOME_AT[0], 0, HOME_AT[1]); TOWN.root.add(g); TOWN.home = g;
  const C = CAREER.club;
  const plot = mk(g, geo('t_plot', () => new THREE.PlaneGeometry(14, 11)), lmat({ map: venueTex('path'), color: '#a08a64', roughness: 1 }), 0, 0.03, 0, false); plot.rotation.x = -Math.PI / 2; plot.receiveShadow = true;
  const pole = mk(g, geo('t_hpole', () => new THREE.CylinderGeometry(0.05, 0.05, 4, 6)), tmat('#4a3422'), -5.5, 2, -4.2);
  const fl = mk(g, geo('t_hflag', () => new THREE.PlaneGeometry(1, 0.62)), lmat({ color: C.tabard, side: THREE.DoubleSide }), -5, 3.65, -4.2); fl.castShadow = true;
  const sg = townSign(lv ? 'Your ' + HOMES[lv].name : 'Plot for sale', lv ? C.tabard : '#6b5a2a'); sg.position.set(3.5, 1.2, -4.8); g.add(sg);
  for (const sx of [3.0, 4.0]) mk(g, geo('t_spost', () => new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6)), tmat('#4a3422'), sx, 0.6, -4.85);
  if (lv === 1) { const mat = lmat({ color: C.tabard, roughness: 0.9, side: THREE.DoubleSide }); mk(g, geo('t_tw', () => new THREE.CylinderGeometry(2.2, 2.2, 2, 14, 1, true)), mat, 0, 1, 0); mk(g, geo('t_tr', () => new THREE.ConeGeometry(2.6, 1.8, 14)), mat, 0, 2.9, 0); }
  if (lv >= 2 && typeof cottage === 'function' && typeof VILLAGE_GEO !== 'undefined') {
    const s = lv >= 3 ? 1.25 : 1, c = cottage(g, 0, 0.5, Math.PI, 'home' + lv); c.scale.setScalar(s);
    if (lv >= 4) { const c2 = cottage(g, -4.6, 1.5, Math.PI, 'homeB'); c2.scale.setScalar(0.85); }
  } else if (lv >= 2) mk(g, geo('t_house', () => new THREE.BoxGeometry(4, 3, 5)), tmat('#d9ccb0'), 0, 1.5, 0);
  if (lv >= 5) { const stone = tmat('#8f877c'); const tw = mk(g, geo('t_keep', () => new THREE.CylinderGeometry(1.8, 2, 8, 12)), stone, 4.6, 4, 1.5); tw.castShadow = true; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; mk(g, geo('t_cren', () => new THREE.BoxGeometry(0.5, 0.6, 0.5)), stone, 4.6 + Math.cos(a) * 1.7, 8.3, 1.5 + Math.sin(a) * 1.7); } const kf = mk(g, geo('t_kflag', () => new THREE.PlaneGeometry(1.4, 0.8)), lmat({ color: C.tabard, side: THREE.DoubleSide }), 5.3, 10, 1.5); kf.castShadow = true; mk(g, geo('t_kpole', () => new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6)), tmat('#4a3422'), 4.6, 9.5, 1.5); }
  TOWN.obst = TOWN.obst.filter(o => !o.home);
  if (lv) TOWN.obst.push({ x: HOME_AT[0], z: HOME_AT[1] + 0.5, r: lv >= 3 ? 3.6 : 3, home: true });
  if (lv >= 4) TOWN.obst.push({ x: HOME_AT[0] - 4.6, z: HOME_AT[1] + 1.5, r: 2.6, home: true });
  if (lv >= 5) TOWN.obst.push({ x: HOME_AT[0] + 4.6, z: HOME_AT[1] + 1.5, r: 2.2, home: true });
}
function buildStatue() {
  if (TOWN.statue) { TOWN.root.remove(TOWN.statue); TOWN.statue = null; }
  const s = shopState(); TOWN.obst = TOWN.obst.filter(o => !o.statue); if (!s.owned.statue) return;
  const g = new THREE.Group(); g.position.set(STATUE_AT[0], 0, STATUE_AT[1]); TOWN.root.add(g); TOWN.statue = g;
  mk(g, geo('t_ped', () => new THREE.BoxGeometry(1.8, 1.1, 1.8)), tmat('#8f877c'), 0, 0.55, 0);
  const mat = s.owned.gold ? lmat({ color: '#e3b341', metalness: 0.85, roughness: 0.25 }) : lmat({ color: '#b9b4a8', roughness: 0.95 });
  const J = townPerson({ main: '#b9b4a8', h: 2.2, anim: 'Idle_Loop' }); J.root.position.y = 1.1; J.root.rotation.y = Math.PI;
  J.root.traverse(o => { if (o.isMesh) o.material = mat; }); g.add(J.root);
  if (J.mixer) J.mixer.update(1.3); // strike a pose, then stay still forever
  try { const w = buildMyWeapon(G.loadout && G.loadout.weapon || 'sword', CLUBS.reavers); w.traverse(o => { if (o.isMesh) o.material = mat; }); if (J.handR) { w.position.set(0, 0.08, 0.02); J.handR.add(w); } } catch (e) { }
  const pl = townSign(CAREER.name === 'You' ? 'Our champion' : CAREER.name, '#5c514a'); pl.scale.setScalar(0.6); pl.position.set(0, 0.6, -0.91); pl.rotation.y = Math.PI; g.add(pl);
  TOWN.obst.push({ x: STATUE_AT[0], z: STATUE_AT[1], r: 1.4, statue: true });
}
function buildAvatar() {
  if (TOWN.me) TOWN.root.remove(TOWN.me.root);
  const L = lookLite(); const J = lookPerson(L, L.ht); TOWN.me = J;
  // This rig moves with the player. Never fold it into a distant scenery cell.
  J.root.userData.dyn = true; TOWN.root.add(J.root);
  fighterGlow({model:J,isPlayer:true,spec:{player:true},name:myName(),club:CLUBS.reavers});
  if (G.guildLabel !== false && guildTag()) { const gl = townLabel(`[${guildTag()}]`, (guildState() || {}).name || '', (guildState() || {}).col); gl.scale.multiplyScalar(0.7); gl.position.y = 2.3; J.root.add(gl); }
  const ring = mk(J.root, geo('t_ring', () => new THREE.RingGeometry(0.42, 0.5, 24)), new THREE.MeshBasicMaterial({ color: '#f2c40f', transparent: true, opacity: 0.7, depthWrite: false }), 0, 0.04, 0, false); ring.rotation.x = -Math.PI / 2;
}
function townResolveApproaches() {
  // Props, gather nodes and new walls are all built by this point. Give every
  // interaction a real standing spot, on the same terrace as its object.
  for (const S of TOWN.stalls) {
    if (S.mine || S.x == null || S.z == null || !navBlocked(S.ax, S.az, 0.42)) continue;
    const tier = tierOf(S.x, S.z);
    let best = null, score = Infinity;
    for (let radius = 1.8; radius <= 4.2; radius += 0.4) for (let i = 0; i < 24; i++) {
      const angle = i * TAU / 24, x = S.x + Math.sin(angle) * radius, z = S.z + Math.cos(angle) * radius;
      if (tierOf(x, z) !== tier || navBlocked(x, z, 0.42)) continue;
      const cost = Math.hypot(x - S.ax, z - S.az) + radius * 0.1;
      if (cost < score) { best = { x, z }; score = cost; }
    }
    if (best) { S.ax = best.x; S.az = best.z; if (S.node) { S.node.ax = best.x; S.node.az = best.z; } }
  }
}
function buildTown() {
  worldMapReset();
  gameplayStop();
  if (TOWN.root) W3.scene.remove(TOWN.root);
  TOWN.root = new THREE.Group(); W3.scene.add(TOWN.root); TOWN.stalls = []; TOWN.obst = []; TOWN.home = null; TOWN.statue = null; SPECT.seated = [];
  TOWN.people = typeof UAL !== 'undefined' && UAL.ready;
  // the venue's club tents stay (they're the visiting clubs' pavilions); its cottages and tree ring are hidden in town
  const RX = LIST.W / 2 + 4, RZ = LIST.L / 2 + 4;
  for (const [x, z] of [[-RX - 9, -10], [-RX - 10, 4], [-RX - 9, 16], [RX + 9, -14], [RX + 10, 2], [RX + 9, 15], [-8, -RZ - 10], [9, -RZ - 10]]) TOWN.obst.push({ x, z, r: 2.7 });
  for (const V of VENDORS) if (!V.custom) buildStall(V);
  buildSpecialVendors(); buildWorld(); buildSpawnBoards(); navBuild(); buildGatherNodes(TOWN.root); buildSecrets(TOWN.root); navBuild();
  buildHome(); buildStatue(); buildAvatar(); buildMyPet(); buildWaypoint(); buildAnimals(); buildArenaSeats(); buildDeepMine(); navBuild(); squireBuildTown();
  if (MAP_WORLD.data.props.length) worldMapApply();
  realmCells();
  townResolveApproaches();
  folkSpots(); // approaches and reservations use the final world obstacle set
  gameplayStart();
}
// the field venue's own cottages and tree ring would sit in the middle of the festival: hide them in town
function venueExtras(on) { for (const o of (W3.venueExtras || [])) o.visible = on; if (W3.venueGrass) W3.venueGrass.visible = on; if (on) townCrowd(true); }
function townRefresh() { if (!TOWN.on) return; buildHome(); buildStatue(); navBuild(); }

function townSavePosition(force = false) {
  if (!TOWN.on || TOWN.mineOn || !BOS.user || !Number.isFinite(TOWN.pos.x) || !Number.isFinite(TOWN.pos.z)) return;
  const old = CAREER.townPosition, now = Date.now();
  if (!force && old && now - old.savedAt < 10000) return;
  if (!force && old && Math.hypot(TOWN.pos.x - old.x, TOWN.pos.z - old.z) < 1) return;
  CAREER.townPosition = { x: Math.round(TOWN.pos.x * 10) / 10, z: Math.round(TOWN.pos.z * 10) / 10,
    face: Math.round(TOWN.face * 100) / 100, savedAt: now, layoutVersion: 2 };
  saveCareer();
}

function townRestoredPosition(saved) {
  if (!saved || saved.layoutVersion >= 2 || !Number.isFinite(saved.x) || !Number.isFinite(saved.z)) return saved;
  const oldCities = [
    { x: -840, z: -250, dx: 330, dz: 0 },
    { x: 890, z: 140, dx: -360, dz: 0 },
    { x: -90, z: 900, dx: 0, dz: -280 },
    { x: 0, z: -1030, dx: 0, dz: 340 }
  ];
  const city = oldCities.find(c => Math.hypot(saved.x - c.x, saved.z - c.z) < 225);
  const restored = { ...saved, x: saved.x + (city ? city.dx : 0), z: saved.z + (city ? city.dz : 0), layoutVersion: 2 };
  CAREER.townPosition = restored; // Persist on the next ordinary position save.
  return restored;
}

function enterTown(vendorKey) {
  // Legacy saves with onboarding marked complete still require a real login.
  if (typeof onbAccountGate === 'function' && onbAccountGate(true)) return;
  initLobby();
  AU.init(); G.hub = true; if (typeof onbStage === 'function' && onbStage() === 'tour') setTimeout(() => { if (TOWN.on && TOWN.people) tourStart(); else setTimeout(() => TOWN.on && tourStart(), 2500); }, 1200); if (typeof LOBBY !== 'undefined' && LOBBY.pending) setTimeout(showInvite, 400);
  BOUT.on = false; clearMatch(); G.attract = false; G.autopilot = false; G.tourney = null; G.paused = false; G.phase = 'town'; G.match = null;
  setHud(false); endTraining && endTraining();
  TOWN.prevVenue = TOWN.prevVenue || W3.venue; setVenue('field');
  if (!TOWN.light) { TOWN.light = { sun: W3.sun.intensity, hemi: W3.hemi.intensity }; W3.sun.intensity = 1.6; W3.hemi.intensity = 0.75; }
  realmView(true); // the field's sun is tuned for steel; soften it for cloth and faces
  setWeather && setWeather('clear');
  TOWN.busy = false; GATHER.on = null; { const ge = $('#gather'); if (ge) ge.hidden = true; }
  buildTown(); TOWN.on = true; TOWN.actPrev = true; TOWN.vendor = null;
  const S0 = vendorKey && TOWN.stalls.find(s => s.V.key === vendorKey);
  if (S0) { TOWN.pos = { x: S0.ax + Math.sin(S0.ry) * 1.6, z: S0.az + Math.cos(S0.ry) * 1.6 }; TOWN.yaw = S0.ry; TOWN.face = S0.ry + Math.PI; }
  else if (TOWN.matchExit) { TOWN.pos = { ...TOWN.matchExit }; TOWN.matchExit = null; TOWN.yaw = 0; TOWN.face = Math.PI; }
  else {
    const saved = BOS.user && townRestoredPosition(CAREER.townPosition);
    const valid = saved && Number.isFinite(saved.x) && Number.isFinite(saved.z) &&
      Math.hypot(saved.x / TOWN_RX, saved.z / TOWN_RZ) < 0.95 && !navBlocked(saved.x, saved.z, 0.5);
    TOWN.pos = valid ? { x: saved.x, z: saved.z } : { x: 0, z: 31 };
    TOWN.yaw = 0; TOWN.face = valid && Number.isFinite(saved.face) ? saved.face : Math.PI;
  }
  squireBuildTown();
  TOWN.cam = null; TOWN.fpYaw = FP.yaw;
  document.body.classList.add('intown'); venueExtras(false); showScreen(null); $('#townHud').hidden = false; townHudUpdate(); refreshTouchUI();
  AU.music && AU.music(false); AU.market && AU.market(true); AU.setCrowd && AU.setCrowd(0.02);
  setTimeout(() => { if (TOWN.on && !BOUT.on) boutStart(); }, 1200); // there's always a fight on in the list
  if (!store.get('townSeen', false)) { store.set('townSeen', true); setTimeout(() => toastMenu('Walk up to a stall and talk to the vendor. Map shows who sells what.'), 600); }
}
// leave without going anywhere (a match is starting)
function townTeardown() {
  if (!TOWN.on) return; boutStop(); GATHER.on = null; TOWN.busy = false; { const ge = $('#gather'); if (ge) ge.hidden = true; }
  townSavePosition(true);
  gameplayStop();
  AU.market && AU.market(false);
  TOWN.mineOn = false;
  if (TOWN.light) { W3.sun.intensity = TOWN.light.sun; W3.hemi.intensity = TOWN.light.hemi; TOWN.light = null; }
  realmView(false);
  TOWN.on = false; G.phase = ''; document.body.classList.remove('intown'); venueExtras(true); $('#townHud').hidden = true; $('#townPrompt').hidden = true;
  if (TOWN.root) { W3.scene.remove(TOWN.root); TOWN.root = null; } TOWN.me = null; TOWN.stalls = [];
  try { lobbySet({ tw: null }); WORLD.lastTw = 0; } catch (e) { }
  if (TOWN.prevVenue) { setVenue(TOWN.prevVenue); TOWN.prevVenue = null; }
}
function leaveTown(next) {
  if (!TOWN.on) { if (next) next(); return; }
  townSavePosition(true);
  boutStop(); GATHER.on = null; TOWN.busy = false; { const ge = $('#gather'); if (ge) ge.hidden = true; }
  gameplayStop();
  AU.market && AU.market(false);
  TOWN.mineOn = false;
  if (TOWN.light) { W3.sun.intensity = TOWN.light.sun; W3.hemi.intensity = TOWN.light.hemi; TOWN.light = null; }
  realmView(false);
  try { lobbySet({ tw: null }); WORLD.lastTw = 0; } catch (e) { }
  TOWN.on = false; G.phase = ''; document.body.classList.remove('intown'); venueExtras(true); $('#townHud').hidden = true; $('#townPrompt').hidden = true;
  if (TOWN.root) { W3.scene.remove(TOWN.root); TOWN.root = null; }
  TOWN.me = null; TOWN.stalls = [];
  if (TOWN.prevVenue) { setVenue(TOWN.prevVenue); TOWN.prevVenue = null; }
  refreshTouchUI();
  if (next) next(); else { G.hub = false; toTitle({ home: true }); }
}
function townHudUpdate() { const p = $('#townPurse'); if (p) p.textContent = typeof BOS !== 'undefined' && BOS.testAdmin ? '∞' : fmtMoney(CAREER.purse); }
// walking, camera, who you're next to
function updateTown(dt) {
  if (!TOWN.on) return; updateMiniMap(dt);
  boardTick();
  if (!TOWN.people && !TOWN.mineOn && typeof UAL !== 'undefined' && UAL.ready) { const keep = { ...TOWN.pos }; buildTown(); TOWN.pos = keep; }
  updateGather(dt);
  const walking = !G.screen && !G.paused && !TOWN.busy;
  const k = IN.keys;
  if (walking) {
    TOWN.yaw -= (PIN.rx || 0) * 2.6 * dt;
    TOWN.pitch = clamp(TOWN.pitch + (PIN.ry || 0) * 1.2 * dt * (G.settings.invert ? -1 : 1), 0.12, 0.95);
    if (k.KeyQ) TOWN.yaw += 2 * dt; if (k.KeyE && !TOWN.near) TOWN.yaw -= 2 * dt;
    if (FP.yaw !== TOWN.fpYaw) { TOWN.yaw += (FP.yaw - TOWN.fpYaw); } // a drag on the look pad turns the camera
  }
  TOWN.fpYaw = FP.yaw;
  let mx = walking ? PIN.raw.x : 0, my = walking ? PIN.raw.y : 0;
  if (isCtl() && IN.mode === 'kb' && walking) { mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0); my = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0); }
  const m = Math.min(1, Math.hypot(mx, my)), sy = Math.sin(TOWN.yaw), cy = Math.cos(TOWN.yaw);
  let vx = 0, vz = 0;
  const sprint = (PIN.sprint || k.ShiftLeft || k.ShiftRight || m > 0.95 && IN.mode === 'pad' && my > 0.9) && !(TOWN.winded && !TOWN.mounted && !(typeof BOS !== 'undefined' && BOS.testAdmin));
  const base = (TOWN.mounted ? (sprint ? 9 : 5) : (sprint ? 5.4 : 2.7)) * (typeof BOS !== 'undefined' && BOS.testAdmin ? (TOWN.testRunSpeed || 1) : 1);
  if (m > 0.05 && TOWN.spec) stopSpectating();
  if (m > 0.05) {
    const spd = base * m; if (TRAVEL.auto) TRAVEL.auto = false;
    vx = (-sy * my + cy * mx); vz = (-cy * my - sy * mx); const l = Math.hypot(vx, vz) || 1; vx = vx / l * spd; vz = vz / l * spd;
  } else if (walking) { const speed = (TOWN.mounted ? 7 : 4.2) * (typeof BOS !== 'undefined' && BOS.testAdmin ? (TOWN.testRunSpeed || 1) : 1); const a = travelAutoVel(speed, dt); if (a) { vx = a.vx; vz = a.vz; } }
  const beforeMove = { x: TOWN.pos.x, z: TOWN.pos.z };
  if (vx || vz) {
    // At Creator speeds a single frame can cross a thin wall or gate. Resolve
    // each short leg before proceeding so movement cannot tunnel through it.
    const steps = Math.max(1, Math.ceil(Math.hypot(vx, vz) * dt / 0.4));
    for (let i = 0; i < steps; i++) {
      const prior = { x: TOWN.pos.x, z: TOWN.pos.z };
      gameplayMove(TOWN.pos, vx * dt / steps, vz * dt / steps);
      townCollide(prior);
    }
    const want = Math.atan2(vx, vz); let d = want - TOWN.face; d = Math.atan2(Math.sin(d), Math.cos(d)); TOWN.face += d * Math.min(1, dt * (TOWN.mounted ? 5 * (1 + 0.1 * (CAREER.riding?.rank || 0)) : 10));
  }
  if (!vx && !vz) townCollide(beforeMove);
  if (typeof trainingTownTick === 'function') trainingTownTick(beforeMove, walking, sprint);
  if (walking && (vx || vz)) townSavePosition();
  if (typeof playtestTick === 'function') playtestTick();
  const J = TOWN.me, sp = Math.hypot(vx, vz); TOWN.speed = sp;
  realmTick(dt); updateAnimals(dt);
  if (walking && TOWN.keyPrev !== undefined) { if (k.KeyH && !TOWN.keyPrev.h) callHorse(); if (k.KeyR && !TOWN.keyPrev.r && TOWN.wp) { TRAVEL.auto = !TRAVEL.auto; compassHud(); } }
  TOWN.keyPrev = { h: !!k.KeyH, r: !!k.KeyR };
  if (J && !TOWN.mounted) {
    J.root.position.set(TOWN.pos.x, mineGroundY(TOWN.pos.x, TOWN.pos.z), TOWN.pos.z); J.root.rotation.y = TOWN.spec ? -TOWN.spec.side * Math.PI / 2 : TOWN.face;
    if (J.ual) { J.play(TOWN.spec ? 'Sitting_Idle_Loop' : sp > 3.5 ? 'Jog_Fwd_Loop' : sp > 0.3 ? 'Walk_Loop' : 'Idle_Loop', 0.2); J.mixer.update(dt); }
  }
  // the nearest vendor within reach turns to you and talks
  let best = null, bd = 5;
  for (const S of TOWN.stalls) {
    if (!!S.mine !== !!TOWN.mineOn) continue;
    const d = Math.hypot(S.ax - TOWN.pos.x, S.az - TOWN.pos.z); if (d < (S.reach || 2.8) && d < bd) { bd = d; best = S; }
    const N = S.npc; if (N && N.ual && !S.squireNPC) { const talk = S === TOWN.near || S.V.key === TOWN.vendor; N.play(talk ? 'Idle_Talking_Loop' : 'Idle_Loop', 0.4); if (N.root.visible) N.mixer.update(dt); }
    const dd = Math.hypot(S.x - TOWN.pos.x, S.z - TOWN.pos.z); S.label.visible = dd < 30 && !(S.node && S.node.until);
    if (N && N.root && !S.player && dd < 9) { const lx = TOWN.pos.x - S.x, lz = TOWN.pos.z - S.z; const local = Math.atan2(lx, lz) - S.ry; const t = clamp(Math.atan2(Math.sin(local), Math.cos(local)), -1.1, 1.1); N.root.rotation.y += (t - N.root.rotation.y) * Math.min(1, dt * 4); }
  }
  if (best !== TOWN.near) { TOWN.near = best; townPrompt(); }
  if (TOWN.flag) TOWN.flag.rotation.y = Math.sin(G.realTime * 2) * 0.15;
  // talk: A / E / Space / Enter
  const act = !!(PIN.brace || k.KeyE || k.Enter || k.Space || (typeof NIN !== 'undefined' && NIN.on && IN.edges.has('trip')));
  IN.edges.delete('trip');
  if (walking && act && !TOWN.actPrev && TOWN.near && !TOWN.spec) townTalk(TOWN.near);
  TOWN.actPrev = act;
  if (walking && TOWN.frame++ % 20 === 0) townHudUpdate();
  updateWorld(dt);
}
function townTalk(S) { if (typeof playtestAction === 'function') playtestAction('interact', { target: S.V.name, role: S.V.role || '' }); if (typeof questEvent === 'function') questEvent('talk', { key: S.V.key }); if (S.open) S.open(); else openVendor(S.V.key); }
function townPushRect(P, x, z, hx, hz, r) {
  const dx = P.x - x, dz = P.z - z, px = hx + r - Math.abs(dx), pz = hz + r - Math.abs(dz);
  if (px <= 0 || pz <= 0) return;
  if (px < pz) P.x = x + Math.sign(dx || 1) * (hx + r);
  else P.z = z + Math.sign(dz || 1) * (hz + r);
}
function townCollide(beforeMove) {
  const P = TOWN.pos, r = 0.42;
  if (TOWN.spec) return; // the spectator is seated above the blocked bleacher footprint
  if (TOWN.mineOn) { mineCollide(P, r); return; }
  for (let it = 0; it < 2; it++) {
    for (const A of ARENAS) {
      // The rope, not just the wooden list, is the public boundary.
      townPushRect(P, A.x, A.z, LIST_BLOCK.x, LIST_BLOCK.z, r);
      // Bench collision comes from the same prop footprints as civilian navigation.
    }
    const ci = Math.floor(P.x / NAV.cell), cj = Math.floor(P.z / NAV.cell);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const o of (NAV.grid.get(i + ',' + j) || NAV.none)) { const dx = P.x - o.x, dz = P.z - o.z, d = Math.hypot(dx, dz), m = o.r + r; if (d < m && d > 1e-4) { P.x = o.x + dx / d * m; P.z = o.z + dz / d * m; } }
    gameplayShapePush(P, r);
    lakePush(P, r);
    stonefordWaterPush(P, r);
    realmGateCollide(P, r);
    const e = Math.hypot(P.x / TOWN_RX, P.z / TOWN_RZ); if (e > 1) { P.x /= e; P.z /= e; }
  }
  if (beforeMove && !castleWalkable(beforeMove.x, beforeMove.z, P.x, P.z, r)) {
    const x = P.x, z = P.z;
    P.x = beforeMove.x; P.z = beforeMove.z;
    if (castleWalkable(beforeMove.x, beforeMove.z, x, beforeMove.z, r)) P.x = x;
    if (castleWalkable(P.x, beforeMove.z, P.x, z, r)) P.z = z;
  }
}
function updateTownCamera(dt) {
  const cam = W3.camera, wantFov = TOWN.spec ? 50 / SPEC.zoom : 55; if (cam.near !== 0.15 || Math.abs(cam.fov - wantFov) > 0.1) { cam.near = 0.15; cam.fov = wantFov; cam.updateProjectionMatrix(); }
  if (ONB.tour && tourTick(dt)) return;
  if (TOWN.spec) { specCamera(dt); return; }
  if (TOWN.peek > 0) { TOWN.peek -= dt; cam.position.set(-104, 2.4, -200); cam.lookAt(-60, 3, -190); if (TOWN.peek <= 0) TOWN.cam = null; return; }
  const aspect = window.innerWidth / window.innerHeight, dist = TOWN.dist * (aspect < 0.8 ? 1.3 : 1);
  const tx = TOWN.pos.x, tz = TOWN.pos.z, cp = Math.cos(TOWN.pitch);
  const gY = mineGroundY(tx, tz), cxp = tx + Math.sin(TOWN.yaw) * cp * dist, czp = tz + Math.cos(TOWN.yaw) * cp * dist;
  let want = new THREE.Vector3(cxp, Math.max(gY, mineGroundY(cxp, czp)) + 1.4 + Math.sin(TOWN.pitch) * dist, czp);
  if (TOWN.mineOn) { const M = DEEP_MINE; want.set(clamp(want.x, M.x - M.halfX + 2, M.x + M.halfX - 2), Math.min(want.y, M.y + 5.8), clamp(want.z, M.z - M.halfZ + 2, M.z + M.halfZ - 2)); }
  const look = new THREE.Vector3(tx, gY + 1.35, tz);
  if (!TOWN.cam) { TOWN.cam = want.clone(); TOWN.look = look.clone(); }
  const kk = 1 - Math.exp(-8 * dt); TOWN.cam.lerp(want, kk); TOWN.look.lerp(look, kk);
  cam.position.copy(TOWN.cam); cam.lookAt(TOWN.look);
}
function townPrompt() {
  const b = $('#townPrompt'); if (!b) return;
  const S = TOWN.near; if (!S || G.screen || TOWN.busy || TOWN.spec) { b.hidden = true; return; }
  const key = IN.mode === 'pad' ? (NIN && NIN.on ? 'A' : 'A') : IN.mode === 'touch' ? 'Tap' : 'E';
  b.innerHTML = ''; b.append(h('kbd', null, key), h('span', null, `${S.verb || 'Talk to'} ${S.V.name}`), h('small', null, `${S.V.icon} ${S.V.role}`)); b.hidden = false;
}
// a vendor's counter: a screen over the town, so the controller and Back work as in every menu
function openVendor(key) {
  if (typeof playtestAction === 'function') playtestAction('vendor', { vendor: key });
  TOWN.vendor = key; AU.click();
  const V = VENDOR_BY[key], box = $('#townShopBody');
  $('#townShopHead').innerHTML = '';
  $('#townShopHead').append(h('button', { class: 'back', 'data-back': '', 'data-gp': 'B', 'aria-label': 'Back', onclick: e => { e.stopPropagation(); AU.click(); closeVendor(); } }, h('span', null, '‹ Back')), h('h2', { class: 'ttape tape mk' }, V.role));
  const again = () => { const st = box.scrollTop; renderVendor(box, key, again); box.scrollTop = st; townHudUpdate(); };
  renderVendor(box, key, again); box.scrollTop = 0;
  showScreen('townShop'); $('#townPrompt').hidden = true; refreshTouchUI();
}
function closeVendor() { TOWN.vendor = null; TOWN.actPrev = true; showScreen(null); townHudUpdate(); townPrompt(); refreshTouchUI(); }
// the realm map: waypoints (no teleporting), and a way home
function openTownMap() {
  if (TOWN.mineOn) { openDeepMineMap(); return; }
  AU.click(); TOWN.vendor = null;
  const box = $('#townShopBody'); box.innerHTML = '';
  $('#townShopHead').innerHTML = '';
  $('#townShopHead').append(h('button', { class: 'back', 'data-back': '', 'data-gp': 'B', 'aria-label': 'Back', onclick: e => { e.stopPropagation(); AU.click(); closeVendor(); } }, h('span', null, '‹ Back')), h('h2', { class: 'ttape tape mk' }, 'Realm map'));
  box.append(townMapCanvas());
  box.append(h('button', { class: 'btn primary flagtape', onclick: () => openQuestJournal() }, 'Quest journal'));
  box.append(h('div', { class: 'row townrow' },
    h('button', { class: 'btn tape', onclick: () => { AU.click(); openCareer(); } }, 'Your fighter'),
    h('button', { class: 'btn tape', onclick: () => { AU.click(); G.backTo = 'title'; showScreen('settings'); } }, 'Settings'),
    h('button', { class: 'btn tape', onclick: () => { AU.click(); G.backTo = 'title'; showScreen('howto'); } }, 'How to play'),
    h('button', { class: 'btn tape', onclick: () => { AU.click(); openFeedback(() => { showScreen(null); openTownMap(); }); } }, 'Report a bug / idea'),
    h('button', { class: 'btn primary flagtape', onclick: () => { AU.click(); leaveTown(); } }, 'Main menu')));
  showScreen('townShop'); $('#townPrompt').hidden = true; refreshTouchUI();
}
function initTown() {
  $('#townPrompt').onclick = () => { if (TOWN.near) townTalk(TOWN.near); };
  $('#btnFight').onclick = () => { AU.init(); AU.click(); G.hub = true; enterTown(); };
  $('#townMap').onclick = () => openTownMap();
  $('#townBag').onclick = () => { if (!G.screen) townPanel('Inventory', box => renderInventory(box)); };
  $('#townAdmin').onclick = () => { if (!G.screen && typeof openTestAdmin === 'function') openTestAdmin(); };
  $('#townMini').onclick = () => { if (!G.screen) openTownMap(); };
  $('#townHorse').onclick = e => { e.stopPropagation(); if (!G.screen) callHorse(); };
  $('#townLeave').onclick = () => { AU.click(); leaveTown(); };
}
TOWN.frame = 0;
