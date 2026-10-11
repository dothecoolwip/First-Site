// ---------- Youth division: kid-size fighters in squishy foam kit with rubber weapons. Maximum cute ----------
const FOAM_HELM = { key: 'foam', name: 'Foam helmet', note: 'Big open face, soft all over.', prot: 0.95, weight: 0.9, fov: 84, breath: 1.18, muffle: 0.04 };
const CUTE = { on: false, mats: {}, pal: {}, tabs: {}, deco: null, balloons: [], tex: {} };
const CUTE_POPS = ['#ffd84d', '#7ee0a8', '#ff9f6b', '#c7a6ff', '#6fe3e3', '#ff86b3', '#9ad0ff'];
const CUTE_SKIN = ['#f6d7c3', '#eac4a6', '#d6a283', '#b07a58', '#8a5a3c', '#f1c9a5'];
const CUTE_TOPS = ['cat', 'bear', 'bunny', 'pompom', 'horn', 'antenna', 'propeller', 'cat', 'bear'];
// what the hit calls turn into when the fighters are eight
const CUTE_WORDS = { 'Hit': 'Bonk!', 'Big hit!': 'BONK!', 'Takedown!': 'Boop! Down they go', 'Tripped!': 'Whoopsie!', 'Shoved!': 'Boop!', 'Tackle!': 'Big hug tackle!', 'Grounded': 'Oof! Sit down', 'Thrown!': 'Wheee!', 'Grabbed!': 'Gotcha!', 'Clinch!': 'Hug lock!', 'Miss': 'Whiff!', 'Disarmed them!': 'Yoink!', 'Running on empty': 'So puffed out…', 'Your legs are getting heavy': 'Sleepy legs', 'Blocked': 'Blocked!', 'Thunderclap!': 'Super bonk!' };

function pastel(hex, l = 0.8, s = 0.78) { const c = new THREE.Color(hex); const o = {}; c.getHSL(o); if (o.s < 0.15) o.h = 0.74; c.setHSL(o.h, Math.max(s, o.s * 0.9), l); return '#' + c.getHexString(); } // greys and blacks go lilac
function cuteMat(color, o) { const k = color + (o ? JSON.stringify(o) : ''); return CUTE.mats[k] || (CUTE.mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.86, metalness: 0 }, o || {}))); }
function cuteBasic(color) { const k = 'b' + color; return CUTE.mats[k] || (CUTE.mats[k] = new THREE.MeshBasicMaterial({ color })); }
// foam colours come from the club's own tabard, made soft and bright
function cutePal(club) {
  const k = club.key + club.tabard; if (CUTE.pal[k]) return CUTE.pal[k];
  const base = pastel(club.tabard, 0.78), deep = pastel(club.tabard, 0.66, 0.85), light = pastel(club.tabard, 0.91, 0.7);
  return CUTE.pal[k] = { base, deep, light, foam: cuteMat(base), foamD: cuteMat(deep), foamL: cuteMat(light) };
}
function cuteKind(club) { let n = 0; for (const ch of club.key) n += ch.charCodeAt(0); return ['heart', 'star'][n % 2]; }

// 2D sticker shapes (canvas, y down)
function cuteShape2D(x, kind, cx, cy, r) {
  x.beginPath();
  if (kind === 'heart') { x.moveTo(cx, cy + r * 0.9); x.bezierCurveTo(cx - r * 1.6, cy - r * 0.2, cx - r * 0.7, cy - r * 1.3, cx, cy - r * 0.45); x.bezierCurveTo(cx + r * 0.7, cy - r * 1.3, cx + r * 1.6, cy - r * 0.2, cx, cy + r * 0.9); }
  else for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
}
// 3D sticker shapes (y up)
function cuteShape3D(kind, r) {
  const s = new THREE.Shape();
  if (kind === 'heart') { s.moveTo(0, -r * 0.9); s.bezierCurveTo(-r * 1.6, r * 0.2, -r * 0.7, r * 1.3, 0, r * 0.45); s.bezierCurveTo(r * 0.7, r * 1.3, r * 1.6, r * 0.2, 0, -r * 0.9); }
  else { for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (i) s.lineTo(px, py); else s.moveTo(px, py); } s.closePath(); }
  return s;
}
function cuteSticker(kind, r, mat) { const g = geo('c_st_' + kind + r, () => { const e = new THREE.ExtrudeGeometry(cuteShape3D(kind, r), { depth: r * 0.15, bevelEnabled: true, bevelThickness: r * 0.12, bevelSize: r * 0.1, bevelSegments: 3, curveSegments: 10 }); e.center(); return e; }); return new THREE.Mesh(g, mat); }

// pastel tabard with polka dots and a big sticker front and back
function cuteTabardTex(club) {
  const k = club.key + club.tabard; if (CUTE.tabs[k]) return CUTE.tabs[k];
  const pal = cutePal(club), c = cvs(512, 256), x = c.getContext('2d');
  x.fillStyle = pal.light; x.fillRect(0, 0, 512, 256);
  x.fillStyle = pal.base; for (let r = 0; r < 6; r++) for (let i = 0; i < 14; i++) { x.beginPath(); x.arc(i * 38 + (r % 2) * 19, 18 + r * 42, 7, 0, TAU); x.fill(); }
  const kind = cuteKind(club);
  for (const cx of [256, 0, 512]) { x.fillStyle = '#ffffff'; cuteShape2D(x, kind, cx, 112, 64); x.fillStyle = kind === 'heart' ? '#ff6fa5' : '#ffc93c'; cuteShape2D(x, kind, cx, 112, 52); }
  x.fillStyle = pal.deep; x.fillRect(0, 226, 512, 30); x.fillStyle = '#ffffff'; for (let i = 0; i < 26; i++) { x.beginPath(); x.arc(i * 20 + 10, 241, 4, 0, TAU); x.fill(); }
  const t = texFrom(c); t.wrapS = THREE.RepeatWrapping; t.offset.x = 0.5; CUTE.tabs[k] = t; return t;
}

// ---- the fighter: same skeleton as the steel model, so every animation still works ----
function buildCuteFighter(f) {
  const club = f.club, pal = cutePal(club), rnd = seeded('cute' + club.key + f.num + f.team + f.name);
  const pop = cuteMat(CUTE_POPS[Math.floor(rnd() * CUTE_POPS.length)]), pop2 = cuteMat(CUTE_POPS[Math.floor(rnd() * CUTE_POPS.length)]);
  const white = cuteMat('#fff8f0'), skin = cuteMat(CUTE_SKIN[Math.floor(rnd() * CUTE_SKIN.length)], { roughness: 0.7 });
  const root = new THREE.Group(); const tilt = grp(root); const J = { root, tilt, cute: true, strap: pop2, cuffMat: pop };
  const bd = f.body || { h: 1.35, b: 1 }; const wide = Math.sqrt(bd.b); const sc = bd.h / 1.8;
  tilt.scale.setScalar(sc); J.scale = sc;
  const flagMat = f.side != null ? ffaFlagMat(f) : f.team === 0 ? MAT.flagPink : MAT.flagBlue;
  const hips = J.hips = grp(tilt, 0, 0.98, 0);
  mk(hips, geo('c_shorts', () => new THREE.CylinderGeometry(0.2, 0.26, 0.22, 18)), pal.foamD, 0, -0.04, 0).scale.set(wide, 1, wide);
  for (const side of [1, -1]) {
    const k = side > 0 ? 'L' : 'R';
    const leg = J['leg' + k] = grp(hips, side * 0.115, -0.08, 0);
    mk(leg, geo('c_thigh', () => new THREE.CapsuleGeometry(0.088, 0.25, 4, 12)), white, 0, -0.21, 0).scale.set(wide, 1, wide);
    const knee = J['knee' + k] = grp(leg, 0, -0.43, 0);
    mk(knee, geo('c_kpad', () => new THREE.SphereGeometry(0.09, 14, 10)), pop, 0, 0, 0.04).scale.set(1, 1, 0.8);
    mk(knee, geo('c_shin', () => new THREE.CapsuleGeometry(0.078, 0.26, 4, 12)), pal.foam, 0, -0.22, 0);
    mk(knee, geo('c_boot', () => new THREE.SphereGeometry(0.1, 14, 10)), pop2, 0, -0.42, 0.05).scale.set(0.78, 0.62, 1.35);
    J['kneeBand' + k] = addBand(knee, 0.08, 0.035, -0.09, pop2);
  }
  const torso = J.torso = grp(hips, 0, 0.06, 0);
  mk(torso, geo('c_vest', () => new THREE.CapsuleGeometry(0.2, 0.24, 6, 16)), pal.foam, 0, 0.24, 0).scale.set(wide * 1.05, 1, 0.85 * wide);
  const tabMat = new THREE.MeshStandardMaterial({ map: cuteTabardTex(club), roughness: 0.95, side: THREE.DoubleSide });
  mk(torso, geo('c_tabard', () => new THREE.CylinderGeometry(0.228, 0.29, 0.6, 20, 1, true)), tabMat, 0, 0.08, 0).scale.set(wide, 1, 0.88 * wide);
  const belt = mk(torso, geo('c_belt', () => new THREE.TorusGeometry(0.218, 0.03, 8, 26)), pop, 0, -0.06, 0); belt.rotation.x = Math.PI / 2; belt.scale.set(wide, 0.88 * wide, 1);
  const col = mk(torso, geo('c_collar', () => new THREE.TorusGeometry(0.1, 0.048, 10, 20)), pal.foamL, 0, 0.5, 0); col.rotation.x = Math.PI / 2;
  // big chibi head in a squishy open-face helmet
  const head = J.head = grp(torso, 0, 0.56, 0);
  const hg = grp(head); hg.scale.setScalar(1.55);
  mk(hg, geo('c_dome', () => new THREE.SphereGeometry(0.15, 24, 18)), pal.foam, 0, 0.1, -0.008);
  mk(hg, geo('c_face', () => new THREE.SphereGeometry(0.118, 22, 16)), skin, 0, 0.09, 0.055);
  const rim = mk(hg, geo('c_rim', () => new THREE.TorusGeometry(0.113, 0.02, 10, 30)), pal.foamD, 0, 0.085, 0.09); rim.rotation.x = 0.158;
  const eyeM = cuteBasic('#2a1d22'), shine = cuteBasic('#ffffff'), blushM = cuteMat('#ff9fb8', { roughness: 1 });
  const wink = rnd() < 0.12;
  for (const sx of [-1, 1]) {
    if (wink && sx > 0) { const w = mk(hg, geo('c_wink', () => new THREE.TorusGeometry(0.016, 0.0045, 6, 12, Math.PI)), eyeM, sx * 0.042, 0.1, 0.166, false); }
    else {
      mk(hg, geo('c_eye', () => new THREE.SphereGeometry(0.024, 14, 10)), eyeM, sx * 0.042, 0.1, 0.162, false).scale.set(0.85, 1.18, 0.45);
      mk(hg, geo('c_shine', () => new THREE.SphereGeometry(0.0085, 8, 6)), shine, sx * 0.042 + 0.008, 0.111, 0.172, false);
      mk(hg, geo('c_shine2', () => new THREE.SphereGeometry(0.0042, 6, 5)), shine, sx * 0.042 - 0.007, 0.091, 0.172, false);
    }
    const bl = mk(hg, geo('c_blush', () => new THREE.CircleGeometry(0.019, 16)), blushM, sx * 0.076, 0.068, 0.146, false); bl.rotation.y = sx * 0.7; bl.scale.set(1.25, 0.8, 1);
  }
  const smile = mk(hg, geo('c_smile', () => new THREE.TorusGeometry(0.017, 0.0045, 6, 12, Math.PI)), eyeM, 0, 0.066, 0.168, false); smile.rotation.z = Math.PI;
  // a topper on every helmet: ears, pompom, horn, antennae or a propeller
  const top = CUTE_TOPS[Math.floor(rnd() * CUTE_TOPS.length)];
  if (top === 'cat') for (const sx of [-1, 1]) { const e = mk(hg, geo('c_catear', () => new THREE.ConeGeometry(0.05, 0.085, 14)), pal.foamD, sx * 0.085, 0.225, -0.01); e.rotation.z = -sx * 0.4; const i = mk(hg, geo('c_catin', () => new THREE.ConeGeometry(0.028, 0.05, 10)), cuteMat('#ff9fc0'), sx * 0.083, 0.218, 0.012); i.rotation.z = -sx * 0.4; }
  else if (top === 'bear') for (const sx of [-1, 1]) { mk(hg, geo('c_bear', () => new THREE.SphereGeometry(0.05, 14, 10)), pal.foamD, sx * 0.105, 0.21, -0.01); mk(hg, geo('c_bearin', () => new THREE.SphereGeometry(0.027, 10, 8)), cuteMat('#ffd1dc'), sx * 0.108, 0.212, 0.022).scale.z = 0.5; }
  else if (top === 'bunny') for (const sx of [-1, 1]) { const e = mk(hg, geo('c_bun', () => new THREE.CapsuleGeometry(0.03, 0.13, 4, 10)), white, sx * 0.05, 0.31, -0.02); e.rotation.z = -sx * 0.2; e.scale.z = 0.7; const i = mk(hg, geo('c_bunin', () => new THREE.CapsuleGeometry(0.016, 0.1, 4, 8)), cuteMat('#ff9fc0'), sx * 0.051, 0.31, 0.0); i.rotation.z = -sx * 0.2; i.scale.z = 0.4; }
  else if (top === 'pompom') { mk(hg, geo('c_pom', () => new THREE.SphereGeometry(0.055, 14, 10)), pop, 0, 0.265, -0.01); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; mk(hg, geo('c_pom2', () => new THREE.SphereGeometry(0.03, 10, 8)), pop, Math.cos(a) * 0.04, 0.27 + Math.sin(i * 2.1) * 0.015, Math.sin(a) * 0.04 - 0.01); } }
  else if (top === 'horn') { const h1 = mk(hg, geo('c_horn', () => new THREE.ConeGeometry(0.026, 0.13, 14)), cuteMat('#ffe066', { emissive: '#4a3a00' }), 0, 0.29, 0.05); h1.rotation.x = 0.35; for (let i = 0; i < 3; i++) { const r = mk(hg, geo('c_hornr', () => new THREE.TorusGeometry(0.02, 0.005, 5, 12)), cuteMat('#ff9fc0'), 0, 0.255 + i * 0.03, 0.038 + i * 0.011); r.rotation.x = Math.PI / 2 + 0.35; r.scale.setScalar(1 - i * 0.25); } }
  else if (top === 'antenna') for (const sx of [-1, 1]) { const st = mk(hg, geo('c_ant', () => new THREE.CylinderGeometry(0.005, 0.005, 0.12, 6)), cuteMat('#3a3a48'), sx * 0.05, 0.29, 0); st.rotation.z = -sx * 0.35; mk(hg, geo('c_antb', () => new THREE.SphereGeometry(0.026, 12, 8)), pop, sx * 0.072, 0.35, 0); }
  else { mk(hg, geo('c_prop0', () => new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6)), cuteMat('#3a3a48'), 0, 0.27, -0.01); const pr = grp(hg, 0, 0.3, -0.01); J.prop = pr; for (const sx of [-1, 1]) mk(pr, geo('c_prop', () => new THREE.BoxGeometry(0.12, 0.008, 0.035)), sx > 0 ? pop : pop2, sx * 0.06, 0, 0); mk(pr, geo('c_propc', () => new THREE.SphereGeometry(0.014, 8, 6)), cuteMat('#ffd84d'), 0, 0, 0); }
  if (bd.braid) { const hair = HAIR[(f.id + f.num) % HAIR.length]; for (const sx of [-1, 1]) { mk(hg, geo('c_pig', () => new THREE.SphereGeometry(0.05, 12, 10)), hair, sx * 0.155, 0.03, -0.04).scale.set(0.8, 1.15, 0.8); mk(hg, geo('c_pigt', () => new THREE.SphereGeometry(0.018, 8, 6)), pop, sx * 0.138, 0.075, -0.035); } }
  const hf = mk(hg, geo('c_hflag', () => new THREE.BoxGeometry(0.01, 0.045, 0.12)), flagMat, 0.15, 0.13, -0.03, false);
  J.helmBand = addBand(hg, 0.1, 0.025, -0.02, pop2);
  for (const side of [1, -1]) {
    const k = side > 0 ? 'L' : 'R';
    const sh = J['sh' + k] = grp(torso, side * 0.255 * (0.88 + 0.12 * bd.b), 0.39, 0);
    mk(sh, geo('c_paul', () => new THREE.SphereGeometry(0.108, 14, 10)), pal.foamD, side * 0.02, 0, 0).scale.set(1, 0.85, 1);
    mk(sh, geo('c_upper', () => new THREE.CapsuleGeometry(0.058, 0.16, 4, 10)), white, 0, -0.16, 0);
    addBand(sh, 0.066, 0.05, -0.12, flagMat, false);
    const el = J['el' + k] = grp(sh, 0, -0.3, 0);
    mk(el, geo('c_epad', () => new THREE.SphereGeometry(0.072, 12, 10)), pop, 0, 0, -0.014);
    mk(el, geo('c_fore', () => new THREE.CapsuleGeometry(0.055, 0.16, 4, 10)), pal.foam, 0, -0.14, 0);
    J['elBand' + k] = addBand(el, 0.066, 0.03, 0.035, pop2);
    const wr = J['wr' + k] = grp(el, 0, -0.29, 0);
    mk(wr, geo('c_mitt', () => new THREE.SphereGeometry(0.064, 12, 10)), pal.foamL, 0, -0.03, 0).scale.set(1, 1.1, 1.15);
    J['cuff' + k] = addBand(wr, 0.062, 0.04, 0.05, pop);
  }
  J.shieldPivot = grp(torso, 0.34, 0.12, 0.22);
  J.weaponMount = grp(J.wrR, 0, -0.04, 0.0); J.weaponMount.rotation.x = Math.PI / 2;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture(f.spec.dispNum || f.spec.num, f.side != null ? ffaColor(f) : f.team === 0 ? '#ff3d8b' : '#3b93ff', f.isPlayer), depthTest: false, transparent: true }));
  tag.scale.set(0.62, 0.31, 1); tag.position.y = 2.25 * sc; tag.renderOrder = 5; root.add(tag); J.tag = tag;
  J.pose = {};
  f.model = J;
  mergeChildren(tilt);
  if (!SHADOWS) { const bl = new THREE.Mesh(geo('blobG', () => new THREE.PlaneGeometry(1.2, 1.2)), MAT.blob); bl.rotation.x = -Math.PI / 2; bl.position.y = 0.012; bl.scale.setScalar(0.8); root.add(bl); }
  root.traverse(o => { if (o.isMesh) o.castShadow = SHADOWS && !o.userData.noShadow; });
  setWeaponModel(f); setShieldModel(f); applyTapeVisuals(f);
  return J;
}

// ---- rubber weapons: pool-noodle hafts, boffer swords, squeaky hammers ----
function buildCuteWeapon(key, club) {
  const w = WEAPONS[key] || WEAPONS.sword; const g = new THREE.Group();
  const hsh = seeded('cw' + key + club.key); const cA = CUTE_POPS[Math.floor(hsh() * CUTE_POPS.length)]; let cB = CUTE_POPS[Math.floor(hsh() * CUTE_POPS.length)]; if (cB === cA) cB = '#fff8f0';
  const A = cuteMat(cA, { roughness: 0.6 }), B = cuteMat(cB, { roughness: 0.6 });
  const wrap = mk(g, geo('grip', () => new THREE.CylinderGeometry(0.021, 0.021, 0.14, 8)), MAT.tape.black, 0, 0, 0);
  if (w.haft) {
    const L = w.len; const butt = key === 'polearm' ? -0.45 : key === 'longaxe' ? -0.32 : -0.1; const top = butt + L;
    mk(g, new THREE.CylinderGeometry(0.027, 0.027, L, 12), A, 0, (butt + top) / 2, 0);
    mk(g, geo('c_butt', () => new THREE.SphereGeometry(0.034, 12, 8)), B, 0, butt, 0);
    if (key === 'mace' || /mace|club|flail|morning/i.test(w.name)) { // squishy star ball
      mk(g, geo('c_ball', () => new THREE.SphereGeometry(0.075, 18, 14)), B, 0, top, 0);
      const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0, 0.7, 0.7], [0, 0.7, -0.7]];
      for (const [dx, dy, dz] of dirs) mk(g, geo('c_nub', () => new THREE.SphereGeometry(0.03, 10, 8)), A, dx * 0.075, top + dy * 0.075, dz * 0.075);
    } else if (key === 'polearm' || key === 'longaxe' || w.hands === 2) { // squeaky toy hammer
      const hd = mk(g, geo('c_mallet', () => new THREE.CylinderGeometry(0.08, 0.08, 0.26, 20)), B, 0, top - 0.06, 0); hd.rotation.x = Math.PI / 2;
      for (const sz of [-1, 1]) { const cap = mk(g, geo('c_malcap', () => new THREE.CylinderGeometry(0.086, 0.086, 0.04, 20)), A, 0, top - 0.06, sz * 0.13); cap.rotation.x = Math.PI / 2; }
    } else { // foam axe with a fat rounded bit
      const sh = new THREE.Shape(); sh.moveTo(-0.02, 0.035); sh.lineTo(0.05, 0.05); sh.quadraticCurveTo(0.12, 0.09, 0.14, 0.11); sh.quadraticCurveTo(0.2, 0.0, 0.14, -0.12); sh.quadraticCurveTo(0.1, -0.09, 0.05, -0.05); sh.lineTo(-0.02, -0.035); sh.closePath();
      const ag = geo('c_axe', () => { const e = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 4, curveSegments: 10 }); e.translate(0, 0, -0.015); return e; });
      const head = mk(g, ag, B, 0, top - 0.08, 0); head.rotation.y = -Math.PI / 2;
    }
  } else { // boffer sword: fat foam blade, coloured tip, disc guard
    const two = w.hands === 2; const grip = two ? 0.24 : 0.11;
    const bl = key === 'short' ? 0.58 : key === 'falchion' ? 0.66 : key === 'longsword' ? 0.88 : w.len ? clamp(w.len - grip - 0.12, 0.45, 1.0) : 0.74;
    const blade = mk(g, geo('c_blade' + bl.toFixed(2), () => new THREE.CapsuleGeometry(0.036, bl - 0.072, 6, 14)), A, 0, 0.075 + bl / 2, 0); blade.scale.set(0.58, 1, 1);
    const tip = mk(g, geo('c_tip', () => new THREE.SphereGeometry(0.039, 14, 10)), B, 0, 0.075 + bl - 0.035, 0); tip.scale.set(0.62, 1.1, 1.05);
    mk(g, geo('c_guard', () => new THREE.SphereGeometry(0.068, 18, 10)), B, 0, 0.07, 0).scale.set(1, 0.32, 1);
    mk(g, geo('c_grip' + grip, () => new THREE.CylinderGeometry(0.021, 0.021, grip, 10)), cuteMat('#fff8f0'), 0, 0.068 - grip / 2 - 0.008, 0);
    mk(g, geo('c_pommel', () => new THREE.SphereGeometry(0.036, 12, 10)), B, 0, 0.068 - grip - 0.03, 0);
    wrap.visible = false;
  }
  wrap.userData.keep = true; g.userData.wrap = wrap;
  mergeChildren(g);
  return g;
}
function buildCuteShield(type, club) {
  const g = new THREE.Group(); const pal = cutePal(club), kind = cuteKind(club);
  const stMat = cuteMat(kind === 'heart' ? '#ff6fa5' : '#ffc93c', { roughness: 0.5 });
  if (type === 'heater') {
    const sh = new THREE.Shape(); sh.moveTo(-0.22, 0.29); sh.lineTo(0.22, 0.29); sh.lineTo(0.22, 0.06); sh.quadraticCurveTo(0.2, -0.18, 0, -0.3); sh.quadraticCurveTo(-0.2, -0.18, -0.22, 0.06); sh.closePath();
    const eg = geo('c_heater', () => new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.028, bevelSegments: 4, curveSegments: 12 }));
    const m = new THREE.Mesh(eg, [pal.foam, pal.foamD]); m.castShadow = true; g.add(m);
    const st = cuteSticker(kind, 0.1, stMat); st.position.set(0, 0.02, 0.085); g.add(st);
  } else {
    const d = mk(g, geo('c_buck', () => new THREE.CylinderGeometry(0.17, 0.17, 0.045, 24)), pal.foam, 0, 0, 0); d.rotation.x = Math.PI / 2;
    mk(g, geo('c_buckrim', () => new THREE.TorusGeometry(0.17, 0.028, 10, 28)), pal.foamD, 0, 0, 0);
    const st = cuteSticker(kind, 0.075, stMat); st.position.set(0, 0, 0.04); g.add(st);
  }
  return g;
}

// ---- first person: foam mitts and arms in view ----
function cuteViewmodel(vm, p) {
  const key = CUTE.on ? p.club.key + p.club.tabard : ''; if (vm.cuteKey === key) return false;
  vm.cuteKey = key; const pal = CUTE.on ? cutePal(p.club) : null;
  const walk = o => { if (o === vm.wMount || o === vm.sMount) return; if (o.isMesh) { if (!o.userData.mat0) o.userData.mat0 = o.material; o.material = CUTE.on ? (o.userData.mat0 === MAT.tape.black ? cuteMat('#ff86b3') : o.userData.mat0 === MAT.steelDark ? pal.foamD : pal.foam) : o.userData.mat0; } o.children.forEach(walk); };
  [vm.armR, vm.armL, vm.handR, vm.handL].forEach(walk);
  return true;
}

// ---- particles: hearts and stars instead of sparks ----
function cuteTex(kind) {
  if (CUTE.tex[kind]) return CUTE.tex[kind];
  const c = cvs(64, 64), x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,.18)'; cuteShape2D(x, kind, 32, 34, 27);
  x.fillStyle = '#ffffff'; cuteShape2D(x, kind, 32, 32, 25);
  x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.ellipse(kind === 'heart' ? 22 : 30, kind === 'heart' ? 22 : 20, 5, 3, -0.6, 0, TAU); x.fill();
  return CUTE.tex[kind] = new THREE.CanvasTexture(c);
}

// ---- the venue dresses up: bunting, balloons and a banner ----
function setCuteDeco(on) {
  CUTE.on = !!on; AU.cute = !!on;
  if (!W3.scene) return;
  if (CUTE.deco) { CUTE.deco.visible = CUTE.on; return; }
  if (!on) return;
  const g = CUTE.deco = new THREE.Group(); W3.scene.add(g);
  const { W, L } = LIST; const X = W / 2 + 0.45, Z = L / 2 + 0.45;
  // striped poles at the corners and halfway down the long sides
  const poles = [[-X, -Z], [X, -Z], [-X, Z], [X, Z], [-X, 0], [X, 0]];
  const poleM = cuteMat('#fff8f0'), stripeM = cuteMat('#ff86b3');
  for (const [px, pz] of poles) {
    mk(g, geo('c_pole', () => new THREE.CylinderGeometry(0.05, 0.06, 4.2, 10)), poleM, px, 2.1, pz);
    for (let i = 0; i < 6; i++) mk(g, geo('c_pstripe', () => new THREE.CylinderGeometry(0.062, 0.062, 0.18, 10)), stripeM, px, 0.4 + i * 0.62, pz, false);
    mk(g, geo('c_ptop', () => new THREE.SphereGeometry(0.11, 12, 10)), cuteMat('#ffd84d', { emissive: '#3a2a00' }), px, 4.25, pz);
  }
  // pennant strings: around the list and twice across it
  const runs = [[[-X, -Z], [X, -Z]], [[-X, Z], [X, Z]], [[-X, -Z], [-X, 0]], [[-X, 0], [-X, Z]], [[X, -Z], [X, 0]], [[X, 0], [X, Z]], [[-X, -L / 4], [X, -L / 4]], [[-X, L / 4], [X, L / 4]]];
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.17, 0, 0, 0.17, 0, 0, 0, -0.36, 0], 3)); tri.computeVertexNormals();
  let count = 0; const spots = [];
  const lineM = new THREE.LineBasicMaterial({ color: '#f4efe6' });
  for (const [[ax, az], [bx, bz]] of runs) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(4, Math.round(len / 0.55)), across = Math.abs(az - bz) < 0.01 && Math.abs(az) < Z - 1, hy = across ? 4.6 : 3.9, sag = across ? 1.1 : 0.55;
    const pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(lerp(ax, bx, t), hy - sag * Math.sin(Math.PI * t), lerp(az, bz, t))); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineM));
    const yaw = Math.atan2(bx - ax, bz - az) - Math.PI / 2;
    for (let i = 1; i < n; i++) { const t = i / n; spots.push({ x: lerp(ax, bx, t), y: hy - sag * Math.sin(Math.PI * t), z: lerp(az, bz, t), yaw, ph: rand(0, TAU) }); count++; }
  }
  const im = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
  const bunt = ['#ff86b3', '#ffd84d', '#7ee0a8', '#9ad0ff', '#c7a6ff', '#ff9f6b', '#fff8f0'];
  spots.forEach((s, i) => { e.set(0, s.yaw, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, one); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(bunt[i % bunt.length])); });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  g.add(im); CUTE.bunting = { im, spots };
  // balloon bunches tied to the corner poles
  CUTE.balloons = [];
  const bGeo = geo('c_balloon', () => { const s = new THREE.SphereGeometry(0.24, 18, 14); s.scale(1, 1.2, 1); return s; });
  const strM = new THREE.LineBasicMaterial({ color: '#ffffff' });
  for (const [px, pz] of poles.slice(0, 4)) for (let i = 0; i < 5; i++) {
    const c = CUTE_POPS[(i + Math.abs(px + pz) | 0) % CUTE_POPS.length];
    const bm = cuteMat(c, { roughness: 0.22, metalness: 0.05, emissive: new THREE.Color(c).multiplyScalar(0.12).getHex() });
    const b = new THREE.Mesh(bGeo, bm); const ox = Math.cos(i * 1.3) * 0.32, oz = Math.sin(i * 1.3) * 0.32, oy = 4.9 + (i % 3) * 0.3;
    b.position.set(px + ox, oy, pz + oz); g.add(b);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(px, 4.2, pz), new THREE.Vector3(px + ox, oy - 0.28, pz + oz)]), strM); g.add(line);
    CUTE.balloons.push({ b, line, base: b.position.clone(), ph: rand(0, TAU), px, pz });
  }
  // banner over the far end
  const c = cvs(1024, 220), x = c.getContext('2d');
  x.fillStyle = '#fff3f8'; x.beginPath(); if (x.roundRect) x.roundRect(0, 0, 1024, 220, 60); else x.rect(0, 0, 1024, 220); x.fill();
  x.fillStyle = '#ffd6e7'; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(30 + (i % 20) * 50, i < 20 ? 22 : 198, 9, 0, TAU); x.fill(); }
  x.textAlign = 'center'; x.font = '900 112px "Big Shoulders Display", Impact, sans-serif'; x.lineWidth = 16; x.strokeStyle = '#ffffff'; x.strokeText('LITTLE KNIGHTS CUP', 512, 150); x.fillStyle = '#ff5c9a'; x.fillText('LITTLE KNIGHTS CUP', 512, 150);
  for (const [cx, kind, colr] of [[56, 'heart', '#ff86b3'], [968, 'star', '#ffc93c']]) { x.fillStyle = colr; cuteShape2D(x, kind, cx, 112, 40); }
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.5), new THREE.MeshBasicMaterial({ map: texFrom(c), transparent: true, side: THREE.DoubleSide }));
  ban.position.set(0, 3.3, -Z - 0.05); g.add(ban);
  const ban2 = ban.clone(); ban2.position.z = Z + 0.05; ban2.rotation.y = Math.PI; g.add(ban2);
}
function updateCuteDeco(t) {
  if (!CUTE.on || !CUTE.deco) return;
  for (const B of CUTE.balloons) {
    const sx = Math.sin(t * 0.9 + B.ph) * 0.08, sy = Math.sin(t * 1.3 + B.ph * 2) * 0.06;
    B.b.position.set(B.base.x + sx, B.base.y + sy, B.base.z + Math.cos(t * 0.7 + B.ph) * 0.06);
    const p = B.line.geometry.attributes.position; p.setXYZ(1, B.b.position.x, B.b.position.y - 0.28, B.b.position.z); p.needsUpdate = true;
  }
  // propeller hats spin, faster when the kid is running
  for (const f of G.fighters) if (f.model && f.model.prop) f.model.prop.rotation.y += 0.016 * (6 + vlen(f.vel) * 6);
}
