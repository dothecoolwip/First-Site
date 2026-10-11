// ---------- instant replay: the last ten seconds of every fighter, played back slowly from any angle ----------
const RP = { frames: [], max: 220, acc: 0, on: false, t: 0, speed: 0.35 };
function recordReplay(dt) {
  if (!G.match || G.attract || G.paused || !['fight', 'stopping'].includes(G.phase)) return;
  RP.acc += dt; if (RP.acc < 0.05) return; RP.acc = 0;
  const fr = { t: G.simTime, f: [] };
  for (const f of G.fighters) { const J = f.model; if (!J) continue; fr.f.push([f, J.root.visible, J.root.position.x, J.root.position.y, J.root.position.z, J.root.rotation.y, J.tilt.rotation.x, J.tilt.rotation.y, J.tilt.rotation.z, J.tilt.scale.y, ...POSE_KEYS.map(k => J.pose[k] || 0)]); }
  RP.frames.push(fr); if (RP.frames.length > RP.max) RP.frames.shift();
}
function clearReplay() { RP.frames.length = 0; RP.on = false; }
function startReplay() {
  if (RP.frames.length < 10) { toastMenu('Nothing to replay yet.'); return false; }
  RP.on = true; G.replay = true;
  // start a couple of seconds before the last takedown if there was one, otherwise six seconds back
  const end = RP.frames[RP.frames.length - 1].t, downT = G.lastDownT && G.lastDownT > RP.frames[0].t ? G.lastDownT : end - 4;
  RP.t = RP.start = Math.max(RP.frames[0].t, downT - 2.5); RP.end = Math.min(end, downT + 2.5);
  $('#replayBtn').setAttribute('aria-pressed', 'true'); return true;
}
function stopReplay() { RP.on = false; G.replay = false; const b = $('#replayBtn'); if (b) b.setAttribute('aria-pressed', 'false'); for (const f of G.fighters) if (f.model) animateFighter(f, 0, G.realTime); }
function updateReplay(dt) {
  if (!RP.on) return;
  RP.t += dt * RP.speed; if (RP.t > RP.end) RP.t = RP.start; // loop the moment
  let i = RP.frames.findIndex(fr => fr.t >= RP.t); if (i <= 0) i = 1; const A = RP.frames[i - 1], B = RP.frames[i] || A, k = clamp((RP.t - A.t) / Math.max(1e-3, B.t - A.t), 0, 1);
  A.f.forEach((a, n) => {
    const b = B.f[n] && B.f[n][0] === a[0] ? B.f[n] : a, f = a[0], J = f.model; if (!J) return;
    J.root.visible = a[1]; J.root.position.set(lerp(a[2], b[2], k), lerp(a[3], b[3], k), lerp(a[4], b[4], k)); J.root.rotation.y = a[5] + angDiff(a[5], b[5]) * k;
    J.tilt.rotation.set(lerp(a[6], b[6], k), lerp(a[7], b[7], k), lerp(a[8], b[8], k)); J.tilt.scale.setScalar((J.scale || 1)); J.tilt.scale.y = lerp(a[9], b[9], k);
    const P = {}; POSE_KEYS.forEach((key, j) => P[key] = lerp(a[10 + j], b[10 + j], k)); applyPose(J, P, 1e6, 1);
    if (f.isPlayer) J.root.visible = true;
  });
  const sl = $('#replayScrub'); if (sl) sl.value = String(clamp((RP.t - RP.frames[0].t) / Math.max(0.1, RP.frames[RP.frames.length - 1].t - RP.frames[0].t), 0, 1));
}
