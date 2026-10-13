// ---------- procedural armoured fighters, marshals, support crew ----------
const GEO = {};
function geo(key, make) { return GEO[key] || (GEO[key] = make()); }
function mk(parent, g, mat, x = 0, y = 0, z = 0, cast = true) { const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = false; parent.add(m); return m; }
function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
function lathe(pts, seg = 16) { return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg); }

function buildHelmet(head, type, S = MAT.steel) {
  const skull = () => mk(head, geo('bas', () => lathe([[0, 0.31], [0.035, 0.3], [0.085, 0.26], [0.122, 0.19], [0.136, 0.11], [0.132, 0.02], [0.12, -0.03]])), S, 0, 0, 0);
  const aventail = () => mk(head, geo('avent', () => new THREE.CylinderGeometry(0.13, 0.21, 0.15, 14, 1, true)), MAT.mail, 0, -0.08, 0);
  const dot = (x, y, z) => mk(head, geo('perf', () => new THREE.SphereGeometry(0.008, 4, 3)), MAT.slit, x, y, z, false);
  if (type === 'greathelm') {
    mk(head, geo('gh', () => new THREE.CylinderGeometry(0.135, 0.128, 0.32, 16)), S, 0, 0.11, 0);
    mk(head, geo('ghtop', () => new THREE.SphereGeometry(0.135, 16, 8, 0, TAU, 0, Math.PI / 2)), S, 0, 0.27, 0).scale.y = 0.35;
    mk(head, geo('slit', () => new THREE.BoxGeometry(0.21, 0.016, 0.03)), MAT.slit, 0, 0.16, 0.124, false);
    mk(head, geo('ghv', () => new THREE.BoxGeometry(0.03, 0.26, 0.025)), MAT.brass, 0, 0.1, 0.131, false);
    mk(head, geo('ghh', () => new THREE.BoxGeometry(0.25, 0.022, 0.02)), MAT.brass, 0, 0.185, 0.13, false);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) dot(0.045 + i * 0.018, 0.02 + j * 0.03, 0.13);
  } else if (type === 'sallet') {
    const sk = mk(head, geo('sal', () => new THREE.SphereGeometry(0.142, 16, 10, 0, TAU, 0, Math.PI * 0.58)), S, 0, 0.1, -0.015); sk.scale.set(1, 1.05, 1.28);
    mk(head, geo('bev', () => new THREE.CylinderGeometry(0.125, 0.1, 0.15, 14, 1, false, -Math.PI * 0.62, Math.PI * 1.24)), S, 0, 0.0, 0.0);
    mk(head, geo('slit2', () => new THREE.BoxGeometry(0.2, 0.02, 0.04)), MAT.slit, 0, 0.085, 0.118, false);
    mk(head, geo('salbr', () => new THREE.BoxGeometry(0.2, 0.012, 0.02)), MAT.brass, 0, 0.11, 0.13, false);
  } else if (type === 'barbute') {
    mk(head, geo('bar', () => lathe([[0, 0.29], [0.06, 0.28], [0.112, 0.23], [0.137, 0.13], [0.136, 0.02], [0.124, -0.07]])), S, 0, 0, 0);
    mk(head, geo('barv', () => new THREE.BoxGeometry(0.038, 0.15, 0.04)), MAT.slit, 0, 0.03, 0.12, false);
    mk(head, geo('barh', () => new THREE.BoxGeometry(0.15, 0.036, 0.04)), MAT.slit, 0, 0.11, 0.115, false);
  } else if (type === 'kettle') {
    mk(head, geo('kcrown', () => new THREE.SphereGeometry(0.128, 14, 8, 0, TAU, 0, Math.PI / 2)), S, 0, 0.13, 0).scale.y = 1.15;
    mk(head, geo('kbrim', () => new THREE.CylinderGeometry(0.215, 0.24, 0.014, 22)), S, 0, 0.13, 0);
    mk(head, geo('kface', () => new THREE.SphereGeometry(0.1, 10, 8)), MAT.gambeson, 0, 0.08, 0.01);
    mk(head, geo('kbev', () => new THREE.CylinderGeometry(0.125, 0.11, 0.13, 14, 1, false, -Math.PI * 0.6, Math.PI * 1.2)), S, 0, 0.0, 0.0);
    aventail();
  } else if (type === 'grill') {
    skull(); aventail();
    mk(head, geo('gface', () => new THREE.SphereGeometry(0.1, 10, 8)), MAT.slit, 0, 0.08, 0.04, false);
    for (let i = -2; i <= 2; i++) { const a = i * 0.32; const b = mk(head, geo('gbar', () => new THREE.CylinderGeometry(0.009, 0.009, 0.2, 5)), S, Math.sin(a) * 0.14, 0.08, Math.cos(a) * 0.14); }
    mk(head, geo('gring', () => new THREE.TorusGeometry(0.14, 0.012, 5, 16, Math.PI * 0.9)), S, 0, 0.18, 0).rotation.set(Math.PI / 2, 0, Math.PI * 0.05 + Math.PI * 0.5);
  } else if (type === 'cross') {
    skull(); aventail();
    mk(head, geo('cvis', () => new THREE.CylinderGeometry(0.142, 0.128, 0.22, 16, 1, false, -Math.PI * 0.42, Math.PI * 0.84)), S, 0, 0.07, 0);
    mk(head, geo('cslit', () => new THREE.BoxGeometry(0.17, 0.016, 0.03)), MAT.slit, 0, 0.15, 0.135, false);
    mk(head, geo('cxv', () => new THREE.BoxGeometry(0.024, 0.15, 0.012)), MAT.brass, 0, 0.06, 0.143, false);
    mk(head, geo('cxh', () => new THREE.BoxGeometry(0.1, 0.022, 0.012)), MAT.brass, 0, 0.1, 0.142, false);
    for (const [x, y] of [[-0.06, 0.07], [0.06, 0.07], [-0.06, 0.02], [0.06, 0.02]]) { dot(x, y, 0.135); dot(x - 0.012, y, 0.134); dot(x + 0.012, y, 0.134); dot(x, y + 0.012, 0.135); dot(x, y - 0.012, 0.135); }
  } else { // pig-face (long snout) or klappvisor (short)
    skull(); aventail();
    const long = type === 'pigface';
    const v = mk(head, geo(long ? 'visL' : 'visS', () => new THREE.ConeGeometry(0.095, long ? 0.2 : 0.12, 12)), S, 0, 0.085, long ? 0.16 : 0.14); v.rotation.x = Math.PI / 2; v.scale.set(1, 1, 0.8);
    mk(head, geo('vslit', () => new THREE.BoxGeometry(0.17, 0.016, 0.05)), MAT.slit, 0, 0.13, 0.13, false);
    if (long) for (let r = 0; r < 3; r++) for (let i = -2; i <= 2; i++) dot(i * 0.02 * (1 - r * 0.2), 0.03 + r * 0.025, 0.215 - Math.abs(i) * 0.012 - r * 0.025);
    else mk(head, geo('khinge', () => new THREE.SphereGeometry(0.02, 6, 4)), MAT.brass, 0, 0.23, 0.08, false);
  }
}

// merge sibling meshes that share a material into one, to keep draw calls down on phones
function mergeChildren(group) {
  const byMat = new Map();
  for (const c of group.children) {
    if (!c.isMesh || c.userData.keep || Array.isArray(c.material) || c.children.length) continue;
    if (!byMat.has(c.material)) byMat.set(c.material, []);
    byMat.get(c.material).push(c);
  }
  for (const [mat, list] of byMat) {
    if (list.length < 2) continue;
    const geos = list.map(m => { m.updateMatrix(); const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); g.applyMatrix4(m.matrix); return g; });
    if (!geos.every(g => g.attributes.uv && g.attributes.normal)) continue;
    let n = 0; geos.forEach(g => n += g.attributes.position.count);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    for (const g of geos) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    bg.computeBoundingSphere();
    const m = new THREE.Mesh(bg, mat); m.castShadow = list.some(x => x.castShadow); m.userData.merged = true;
    list.forEach(x => group.remove(x)); group.add(m);
  }
  for (const c of group.children) if (!c.isMesh) mergeChildren(c);
}

// CC0 Quaternius geometry (swords, heater shield), with this game's own steel, leather and paint
function assetGroup(key, matFor, scale = 1) {
  const src = typeof ASSET_GEO !== 'undefined' && ASSET_GEO[key]; if (!src) return null;
  const g = new THREE.Group();
  for (const m in src) {
    const gg = geo('asset:' + key + ':' + m, () => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(src[m].p, 3)); b.setAttribute('normal', new THREE.Float32BufferAttribute(src[m].n, 3)); b.setAttribute('uv', new THREE.Float32BufferAttribute(src[m].u, 2)); b.computeBoundingSphere(); return b; });
    const mesh = new THREE.Mesh(gg, matFor(m)); mesh.castShadow = true; g.add(mesh);
  }
  if (scale !== 1) g.scale.setScalar(scale);
  return g;
}
// fantasy set: Quaternius meshes, flat shaded, coloured from their own materials
const FMAT = {};
function fantasyMat(m) {
  const k = m.n + m.c.join(','); if (FMAT[k]) return FMAT[k];
  const col = new THREE.Color().setRGB(m.c[0], m.c[1], m.c[2]);
  if (m.m) col.multiplyScalar(/Gold/.test(m.n) ? 1.6 : /Red/.test(m.n) ? 1.4 : 1.9);
  return FMAT[k] = new THREE.MeshStandardMaterial({ color: col, metalness: m.m ? 0.82 : 0.05, roughness: m.m ? 0.32 : 0.8, flatShading: true });
}
function buildFantasyWeapon(key) {
  const g = new THREE.Group(); const src = typeof FANTASY_GEO !== 'undefined' && FANTASY_GEO[key]; if (!src) return null;
  src.mats.forEach((m, i) => {
    const gg = geo('fant:' + key + i, () => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(m.v.map(q => q / 1000), 3)); b.setIndex(m.i); const nb = b.toNonIndexed(); nb.computeVertexNormals(); nb.computeBoundingSphere(); return nb; });
    mk(g, gg, fantasyMat(m), 0, 0, 0);
  });
  const wrap = new THREE.Mesh(geo('grip', () => new THREE.CylinderGeometry(0.021, 0.021, 0.14, 8)), MAT.tape.black); wrap.visible = false; wrap.userData.keep = true; g.add(wrap); g.userData.wrap = wrap;
  mergeChildren(g);
  return g;
}
// side-on picture of any weapon for the kit picker (flat-shaded triangles, painter's order)
const ICONS = {};
function weaponIcon(key, W = 150, H = 46) {
  if (ICONS[key]) { const c = cvs(W, H); c.getContext('2d').drawImage(ICONS[key], 0, 0); return c; }
  const c = cvs(W, H), x = c.getContext('2d');
  const g = buildWeapon(key, CLUBS.reavers); g.updateMatrixWorld(true);
  const tris = []; const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  let y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  g.traverse(o => {
    if (!o.isMesh || !o.visible) return; const pos = o.geometry.attributes.position, idx = o.geometry.index; const cnt = idx ? idx.count : pos.count;
    const mats = Array.isArray(o.material) ? o.material : [o.material]; const groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: cnt, materialIndex: 0 }];
    for (const gr of groups) {
      const mat = mats[gr.materialIndex || 0] || mats[0]; const col = mat.color ? mat.color.clone() : new THREE.Color('#888'); if (mat.map) col.set('#8a7a66');
      if (mat.metalness > 0.5) col.lerp(new THREE.Color('#c8d0d4'), 0.35);
      for (let i = gr.start; i < gr.start + gr.count; i += 3) {
        const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
        a.fromBufferAttribute(pos, ia).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(pos, ib).applyMatrix4(o.matrixWorld); d.fromBufferAttribute(pos, ic).applyMatrix4(o.matrixWorld);
        n.crossVectors(e1.subVectors(b, a), e2.subVectors(d, a)).normalize();
        const sh = 0.42 + 0.58 * Math.max(0, Math.abs(n.x) * 0.75 + n.y * 0.2 + n.z * 0.25);
        tris.push({ p: [a.y, a.z, b.y, b.z, d.y, d.z], depth: (a.x + b.x + d.x) / 3, c: `rgb(${Math.min(255, col.r * 255 * sh) | 0},${Math.min(255, col.g * 255 * sh) | 0},${Math.min(255, col.b * 255 * sh) | 0})` });
        for (const v of [a, b, d]) { y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); }
      }
    }
  });
  tris.sort((p, q) => p.depth - q.depth);
  const s = Math.min((W - 10) / Math.max(y1 - y0, 1.1), (H - 8) / (z1 - z0 || 1)); // short weapons share one scale so reach reads at a glance
  const ox = (W - (y1 - y0) * s) / 2 - y0 * s, oy = H / 2 + (z0 + z1) / 2 * s;
  x.lineJoin = 'round';
  for (const t of tris) { x.fillStyle = x.strokeStyle = t.c; x.lineWidth = 0.6; x.beginPath(); x.moveTo(ox + t.p[0] * s, oy - t.p[1] * s); x.lineTo(ox + t.p[2] * s, oy - t.p[3] * s); x.lineTo(ox + t.p[4] * s, oy - t.p[5] * s); x.closePath(); x.fill(); x.stroke(); }
  ICONS[key] = c; const out = cvs(W, H); out.getContext('2d').drawImage(c, 0, 0); return out;
}
// Special rack: original, built from primitives (flat faces to ±x, edge / business end toward +z, hand at y=0)
const SMAT = {};
function smat(k, o) { return SMAT[k] || (SMAT[k] = new THREE.MeshStandardMaterial(o)); }
function stopSignTex() {
  const c = cvs(256, 256), x = c.getContext('2d'); const oct = (r, fill) => { x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } x.closePath(); x.fillStyle = fill; x.fill(); };
  oct(126, '#f1f1ee'); oct(114, '#c3161c'); x.fillStyle = '#f1f1ee'; x.font = '900 74px "Big Shoulders Display", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('STOP', 128, 132);
  for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(60,40,30,' + rand(0.05, 0.2) + ')'; x.fillRect(rand(30, 226), rand(30, 226), rand(2, 9), rand(1, 3)); }
  return texFrom(c);
}
function buildSpecialWeapon(key) {
  const g = new THREE.Group();
  const wood = smat('swood', { color: '#8a5a2b', roughness: 0.75 }), dark = smat('sdark', { color: '#2a2c2e', metalness: 0.6, roughness: 0.45 }), iron = smat('siron', { color: '#3a3d40', metalness: 0.85, roughness: 0.38 });
  const handle = (len, r = 0.017, mat = wood, butt = -0.1) => mk(g, new THREE.CylinderGeometry(r, r * 1.08, len, 8), mat, 0, butt + len / 2, 0);
  if (key === 'x_pan') {
    handle(0.34, 0.016, dark, -0.08);
    const pan = mk(g, new THREE.CylinderGeometry(0.135, 0.115, 0.04, 22), iron, 0, 0.4, 0); pan.rotation.z = Math.PI / 2;
    const inner = mk(g, new THREE.CylinderGeometry(0.118, 0.118, 0.041, 22), smat('span', { color: '#191a1b', metalness: 0.4, roughness: 0.6 }), 0.002, 0.4, 0); inner.rotation.z = Math.PI / 2;
  } else if (key === 'x_hockey') {
    const shaft = mk(g, new THREE.BoxGeometry(0.022, 1.32, 0.03), smat('shock', { color: '#c9a36a', roughness: 0.6 }), 0, 0.5, 0);
    mk(g, new THREE.BoxGeometry(0.026, 0.12, 0.034), MAT.tape.white, 0, -0.1, 0); // knob of white tape
    const blade = mk(g, new THREE.BoxGeometry(0.014, 0.075, 0.3), smat('shockb', { color: '#1d1e20', roughness: 0.7 }), 0, 1.15, 0.13); blade.rotation.x = -0.25;
    mk(g, new THREE.BoxGeometry(0.016, 0.06, 0.22), MAT.tape.black, 0, 1.15, 0.14).rotation.x = -0.25; // taped blade, obviously
  } else if (key === 'x_broom') {
    handle(1.12, 0.015, smat('sbrh', { color: '#d9d4c8', metalness: 0.3, roughness: 0.4 }), -0.25);
    mk(g, new THREE.BoxGeometry(0.07, 0.06, 0.26), smat('sbrhead', { color: '#202224', roughness: 0.6 }), 0, 0.9, 0.02);
    mk(g, new THREE.BoxGeometry(0.09, 0.03, 0.27), smat('sbrpad', { color: '#a5182b', roughness: 0.95 }), 0, 0.86, 0.02);
  } else if (key === 'x_ember') {
    handle(1.12, 0.019, smat('sember', { color: '#2b1a12', roughness: 0.8 }), -0.32);
    const sh = new THREE.Shape(); sh.moveTo(0, 0.06); sh.lineTo(0.12, 0.1); sh.quadraticCurveTo(0.25, 0.14, 0.3, 0.2); sh.quadraticCurveTo(0.34, 0.0, 0.3, -0.2); sh.quadraticCurveTo(0.2, -0.12, 0.12, -0.08); sh.lineTo(0, -0.05); sh.closePath();
    const head = mk(g, new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }), smat('sembh', { color: '#2a2422', metalness: 0.7, roughness: 0.5 }), 0, 0.68, 0); head.rotation.y = -Math.PI / 2; head.position.x = -0.006;
    const glow = smat('sembe', { color: '#ff7a1a', emissive: '#ff4a00', emissiveIntensity: 1.8, roughness: 0.4 });
    const edge = mk(g, new THREE.BoxGeometry(0.03, 0.36, 0.03), glow, 0, 0.68, 0.31);
    for (const [y, r] of [[0.74, 0.5], [0.6, -0.45]]) { const c = mk(g, new THREE.BoxGeometry(0.03, 0.01, 0.13), glow, 0, y, 0.2); c.rotation.x = r; } // glowing cracks
  } else if (key === 'x_storm') {
    handle(1.02, 0.02, smat('sstormh', { color: '#1d2329', metalness: 0.4, roughness: 0.5 }), -0.36);
    mk(g, new THREE.BoxGeometry(0.15, 0.16, 0.34), smat('sstorm', { color: '#2f363d', metalness: 0.8, roughness: 0.35 }), 0, 0.62, 0);
    const glow = smat('sstormg', { color: '#8fdcff', emissive: '#2fb4ff', emissiveIntensity: 2.2 });
    for (const z of [-0.12, 0, 0.12]) mk(g, new THREE.BoxGeometry(0.152, 0.018, 0.02), glow, 0, 0.62 + (z ? 0.04 : -0.03), z);
    for (const sz of [-1, 1]) mk(g, new THREE.BoxGeometry(0.152, 0.13, 0.012), glow, 0, 0.62, sz * 0.172);
  } else if (key === 'x_glacier') {
    mk(g, new THREE.CylinderGeometry(0.045, 0.02, 0.72, 9), smat('sglw', { color: '#6b5a48', roughness: 0.85 }), 0, 0.26, 0);
    const ice = smat('sglice', { color: '#bfefff', emissive: '#4cc7ff', emissiveIntensity: 0.55, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });
    const r = seeded('glacier'); for (let i = 0; i < 9; i++) { const c = mk(g, new THREE.OctahedronGeometry(0.035 + r() * 0.03, 0), ice, 0, 0.36 + r() * 0.28, 0); const a = r() * TAU; c.position.x = Math.cos(a) * 0.045; c.position.z = Math.sin(a) * 0.045; c.scale.y = 1.8; c.rotation.set(r(), r(), r()); }
  } else if (key === 'x_crystal') {
    mk(g, new THREE.CylinderGeometry(0.016, 0.017, 0.26, 10), MAT.leatherDark, 0, -0.06, 0);
    const gold = smat('scrg', { color: '#c79a2e', metalness: 0.9, roughness: 0.3 });
    mk(g, new THREE.BoxGeometry(0.03, 0.035, 0.3), gold, 0, 0.08, 0); mk(g, new THREE.SphereGeometry(0.03, 10, 8), gold, 0, -0.21, 0);
    const sh = new THREE.Shape(); sh.moveTo(-0.032, 0); sh.lineTo(-0.024, 0.85); sh.lineTo(0, 1.02); sh.lineTo(0.024, 0.85); sh.lineTo(0.032, 0); sh.closePath();
    const bl = mk(g, new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 1 }), smat('scrb', { color: '#b98cff', emissive: '#6a2cff', emissiveIntensity: 0.6, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.88 }), 0, 0.095, 0); bl.rotation.y = Math.PI / 2; bl.position.x = 0.003;
  } else if (key === 'x_wrench') {
    mk(g, new THREE.BoxGeometry(0.03, 0.62, 0.06), iron, 0, 0.22, 0);
    const sh = new THREE.Shape(); sh.absarc(0, 0, 0.11, 0.55, TAU - 0.55, false); sh.lineTo(Math.cos(-0.55) * 0.05, Math.sin(-0.55) * 0.05); sh.absarc(0, 0, 0.05, -0.55, -TAU + 0.55, true); sh.closePath();
    const head = mk(g, new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false, curveSegments: 10 }), iron, -0.015, 0.6, 0); head.rotation.y = -Math.PI / 2; head.rotation.x = 0; head.rotation.z = Math.PI / 2;
    mk(g, new THREE.BoxGeometry(0.034, 0.16, 0.064), smat('swrg', { color: '#b8241f', roughness: 0.7 }), 0, 0.0, 0);
  } else if (key === 'x_stop') {
    handle(1.18, 0.018, smat('spole', { color: '#9aa2a6', metalness: 0.7, roughness: 0.4 }), -0.3);
    const tex = SMAT.stopTex || (SMAT.stopTex = stopSignTex());
    const sign = mk(g, new THREE.PlaneGeometry(0.5, 0.5), smat('sstop', { map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 }), 0.02, 0.86, 0); sign.rotation.y = Math.PI / 2;
  } else if (key === 'x_chicken') {
    const yel = smat('schk', { color: '#f2cf1d', roughness: 0.5 }), org = smat('schko', { color: '#f08a12', roughness: 0.5 }), red = smat('schkr', { color: '#d4241c', roughness: 0.5 });
    for (const sx of [-1, 1]) mk(g, new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), org, sx * 0.02, 0.0, 0);
    const body = mk(g, new THREE.SphereGeometry(0.07, 14, 10), yel, 0, 0.18, 0); body.scale.set(0.8, 1.6, 0.9);
    mk(g, new THREE.CylinderGeometry(0.025, 0.035, 0.16, 10), yel, 0, 0.36, 0.02).rotation.x = 0.3;
    mk(g, new THREE.SphereGeometry(0.045, 12, 9), yel, 0, 0.46, 0.05);
    mk(g, new THREE.ConeGeometry(0.018, 0.06, 8), org, 0, 0.45, 0.11).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) mk(g, new THREE.BoxGeometry(0.012, 0.035, 0.022), red, 0, 0.51 + (i === 1 ? 0.01 : 0), 0.02 + i * 0.022);
    for (const sx of [-1, 1]) mk(g, new THREE.SphereGeometry(0.007, 6, 5), smat('schke', { color: '#111' }), sx * 0.032, 0.475, 0.08);
  }
  const wrap = new THREE.Mesh(geo('grip', () => new THREE.CylinderGeometry(0.021, 0.021, 0.14, 8)), MAT.tape.black); wrap.visible = false; wrap.userData.keep = true; g.add(wrap); g.userData.wrap = wrap;
  mergeChildren(g);
  return g;
}
function buildWeapon(key, club) {
  if (key === 'custom' && WEAPONS.custom) { const C = WEAPONS.custom, B = WEAPONS[C.base]; const g = buildWeapon(C.base, club); const s = C.len / B.len; g.scale.set(1, s, 1); return g; }
  const w = WEAPONS[key];
  if (w && w.specialSet) return buildSpecialWeapon(key);
  if (CUTE.on) return buildCuteWeapon(key, club); // rubber and foam
  if (w && w.fantasy) { const fg = buildFantasyWeapon(key); if (fg) return fg; }
  const g = new THREE.Group();
  if (false && (key === 'sword' || key === 'short' || key === 'longsword') && typeof ASSET_GEO !== 'undefined') { // Quaternius blades are notched fantasy shapes; buhurt blades are rebated and smooth, so the procedural ones stay
    const a = assetGroup(key === 'longsword' ? 'longsword' : 'sword', m => m === 'Steel' ? MAT.blade : m === 'LightSteel' ? MAT.steel : m === 'DarkSteel' ? MAT.steelDark : m === 'DarkWood' ? MAT.leatherDark : MAT.leather, key === 'short' ? 0.8 : 1);
    if (a) { g.add(a); const wrap = new THREE.Mesh(geo('grip', () => new THREE.CylinderGeometry(0.021, 0.021, 0.14, 8)), MAT.tape.black); wrap.visible = false; wrap.userData.keep = true; g.add(wrap); g.userData.wrap = wrap; return g; }
  }
  const wrap = mk(g, geo('grip', () => new THREE.CylinderGeometry(0.021, 0.021, 0.14, 8)), MAT.tape.black, 0, 0, 0); // haft wrap / grip: black cloth tape
  const teamRing = new THREE.MeshStandardMaterial({ color: club.flag === '#ff3d8b' ? club.tabard : club.tabard, roughness: 0.85 });
  if (w.haft) {
    const L = w.len; const butt = key === 'polearm' ? -0.45 : key === 'longaxe' ? -0.32 : -0.1; const top = butt + L;
    const haft = mk(g, new THREE.CylinderGeometry(0.017, 0.019, L, 8), MAT.haft, 0, (butt + top) / 2, 0);
    mk(g, geo('teamring', () => new THREE.CylinderGeometry(0.021, 0.021, 0.05, 8)), teamRing, 0, top - 0.22, 0);
    mk(g, geo('teamring2', () => new THREE.CylinderGeometry(0.021, 0.021, 0.03, 8)), MAT.tape.black, 0, top - 0.3, 0);
    if (key === 'mace') {
      mk(g, geo('mcore', () => new THREE.CylinderGeometry(0.022, 0.026, 0.15, 8)), MAT.steelDark, 0, top - 0.06, 0);
      mk(g, geo('mcap', () => new THREE.ConeGeometry(0.024, 0.04, 8)), MAT.steelDark, 0, top + 0.03, 0);
      const fg = geo('flange2', () => { const sh = new THREE.Shape(); sh.moveTo(0, -0.07); sh.lineTo(0.022, -0.055); sh.quadraticCurveTo(0.05, -0.02, 0.046, 0.02); sh.quadraticCurveTo(0.04, 0.055, 0.008, 0.075); sh.lineTo(0, 0.075); sh.closePath(); const e = new THREE.ExtrudeGeometry(sh, { depth: 0.005, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 5 }); e.translate(0.016, 0, -0.0025); return e; });
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; const fl = mk(g, fg, MAT.steel, 0, top - 0.05, 0); fl.rotation.y = a; }
      for (const sx of [-1, 1]) mk(g, geo('langet', () => new THREE.BoxGeometry(0.006, 0.16, 0.022)), MAT.steelDark, sx * 0.019, top - 0.18, 0, false);
    } else {
      const big = key === 'axe' ? 1 : key === 'longaxe' ? 1.35 : 1.5;
      const sh = new THREE.Shape(); sh.moveTo(-0.02, 0.035); sh.lineTo(0.06, 0.045); sh.quadraticCurveTo(0.12, 0.07, 0.145, 0.11); sh.quadraticCurveTo(0.175, 0.0, 0.15, -0.13); sh.quadraticCurveTo(0.11, -0.1, 0.07, -0.05); sh.quadraticCurveTo(0.04, -0.03, -0.02, -0.035); sh.closePath();
      const ag = geo('axe2' + key, () => { const e = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.005, bevelSegments: 2, curveSegments: 8 }); e.translate(0, 0, -0.004); return e; });
      mk(g, geo('socket', () => new THREE.CylinderGeometry(0.024, 0.024, 0.08, 8)), MAT.steelDark, 0, top - 0.07 * (key === 'axe' ? 1 : key === 'longaxe' ? 1.35 : 1.5), 0);
      const head = mk(g, ag, MAT.steel, 0, top - 0.07 * big, 0); head.scale.setScalar(big); head.rotation.y = -Math.PI / 2; // edge faces forward
      if (key === 'polearm') { mk(g, geo('pcap', () => new THREE.SphereGeometry(0.035, 8, 6)), MAT.steelDark, 0, top + 0.02, 0); mk(g, geo('pham', () => new THREE.BoxGeometry(0.04, 0.05, 0.08)), MAT.steelDark, 0, top - 0.1, -0.06); }
    }
  } else {
    // rebated blade: tapered profile, rounded tip, fuller, real guard, wire-wrapped grip and wheel pommel
    const two = w.hands === 2; const bl = key === 'short' ? 0.58 : key === 'falchion' ? 0.66 : key === 'longsword' ? 0.88 : 0.74;
    const bw = key === 'falchion' ? 0.062 : key === 'longsword' ? 0.05 : 0.046; const grip = two ? 0.24 : 0.11;
    const bg = geo('blade2' + key, () => {
      const sh = new THREE.Shape(); const hw = bw / 2;
      if (key === 'falchion') { sh.moveTo(-hw * 0.8, 0); sh.lineTo(-hw * 0.75, bl * 0.9); sh.quadraticCurveTo(-hw * 0.5, bl, hw * 0.2, bl); sh.quadraticCurveTo(hw * 1.5, bl * 0.82, hw * 1.25, bl * 0.55); sh.lineTo(hw * 0.8, 0); }
      else { sh.moveTo(-hw, 0); sh.lineTo(-hw * 0.7, bl * 0.86); sh.quadraticCurveTo(-hw * 0.45, bl, 0, bl); sh.quadraticCurveTo(hw * 0.45, bl, hw * 0.7, bl * 0.86); sh.lineTo(hw, 0); }
      sh.closePath();
      const e = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0032, bevelSize: 0.0045, bevelSegments: 1, curveSegments: 6 }); e.translate(0, 0, -0.0015); return e;
    });
    const b = mk(g, bg, MAT.blade, 0, 0.075, 0); b.rotation.y = Math.PI / 2;
    for (const sx of [-1, 1]) { const fu = mk(g, geo('fuller' + key, () => new THREE.BoxGeometry(0.0015, bl * 0.55, bw * 0.22)), MAT.steelDark, sx * 0.0052, 0.075 + bl * 0.3, 0, false); }
    const gd = mk(g, geo('guard2' + (two ? 'L' : 'S'), () => new THREE.CylinderGeometry(0.01, 0.013, two ? 0.26 : 0.21, 8)), MAT.steelDark, 0, 0.068, 0); gd.rotation.z = Math.PI / 2;
    mk(g, geo('gripL' + grip, () => new THREE.CylinderGeometry(0.0155, 0.017, grip, 10)), MAT.leather, 0, 0.068 - grip / 2 - 0.008, 0);
    for (let i = 1; i < 3; i++) mk(g, geo('wire', () => new THREE.TorusGeometry(0.0168, 0.0022, 4, 12)), MAT.brass, 0, 0.068 - grip * i / 3, 0, false).rotation.x = Math.PI / 2;
    const pm = mk(g, geo('wheel', () => new THREE.CylinderGeometry(0.027, 0.027, 0.02, 14)), MAT.steelDark, 0, 0.068 - grip - 0.03, 0); pm.rotation.x = Math.PI / 2;
    wrap.visible = false;
  }
  wrap.userData.keep = true; g.userData.wrap = wrap;
  mergeChildren(g);
  return g;
}

function buildShield(type, club) {
  if (CUTE.on) return buildCuteShield(type, club);
  const g = new THREE.Group();
  if (type === 'heater' && typeof ASSET_GEO !== 'undefined' && ASSET_GEO.heater) {
    const face = new THREE.MeshStandardMaterial({ map: shieldTex(club), roughness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(club.tabard).multiplyScalar(0.55), roughness: 0.8 });
    const a = assetGroup('heater', m => m === 'LightWood' ? face : m === 'DarkWood' ? dark : m === 'LightSteel' ? MAT.steel : MAT.steelDark);
    g.add(a); return g;
  }
  if (type === 'heater') {
    const sh = new THREE.Shape(); sh.moveTo(-0.24, 0.31); sh.lineTo(0.24, 0.31); sh.lineTo(0.24, 0.06); sh.quadraticCurveTo(0.22, -0.2, 0, -0.33); sh.quadraticCurveTo(-0.22, -0.2, -0.24, 0.06); sh.closePath();
    const eg = geo('heater', () => new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01, bevelSegments: 2 }));
    const t = shieldTex(club).clone(); t.needsUpdate = true; t.repeat.set(1 / 0.48, 1 / 0.64); t.offset.set(0.5, 0.52);
    const face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
    const m = new THREE.Mesh(eg, [face, MAT.steelDark]); m.castShadow = true; g.add(m);
    const tapeEdge = mk(g, geo('shtape', () => new THREE.BoxGeometry(0.5, 0.03, 0.05)), MAT.tape.black, 0, 0.31, 0.02); tapeEdge.castShadow = false;
  } else {
    const d = mk(g, geo('buck', () => new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20)), new THREE.MeshStandardMaterial({ map: shieldTex(club), roughness: 0.6 }), 0, 0, 0.0); d.rotation.x = Math.PI / 2;
    mk(g, geo('boss', () => new THREE.SphereGeometry(0.06, 12, 8, 0, TAU, 0, Math.PI / 2)), MAT.steel, 0, 0, 0.012).rotation.x = Math.PI / 2;
  }
  return g;
}

const HAIR = [];
function bandGeo() { return geo('band', () => new THREE.CylinderGeometry(1, 1, 1, 12, 1, true)); }
function addBand(parent, r, hgt, y, mat, keep = true) { const b = new THREE.Mesh(bandGeo(), mat); b.scale.set(r, hgt, r); b.position.y = y; b.material.side = THREE.DoubleSide; b.userData.keep = keep; parent.add(b); return b; }

function buildFighterModel(f) {
  if (CUTE.on) return buildCuteFighter(f); // youth division: foam kit, big helmets, tiny knights
  const club = f.club; if (f.model && f.model.steelMat && f.model.steelMat !== MAT.steel) f.model.steelMat.dispose(); const S = MAT.steel.clone(); // each fighter's own steel, so it can scuff and muddy
  const root = new THREE.Group(); const tilt = grp(root); const J = { root, tilt };
  const bd = f.body || { h: 1.8, b: 1 }; const wide = Math.sqrt(bd.b); const sc = bd.h / 1.8;
  const fem = !!bd.fem; // women's harness: fitted cuirass, narrow waist, flared skirt, long braid
  const shape = f.isPlayer && typeof lookLite === 'function' ? lookLite().sh : f.appearance && f.appearance.sh;
  const sd = key => typeof shapeDelta === 'function' ? shapeDelta(shape, key) : 0;
  const legBulk = 1 + sd('legs') * 0.17 + sd('muscle') * 0.07;
  const armBulk = 1 + sd('arms') * 0.18 + sd('muscle') * 0.08;
  tilt.scale.setScalar(sc); J.scale = sc;
  const hips = J.hips = grp(tilt, 0, 0.98, 0);
  if (fem) mk(hips, geo('tassetF', () => new THREE.CylinderGeometry(0.175, 0.255, 0.2, 14)), S, 0, -0.04, 0).scale.set(wide, 1, wide);
  else mk(hips, geo('tasset', () => new THREE.CylinderGeometry(0.19, 0.235, 0.2, 12)), S, 0, -0.04, 0).scale.set(wide, 1, wide);
  for (const side of [1, -1]) {
    const k = side > 0 ? 'L' : 'R';
    const leg = J['leg' + k] = grp(hips, side * 0.11, -0.08, 0);
    mk(leg, geo('thigh', () => new THREE.CapsuleGeometry(0.078, 0.28, 3, 10)), S, 0, -0.21, 0).scale.set(wide * legBulk, 1, wide * legBulk);
    const knee = J['knee' + k] = grp(leg, 0, -0.43, 0);
    mk(knee, geo('kcop', () => new THREE.SphereGeometry(0.072, 10, 8)), S, 0, 0, 0.035);
    mk(knee, geo('shin', () => new THREE.CapsuleGeometry(0.066, 0.3, 3, 10)), S, 0, -0.22, 0).scale.set(legBulk, 1, legBulk);
    mk(knee, geo('sabaton', () => new THREE.BoxGeometry(0.105, 0.075, 0.25)), MAT.steelDark, 0, -0.44, 0.05);
    J['kneeBand' + k] = addBand(knee, 0.072, 0.035, -0.08, MAT.leather);
  }
  const torso = J.torso = grp(hips, 0, 0.06, 0);
  const tabMat = new THREE.MeshStandardMaterial({ map: tabardTex(club), roughness: 0.92, side: THREE.DoubleSide });
  if (fem) { // a fitted women's cuirass: shaped chest over a narrow waist, and a longer flared tabard skirt
    const bp = mk(torso, geo('breastF', () => lathe([[0.15, -0.0], [0.152, 0.08], [0.175, 0.2], [0.19, 0.3], [0.182, 0.38], [0.16, 0.44], [0.1, 0.46]], 16)), S, 0, 0.0, 0); bp.scale.set(wide, 1, 0.8 * wide);
    const bust = mk(torso, geo('bustF', () => new THREE.SphereGeometry(0.16, 16, 10)), S, 0, 0.29, 0.035); bust.scale.set(wide * (1 + sd('bust') * 0.11), 0.5, 0.5 * wide * (1 + sd('breast') * 0.3));
    mk(torso, geo('ridgeF', () => new THREE.BoxGeometry(0.012, 0.3, 0.02)), MAT.steelDark, 0, 0.2, 0.135 * wide, false);
    const tab = mk(torso, geo('tabardF', () => new THREE.CylinderGeometry(0.17, 0.33, 0.62, 20, 1, true)), tabMat, 0, -0.08, 0); tab.scale.set(wide, 1, 0.85 * wide);
    mk(torso, geo('beltF', () => new THREE.CylinderGeometry(0.165, 0.165, 0.045, 14)), MAT.leather, 0, 0.02, 0).scale.set(wide, 1, 0.83 * wide);
  } else {
    const bp = mk(torso, geo('breast', () => new THREE.CylinderGeometry(0.205, 0.175, 0.44, 14)), S, 0, 0.23, 0); bp.scale.set(wide, 1, 0.8 * wide);
    const tab = mk(torso, geo('tabard', () => new THREE.CylinderGeometry(0.215, 0.285, 0.74, 18, 1, true)), tabMat, 0, 0.02, 0); tab.scale.set(wide, 1, 0.82 * wide);
    mk(torso, geo('belt', () => new THREE.CylinderGeometry(0.205, 0.205, 0.045, 14)), MAT.leather, 0, -0.06, 0).scale.set(wide, 1, 0.83 * wide);
  }
  mk(torso, geo('gorget', () => new THREE.CylinderGeometry(0.1, 0.13, 0.11, 12)), S, 0, 0.46, 0);
  const head = J.head = grp(torso, 0, 0.53, 0); if (G.mod && G.mod.bigheads) head.scale.setScalar(1.8);
  buildHelmet(head, f.spec.helm, S);
  J.helmBand = addBand(head, 0.112, 0.03, -0.035, MAT.leather);
  const flagMat = f.side != null ? ffaFlagMat(f) : f.team === 0 ? MAT.flagPink : MAT.flagBlue;
  const hf = mk(head, geo('hflag', () => new THREE.BoxGeometry(0.012, 0.05, 0.16)), flagMat, 0.13, 0.12, -0.02, false);
  if (fem) { // a long thick braid out of the back of the helmet, tied with a ribbon in the side's colour
    const hair = HAIR[(f.id + f.num) % HAIR.length];
    for (let i = 0; i < 9; i++) { const r = 0.042 - i * 0.0028; const s = mk(head, geo('braidF', () => new THREE.SphereGeometry(1, 8, 6)), hair, (i % 2 ? 0.008 : -0.008), -0.02 - i * 0.058, -0.14 - Math.min(i, 4) * 0.018, false); s.scale.set(r, r * 1.25, r); }
    mk(head, geo('ribbonF', () => new THREE.TorusGeometry(0.026, 0.009, 5, 10)), flagMat, 0, -0.5, -0.215, false).rotation.x = Math.PI / 2;
    const tail = mk(head, geo('ribtailF', () => new THREE.BoxGeometry(0.03, 0.09, 0.004)), flagMat, 0.012, -0.56, -0.22, false); tail.rotation.z = 0.25;
  }
  else if (bd.braid) { const hair = HAIR[(f.id + f.num) % HAIR.length]; for (let i = 0; i < 4; i++) mk(head, geo('braid', () => new THREE.SphereGeometry(0.03, 6, 5)), hair, 0, -0.06 - i * 0.055, -0.15 - i * 0.012, false); }
  for (const side of [1, -1]) {
    const k = side > 0 ? 'L' : 'R';
    const sh = J['sh' + k] = grp(torso, side * 0.255 * (0.88 + 0.12 * bd.b) * (fem ? 0.9 : 1) * (1 + sd('shoulders') * 0.13), 0.39, 0);
    const paul = mk(sh, geo('paul', () => new THREE.SphereGeometry(0.105, 12, 8)), S, side * 0.02, 0.0, 0); paul.scale.set(fem ? 0.85 : 1, 0.78, fem ? 0.9 : 1.05);
    mk(sh, geo('upper', () => new THREE.CapsuleGeometry(0.056, 0.17, 3, 8)), S, 0, -0.16, 0).scale.set(armBulk, 1, armBulk);
    addBand(sh, 0.064, 0.05, -0.12, flagMat, false); // flagging tape on the arm marks the side
    const ft = mk(sh, geo('ftail', () => new THREE.BoxGeometry(0.02, 0.12, 0.004)), flagMat, side * 0.065, -0.17, 0, false); ft.rotation.z = side * 0.2;
    const el = J['el' + k] = grp(sh, 0, -0.3, 0);
    mk(el, geo('couter', () => new THREE.SphereGeometry(0.066, 10, 8)), S, 0, 0, -0.012);
    mk(el, geo('fore', () => new THREE.CapsuleGeometry(0.05, 0.17, 3, 8)), S, 0, -0.14, 0).scale.set(armBulk, 1, armBulk);
    J['elBand' + k] = addBand(el, 0.064, 0.03, 0.035, MAT.leather);
    const wr = J['wr' + k] = grp(el, 0, -0.29, 0);
    mk(wr, geo('gaunt', () => new THREE.BoxGeometry(0.09, 0.12, 0.105)), MAT.steelDark, 0, -0.03, 0);
    J['cuff' + k] = addBand(wr, 0.058, 0.04, 0.05, MAT.steelDark);
  }
  J.shieldPivot = grp(torso, 0.34, 0.12, 0.22);
  J.weaponMount = grp(J.wrR, 0, -0.04, 0.0);
  J.weaponMount.rotation.x = Math.PI / 2;
  // number on hockey tape
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture(f.spec.dispNum || f.spec.num, f.side != null ? ffaColor(f) : f.team === 0 ? '#ff3d8b' : '#3b93ff', f.isPlayer), depthTest: false, transparent: true }));
  tag.scale.set(0.62, 0.31, 1); tag.position.y = 2.25; tag.renderOrder = 5; root.add(tag); J.tag = tag;
  J.pose = {}; J.steelMat = S;
  f.model = J;
  mergeChildren(tilt);
  if (!SHADOWS) { const bl = new THREE.Mesh(geo('blobG', () => new THREE.PlaneGeometry(1.2, 1.2)), MAT.blob); bl.rotation.x = -Math.PI / 2; bl.position.y = 0.012; root.add(bl); }
  root.traverse(o => { if (o.isMesh) o.castShadow = SHADOWS && !o.userData.noShadow; });
  setWeaponModel(f); setShieldModel(f); applyTapeVisuals(f);
  if (typeof fighterGlow === 'function') fighterGlow(f);
  return J;
}

function setWeaponModel(f) {
  const J = f.model; while (J.weaponMount.children.length) J.weaponMount.remove(J.weaponMount.children[0]);
  J.weapon = null;
  if (f.weapon) { J.weapon = f.isPlayer && !G.attract ? buildMyWeapon(f.weapon.key, f.club) : buildWeapon(f.weapon.key, f.club); J.weaponMount.add(J.weapon); J.weapon.traverse(o => { if (o.isMesh) o.castShadow = SHADOWS; });
    if (G.tourney && G.tourney.sticker && f.team === 0) { // the Technical Marshal's inspection sticker (no sticker = no fighting)
      const st = new THREE.Mesh(geo('stickerG', () => new THREE.CylinderGeometry(0.024, 0.024, 0.03, 10, 1, true)), MAT.sticker || (MAT.sticker = new THREE.MeshStandardMaterial({ color: '#39c46a', roughness: 0.5, side: THREE.DoubleSide }))); st.position.y = f.weapon.haft ? 0.32 : -0.03; J.weapon.add(st); } }
  applyTapeVisuals(f);
}
function setShieldModel(f) {
  const J = f.model; while (J.shieldPivot.children.length) J.shieldPivot.remove(J.shieldPivot.children[0]);
  if (f.shield) { const sh = buildShield(f.shield.key, f.club); sh.traverse(o => { if (o.isMesh) o.castShadow = SHADOWS; }); J.shieldPivot.add(sh); }
}
// tape shows on the harness: black, white, silver duct tape or zip ties where you repaired it
function applyTapeVisuals(f) {
  const J = f.model, k = f.kit; if (!J) return;
  const tm = (piece, fallback) => k[piece].tape ? MAT.tape[k[piece].tape] : fallback;
  const strap = J.strap || MAT.leather; // foam kit has bright velcro straps instead of leather
  J.elBandL.material = tm('armL', strap); J.elBandR.material = tm('armR', strap);
  J.kneeBandL.material = J.kneeBandR.material = tm('legs', strap);
  J.helmBand.material = tm('helmet', strap);
  J.cuffL.material = f.oldTape ? MAT.tape.black : J.cuffMat || MAT.steelDark;
  for (const b of [J.elBandL, J.elBandR, J.kneeBandL, J.kneeBandR, J.helmBand]) b.scale.y = (b.material === strap ? 0.03 : 0.05);
  if (J.weapon && J.weapon.userData.wrap) J.weapon.userData.wrap.material = k.haft.tape ? MAT.tape[k.haft.tape] : MAT.tape.black;
}

function dropWeaponProp(f) {
  if (!f.model.weapon) return;
  const prop = buildWeapon(f.weapon.key, f.club);
  const a = rand(0, TAU);
  prop.position.set(f.pos.x + Math.sin(a) * 0.9, 0.03, f.pos.z + Math.cos(a) * 0.9); prop.rotation.set(Math.PI / 2, 0, a);
  prop.traverse(o => { if (o.isMesh) o.castShadow = true; });
  W3.matchRoot.add(prop); G.props.push(prop);
}

// ---------- marshals ----------
function buildPerson(opts) {
  const root = new THREE.Group(); const J = { root };
  const pants = new THREE.MeshStandardMaterial({ color: opts.pants || '#22262b', roughness: 0.9 });
  const top = new THREE.MeshStandardMaterial({ color: opts.top || '#1a1d21', roughness: 0.9 });
  const hips = J.hips = grp(root, 0, 0.92, 0);
  for (const side of [1, -1]) { const leg = J['leg' + (side > 0 ? 'L' : 'R')] = grp(hips, side * 0.1, 0, 0); mk(leg, geo('pleg', () => new THREE.CapsuleGeometry(0.07, 0.72, 3, 8)), pants, 0, -0.45, 0); mk(leg, geo('shoe', () => new THREE.BoxGeometry(0.1, 0.07, 0.24)), MAT.black, 0, -0.88, 0.04); }
  const torso = J.torso = grp(hips, 0, 0.05, 0);
  mk(torso, geo('ptorso', () => new THREE.CapsuleGeometry(0.17, 0.36, 4, 10)), top, 0, 0.27, 0).scale.z = 0.72;
  mk(torso, geo('phead', () => new THREE.SphereGeometry(0.11, 12, 10)), MAT.skin, 0, 0.67, 0);
  if (opts.cap) mk(torso, geo('pcap', () => new THREE.SphereGeometry(0.115, 12, 8, 0, TAU, 0, Math.PI / 2)), top, 0, 0.69, 0);
  for (const side of [1, -1]) {
    const sh = J['sh' + (side > 0 ? 'L' : 'R')] = grp(torso, side * 0.22, 0.45, 0);
    mk(sh, geo('parm', () => new THREE.CapsuleGeometry(0.05, 0.5, 3, 8)), top, 0, -0.3, 0);
    if (opts.band && side < 0) addBand(sh, 0.058, 0.08, -0.12, MAT.marshalYellow);
    J['hand' + (side > 0 ? 'L' : 'R')] = grp(sh, 0, -0.6, 0);
  }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return J;
}
function buildMarshalModel(role) {
  if (UAL.ready) return ualMarshal(role);
  const J = buildPerson({ top: '#16191c', pants: '#1f2327', band: true, cap: role === 'knight' });
  const staff = mk(J.handR, geo('staff', () => new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6)), new THREE.MeshStandardMaterial({ color: role === 'knight' ? '#e8e4da' : '#2a2d30' }), 0, 0.15, 0);
  staff.rotation.x = Math.PI / 2; staff.position.z = 0.35;
  const flag = mk(J.handR, geo('flagcloth', () => new THREE.PlaneGeometry(0.42, 0.3)), new THREE.MeshStandardMaterial({ color: '#f2c40f', side: THREE.DoubleSide, roughness: 0.8, emissive: '#2e2400' }), 0, 0.15, 0.78, false);
  flag.rotation.y = Math.PI / 2; J.flag = flag;
  if (CUTE.on) { // youth day: the marshals wear moose antlers and the kids love it
    const brown = cuteMat('#a4703f'), tan = cuteMat('#d9b48a');
    for (const sx of [-1, 1]) {
      const a = grp(J.torso, sx * 0.1, 0.76, 0); a.rotation.z = -sx * 0.5;
      mk(a, geo('c_antS', () => new THREE.CylinderGeometry(0.014, 0.018, 0.14, 6)), brown, 0, 0.06, 0);
      const palm = mk(a, geo('c_antP', () => new THREE.SphereGeometry(0.09, 12, 8)), tan, 0, 0.16, 0); palm.scale.set(1, 0.45, 0.25);
      for (let i = 0; i < 3; i++) mk(a, geo('c_antT', () => new THREE.ConeGeometry(0.018, 0.07, 6)), tan, -0.06 + i * 0.06, 0.22, 0);
    }
    mk(J.torso, geo('c_mnose', () => new THREE.SphereGeometry(0.025, 10, 8)), cuteMat('#ff6f8a'), 0, 0.66, 0.11);
  }
  return J;
}
function buildSupportModel(club) {
  const J = buildPerson({ top: club.tabard, pants: '#2d3b52' });
  const w = buildWeapon('sword', club); w.position.set(0, 0, 0.05); w.rotation.x = -0.2; J.handR.add(w); J.reserve = w;
  J.shR.rotation.x = -0.9;
  return J;
}

// ---------- pose blending ----------
const POSE_KEYS = ['hipsY', 'legL.x', 'legL.z', 'kneeL.x', 'legR.x', 'legR.z', 'kneeR.x', 'torso.x', 'torso.y', 'torso.z', 'head.x', 'head.z',
  'shL.x', 'shL.y', 'shL.z', 'elL.x', 'shR.x', 'shR.y', 'shR.z', 'elR.x', 'wrR.x', 'wrR.y', 'wrL.x', 'shp.x', 'shp.y', 'shp.z', 'shp.rx', 'shp.ry'];
function applyPose(J, P, rate, dt) {
  const cur = J.pose; const k = 1 - Math.exp(-rate * dt);
  for (const key of POSE_KEYS) { const t = P[key]; if (t === undefined) continue; cur[key] = cur[key] === undefined ? t : cur[key] + (t - cur[key]) * k; }
  J.hips.position.y = cur.hipsY;
  J.legL.rotation.x = cur['legL.x']; J.legL.rotation.z = cur['legL.z']; J.kneeL.rotation.x = cur['kneeL.x'];
  J.legR.rotation.x = cur['legR.x']; J.legR.rotation.z = cur['legR.z']; J.kneeR.rotation.x = cur['kneeR.x'];
  J.torso.rotation.set(cur['torso.x'], cur['torso.y'], cur['torso.z']);
  J.head.rotation.x = cur['head.x']; J.head.rotation.z = cur['head.z'];
  J.shL.rotation.set(cur['shL.x'], cur['shL.y'], cur['shL.z']); J.elL.rotation.x = cur['elL.x']; J.wrL.rotation.x = cur['wrL.x'];
  J.shR.rotation.set(cur['shR.x'], cur['shR.y'], cur['shR.z']); J.elR.rotation.x = cur['elR.x'];
  J.wrR.rotation.x = cur['wrR.x']; J.wrR.rotation.y = cur['wrR.y'];
  J.shieldPivot.position.set(cur['shp.x'], cur['shp.y'], cur['shp.z']); J.shieldPivot.rotation.set(cur['shp.rx'], cur['shp.ry'], 0);
}

