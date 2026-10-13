// ---------- Training Yard: a pell, a sparring partner, and one lesson per button ----------
const TR = { on: false, i: 0, n: 0, set: new Set(), doneT: -1, ring: null, lastYaw: 0, yawAcc: 0 };
const T_TXT = (touch, kb, pad) => ({ touch, kb, pad });
const LESSONS = [
  { id: 'move', title: 'Move', need: 1, text: T_TXT('Drag on the left side of the screen to walk into the yellow ring. Push forward past the stick ring to run.', 'Walk into the yellow ring with W A S D. Hold Shift to run.', 'Walk into the yellow ring with the left stick. Push it all the way forward, or click L3, to run.'),
    setup() { place(0, 'still', -6, -9, 8); place(1, 'still', 6, -9, 8); const p = G.player, fw = fwd(FP.yaw); TR.target = { x: clamp(p.pos.x + fw.x * 5 + 1.2, -7, 7), z: clamp(p.pos.z + fw.z * 5, -10, 10) }; },
    tick() { const p = G.player, t = TR.target; if (!t) return 0; return Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < 1.0 ? 1 : 0; } },
  { id: 'look', title: 'Look around', need: 1, text: T_TXT('Drag on the right side of the screen to look around. Take a full look round the list.', 'Move the mouse to look around (click the game first so it can grab the mouse). Take a full look round.', 'Use the right stick to look around. Take a full look round.'),
    setup() { TR.yawAcc = 0; TR.lastYaw = FP.yaw; }, tick() { TR.yawAcc += Math.abs(angDiff(TR.lastYaw, FP.yaw)); TR.lastYaw = FP.yaw; return TR.yawAcc > 5 ? 1 : 0; } },
  { id: 'view', title: 'Two cameras', need: 2, text: T_TXT('Tap 1P / 3P at the top right to switch to third person, then switch back. You can do this any time, even mid-fight.', 'Press V (or click 1P / 3P at the top right) to switch to third person, then back.', 'Tap the View button to switch to third person, then back.'),
    on: t => t === 'view' },
  { id: 'swing', title: 'Swing', need: 3, text: T_TXT('Walk up to the pell (yellow marker). Hold SWING to wind up, let go to strike. Land 3 hits. Hold longer for a heavier blow.', 'Walk up to the pell (yellow marker). Hold the left mouse button to wind up, release to strike. Land 3 hits.', 'Walk up to the pell (yellow marker). Hold RT to wind up, release to strike. Land 3 hits.'),
    setup() { place(0, 'still', 0, 0, 8, 2.2); place(1, 'still', 7, -10, 8); }, on: (t, d) => t === 'hit' && !d.blocked },
  { id: 'arcs', title: 'Pick your arc', need: 3, text: T_TXT('While holding SWING, swipe left, right, or up (overhead) before you let go. Land one of each.', 'While holding the mouse button, drag left, right or up (overhead) before you release. Land one of each.', 'While holding RT, push the right stick left, right or up (overhead). Land one of each.'),
    setup() { TR.set = new Set(); place(0, 'still', 0, 0, 8, 2.0); }, on: (t, d) => { if (t !== 'hit' || d.blocked || TR.set.has(d.arc)) return false; TR.set.add(d.arc); return true; } },
  { id: 'aim', title: 'Aim for the helmet', need: 2, text: T_TXT('You hit where you look. Look up at the pell’s helmet and strike: two helmet hits. In duels the head is worth 3.', 'You hit where you look. Raise the mouse to aim at the pell’s helmet and strike: two helmet hits. In duels the head is worth 3.', 'You hit where you look. Tilt the right stick up to aim at the helmet and strike: two helmet hits. In duels the head is worth 3.'),
    setup() { place(1, 'still', 7, -10, 8); place(0, 'still', 0, 0, 8, 1.6); }, on: (t, d) => t === 'hit' && d.zone === 'helmet' && !d.blocked },
  { id: 'guard', title: 'Guard', need: 3, text: T_TXT('Coach will swing at you, slowly. Hold GUARD as the blow comes in. Block 3.', 'Coach will swing at you, slowly. Hold the right mouse button to guard as the blow comes in. Block 3.', 'Coach will swing at you, slowly. Hold LT to guard as the blow comes in. Block 3.'),
    setup() { place(0, 'still', -7, -10, 8); place(1, 'swinger', 0, 0, 8, 1.7); }, on: t => t === 'block' },
  { id: 'perfect', title: 'Perfect block', need: 2, text: T_TXT('Don’t hold GUARD early: tap it just before Coach’s blow lands. Get it right and they stagger. Two perfect blocks.', 'Don’t hold guard early: click the right button just before Coach’s blow lands. Two perfect blocks.', 'Don’t hold LT early: pull it just before Coach’s blow lands. Two perfect blocks.'),
    setup() { place(0, 'still', -7, -10, 8); place(1, 'swinger', 0, 0, 8, 1.7); }, on: t => t === 'perfect' },
  { id: 'combo', title: 'Shove, then trip', need: 1, text: T_TXT('SHOVE to make them stumble, then hit TRIP while it flashes yellow. Put the pell on the floor.', 'Q to shove so they stumble, then E to trip while the prompt flashes. Put the pell on the floor.', 'X to shove so they stumble, then B to trip while the prompt flashes. Put the pell on the floor.'),
    setup() { place(1, 'still', 7, -10, 8); place(0, 'still', 0, 0, 1, 1.8); }, on: (t, d) => t === 'takedown' && d.how === 'trip' },
  { id: 'clinch', title: 'Clinch and throw', need: 1, text: T_TXT('GRAB to clinch. Inside the clinch: SWING knees, TRIP throws, GRAB disarms. Knee them a couple of times, then throw.', 'F to grab and clinch. Inside: left click knees, E throws, F disarms. Knee them a couple of times, then throw.', 'LB or RB to grab. Inside: RT knees, B throws, LB/RB disarms. Knee them a couple of times, then throw.'),
    setup() { place(0, 'still', 0, 0, 1, 1.5); }, on: t => t === 'throw' },
  { id: 'tackle', title: 'Run and tackle', need: 1, text: T_TXT('Back off a few steps, run at the pell and hit TACKLE as you arrive. Miss and you over-commit.', 'Back off, run at the pell (Shift) and press C as you arrive. Miss and you over-commit.', 'Back off, run at the pell (push the stick all the way) and press Y as you arrive. Miss and you over-commit.'),
    setup() { place(0, 'still', 0, 0, 1, 4.2); }, on: t => t === 'tackle' },
  { id: 'lock', title: 'Target lock', need: 2, text: T_TXT('Your view follows the yellow-marked opponent. Tap the right side of the screen to switch between the two partners. Twice.', 'Your view gently follows the yellow-marked opponent. Press Tab to switch target. Twice.', 'Your view follows the yellow-marked opponent. Click R3 to switch target. Twice.'),
    setup() { place(0, 'still', -1.6, 0, 8, 3.2); place(1, 'still', 1.6, 0, 8, 3.2); }, on: t => t === 'lock' },
  { id: 'spar', title: 'Free spar', need: 0, text: T_TXT('That’s every button. Spar with both partners as long as you like, or tap Exit.', 'That’s every key. Spar with both partners as long as you like, or press Exit.', 'That’s every button. Spar with both partners as long as you like, or press Exit.'),
    setup() { place(0, 'easy', -2, 0, 1, 5); place(1, 'easy', 2, 0, 1, 5); } },
];
// put a partner somewhere: relative to the player when ahead > 0 (that far in front, offset sideways by dx), else at an absolute spot
function place(i, mode, dx, dz, stab, ahead) {
  const f = G.fighters.filter(o => o.team === 1)[i]; if (!f) return; const p = G.player;
  if (f.clinch) breakClinch(f);
  let x = dx, z = dz;
  if (ahead) { const fw = fwd(FP.yaw), rt = { x: -Math.cos(FP.yaw), z: Math.sin(FP.yaw) }; x = p.pos.x + fw.x * ahead + rt.x * dx; z = p.pos.z + fw.z * ahead + rt.z * dx; }
  x = clamp(x, -LIST.W / 2 + 1, LIST.W / 2 - 1); z = clamp(z, -LIST.L / 2 + 1, LIST.L / 2 - 1);
  Object.assign(f, { state: 'standing', touched: false, returnAt: -1, action: null, cd: 0, vel: { x: 0, z: 0 }, lean: { x: 0, z: 0 }, leanV: { x: 0, z: 0 }, pos: { x, z }, stabMul: stab, slowT: 0, noStep: 0 });
  f.ai.mode = mode; f.prof = mode === 'easy' ? DIFF.rookie : null; f.ai.next = 0.3; f.ai.swingT = 1.5;
  if (!f.weapon) { f.weapon = WEAPONS[f.spec.weapon]; setWeaponModel(f); }
  f.facing = f.wantFace = angTo(f.pos, p.pos);
}
function startTraining() {
  G.attract = false; G.tourney = null; REP.log = [];
  setupMatch({ mode: 'train', opp: 'sparring', stage: 'Fairground Training Yard', training: true, venue: 'training' });
  startRound(); TR.on = true; $('#app').classList.add('training');
  beginFight();
  setLesson(CAREER.trained ? LESSONS.length - 1 : 0);
}
function setLesson(i) {
  TR.i = clamp(i, 0, LESSONS.length - 1); TR.n = 0; TR.doneT = -1;
  const L = LESSONS[TR.i]; if (L.setup) L.setup();
  renderLesson();
}
function renderLesson() {
  const L = LESSONS[TR.i], el = $('#lesson'); el.hidden = !TR.on;
  const txt = typeof L.text === 'string' ? L.text : L.text[IN.mode] || L.text.touch;
  $('#lNum').textContent = `${TR.i + 1}/${LESSONS.length}`; $('#lTitle').textContent = L.title; $('#lText').textContent = txt;
  $('#lProg').textContent = L.need ? `${Math.min(TR.n, L.need)}/${L.need}` : '';
  $('#lSkip').textContent = TR.i >= LESSONS.length - 1 ? 'Restart lessons' : 'Skip';
}
function lessonCount(k = 1) {
  const L = LESSONS[TR.i]; if (!L.need || TR.doneT >= 0) return;
  TR.n += k; renderLesson();
  if (TR.n >= L.need) {
    TR.doneT = 1.4; toast('Lesson done!', 'big', `${L.title}, +15 XP`); AU.cheer(1); gainXP(15);
    if (L.id === 'lock' && !CAREER.trained) { CAREER.trained = true; unlock('grad'); const m = pay(100); setTimeout(() => toast('Graduated!', 'big', `${fmtMoney(m)} to your purse`), 1500); }
  }
}
EV_LISTENERS.push((type, d) => { if (!TR.on) return; const L = LESSONS[TR.i]; if (L.on && L.on(type, d)) lessonCount(); });
function updateTraining(dt) {
  if (!TR.on || !G.match || !G.match.training) return;
  const L = LESSONS[TR.i];
  if (G.phase === 'fight' && L.tick && TR.doneT < 0) { const k = L.tick(dt); if (k) lessonCount(k); }
  if (TR.doneT >= 0) { TR.doneT -= dt; if (TR.doneT < 0) setLesson(TR.i + 1); }
  // the yellow ring for the walking lesson
  if (!TR.ring) {
    const g = new THREE.Group();
    const r = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40), new THREE.MeshBasicMaterial({ color: '#f2c40f', transparent: true, opacity: 0.85, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.y = 0.03; g.add(r);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 3, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#f2c40f', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })); b.position.y = 1.5; g.add(b); r.renderOrder = 5; b.renderOrder = 5;
    W3.scene.add(g); TR.ring = g;
  }
  TR.ring.visible = L.id === 'move' && TR.doneT < 0 && (G.phase === 'fight' || G.phase === 'prefight');
  if (TR.ring.visible) { TR.ring.position.set(TR.target.x, 0, TR.target.z); TR.ring.children[1].material.opacity = 0.2 + 0.08 * Math.sin(G.realTime * 4); }
  // keep the pell standing in the swing lessons even if it gets bowled over
  for (const f of G.fighters) if (f.team === 1 && f.ai.mode === 'still' && f.stabMul > 4 && isDown(f) && f.returnAt < 0) f.returnAt = G.simTime + 1;
}
function endTraining() { TR.on = false; $('#lesson').hidden = true; $('#app').classList.remove('training'); if (TR.ring) TR.ring.visible = false; }

