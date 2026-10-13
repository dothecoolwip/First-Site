// ---------- input: touch, keyboard & mouse, controller ----------
const IN = {
  mode: IS_TOUCH ? 'touch' : 'kb',
  keys: {}, edges: new Set(),
  mouse: { x: 0, y: 0, has: false, down: false, sx: 0, sy: 0, guard: false },
  stick: { id: null, ox: 0, oy: 0, x: 0, y: 0, sprint: false },
  pad: { id: null, ox: 0, oy: 0, dx: 0, dy: 0 },
  held: { guard: false, brace: false },
  gp: { prev: [], rtDown: false, viewT: 0 },
  swingStart: false, swingRelease: null, yieldT: 0,
  ray: null, plane: null,
  lock: null, lockHold: 0, snapT: 0, mouseIdle: 9
};

function setMode(m) {
  if (IN.mode === m) return; IN.mode = m; document.body.dataset.input = m; refreshTouchUI(); if (typeof onInputMode === 'function') onInputMode(m);
}
function edge(name) { IN.edges.add(name); }

function resetTransientInput() {
  IN.keys = {}; IN.edges.clear(); IN.mouse.down = false; IN.mouse.guard = false;
  IN.held.guard = IN.held.brace = false;
  IN.stick.id = null; IN.stick.x = IN.stick.y = 0; IN.stick.sprint = false;
  IN.pad.id = null; IN.pad.dx = IN.pad.dy = 0;
  IN.swingStart = false; IN.swingRelease = null;
  const stick = $('#stick'); if (stick) stick.style.display = 'none';
  const pad = $('#pad'); if (pad) pad.classList.remove('on');
  const line = $('#padline'); if (line) line.style.display = 'none';
  for (const id of ['#bGuard', '#bBrace']) { const b = $(id); if (b) b.classList.remove('on'); }
  if (typeof PIN !== 'undefined') { PIN.raw.x = PIN.raw.y = 0; PIN.sprint = false; PIN.brace = false; }
}

function initInput() {
  document.body.dataset.input = IN.mode;
  IN.ray = new THREE.Raycaster(); IN.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const cmdKeys = { Digit1: 'pair', Digit2: 'hold', Digit3: 'hunt', Digit4: 'peel', Digit5: 'free' };
  window.addEventListener('keydown', e => {
    if (e.isComposing || (e.target && (e.target.closest('input, textarea, select') || e.target.isContentEditable))) return;
    if (activeLayer() && (G.photo || activeLayer().id === 'steeltapeCloudOverlay')) return;
    setMode('kb'); AU.init();
    if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); return; }
    IN.keys[e.code] = true;
    if (e.code === 'KeyG') edge('salute');
    if (e.code === 'KeyE') edge('trip'); if (e.code === 'KeyQ') edge('shove'); if (e.code === 'KeyF') edge('grab');
    if (cmdKeys[e.code]) edge('cmd:' + cmdKeys[e.code]);
    if ((e.code === 'Escape' || e.code === 'KeyP') && (!G.screen || G.screen === 'pause')) edge('pause');
    if (e.code === 'KeyC') edge('tackle');
    if (e.code === 'KeyV') setView(G.settings.view === 'tp' ? 'fp' : 'tp');
    if (e.code === 'Tab' && isCtl() && !activeLayer()) { e.preventDefault(); edge('retarget'); }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && G.phase === 'fight') e.preventDefault();
  });
  window.addEventListener('keyup', e => { IN.keys[e.code] = false; });
  window.addEventListener('blur', resetTransientInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetTransientInput(); });

  const cv = W3.renderer.domElement;
  // mouse: in first person it turns your head (pointer lock when the browser allows it); hold the button and move to draw the swing
  document.addEventListener('mousemove', e => {
    IN.mouse.x = e.clientX; IN.mouse.y = e.clientY; IN.mouse.has = true;
    if (!isCtl() || IN.mode !== 'kb' || G.paused) return;
    const mx = e.movementX || 0, my = e.movementY || 0; if (Math.abs(mx) + Math.abs(my) > 1) IN.mouseIdle = 0;
    if (IN.mouse.down) { IN.mouse.adx += mx; IN.mouse.ady += my; }
    if (IN.mouse.guard) { IN.mouse.gdx += mx; IN.mouse.gdy += my; }
    const k = (IN.mouse.down ? 0.3 : 1) * 0.0026 * (G.settings.sens || 1);
    FP.yaw -= mx * k; FP.pitch = clamp(FP.pitch - my * k * (G.settings.invert ? -1 : 1), -0.75, 0.55); FP.looking = 0.25;
  });
  cv.addEventListener('pointerdown', e => {
    AU.init();
    if (e.pointerType !== 'mouse') { setMode('touch'); return; }
    setMode('kb'); IN.mouse.x = e.clientX; IN.mouse.y = e.clientY; IN.mouse.has = true;
    if (isCtl() && document.pointerLockElement !== cv) { try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (er) { } }
    if (e.button === 0) { IN.mouse.down = true; IN.mouse.sx = e.clientX; IN.mouse.sy = e.clientY; IN.mouse.adx = IN.mouse.ady = 0; IN.swingStart = true; try { cv.setPointerCapture(e.pointerId); } catch (er) { } }
    if (e.button === 2) { IN.mouse.guard = true; IN.mouse.gdx = IN.mouse.gdy = 0; IN.mouse.gsx = e.clientX; IN.mouse.gsy = e.clientY; }
  });
  cv.addEventListener('pointerup', e => {
    if (e.pointerType !== 'mouse') return;
    if (e.button === 0 && IN.mouse.down) { IN.mouse.down = false; IN.swingRelease = isCtl() ? arcFromDrag(IN.mouse.adx, IN.mouse.ady, 22) : arcFromDrag(e.clientX - IN.mouse.sx, e.clientY - IN.mouse.sy, 14); }
    if (e.button === 2) IN.mouse.guard = false;
  });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.phase === 'fight' && !G.paused && isCtl() && IN.mode === 'kb') togglePause(true); });
  // touch: drag the right side of the screen to look around
  const lz = $('#lookzone'); let lookId = null, lx = 0, ly = 0, lt0 = 0, lmoved = 0;
  lz.addEventListener('pointerdown', e => { AU.init(); setMode('touch'); if (lookId !== null) return; lookId = e.pointerId; lx = e.clientX; ly = e.clientY; lt0 = performance.now(); lmoved = 0; try { lz.setPointerCapture(e.pointerId); } catch (er) { } });
  lz.addEventListener('pointermove', e => { if (e.pointerId !== lookId) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; lmoved += Math.abs(dx) + Math.abs(dy); if (lmoved < 8) return; const sn = G.settings.sens || 1; FP.yaw -= dx * 0.0062 * sn; FP.pitch = clamp(FP.pitch - dy * 0.005 * sn * (G.settings.invert ? -1 : 1), -0.75, 0.55); FP.looking = 0.35; });
  const lookEnd = e => { if (e.pointerId !== lookId) return; lookId = null; if (e.type === 'pointerup' && lmoved < 12 && performance.now() - lt0 < 320) edge('retarget'); };
  lz.addEventListener('pointerup', lookEnd); lz.addEventListener('pointercancel', lookEnd);
  $('#app').addEventListener('contextmenu', e => e.preventDefault());

  // floating move stick
  const zone = $('#stickzone'), stick = $('#stick'), knob = stick.querySelector('i');
  zone.addEventListener('pointerdown', e => {
    AU.init(); setMode('touch'); if (IN.stick.id !== null) return; IN.stick.id = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (er) { }
    IN.stick.ox = e.clientX; IN.stick.oy = e.clientY; stick.style.display = 'block'; stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; knob.style.transform = '';
    $('#stickhint').hidden = true;
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== IN.stick.id) return;
    let dx = e.clientX - IN.stick.ox, dy = e.clientY - IN.stick.oy; const raw = Math.hypot(dx, dy); const R = 52;
    if (raw > R) { dx *= R / raw; dy *= R / raw; }
    IN.stick.x = dx / R; IN.stick.y = dy / R; IN.stick.sprint = raw > 66 && -dy > Math.abs(dx) * 0.5;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  });
  const stickEnd = e => { if (e.pointerId !== IN.stick.id) return; IN.stick.id = null; IN.stick.x = IN.stick.y = 0; IN.stick.sprint = false; stick.style.display = 'none'; };
  zone.addEventListener('pointerup', stickEnd); zone.addEventListener('pointercancel', stickEnd);
  zone.addEventListener('lostpointercapture', stickEnd);

  // swing pad: hold to wind up, swipe to choose the arc, release to strike
  const pad = $('#pad'), line = $('#padline');
  pad.addEventListener('pointerdown', e => {
    AU.init(); setMode('touch'); if (IN.pad.id !== null) return; IN.pad.id = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (er) { }
    IN.pad.ox = e.clientX; IN.pad.oy = e.clientY; IN.pad.dx = IN.pad.dy = 0; IN.swingStart = true; pad.classList.add('on');
  });
  pad.addEventListener('pointermove', e => {
    if (e.pointerId !== IN.pad.id) return; IN.pad.dx = e.clientX - IN.pad.ox; IN.pad.dy = e.clientY - IN.pad.oy;
    const l = Math.hypot(IN.pad.dx, IN.pad.dy); if (l > 10) { line.style.display = 'block'; line.style.width = Math.min(l, 90) + 'px'; line.style.transform = `rotate(${Math.atan2(IN.pad.dy, IN.pad.dx)}rad)`; }
  });
  const padEnd = e => { if (e.pointerId !== IN.pad.id) return; IN.pad.id = null; pad.classList.remove('on'); line.style.display = 'none'; if (e.type === 'pointerup') IN.swingRelease = arcFromDrag(IN.pad.dx, IN.pad.dy, 16);
    else { IN.swingStart = false; IN.swingRelease = null; const f = G.player; if (f && f.action && f.action.kind === 'swing' && f.action.held && f.action.phase === 'windup') f.action.cancel = true; if (NET.on && NET.role === 'guest') { NET.vin.cancel = (NET.vin.cancel || 0) + 1; NET.vin.sh = 0; } } };
  pad.addEventListener('pointerup', padEnd); pad.addEventListener('pointercancel', padEnd);

  const tap = (id, name) => { const b = $(id); b.addEventListener('pointerdown', e => { AU.init(); setMode('touch'); edge(name); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 150); e.preventDefault(); }); };
  tap('#bSalute', 'salute'); tap('#bTrip', 'trip'); tap('#bShove', 'shove'); tap('#bGrab', 'grab'); tap('#bTackle', 'tackle');
  const rb = $('#bRun'); rb.addEventListener('pointerdown', e => { AU.init(); setMode('touch'); IN.runToggle = !IN.runToggle; rb.classList.toggle('on', IN.runToggle); e.preventDefault(); });
  const hold = (id, key) => { const b = $(id); const on = e => { AU.init(); setMode('touch'); IN.held[key] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault(); }; const off = () => { IN.held[key] = false; b.classList.remove('on'); }; b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); };
  hold('#bGuard', 'guard'); hold('#bBrace', 'brace');
  { const gb = $('#bGuard'); gb.addEventListener('pointerdown', e => { IN.held.gsx = e.clientX; IN.held.gsy = e.clientY; IN.held.gdx = IN.held.gdy = 0; }); gb.addEventListener('pointermove', e => { if (IN.held.guard) { IN.held.gdx = e.clientX - IN.held.gsx; IN.held.gdy = e.clientY - IN.held.gsy; } }); }
  $$('#tcmd button').forEach(b => b.addEventListener('click', () => edge('cmd:' + (G.orders[0] === b.dataset.cmd ? 'free' : b.dataset.cmd))));
  window.addEventListener('gamepadconnected', () => { setMode('pad'); });
}

// which side you're guarding: a flick of the mouse, the right stick, or a drag on the guard button. Left and right are
// your own left and right; up is a high guard. No flick is a middle guard, which takes a bit off every blow but stops none cleanly.
function sideFromDrag(dx, dy, dead) { if (Math.hypot(dx, dy) < dead) return 'mid'; if (dy < -Math.abs(dx) * 0.7) return 'H'; return dx > 0 ? 'R' : 'L'; }
function guardDirInput() {
  if (PIN.gdirPad) return PIN.gdirPad;
  if (IN.mouse.guard) return isCtl() ? sideFromDrag(IN.mouse.gdx || 0, IN.mouse.gdy || 0, 18) : sideFromDrag(IN.mouse.x - IN.mouse.gsx, IN.mouse.y - IN.mouse.gsy, 12);
  if (IN.held.guard) return sideFromDrag(IN.held.gdx || 0, IN.held.gdy || 0, 12);
  return 'mid';
}
function arcFromDrag(dx, dy, dead) {
  if (Math.hypot(dx, dy) < dead) return 'auto';
  if (dy < -Math.abs(dx) * 0.7) return 'O';
  return dx > 0 ? 'L2R' : 'R2L';
}

// read devices once per frame into a plain state object
const PIN = { move: { x: 0, z: 0 }, raw: { x: 0, y: 0 }, sprint: false, guard: false, brace: false, aim: null, rx: 0, ry: 0 };
function readInput(dt) {
  let mx = 0, my = 0;
  const k = IN.keys;
  if (k.KeyW || k.ArrowUp) my += 1; if (k.KeyS || k.ArrowDown) my -= 1; if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1;
  if (IN.runToggle && IN.stick.id === null && !k.KeyW && !k.KeyA && !k.KeyS && !k.KeyD) { IN.runIdle = (IN.runIdle || 0) + dt; if (IN.runIdle > 0.6) { IN.runToggle = false; $('#bRun').classList.remove('on'); } } else IN.runIdle = 0;
  let sprint = !!(k.ShiftLeft || k.ShiftRight) || !!IN.runToggle, guard = IN.mouse.guard || IN.held.guard, brace = !!k.Space || IN.held.brace;
  if (IN.stick.id !== null) { mx += IN.stick.x; my -= IN.stick.y; sprint = sprint || IN.stick.sprint; }
  PIN.aim = null; PIN.rx = PIN.ry = 0;
  // controller (standard mapping)
  padsUpdate(); const gp = currentPad();
  if (gp) {
    const b = gp.buttons.map(x => x.pressed || x.value > 0.5), pv = IN.gp.prev; const pressed = i => b[i] && !pv[i];
    // radial dead zone with a gentle curve, so small corrections stay small
    const stick = (x, y, pow) => { const m = Math.hypot(x, y); if (m < 0.16) return [0, 0]; const k = Math.pow(Math.min(1, (m - 0.16) / 0.8), pow) / m; return [x * k, y * k]; };
    const [lx, ly] = stick(gp.axes[0] || 0, gp.axes[1] || 0, 1.15), [rx, ry] = stick(gp.axes[2] || 0, gp.axes[3] || 0, 1.35);
    if (lx || ly || rx || ry || b.some(Boolean)) { setMode('pad'); checkNintendo(); if (typeof eventPlayActivity === 'function') eventPlayActivity(); }
    if (PADS.calib) { IN.gp.prev = b; }
    else if (activeLayer()) { padMenu(gp, b, pressed, dt); IN.gp.prev = b; IN.gp.rtDown = false; }
    else {
    mx += lx; my -= ly; PIN.rx = rx; PIN.ry = ry;
    if (ly < -0.85 && Math.abs(lx) < 0.5) sprint = true; // push the stick all the way forward to run
    // RT swings, LT guards, RB/LB grab. A controller whose triggers never reach the browser swings on RB and guards on LB.
    const miss = gp.missing || [], noTrig = miss.includes(6) || miss.includes(7), noR3 = miss.includes(11), noL3 = miss.includes(10), noRS = miss.includes('rs');
    const rt = Math.max(gp.buttons[7] ? gp.buttons[7].value : 0, noTrig && gp.buttons[5] && gp.buttons[5].pressed ? 1 : 0);
    if (rt > 0.5 && !IN.gp.rtDown) { IN.gp.rtDown = true; IN.swingStart = true; }
    const sn = G.settings.sens || 1;
    const ltDown = !!(b[6] || (noTrig && b[4]));
    if (isCtl() && !IN.gp.rtDown && !ltDown && (rx || ry)) { if (Math.abs(ry) > 0.2) IN.pitchHold = 2.5; FP.yaw -= rx * 3.6 * sn * dt; FP.pitch = clamp(FP.pitch - ry * 1.9 * sn * (G.settings.invert ? -1 : 1) * dt, -0.75, 0.55); FP.looking = 0.2; }
    if (pressed(3)) edge('tackle');
    if (rt < 0.25 && IN.gp.rtDown) { IN.gp.rtDown = false; IN.swingRelease = rx > 0.45 ? 'R2L' : rx < -0.45 ? 'L2R' : ry < -0.5 ? 'O' : 'auto'; }
    if (ltDown) { guard = true; PIN.gdirPad = rx > 0.45 ? 'R' : rx < -0.45 ? 'L' : ry < -0.5 ? 'H' : PIN.gdirPad; } else PIN.gdirPad = null; if (b[0]) brace = true;
    if (pressed(1)) edge('trip'); if (pressed(2)) edge('shove');
    if (!noTrig && (pressed(4) || pressed(5))) edge(G.simTime < (G.saluteUntil || 0) ? 'salute' : 'grab');
    // controllers whose stick clicks or right stick never reach the browser get those jobs on the d-pad instead
    if (noTrig) { if (pressed(noR3 ? 15 : 11)) edge(G.simTime < (G.saluteUntil || 0) ? 'salute' : 'grab'); } // bumpers are busy: grab on R3, or d-pad right
    else if (pressed(11)) edge(G.simTime < (G.saluteUntil || 0) ? 'salute' : 'retarget'); // R3 switches target
    if (pressed(noL3 ? 14 : 10)) edge('retarget'); // L3 (or d-pad left) switches target too
    if (noRS) { if (b[12]) { FP.pitch = clamp(FP.pitch + 1.1 * dt, -0.75, 0.55); IN.pitchHold = 2.5; } if (b[13]) { FP.pitch = clamp(FP.pitch - 1.1 * dt, -0.75, 0.55); IN.pitchHold = 2.5; } } // d-pad up/down aims high or low
    else { if (pressed(12)) edge('cmd:pair'); if (pressed(13)) edge('cmd:hold'); }
    if (!noL3 && pressed(14)) edge('cmd:hunt'); if (!noR3 && pressed(15)) edge('cmd:peel');
    if (pressed(9)) edge('pause');
    // View button: tap to switch first / third person, hold to yield
    if (b[8]) IN.gp.viewT += dt; else { if (pv[8] && IN.gp.viewT < 0.35) setView(G.settings.view === 'tp' ? 'fp' : 'tp'); IN.gp.viewT = 0; }
    IN.gp.prev = b;
    }
  }
  if (isCtl() && IN.mode === 'kb' && !document.pointerLockElement) { if (k.ArrowLeft) { FP.yaw += 2.4 * dt; mx += 1; } if (k.ArrowRight) { FP.yaw -= 2.4 * dt; mx -= 1; } }
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  PIN.raw.x = mx; PIN.raw.y = my;
  IN.mouseIdle += dt;
  // one thumb: with nobody locked on, pushing the stick sideways also turns you, so you can run anywhere without the look pad
  if (isCtl() && IN.mode === 'touch' && IN.stick.id !== null && !IN.lock && FP.looking <= 0 && G.player && isUp(G.player)) FP.yaw -= mx * (my > -0.3 ? 2.5 : 1.2) * dt;
  if (isCtl()) { const fw = fwd(FP.yaw); PIN.move.x = fw.x * my - fw.z * mx; PIN.move.z = fw.z * my + fw.x * mx; }
  else { PIN.move.x = mx; PIN.move.z = -my; }
  FP.looking = Math.max(0, FP.looking - dt); PIN.sprint = sprint; PIN.guard = guard; PIN.brace = brace;
  PIN.gdir = guard ? guardDirInput() : null;
  // mouse aim on the floor
  if (IN.mode === 'kb' && IN.mouse.has && !isCtl()) {
    const ndc = new THREE.Vector2(IN.mouse.x / window.innerWidth * 2 - 1, -(IN.mouse.y / window.innerHeight) * 2 + 1);
    IN.ray.setFromCamera(ndc, W3.camera); const hit = new THREE.Vector3();
    if (IN.ray.ray.intersectPlane(IN.plane, hit)) PIN.aim = { x: hit.x, z: hit.z };
  }
  IN.yieldT = (k.KeyY || IN.gp.viewT > 0.35) ? IN.yieldT + dt : 0;
}

function updateSoftTarget(f) {
  if (!isUp(f)) { f.softTarget = null; return; }
  if (IN.lock && isUp(IN.lock) && dist2(IN.lock.pos, f.pos) < 5.5) { f.softTarget = IN.lock; return; }
  const ref = isCtl() ? FP.yaw : PIN.aim ? Math.atan2(PIN.aim.x - f.pos.x, PIN.aim.z - f.pos.z) : (vlen(PIN.move) > 0.3 ? Math.atan2(PIN.move.x, PIN.move.z) : f.facing);
  let best = null, bs = 1e9;
  for (const o of G.fighters) {
    if (o.team === f.team || !isUp(o)) continue;
    const d = dist2(o.pos, f.pos); if (d > 5.5) continue;
    const s = d + Math.abs(angDiff(ref, angTo(f.pos, o.pos))) * 1.3 + (o === f.softTarget ? -0.6 : 0);
    if (s < bs) { bs = s; best = o; }
  }
  f.softTarget = best;
}

// ---- target lock: your view follows one opponent, so one thumb moves and the other fights ----
function lockCandidates(f, maxD, maxAng) {
  const out = [];
  for (const o of G.fighters) {
    if (o.team === f.team || !isUp(o)) continue;
    const d = dist2(o.pos, f.pos); if (d > maxD) continue;
    const a = Math.abs(angDiff(FP.yaw, angTo(f.pos, o.pos)));
    if (a > maxAng && d > 2.2) continue; // anyone right on top of you counts, whatever the angle
    out.push({ o, d, a, s: d + a * 2.4 });
  }
  return out.sort((x, y) => x.s - y.s);
}
function updateLock(f, dt) {
  const on = G.settings.assist;
  if (IN.lock && (!isUp(IN.lock) || IN.lock.out || dist2(IN.lock.pos, f.pos) > 9.5)) IN.lock = null;
  if (!on) { IN.lock = null; return; }
  const manual = FP.looking > 0 || (IN.mode === 'kb' && IN.mouseIdle < 0.7);
  if (manual) IN.lockHold = IN.mode === 'kb' ? 0.2 : 0.8;
  else IN.lockHold = Math.max(0, IN.lockHold - dt);
  if (IN.lockHold > 0) {
    // while you look around, lock onto whoever you are looking at
    const c = lockCandidates(f, 8, 0.45)[0]; if (c && c.a < 0.45) IN.lock = c.o;
    else if (IN.lock && Math.abs(angDiff(FP.yaw, angTo(f.pos, IN.lock.pos))) > 1.3) IN.lock = null;
    return;
  }
  if (!IN.lock) { const c = lockCandidates(f, 7.5, 1.4)[0]; if (c) IN.lock = c.o; }
  if (!IN.lock) return;
  const want = angTo(f.pos, IN.lock.pos); const d = angDiff(FP.yaw, want);
  const rate = IN.snapT > 0 ? 14 : IN.mode === 'kb' ? 3.2 : 7.5; IN.snapT -= dt;
  if (IN.mode === 'kb' && Math.abs(d) > 1.2) return; // mouse players keep full control of big turns
  FP.yaw += clamp(d * Math.min(1, dt * 9), -rate * dt, rate * dt);
  IN.pitchHold = Math.max(0, (IN.pitchHold || 0) - dt); const dd = dist2(IN.lock.pos, f.pos); if (IN.pitchHold <= 0) FP.pitch = damp(FP.pitch, -0.04 - 0.22 / Math.max(1, dd), 3, dt);
}
function cycleLock(f) {
  const list = lockCandidates(f, 8.5, Math.PI).map(c => c.o);
  if (!list.length) { IN.lock = null; return; }
  const i = list.indexOf(IN.lock); IN.lock = list[(i + 1) % list.length];
  IN.lockHold = 0; IN.snapT = 0.35; FP.looking = 0; IN.mouseIdle = 9;
  AU.click(); ev('lock');
}

function playerControl(f, dt) {
  // consume edges
  const E = IN.edges;
  for (const e of [...E]) if (e.startsWith('cmd:')) { setOrder(e.slice(4)); E.delete(e); }
  if (f.state === 'grounded' || f.state === 'falling' || f.state === 'rising') {
    E.clear(); IN.swingStart = false; IN.swingRelease = null;
    if (f.state === 'grounded' && G.phase === 'fight' && vlen(PIN.move) > 0.5) {
      f.earlyRiseT += dt;
      if (f.earlyRiseT > 0.35 && !f.earlyWarned) { f.earlyWarned = true; setStatus('Stay down until "All rise". Getting up early is a yellow card (REG 6.2.1).', 'var(--marshal)', 3); }
      if (f.earlyRiseT > 2.4 && !f.earlyCarded) { f.earlyCarded = true; reportFoul(f, null, 'earlyRise'); }
    } else f.earlyRiseT = Math.max(0, f.earlyRiseT - dt);
    return;
  }
  f.move.x = PIN.move.x; f.move.z = PIN.move.z;
  if (G.phase !== 'fight') { f.move.x = f.move.z = 0; E.clear(); IN.swingStart = false; IN.swingRelease = null; return; }
  if (f.state !== 'standing') return;
  f.sprint = PIN.sprint; f.brace = PIN.brace && !PIN.guard; f.guard = PIN.guard; f.gdir = PIN.guard ? PIN.gdir || 'mid' : null;
  if (E.has('retarget')) { E.delete('retarget'); cycleLock(f); }
  if (E.has('salute')) { E.delete('salute'); if (G.simTime < (G.saluteUntil || 0) && !f.action) { G.saluteUntil = 0; f.saluteT = 1.3; AU.cheer(1.5); hype(0.3); W3.crowdBase.forEach(c => { if (Math.random() < 0.7) c.ex = 1; }); toast('The crowd loves it!', 'big', 'Hype up'); comm('takedown', { how: 'salute', who: 'our fighter' }, 1); ev('salute'); } }
  updateLock(f, dt);
  updateSoftTarget(f);
  // facing: your body follows your view (both cameras)
  if (isCtl()) {
    const off = angDiff(f.facing, FP.yaw); if (Math.abs(off) > 1.25) FP.yaw = f.facing + Math.sign(off) * 1.25;
    f.wantFace = FP.yaw;
  }
  else if (PIN.aim) f.wantFace = Math.atan2(PIN.aim.x - f.pos.x, PIN.aim.z - f.pos.z);
  else if (f.softTarget && (G.settings.assist || IN.mode === 'pad')) f.wantFace = angTo(f.pos, f.softTarget.pos);
  else if (vlen(f.move) > 0.2) f.wantFace = Math.atan2(f.move.x, f.move.z);
  if (f.clinch) { f.wantFace = angTo(f.pos, (f.clinch.a === f ? f.clinch.b : f.clinch.a).pos); if (isCtl()) FP.yaw += angDiff(FP.yaw, f.wantFace) * Math.min(1, dt * 6); }
  if (f.guard && f.action && f.action.kind === 'swing' && f.action.phase === 'windup') f.action.cancel = true;
  // yield by kneeling
  if (IN.yieldT > 1.0) { IN.yieldT = 0; playerYield(); return; }
  // strike
  if (IN.swingStart) {
    IN.swingStart = false;
    if (f.clinch) startAction(f, 'knee');
    else if (!f.weapon) disarmedAttack(f);
    else startAction(f, 'swing', { held: true, arc: 'R2L', target: f.softTarget });
  }
  if (IN.swingRelease) {
    let arc = IN.swingRelease; IN.swingRelease = null;
    const a = f.action;
    if (a && a.kind === 'swing' && a.held) {
      if (arc === 'auto') { f.swingSide *= -1; arc = f.swingSide > 0 ? 'R2L' : 'L2R'; }
      a.arc = arc; a.held = false; a.wind = swingTimes(f).wind + 0.0001; if (a.t < a.wind) { /* finish the minimum wind-up */ }
    }
  }
  // while winding up, the drag (or right stick) shows which side the weapon is cocked
  const ha = f.action;
  if (ha && ha.kind === 'swing' && ha.held) {
    let pv = null;
    if (IN.pad.id !== null) pv = arcFromDrag(IN.pad.dx, IN.pad.dy, 16);
    else if (IN.mouse.down) pv = isCtl() ? arcFromDrag(IN.mouse.adx, IN.mouse.ady, 22) : arcFromDrag(IN.mouse.x - IN.mouse.sx, IN.mouse.y - IN.mouse.sy, 14);
    else if (IN.gp.rtDown) pv = PIN.rx > 0.45 ? 'R2L' : PIN.rx < -0.45 ? 'L2R' : PIN.ry < -0.5 ? 'O' : 'auto';
    if (pv && pv !== 'auto') ha.arc = pv;
  }
  const act = (name, kind, clinchKind) => {
    if (!E.has(name)) return; E.delete(name);
    if (f.clinch) { startAction(f, clinchKind); return; }
    if (kind === 'shove' && !f.weapon) { disarmedAttack(f); return; }
    startAction(f, kind, { target: f.softTarget });
  };
  act('trip', 'trip', 'throw'); act('shove', 'shove', 'shove'); act('grab', 'grab', 'disarm');
  if (E.has('tackle')) { E.delete('tackle'); if (!f.weapon) disarmedAttack(f); else if (!f.clinch) startAction(f, 'tackle', { target: f.softTarget }); }
  E.delete('confirm');
}

function disarmedAttack(f) {
  const now = G.simTime;
  if (now - (f.noWeaponWarn || -9) > 2.5) { f.noWeaponWarn = now; setStatus('Disarmed. Attacking now would ground you (BR 1.3.1). Get to your weapon zone.', 'var(--marshal)', 3); return; }
  marshalCall('Grounded', `${label(f)} attacked without a weapon in hand`, 2);
  marshalGround(f, 'attacked without a weapon in hand', 'BR 1.3.1');
}
function playerYield() {
  const f = G.player; if (!f || f.state !== 'standing' || G.phase !== 'fight') return;
  breakClinch(f); f.action = null; f.state = 'kneeling'; f.kneelT = 0;
}
function setOrder(o) {
  if (!ORDERS[o]) return; G.orders[0] = o; AU.click();
  $('#cmd').textContent = ORDERS[o].name;
  $$('#tcmd button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cmd === o)));
  if (G.phase === 'fight') { feed(`You call: ${ORDERS[o].name}.`, '', 'var(--flag)'); const cp = perk(G.player, 'show.captain'); if (cp) for (const m of G.fighters) if (m.team === 0 && isUp(m)) { m.buffT = Math.max(m.buffT || 0, 8); m.buffStab = Math.max(m.buffStab || 1, 1 + 0.06 * cp); } }
}

