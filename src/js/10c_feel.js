// ---------- impact feel: tiered hitstop, shake that pushes the way the blow went, a field-of-view punch ----------
// (after Sakurai's hitstop notes and Vlambeer's "art of screenshake": cosmetic only, hit detection never moves)
const FEEL = { kick: new THREE.Vector3(), fov: 0, reduced: false };
try { FEEL.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
function shakeAmt() { return (G.settings.shake ? 1 : 0) * (G.settings.shakeAmt == null ? (FEEL.reduced ? 0.35 : 1) : G.settings.shakeAmt) * (CUTE.on ? 0.6 : 1); }
// kind: 'light' | 'heavy' | 'takedown' | 'block' | 'taken'; dir: world xz direction the blow travelled
function impactFeel(kind, dir, mag = 1) {
  if (G.attract || G.autopilot) return;
  const stop = { light: 0.045, heavy: 0.09, takedown: 0.16, block: 0.035, taken: 0.07 }[kind] || 0.04;
  const crowd = G.fighters.length > 12 ? 0.5 : 1; // big melees use less stop, or the fight stutters
  G.hitstop = Math.max(G.hitstop, stop * crowd * (CUTE.on ? 0.7 : 1));
  const s = shakeAmt(); if (s <= 0) return;
  const push = { light: 0.035, heavy: 0.075, takedown: 0.11, block: 0.025, taken: 0.09 }[kind] * mag * s;
  if (dir) { FEEL.kick.x += dir.x * push; FEEL.kick.z += dir.z * push; }
  FEEL.kick.y -= push * (kind === 'heavy' || kind === 'takedown' ? 0.8 : 0.3); // heavy blows drive the view down
  FEEL.fov += ({ heavy: 3, takedown: 4, taken: 2.5 }[kind] || 0) * s;
  G.shake = Math.max(G.shake, ({ light: 0.12, heavy: 0.22, takedown: 0.3, block: 0.1, taken: 0.32 }[kind] || 0.1) * mag);
}
// called by every camera mode after it has placed the camera
function applyFeel(cam, dt) {
  cam.position.add(FEEL.kick);
  FEEL.kick.multiplyScalar(Math.exp(-dt * 11));
  FEEL.fov *= Math.exp(-dt * 9);
}

