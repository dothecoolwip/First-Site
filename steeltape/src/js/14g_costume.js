// ===================================================================
// Costumed townsfolk: Quaternius' Modular Character Outfits (CC0) worn on the UAL mannequin.
// The outfits are skinned to the same 65-bone rig as the mannequin, so they bind straight onto its bones and play every
// UAL clip. Only the mannequin's head shows above the collar (the rest of the body would poke through the cloth).
// ===================================================================
const OUTFIT = { ready: false, geo: {}, tex: {}, ibm: {}, head: new Map(), mats: new Map() };
const SKIN_TONES = ['#f1c9a5', '#e0ac85', '#c68a62', '#a86b45', '#8a5535', '#6b3f26', '#f3d2b8', '#d59b72'];
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
  OUTFIT.mats.set(id, m); return m;
}
// o: { outfit: 'Male_Peasant' | 'Female_Peasant' | 'Male_Ranger' | 'Female_Ranger', tex: 'peasant2', skin: '#c68a62', tint: '#ffe8d0', h, anim }
function costumePerson(o) {
  if (typeof UAL === 'undefined' || !UAL.ready || !outfitInit()) return null;
  const parts = OUTFIT_GEO.outfits[o.outfit]; if (!parts) return null;
  const skin = o.skin || pick(SKIN_TONES);
  const J = ualPerson({ main: new THREE.Color(skin).convertSRGBToLinear(), joints: new THREE.Color(skin).convertSRGBToLinear(), h: o.h || 1.78, anim: o.anim || 'Idle_Loop' });
  let skm = null; J.root.traverse(n => { if (n.isSkinnedMesh) { if (!skm) skm = n; n.geometry = mannequinHead(n.geometry); } });
  if (!skm) return J;
  const cloth = o.tex || (o.outfit.includes('Ranger') ? 'ranger' : 'peasant'), female = o.outfit.startsWith('Female');
  const ibm = o.ownBind && OUTFIT.ibm[female ? 'Female' : 'Male'] ? OUTFIT.ibm[female ? 'Female' : 'Male'] : skm.skeleton.boneInverses;
  const skel = new THREE.Skeleton(skm.skeleton.bones, ibm);
  for (const k of parts) {
    const g = OUTFIT.geo[k]; if (!g) continue;
    const m = new THREE.SkinnedMesh(g, g.userData.mat === 'skin' ? outfitMat(skin) : outfitMat(cloth, o.tint));
    m.bind(skel, skm.bindMatrix); m.frustumCulled = false; m.castShadow = SHADOWS; skm.parent.add(m);
  }
  J.costume = o.outfit; J.skin = skin;
  return J;
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
const VENDOR_FIT = { smith: 'Male_Peasant', artificer: 'Female_Ranger', armour: 'Female_Ranger', quarter: 'Female_Peasant', wizard: 'Male_Ranger', tavern: 'Male_Peasant', trainer: 'Female_Ranger', herald: 'Female_Peasant', bard: 'Male_Ranger', guild: 'Male_Peasant', estate: 'Male_Peasant', wardrobe: 'Female_Peasant', ghost: 'Male_Ranger' };
function vendorOutfit(V) {
  const o = VENDOR_FIT[V.key] || 'Male_Peasant', c = new THREE.Color('#ffffff').lerp(new THREE.Color(V.col || '#888888'), 0.4);
  return { outfit: o, tex: o.includes('Ranger') ? 'ranger' : (V.key === 'smith' || V.key === 'guild' ? 'peasant2' : 'peasant'), tint: '#' + c.getHexString() };
}
// spectators round the list in costume (the venue's block crowd is hidden in town)
const SPECT = { people: [], t: 0 };
function buildSpectators() {
  SPECT.people = []; if (typeof UAL === 'undefined' || !UAL.ready || !outfitInit()) return false;
  const spots = [];
  for (const sx of [-1, 1]) for (const z of [-12, -6, 0, 6, 12]) spots.push([sx * rand(13, 14.5), z + rand(-1, 1)]);
  for (const sz of [-1, 1]) for (const x of [-8, -3, 3, 8]) spots.push([x + rand(-1, 1), sz * rand(18, 19.5)]);
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
const OUTFIT_TEX = ['peasant', 'peasant2', 'ranger', 'ranger2'];
function lookPerson(L, ht) {
  let J = null;
  if (L.o && typeof L.o === 'string') {
    const [outfit, tex] = L.o.split('|');
    if (OUTFIT_GEO && OUTFIT_GEO.outfits && OUTFIT_GEO.outfits[outfit] && OUTFIT_TEX.includes(tex)) {
      const tint = L.d ? '#' + new THREE.Color('#ffffff').lerp(new THREE.Color(L.b || '#888888'), 0.55).getHexString() : null;
      const skin = SKIN_TONES.includes(L.s) ? L.s : SKIN_TONES[2];
      J = costumePerson({ outfit, tex, tint, skin, h: ht || 1.8, anim: 'Idle_Loop' });
    }
  }
  if (!J) J = townPerson({ main: L.b || '#555', joints: L.t || '#2a2e33', h: ht || 1.8, anim: 'Idle_Loop' });
  return dress(J, { b: L.b || '#555', t: L.t || '#ccc', h: L.h, c: L.c, n: L.n });
}
// a little portrait of an outfit for the wardrobe card, rendered once off-screen with the game's own renderer
const PORTRAITS = {};
function outfitThumb(key) {
  const W = 72, H = 96, c = cvs(W, H);
  const draw = src => c.getContext('2d').drawImage(src, 0, 0);
  if (PORTRAITS[key]) { draw(PORTRAITS[key]); return c; }
  try {
    if (!W3.renderer || typeof UAL === 'undefined' || !UAL.ready) return c;
    const L = lookLite(), J = key === 'none' ? townPerson({ main: L.b, joints: L.t, h: 1.8, anim: 'Idle_Loop' }) : lookPerson({ o: key, b: L.b, t: L.t, s: L.s, h: 'none', c: 'none', n: 'none' }, 1.8);
    if (!J) return c;
    J.mixer.update(0.01);
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#6b5a48', 1.1)); const dl = new THREE.DirectionalLight('#ffffff', 1.3); dl.position.set(1.5, 3, 4); sc.add(dl); sc.add(J.root);
    const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 20); cam.position.set(0, 1.05, 4.1); cam.lookAt(0, 0.95, 0);
    const rt = new THREE.WebGLRenderTarget(W * 2, H * 2), R = W3.renderer, prev = R.getRenderTarget(), pc = R.getClearColor(new THREE.Color()), pa = R.getClearAlpha();
    R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(sc, cam);
    const px = new Uint8Array(W * 2 * H * 2 * 4); R.readRenderTargetPixels(rt, 0, 0, W * 2, H * 2, px);
    R.setRenderTarget(prev); R.setClearColor(pc, pa); rt.dispose();
    const big = cvs(W * 2, H * 2), bx = big.getContext('2d'), id = bx.createImageData(W * 2, H * 2);
    for (let y = 0; y < H * 2; y++) for (let x = 0; x < W * 2; x++) { const s = ((H * 2 - 1 - y) * W * 2 + x) * 4, d = (y * W * 2 + x) * 4; for (let k = 0; k < 3; k++) id.data[d + k] = Math.round(Math.pow(px[s + k] / 255, 1 / 2.2) * 255); id.data[d + 3] = px[s + 3]; }
    bx.putImageData(id, 0, 0);
    const small = cvs(W, H); small.getContext('2d').drawImage(big, 0, 0, W, H); PORTRAITS[key] = small; draw(small);
  } catch (e) { console.warn('portrait', e); }
  return c;
}
