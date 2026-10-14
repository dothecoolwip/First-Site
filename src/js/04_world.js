// ---------- renderer, arena, particles ----------
const W3 = { renderer: null, scene: null, camera: null, sun: null, root: null, crowd: null, crowdBase: [], fx: [], dust: [], matchRoot: null };
const MAT = {};

function initThree() {
  const host = $('#gl');
  const renderer = new THREE.WebGLRenderer({ antialias: !IS_TOUCH, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.3 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = SHADOWS; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0c1013');
  scene.fog = new THREE.Fog('#0c1013', 40, 105);
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.4, 220);
  camera.position.set(0, 18, 22); camera.lookAt(0, 0, 0);
  Object.assign(W3, { renderer, scene, camera });

  // light: arena halides overhead
  const hemi = new THREE.HemisphereLight('#b9c6d2', '#3a332b', 0.5); scene.add(hemi); W3.hemi = hemi;
  const sun = new THREE.DirectionalLight('#fff4e4', 1.45);
  sun.position.set(7, 26, 12); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; const sm = IS_SMALL ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 21, bottom: -21, near: 5, far: 60 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target); W3.sun = sun;
  const fill = new THREE.DirectionalLight('#9fb6ff', 0.35); fill.position.set(-10, 12, -14); scene.add(fill); W3.fill = fill;

  // environment map so the steel has something to reflect
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(60, 30, 60), new THREE.MeshBasicMaterial({ color: '#1d2329', side: THREE.BackSide })));
  const panel = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.2), panel); p.position.set(i * 10, 14.5, j * 14); p.rotation.x = Math.PI / 2; env.add(p); }
  const warm = new THREE.Mesh(new THREE.PlaneGeometry(40, 4), new THREE.MeshBasicMaterial({ color: '#b78a52' })); warm.position.set(0, 3, -29.5); env.add(warm);
  const floorEnv = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: '#4a4c4b' })); floorEnv.rotation.x = -Math.PI / 2; floorEnv.position.y = -14; env.add(floorEnv);
  scene.environment = pm.fromScene(env, 0.035).texture;

  buildMaterials();
  buildArena();
  buildFx();
  window.addEventListener('resize', onResize);
}

function onResize() {
  const w = window.innerWidth, hh = window.innerHeight;
  W3.renderer.setSize(w, hh); W3.camera.aspect = w / hh; W3.camera.updateProjectionMatrix();
}

function buildMaterials() {
  MAT.steel = new THREE.MeshStandardMaterial({ color: '#c3cacd', metalness: 0.92, roughness: 0.3 });
  MAT.steelWorn = new THREE.MeshStandardMaterial({ color: '#9aa2a6', metalness: 0.85, roughness: 0.45 });
  MAT.steelDark = new THREE.MeshStandardMaterial({ color: '#6c7478', metalness: 0.85, roughness: 0.5 });
  MAT.mail = new THREE.MeshStandardMaterial({ color: '#6f777b', metalness: 0.8, roughness: 0.62 });
  MAT.brass = new THREE.MeshStandardMaterial({ color: '#b8913f', metalness: 0.9, roughness: 0.35 });
  MAT.leather = new THREE.MeshStandardMaterial({ color: '#4b2f1c', roughness: 0.82 });
  MAT.leatherDark = new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.85 });
  MAT.gambeson = new THREE.MeshStandardMaterial({ color: '#3d3833', roughness: 0.95 });
  MAT.slit = new THREE.MeshBasicMaterial({ color: '#050607' });
  MAT.haft = new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.75 });
  MAT.blade = new THREE.MeshStandardMaterial({ color: '#e2e7e9', metalness: 0.8, roughness: 0.34 });
  MAT.black = new THREE.MeshStandardMaterial({ color: '#1a1c1f', roughness: 0.9 });
  MAT.skin = new THREE.MeshStandardMaterial({ color: '#c99a7a', roughness: 0.8 });
  MAT.marshalYellow = new THREE.MeshStandardMaterial({ color: '#f2c40f', roughness: 0.7, emissive: '#3a2e00' });
  MAT.tape = {};
  for (const k in TAPES) MAT.tape[k] = new THREE.MeshStandardMaterial({ color: TAPES[k].color, roughness: k === 'duct' ? 0.42 : 0.92, metalness: k === 'duct' ? 0.35 : 0 });
  MAT.flagPink = new THREE.MeshStandardMaterial({ color: '#ff3d8b', roughness: 0.4, emissive: '#5c0b2a' });
  MAT.flagBlue = new THREE.MeshStandardMaterial({ color: '#3b93ff', roughness: 0.4, emissive: '#0b2a5c' });
  MAT.woodBar = new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.85 });
  MAT.woodBar.map = TEX.wood.clone(); MAT.woodBar.map.needsUpdate = true; MAT.woodBar.map.wrapS = THREE.RepeatWrapping; MAT.woodBar.map.repeat.set(12, 1);
  MAT.woodPost = new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.85 });
  MAT.whiteTape = new THREE.MeshStandardMaterial({ color: '#e7e4da', roughness: 0.9 });
  MAT.blob = new THREE.MeshBasicMaterial({ map: TEX.blob, transparent: true, depthWrite: false });
  for (const c of ['#3b2a1c', '#7a4b26', '#1d1712', '#b88a52', '#5a3a22']) HAIR.push(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
}

function buildArena() {
  const S = W3.scene; const root = new THREE.Group(); S.add(root); W3.root = root;
  const { W, L } = LIST;

  // list rails: posts, wide top bar, bottom rail (wooden)
  const postGeo = new THREE.BoxGeometry(0.12, 1.22, 0.12);
  const posts = []; const step = 2.5;
  for (let x = -W / 2; x <= W / 2 + 0.01; x += step) { posts.push([x, -L / 2], [x, L / 2]); }
  for (let z = -L / 2 + step; z <= L / 2 - step + 0.01; z += step) { posts.push([-W / 2, z], [W / 2, z]); }
  const postMesh = new THREE.InstancedMesh(postGeo, MAT.woodPost, posts.length);
  const m4 = new THREE.Matrix4();
  posts.forEach((p, i) => { m4.makeTranslation(p[0], 0.61, p[1]); postMesh.setMatrixAt(i, m4); });
  postMesh.castShadow = true; postMesh.receiveShadow = true; root.add(postMesh);
  const bar = (len, w, hgt, x, y, z, rotY) => { const m = new THREE.Mesh(new THREE.BoxGeometry(len, hgt, w), MAT.woodBar); m.position.set(x, y, z); m.rotation.y = rotY; m.castShadow = true; m.receiveShadow = true; root.add(m); };
  for (const sz of [-1, 1]) { bar(W + 0.2, 0.2, 0.06, 0, 1.22, sz * L / 2, 0); bar(W + 0.2, 0.08, 0.14, 0, 0.22, sz * L / 2, 0); bar(W + 0.2, 0.06, 0.12, 0, 0.72, sz * L / 2, 0); }
  for (const sx of [-1, 1]) { bar(L + 0.2, 0.2, 0.06, sx * W / 2, 1.22, 0, Math.PI / 2); bar(L + 0.2, 0.08, 0.14, sx * W / 2, 0.22, 0, Math.PI / 2); bar(L + 0.2, 0.06, 0.12, sx * W / 2, 0.72, 0, Math.PI / 2); }

  // white tape on the floor: start lines and weapon-zone boxes
  const strip = (x, z, len, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.06), MAT.whiteTape); m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, 0.006, z); m.receiveShadow = true; root.add(m); };
  for (const sz of [-1, 1]) strip(0, sz * (L / 2 - 3), W - 2, 0);
  W3.zones = [{ x: W / 2 - 0.9, z: L / 2 - 5 }, { x: -W / 2 + 0.9, z: -(L / 2 - 5) }];
  // weapon-zone rectangles (3 m along the rail, 1.4 m deep)
  for (const zn of W3.zones) {
    const sx = Math.sign(zn.x), inner = sx * (W / 2 - 1.4);
    strip(inner, zn.z, 3, Math.PI / 2);
    strip((inner + sx * W / 2) / 2, zn.z - 1.5, 1.4, 0);
    strip((inner + sx * W / 2) / 2, zn.z + 1.5, 1.4, 0);
  }

  W3.matchRoot = new THREE.Group(); S.add(W3.matchRoot);
  setVenue(store.get('venue', 'arena'));
}

// the summer hockey arena: concrete pad, boards and glass, bleachers, halide lights
function buildVenueArena(root) {
  const m4 = new THREE.Matrix4();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 120), new THREE.MeshStandardMaterial({ map: TEX.concrete, color: '#a3a7a8', roughness: 0.93, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  // hockey boards, kick plate and glass around a rounded rink
  const RW = 26, RL = 61, R = 8.5, pts = [];
  const seg = (cx, cz, a0, a1, n) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]); } };
  const line = (x0, z0, x1, z1, n) => { for (let i = 0; i < n; i++) pts.push([lerp(x0, x1, i / n), lerp(z0, z1, i / n)]); };
  const hx = RW / 2, hz = RL / 2;
  line(hx, -hz + R, hx, hz - R, 22); seg(hx - R, hz - R, 0, Math.PI / 2, 9);
  line(hx - R, hz, -hx + R, hz, 6); seg(-hx + R, hz - R, Math.PI / 2, Math.PI, 9);
  line(-hx, hz - R, -hx, -hz + R, 22); seg(-hx + R, -hz + R, Math.PI, Math.PI * 1.5, 9);
  line(-hx + R, -hz, hx - R, -hz, 6); seg(hx - R, -hz + R, Math.PI * 1.5, Math.PI * 2, 9);
  const n = pts.length;
  const boardG = new THREE.BoxGeometry(1, 1, 0.14);
  const board = new THREE.InstancedMesh(boardG, new THREE.MeshStandardMaterial({ color: '#e9ebe8', roughness: 0.55 }), n);
  const kick = new THREE.InstancedMesh(boardG, new THREE.MeshStandardMaterial({ color: '#d9b21c', roughness: 0.6 }), n);
  const cap = new THREE.InstancedMesh(boardG, new THREE.MeshStandardMaterial({ color: '#b3242b', roughness: 0.5 }), n);
  const glass = new THREE.InstancedMesh(boardG, new THREE.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.1, depthWrite: false }), n);
  const q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n]; const dx = b[0] - a[0], dz = b[1] - a[1]; const len = Math.hypot(dx, dz) + 0.02;
    q.setFromAxisAngle(up, Math.atan2(-dz, dx)); const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    sc.set(len, 0.87, 1); pv.set(mx, 0.635, mz); m4.compose(pv, q, sc); board.setMatrixAt(i, m4);
    sc.set(len, 0.2, 1.02); pv.set(mx, 0.1, mz); m4.compose(pv, q, sc); kick.setMatrixAt(i, m4);
    sc.set(len, 0.06, 1.6); pv.set(mx, 1.1, mz); m4.compose(pv, q, sc); cap.setMatrixAt(i, m4);
    sc.set(len, 1.8, 0.12); pv.set(mx, 2.03, mz); m4.compose(pv, q, sc); glass.setMatrixAt(i, m4);
  }
  board.receiveShadow = true; root.add(board, kick, cap, glass);

  // bleachers with a modest summer crowd
  const tier = new THREE.MeshStandardMaterial({ color: '#2b3236', roughness: 0.8 });
  const seat = new THREE.MeshStandardMaterial({ color: '#27313b', roughness: 0.7 });
  for (const sx of [-1, 1]) for (let r = 0; r < 9; r++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 46), tier); t.position.set(sx * (15.2 + r * 0.95), 0.28 + r * 0.55, 0); t.scale.y = 1 + r * 2; t.position.y = (0.55 * (1 + r * 2)) / 2; root.add(t);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 46), seat); s.position.set(sx * (15.0 + r * 0.95), 0.55 * (1 + r * 2) + 0.06, 0); root.add(s);
  }
  const people = IS_TOUCH ? 220 : 380; const bodyG = new THREE.BoxGeometry(0.46, 0.62, 0.34); const headG = new THREE.IcosahedronGeometry(0.13, 1);
  const bodies = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ roughness: 0.85 }), people);
  const heads = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ roughness: 0.8 }), people);
  const shirt = ['#2f4b7c', '#7c2f3a', '#3a3f44', '#d6d1c4', '#526b3a', '#b87a2a', '#1f1f22', '#ff3d8b', '#3b93ff', '#6a5a8a', '#9c3d2a'];
  const skins = ['#e0b896', '#c69373', '#8d5a3c', '#f1cfb4', '#5e3a26', '#b07b5a'];
  const col = new THREE.Color(); W3.crowdBase = [];
  for (let i = 0; i < people; i++) {
    const sx = i % 2 ? 1 : -1; const r = (Math.random() * 9) | 0; const z = rand(-22, 22);
    const x = sx * (15.0 + r * 0.95); const y = 0.55 * (1 + r * 2) + 0.42;
    W3.crowdBase.push({ x, y, z, ph: rand(0, TAU), amp: rand(0.02, 0.06), ex: 0 });
    bodies.setColorAt(i, col.set(pick(shirt))); heads.setColorAt(i, col.set(pick(skins)));
  }
  W3.crowd = { bodies, heads }; updateCrowd(0, 0);
  root.add(bodies, heads);

  // roof light fixtures
  const fixt = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.25, 0.8), new THREE.MeshBasicMaterial({ color: '#fff6dd' }), 24);
  let k = 0; for (let i = -1; i <= 1; i++) for (let j = -3; j <= 4; j++) { m4.makeTranslation(i * 9, 15, j * 9 - 4); fixt.setMatrixAt(k++, m4); }
  root.add(fixt);
  // banner over the far end
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: TEX.banner, fog: true }));
  ban.position.set(0, 6.4, -30); root.add(ban);
  const ban2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: TEX.banner })); ban2.position.set(-23.5, 8.5, 0); ban2.rotation.y = Math.PI / 2; root.add(ban2);
  const ban3 = ban2.clone(); ban3.position.x = 23.5; ban3.rotation.y = -Math.PI / 2; root.add(ban3);
  // far wall
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 20), new THREE.MeshStandardMaterial({ color: '#1b2126', roughness: 1 })); wall.position.set(0, 9, -33); root.add(wall);
}

function updateCrowd(t, excite) {
  const { bodies, heads } = W3.crowd; const m4 = new THREE.Matrix4();
  for (let i = 0; i < W3.crowdBase.length; i++) {
    const c = W3.crowdBase[i]; const e = Math.max(c.ex, excite * 0.6);
    const up = Math.max(0, Math.sin(t * (2 + e * 6) + c.ph)) * (c.amp + e * 0.18) + e * 0.25;
    m4.makeTranslation(c.x, c.y + up, c.z); bodies.setMatrixAt(i, m4);
    m4.makeTranslation(c.x, c.y + up + 0.45, c.z); heads.setMatrixAt(i, m4);
    c.ex = Math.max(0, c.ex - 0.01);
  }
  bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
}

// ---------- particles ----------
function buildFx() {
  const sm = new THREE.SpriteMaterial({ map: TEX.spark, color: '#ffffff', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  for (let i = 0; i < 90; i++) { const s = new THREE.Sprite(sm.clone()); s.visible = false; s.scale.setScalar(0.12); (W3.matchRoot || W3.scene).add(s); W3.fx.push({ s, life: 0, v: new THREE.Vector3() }); }
  const dm = new THREE.SpriteMaterial({ map: TEX.dust, depthWrite: false, transparent: true });
  for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(dm.clone()); s.visible = false; (W3.matchRoot || W3.scene).add(s); W3.dust.push({ s, life: 0, max: 1 }); }
}
function sparks(pos, n = 10, power = 1, color = '#ffffff') {
  let c = 0; const cute = CUTE.on; if (cute) n = Math.max(3, Math.round(n * 0.55)); // youth: hearts and stars float up instead of sparks
  for (const p of W3.fx) {
    if (p.life > 0) continue; p.s.visible = true; p.s.position.copy(pos); const m = p.s.material; p.cute = cute;
    if (cute) { m.map = cuteTex(c % 2 ? 'star' : 'heart'); m.blending = THREE.NormalBlending; m.color.set(CUTE_POPS[(Math.random() * CUTE_POPS.length) | 0]); m.rotation = rand(-0.5, 0.5); m.opacity = 1; p.life = p.max = rand(0.6, 1.0); p.v.set(rand(-1, 1), rand(0.9, 1.8), rand(-1, 1)).multiplyScalar(rand(1.1, 2.2) * Math.min(power, 1.4)); p.s.scale.setScalar(rand(0.11, 0.2)); }
    else { if (m.map !== TEX.spark) { m.map = TEX.spark; m.blending = THREE.AdditiveBlending; m.rotation = 0; } m.opacity = 1; m.color.set(color); p.life = rand(0.18, 0.45); p.v.set(rand(-1, 1), rand(0.2, 1.4), rand(-1, 1)).multiplyScalar(rand(2, 5) * power); p.s.scale.setScalar(rand(0.06, 0.14)); }
    if (++c >= n) break;
  }
}
function breathPuff(x, y, z, k) {
  const d = W3.dust.find(p => p.life <= 0); if (!d) return;
  d.life = d.max = rand(0.6, 0.9); d.s.visible = true; d.s.position.set(x, y, z); d.size = 0.25 + 0.35 * k; d.s.scale.setScalar(0.1); d.breath = true;
}
function dustPuff(x, z, size = 1) {
  for (let i = 0; i < 4; i++) {
    const d = W3.dust.find(p => p.life <= 0); if (!d) return;
    d.life = d.max = rand(0.7, 1.2); d.s.visible = true; d.s.position.set(x + rand(-0.5, 0.5), 0.2, z + rand(-0.5, 0.5)); d.size = size * rand(1, 1.8); d.s.scale.setScalar(0.3);
  }
}
function updateFx(dt) {
  for (const p of W3.fx) { if (p.life <= 0) continue; p.life -= dt; if (p.cute) { p.v.y -= 2.2 * dt; p.v.multiplyScalar(1 - 1.5 * dt); p.s.material.opacity = clamp(p.life * 3, 0, 1); p.s.position.addScaledVector(p.v, dt); if (p.life <= 0) p.s.visible = false; continue; } p.v.y -= 9.8 * dt; p.s.position.addScaledVector(p.v, dt); if (p.s.position.y < 0.02) { p.s.position.y = 0.02; p.v.y *= -0.3; p.v.x *= 0.6; p.v.z *= 0.6; } if (p.life <= 0) p.s.visible = false; }
  for (const d of W3.dust) { if (d.life <= 0) continue; d.life -= dt; const k = 1 - d.life / d.max; d.s.scale.setScalar(0.3 + d.size * k); d.s.material.opacity = (d.breath ? (W3.venue === 'castle' ? 0.55 : 0.35) : 0.6) * (1 - k); d.s.position.y += dt * (d.breath ? 0.45 : 0.3); if (d.life <= 0) d.breath = false; if (d.life <= 0) d.s.visible = false; }
}
