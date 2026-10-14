// ---------- first person: eye on the body, the visor you look through, arms and weapon in view ----------
const FP = { yaw: Math.PI, pitch: -0.06, looking: 0, visorKey: null, visorW: 0, visorH: 0, jolt: 0, vm: null, rollS: 0, pitchS: 0, drop: 0 };
// you control the view in both cameras: first person (through the visor) or third person (over the shoulder)
const isCtl = () => !!(G.player && !G.player.out && !G.attract && ['prefight', 'fight', 'stopping'].includes(G.phase));
const isFP = () => G.settings.view !== 'tp' && isCtl();
const isTP = () => G.settings.view === 'tp' && isCtl();
const isFPView = () => isFP() && !(typeof CAM !== 'undefined' && CAM.cine) && !G.photo; // the first-person dressing (visor, hands) is off during the takedown cam
function setView(v) {
  if (v !== 'tp') v = 'fp'; if (G.settings.view === v) { updateViewBtn(); return; }
  G.settings.view = v; saveSettings();
  const o = $('#optFP'); if (o) o.checked = v !== 'tp';
  if (isCtl()) { if (v === 'fp') FP.drop = 1; else { CAM.blend = 0; CAM.from.copy(W3.camera.position); CAM.tpInit = false; } AU.click(); }
  updateViewBtn(); refreshTouchUI(); if (isCtl()) ev('view');
}
function updateViewBtn() { $$('#viewBtn span').forEach(s => s.classList.toggle('on', s.dataset.v === (G.settings.view === 'tp' ? 'tp' : 'fp'))); }

// ---- visor shapes: each helm cuts different openings out of the dark steel ----
function visorPaths(key, W, H) {
  // every opening is 15% bigger than the first pass: slits 15% taller, holes 15% more area, bars 15% thinner
  const K = 1.15, KR = Math.sqrt(1.15);
  const u = Math.min(W, H), cx = W / 2, y0 = H * 0.44; const P = [], holes = new Path2D(), deco = [];
  const rect = (x, y, w, hh, r = 0) => { const p = new Path2D(); if (p.roundRect && r) p.roundRect(x, y, w, hh, r); else p.rect(x, y, w, hh); return p; };
  const slit = (x, yc, w, hh, r) => rect(x, yc - hh * K / 2, w, hh * K, r); // centred on yc, height grown by K
  const hole = (x, y, r) => { r *= KR; holes.moveTo(x + r, y); holes.arc(x, y, r, 0, TAU); };
  if (key === 'greathelm') {
    P.push(slit(cx - 0.445 * W, y0, 0.44 * W, 0.09 * u, 0.04 * u), slit(cx + 0.005 * W, y0, 0.44 * W, 0.09 * u, 0.04 * u));
    for (const sx of [-1, 1]) for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) if ((r + c) % 2 === 0) hole(cx + sx * (0.14 * W + c * 0.05 * u), H * 0.66 + r * 0.05 * u, 0.014 * u);
    deco.push(['brass', cx - 0.012 * W, 0, 0.024 * W, y0 - 0.055 * u], ['brass', cx - 0.012 * W, y0 + 0.055 * u, 0.024 * W, H], ['brass', 0, y0 - 0.17 * u, W, 0.03 * u]);
  } else if (key === 'pigface') {
    { const t = 0.0575 * u * K, b = 0.0575 * u * K, m = y0 - 0.0275 * u; // continuous curved slit, 15% taller
      const p = new Path2D(); p.moveTo(cx - 0.47 * W, m - t); p.quadraticCurveTo(cx, m - t + 0.065 * u, cx + 0.47 * W, m - t); p.lineTo(cx + 0.47 * W, m + b); p.quadraticCurveTo(cx, m + b + 0.07 * u, cx - 0.47 * W, m + b); p.closePath(); P.push(p); }
    for (let r = 0; r < 6; r++) { const n = 9 - r; for (let c = 0; c < n; c++) hole(cx + (c - (n - 1) / 2) * 0.052 * u, H * 0.6 + r * 0.052 * u, 0.017 * u); }
  } else if (key === 'klapp') {
    P.push(slit(cx - 0.47 * W, y0, 0.94 * W, 0.13 * u, 0.05 * u));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) hole(cx + 0.18 * W + c * 0.04 * u, H * 0.66 + r * 0.04 * u, 0.009 * u);
  } else if (key === 'cross') {
    P.push(slit(cx - 0.42 * W, y0 - 0.045 * u, 0.84 * W, 0.11 * u, 0.045 * u));
    const crossAt = (x, y) => { const s = 0.042 * u, rr = 0.017 * u; hole(x, y, rr); hole(x - s, y, rr); hole(x + s, y, rr); hole(x, y - s, rr); hole(x, y + s, rr); };
    crossAt(cx - 0.2 * W, H * 0.6); crossAt(cx + 0.2 * W, H * 0.6); crossAt(cx - 0.2 * W, H * 0.8); crossAt(cx + 0.2 * W, H * 0.8); crossAt(cx, H * 0.7);
    deco.push(['brass', cx - 0.012 * W, y0 + 0.04 * u, 0.024 * W, H]);
  } else if (key === 'grill') {
    const gw = 0.88 * W * KR, gh = Math.min(H * 0.66 * KR, H * 0.78); P.push(rect(cx - gw / 2, H * 0.49 - gh / 2, gw, gh, 0.14 * u));
    const bw = 0.03 * u / K;
    for (let i = -3; i <= 3; i++) deco.push(['bar', cx + i * 0.13 * W - bw / 2, H * 0.06, bw, H * 0.86]);
    deco.push(['bar', 0, H * 0.34, W, 0.028 * u / K]);
  } else if (key === 'sallet') {
    const t = 0.075 * u * K, m = y0 + 0.015 * u; // wide horizontal slit, 15% taller
    const p = new Path2D(); p.moveTo(0.02 * W, m - t); p.quadraticCurveTo(cx, m - t - 0.06 * u, 0.98 * W, m - t); p.lineTo(0.98 * W, m + t); p.quadraticCurveTo(cx, m + t + 0.06 * u, 0.02 * W, m + t); p.closePath(); P.push(p);
    deco.push(['brass', 0, y0 - 0.17 * u, W, 0.018 * u]);
  } else if (key === 'barbute') {
    const th = 0.21 * u * K, tw = 0.24 * W * KR;
    P.push(rect(cx - 0.42 * W, y0 - th / 2, 0.84 * W, th, 0.08 * u), rect(cx - tw / 2, y0 - th / 2, tw, H * 0.68, 0.08 * u));
  } else { // kettle hat: brim above, bevor below, open in between (15% more of the view)
    const p = new Path2D(); p.moveTo(-10, H * 0.13); p.quadraticCurveTo(cx, H * 0.21, W + 10, H * 0.13); p.lineTo(W + 10, H * 0.85); p.quadraticCurveTo(cx, H * 0.75, -10, H * 0.85); p.closePath(); P.push(p);
  }
  return { P, holes, deco, u };
}
function drawVisor(cv, key) {
  // solid steel or clear view, nothing in between
  const W = cv.width, H = cv.height, x = cv.getContext('2d');
  if (key.startsWith('foam')) return drawFoamVisor(x, W, H);
  const { P, holes, deco, u } = visorPaths(key, W, H);
  x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.globalAlpha = 1; x.clearRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, H * 0.44, u * 0.1, W / 2, H * 0.44, Math.max(W, H) * 0.75);
  g.addColorStop(0, '#3a4044'); g.addColorStop(0.45, '#1c2023'); g.addColorStop(1, '#08090a');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // rivets and brass trim live on the steel, never across an opening
  const paint = (kind, dx, dy, dw, dh) => {
    const gg = x.createLinearGradient(dx, 0, dx + dw, 0);
    if (kind === 'brass') { gg.addColorStop(0, '#3d2f10'); gg.addColorStop(0.5, '#8a6a26'); gg.addColorStop(1, '#3d2f10'); }
    else { gg.addColorStop(0, '#1d2123'); gg.addColorStop(0.5, '#6d777b'); gg.addColorStop(1, '#1a1d1f'); }
    x.fillStyle = gg; x.fillRect(dx, dy, dw, dh);
  };
  for (const d of deco) if (d[0] !== 'bar') paint(...d);
  x.globalCompositeOperation = 'destination-out';
  P.forEach(p => x.fill(p)); x.fill(holes);
  x.globalCompositeOperation = 'source-over';
  for (const d of deco) if (d[0] === 'bar') paint('steel', d[1], d[2], d[3], d[4]);
  x.strokeStyle = 'rgba(205,214,218,.5)'; x.lineWidth = Math.max(1.5, u * 0.005); P.forEach(p => x.stroke(p));
  x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = Math.max(1, u * 0.003); x.stroke(holes);
}
// youth foam helmet: a big padded oval, pastel all round, nearly the whole view open
function drawFoamVisor(x, W, H) {
  const pal = G.player ? cutePal(G.player.club) : { base: '#ffb4d2', deep: '#ff8fbd', light: '#fff0f6' }, u = Math.min(W, H);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.setLineDash([]); x.clearRect(0, 0, W, H);
  x.fillStyle = pal.base; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, H / 2, u * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); g.addColorStop(0, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(0,0,0,.22)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,.35)'; for (let r = 0; r < 9; r++) for (let i = 0; i < 16; i++) { x.beginPath(); x.arc((i + (r % 2) * 0.5) * W / 15, r * H / 8, u * 0.012, 0, TAU); x.fill(); }
  const p = new Path2D(); p.ellipse(W / 2, H * 0.5, W * 0.56, H * 0.62, 0, 0, TAU);
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.fill(p); x.globalCompositeOperation = 'source-over';
  x.lineWidth = u * 0.05; x.strokeStyle = pal.deep; x.stroke(p);
  const q = new Path2D(); q.ellipse(W / 2, H * 0.5, W * 0.56 + u * 0.035, H * 0.62 + u * 0.035, 0, 0, TAU);
  x.lineWidth = u * 0.008; x.strokeStyle = 'rgba(255,255,255,.75)'; x.setLineDash([u * 0.02, u * 0.016]); x.stroke(q); x.setLineDash([]);
}
function visorPreview(key, w = 200, hh = 112) {
  const c = cvs(w, hh), x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, hh); bg.addColorStop(0, '#2c3a46'); bg.addColorStop(0.55, '#6f7678'); bg.addColorStop(1, '#8c908e'); x.fillStyle = bg; x.fillRect(0, 0, w, hh);
  x.fillStyle = '#7a2230'; for (let i = 0; i < 4; i++) { const px = w * (0.22 + i * 0.18); x.fillRect(px - 5, hh * 0.38, 10, hh * 0.26); x.fillStyle = '#c3cacd'; x.beginPath(); x.arc(px, hh * 0.36, 5, 0, TAU); x.fill(); x.fillStyle = i % 2 ? '#1c3454' : '#7a2230'; }
  const v = cvs(w, hh); drawVisor(v, key); x.drawImage(v, 0, 0); return c;
}
function updateVisorOverlay(dt = 0.016) {
  const cv = $('#visor'); const on = isFPView();
  cv.hidden = !on; if (!on) { FP.drop = 0; return; }
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5); const W = Math.round(window.innerWidth * dpr), H = Math.round(window.innerHeight * dpr);
  const key = CUTE.on ? 'foam:' + G.player.club.key + G.player.club.tabard : G.player.spec.helm;
  if (FP.visorKey !== key || FP.visorW !== W || FP.visorH !== H) { cv.width = W; cv.height = H; drawVisor(cv, key); FP.visorKey = key; FP.visorW = W; FP.visorH = H; }
  // switching into first person: the visor snaps down over your eyes
  FP.drop = Math.max(0, FP.drop - dt * 5.5); const dropY = FP.drop > 0 ? -Math.pow(FP.drop, 2) * 100 : 0;
  const j = FP.jolt; cv.style.transform = (j > 0.01 ? `translate(${rand(-1, 1) * j * 10}px,${rand(-1, 1) * j * 8}px)` : '') + (dropY ? ` translateY(${dropY}%)` : '');
}

// ---- third person: over the right shoulder, steered by the same look controls ----
function updateTPCamera(dt) {
  const p = G.player, cam = W3.camera; const aspect = window.innerWidth / window.innerHeight;
  const fov = (aspect < 0.8 ? 74 : aspect < 1.3 ? 66 : 58) + FEEL.fov;
  if (Math.abs(cam.fov - fov) > 0.1 || cam.near !== 0.1) { cam.fov = fov; cam.near = 0.1; cam.updateProjectionMatrix(); }
  const hs = p.body.h / 1.8;
  const lying = p.state === 'grounded' || p.state === 'rising' || p.state === 'kneeling';
  const base = lying ? p.groundPos : p.pos;
  const pivot = new THREE.Vector3(base.x, (lying ? 0.9 : 1.55) * hs, base.z);
  const fw = fwd(FP.yaw), right = { x: -Math.cos(FP.yaw), z: Math.sin(FP.yaw) };
  const el = clamp(0.3 - FP.pitch * 0.9, 0.06, 1.0);       // look down = camera rises
  const dist = (aspect < 0.8 ? 4.8 : aspect < 1.3 ? 4.4 : 4.2) * (0.75 + 0.25 * hs);
  const side = aspect < 0.8 ? 0.35 : 0.75;
  const tp = new THREE.Vector3(pivot.x - fw.x * dist * Math.cos(el) + right.x * side, pivot.y + dist * Math.sin(el), pivot.z - fw.z * dist * Math.cos(el) + right.z * side);
  // stay inside the hall so the boards never block the shot
  const lim = { x: LIST.W / 2 + 2.6, z: LIST.L / 2 + 2.6 }; tp.x = clamp(tp.x, -lim.x, lim.x); tp.z = clamp(tp.z, -lim.z, lim.z);
  const tl = new THREE.Vector3(pivot.x + fw.x * 2.2 + right.x * side * 0.1, pivot.y - 0.25 + FP.pitch * 1.4, pivot.z + fw.z * 2.2 + right.z * side * 0.1);
  if (!CAM.tpInit) { CAM.tpPos.copy(tp); CAM.tpLook.copy(tl); CAM.tpInit = true; }
  const k = 1 - Math.exp(-14 * dt);
  CAM.tpPos.lerp(tp, k); CAM.tpLook.lerp(tl, 1 - Math.exp(-18 * dt));
  CAM.blend = Math.min(1, CAM.blend + dt / 0.35); const b = ease(CAM.blend);
  cam.position.copy(CAM.from).lerp(CAM.tpPos, b);
  const sh = G.shake * shakeAmt() * 0.5; if (sh > 0.01) { cam.position.x += rand(-1, 1) * sh * 0.12; cam.position.y += rand(-1, 1) * sh * 0.1; }
  G.shake = Math.max(0, G.shake - dt * 2.2);
  cam.lookAt(CAM.tpLook); applyFeel(cam, dt);
  CAM.pos.copy(cam.position); CAM.look.copy(CAM.tpLook);
}

// ---- the camera rides on the body ----
function updateFPCamera(dt) {
  const p = G.player, cam = W3.camera;
  const aspect = window.innerWidth / window.innerHeight;
  const fov = p.helm.fov * (aspect < 1 ? 1.3 : aspect < 1.4 ? 1.12 : 1) + FEEL.fov;
  if (Math.abs(cam.fov - fov) > 0.1 || cam.near !== 0.06) { cam.fov = fov; cam.near = 0.06; cam.updateProjectionMatrix(); }
  const hs = p.body.h / 1.8; let eyeH = p.body.h * 0.935 - (p.brace ? 0.12 : 0) - 0.06 * (1 - p.gas) * hs;
  let bx = p.pos.x, bz = p.pos.z, ang = 0, dir = { x: 0, z: 0 }, lyingOrSit = false;
  const s = p.state;
  if (s === 'standing' || s === 'posting') { const L = vlen(p.lean); ang = Math.atan(L); if (L > 1e-4) dir = { x: p.lean.x / L, z: p.lean.z / L }; if (s === 'posting') eyeH -= 0.32 * hs; }
  else if (s === 'falling') { ang = lerp(p.tilt0 || 0.4, 1.38, ease(p.fallT / 0.55)); dir = p.fallDir; }
  else if (s === 'grounded' || s === 'rising' || s === 'kneeling') {
    lyingOrSit = true;
    const gt = p.gt || 0;
    if (s === 'grounded' && p.groundStyle === 'fall' && gt < 0.8) { ang = 1.38; dir = p.fallDir; }
    else { const sit = s === 'grounded' && p.groundStyle === 'fall' ? ease((gt - 0.8) / 0.7) : 1; bx = lerp(p.pos.x, p.groundPos.x, sit); bz = lerp(p.pos.z, p.groundPos.z, sit); ang = 1.38 * (1 - sit); dir = p.fallDir; eyeH = lerp(eyeH, (s === 'kneeling' || p.groundStyle === 'kneel' ? 1.08 : 0.84) * hs, sit); }
    if (s === 'rising') { ang = 0; bx = p.groundPos.x; bz = p.groundPos.z; eyeH = lerp(0.84 * hs, eyeH, ease(p.riseT)); }
  }
  const eyeY = Math.max(0.22, Math.cos(ang) * eyeH);
  let ex = bx + dir.x * Math.sin(ang) * eyeH, ez = bz + dir.z * Math.sin(ang) * eyeH, ey = eyeY;
  // step bob and stagger jolts
  const spd = vlen(p.vel); const wk = clamp(spd / 3.5, 0, 1.4);
  if (s === 'standing') { ey += Math.abs(Math.sin(p.walkPh)) * 0.045 * wk - 0.02 * wk; if (p.stepRem > 0) ey -= 0.035; }
  // blown: shoulders heave with each breath and you sag lower as the fight drags on
  const we = BREATH.e, fatg = p.fatigue || 0;
  if (s === 'standing' && we > 0.03) ey += Math.sin(BREATH.ph) * 0.02 * we - 0.05 * fatg * hs;
  FP.jolt = Math.max(0, FP.jolt - dt * 3);
  const sh = G.shake * shakeAmt() * 0.6 + FP.jolt * 0.5 * Math.min(1, shakeAmt() + 0.3);
  G.shake = Math.max(0, G.shake - dt * 2.6); // (this never decayed in first person before, so one big hit left the view trembling)
  ex += rand(-1, 1) * sh * 0.05; ey += rand(-1, 1) * sh * 0.04;
  // orientation: look direction, plus the body's sway
  const sF = Math.sin(FP.yaw), cF = Math.cos(FP.yaw);
  const tf = Math.sin(ang) * (dir.x * sF + dir.z * cF), tx = Math.sin(ang) * (dir.x * cF - dir.z * sF);
  let pitch = FP.pitch - Math.asin(clamp(tf, -1, 1)) * (s === 'standing' ? 0.55 : 0.95) + (s === 'standing' ? Math.sin(BREATH.ph) * 0.014 * we - 0.05 * fatg : 0);
  let roll = Math.asin(clamp(tx, -1, 1)) * (s === 'standing' ? 0.7 : 1.0) + Math.sin(p.walkPh) * 0.012 * wk * (1 + fatg) + Math.sin(G.realTime * 7) * 0.09 * p.bell + Math.sin(BREATH.ph * 0.5 + 1.3) * 0.022 * we;
  if (lyingOrSit && s === 'grounded' && ang < 0.2) { pitch = FP.pitch; roll = 0; }
  FP.pitchS = damp(FP.pitchS, pitch, s === 'standing' ? 30 : 8, dt); FP.rollS = damp(FP.rollS, roll, s === 'standing' ? 30 : 8, dt);
  cam.position.set(ex, ey, ez);
  applyFeel(cam, dt * 1.6); cam.rotation.order = 'YXZ'; cam.rotation.set(FP.pitchS + rand(-1, 1) * sh * 0.02, FP.yaw + Math.PI + rand(-1, 1) * sh * 0.015, FP.rollS);
  CAM.pos.copy(cam.position);
}

// ---- arms, weapon and shield in view ----
function buildViewmodel() {
  const scene = new THREE.Scene(); scene.environment = W3.scene.environment;
  scene.add(new THREE.HemisphereLight('#c6d2dd', '#3a332b', 0.75));
  const d = new THREE.DirectionalLight('#fff4e4', 1.2); d.position.set(0.5, 1, 0.6); scene.add(d);
  const root = new THREE.Group(); scene.add(root);
  const mkArm = () => { // vambrace with a flared gauntlet cuff and a band of black hockey tape
    const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.058, 1, 12), MAT.steel); m.rotation.x = Math.PI / 2; g.add(m);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.05, 0.11, 12, 1, true), MAT.steel); cuff.material.side = THREE.DoubleSide; cuff.rotation.x = Math.PI / 2; g.add(cuff); g.userData.cuff = cuff;
    const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 12, 1, true), MAT.tape.black); tape.rotation.x = Math.PI / 2; g.add(tape); g.userData.tape = tape;
    root.add(g); return g; };
  const handR = new THREE.Group(), handL = new THREE.Group(); root.add(handR, handL);
  for (const hnd of [handR, handL]) { // fist: knuckle plate and finger lames around the grip
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.085, 0.08), MAT.steel); back.position.set(0.035, 0, 0.0); hnd.add(back);
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.026, 10, 1, false, 0, Math.PI), MAT.steel); l.rotation.set(0, 0, Math.PI / 2); l.position.set(0.0, 0.028 - i * 0.028, 0.0); l.scale.set(1, 1, 1.35); hnd.add(l); }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.03, 2, 6), MAT.steelDark); thumb.position.set(-0.02, 0.045, -0.015); thumb.rotation.z = 0.6; hnd.add(thumb);
  }
  const wMount = new THREE.Group(); handR.add(wMount);
  const sMount = new THREE.Group(); handL.add(sMount);
  FP.vm = { scene, root, armR: mkArm(), armL: mkArm(), handR, handL, wMount, sMount, wKey: null, sKey: null, cur: {}, team: null };
}
const VMP = { // hand position and weapon orientation in view space (metres, radians)
  idle1: { r: [0.26, -0.22, -0.5, -0.4, 0, -0.25] }, idle2: { r: [0.2, -0.28, -0.42, -0.75, 0, 0.45] },
  wR2L: { r: [0.42, -0.06, -0.3, 0.55, 0, -1.15] }, sR2L: { r: [-0.34, -0.26, -0.55, -1.35, 0, 1.45] },
  wL2R: { r: [-0.3, -0.04, -0.3, 0.45, 0, 1.05] }, sL2R: { r: [0.44, -0.3, -0.55, -1.35, 0, -1.45] },
  wO: { r: [0.2, 0.12, -0.24, 1.35, 0, -0.2] }, sO: { r: [0.08, -0.38, -0.62, -1.95, 0, -0.05] },
  guardW: { r: [0.06, -0.06, -0.48, 0, 0, 1.5] }, grab: { r: [0.16, -0.26, -0.45, -0.3, 0, -0.1] }, down: { r: [0.3, -0.85, -0.4, -0.4, 0, -0.3] },
};
function updateViewmodel(dt) {
  const vm = FP.vm, p = G.player; if (!vm) return;
  const on = isFP() && isUp(p) && p.state !== 'posting';
  vm.root.visible = isFPView();
  vm.root.position.copy(W3.camera.position); vm.root.quaternion.copy(W3.camera.quaternion);
  if (!isFPView()) return;
  if (cuteViewmodel(vm, p)) { vm.wKey = vm.sKey = '__'; }
  const wk = p.weapon ? p.weapon.key : null, sk = p.shield ? p.shield.key : null;
  const wkSk = wk ? wk + '|' + (p.isPlayer && !G.attract ? skinFor(wk) || '' : '') : wk;
  if (vm.wKey !== wkSk || vm.team !== p.club.key) { while (vm.wMount.children.length) vm.wMount.remove(vm.wMount.children[0]); if (wk) { const w = p.isPlayer && !G.attract ? buildMyWeapon(wk, p.club) : buildWeapon(wk, p.club); vm.wMount.add(w); } vm.wKey = wkSk; }
  if (vm.sKey !== sk || vm.team !== p.club.key) { while (vm.sMount.children.length) vm.sMount.remove(vm.sMount.children[0]); if (sk) { const s = buildShield(sk, p.club); s.rotation.y = Math.PI; vm.sMount.add(s); } vm.sKey = sk; vm.team = p.club.key; }
  const twoH = p.weapon && p.weapon.hands === 2;
  const a = p.action; let key = twoH ? 'idle2' : 'idle1', rate = 12;
  if (a && a.kind === 'swing') { if (a.phase === 'windup') { key = 'w' + a.arc; rate = 13; } else if (a.phase === 'strike') { key = 's' + a.arc; rate = 42; } else rate = 9; }
  else if (p.guard && !p.shield) { key = 'guardW'; rate = 18; }
  else if (a && ['grab', 'knee', 'throw', 'disarm'].includes(a.kind) || p.clinch) { key = 'grab'; rate = 18; }
  if (!on) { key = 'down'; rate = 6; }
  const t = VMP[key].r.slice();
  if (a && a.kind === 'swing' && a.phase === 'windup') { t[2] += 0.08 * a.charge; t[1] += 0.05 * a.charge; }
  if (twoH && key !== 'down') { t[0] -= 0.06; t[2] += 0.04; }
  const spd = vlen(p.vel), wkk = clamp(spd / 3.5, 0, 1.3);
  t[1] += Math.sin(p.walkPh * 2) * 0.012 * wkk; t[0] += Math.sin(p.walkPh) * 0.012 * wkk;
  // tired arms: the weapon sags, rises and falls with your breathing, and shakes when you're spent
  const fatv = p.fatigue || 0;
  if (key === 'guardW') { t[0] += { L: -0.18, R: 0.16 }[p.gdir] || 0; t[1] += p.gdir === 'H' ? 0.16 : 0; t[5] += { L: 0.5, R: -0.5 }[p.gdir] || 0; }
  if (key === 'idle1' || key === 'idle2' || key === 'guardW') { t[1] -= 0.09 * fatv + 0.03 * (1 - p.gas); t[3] -= 0.35 * fatv; t[1] += Math.sin(BREATH.ph) * 0.014 * BREATH.e; }
  if (fatv > 0.45) { const tr = (fatv - 0.45) * 0.008; t[0] += Math.sin(G.realTime * 31) * tr; t[1] += Math.sin(G.realTime * 27 + 1) * tr; }
  // left hand: shield or haft
  let L;
  if (twoH) L = null;
  const gsx = p.guard ? ({ L: -0.16, R: 0.14, H: 0 }[p.gdir] || 0) : 0, gsy = p.guard && p.gdir === 'H' ? 0.14 : 0;
  if (p.shield && p.shield.key === 'heater') L = p.guard ? [-0.1 + gsx, -0.16 + gsy, -0.4, 0, 0.02 + gsx * 1.5, 0] : a && a.kind === 'shove' && a.phase === 'recover' && a.t < 0.14 ? [-0.06, -0.2, -0.7, 0, 0, 0] : [-0.4, -0.42, -0.55, 0.1, 0.55, 0.05];
  else if (p.shield) L = p.guard ? [-0.06 + gsx, -0.1 + gsy, -0.42, 0, gsx * 1.5, 0] : a && a.kind === 'shove' && a.phase === 'recover' && a.t < 0.14 ? [-0.04, -0.16, -0.68, 0, 0, 0] : [-0.32, -0.32, -0.52, 0, 0.3, 0];
  else L = key === 'grab' ? [-0.16, -0.26, -0.45, -0.3, 0, 0.1] : [-0.3, -0.38, -0.5, 0, 0, 0];
  if (a && a.kind === 'tackle' && a.phase !== 'recover') { t[2] -= 0.1; t[1] -= 0.08; if (L) { L[2] -= 0.18; L[0] += 0.1; } }
  if (!on) { if (L) { L[1] = -0.9; } }
  const k = 1 - Math.exp(-rate * dt), kl = 1 - Math.exp(-16 * dt);
  const c = vm.cur; if (!c.r) { c.r = t.slice(); c.l = (L || t).slice(); }
  for (let i = 0; i < 6; i++) c.r[i] += (t[i] - c.r[i]) * k;
  vm.handR.position.set(c.r[0], c.r[1], c.r[2]); vm.handR.rotation.set(c.r[3], c.r[4], c.r[5]);
  if (twoH) { // left hand rides the haft below the right
    const v = new THREE.Vector3(0, -0.3, 0).applyEuler(vm.handR.rotation); vm.handL.position.copy(vm.handR.position).add(v); vm.handL.rotation.copy(vm.handR.rotation);
  } else {
    for (let i = 0; i < 6; i++) c.l[i] += (L[i] - c.l[i]) * kl;
    vm.handL.position.set(c.l[0], c.l[1], c.l[2]); vm.handL.rotation.set(c.l[3], c.l[4], c.l[5]);
  }
  vm.sMount.position.set(-0.05, 0, -0.02);
  // forearms run from off-screen elbows to the hands
  vm.root.updateMatrixWorld(true);
  const arm = (g, hand, sx) => { const s = new THREE.Vector3(sx * 0.32, -0.62, 0.05); const e = hand.position; const L = s.distanceTo(e); g.position.copy(s).add(e).multiplyScalar(0.5); g.updateMatrixWorld(); g.lookAt(vm.root.localToWorld(e.clone())); g.scale.set(1, 1, 1); g.children[0].scale.set(1, L, 1); g.userData.cuff.position.z = L / 2 - 0.07; g.userData.tape.position.z = L / 2 - 0.15; };
  arm(vm.armR, vm.handR, 1); arm(vm.armL, vm.handL, -1);
}

// ---- balance gauge (practice aid) ----
function updateBalanceGauge() {
  const el = $('#bal'), p = G.player; const on = isFP() && isUp(p) && G.settings.ring;
  el.hidden = !on; if (!on) return;
  const sF = Math.sin(FP.yaw), cF = Math.cos(FP.yaw);
  const lf = p.lean.x * sF + p.lean.z * cF, lx = p.lean.x * cF - p.lean.z * sF;
  const k = 22 / FALL_L; const dot = $('#baldot');
  dot.style.transform = `translate(${clamp(-lx * k, -22, 22)}px,${clamp(-lf * k, -22, 22)}px)`;
  dot.style.background = vlen(p.lean) > 0.26 ? 'var(--marshal)' : 'var(--chalk)';
  el.style.setProperty('--gas', Math.round(p.gas * 100) + '%');
}

// ---- arrows at the screen edge for fighters you can't see ----
const EDGES = [];
function updateEdges() {
  const box = $('#edges'); const p = G.player;
  if (!EDGES.length) for (let i = 0; i < 6; i++) { const e = h('i', { class: 'edge' }); e.hidden = true; box.append(e); EDGES.push(e); }
  let n = 0;
  if (isCtl() && isUp(p) && !CAM.cine) {
    const cam = W3.camera; const hfov = 2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) * cam.aspect);
    const list = G.fighters.filter(o => o !== p && isUp(o) && dist2(o.pos, p.pos) < 6.5).sort((a, b) => dist2(a.pos, p.pos) - dist2(b.pos, p.pos));
    for (const o of list) {
      if (n >= EDGES.length) break;
      const rel = angDiff(FP.yaw, angTo(p.pos, o.pos)); if (Math.abs(rel) < hfov * 0.45) continue;
      const e = EDGES[n++]; const d = dist2(o.pos, p.pos);
      const threat = o.team !== p.team && o.action && o.action.phase === 'windup' && d < reachOf(o) + 0.5;
      e.className = 'edge ' + (rel > 0 ? 'l' : 'r') + (threat && G.settings.tele !== 'off' ? ' threat' : '');
      e.style.setProperty('--c', threat ? 'var(--marshal)' : o.team === p.team ? 'rgba(255,61,139,.75)' : 'var(--rival)');
      const behind = Math.abs(rel) > Math.PI * 0.6;
      e.style.top = `calc(${behind ? 72 : 46}% - 12px)`; e.style.opacity = String(clamp(1.3 - d / 6.5, 0.35, 1));
      e.hidden = false;
    }
  }
  for (let i = n; i < EDGES.length; i++) EDGES[i].hidden = true;
}
