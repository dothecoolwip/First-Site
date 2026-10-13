// ---------- animated officials: Quaternius' Universal Animation Library mannequin (CC0) ----------
// Marshals and squires walk, idle, talk and kneel with real motion-captured-style clips instead of stick legs.
const UAL = { ready: false, gltf: null, clips: {}, H: 1.83 };
function loadUAL() {
  if (typeof UAL_GLB === 'undefined' || typeof GLTFX === 'undefined' || UAL.loading) return; UAL.loading = true;
  try {
    const bin = atob(UAL_GLB); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    new GLTFX.GLTFLoader().parse(u8.buffer, '', g => {
      UAL.gltf = g; g.animations.forEach(a => UAL.clips[a.name] = a); UAL.ready = true;
      if (G.match && G.marshals.length) { buildMarshals(); rebuildCrew(); }
    }, e => { UAL.failed = String(e); });
  } catch (e) { UAL.failed = String(e); }
}
const UAL_AXIS = new THREE.Vector3(0, 0, 1); // the axis the right upper arm swings up around (tuned by eye)
function ualPerson(o) {
  const root = new THREE.Group(); const body = SkelUtils.clone(UAL.gltf.scene); root.add(body);
  body.scale.setScalar((o.h || 1.78) / UAL.H);
  const main = new THREE.MeshStandardMaterial({ color: o.main || '#1a1d21', roughness: 0.85 }), joints = new THREE.MeshStandardMaterial({ color: o.joints || '#2a2e33', roughness: 0.7 });
  const bones = {};
  body.traverse(n => {
    if (n.isMesh) { const pickM = m => m && /Joint/i.test(m.name) ? joints : main; n.material = Array.isArray(n.material) ? n.material.map(pickM) : pickM(n.material); n.castShadow = SHADOWS; n.frustumCulled = false; }
    if (n.isBone) bones[n.name] = n;
  });
  const mixer = new THREE.AnimationMixer(body), acts = {};
  for (const k in UAL.clips) acts[k] = mixer.clipAction(UAL.clips[k]);
  const J = { root, ual: true, mixer, acts, bones, cur: null, legL: new THREE.Object3D(), legR: new THREE.Object3D(), shR: new THREE.Object3D(), torso: new THREE.Object3D() };
  J.handR = bones.hand_r || root;
  J.play = (name, fade = 0.3) => { if (J.cur === name || !acts[name]) return; const a = acts[name]; a.reset(); a.setEffectiveWeight(1); a.fadeIn(fade).play(); if (J.cur) acts[J.cur].fadeOut(fade); J.cur = name; };
  J.play(o.anim || 'Idle_Loop', 0); acts[J.cur].time = Math.random() * 3;
  return J;
}
// a band, a cap, a staff with a flag; moose antlers on youth day
function ualMarshal(role) {
  const J = ualPerson({ main: role === 'knight' ? '#26344d' : '#16191c', joints: role === 'knight' ? '#1a2335' : '#2b3036', h: rand(1.72, 1.86) });
  const B = J.bones;
  if (B.upperarm_l) { const band = new THREE.Mesh(geo('ualband', () => new THREE.CylinderGeometry(0.062, 0.062, 0.09, 12, 1, true)), MAT.marshalYellow); band.material.side = THREE.DoubleSide; band.position.y = 0.12; B.upperarm_l.add(band); }
  if (B.Head && role === 'knight') { const cap = new THREE.Mesh(geo('ualcap', () => new THREE.SphereGeometry(0.105, 14, 8, 0, TAU, 0, Math.PI / 2)), MAT.marshalYellow); cap.position.set(0, 0.16, 0.01); cap.scale.set(1.12, 0.9, 1.2); B.Head.add(cap); }
  // the staff: held in the right hand, flag at the top
  const staff = new THREE.Group(); J.handR.add(staff); staff.position.set(0, 0.08, 0.02);
  mk(staff, geo('ualstaff', () => new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6)), new THREE.MeshStandardMaterial({ color: role === 'knight' ? '#2a2d30' : '#e8e4da' }), 0, 0.3, 0);
  const flag = mk(staff, geo('flagcloth', () => new THREE.PlaneGeometry(0.42, 0.3)), new THREE.MeshStandardMaterial({ color: '#f2c40f', side: THREE.DoubleSide, roughness: 0.8, emissive: '#2e2400' }), 0.21, 0.72, 0, false);
  J.flag = flag; J.staff = staff;
  if (CUTE.on && B.Head) {
    const brown = cuteMat('#a4703f'), tan = cuteMat('#d9b48a');
    for (const sx of [-1, 1]) { const a = grp(B.Head, sx * 0.1, 0.2, 0); a.rotation.z = -sx * 0.5; mk(a, geo('c_antS', () => new THREE.CylinderGeometry(0.014, 0.018, 0.14, 6)), brown, 0, 0.06, 0); const palm = mk(a, geo('c_antP', () => new THREE.SphereGeometry(0.09, 12, 8)), tan, 0, 0.16, 0); palm.scale.set(1, 0.45, 0.25); }
    mk(B.Head, geo('c_mnose', () => new THREE.SphereGeometry(0.025, 10, 8)), cuteMat('#ff6f8a'), 0, 0.08, 0.11);
  }
  return J;
}
function ualSquire(club) {
  const J = ualPerson({ main: club.tabard, joints: '#2d3b52', h: rand(1.65, 1.82), anim: 'Idle_Loop' });
  const w = buildWeapon('sword', club); w.position.set(0, 0.08, 0.02); J.handR.add(w); J.reserve = w;
  return J;
}
// called each frame for a marshal using the mannequin: pick the clip from how far and fast they are moving
function animateUAL(J, moving, far, flagUp, dt) {
  J.play(flagUp > 0.05 ? 'Idle_Talking_Loop' : moving ? (far > 2.5 ? 'Jog_Fwd_Loop' : 'Walk_Loop') : 'Idle_Loop');
  J.mixer.update(dt);
  const ua = J.bones.upperarm_r; if (ua && flagUp > 0) ua.rotateOnAxis(UAL_AXIS, -2.4 * ease(Math.min(1, flagUp)));
}
function rebuildCrew() {
  if (!G.crew || !G.match) return;
  // squires keep their spots; swap the old models for animated ones
  const clubs = [CLUBS.reavers, CLUBS[G.match.opp]];
  G.crew.forEach((m, i) => { if (m.userData && m.userData.squire != null && UAL.ready && !m.userData.ual) { const J = ualSquire(clubs[m.userData.squire]); J.root.position.copy(m.position); J.root.rotation.copy(m.rotation); J.root.userData = { squire: m.userData.squire, ual: true, J }; W3.matchRoot.remove(m); W3.matchRoot.add(J.root); G.crew[i] = J.root; } });
}
function updateCrewAnim(dt) { if (!G.crew) return; for (const m of G.crew) if (m.userData && m.userData.J) m.userData.J.mixer.update(dt); }

