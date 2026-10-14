// ---------- weather: rain (slick footing, a hiss on the PA) and snow; plus armour that scuffs, dulls and muddies ----------
const WX = { kind: 'clear', obj: null, n: 0, pos: null, vel: null, noise: null };
function setWeather(kind) {
  kind = kind === 'random' ? pick(['clear', 'clear', 'rain', 'snow']) : (kind || 'clear');
  if (W3.venue === 'arena') kind = 'clear'; // the hockey arena has a roof
  if (WX.obj) { W3.scene.remove(WX.obj); WX.obj.geometry.dispose(); WX.obj = null; }
  WX.kind = kind; W3.weather = kind;
  if (WX.noise) { try { WX.noise.g.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.5); const s = WX.noise.s; setTimeout(() => { try { s.stop(); } catch (e) { } }, 1500); } catch (e) { } WX.noise = null; }
  if (kind === 'clear') { applyVenueLight(); return; }
  const N = WX.n = IS_TOUCH ? 900 : 1800, rain = kind === 'rain';
  const g = new THREE.BufferGeometry(), p = new Float32Array(N * (rain ? 6 : 3)); WX.pos = p; WX.vel = new Float32Array(N);
  for (let i = 0; i < N; i++) { const x = rand(-22, 22), y = rand(0, 16), z = rand(-26, 26); WX.vel[i] = rain ? rand(12, 16) : rand(0.6, 1.3); if (rain) p.set([x, y, z, x + 0.03, y + 0.38, z], i * 6); else p.set([x, y, z], i * 3); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  WX.obj = rain ? new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#b8cde0', transparent: true, opacity: 0.6, depthWrite: false }))
    : new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.09, transparent: true, opacity: 0.9, depthWrite: false }));
  WX.obj.frustumCulled = false; W3.scene.add(WX.obj); applyVenueLight();
  if (rain && AU.ctx && AU.noiseBuf) { const s = AU.ctx.createBufferSource(); s.buffer = AU.noiseBuf; s.loop = true; const f = AU.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.4; const gg = AU.ctx.createGain(); gg.gain.value = 0; gg.gain.setTargetAtTime(0.07, AU.ctx.currentTime, 1); s.connect(f); f.connect(gg); gg.connect(AU.master); s.start(); WX.noise = { s, g: gg }; }
}
// greyer sky and softer sun in rain, colder light in snow
function applyVenueLight() {
  // Outdoor weather must not restore the surface fog distance underground.
  // In particular, near=70 with the mine's far=65 hides the whole chamber.
  if (typeof TOWN !== 'undefined' && TOWN.on && TOWN.mineOn) {
    W3.sun.intensity = 0.12; W3.hemi.intensity = 0.35;
    if (W3.scene.fog) { W3.scene.fog.near = 9; W3.scene.fog.far = 65; }
    if (WX.obj) WX.obj.visible = false;
    return;
  }
  if (WX.obj) WX.obj.visible = true;
  if (!W3.sun) return; const base = W3.sunBase || (W3.sunBase = { i: W3.sun.intensity, v: W3.venue });
  if (base.v !== W3.venue) { base.i = W3.sun.intensity; base.v = W3.venue; }
  W3.sun.intensity = base.i * (WX.kind === 'rain' ? 0.55 : WX.kind === 'snow' ? 0.8 : 1);
  const fg = W3.scene.fog; if (fg) { if (fg.userData === undefined || fg.userData.v !== W3.venue || fg.userData.fog !== fg) { W3.fogBase = { v: W3.venue, near: fg.near, fog: fg }; fg.userData = W3.fogBase; } fg.near = WX.kind !== 'clear' && W3.venue !== 'arena' ? (WX.kind === 'rain' ? 25 : 30) : W3.fogBase.near; }
}
function updateWeather(dt) {
  if (!WX.obj || dt <= 0) return; const p = WX.pos, rain = WX.kind === 'rain', st = rain ? 6 : 3, t = G.realTime;
  for (let i = 0; i < WX.n; i++) {
    const o = i * st; let y = p[o + 1] - WX.vel[i] * dt;
    if (rain) { if (y < 0) { y = rand(12, 16); } p[o + 1] = y; p[o + 4] = y + 0.38; }
    else { p[o] += Math.sin(t * 0.7 + i) * dt * 0.3; if (y < 0) y = rand(12, 16); p[o + 1] = y; }
  }
  WX.obj.geometry.attributes.position.needsUpdate = true;
  if (W3.camera) WX.obj.position.set(Math.round(W3.camera.position.x / 8) * 8 * 0, 0, 0);
}
function weatherStab() { return (WX.kind === 'rain' ? 0.9 : WX.kind === 'snow' ? 0.94 : 1) * (W3.venue === 'rink' ? 0.9 : 1); } // ice is slick

// ---- battle wear: each fighter's steel dulls and darkens as their kit takes damage, and picks up mud on the field ----
const WEAR_COL = { dull: new THREE.Color('#858c8f'), snow: new THREE.Color('#dfe6ea'), mud: new THREE.Color('#6d5c45') };
function wearUpdate(f, dt) {
  const J = f.model; if (!J || !J.steelMat) return;
  f.wearT = (f.wearT || 0) - dt; if (f.wearT > 0) return; f.wearT = 0.5;
  const k = f.kit, avg = (k.helmet.cond + k.armL.cond + k.armR.cond + k.legs.cond) / 4, dmg = clamp(1 - avg, 0, 1);
  const mud = clamp(f.mud || 0, 0, 1) * (W3.venue === 'field' ? 1 : 0.35);
  const c = J.steelMat.color; c.set('#c3cacd').lerp(WEAR_COL.dull, dmg * 0.8).lerp(WX.kind === 'snow' ? WEAR_COL.snow : WEAR_COL.mud, mud * 0.55);
  J.steelMat.roughness = 0.3 + dmg * 0.35 + mud * 0.3 + (WX.kind === 'rain' ? -0.12 : 0); J.steelMat.metalness = 0.92 - mud * 0.4;
}
