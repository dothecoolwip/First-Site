// Cloth follows the upper spine. The collar is fixed; springy lower rows trail
// torso motion and catch a slow, travelling wind.
const CAPE_TEX = new Map();
const CAPE_STYLE = {
  club: { length: 1.02, width: 0.43, clasp: '#a98245' },
  royal: { color: '#8e1829', trim: '#d9b45d', length: 1.12, width: 0.47, clasp: '#d9b45d' },
  shadow: { color: '#24262d', trim: '#555866', length: 1.08, width: 0.44, clasp: '#737782' },
  shroud: { color: '#d8eaf0', trim: '#9bc5d4', length: 1.17, width: 0.46, clasp: '#bad6df', opacity: 0.9, ragged: true },
  ranger: { color: '#35583a', trim: '#9c8054', length: 0.97, width: 0.42, clasp: '#a8895a', ragged: true },
  courtier: { color: '#56336e', trim: '#c9a86b', length: 1.05, width: 0.47, clasp: '#d3b374' }
};
function capeTexture(color, trim, style) {
  const key = `${color}|${trim}|${style}`;
  if (CAPE_TEX.has(key)) return CAPE_TEX.get(key);
  const c = cvs(256, 256), ctx = c.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256);
  // Small threads and shaded folds give the flat-shaded world a cloth surface.
  for (let x = 3; x < 256; x += 7) { ctx.fillStyle = 'rgba(255,255,255,.055)'; ctx.fillRect(x, 0, 1, 256); }
  for (let y = 2; y < 256; y += 7) { ctx.fillStyle = 'rgba(0,0,0,.055)'; ctx.fillRect(0, y, 256, 1); }
  for (const x of [57, 124, 193]) {
    const fold = ctx.createLinearGradient(x - 24, 0, x + 24, 0);
    fold.addColorStop(0, 'rgba(0,0,0,0)'); fold.addColorStop(0.5, 'rgba(0,0,0,.13)'); fold.addColorStop(1, 'rgba(255,255,255,.045)');
    ctx.fillStyle = fold; ctx.fillRect(x - 24, 0, 48, 256);
  }
  const border = style === 'royal' || style === 'courtier' ? 6 : 3;
  ctx.fillStyle = trim;
  ctx.fillRect(0, 0, border, 256); ctx.fillRect(256 - border, 0, border, 256);
  ctx.fillRect(0, 0, 256, 5); ctx.fillRect(0, 249, 256, 7);
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.fillRect(border + 2, 0, 1, 256); ctx.fillRect(253 - border, 0, 1, 256); ctx.fillRect(0, 246, 256, 1);
  if (style === 'royal' || style === 'courtier') {
    ctx.fillStyle = trim;
    for (let x = 25; x < 242; x += 36) {
      ctx.beginPath(); ctx.moveTo(x, 224); ctx.lineTo(x + 6, 230); ctx.lineTo(x, 236); ctx.lineTo(x - 6, 230); ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(c); texture.encoding = THREE.sRGBEncoding; texture.anisotropy = 4;
  CAPE_TEX.set(key, texture); return texture;
}
function capeCreate(J, L) {
  const style = CAPE_STYLE[L.c] || CAPE_STYLE.club;
  const shoulderFit = typeof shapeDelta === 'function' ? shapeDelta(L.sh, 'shoulders') : 0;
  const massFit = typeof shapeDelta === 'function' ? shapeDelta(L.sh, 'mass') : 0;
  const color = style.color || L.b || '#5e2530', trim = style.trim || L.t || '#c3a46f';
  const spine = J.bones && (J.bones.spine_03 || J.bones.spine_02);
  const anchor = spine || J.root;
  J.root.updateMatrixWorld(true);
  const neck = J.bones && J.bones.neck_01;
  const collar = neck ? J.root.worldToLocal(neck.getWorldPosition(new THREE.Vector3())) : new THREE.Vector3(0, 1.44, 0);
  const bodyScale = neck ? neck.getWorldScale(new THREE.Vector3()).y / J.root.getWorldScale(new THREE.Vector3()).y : 1;
  collar.y -= 0.035 * bodyScale;
  const samples = [], p = new THREE.Vector3(); let back = Infinity, halfWidth = 0.21;
  J.root.traverse(mesh => {
    if (!mesh.isSkinnedMesh || !/_Body|_Legs/.test(mesh.userData.partKey || '')) return;
    mesh.skeleton.update();
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i); mesh.boneTransform(i, p); p.applyMatrix4(mesh.matrixWorld); J.root.worldToLocal(p);
      if (/_Body/.test(mesh.userData.partKey) && Math.abs(p.y - collar.y) < 0.07 * bodyScale && Math.abs(p.x) < 0.28 * bodyScale) {
        back = Math.min(back, p.z); halfWidth = Math.max(halfWidth, Math.abs(p.x) / bodyScale * 0.82);
      }
      if (i % Math.max(1, Math.ceil(pos.count / 96)) === 0) samples.push({ mesh, i });
    }
  });
  collar.z = Number.isFinite(back) ? back - 0.012 * bodyScale : -0.16 * bodyScale;
  const collarWorld = J.root.localToWorld(collar);
  const collarLocal = anchor.worldToLocal(collarWorld);
  const root = grp(anchor, collarLocal.x, collarLocal.y, collarLocal.z), cols = 20, rows = 18;
  // The upper-spine bind pose leans forward. Preserve a vertical cloth rest pose
  // while still inheriting every later turn and bend of the shoulders.
  root.quaternion.copy(anchor.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(J.root.getWorldQuaternion(new THREE.Quaternion())));
  root.name = 'capeShoulders';
  const points = [], uv = [], indices = [];
  for (let row = 0; row <= rows; row++) {
    const v = row / rows, fittedWidth = style.width * (1 + shoulderFit * 0.12 + massFit * 0.06);
    const spread = halfWidth + (fittedWidth - halfWidth) * Math.pow(v, 0.82);
    for (let col = 0; col <= cols; col++) {
      const u = col / cols * 2 - 1;
      const hem = row === rows ? (style.ragged ? 0.055 * Math.sin(col * 2.3) + 0.035 * Math.cos(col * 4.1) : 0.035 * u * u) : 0;
      // Curl the top around the shoulders and sculpt broad vertical folds.
      const fold = 0.055 * Math.cos(u * Math.PI * 5) * Math.pow(v, 0.75);
      points.push(u * spread, -style.length * v + hem - 0.025 * u * u * (1 - v),
        0.055 * u * u * (1 - v) - 0.15 * Math.sin(v * Math.PI / 2) + fold);
      uv.push(col / cols, 1 - v);
      if (row < rows && col < cols) {
        const a = row * (cols + 1) + col, b = a + cols + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.userData.capeCols = cols; geometry.userData.capeRows = rows;
  const material = new THREE.MeshStandardMaterial({
    map: capeTexture(color, trim, L.c), roughness: 0.96, side: THREE.DoubleSide,
    transparent: !!style.opacity, opacity: style.opacity || 1, depthWrite: !style.opacity
  });
  const cloth = new THREE.Mesh(geometry, material); cloth.castShadow = SHADOWS && !style.opacity;
  cloth.name = 'capeCloth'; cloth.receiveShadow = true; cloth.frustumCulled = false; root.add(cloth);
  const clasp = lmat({ color: style.clasp, metalness: L.c === 'royal' || L.c === 'courtier' ? 0.55 : 0.15, roughness: 0.55 });
  const claspGeo = geo('cape_clasp', () => new THREE.SphereGeometry(0.021, 8, 6));
  const strap = lmat({ color, roughness: 0.92, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const band = mk(root, geo('cape_shoulder_band', () => new THREE.BoxGeometry(0.055, 0.018, 0.085)), strap, side * halfWidth * 0.82, -0.012, 0.035);
    band.rotation.y = side * 0.3;
    mk(root, claspGeo, clasp, side * halfWidth * 0.82, 0.012, 0.022);
  }
  J.cape = { root, cloth, base: new Float32Array(points), velocity: new Float32Array(points.length),
    lastWorld: null, lastRotation: null, turn: 0, motionX: 0, motionZ: 0, gust: 0,
    samples, colliders: [...new Set(samples.map(sample => sample.mesh))], point: new THREE.Vector3(), gravity: new THREE.Vector3(), inverse: new THREE.Matrix4(), backRows: new Float32Array(rows + 1) };
}
function capeAnimate(J, speed, time, dt) {
  const C = J.cape; if (!C) return;
  const step = Math.min(0.05, Math.max(0, dt));
  if (!step) return;
  // Keep the collar's bind orientation relative to the spine. Gravity bends
  // the free cloth below it; it must never un-rotate the shoulder attachment.
  J.root.updateMatrixWorld(true);
  C.root.updateMatrixWorld(true);
  const rotation = J.root.getWorldQuaternion(new THREE.Quaternion());
  if (C.lastRotation) {
    const delta = C.lastRotation.clone().invert().multiply(rotation);
    // Use the shortest signed yaw, including turns across the +/-pi boundary.
    const yaw = Math.atan2(2 * (delta.w * delta.y + delta.x * delta.z), 1 - 2 * (delta.y * delta.y + delta.z * delta.z));
    C.turn = THREE.MathUtils.clamp(C.turn + yaw * 0.8, -0.8, 0.8);
  }
  C.lastRotation = rotation;
  C.turn *= Math.exp(-step * 3);
  const world = C.root.getWorldPosition(new THREE.Vector3());
  if (C.lastWorld) {
    const travel = world.clone().sub(C.lastWorld);
    if (travel.length() < 1) {
      const local = travel.applyQuaternion(C.root.getWorldQuaternion(new THREE.Quaternion()).invert()).divideScalar(step);
      const blend = 1 - Math.exp(-step * 5);
      C.motionX += (THREE.MathUtils.clamp(local.x, -7, 7) - C.motionX) * blend;
      C.motionZ += (THREE.MathUtils.clamp(local.z, -7, 7) - C.motionZ) * blend;
    } else { C.motionX = 0; C.motionZ = 0; }
  }
  C.lastWorld = world;
  const attr = C.cloth.geometry.attributes.position, src = C.base, dst = attr.array;
  const cols = C.cloth.geometry.userData.capeCols, rows = C.cloth.geometry.userData.capeRows;
  C.inverse.copy(C.root.matrixWorld).invert();
  C.gravity.set(0, -1, 0).transformDirection(C.inverse);
  C.backRows.fill(Infinity);
  for (const mesh of C.colliders) { mesh.updateWorldMatrix(true, false); mesh.skeleton.update(); }
  for (const sample of C.samples) {
    const mesh = sample.mesh;
    C.point.fromBufferAttribute(mesh.geometry.attributes.position, sample.i); mesh.boneTransform(sample.i, C.point);
    C.point.applyMatrix4(mesh.matrixWorld).applyMatrix4(C.inverse);
    const row = Math.round(-C.point.y / (-src[rows * (cols + 1) * 3 + 1]) * rows);
    if (Math.abs(C.point.x) < 0.31) for (let r = Math.max(2, row - 1); r <= Math.min(rows, row + 1); r++) C.backRows[r] = Math.min(C.backRows[r], C.point.z - 0.025);
  }
  for (let i = 0; i < attr.count; i++) {
    const v = Math.floor(i / (cols + 1)) / rows, u = i % (cols + 1) / cols * 2 - 1;
    if (v <= 1 / rows) continue; // collar and shoulder seam remain fastened
    const loose = v * v;
    const wave = Math.sin(time * 3.8 - v * 7.5 + u * 2.4);
    const sideWave = Math.sin(time * 2.1 - v * 4.5 + u * 4.1);
    const targets = [
      src[i * 3] + C.gravity.x * v * loose - C.motionX * 0.038 * loose + C.turn * 0.36 * loose + sideWave * 0.04 * loose,
      src[i * 3 + 1] + (C.gravity.y + 1) * v * loose + Math.abs(C.motionZ) * 0.009 * loose + wave * 0.017 * loose,
      src[i * 3 + 2] + C.gravity.z * v * loose - Math.max(0, C.motionZ) * 0.055 * loose - Math.abs(C.turn) * 0.12 * loose - Math.max(0, speed) * 0.009 * loose + wave * 0.065 * loose
    ];
    for (let axis = 0; axis < 3; axis++) {
      const j = i * 3 + axis;
      C.velocity[j] = (C.velocity[j] + (targets[axis] - dst[j]) * (34 - 14 * v) * step) * Math.exp(-8 * step);
      dst[j] += C.velocity[j] * step;
    }
    const back = C.backRows[Math.floor(i / (cols + 1))];
    if (Number.isFinite(back) && dst[i * 3 + 2] > back) { dst[i * 3 + 2] = back; C.velocity[i * 3 + 2] = Math.min(0, C.velocity[i * 3 + 2]); }
  }
  attr.needsUpdate = true; C.cloth.geometry.computeVertexNormals();
}

