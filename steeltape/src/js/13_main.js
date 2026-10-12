// ---------- animation, camera, main loop, boot ----------
const P = {};
const WIND = {
  R2L: { 'torso.y': -0.55, 'shR.x': -2.0, 'shR.z': -0.7, 'elR.x': -1.5, 'wrR.x': 0, 'wrR.y': -1.1 },
  L2R: { 'torso.y': 0.55, 'shR.x': -1.8, 'shR.z': 0.7, 'elR.x': -1.7, 'wrR.x': 0, 'wrR.y': 1.3 },
  O: { 'torso.x': -0.12, 'shR.x': -2.9, 'shR.z': -0.15, 'elR.x': -1.3, 'wrR.x': 0, 'wrR.y': 0 },
};
const STRIKE = {
  R2L: { 'torso.y': 0.6, 'shR.x': -1.45, 'shR.z': 0.5, 'elR.x': -0.25, 'wrR.x': 0, 'wrR.y': 1.3 },
  L2R: { 'torso.y': -0.6, 'shR.x': -1.4, 'shR.z': -0.85, 'elR.x': -0.2, 'wrR.x': 0, 'wrR.y': -1.3 },
  O: { 'torso.x': 0.35, 'shR.x': -1.0, 'shR.z': -0.05, 'elR.x': -0.1, 'wrR.x': 1.3, 'wrR.y': 0 },
};

function animateFighter(f, dt, t) {
  const J = f.model; if (!J) return;
  J.root.visible = !f.out; if (f.out) return;
  const twoH = f.weapon && f.weapon.hands === 2;
  const speed = vlen(f.vel);
  const prevStep = Math.floor(f.walkPh / Math.PI);
  const fat = f.fatigue || 0;
  f.walkPh += dt * (speed * 3.3 * (1 - 0.2 * fat) + (f.stepRem > 0 ? 10 : 0));
  if (Math.floor(f.walkPh / Math.PI) !== prevStep && (speed > 0.9 || f.stepRem > 0) && isUp(f) && G.phase !== 'title') { const v = f.isPlayer && isCtl() ? (isFP() ? 0.55 : 0.42) : vol(f) * 0.28; if (v > 0.06 && (f.isPlayer || chance(0.5))) AU.step(v); }
  const wk = clamp(speed / 3, 0, 1) + (f.stepRem > 0 ? 0.7 : 0);
  const sF = Math.sin(f.facing), cF = Math.cos(f.facing);
  let rate = 14;
  // ---- base stance ----
  P.hipsY = 0.98 - (f.brace ? 0.13 : 0) - 0.05 * (1 - f.gas);
  P['legL.x'] = Math.sin(f.walkPh) * 0.55 * wk; P['legR.x'] = -Math.sin(f.walkPh) * 0.55 * wk;
  P['kneeL.x'] = 0.12 + Math.max(0, Math.sin(f.walkPh + 1.4)) * 0.75 * wk; P['kneeR.x'] = 0.12 + Math.max(0, -Math.sin(f.walkPh + 1.4)) * 0.75 * wk;
  P['legL.z'] = f.brace ? 0.21 : 0.06; P['legR.z'] = f.brace ? -0.21 : -0.06;
  if (f.brace) { P['legL.x'] -= 0.28; P['legR.x'] += 0.32; P['kneeL.x'] += 0.38; P['kneeR.x'] += 0.38; }
  P['torso.x'] = 0.06 + 0.2 * (1 - f.gas) + 0.24 * fat + (f.brace ? 0.12 : 0) + Math.sin(t * (2 + 3 * fat) + f.id) * 0.05 * fat; P['torso.y'] = 0; P['torso.z'] = 0; // tired fighters hunch and heave
  P['head.x'] = -0.05 + 0.18 * fat; P['head.z'] = Math.sin(t * 9) * 0.22 * f.bell;
  if (twoH) Object.assign(P, { 'shR.x': -0.5, 'shR.y': 0, 'shR.z': -0.05, 'elR.x': -0.5, 'wrR.x': 0, 'wrR.y': 0.4, 'shL.x': -0.95, 'shL.y': 0, 'shL.z': -0.55, 'elL.x': -0.7, 'wrL.x': 0 });
  else Object.assign(P, { 'shR.x': -0.55, 'shR.y': 0, 'shR.z': -0.2, 'elR.x': -1.05, 'wrR.x': 0, 'wrR.y': 0, 'shL.x': -0.45, 'shL.y': 0, 'shL.z': 0.18, 'elL.x': -1.2, 'wrL.x': 0 });
  if (!f.weapon) Object.assign(P, { 'shR.x': -0.75, 'shR.z': -0.25, 'elR.x': -0.9 });
  if (fat > 0.2 && !f.guard) { P['shR.x'] += 0.35 * fat; P['shL.x'] += 0.35 * fat; P['elR.x'] += 0.3 * fat; P['elL.x'] += 0.3 * fat; } // the weapon hangs lower
  const heater = f.shield && f.shield.key === 'heater';
  if (f.shield) Object.assign(P, heater ? { 'shp.x': 0.33, 'shp.y': 0.1, 'shp.z': 0.24, 'shp.rx': 0, 'shp.ry': 0.55 } : { 'shp.x': 0.3, 'shp.y': 0.02, 'shp.z': 0.34, 'shp.rx': 0, 'shp.ry': 0.2 });
  else Object.assign(P, { 'shp.x': 0.3, 'shp.y': 0, 'shp.z': 0.2, 'shp.rx': 0, 'shp.ry': 0 });
  if (f.guard) {
    if (f.shield) { Object.assign(P, heater ? { 'shp.x': 0.08, 'shp.y': 0.25, 'shp.z': 0.4, 'shp.rx': -0.1, 'shp.ry': 0.04 } : { 'shp.x': 0.06, 'shp.y': 0.3, 'shp.z': 0.5, 'shp.rx': 0, 'shp.ry': 0 }); Object.assign(P, { 'shL.x': -1.15, 'shL.z': -0.25, 'elL.x': -1.15 }); }
    else Object.assign(P, { 'shR.x': -1.55, 'shR.z': -0.15, 'elR.x': -0.55, 'wrR.y': 1.45, 'shL.x': -1.45, 'shL.z': -0.6, 'elL.x': -0.55 });
    rate = 18;
  }
  // ---- actions ----
  const a = f.action;
  if (a && a.kind === 'swing') {
    if (a.phase === 'windup') { const w = WIND[a.arc] || WIND.R2L; Object.assign(P, w); P['torso.y'] = (w['torso.y'] || 0) * (1 + 0.45 * a.charge); rate = 11; }
    else if (a.phase === 'strike') { Object.assign(P, STRIKE[a.arc] || STRIKE.R2L); rate = 34; }
    else rate = 8;
    if (twoH && a.phase !== 'recover') { P['shL.x'] = P['shR.x'] * 0.92; P['shL.z'] = P['shR.z'] + 0.5; P['elL.x'] = P['elR.x']; }
  } else if (a && a.kind === 'shove') {
    if (a.phase === 'windup') { P['shp.z'] = 0.12; P['torso.x'] = -0.05; }
    else if (a.t < 0.12) { P['shp.z'] = 0.66; P['shp.ry'] = 0.05; P['shp.x'] = 0.1; P['shp.y'] = 0.2; P['torso.x'] = 0.3; P['shL.x'] = -1.4; P['elL.x'] = -0.4; if (!f.shield) Object.assign(P, { 'shR.x': -1.3, 'elR.x': -0.5, 'wrR.y': 1.5, 'shL.x': -1.3, 'elL.x': -0.5 }); rate = 30; }
  } else if (a && a.kind === 'trip') {
    if (a.phase === 'windup') { P['legR.x'] = -0.65; P['kneeR.x'] = 0.2; P['torso.y'] = 0.25; rate = 22; }
    else if (a.t < 0.18) { P['legR.x'] = 0.75; P['kneeR.x'] = 0.55; P['torso.y'] = 0.45; P['torso.x'] = 0.25; rate = 26; }
  } else if (a && a.kind === 'tackle') {
    Object.assign(P, { 'torso.x': 0.5, 'shp.z': 0.5, 'shp.y': 0.2, 'shp.x': 0.12, 'shp.ry': 0.05, 'shL.x': -1.2, 'elL.x': -0.8, 'legL.x': -0.7, 'legR.x': 0.6 }); rate = 24;
  } else if (a) { // grab, knee, throw, disarm
    Object.assign(P, { 'shR.x': -1.35, 'shR.z': 0.3, 'elR.x': -0.6, 'shL.x': -1.35, 'shL.z': -0.3, 'elL.x': -0.6, 'torso.x': 0.3 }); rate = 22;
    if (a.kind === 'knee' && a.phase === 'recover' && a.t < 0.12) { P['legR.x'] = -1.1; P['kneeR.x'] = 1.2; }
    if (a.kind === 'throw' && a.phase === 'recover' && a.t < 0.2) { P['torso.y'] = 0.9; P['legR.x'] = 0.8; }
  }
  if (f.clinch) { Object.assign(P, { 'shR.x': -1.3, 'shR.z': 0.35, 'elR.x': -0.75, 'shL.x': -1.3, 'shL.z': -0.35, 'elL.x': -0.75, 'torso.x': 0.42, 'shp.x': 0.42, 'shp.z': 0.0, 'shp.ry': 1.3 }); P.hipsY -= 0.05; }
  if (f.saluteT > 0) { f.saluteT -= dt; Object.assign(P, { 'shR.x': -2.95, 'shR.z': -0.15, 'elR.x': -0.15, 'wrR.x': 0.3, 'torso.x': -0.12, 'head.x': -0.25 }); rate = 16; } // weapon raised to the crowd
  if (f.plantFx > 0) { f.plantFx -= dt; Object.assign(P, { 'shR.x': -0.6, 'elR.x': -0.2, 'wrR.x': 1.5, 'shL.x': -0.7, 'elL.x': -0.3 }); }
  // stagger: the stepping leg reaches out
  if (f.stepRem > 0) {
    const sf = f.stepDir.x * sF + f.stepDir.z * cF; const leg = f.stepFlip > 0 ? 'legL' : 'legR';
    P[leg + '.x'] = -0.75 * sf; P[(f.stepFlip > 0 ? 'kneeL' : 'kneeR') + '.x'] = 0.3; rate = Math.max(rate, 20);
  }
  // ---- whole-body state ----
  let rootX = f.pos.x, rootZ = f.pos.z, tx = 0, tz = 0, tagY = 2.25;
  const lf = f.lean.x * sF + f.lean.z * cF, lx = f.lean.x * cF - f.lean.z * sF;
  if (f.state === 'standing' || f.state === 'posting') { tx = Math.atan(lf); tz = -Math.atan(lx); }
  if (f.state === 'posting') Object.assign(P, { hipsY: 0.78, 'torso.x': 0.55, 'shL.x': -0.3, 'shL.z': 0.75, 'elL.x': -0.2 });
  if (f.state === 'falling' || f.state === 'grounded') {
    if (f.state === 'falling') f.gt = 0; else f.gt = (f.gt || 0) + dt;
    const dfw = f.fallDir.x * sF + f.fallDir.z * cF, dxs = f.fallDir.x * cF - f.fallDir.z * sF;
    if (f.groundStyle === 'fall') {
      const k = f.state === 'falling' ? ease(f.fallT / 0.55) : 1;
      const sit = f.state === 'grounded' ? ease((f.gt - 0.8) / 0.7) : 0;
      const ang = lerp(f.tilt0 || 0.4, 1.42, k) * (1 - sit);
      tx = ang * dfw; tz = -ang * dxs;
      Object.assign(P, { 'shR.x': -2.4, 'shR.z': -0.5, 'elR.x': -0.4, 'shL.x': -2.2, 'shL.z': 0.5, 'elL.x': -0.4 });
      if (sit > 0) { rootX = lerp(f.pos.x, f.groundPos.x, sit); rootZ = lerp(f.pos.z, f.groundPos.z, sit); sitPose(); rate = 6; } else rate = 16;
      tagY = 1.35;
    } else if (f.groundStyle === 'kneel') { kneelPose(); rate = 6; tagY = 1.7; }
    else { sitPose(); rate = 5; tagY = 1.35; }
  }
  if (f.state === 'kneeling') { kneelPose(); rate = 5; }
  if (f.state === 'rising') { rootX = f.groundPos.x; rootZ = f.groundPos.z; rate = 4; f.gt = 0; }
  function sitPose() { Object.assign(P, { hipsY: 0.24, 'legL.x': -1.45, 'legR.x': -1.4, 'kneeL.x': 0.25, 'kneeR.x': 0.35, 'legL.z': 0.12, 'legR.z': -0.12, 'torso.x': -0.12, 'torso.y': 0, 'shR.x': -0.35, 'shR.z': -0.3, 'elR.x': -0.7, 'shL.x': -0.35, 'shL.z': 0.3, 'elL.x': -0.7, 'wrR.x': 0, 'wrR.y': 0.6, 'shp.x': 0.42, 'shp.y': -0.25, 'shp.z': 0.1, 'shp.ry': 1.2 }); }
  function kneelPose() { Object.assign(P, { hipsY: 0.56, 'legL.x': -1.45, 'kneeL.x': 1.5, 'legR.x': 0.15, 'kneeR.x': 1.55, 'torso.x': 0.1, 'shR.x': -0.3, 'elR.x': -0.4, 'wrR.x': 1.2 }); }
  J.root.position.set(rootX, 0, rootZ); J.root.rotation.y = f.facing;
  const tr = f.state === 'standing' || f.state === 'posting' ? 1 : 1 - Math.exp(-14 * dt);
  J.tilt.rotation.x = tr === 1 ? tx : lerp(J.tilt.rotation.x, tx, tr); J.tilt.rotation.z = tr === 1 ? tz : lerp(J.tilt.rotation.z, tz, tr);
  J.tag.position.y = damp(J.tag.position.y, tagY * (J.scale || 1), 6, dt);
  J.tag.visible = !(f.isPlayer && isCtl()) && !(f.vin && VS.on && SPLIT.on); // your own number would sit in the middle of the third-person view
  applyPose(J, P, rate, dt);
  ragdollFall(f, J, dt);
  if (f.squashT > 0) { f.squashT -= dt; const u = clamp(f.squashT / 0.3, 0, 1), k = Math.sin((1 - u) * Math.PI * 2.5) * u * 0.2; J.tilt.scale.set(J.scale * (1 + k), J.scale * (1 - k), J.scale * (1 + k)); }
  else if (J.tilt.scale.y !== J.scale) J.tilt.scale.setScalar(J.scale);
  if (f.isPlayer && isFPView()) J.root.visible = false;
  // breath steaming out of the helmet when the fighter is blown
  if (isUp(f) && dt > 0 && (fat > 0.3 || f.gas < 0.3)) { f.puffT = (f.puffT || rand(0, 1)) - dt; if (f.puffT <= 0) { f.puffT = rand(0.9, 1.6) * (1.25 - Math.max(fat, 1 - f.gas)); const fw = fwd(f.facing), hh = (f.body ? f.body.h : 1.8) * 0.9; if (!(f.isPlayer && isFPView())) breathPuff(f.pos.x + fw.x * 0.22, hh, f.pos.z + fw.z * 0.22, fat); } }
}

// falls with weight: limbs flail on springs on the way down, slap and bounce on impact, the body rocks and settles
const RAG_KEYS = ['shL.x', 'shL.z', 'shR.x', 'shR.z', 'elL.x', 'elR.x', 'legL.x', 'legR.x', 'kneeL.x', 'kneeR.x', 'head.x', 'torso.z'];
function ragdollFall(f, J, dt) {
  const active = f.groundStyle === 'fall' && (f.state === 'falling' || (f.state === 'grounded' && (f.gt || 0) < 1.4));
  if (!active) { if (f.rag) J.tilt.rotation.y = 0; f.rag = null; return; }
  if (dt <= 0) return;
  let R = f.rag;
  if (!R) { R = f.rag = { s: {}, v: {}, imp: false, by: 0, byv: 0, roll: rand(-0.3, 0.3), heavy: clamp(f.mass / 115, 0.7, 1.4) }; RAG_KEYS.forEach(k => { R.s[k] = 0; R.v[k] = rand(-5, 5); }); }
  const landed = f.state === 'grounded' || (f.fallT || 0) > 0.5;
  if (landed && !R.imp) { R.imp = true; R.byv = (CUTE.on ? 2.6 : 1.5) / R.heavy * (G.mod && G.mod.bouncy ? 3 : 1); RAG_KEYS.forEach(k => R.v[k] += rand(-10, 10)); }
  let left = Math.min(dt, 0.1);
  while (left > 0) {
    const h = Math.min(left, 1 / 60); left -= h;
    for (const k of RAG_KEYS) { const a = -70 * R.s[k] - (landed ? 9 : 4) * R.v[k] + (landed ? 0 : rand(-45, 45)); R.v[k] += a * h; R.s[k] = clamp(R.s[k] + R.v[k] * h, -1.2, 1.2); }
    R.byv -= 14 * h; R.by += R.byv * h; if (R.by < 0) { R.by = 0; R.byv = R.byv < -0.4 ? -R.byv * (G.mod && G.mod.bouncy ? 0.7 : 0.35) : 0; }
  }
  const w = landed ? 0.45 : 1;
  for (const k of RAG_KEYS) { const [j, ax] = k.split('.'); if (J[j]) J[j].rotation[ax] += R.s[k] * w; }
  J.root.position.y += R.by * (G.mod && G.mod.bouncy ? 0.35 : 0.1); J.tilt.rotation.y = R.roll * (landed ? 1 : clamp(f.fallT / 0.5, 0, 1));
}

// ---------- graphics: sharp, fast, or auto (lowers the resolution when frames run long) ----------
const GFX = { pr: 0, maxPr: 1, autoPr: 0, ema: 16, t: 0 };
function applyGfx(force) {
  if (!W3.renderer) return;
  GFX.maxPr = Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.5 : 1.75);
  const mode = G.settings.gfx || 'auto';
  if (!GFX.autoPr) GFX.autoPr = Math.min(GFX.maxPr, IS_TOUCH ? 1.3 : 1.75);
  const target = mode === 'low' ? Math.min(GFX.maxPr, IS_TOUCH ? 0.75 : 1) : mode === 'high' ? GFX.maxPr : GFX.autoPr;
  if (force || Math.abs(target - GFX.pr) > 0.01) { GFX.pr = target; W3.renderer.setPixelRatio(target); W3.renderer.setSize(window.innerWidth, window.innerHeight); }
  if (W3.crowd) { const n = mode === 'low' ? Math.floor(W3.crowdBase.length * 0.4) : W3.crowdBase.length; W3.crowd.bodies.count = n; W3.crowd.heads.count = n; }
}
function autoGfx(dt) {
  if ((G.settings.gfx || 'auto') !== 'auto' || G.paused || G.fast) return;
  GFX.ema += (dt * 1000 - GFX.ema) * 0.05; GFX.t += dt; if (GFX.t < 2) return; GFX.t = 0;
  if (GFX.ema > 27 && GFX.autoPr > 0.6) { GFX.autoPr = Math.max(0.6, GFX.autoPr - 0.15); applyGfx(); }
  else if (GFX.ema < 14 && GFX.autoPr < GFX.maxPr) { GFX.autoPr = Math.min(GFX.maxPr, GFX.autoPr + 0.1); applyGfx(); }
}

// ---------- camera ----------
const CAM = { pos: new THREE.Vector3(0, 16, 26), look: new THREE.Vector3(0, 0, 0), orbit: 0.5, from: new THREE.Vector3(), blend: 1, tpInit: false, tpPos: new THREE.Vector3(), tpLook: new THREE.Vector3() };
// ---- takedown cam: a short slow-motion orbit round the fighter going down ----
function startCine(f, dur) {
  if (!G.settings.cine || G.attract || G.autopilot || !isCtl() || !f) return;
  if (CAM.cine) { CAM.cine.dur = Math.max(CAM.cine.dur, CAM.cine.t + dur * 0.8); CAM.cine.f = f; G.slowmo = Math.max(G.slowmo, dur * 0.7); return; }
  const p = G.player, fp = f.pos;
  const a0 = p && p !== f ? Math.atan2(p.pos.x - fp.x, p.pos.z - fp.z) + Math.PI * 0.55 : f.facing + Math.PI * 0.7;
  CAM.cine = { t: 0, dur, f, a0, from: W3.camera.position.clone(), look: new THREE.Vector3(fp.x, 1.2, fp.z) };
  G.slowmo = Math.max(G.slowmo, dur * 0.8);
  $('#app').classList.add('cine');
}
function updateCineCam(dt) {
  const c = CAM.cine, cam = W3.camera; c.t += dt;
  if (Math.abs(cam.fov - 52) > 0.1 || cam.near !== 0.1) { cam.fov = 52; cam.near = 0.1; cam.updateProjectionMatrix(); }
  const f = c.f, fp = isDown(f) ? f.groundPos : f.pos, k = c.t / c.dur;
  const a = c.a0 + k * 0.85, r = 3.6 + k * 0.6;
  const tp = new THREE.Vector3(clamp(fp.x + Math.sin(a) * r, -LIST.W / 2 - 2.4, LIST.W / 2 + 2.4), 1.35 + 0.5 * k, clamp(fp.z + Math.cos(a) * r, -LIST.L / 2 - 2.4, LIST.L / 2 + 2.4));
  c.look.lerp(new THREE.Vector3(fp.x, 0.7, fp.z), 1 - Math.exp(-6 * dt));
  cam.position.copy(c.from).lerp(tp, ease(Math.min(1, c.t / 0.3)));
  cam.lookAt(c.look);
  if (c.t >= c.dur || !isCtl()) {
    CAM.cine = null; $('#app').classList.remove('cine');
    CAM.from.copy(cam.position); CAM.blend = 0; CAM.tpInit = false; if (isFP()) FP.drop = 0.8;
  }
}
function updateCamera(dt) {
  if (G.photo) { updatePhotoCam(dt); return; }
  if (TOWN.on) { updateTownCamera(dt); return; }
  if (CAM.cine) { updateCineCam(dt); return; }
  if (isCtl() && G.autopilot && G.player) FP.yaw = G.player.facing;
  if (isFP()) { updateFPCamera(dt); return; }
  if (isTP()) { updateTPCamera(dt); return; }
  CAM.tpInit = false;
  const cam = W3.camera; const aspect = window.innerWidth / window.innerHeight;
  if (cam.near !== 0.4) { cam.near = 0.4; cam.updateProjectionMatrix(); }
  const wantFov = aspect < 0.8 ? 58 : aspect < 1.2 ? 50 : 42; if (Math.abs(cam.fov - wantFov) > 0.1) { cam.fov = wantFov; cam.updateProjectionMatrix(); }
  let tp, tl;
  if (G.attract || G.phase === 'tactics' || G.phase === 'between' || G.phase === 'over' || G.screen === 'title') {
    CAM.orbit += dt * 0.045;
    const r = aspect < 1 ? 30 : 25;
    tp = new THREE.Vector3(Math.sin(CAM.orbit) * r * 0.75, 11.5, Math.cos(CAM.orbit) * r);
    const ups = G.fighters.filter(isUp); let cx = 0, cz = 0; ups.forEach(f => { cx += f.pos.x; cz += f.pos.z; }); if (ups.length) { cx /= ups.length; cz /= ups.length; }
    tl = new THREE.Vector3(cx * 0.5 + (G.screen === 'title' && aspect > 1.1 ? -3.5 : 0), 0.5, cz * 0.5);
  } else {
    const p = G.player; const ups = G.fighters.filter(isUp);
    let cx = 0, cz = 0; ups.forEach(f => { cx += f.pos.x; cz += f.pos.z; }); if (ups.length) { cx /= ups.length; cz /= ups.length; }
    let fx = cx, fz = cz;
    if (p && !p.out && isUp(p)) { fx = lerp(p.pos.x, cx, 0.28); fz = lerp(p.pos.z, cz, 0.28); }
    else if (p && !p.out) { fx = lerp(p.groundPos.x, cx, 0.6); fz = lerp(p.groundPos.z, cz, 0.6); }
    const d = (aspect < 0.8 ? 17 : aspect < 1.3 ? 14.5 : 12.5) * (window.innerHeight < 500 && aspect > 1.3 ? 0.9 : 1);
    tp = new THREE.Vector3(fx * 0.82, d * 1.02, fz + d * 0.8);
    tl = new THREE.Vector3(fx * 0.9, 0.6, fz - 1.0);
  }
  const k = 1 - Math.exp(-(G.attract || G.screen === 'title' ? 1.5 : 3.2) * dt);
  CAM.pos.lerp(tp, k); CAM.look.lerp(tl, k);
  cam.position.copy(CAM.pos);
  if (G.shake > 0.01 && shakeAmt() > 0) { const k = shakeAmt(); cam.position.x += rand(-1, 1) * G.shake * 0.25 * k; cam.position.y += rand(-1, 1) * G.shake * 0.2 * k; } applyFeel(cam, dt);
  G.shake = Math.max(0, G.shake - dt * 2.2);
  cam.lookAt(CAM.look);
}

// ---------- simulation ----------
function simStep(hdt) {
  G.simTime += hdt;
  runTimers();
  if (G.phase === 'fight' && G.match && !G.match.training) { G.match.clock -= hdt; if (G.match.clock <= 0) { G.match.clock = 0; endRound('time'); } }
  for (const f of G.fighters) { if (f.out) continue; if (f.vin) vinControl(f, f.vin, hdt); else if (f.isPlayer && !G.autopilot) playerControl(f, hdt); else aiControl(f, hdt); }
  for (const f of G.fighters) stepFighter(f, hdt);
  resolveCollisions(hdt);
  updateClinches(hdt);
  updateMarshals(hdt);
  if (G.needRoundCheck) { G.needRoundCheck = false; checkRoundEnd(); }
}

let lastT = 0, acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0.016; lastT = now;
  G.realTime += dt;
  try {
    readInput(dt);
    if (IN.edges.has('pause')) { IN.edges.delete('pause'); if (G.photo) closePhoto(); else if (TOWN.on) { if (GATHER.on) stopGather(false); else if (!G.screen) openTownMap(); } else togglePause(); }
    if (TOWN.on) updateTown(dt);
    if (G.phase === 'tactics' && G.screen === 'tactics') {
      G.tacClock -= dt; $('#tacClock').textContent = fmtClock(G.tacClock);
      if (G.tacClock <= 0 || IN.edges.has('confirm')) { IN.edges.delete('confirm'); beginFight(); }
    }
    if (G.screen === 'repair') updateRepair(dt);
    updateTraining(dt); updateKids(dt); autoGfx(dt);
    let simDt = dt * G.timeScale * (G.player && !G.attract && !G.autopilot ? (G.settings.speed || 1) : 1) * (G.mod && G.mod.turbo ? 1.3 : 1);
    if (G.hitstop > 0) { G.hitstop -= dt; simDt *= 0.1; }
    if (G.slowmo > 0) { G.slowmo -= dt; simDt *= 0.4; }
    const running = !G.paused && ['fight', 'prefight', 'stopping', 'between', 'over', 'tactics'].includes(G.phase) && !(G.phase === 'tactics');
    if (VS.on) readVersus();
    if (NET.on && NET.role === 'guest') { netTick(dt); simDt = 0; }
    else if (running && G.fast) { for (let i = 0; i < 90; i++) simStep(1 / 60); simDt = 1.5; }
    else if (running) {
      acc += simDt; const hstep = 1 / 60; let n = 0; const maxN = Math.ceil(8 * G.timeScale);
      while (acc >= hstep && n < maxN) { simStep(hstep); acc -= hstep; n++; }
      if (n >= maxN) acc = 0;
    }
    if (TOWN.on && BOUT.on && !G.photo) boutTick(simDt);
    if (NET.on && NET.role === 'host') netTick(dt);
    const adt = G.paused ? 0 : (NET.on && NET.role === 'guest' ? dt : simDt);
    if (G.replay) updateReplay(dt); else { for (const f of G.fighters) { animateFighter(f, Math.max(adt, 0), G.realTime); wearUpdate(f, adt); } recordReplay(adt); }
    updateWeather(adt);
    updateFx(adt); updateFlip(adt); updateCrewAnim(adt);
    const excite = G.phase === 'fight' ? clamp(G.fighters.filter(f => f.action && f.action.phase === 'strike').length * 0.15, 0, 0.5) : 0;
    updateCrowd(G.realTime, excite); updateVenue(G.realTime); updateCuteDeco(G.realTime);
    updateCamera(dt);
    updateViewmodel(dt);
    updateVisorOverlay(dt);
    updateBalanceGauge();
    updateEdges();
    updateOverlays(G.realTime);
    updateHud(dt);
    updateWind(dt); updateComm(dt); updateCaptions(dt); updateHype(dt); updateStatsStrip(); updateTelegraphs(G.realTime);
    G.frameN = (G.frameN || 0) + 1;
    if (G.frameN % (G.fast ? 25 : (G.renderEvery || 1)) === 0) {
      const R = W3.renderer; R.autoClear = false; R.clear();
      if (splitActive()) { updateSplitCams(dt); renderSplit(R); } else R.render(W3.scene, W3.camera);
      if (isFPView() && FP.vm) { R.clearDepth(); R.render(FP.vm.scene, W3.camera); }
    }
  } catch (e) {
    G.stats.errors.push(String(e && e.stack || e)); if (G.stats.errors.length < 4) console.error(e);
  }
}

// ---------- boot ----------
async function boot(hot) {
  window.__hotData = hot || {};
  G.settings = Object.assign(G.settings, store.get('settings3', {}));
  VOICE.enabled = G.settings.voice; AU.muted = !!store.get('muted', false);
  if (AU.muted) $('#muteWave').style.display = 'none';
  try { await Promise.race([Promise.all([document.fonts.load('40px "Permanent Marker"'), document.fonts.load('900 40px "Big Shoulders Display"'), document.fonts.load('600 20px "Barlow Semi Condensed"')]), new Promise(r => setTimeout(r, 1800))]); } catch (e) { }
  buildTextures(); initThree(); buildViewmodel(); initInput(); initBench(); initMenus(); initTown(); buildOverlays(); applyProfile(); applyGfx(true); watchContext(); applyTextSize(); initPhoto(); loadUAL(); installForged(); SPLIT.on = store.get('split', true);
  try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ tourney: G.tourney })); } catch (e) { }
  window.addEventListener('error', e => G.stats.errors.push(String(e.message)));
  toTitle();
  requestAnimationFrame(frame);
  if (location.hash === '#autotest') setTimeout(autotest, 300);
  window.__ST = { G, AU, buildShield, buildWeapon, W3, startTourney, quickFight, toTitle, openRepair, kitCheck, setupMatch, toTactics, beginFight, endRound, matchEnd, CLUBS, WEAPONS, setView, toast, renderKitPicker, applyLoadout, IN, FP, showScreen, weaponIcon, startCine, startTraining, startLadder, openCareer, openModes, openLadder, CAREER, setLesson, TR, unlock, togglePause, afterRound, renderHow, selectPiece, selectTape, msg, renderSheet, setHud, endTraining, setMode, PAD, navMove, focusFirst, sparks, CUTE, THREE, BREATH, setCuteDeco, flipFx, PHOTO, UAL, raiseFlags, startVersus, startFFA, startBracket, startKid, KID, openSeason, startSeasonMatch, setVenue, VS, SPLIT, NET, buildOnlineMatch, hostLobby, joinLobby, ONL, vinControl, openRun, openDaily, openBracket, showBracket, bracketResult, ffaMatchEnd, ffaLeader, ffaWinner, endKid, openPhoto, closePhoto, startReplay, stopReplay, RP, store, startRunFight, newRun, runEnd, WX, setWeather, padVin, readVersus, applyLo, myLoadout, netDropped, netLeave, showIntro, installForged, dailyPlan, openKids, openVersus, openPicks, LESSONS, rivalClub, startGrudge, startDaily, seasonState, newSeason, refreshDaily, VENUES, COMM, hitMapHtml, resetFighterForRound, DIFF, PIN, PADS, NIN, padsUpdate, seatPads, LOBBY, MM, openOnlineHub, benchDown, benchMove, REP, squirePatch, coverage, openProfile, myProfile, BOS, updateTitlePurse, ACH, progressCheck, challenges, masteryOf, S2, rankOf, counterValue, renderCareer, progressMatch, saveCareer, shopState, shopUp, tapeLeft, shopMatchEnd, shopPrizeMult, shopXpMult, swingTimes, pieceWearMult, TABARDS, refillTape, renderShop, UPGRADES, freshKit, TAPE_STOCK, enterTown, leaveTown, TOWN, openVendor, closeVendor, openTownMap, shopFx, renderVendor, VENDORS, ITEMS, itemCost, spCost, skillRoom, sponsorIncome, BOOSTS, STALL_AT, HOMES, FURNISH, pfx, squadFx, boostKit, townCollide, townRefresh, townWalkTo, townTalk, townTeardown, lookState, WORLD, guildCheck, STATIONS, townDressMe, FOLK, updateFolk, navBlocked, buildFolk, BOUT, boutStart, boutStop, boutTick, drawTownMap, updateMiniMap, costumePerson, OUTFIT, buildSkinWeapon, skinIcon, wskinList, skinFor, buildMyWeapon, wskinFamOf, GATHER, startGather, gatherSwing, stopGather, tradeState, tradeLevel, tradeGain, give, have, craft, NODES, MATS, renderTrades, TRADE_SKILLS, ARENAS, DISTRICTS, TRAVEL, setWaypoint, clearWaypoint, realmPath, callHorse, mount, dismount, ANIMAL, districtAt, realmCull, REALM_TIERS, gateOpen, townJump, stableRows, horseAvailable, peopleCull, boutArenaFor, arenaLive, bagSlots, bagState, bagRoom, secretFound, lookOwned, SECRETS, stopSpectating, startTrial, TRIALS, tierCap, gy, tierOf, HILL, hillHouses, cliffAt, gateBlocked, arenaBlocked, localPath, NAV, rampAt, ROSTER, rosterClubs, rosterLive, rosterName, liveBoutPick, aiTier, AI_TIER, guardOutcome, fighterGlow, ONB, onbStage, onbSet, openCreator, tourStart, tourEnd, TOUR_STOPS, THRONE, throneHolder, throneFight, throneBow, openThrone, sideFromDrag, VOICE };
}

function autotest() {
  G.autopilot = true; G.autoflow = true; G.timeScale = 1; G.fast = true; G.settings.voice = false; VOICE.enabled = false;
  showScreen(null);
  let n = 0; const opps = ['wardens', 'rabble', 'wardens', 'rabble'];
  const go = () => { G.attract = false; G.tourney = null; setupMatch({ mode: 5, opp: opps[n % 4], stage: 'Test' }); toTactics(); };
  G.autoNext = () => {
    n++; const m = G.match; console.log('MATCH ' + n + ' ' + m.wins.join('-') + ' rounds=' + JSON.stringify(m.results.map(r => [r.a, r.b, Math.round(r.time)])) + ' cards=' + m.cards.length);
    if (n < (window.__autoN || 4)) go(); else { console.log('AUTOTEST DONE ' + JSON.stringify(G.stats)); window.__autoDone = true; }
  };
  go();
}

if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
