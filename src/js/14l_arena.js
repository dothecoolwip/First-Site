// ===================================================================
// Spectating: walk up to any arena and watch from the stands. The bout moves to that arena, the camera
// takes a spectator's view (orbit, follow a fighter, broadcast angle), and you leave by walking off or pressing Leave.
// Arenas you aren't at still have results on their boards: they tick cheaply in the background.
// ===================================================================
const SPEC = { results: {}, t: 0, follow: 0, zoom: 1 };
const SPEC_MODES = ['Front row', 'Middle row', 'Back row', 'High view'];
// The rope-side aisle is reachable; the old trigger was behind the solid benches.
function buildArenaSeats() {
  for (const A of ARENAS) {
    for (const side of [-1, 1]) {
      for (const offset of [-9, 0, 9]) {
        const x = A.x + side * (LIST.W / 2 + 4.7), z = A.z + offset;
        const lab = new THREE.Object3D();
        TOWN.stalls.push({ V: { key: 'a:' + A.key + ':' + side + ':' + offset, name: A.name, role: 'Watch from the stands', icon: '🏟️' }, g: lab, npc: null, ry: 0, x, z, ax: x, az: z, label: lab, arena: A, reach: 2.7, open: () => spectate(A, side, offset), verb: 'Spectate' });
      }
    }
  }
}
// Each lane has an animated spectator who can leave, return, and take another
// place on that bench. Keep the rig count bounded for phone GPUs.
function arenaSeatFolk(R, A, sides) {
  if (!UAL.ready || !outfitInit()) return;
  for (const sx of sides || [-1, 1]) for (let row = 0; row < (A.key === 'dome' ? 3 : IS_TOUCH ? 1 : 2); row++) {
    const fit = folkOutfit('towns', row + (sx > 0 ? 7 : 0));
    const J = costumePerson(Object.assign({ h: 1.7 + row * 0.05, anim: 'Sitting_Idle_Loop' }, fit));
    if (!J) continue;
    const x = A.x + sx * (LIST.W / 2 + 6.3 + row * 2.2), z = A.z + [-7, 0, 7][row], y = gy(A.x, A.z) + row * 0.5;
    J.root.position.set(x, y, z); J.root.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    R.add(J.root);
    SPECT.seated.push({ J, A, sx, row, x, y, z, phase: 'sit', timer: rand(12, 28), gesture: rand(3, 8), exit: row % 2 ? -1 : 1 });
  }
}
function updateArenaSeatFolk(dt) {
  for (const S of SPECT.seated) {
    S.timer -= dt;
    const near = Math.hypot(TOWN.pos.x - S.A.x, TOWN.pos.z - S.A.z) < 70;
    S.J.root.visible = near && !S.budgetHidden && S.phase !== 'away';
    if (S.phase === 'sit') {
      if ((S.gesture -= dt) <= 0) { S.gesture = rand(4, 9); S.J.play(pick(['Sitting_Idle_Loop', 'Sitting_Talking_Loop']), 0.4); }
      if (S.timer <= 0) { S.phase = 'leave'; S.stood = false; S.aisleX = null; S.transition = 0; S.route = null; S.retry = 0; S.J.play('Walk_Loop', 0.25); S.J.root.rotation.y = S.exit > 0 ? 0 : Math.PI; }
    } else if (S.phase === 'leave' || S.phase === 'enter') {
      if (folkSeatWalk(S, dt)) {
        if (S.phase === 'leave') { S.phase = 'away'; S.timer = rand(3, 8); S.route = null; }
        else { S.phase = 'seat'; S.transition = 0; S.route = null; }
      }
    } else if (S.phase === 'seat') {
      S.transition = Math.min(1, S.transition + dt * 2);
      S.J.root.position.x = S.x + (S.aisleX - S.x) * (1 - S.transition);
      S.J.root.position.z = S.z;
      S.J.root.position.y = gy(S.x, S.z) * (1 - S.transition) + S.y * S.transition;
      if (S.transition >= 1) { S.phase = 'sit'; S.timer = rand(12, 28); S.J.root.rotation.y = S.sx < 0 ? Math.PI / 2 : -Math.PI / 2; S.J.play('Sitting_Idle_Loop', 0.3); }
    } else if (S.phase === 'away' && S.timer <= 0) {
      // Re-enter in the same row at another empty place, not through the bench.
      const spots = S.A.key === 'dome' && S.row === 0 ? [-9, -6, -3, 0, 9] : [-9, -6, -3, 0, 3, 6, 9];
      const available = spots.filter(z => Math.abs(S.A.z + z - S.z) > 0.1 && !TOWN.obst.some(o => Math.hypot(o.x - S.x, o.z - S.A.z - z) < o.r + 0.32));
      if (!available.length) { S.timer = 5; continue; }
      S.z = S.A.z + pick(available);
      S.exit = Math.random() < 0.5 ? -1 : 1;
      S.aisleX = folkSeatAisle(S); if (S.aisleX == null) { S.timer = 5; continue; }
      S.J.root.position.set(S.aisleX, gy(S.aisleX, S.A.z), S.A.z + S.exit * (LIST.L * 0.5 + 0.7)); S.stood = true; S.route = null; S.retry = 0;
      S.J.root.rotation.y = S.exit > 0 ? Math.PI : 0;
      S.J.play('Walk_Loop', 0.25); S.phase = 'enter'; S.J.root.visible = near;
    }
    if (near && !S.budgetHidden && S.phase !== 'away') S.J.mixer.update(dt);
  }
}
function spectate(A, side = 1, offset = 0) {
  const returnPos = { ...TOWN.pos };
  const returnYaw = TOWN.yaw, returnPitch = TOWN.pitch, returnFace = TOWN.face;
  if (!BOUT.on || TOWN.boutArena !== A.key) { TOWN.forceArena = A.key; boutStop(); boutStart(); }
  TOWN.forceArena = A.key; SPEC.zoom = 1;
  TOWN.spec = { A, side, offset, mode: 0, t: 0, returnPos, returnYaw, returnPitch, returnFace };
  TOWN.pos = { x: A.x + side * (LIST.W / 2 + 6.3), z: A.z + offset };
  TOWN.face = -side * Math.PI / 2;
  TOWN.yaw = side * Math.PI / 2;
  TOWN.pitch = 0.5;
  TOWN.fpYaw = FP.yaw;
  TOWN.cam = null; AU.click && AU.click();
  $('#townPrompt').hidden = true; specHud(); if (IN.mode === 'pad' || IN.mode === 'kb') focusFirst();
  toastMenu(`Watching at ${A.name}. Drag or use the right stick to look around; move or press Leave to stop.`);
}
function stopSpectating() { if (!TOWN.spec) return; const S = TOWN.spec; TOWN.pos = S.returnPos; TOWN.yaw = S.returnYaw; TOWN.pitch = S.returnPitch; TOWN.face = S.returnFace; TOWN.fpYaw = FP.yaw; TOWN.spec = null; TOWN.forceArena = null; TOWN.cam = null; TOWN.actPrev = true; specHud(); townPrompt(); }
function specHud() {
  const el = $('#townSpec'); if (!el) return;
  const S = TOWN.spec; el.hidden = !S || !!G.screen; if (!S) return;
  if (!el.firstChild) el.append(h('span', { class: 'spectxt' }, h('small'), h('b')),
    h('button', { class: 'btn tape small', onclick: e => { e.stopPropagation(); if (TOWN.spec) { const S = TOWN.spec; S.mode = (S.mode + 1) % SPEC_MODES.length; TOWN.pos.x = S.A.x + S.side * (LIST.W / 2 + 6.3 + Math.min(S.mode, 2) * 2.2); TOWN.cam = null; specHud(); } } }, 'Seat'),
    h('button', { class: 'btn tape small', 'aria-label': 'Binoculars zoom', onclick: e => { e.stopPropagation(); SPEC.zoom = SPEC.zoom === 1 ? 2 : SPEC.zoom === 2 ? 3 : 1; specHud(); } }, 'Zoom'),
    h('button', { class: 'btn tape small', 'data-back': '', onclick: e => { e.stopPropagation(); stopSpectating(); } }, 'Leave'));
  const m = G.match, w = m && m.wins ? m.wins : [0, 0];
  el.querySelector('.spectxt small').textContent = `${S.A.name} · ${SPEC_MODES[S.mode]} · ${SPEC.zoom}×`;
  el.querySelector('.spectxt b').textContent = BOUT.on ? `${BOUT.vs} · ${w[0]}–${w[1]}` : 'Next pairing walking on…';
  el.querySelector('[aria-label="Binoculars zoom"]').textContent = `Zoom ${SPEC.zoom}×`;
}
// the spectator camera (called from updateTownCamera)
function specCamera(dt) {
  const S = TOWN.spec, A = S.A, cam = W3.camera; S.t += dt;
  const row = Math.min(S.mode, 2);
  const want = new THREE.Vector3(A.x + S.side * (LIST.W / 2 + 6.3 + row * 2.2), gy(A.x, A.z) + 2.2 + row * 0.5 + (S.mode === 3 ? 0.8 : 0), A.z + S.offset);
  // The camera stays at the seat the player chose. Look controls turn the
  // view freely instead of snapping it back to the fighters every frame.
  const look = new THREE.Vector3(want.x - Math.sin(TOWN.yaw) * 24, want.y + (0.5 - TOWN.pitch) * 18, want.z - Math.cos(TOWN.yaw) * 24);
  if (!TOWN.cam) { TOWN.cam = want.clone(); TOWN.look = look.clone(); }
  const k = 1 - Math.exp(-3 * dt); TOWN.cam.lerp(want, k); TOWN.look.lerp(look, k);
  cam.position.copy(TOWN.cam); cam.lookAt(TOWN.look);
  if ((G.frameN || 0) % 20 === 0) specHud();
}
// arenas you're not at: a pairing and a result every minute or two, so the boards and the map always have news
function arenaTicker(dt) {
  SPEC.t -= dt; if (SPEC.t > 0) return; SPEC.t = 20;
  const clubs = ['reavers', 'wardens', 'rabble', ...Object.keys(CLUBS).filter(k => /^ladder\d$/.test(k))];
  for (const A of ARENAS) {
    if (A.key === TOWN.boutArena) continue;
    const R = SPEC.results[A.key]; if (R && R.until > G.realTime) continue;
    const a = pick(clubs); let b = pick(clubs), g = 0; while (b === a && g++ < 10) b = pick(clubs);
    const wa = Math.random() < 0.5, s = wa ? [2, Math.random() < 0.5 ? 1 : 0] : [Math.random() < 0.5 ? 1 : 0, 2];
    SPEC.results[A.key] = { text: `${CLUBS[a].name} ${s[0]}–${s[1]} ${CLUBS[b].name}`, until: G.realTime + 60 + Math.random() * 90 };
  }
}
function arenaNews(A) { if (A.live && A.liveText) return A.liveText; if (TOWN.boutArena === A.key && BOUT.on) return `On now: ${BOUT.vs}`; const R = SPEC.results[A.key]; return R ? `Last: ${R.text}` : ''; }
