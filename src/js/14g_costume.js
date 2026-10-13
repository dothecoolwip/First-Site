// ===================================================================
// Costumed townsfolk: Quaternius' Modular Character Outfits (CC0) worn on the UAL mannequin.
// The outfits are skinned to the same 65-bone rig as the mannequin, so they bind straight onto its bones and play every
// UAL clip. Only the mannequin's head shows above the collar (the rest of the body would poke through the cloth).
// ===================================================================
const OUTFIT = { ready: false, geo: {}, tex: {}, ibm: {}, head: new Map(), mats: new Map() };
const SKIN_TONES = ['#f1c9a5', '#e0ac85', '#c68a62', '#a86b45', '#8a5535', '#6b3f26', '#f3d2b8', '#d59b72'];
const FIGHTER_HAIR = [['none', 'Shaved'], ['crop', 'Buzz cut'], ['crop_f', 'Soft buzz'], ['swept', 'Side part'], ['long', 'Long layers'], ['bun', 'Twin buns'], ['braid', 'Braided buns']];
const FIGHTER_HAIR_COLORS = ['#171311', '#3b2419', '#75462c', '#a66c3d', '#d5ab61', '#bd6b42', '#817d75', '#e1d7bf'];
const FIGHTER_BEARDS = [['none', 'Clean shaven'], ['stubble', 'Stubble'], ['moustache', 'Moustache'], ['goatee', 'Goatee'], ['short', 'Short beard'], ['full', 'Full beard'], ['braided', 'Braided beard']];
const FIGHTER_EYES = ['#3e2b1f', '#627957', '#527d96', '#8b7454'];
const FIGHTER_SHAPES = [
  ['height', 'Height'], ['mass', 'Body mass'], ['muscle', 'Muscle'], ['shoulders', 'Shoulders'],
  ['waist', 'Waist'], ['hips', 'Hips'], ['arms', 'Arm thickness'], ['legs', 'Leg thickness'],
  ['bust', 'Bust / ribcage'], ['breast', 'Breast volume'], ['butt', 'Butt fullness'],
  ['face', 'Face width'], ['jaw', 'Jaw width'], ['eyes', 'Eye spacing'], ['nose', 'Nose size'], ['mouth', 'Mouth width']
];
function shapeValue(shape, key) { if (!shape || shape[key] == null) return 50; const n = Number(shape[key]); return Number.isFinite(n) ? clamp(n, 0, 100) : 50; }
function shapeDelta(shape, key) { return (shapeValue(shape, key) - 50) / 50; }
function fighterHeight(frame, value) { const lo = frame === 'female' ? 1.52 : 1.60, hi = frame === 'female' ? 1.88 : 1.98; return lo + (hi - lo) * clamp(value, 0, 100) / 100; }
function fighterShapeSet(L, key, value) {
  L.shape = L.shape || {}; L.shape[key] = clamp(Math.round(Number(value) || 0), 0, 100);
  if (key === 'height' || key === 'mass') {
    const lo = G.loadout || (G.loadout = {}), v = L.shape[key];
    if (key === 'height') { lo.heightValue = v; lo.height = v < 34 ? 'short' : v > 67 ? 'tall' : 'avg'; }
    else { lo.massValue = v; lo.build = v < 34 ? 'light' : v > 67 ? 'heavy' : 'medium'; }
    store.set('loadout', lo);
  }
  saveCareer();
}
function fighterShapeControl(L, key, label, changed) {
  const value = shapeValue(L.shape, key), display = h('output', { class: 'shape-value' });
  const update = v => { display.textContent = key === 'height' ? `${Math.round(fighterHeight(L.frame || 'male', v) * 100)} cm` : `${v}%`; };
  const slider = h('input', { type: 'range', min: '0', max: '100', step: '1', value: String(value), 'aria-label': label });
  slider.oninput = () => { fighterShapeSet(L, key, slider.value); update(Number(slider.value)); changed(false); };
  slider.onchange = () => changed(true);
  update(value);
  return h('label', { class: 'shape-control' }, h('span', { class: 'shape-head' }, label, display), slider);
}
// Additional cuts of the modular ranger outfits use the same bones and cloth textures.
for (const gender of ['Male', 'Female']) {
  const base = OUTFIT_GEO.outfits[gender + '_Ranger'];
  if (base) {
    OUTFIT_GEO.outfits[gender + '_Ranger_Open'] = base.filter(k => !k.includes('Head_Hood'));
    OUTFIT_GEO.outfits[gender + '_Ranger_Scout'] = base.filter(k => !k.includes('Head_Hood') && !k.includes('Acc_Pauldron'));
  }
}
const HAIR_STYLES = { crop: 'Buzzed', crop_f: 'BuzzedFemale', swept: 'SimpleParted', long: 'Long', bun: 'Buns', braid: 'Buns', beard: 'Beard' };
const HAIR_CACHE = {};
const UBC_HEAD_CACHE = {};
// Head-space deformation shared by skin, eyes and hair so the scalp stays covered.
function fighterHeadShape(v, shape, kind = 'skin') {
  const face = shapeDelta(shape, 'face'), jaw = shapeDelta(shape, 'jaw');
  const lower = 1 - THREE.MathUtils.smoothstep(v.y, -0.065, 0.035);
  v.x *= 1 + face * 0.13 + jaw * 0.10 * lower;
  if (kind === 'skin' || kind === 'eyes') {
    // Use the same spatial warp for eyelids and eyeballs. Moving only the eye
    // sphere exposes its white outer edge at the extremes of the slider.
    const eyeBand = THREE.MathUtils.smoothstep(v.y, 0.045, 0.085) * (1 - THREE.MathUtils.smoothstep(v.y, 0.155, 0.205));
    const eyeSide = THREE.MathUtils.smoothstep(Math.abs(v.x), 0.008, 0.027) * (1 - THREE.MathUtils.smoothstep(Math.abs(v.x), 0.090, 0.140));
    const eyeFront = THREE.MathUtils.smoothstep(v.z, 0.015, 0.060);
    v.x += Math.sign(v.x) * shapeDelta(shape, 'eyes') * 0.010 * eyeBand * eyeSide * eyeFront;
  }
  if (kind === 'skin') {
    const nose = Math.exp(-Math.pow(v.x / 0.030, 2) - Math.pow((v.y - 0.070) / 0.028, 2));
    const mouth = Math.exp(-Math.pow((v.y - 0.020) / 0.019, 2));
    if (v.z > 0.065) { v.z += shapeDelta(shape, 'nose') * 0.012 * nose; v.x *= 1 + shapeDelta(shape, 'mouth') * 0.22 * mouth; }
  }
  return v;
}
function fighterUBCHead(J, L, skin) {
  if (typeof UBC_HEAD_GEO === 'undefined' || !J.bones?.Head) return false;
  const sex = L.g === 'female' ? 'female' : 'male', source = UBC_HEAD_GEO[sex];
  if (!source || !source.ibm) return false;
  let rig = null; J.root.traverse(n => { if (!rig && n.isSkinnedMesh) rig = n; });
  if (!rig || source.bones.some(name => !J.bones[name])) return false;
  const decode = s => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  if (!UBC_HEAD_CACHE[sex]) {
    const raw = new Float32Array(decode(source.ibm).buffer), inverse = [];
    for (let i = 0; i < raw.length; i += 16) inverse.push(new THREE.Matrix4().fromArray(raw, i));
    const make = packed => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(decode(packed.p).buffer), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(decode(packed.uv).buffer), 2));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(decode(packed.j).buffer), 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Float32Array(decode(packed.w).buffer), 4));
      g.setIndex(new THREE.BufferAttribute(new Uint16Array(decode(packed.i).buffer), 1));
      return g;
    };
    const loadMap = uri => { const t = new THREE.TextureLoader().load(uri); t.flipY = false; t.encoding = THREE.sRGBEncoding; return t; };
    UBC_HEAD_CACHE[sex] = { head: make(source.head), eyes: make(source.eyes), inverse, map: loadMap(source.map), eyeMap: loadMap(source.eyeMap) };
  }
  const cache = UBC_HEAD_CACHE[sex], bindHead = cache.inverse[6].clone().invert();
  const tint = new THREE.Color(skin).convertSRGBToLinear(), neutral = new THREE.Color('#c68a62').convertSRGBToLinear();
  tint.r = Math.min(1.7, tint.r / neutral.r); tint.g = Math.min(1.7, tint.g / neutral.g); tint.b = Math.min(1.7, tint.b / neutral.b);
  for (const kind of ['head', 'eyes']) {
    const g = cache[kind].clone(), p = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(cache.inverse[6]);
      // Taper the enlarged head into the authored neck instead of widening the collar.
      let headWeight = 0; for (let c = 0; c < 4; c++) if (si.array[i * 4 + c] === 6) headWeight += sw.array[i * 4 + c];
      v.x *= 1 + 0.28 * headWeight; v.z *= 1 + 0.28 * headWeight; v.y *= 1 + 0.12 * headWeight;
      fighterHeadShape(v, L.sh, kind === 'eyes' ? 'eyes' : 'skin');
      if (kind === 'head') {
        // The retained lower ring belongs inside the modular collar, not on
        // the shirt surface. Taper only the neck below the jaw; keep its weights.
        const collarBlend = 1 - THREE.MathUtils.smoothstep(v.y, -0.12, -0.035);
        v.x *= 1 - 0.22 * collarBlend;
        v.z = THREE.MathUtils.lerp(v.z, -0.035, 0.9 * collarBlend);
      }
      v.applyMatrix4(bindHead); p.setXYZ(i, v.x, v.y, v.z);
    }
    p.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.MeshStandardMaterial({ map: kind === 'head' ? cache.map : cache.eyeMap, color: kind === 'head' ? tint : 0xffffff, roughness: kind === 'head' ? 0.86 : 0.38, side: THREE.DoubleSide });
    const mesh = new THREE.SkinnedMesh(g, m);
    mesh.name = kind === 'head' ? 'fighterUBCHead' : 'fighterUBCEyes'; mesh.frustumCulled = false; mesh.castShadow = SHADOWS;
    mesh.bind(new THREE.Skeleton(source.bones.map(name => J.bones[name]), cache.inverse), rig.bindMatrix);
    rig.parent.add(mesh);
    if (kind === 'head') { J.appearanceHead = mesh; J.headInverse = cache.inverse[6]; }
  }
  return true;
}
function fighterHairMesh(J, style, color, gender, shape) {
  const key = HAIR_STYLES[gender === 'female' && style === 'crop' ? 'crop_f' : style];
  const cacheKey = key + ':' + (gender || 'male');
  if (!key || typeof HAIR_GEO === 'undefined' || !HAIR_GEO[key]) return false;
  let source = null;
  J.root.traverse(n => { if (!source && n.isSkinnedMesh) source = n; });
  if (!source) return false;
  if (!HAIR_CACHE[cacheKey]) {
    const P = HAIR_GEO[key], bytes = s => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
    const g = new THREE.BufferGeometry(), q = new Uint16Array(bytes(P.p).buffer), pos = new Float32Array(P.n * 3);
    for (let i = 0; i < P.n; i++) for (let c = 0; c < 3; c++) pos[i * 3 + c] = P.lo[c] + q[i * 3 + c] * P.sc[c];
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(bytes(P.nr).buffer), 3, true));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Array.from(bytes(P.j)), 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(bytes(P.w), 4, true));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(bytes(P.i).buffer), 1));
    g.computeBoundingSphere();
    const raw = new Float32Array(bytes(P.ibm).buffer), inverse = [];
    for (let i = 0; i < raw.length; i += 16) inverse.push(new THREE.Matrix4().fromArray(raw, i));
    // The source scalp is smaller and lower than our custom face. Fit in head-bone space
    // so every animation keeps the same placement, including in portraits and statues.
    const bindHead = inverse[6].clone().invert(), v = new THREE.Vector3();
    for (let i = 0; i < P.n; i++) {
      v.fromArray(pos, i * 3).applyMatrix4(inverse[6]);
      v.x *= 1.28; v.z *= 1.28; v.y *= 1.12;
      v.applyMatrix4(bindHead).toArray(pos, i * 3);
    }
    g.attributes.position.needsUpdate = true; g.computeBoundingSphere();
    HAIR_CACHE[cacheKey] = { geometry: g, inverse };
  }
  const packed = HAIR_CACHE[cacheKey], geometry = packed.geometry.clone();
  const headBind = packed.inverse[6].clone().invert(), point = new THREE.Vector3(), hp = geometry.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    point.fromBufferAttribute(hp, i).applyMatrix4(packed.inverse[6]);
    fighterHeadShape(point, shape, 'hair');
    point.applyMatrix4(headBind); hp.setXYZ(i, point.x, point.y, point.z);
  }
  // Preserve authored normals: these modular assets contain mixed winding.
  hp.needsUpdate = true; geometry.computeBoundingSphere();
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.91, side: THREE.DoubleSide }));
  mesh.name = 'fighterHair'; mesh.frustumCulled = false; mesh.castShadow = SHADOWS;
  mesh.bind(new THREE.Skeleton(source.skeleton.bones, packed.inverse), source.bindMatrix);
  source.parent.add(mesh);
  return true;
}
function fighterBeard(J, style, color, shape) {
  const head = J.bones.Head, local = J.appearanceHead.geometry.clone();
  local.applyMatrix4(J.headInverse); local.computeBoundingSphere();
  const proxy = new THREE.Mesh(local, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster(), point = new THREE.Vector3();
  const surface = (x, y) => {
    ray.set(new THREE.Vector3(x, y, 0.5), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(proxy, false)[0]; return hit ? hit.point.z : 0.10;
  };
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.96, side: THREE.DoubleSide });
  const add = geometry => { const mesh = new THREE.Mesh(geometry, mat); mesh.name = 'fighterBeard'; head.add(mesh); return mesh; };
  if (style !== 'stubble') for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, x = side * (0.004 + u * 0.042) * (1 + shapeDelta(shape, 'mouth') * 0.22), y = 0.046 - 0.011 * u;
      points.push(new THREE.Vector3(x, y, surface(x, y) + 0.004));
    }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, 0.0055, 6, false));
  }
  const packed = ['full', 'braided'].includes(style) && fighterHairMesh(J, 'beard', color, 'male', shape);
  if (style !== 'moustache' && !packed) {
    const p = [], idx = [], rows = 14, cols = 24, width = style === 'goatee' ? 0.025 : 0.074;
    const drop = style === 'stubble' ? 0 : style === 'goatee' ? 0.024 : 0.022;
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
      const u = col / cols * 2 - 1, v = row / rows;
      const x = u * width * (1 - v * 0.25) * (1 + shapeDelta(shape, 'face') * 0.13 + shapeDelta(shape, 'jaw') * 0.10);
      const top = style === 'goatee' ? 0.006 : 0.002 + 0.052 * Math.pow(Math.abs(u), 1.8);
      const y = top * (1 - v) - 0.021 * v;
      point.set(x, y - drop * v, surface(x, y) + 0.003 - drop * v * 0.30); p.push(point.x, point.y, point.z);
      if (row < rows && col < cols) { const a = row * (cols + 1) + col, b = a + cols + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(idx); g.computeVertexNormals();
    add(g); if (style === 'stubble') { mat.transparent = true; mat.opacity = 0.45; }
  }
  if (style === 'braided') for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    const m = add(new THREE.SphereGeometry(0.011, 8, 6)); m.position.set(side * (0.024 + Math.sin(i * Math.PI) * 0.004), -0.064 - i * 0.019, 0.075); m.scale.y = 1.25;
  }
  local.dispose(); proxy.material.dispose();
}
function fighterAppearance(J, L) {
  const head = J.bones && J.bones.Head;
  if (!head) return J;
  const skin = SKIN_TONES.includes(L.s) ? L.s : SKIN_TONES[2];
  const hair = FIGHTER_HAIR_COLORS.includes(L.hc) ? L.hc : FIGHTER_HAIR_COLORS[1];
  const eyes = FIGHTER_EYES.includes(L.ec) ? L.ec : FIGHTER_EYES[0];
  const style = L.ha === 'none' || HAIR_STYLES[L.ha] ? L.ha : 'crop';
  const beard = L.g !== 'female' && FIGHTER_BEARDS.some(([key]) => key === L.be) ? L.be : 'none';
  const shape = L.sh || {}, faceWidth = shapeDelta(shape, 'face'), jawWidth = shapeDelta(shape, 'jaw');
  const eyeSpacing = shapeDelta(shape, 'eyes'), noseSize = shapeDelta(shape, 'nose'), mouthWidth = shapeDelta(shape, 'mouth');
  const eyeX = 0.043 + eyeSpacing * 0.012, rx = 0.115 * (1 + faceWidth * 0.13), ry = 0.143, rz = 0.121;
  const surface = (x, y) => rz * Math.sqrt(Math.max(0.045, 1 - x * x / (rx * rx) - y * y / (ry * ry)));
  const skinMat = tmat(skin), hairMat = tmat(hair), eyeMat = tmat(eyes);
  if (J.costume) J.root.traverse(n => { if (n.userData && n.userData.outfitBaseHead) n.visible = false; });
  // Keep facial details aligned with the head's bind position, without lifting
  // the whole face nine centimetres away from the shoulders.
  const face = grp(head, 0, L.g === 'female' ? 0.01 : 0.07, 0);
  face.name = 'fighterAppearance';
  const modelHead = fighterUBCHead(J, L, skin);
  // The packed head includes the original weighted neck; only the procedural
  // fallback needs a connector.
  if (!modelHead) {
    const neck = mk(face, geo('fighter_neck', () => new THREE.CylinderGeometry(0.052, 0.065, 0.16, 12)), skinMat, 0, -0.16, 0);
    neck.name = 'fighterNeck';
  }
  if (!modelHead) {
  const headGeo = new THREE.SphereGeometry(1, 32, 24), hp = headGeo.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    let x = hp.getX(i) * rx, y = hp.getY(i) * ry, z = hp.getZ(i) * rz;
    x *= 1 + jawWidth * 0.12 * Math.max(0, -y / ry);
    if (z > 0) {
      const nose = Math.exp(-Math.pow(x / 0.026, 2) - Math.pow((y + 0.019) / 0.044, 2));
      const leftEye = Math.exp(-Math.pow((x + eyeX) / 0.021, 2) - Math.pow((y - 0.025) / 0.018, 2));
      const rightEye = Math.exp(-Math.pow((x - eyeX) / 0.021, 2) - Math.pow((y - 0.025) / 0.018, 2));
      z += (0.022 + noseSize * 0.01) * nose - 0.006 * (leftEye + rightEye);
    }
    hp.setXYZ(i, x, y, z);
  }
  hp.needsUpdate = true; headGeo.computeVertexNormals();
  mk(face, headGeo, skinMat, 0, 0, 0);
  for (const side of [-1, 1]) {
    const ear = mk(face, geo('face_ear', () => new THREE.SphereGeometry(0.029, 10, 8)), skinMat, side * rx * 0.98, -0.014, 0);
    ear.scale.set(0.55, 1, 0.55);
    const eyeZ = surface(side * eyeX, 0.025);
    const white = mk(face, geo('face_eye_white', () => new THREE.SphereGeometry(0.017, 10, 8)), tmat('#f3eadb'), side * eyeX, 0.025, eyeZ + 0.002);
    white.scale.set(1, 0.72, 0.24);
    const iris = mk(face, geo('face_iris', () => new THREE.SphereGeometry(0.010, 10, 8)), eyeMat, side * eyeX, 0.025, eyeZ + 0.006);
    iris.scale.set(0.72, 0.85, 0.25);
    const brow = mk(face, geo('face_brow', () => new THREE.BoxGeometry(0.047, 0.008, 0.007)), hairMat, side * eyeX, 0.053, surface(side * eyeX, 0.053) + 0.006);
    brow.rotation.z = side * 0.12;
  }
  const mouth = mk(face, geo('face_mouth', () => new THREE.BoxGeometry(0.043, 0.005, 0.006)), tmat('#784d43'), 0, -0.072, surface(0, -0.072) + 0.002);
  mouth.scale.x = 1 + mouthWidth * 0.32;
  mouth.rotation.z = -0.06;
  }
  if (style !== 'none' && !fighterHairMesh(J, style, hair, L.g, shape)) {
    const cap = mk(face, geo('face_hair_cap', () => new THREE.SphereGeometry(0.14, 16, 10, 0, TAU, 0, Math.PI * 0.58)), hairMat, 0, 0.094, 0.055);
    cap.scale.set(1.04, style === 'crop' ? 0.67 : 0.92, 1.05);
    if (style === 'swept') {
      const fringe = mk(face, geo('face_hair_fringe', () => new THREE.SphereGeometry(0.082, 12, 8)), hairMat, -0.037, 0.108, 0.15);
      fringe.scale.set(1.3, 0.43, 0.65); fringe.rotation.z = -0.25;
    }
    if (style === 'long' || style === 'braid') for (const side of [-1, 1]) {
      const lock = mk(face, geo('face_hair_lock', () => new THREE.CapsuleGeometry(0.036, 0.15, 5, 8)), hairMat, side * 0.102, -0.097, 0.1);
      lock.rotation.z = side * 0.1;
    }
    if (style === 'braid') for (let i = 0; i < 4; i++) mk(face, geo('face_braid', () => new THREE.SphereGeometry(0.035, 9, 7)), hairMat, 0.055, -0.055 - i * 0.061, -0.125);
    if (style === 'bun') mk(face, geo('face_bun', () => new THREE.SphereGeometry(0.074, 14, 10)), hairMat, 0, 0.104, -0.135);
  }
  if (beard !== 'none' && modelHead) fighterBeard(J, beard, hair, shape);
  if (beard !== 'none' && !modelHead) {
    const packBeard = (beard === 'full' || beard === 'braided') && fighterHairMesh(J, 'beard', hair, L.g, shape);
    const moustache = beard === 'moustache' || beard === 'goatee' || beard === 'short' || beard === 'full' || beard === 'braided';
    if (moustache) for (const side of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.052, surface(0, -0.052) + 0.004),
        new THREE.Vector3(side * 0.026, -0.049, surface(0.026, -0.049) + 0.005),
        new THREE.Vector3(side * 0.052, -0.061, surface(0.052, -0.061) + 0.003)]);
      mk(face, new THREE.TubeGeometry(curve, 8, beard === 'moustache' ? 0.006 : 0.008, 5, false), hairMat, 0, 0, 0);
    }
    if (beard !== 'moustache' && !packBeard) {
      const width = beard === 'goatee' ? 0.045 : 0.089 * (1 + jawWidth * 0.12);
      const drop = beard === 'stubble' ? 0.013 : beard === 'short' ? 0.035 : beard === 'goatee' ? 0.065 : 0.11;
      const vertices = [], index = [], cols = 12, rows = 5;
      for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
        const u = col / cols * 2 - 1, v = row / rows, x = u * width * (1 - 0.38 * v);
        const y = -0.058 - v * (0.067 + drop), z = y < -0.13 ? 0.035 * (1 - v) : surface(x, y) + 0.004;
        vertices.push(x, y, z + 0.008 * Math.sin(u * 9 + v * 4) * v);
        if (row < rows && col < cols) { const a = row * (cols + 1) + col, b = a + cols + 1; index.push(a, b, a + 1, b, b + 1, a + 1); }
      }
      const shell = new THREE.BufferGeometry(); shell.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); shell.setIndex(index); shell.computeVertexNormals();
      const beardMat = hairMat.clone(); beardMat.side = THREE.DoubleSide;
      if (beard === 'stubble') { beardMat.transparent = true; beardMat.opacity = 0.38; }
      mk(face, shell, beardMat, 0, 0, 0);
    }
    if (beard === 'braided') for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
        const braid = mk(face, geo('face_braid_beard', () => new THREE.SphereGeometry(0.012, 7, 5)), hairMat, side * 0.03, -0.16 - i * 0.021, 0.055);
        braid.scale.set(1, 1.25, 0.8);
    }
  }
  return J;
}
function outfitInit() {
  if (OUTFIT.ready || OUTFIT.failed || typeof OUTFIT_GEO === 'undefined') return OUTFIT.ready;
  try {
    const u8 = s => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
    for (const k in OUTFIT_GEO.parts) {
      const P = OUTFIT_GEO.parts[k], n = P.n, g = new THREE.BufferGeometry();
      const q = new Uint16Array(u8(P.p).buffer), pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) pos[i * 3 + c] = P.lo[c] + q[i * 3 + c] * P.sc[c];
      const qu = new Uint16Array(u8(P.uv).buffer), uv = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) uv[i * 2 + c] = P.ulo[c] + qu[i * 2 + c] * P.us[c];
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(u8(P.nr).buffer), 3, true));
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Array.from(u8(P.j)), 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(new Uint8Array(u8(P.w)), 4, true));
      g.setIndex(new THREE.BufferAttribute(new Uint16Array(u8(P.i).buffer), 1));
      g.computeBoundingSphere(); g.userData.mat = P.m;
      OUTFIT.geo[k] = g;
    }
    for (const k in OUTFIT_GEO.ibm) { const f = new Float32Array(u8(OUTFIT_GEO.ibm[k]).buffer), out = []; for (let i = 0; i < f.length; i += 16) out.push(new THREE.Matrix4().fromArray(f, i)); OUTFIT.ibm[k] = out; }
    const L = new THREE.TextureLoader();
    for (const k in OUTFIT_GEO.tex) { const t = L.load(OUTFIT_GEO.tex[k]); t.flipY = false; t.encoding = THREE.sRGBEncoding; OUTFIT.tex[k] = t; }
    OUTFIT.ready = true;
  } catch (e) { OUTFIT.failed = String(e); console.warn('outfits', e); }
  return OUTFIT.ready;
}
// the mannequin's head (and neck) only: triangles whose corners all ride the neck or head bone
function mannequinHead(g0) {
  if (OUTFIT.head.has(g0.uuid)) return OUTFIT.head.get(g0.uuid);
  const si = g0.attributes.skinIndex, sw = g0.attributes.skinWeight, idx = g0.index, keep = [];
  const top = v => { let b = 0, bw = -1; for (let c = 0; c < 4; c++) { const w = sw.getComponent ? sw.getComponent(v, c) : sw.array[v * 4 + c]; if (w > bw) { bw = w; b = si.getComponent ? si.getComponent(v, c) : si.array[v * 4 + c]; } } return b; };
  const ok = new Uint8Array(si.count); for (let v = 0; v < si.count; v++) { const b = top(v); ok[v] = b === 5 || b === 6 ? 1 : 0; }
  for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2); if (ok[a] && ok[b] && ok[c]) keep.push(a, b, c); }
  const g = g0.clone(); g.setIndex(keep); OUTFIT.head.set(g0.uuid, g); return g;
}
function outfitMat(key, tint) {
  const id = key + '|' + (tint || ''); if (OUTFIT.mats.has(id)) return OUTFIT.mats.get(id);
  const m = key.startsWith('#') ? new THREE.MeshStandardMaterial({ color: new THREE.Color(key).convertSRGBToLinear(), roughness: 0.8 })
    : new THREE.MeshStandardMaterial({ map: OUTFIT.tex[key], color: tint ? new THREE.Color(tint).convertSRGBToLinear() : 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  if (key === 'peasant_light') { m.emissive = new THREE.Color('#574839').convertSRGBToLinear(); m.emissiveIntensity = 0.6; }
  OUTFIT.mats.set(id, m); return m;
}
// o: { outfit: 'Male_Peasant' | 'Female_Peasant' | 'Male_Ranger' | 'Female_Ranger', tex: 'peasant2', skin: '#c68a62', tint: '#ffe8d0', h, anim }
function costumePerson(o) {
  if (typeof UAL === 'undefined' || !UAL.ready || !outfitInit()) return null;
  const parts = OUTFIT_GEO.outfits[o.outfit]; if (!parts) return null;
  const skin = o.skin || pick(SKIN_TONES);
  const J = ualPerson({ main: new THREE.Color(skin).convertSRGBToLinear(), joints: new THREE.Color(skin).convertSRGBToLinear(), h: o.h || 1.78, anim: o.anim || 'Idle_Loop' });
  let skm = null; J.root.traverse(n => { if (n.isSkinnedMesh) { if (!skm) skm = n; n.geometry = mannequinHead(n.geometry); n.userData.outfitBaseHead = true; } });
  if (!skm) return J;
  const cloth = o.tex || (o.outfit.includes('Ranger') ? 'ranger' : 'peasant'), female = o.outfit.startsWith('Female');
  const ibm = o.ownBind && OUTFIT.ibm[female ? 'Female' : 'Male'] ? OUTFIT.ibm[female ? 'Female' : 'Male'] : skm.skeleton.boneInverses;
  const skel = new THREE.Skeleton(skm.skeleton.bones, ibm);
  for (const k of parts) {
    if (o.showHair && k.includes('Head_Hood')) continue;
    const g = OUTFIT.geo[k]; if (!g) continue;
    const m = new THREE.SkinnedMesh(g, g.userData.mat === 'skin' ? outfitMat(skin) : outfitMat(cloth, o.tint));
    m.userData.partKey = k;
    m.bind(skel, skm.bindMatrix); m.frustumCulled = false; m.castShadow = SHADOWS; skm.parent.add(m);
  }
  J.costume = o.outfit; J.skin = skin;
  return J;
}
// Shape the bind-pose clothing once when an appearance is assembled. Each fighter
// owns its geometry; the packed CC0 originals remain shared and untouched.
function fighterShapeCostume(J, shape) {
  if (!shape) return;
  const d = key => shapeDelta(shape, key), bell = (y, center, width) => Math.exp(-Math.pow((y - center) / width, 2));
  const mass = d('mass'), muscle = d('muscle'), shoulder = d('shoulders'), waist = d('waist'), hip = d('hips');
  const arm = d('arms'), leg = d('legs'), bust = d('bust'), breast = d('breast'), butt = d('butt');
  J.root.traverse(mesh => {
    const key = mesh.userData && mesh.userData.partKey;
    if (!mesh.isSkinnedMesh || !key) return;
    const body = /_Body/.test(key), arms = /_Arms/.test(key), legs = /_Legs/.test(key);
    if (!body && !arms && !legs) return;
    const g = mesh.geometry.clone(), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), side = Math.sign(x) || 1;
      let nx = x, nz = z;
      if (body) {
        const shoulders = bell(y, 1.42, 0.23), mid = bell(y, 1.12, 0.19), hips = bell(y, 0.96, 0.19);
        nx *= 1 + mass * 0.055 + muscle * 0.045 * shoulders + shoulder * 0.13 * shoulders + waist * 0.13 * mid + hip * 0.15 * hips + bust * 0.075 * shoulders;
        nz *= 1 + mass * 0.065 + waist * 0.10 * mid + bust * 0.10 * shoulders;
        if (z > 0) nz += breast * 0.07 * bell(y, 1.35, 0.16) * bell(Math.abs(x), 0.09, 0.085);
        if (z < 0) nz -= butt * 0.065 * bell(y, 0.98, 0.15);
      } else if (arms) {
        nx += side * shoulder * 0.035;
        nx += (x - side * 0.33) * (arm * 0.19 + muscle * 0.08 + mass * 0.04);
        nz *= 1 + arm * 0.16 + muscle * 0.07;
      } else {
        nx += (x - side * 0.105) * (leg * 0.20 + muscle * 0.055 + mass * 0.05);
        nz *= 1 + leg * 0.14 + mass * 0.05;
        nx += side * hip * 0.022 * bell(y, 0.91, 0.24);
      }
      pos.setXYZ(i, nx, y, nz);
    }
    // These skinned parts have authored normals. Recomputing them from their
    // mixed-winding modular triangles makes the torso almost black in WebGL.
    pos.needsUpdate = true; g.computeBoundingSphere(); mesh.geometry = g;
  });
}
// a townsperson in costume when the outfits are loaded, a coloured mannequin otherwise
const OUTFIT_TINTS = ['#ffffff', '#ffffff', '#ffeedd', '#e8f0ff', '#eef8e4', '#ffe4e0', '#f2e8ff', '#fff6d8'];
function folkOutfit(role, i) {
  const fem = i % 2 === 1, M = fem ? 'Female_' : 'Male_';
  if (role === 'guard' || role === 'gateguard') return { outfit: 'Male_Ranger', tex: 'ranger2', tint: '#c9d3ff' };
  if (role === 'smith') return { outfit: 'Male_Peasant', tex: 'peasant2' };
  if (role === 'gardener') return { outfit: 'Female_Peasant', tex: 'peasant', tint: '#f4ffe8' };
  const ranger = Math.random() < 0.35;
  return { outfit: M + (ranger ? 'Ranger' : 'Peasant'), tex: (ranger ? 'ranger' : 'peasant') + (Math.random() < 0.5 ? '2' : ''), tint: pick(OUTFIT_TINTS) };
}
function costumeOr(o, costume) {
  const J = costume && costumePerson(Object.assign({ h: o.h, anim: o.anim }, costume));
  return J || townPerson(o);
}
// a little steel kettle hat for the guards
function kettleHat(J) {
  const head = J.bones && J.bones.Head; if (!head) return;
  const st = tmat('#9aa3a8', { metalness: 0.7, roughness: 0.35 }), g = grp(head, 0, 0.13, 0);
  mk(g, geo('f_kdome', () => new THREE.SphereGeometry(0.125, 14, 8, 0, TAU, 0, Math.PI / 2)), st, 0, 0, 0);
  mk(g, geo('f_kbrim', () => new THREE.CylinderGeometry(0.22, 0.22, 0.015, 18)), st, 0, 0, 0);
}
// vendors wear their stall's colour over the outfit (half-strength, so the cloth still reads)
const VENDOR_FIT = { smith: 'Male_Peasant', artificer: 'Female_Ranger', armour: 'Female_Ranger', quarter: 'Female_Peasant', wizard: 'Male_Ranger', tavern: 'Male_Peasant', trainer: 'Female_Ranger', herald: 'Female_Peasant', bard: 'Male_Ranger', guild: 'Male_Peasant', estate: 'Male_Peasant', wardrobe: 'Female_Peasant', barber: 'Female_Peasant', ghost: 'Male_Ranger' };
function vendorOutfit(V) {
  const o = VENDOR_FIT[V.key] || 'Male_Peasant', c = new THREE.Color('#ffffff').lerp(new THREE.Color(V.col || '#888888'), 0.4);
  return { outfit: o, tex: o.includes('Ranger') ? 'ranger' : (V.key === 'smith' || V.key === 'guild' ? 'peasant2' : 'peasant'), tint: '#' + c.getHexString() };
}
// spectators round the list in costume (the venue's block crowd is hidden in town)
const SPECT = { people: [], seated: [], t: 0 };
function buildSpectators() {
  SPECT.people = []; if (typeof UAL === 'undefined' || !UAL.ready || !outfitInit()) return false;
  const spots = [];
  // Side aisles belong to the bleachers. Standing spectators watch from the
  // north/south rope only, with their centres fully outside the string.
  for (const sz of [-1, 1]) for (const x of [-11, -8, -5, -2, 2, 5, 8, 11]) spots.push([x + rand(-0.35, 0.35), sz * rand(20, 21)]);
  spots.forEach(([x, z], i) => {
    if (IS_TOUCH && i % 2) return;
    const fit = folkOutfit('towns', i), J = costumePerson(Object.assign({ h: rand(1.6, 1.86), anim: pick(['Idle_Loop', 'Idle_Talking_Loop', 'Idle_Loop']) }, fit)); if (!J) return;
    if (J.costume.includes('Peasant') && Math.random() < 0.4) dress(J, { b: '#5a2a2a', t: pick(['#c9b48a', '#e8e0cc']), h: pick(['cap', 'flowers', 'hood']), c: 'none', n: 'none' });
    J.root.position.set(x, gy(x, z), z); J.root.rotation.y = Math.atan2(-x, -z); TOWN.root.add(J.root);
    TOWN.obst.push({ x, z, r: 0.45 });
    SPECT.people.push({ J, t: rand(4, 16) });
  });
  return true;
}
function updateSpectators(dt) {
  SPECT.t += dt; if (SPECT.t < 1 / 30) return; const st = SPECT.t; SPECT.t = 0; // 30 fps is plenty for a crowd
  updateArenaSeatFolk(st);
  const hot = typeof BOUT !== 'undefined' && BOUT.on && BOUT.phase === 'stopping';
  for (const S of SPECT.people) {
    S.t -= st; if (S.t <= 0 || (hot && S.J.cur !== 'Dance_Loop' && Math.random() < 0.02)) { S.t = rand(6, 18); S.J.play(hot || Math.random() < 0.2 ? 'Dance_Loop' : pick(['Idle_Loop', 'Idle_Talking_Loop']), 0.4); }
    if (S.J.root.visible) S.J.mixer.update(st);
  }
}
function townCrowd(show) {
  const C = W3.crowd; if (C) { if (C.bodies) C.bodies.visible = show; if (C.heads) C.heads.visible = show; }
  if (W3.flagMesh) W3.flagMesh.visible = show;
}
// you (and other players) in town: an outfit from the wardrobe if you bought one, else the club-coloured mannequin
const OUTFIT_TEX = ['peasant', 'peasant2', 'peasant_light', 'ranger', 'ranger2'];
function lookPerson(L, ht) {
  let J = null;
  if (L.o && typeof L.o === 'string') {
    const [outfit, tex] = L.o.split('|');
    if (OUTFIT_GEO && OUTFIT_GEO.outfits && OUTFIT_GEO.outfits[outfit] && OUTFIT_TEX.includes(tex)) {
      const tint = L.d ? '#' + new THREE.Color('#ffffff').lerp(new THREE.Color(L.b || '#888888'), 0.55).getHexString() : null;
      const skin = SKIN_TONES.includes(L.s) ? L.s : SKIN_TONES[2];
      J = costumePerson({ outfit, tex, tint, skin, h: ht || 1.8, anim: 'Idle_Loop', showHair: true });
    }
  }
  if (!J) {
    const outfit = L.g === 'female' ? 'Female_Peasant' : 'Male_Peasant';
    const tint = '#' + new THREE.Color('#ffffff').lerp(new THREE.Color(L.b || '#888888'), 0.18).getHexString();
    J = costumePerson({ outfit, tex: 'peasant_light', tint, skin: SKIN_TONES.includes(L.s) ? L.s : SKIN_TONES[2], h: ht || 1.8, anim: 'Idle_Loop' });
  }
  if (!J) J = townPerson({ main: L.b || '#555', joints: L.t || '#2a2e33', h: ht || 1.8, anim: 'Idle_Loop' });
  const mass = L.sh ? shapeDelta(L.sh, 'mass') : L.bd === 'light' ? -0.6 : L.bd === 'heavy' ? 0.7 : 0;
  J.root.scale.set(1 + mass * 0.08, 1, 1 + mass * 0.08);
  fighterShapeCostume(J, L.sh);
  fighterAppearance(J, L);
  return dress(J, { b: L.b || '#555', t: L.t || '#ccc', h: L.h, f: L.f, c: L.c, n: L.n, e: L.e, w: L.w, sh: L.sh });
}
// a little portrait of an outfit for the wardrobe card, rendered once off-screen with the game's own renderer
const PORTRAITS = {};
// Box3.setFromObject uses bind-pose geometry on this Three version. Sample
// the actual skinned vertices so animation, height and hair all count.
function fighterVisualBounds(J, faceOnly) {
  J.root.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  const headY = J.bones.Head.getWorldPosition(new THREE.Vector3()).y;
  J.root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.visible || !mesh.geometry.attributes.position) return;
    if (faceOnly && !['fighterUBCHead', 'fighterUBCEyes', 'fighterHair', 'fighterBeard'].includes(mesh.name)) return;
    if (mesh.isSkinnedMesh) mesh.skeleton.update();
    const pos = mesh.geometry.attributes.position;
    const used = mesh.geometry.index ? new Set(mesh.geometry.index.array) : Array.from({ length: pos.count }, (_, i) => i);
    for (const i of used) {
      v.fromBufferAttribute(pos, i); if (mesh.isSkinnedMesh) mesh.boneTransform(i, v);
      v.applyMatrix4(mesh.matrixWorld);
      if (faceOnly && mesh.name === 'fighterUBCHead' && v.y < headY - 0.10) continue;
      box.expandByPoint(v);
    }
  });
  if (box.isEmpty()) { const p = J.bones.Head.getWorldPosition(new THREE.Vector3()); box.setFromCenterAndSize(p, new THREE.Vector3(0.4, 0.5, 0.4)); }
  return box;
}
function outfitThumb(key, large = false) {
  const face = large === 'face', W = face ? 192 : large ? 170 : 72, H = face ? 192 : large ? 226 : 96, c = cvs(W, H), cacheKey = `${key}:${face ? 'face' : W}`;
  const draw = src => c.getContext('2d').drawImage(src, 0, 0);
  if (PORTRAITS[cacheKey]) { draw(PORTRAITS[cacheKey]); return c; }
  try {
    if (!W3.renderer || typeof UAL === 'undefined' || !UAL.ready) return c;
    const L = lookLite(), J = lookPerson({ ...L, o: key === 'none' ? '' : key, h: 'none', c: 'none', n: 'none' }, L.ht || 1.8);
    if (!J) return c;
    J.mixer.update(0.01);
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#6b5a48', 1.1)); const dl = new THREE.DirectionalLight('#ffffff', 1.3); dl.position.set(1.5, 3, 4); sc.add(dl); sc.add(J.root);
    const bounds = fighterVisualBounds(J, face), sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 20);
    const halfFov = Math.min(cam.fov * Math.PI / 360, Math.atan(Math.tan(cam.fov * Math.PI / 360) * cam.aspect));
    const distance = sphere.radius * 1.12 / Math.sin(halfFov);
    cam.position.copy(sphere.center).add(new THREE.Vector3(0, 0, distance)); cam.lookAt(sphere.center);
    const rt = new THREE.WebGLRenderTarget(W * 2, H * 2), R = W3.renderer, prev = R.getRenderTarget(), pc = R.getClearColor(new THREE.Color()), pa = R.getClearAlpha();
    R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(sc, cam);
    const px = new Uint8Array(W * 2 * H * 2 * 4); R.readRenderTargetPixels(rt, 0, 0, W * 2, H * 2, px);
    R.setRenderTarget(prev); R.setClearColor(pc, pa); rt.dispose();
    const big = cvs(W * 2, H * 2), bx = big.getContext('2d'), id = bx.createImageData(W * 2, H * 2);
    for (let y = 0; y < H * 2; y++) for (let x = 0; x < W * 2; x++) { const s = ((H * 2 - 1 - y) * W * 2 + x) * 4, d = (y * W * 2 + x) * 4; for (let k = 0; k < 3; k++) id.data[d + k] = Math.round(Math.pow(px[s + k] / 255, 1 / 2.2) * 255); id.data[d + 3] = px[s + 3]; }
    bx.putImageData(id, 0, 0);
    const small = cvs(W, H); small.getContext('2d').drawImage(big, 0, 0, W, H); PORTRAITS[cacheKey] = small; draw(small);
  } catch (e) { console.warn('portrait', e); }
  return c;
}

