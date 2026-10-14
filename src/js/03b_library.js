// CC0 asset library: generated source data is embedded by build.py for standalone and offline builds.
const LIBRARY = { textures: {}, models: {}, loading: {} };
function libraryIcon(key, size = 28) {
  const src = LIBRARY_DATA.icons[key];
  return src ? h('img', { src, alt: '', width: size, height: size, class: 'libicon' }) : null;
}
function librarySurface(kind) {
  const src = LIBRARY_DATA.surfaces[kind]; if (!src) return null;
  if (LIBRARY.textures[kind]) return LIBRARY.textures[kind];
  const t = new THREE.TextureLoader().load(src);
  t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const repeats = { grass: [30, 40], dirt: [4, 6], path: [4, 6], cobble: [8, 8], forest: [8, 8] };
  t.repeat.set(...(repeats[kind] || [4, 4])); t.anisotropy = 4;
  return LIBRARY.textures[kind] = t;
}
function libraryModel(key, done) {
  if (key.startsWith('Dock_')) {
    if (LIBRARY.models[key]) { done(LIBRARY.models[key].clone(true)); return; }
    libraryModel('WoodenDockSet', pack => {
      const part = pack && pack.getObjectByName(key.slice(5));
      if (!part) { done(null); return; }
      const piece = new THREE.Group(), model = part.clone(true);
      model.traverse(o => {
        if (!o.isMesh) return;
        const wood = m => {
          const finish = m.clone();
          finish.color.set(m.name === 'BoatTrim_Mat' ? '#765337' : '#3f3025');
          finish.roughness = 1; return finish;
        };
        o.material = Array.isArray(o.material) ? o.material.map(wood) : wood(o.material);
      });
      model.position.set(0, 0, 0); piece.add(model);
      LIBRARY.models[key] = piece; done(piece.clone(true));
    });
    return;
  }
  if (!LIBRARY_DATA.models[key]) { done(null); return; }
  if (LIBRARY.models[key]) { done(LIBRARY.models[key].clone(true)); return; }
  if (LIBRARY.loading[key]) { LIBRARY.loading[key].push(done); return; }
  LIBRARY.loading[key] = [done];
  const source = LIBRARY_DATA.models[key];
  const payload = source.startsWith('data:')
    ? Uint8Array.from(atob(source.slice(source.indexOf(',') + 1)), c => c.charCodeAt(0)).buffer
    : source;
  new GLTFX.GLTFLoader().parse(payload, '', result => {
    LIBRARY.models[key] = result.scene;
    for (const cb of LIBRARY.loading[key]) cb(result.scene.clone(true));
    delete LIBRARY.loading[key];
  }, err => {
    console.warn('library model', key, err);
    for (const cb of LIBRARY.loading[key]) cb(null);
    delete LIBRARY.loading[key];
  });
}
function libraryPlace(parent, key, x, z, height, rotation = 0) {
  const anchor = new THREE.Group(); anchor.position.set(x, typeof gy === 'function' ? gy(x, z) : 0, z); anchor.rotation.y = rotation; parent.add(anchor);
  libraryModel(key, scene => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene), span = box.max.y - box.min.y;
    if (!Number.isFinite(span) || span <= 0) return;
    const scale = height / span; scene.scale.setScalar(scale);
    scene.position.y = -box.min.y * scale;
    scene.traverse(o => { if (o.isMesh) { o.castShadow = SHADOWS; o.receiveShadow = true; } });
    anchor.add(scene);
  });
  return anchor;
}
function libraryWeapon(model, wkey) {
  const g = new THREE.Group(), fallback = buildWeapon(wkey, CLUBS.reavers); g.add(fallback);
  libraryModel(model, scene => {
    if (!scene) return;
    let box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3(); box.getSize(size);
    if (size.x > size.y && size.x > size.z) scene.rotation.z = Math.PI / 2;
    else if (size.z > size.y) scene.rotation.x = -Math.PI / 2;
    box = new THREE.Box3().setFromObject(scene); box.getSize(size);
    const W = playerWeaponDef(wkey), scale = (W ? W.len : 0.9) / Math.max(size.y, 0.001);
    scene.scale.setScalar(scale);
    scene.position.set(-(box.min.x + box.max.x) * scale / 2, -box.min.y * scale - (W && W.haft ? 0.1 : 0.15), -(box.min.z + box.max.z) * scale / 2);
    g.add(scene); fallback.visible = false;
  });
  g.userData.skinModel = model;
  return g;
}
function libraryThumb(key, W = 96, H = 96) {
  const c = cvs(W, H), x = c.getContext('2d');
  libraryModel(key, scene => {
    if (!scene || !W3.renderer) return;
    try {
      const box = new THREE.Box3().setFromObject(scene), size = new THREE.Vector3(); box.getSize(size);
      const mid = new THREE.Vector3(); box.getCenter(mid);
      const scale = 2.3 / Math.max(size.x, size.y, size.z, 0.01);
      scene.scale.setScalar(scale); scene.position.copy(mid).multiplyScalar(-scale);
      scene.rotation.y = -0.5;
      const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#8a7c64', 2.5));
      const dl = new THREE.DirectionalLight('#ffffff', 2.5); dl.position.set(3, 5, 5); sc.add(dl, scene);
      const cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 20); cam.position.set(1.8, 1.2, 3.2); cam.lookAt(0, 0, 0);
      const R = W3.renderer, rt = new THREE.WebGLRenderTarget(W, H), prev = R.getRenderTarget(), pc = R.getClearColor(new THREE.Color()), pa = R.getClearAlpha();
      R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(sc, cam);
      const px = new Uint8Array(W * H * 4), id = x.createImageData(W, H); R.readRenderTargetPixels(rt, 0, 0, W, H, px);
      for (let y = 0; y < H; y++) for (let j = 0; j < W * 4; j++) id.data[y * W * 4 + j] = px[(H - 1 - y) * W * 4 + j];
      x.putImageData(id, 0, 0); R.setRenderTarget(prev); R.setClearColor(pc, pa); rt.dispose();
    } catch (e) { console.warn('library thumbnail', key, e); }
  });
  return c;
}
