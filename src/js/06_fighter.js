// ---------- fighters: balance, actions, contact, grounding ----------
const G = {
  fighters: [], marshals: [], props: [], phase: 'boot', simTime: 0, realTime: 0, match: null, tourney: null, player: null,
  settings: { difficulty: 'club', ring: false, voice: false, shake: true, assist: true, view: 'fp', rumble: true, legend: true, sens: 1, invert: false, cine: true, gfx: 'auto', shakeAmt: null, flash: true, comm: true, spokenComm: true, cap: false, tele: 'subtle', speed: 1, ts: '1', haptics: true },
  autopilot: false, attract: false, timeScale: 1, hitstop: 0, slowmo: 0, shake: 0, orders: ['free', 'free'], feedLog: [],
  stats: { rounds: 0, roundTimes: [], falls: {}, fouls: 0, cards: 0, hits: 0, blocks: 0, trips: 0, tripsOk: 0, breaks: 0, failures: 0, errors: [] },
  reserves: [2, 2], needRoundCheck: false
};
const GRAV = 9.81;          // inverted-pendulum gravity term (COM height ~1 m)
const STEP_T = 0.17, FALL_L = 0.5; // lean (m) at which a recovery step is taken, and at which the fighter is going down (tuning)

function createFighter(spec, club, team, idx, kit, body) {
  const arch = ARCH[spec.arch];
  body = body || { h: 1.8, b: 1, bodyMass: 80 };
  const f = {
    id: G.fighters.length, spec, club, team, idx, arch, isPlayer: false, name: spec.name, num: spec.num,
    pos: { x: 0, z: 0 }, vel: { x: 0, z: 0 }, facing: 0, lean: { x: 0, z: 0 }, leanV: { x: 0, z: 0 },
    state: 'standing', fallT: 0, fallDir: { x: 0, z: 1 }, touched: false, groundPos: { x: 0, z: 0 }, groundStyle: 'fall', riseT: 0, postT: 0, kneelT: 0,
    gas: 1, bell: 0, brace: false, guard: false, sprint: false, pinned: false,
    action: null, cd: 0, noStep: 0, stepRem: 0, stepDir: { x: 0, z: 0 }, stepCd: 0, stepFlip: 1,
    clinch: null, graceUntil: -1, plantCd: 0, rearmT: 0, sidearmT: 0, sidearmUsed: false,
    weapon: spec.player ? playerWeaponDef(spec.weapon) : WEAPONS[spec.weapon], shield: spec.shield ? SHIELDS[spec.shield] : null,
    kit: kit || freshKit(spec, false), oldTape: !!spec.player,
    rec: { warnings: 0, yellows: 0, red: false }, out: false, redMatches: 0, armorStrikes: 0,
    ai: { target: null, next: rand(0.11, 0.3), strafe: chance(0.5) ? 1 : -1, guardT: 0, braceT: 0, plan: 0 },
    move: { x: 0, z: 0 }, wantFace: 0, lastCause: null, foulVictimT: -9, returnAt: -1, walkPh: rand(0, TAU), swingSide: 1, stats: { hits: 0, takedowns: 0 },
    earlyRiseT: 0, earlyWarned: false, body, helm: HELMS[spec.helm] || HELMS.pigface, lookYaw: 0, lookPitch: 0,
    prof: spec.prof || null, stabMul: spec.stab || 1, slowT: 0, up: null
  };
  recalcBody(f);
  return f;
}
// size matters: mass resists shoves and hits, height adds reach but raises the centre of mass, light frames are quicker
function recalcBody(f) {
  const b = f.body, hs = b.h / 1.8;
  f.helm = CUTE.on ? FOAM_HELM : HELMS[f.spec.helm] || HELMS.pigface;
  f.mass = b.bodyMass + f.arch.kit * (0.8 + 0.2 * b.b) * hs * (CUTE.on ? 0.35 : 1) + f.helm.weight + (f.weapon ? f.weapon.mass : 1) + (f.shield ? f.shield.mass : 0);
  if (CUTE.on) f.mass *= 3.5; // kids fight kids: physics runs on mass relative to the division, so a 30 kg kid in foam behaves like a grown fighter in steel
  f.radius = f.arch.radius * (0.86 + 0.14 * b.b) * (0.9 + 0.1 * hs);
  f.spdF = (1.14 - 0.14 * b.b) * (0.92 + 0.08 * hs);
  f.stabF = 1.06 - 0.06 * hs;
  f.reachB = (b.h - 1.8) * 0.5;
  // career kit upgrades (player only)
  f.up = f.isPlayer && typeof CAREER !== 'undefined' ? shopUp() : null;
  if (f.up) { f.spdF *= 1 + 0.03 * (f.up.harness || 0); f.stabF *= 1 + 0.035 * (f.up.boots || 0); }
  if (typeof shopFx === 'function') { const sq = squadFx(f); f.spdF *= 1 + pfx(f, 'spd') + sq; f.stabF *= 1 + pfx(f, 'stab') + sq; } // runes, drills, potions; your squad camp
  f.stabF *= (1 + 0.03 * perk(f, 'iron.rooted')) * mod(f, 'stab') * weatherStab();
}
const isUp = (f) => !f.out && (f.state === 'standing' || f.state === 'posting' || (f.state === 'falling' && !f.touched));
const isDown = (f) => !f.out && (f.state === 'grounded' || f.state === 'rising' || f.state === 'kneeling' || (f.state === 'falling' && f.touched));
function label(f) { return f.isPlayer ? 'You' : `${f.club.short} ${f.num}`; }
function teamColor(f) { return G.match && G.match.ffa ? ffaColor(f) : f.team === 0 ? 'var(--flag)' : 'var(--rival)'; }
function massF(f) { return f.mass / 120; }

function applyImpulse(f, dir, mag, cause) {
  if (!isUp(f)) return;
  const k = mag / massF(f);
  f.leanV.x += dir.x * k; f.leanV.z += dir.z * k;
  if (cause) f.lastCause = { ...cause, t: G.simTime };
}

function stepFighter(f, dt) {
  if (f.out) return;
  f.cd -= dt; f.noStep -= dt; f.stepCd -= dt; f.plantCd -= dt;
  f.bell = Math.max(0, f.bell - dt * 0.5);
  if (f.guard && !f.guardWas) f.guardAt = G.simTime; if (f.guardBroken > G.simTime) f.guard = false; f.guardWas = f.guard; // when the guard went up, for perfect blocks
  switch (f.state) {
    case 'standing': standingUpdate(f, dt); break;
    case 'posting': f.postT -= dt; f.vel.x *= 0.9; f.vel.z *= 0.9; if (f.postT <= 0) f.state = 'standing'; break;
    case 'falling': fallUpdate(f, dt); break;
    case 'kneeling': f.kneelT += dt; if (f.kneelT > 0.9) { f.state = 'grounded'; f.groundStyle = 'kneel'; f.groundPos = { ...f.pos }; groundFighter(f, 'yielded by kneeling', 'BR 1.3.1'); } break;
    case 'rising': f.riseT += dt; if (f.riseT >= 1.0) { f.state = 'standing'; f.lean = { x: 0, z: 0 }; f.leanV = { x: 0, z: 0 }; f.pos = { ...f.groundPos }; } break;
    case 'grounded':
      f.gas = Math.min(1, f.gas + dt * 0.05);
      if (f.returnAt > 0 && G.simTime >= f.returnAt) { f.returnAt = -1; f.state = 'rising'; f.riseT = 0; }
      break;
  }
}

function standingUpdate(f, dt) {
  const gasF = 0.5 + 0.5 * f.gas;
  const diffStab = f.isPlayer ? DIFF[G.settings.difficulty].playerStab : 1;
  if (f.buffT > 0) f.buffT -= dt;
  // fatigue: the whole round wears you down (heavier kit and stuffier helms faster), and it only partly comes back between rounds
  if (G.phase === 'fight' && !(G.match && G.match.training)) {
    const work = 0.0022 + (f.sprint ? 0.0045 : 0) + (f.action ? 0.0035 : 0) + (f.clinch ? 0.004 : 0) + (f.guard ? 0.001 : 0) + (f.brace ? 0.0008 : 0);
    f.fatigue = Math.min(1, (f.fatigue || 0) + dt * work * (f.mass / 112) * (1.9 - f.helm.breath) * (1 - 0.1 * perk(f, 'lungs.endure')) * (1 - 0.06 * perk(f, 'lungs.breath')) * mod(f, 'fat'));
  }
  const fat = f.fatigue || 0;
  if (f.gas > 1 - 0.5 * fat) f.gas = Math.max(1 - 0.5 * fat, f.gas - dt * 0.08); // less breath to come back to
  const rally = !f.isPlayer && f.team === 0 && G.player && isUp(G.player) && perk(G.player, 'show.rally') ? 1.08 : 1;
  const stab = f.arch.stab * diffStab * f.stabF * f.stabMul * botScale(f, 1.45) * (1 - 0.35 * f.bell) * (1 - 0.15 * fat) * (f.buffT > 0 ? f.buffStab || 1 : 1) * rally * (f.atRail && perk(f, 'iron.rail') ? 1.3 : 1);
  if (f.isPlayer && f.gas < 0.2 && !f.secondUsed && perk(f, 'lungs.second')) { f.secondUsed = true; f.gas += 0.35; toast('Second wind!', 'good'); }
  const swinging = f.action && f.action.kind === 'swing' && f.action.phase !== 'recover';
  // ---- locomotion ----
  let spd = f.arch.speed * f.spdF * botScale(f, 1.30) * (0.55 + 0.45 * f.gas) * (1 - 0.28 * (f.fatigue || 0));
  const running = f.sprint && f.gas > 0.08 && !f.brace && !f.guard;
  if (running) spd *= 1.45 * (perk(f, 'lungs.sprinter') ? 1.07 : 1);
  if (f.brace) spd *= 0.42; if (f.guard) spd *= 0.75; if (swinging) spd *= 0.55; if (f.clinch) spd *= 0.3; if (f.pinned) spd *= 0.6;
  spd *= 1 - 0.3 * f.bell;
  if (f.slowT > 0) { f.slowT -= dt; spd *= 0.6; } // glacier club
  if (G.phase !== 'fight') spd = Math.min(spd, 2.2);
  const lunging = (f.action && f.action.kind === 'tackle' && f.action.phase === 'lunge') || f.dashT > 0;
  if (f.dashT > 0) f.dashT -= dt;
  let ax = 0, az = 0;
  if (lunging) { f.vel.x *= 1 - dt * 1.2; f.vel.z *= 1 - dt * 1.2; }
  else {
    const dvx = f.move.x * spd - f.vel.x, dvz = f.move.z * spd - f.vel.z;
    const amax = 21 * 115 / f.mass * dt * (1 + 0.06 * perk(f, 'lungs.footwork')); const dl = Math.hypot(dvx, dvz); const s = dl > amax ? amax / dl : 1;
    ax = dvx * s; az = dvz * s;
    f.vel.x += ax; f.vel.z += az;
  }
  f.leanV.x -= ax * 0.045; f.leanV.z -= az * 0.045; // body lags behind sudden starts and stops
  f.pos.x += f.vel.x * dt; f.pos.z += f.vel.z * dt;
  if (running && vlen(f.vel) > 3) f.gas = Math.max(0, f.gas - dt * 0.1 * (f.up ? 1 - 0.08 * (f.up.cardio || 0) : 1) * (perk(f, 'lungs.marathon') ? 0.7 : 1) * (1 - pfx(f, 'gasDrain')));
  // ---- recovery step in progress ----
  if (f.stepRem > 0) {
    const d = Math.min(f.stepRem, 2.9 * dt);
    f.pos.x += f.stepDir.x * d; f.pos.z += f.stepDir.z * d; f.lean.x -= f.stepDir.x * d; f.lean.z -= f.stepDir.z * d; f.stepRem -= d;
  }
  // ---- balance: inverted pendulum with limited corrective strength ----
  const k = 34 * stab, c = 7 * stab;
  const Fmax = 3.2 * stab * gasF * (f.brace ? 1.55 * (perk(f, 'iron.brace') ? 1.15 : 1) : 1) * (f.clinch ? 1.2 : 1);
  let cx = -k * f.lean.x - c * f.leanV.x, cz = -k * f.lean.z - c * f.leanV.z;
  const cm = Math.hypot(cx, cz); if (cm > Fmax) { cx *= Fmax / cm; cz *= Fmax / cm; }
  f.leanV.x += (GRAV * f.lean.x + cx - 0.9 * f.leanV.x) * dt;
  f.leanV.z += (GRAV * f.lean.z + cz - 0.9 * f.leanV.z) * dt;
  f.lean.x += f.leanV.x * dt; f.lean.z += f.leanV.z * dt;
  railSupport(f);
  // ---- take a step to catch yourself ----
  const L = vlen(f.lean);
  if (L > STEP_T && f.stepRem <= 0 && f.stepCd <= 0 && f.noStep <= 0) {
    const dir = { x: f.lean.x / L, z: f.lean.z / L };
    let len = Math.min(L * 0.95, 0.58 * (f.brace ? 1.1 : 1) * (0.6 + 0.4 * f.gas) * (perk(f, 'iron.catch') ? 1.15 : 1));
    if (f.clinch) len *= 0.5;
    const tx = f.pos.x + dir.x * len, tz = f.pos.z + dir.z * len;
    const body = G.fighters.find(o => o !== f && isDown(o) && Math.hypot(o.groundPos.x - tx, o.groundPos.z - tz) < 0.5);
    if (body) { // stepping onto a grounded fighter: you stumble
      f.noStep = 0.3; applyImpulse(f, dir, 0.35, { type: 'body', by: null });
    } else {
      f.stepRem = len; f.stepDir = dir; f.stepCd = 0.2 + 0.16 * (1 - f.gas); f.stepFlip *= -1;
      f.leanV.x *= 0.55; f.leanV.z *= 0.55;
    }
  }
  if (vlen(f.lean) > FALL_L) { startFall(f); return; }
  // ---- facing ----
  const turn = (f.action && (f.action.phase === 'strike' || f.action.phase === 'lunge') ? 2.2 : running && vlen(f.vel) > 4 ? 4.5 : 9) * (f.arch.key === 'heavy' ? 0.88 : 1) * (1 - 0.4 * f.bell) * (1 + 0.06 * perk(f, 'lungs.footwork')) * (1 - 0.25 * (f.fatigue || 0));
  const da = angDiff(f.facing, f.wantFace);
  f.facing += clamp(da, -turn * dt, turn * dt);
  // ---- gas ----
  if (!f.action && !running) f.gas = Math.min(1, f.gas + dt * (f.brace ? 0.075 : 0.06) * botScale(f, 1.35) * f.helm.breath * (f.up ? 1 + 0.1 * (f.up.cardio || 0) : 1) * (1 + 0.08 * perk(f, 'lungs.breath')) * (1 + pfx(f, 'gasRec')) * (1 - 0.55 * (f.fatigue || 0)) * mod(f, 'regen'));
  if (f.clinch) f.gas = Math.max(0, f.gas - dt * 0.012);
  if (f.guard) f.gas = Math.max(0, f.gas - dt * 0.004);
  updateAction(f, dt);
  updateRearm(f, dt);
}

function railSupport(f) {
  const hw = LIST.W / 2 - f.radius, hl = LIST.L / 2 - f.radius;
  f.atRail = false;
  const sides = [[f.pos.x - hw, 1, 0], [-hw - f.pos.x, -1, 0], [f.pos.z - hl, 0, 1], [-hl - f.pos.z, 0, -1]];
  for (const [d, nx, nz] of sides) {
    if (d > -0.12) {
      f.atRail = true;
      const lo = f.lean.x * nx + f.lean.z * nz; if (lo > 0.1) { f.lean.x -= nx * (lo - 0.1); f.lean.z -= nz * (lo - 0.1); }
      const vo = f.leanV.x * nx + f.leanV.z * nz; if (vo > 0) { f.leanV.x -= nx * vo; f.leanV.z -= nz * vo; }
    }
  }
}

function startFall(f) {
  if (f.state !== 'standing') return;
  const L = vlen(f.lean) || 1; const dir = { x: f.lean.x / L, z: f.lean.z / L };
  if (perk(f, 'iron.unbreak') && !f.unbreakUsed) { f.unbreakUsed = true; f.graceUntil = G.simTime + 1; toast('Unbreakable!', 'big', 'You catch yourself'); rumble(0.6, 0.6, 200); }
  if (G.simTime < f.graceUntil) { // BR 1.3.2: posting off the shield edge after your own takedown
    f.state = 'posting'; f.postT = 0.45; f.lean = { x: dir.x * 0.06, z: dir.z * 0.06 }; f.leanV = { x: 0, z: 0 }; f.graceUntil = -1;
    feed(`${label(f)} posts off the ${f.shield ? 'shield edge' : 'open hand'} after the throw. Still up.`, 'BR 1.3.2', teamColor(f));
    return;
  }
  if (f.weapon && f.weapon.key === 'polearm' && f.plantCd <= 0 && chance(f.isPlayer ? 1 : 0.6)) { // planting the haft is legal
    f.lean = { x: dir.x * 0.1, z: dir.z * 0.1 }; f.leanV = { x: 0, z: 0 }; f.noStep = 0; f.plantCd = 7; f.plantFx = 0.6;
    feed(`${label(f)} plants the haft and stays up.`, 'BR 1.3.2', teamColor(f));
    return;
  }
  f.state = 'falling'; f.fallT = 0; f.fallDir = dir; f.touched = false; f.groundStyle = 'fall';
  f.action = null; f.guard = false; f.brace = false; f.stepRem = 0;
  breakClinch(f);
  f.tilt0 = Math.atan(L);
}

function fallUpdate(f, dt) {
  f.fallT += dt;
  if (f.fallT < 0.3) { f.pos.x += f.fallDir.x * dt * 0.8; f.pos.z += f.fallDir.z * dt * 0.8; }
  clampToList(f);
  if (!f.touched && f.fallT >= 0.3) {
    f.groundPos = { x: f.pos.x + f.fallDir.x * 0.5, z: f.pos.z + f.fallDir.z * 0.5 };
    const hw = LIST.W / 2 - 0.4, hl = LIST.L / 2 - 0.4;
    f.groundPos.x = clamp(f.groundPos.x, -hw, hw); f.groundPos.z = clamp(f.groundPos.z, -hl, hl);
    groundFighter(f, fallReason(f), 'BR 1.3.1');
  }
  if (f.fallT >= 0.62) f.state = 'grounded';
}

function fallReason(f) {
  const fw = fwd(f.facing); const along = fw.x * f.fallDir.x + fw.z * f.fallDir.z;
  const side = fw.z * f.fallDir.x - fw.x * f.fallDir.z; // + means fighter's left
  if (along < -0.5) return 'hip down';
  if (along > 0.5) return pick(['hand touched the floor', 'knee down']);
  if (side > 0 && f.shield) return 'shield touched the floor';
  return pick(['hand touched the floor', 'hip down']);
}

function groundFighter(f, reason, cite) {
  f.touched = true;
  if (f.groundStyle !== 'fall') { f.groundPos = { ...f.pos }; f.fallT = 1; f.state = f.state === 'kneeling' ? 'grounded' : f.state; }
  f.action = null; f.clinch && breakClinch(f);
  if (f.armorKnee) {
    feed(`${label(f)} takes a knee: unsafe armour. Out for this round.`, 'BR 1.3.1', teamColor(f));
    if (f.isPlayer) toast('Armour failed', 'bad', 'You are out for this melee round. Repair between rounds.');
    G.needRoundCheck = true;
    return;
  }
  const by = f.lastCause && f.lastCause.by && G.simTime - f.lastCause.t < 1.4 ? f.lastCause.by : null;
  const how = f.lastCause && G.simTime - f.lastCause.t < 1.4 ? f.lastCause.type : 'balance';
  const howTxt = { trip: 'Trip', hit: 'Strike', shove: 'Shove', throw: 'Throw', collision: 'Charge', tackle: 'Tackle', body: 'Stumbled on a body' }[how] || 'Takedown';
  feed(`${label(f)} grounded: ${reason}.${by && f.groundStyle === 'fall' ? ` ${howTxt} by ${label(by)}.` : ''}`, cite, teamColor(f));
  G.stats.falls[how] = (G.stats.falls[how] || 0) + 1;
  if (by) { by.stats.takedowns++; if (by.realGlow && typeof realTakedown === 'function') realTakedown(by); by.graceUntil = G.simTime + 0.6; if (G.match) G.match.takedowns[sideOf(by)]++; }
  const near = G.player ? dist2(G.player.pos, f.pos) : 8;
  AU.crash(clamp(1.4 - near / 16, 0.25, 1)); AU.cheer(f.team === 1 ? 1 : 0.6);
  W3.crowdBase.forEach(c => { if (Math.random() < 0.4) c.ex = Math.max(c.ex, 0.6); });
  dustPuff(f.groundPos.x, f.groundPos.z);
  if (G.phase === 'fight') { const gp = new THREE.Vector3(f.groundPos.x, 0.5, f.groundPos.z); if (CUTE.on) flipFx('stars', gp.setY(0.9), 2.2, 0.7, '#ffffff'); else flipFx('cloud', gp, 2.4, 1.0, W3.venue === 'field' ? '#b49a74' : W3.venue === 'castle' ? '#8a8378' : '#a7a9a6'); }
  if (G.simTime - f.foulVictimT < 1.6) { // knight marshal returns a fighter grounded by an illegal technique
    f.returnAt = G.simTime + 1.8; marshalCall('Fighter returns', `${label(f)} was grounded by an illegal technique`, 2);
  }
  f.mud = (f.mud || 0) + 0.35; G.lastDown = f; G.lastDownT = G.simTime; hype(0.22); netEvent('d', q3(f.groundPos.x), q3(f.groundPos.z));
  if (G.phase === 'fight' && G.match && !G.match.training) {
    const tn = t => t === 0 ? CLUBS.reavers.name : CLUBS[G.match.opp] ? CLUBS[G.match.opp].name : 'them';
    if (!COMM.firstDown && by) { COMM.firstDown = true; comm('first', { team: tn(by.team) }, 2); }
    else if (f.isPlayer) comm('pdown', { who: 'our fighter' }, 2);
    else if (by && by.isPlayer) comm('takedown', { how: howTxt.toLowerCase(), who: CAREER.name === 'You' ? 'number ' + by.num : CAREER.name }, 2);
    if (MT.zones && by && by.isPlayer) { MT.zones.push('down'); const el = (G.match.duel ? (G.match.overtime ? DUEL_OT : DUEL_TIME) : ROUND_TIME) - G.match.clock; if (MT.firstDownT == null || el < MT.firstDownT) MT.firstDownT = el; }
  }
  if (f.isPlayer) { G.shake = Math.max(G.shake, 0.5); toast('Grounded', 'bad', reason); ev('grounded'); rumble(1, 0.7, 380); if (f.groundStyle === 'fall') startCine(f, 1.3); }
  if (by && !by.isPlayer && by.trait === 'showboat' && isUp(by) && !by.action) by.saluteT = 1.1;
  if (by && by.isPlayer && f.team !== by.team) { G.saluteUntil = G.simTime + 3.5; toast('Takedown!', 'big', `${howTxt} · ${label(f)} is down`); AU.cheer(1.3); rumble(0.5, 0.9, 220); startCine(f, 1.5);
    const hy = perk(by, 'show.hype'), lg = perk(by, 'show.legend');
    if (hy || lg) { for (const m of G.fighters) if (m.team === by.team && isUp(m)) { m.buffT = lg ? 8 : 10; m.buffStab = Math.max(m.buffStab || 1, lg ? 1.15 : 1 + 0.05 * hy); m.buffImp = lg ? 1.1 : (m.buffImp || 1); } if (lg) { AU.cheer(1.6); setTimeout(() => toast('The crowd goes wild!', 'big', 'Your team is fired up'), 900); } } ev('takedown', { how, combo: how === 'trip' && f.comboTrip, weapon: by.weapon ? by.weapon.key : null }); }
  f.comboTrip = false;
  if (G.match && G.match.training && f.returnAt < 0) f.returnAt = G.simTime + 2.2; // the yard has no rounds: everyone gets back up
  if (G.match && G.match.duel && G.phase === 'fight') { if (by && by.team !== f.team) duelScore(by, DUEL_PTS.takedown + (G.match.pro ? 1 : 0), 'Takedown'); if (f.returnAt < 0) f.returnAt = G.simTime + 1.6; }
  G.needRoundCheck = true;
}

function marshalGround(f, reason, cite) {
  if (!isUp(f)) return;
  if (f.state === 'falling') return;
  breakClinch(f);
  f.state = 'grounded'; f.groundStyle = 'sit'; f.fallDir = { x: -Math.sin(f.facing), z: -Math.cos(f.facing) };
  groundFighter(f, reason, cite);
}

function clampToList(f) {
  const hw = LIST.W / 2 - f.radius, hl = LIST.L / 2 - f.radius;
  if (f.pos.x > hw) { f.pos.x = hw; if (f.vel.x > 0) f.vel.x = 0; } if (f.pos.x < -hw) { f.pos.x = -hw; if (f.vel.x < 0) f.vel.x = 0; }
  if (f.pos.z > hl) { f.pos.z = hl; if (f.vel.z > 0) f.vel.z = 0; } if (f.pos.z < -hl) { f.pos.z = -hl; if (f.vel.z < 0) f.vel.z = 0; }
}

// ---------- actions ----------
function swingTimes(f) { const w = f.weapon; const m = w ? w.mass * (w.hands === 2 ? 0.82 : 1) : 1; const ft = 1 + 0.35 * (f.fatigue || 0); const wq = 1 - 0.025 * weaponTier(f), rip = f.riposteT > G.simTime ? 0.55 : 1; return { wind: (0.12 + 0.055 * m) * ft * wq * rip, strike: (0.075 + 0.02 * m) * (1 + 0.15 * (f.fatigue || 0)), rec: (0.13 + 0.045 * m) * (1 - 0.05 * perk(f, 'steel.recover')) * ft * wq }; }
function startAction(f, kind, o = {}) {
  if (f.state !== 'standing' || f.action || f.cd > 0 || G.phase !== 'fight') return false;
  if ((kind === 'swing' || kind === 'shove') && !f.weapon && !f.clinch) return false;
  if (kind === 'tackle' && f.clinch) return false;
  if (f.guard && kind === 'swing') return false;
  if (G.match && G.match.metrics) { const actions = G.match.metrics.actions[f.team]; actions[kind] = (actions[kind] || 0) + 1; }
  f.action = { kind, t: 0, phase: 'windup', arc: o.arc || 'R2L', held: !!o.held, charge: o.charge || 0, hit: false, target: o.target || null };
  if (f.isPlayer && o.target) playerLunge(f, kind, o.target);
  if (kind === 'swing' && !o.held) f.action.wind = swingTimes(f).wind + (o.charge || 0) * 0.4;
  return true;
}

// the player's grappling buttons commit: square up to the target and step in so the move actually lands
const P_RANGE = { trip: 1.05, shove: 1.2, grab: 0.95 };
function playerLunge(f, kind, t) {
  if (!isUp(t)) return;
  const want = angTo(f.pos, t.pos); if (Math.abs(angDiff(f.facing, want)) < 1.1) { f.facing = want; f.wantFace = want; }
  const reach = P_RANGE[kind]; if (!reach) return;
  const gap = Math.hypot(t.pos.x - f.pos.x, t.pos.z - f.pos.z) - t.radius - reach + 0.15;
  if (gap <= 0 || gap > 1.25) return;
  const d = vnorm({ x: t.pos.x - f.pos.x, z: t.pos.z - f.pos.z }); const v = Math.min(8.5, gap / 0.12);
  f.vel.x = d.x * v; f.vel.z = d.z * v; f.dashT = 0.13;
}
function updateAction(f, dt) {
  const a = f.action; if (!a) return; const previousT = a.t; a.t += dt;
  if (a.kind === 'swing') {
    if (!f.weapon) { f.action = null; return; }
    const T = swingTimes(f);
    if (a.phase === 'windup') {
      if (a.feintAt && !a.held && a.t >= a.feintAt) a.cancel = true;
      if (a.cancel) { if (typeof feintCalled === 'function') feintCalled(f); f.action = null; f.cd = a.feintAt ? 0.05 : 0.12; return; }
      if (a.held) { if (a.t > T.wind) a.charge = Math.min(1, (a.t - T.wind) / (perk(f, 'steel.windup') ? 0.56 : 0.7)); if (a.t > T.wind + 2.5) a.held = false; return; }
      const need = a.wind || T.wind;
      if (a.t >= need) {
        a.phase = 'strike'; a.t = 0;
        f.gas = Math.max(0, f.gas - (0.03 + 0.018 * f.weapon.mass * (0.6 + a.charge)) * (1 - 0.2 * perk(f, 'lungs.endure')));
        f.fatigue = Math.min(1, (f.fatigue || 0) + 0.003 * f.weapon.mass * (0.6 + a.charge));
        if (f.weapon.special === 'squeak') AU.squeak(f.isPlayer ? 0.7 : vol(f) * 0.4); else AU.swing(f.weapon.mass > 1.8, f.isPlayer ? 0.8 : vol(f) * 0.35);
        if (a.charge > 0.3 && chance(f.isPlayer ? 0.6 : 0.2)) AU.grunt(f.isPlayer ? 0.7 : vol(f) * 0.4);
      }
    } else if (a.phase === 'strike') {
      if (!a.hit) {
        const contact = traceSwing(f, a, clamp(previousT / T.strike, 0, 1), clamp(a.t / T.strike, 0, 1));
        if (contact) { a.hit = true; resolveSwing(f, a, contact.blockedByAlly ? null : contact); }
      }
      if (a.t >= T.strike && a.phase === 'strike') {
        if (!a.hit) { a.hit = true; resolveSwing(f, a, null); }
        a.phase = 'recover'; a.t = 0;
      }
    } else if (a.t >= T.rec * (a.whiff ? 1.35 : 1)) { f.action = null; f.cd = 0.04; }
    return;
  }
  if (a.kind === 'tackle') { updateTackle(f, a, dt); return; }
  const spec = { shove: [0.1, 0.28], trip: [0.13, 0.27], grab: [0.12, 0.2], knee: [0.1, 0.22], throw: [0.17, 0.3], disarm: [0.14, 0.26] }[a.kind];
  if (a.phase === 'windup' && a.t >= spec[0]) {
    a.phase = 'recover'; a.t = 0;
    if (a.kind === 'shove') resolveShove(f);
    else if (a.kind === 'trip') resolveTrip(f);
    else if (a.kind === 'grab') resolveGrab(f);
    else if (a.kind === 'knee') resolveKnee(f);
    else if (a.kind === 'throw') resolveThrow(f);
    else if (a.kind === 'disarm') resolveDisarm(f);
  } else if (a.phase === 'recover' && a.t >= spec[1] * (a.failed ? 1.5 : 1)) { f.action = null; f.cd = 0.05; }
}

// shoulder or shield charge (BR 3.1): drive in at speed; miss and you over-commit
function updateTackle(f, a, dt) {
  if (a.phase === 'windup') {
    if (a.t >= 0.09) {
      a.phase = 'lunge'; a.t = 0; f.fatigue = Math.min(1, (f.fatigue || 0) + 0.012); const fw = fwd(f.facing); const v = Math.max(vlen(f.vel), 2.5) + 2.6;
      f.vel.x = fw.x * v; f.vel.z = fw.z * v; f.gas = Math.max(0, f.gas - 0.11); AU.whoosh(f.isPlayer ? 1 : 0.3);
      if (chance(f.isPlayer ? 0.55 : 0.3)) AU.yell(f.isPlayer ? 0.7 : vol(f) * 0.45);
    }
  } else if (a.phase === 'lunge') {
    if (!a.hit) {
      for (const o of G.fighters) {
        if (o.team === f.team || !isUp(o)) continue;
        const d = dist2(o.pos, f.pos); if (d > f.radius + o.radius + 0.3) continue;
        if (Math.abs(angDiff(f.facing, angTo(f.pos, o.pos))) > 0.95) continue;
        a.hit = true; resolveTackle(f, o); break;
      }
    }
    if (a.t >= 0.3) {
      a.phase = 'recover'; a.t = 0;
      if (!a.hit) { applyImpulse(f, fwd(f.facing), 0.55 + 0.1 * vlen(f.vel)); f.noStep = 0.12; a.whiff = true; if (f.isPlayer) toast('Tackle missed', 'bad', 'Over-committed. Steady yourself'); }
    }
  } else if (a.t >= (a.whiff ? 0.4 : 0.26)) { f.action = null; f.cd = 0.15; }
}
function resolveTackle(f, t) {
  const v = vlen(f.vel); const dir = vnorm({ x: t.pos.x - f.pos.x, z: t.pos.z - f.pos.z });
  let imp = 0.25 * v * Math.sqrt(massF(f) / massF(t)) * botScale(f, 1.35) * (f.shield ? 1.18 : 1) * (1 + 0.2 * perk(f, 'lungs.charger')) * (v > 4 && perk(f, 'lungs.freight') ? 1.6 : 1) * (1 - 0.2 * perk(t, 'iron.anchor'));
  if (meleeRolesOn() && f.ai.role === 'runner') imp *= 1.08;
  if (t.brace && facingDot(t, f) > 0.3) imp *= 0.55;
  applyImpulse(t, dir, imp, { type: 'tackle', by: f }); t.noStep = Math.max(t.noStep, 0.18);
  applyImpulse(f, { x: -dir.x, z: -dir.z }, 0.22 * massF(t) / massF(f));
  f.vel.x *= 0.3; f.vel.z *= 0.3; t.vel.x += dir.x * v * 0.3; t.vel.z += dir.z * v * 0.3;
  if (t.clinch) breakClinch(t);
  (f.shield ? AU.shieldHit : AU.thud).call(AU, 1.1, vol(f)); AU.clang(0.5, vol(f) * 0.6);
  sparks(new THREE.Vector3((f.pos.x + t.pos.x) / 2, 1.2, (f.pos.z + t.pos.z) / 2), 6, 0.8);
  if (f.isPlayer || t.isPlayer) { if (G.settings.shake) G.shake = Math.max(G.shake, 0.6); G.hitstop = 0.06; if (t.isPlayer) flashHit(); }
  if (f.isPlayer) { hitMark('#f2c40f'); toast('Tackle!', 'good'); t.tripWin = G.simTime + 1.0; ev('tackle'); }
}

function facingDot(f, o) { const fw = fwd(f.facing); const d = vnorm({ x: o.pos.x - f.pos.x, z: o.pos.z - f.pos.z }); return fw.x * d.x + fw.z * d.z; }

function findTarget(f, range, cone, includeDown) {
  let best = null, bs = 1e9;
  for (const o of G.fighters) {
    if (o.team === f.team || o.out) continue;
    const down = isDown(o); if (down && !includeDown) continue;
    if (!down && !isUp(o)) continue;
    const p = down ? o.groundPos : o.pos;
    const d = Math.hypot(p.x - f.pos.x, p.z - f.pos.z) - (down ? 0.3 : o.radius);
    if (d > range) continue;
    const ang = Math.abs(angDiff(f.facing, Math.atan2(p.x - f.pos.x, p.z - f.pos.z)));
    if (ang > cone) continue;
    const s = d + ang * 0.9 + (down ? 0.25 : 0);
    if (s < bs) { bs = s; best = o; }
  }
  return best;
}

// Sweep contact in duels and team fights; an ally can smother the edge.
function traceSwing(f, a, from, to) {
  const reach = 0.6 + f.weapon.len * 0.92 + f.reachB + 0.1 * perk(f, 'steel.reaper');
  const count = Math.max(2, Math.ceil((to - from) * 12));
  const forwardX = Math.sin(f.facing), forwardZ = Math.cos(f.facing);
  for (let i = 0; i <= count; i++) {
    let best = null, nearest = Infinity;
    const u = clamp(from + (to - from) * i / count, 0, 1);
    const side = a.arc === 'R2L' ? 1 : -1;
    const angle = f.facing + (a.arc === 'O' ? 0 : side * (1.15 - 2.3 * u));
    const aim = f.isPlayer && isCtl() ? FP.pitch : (f.aimPitch || 0);
    const y = a.arc === 'O' ? 2.05 - 1.25 * u : clamp(1.28 + Math.tan(aim) * 1.5, 0.55, 1.82);
    const tip = { x: f.pos.x + Math.sin(angle) * reach, y, z: f.pos.z + Math.cos(angle) * reach };
    const base = { x: f.pos.x + Math.sin(f.facing) * 0.45, y: 1.35, z: f.pos.z + Math.cos(f.facing) * 0.45 };
    for (const t of G.fighters) {
      if (t === f || t.out || (!isUp(t) && !isDown(t))) continue;
      const down = isDown(t), h = (t.body && t.body.h || 1.8) / 1.8, p = down ? t.groundPos : t.pos;
      if (down && a.arc !== 'O') continue;
      if ((p.x - f.pos.x) * forwardX + (p.z - f.pos.z) * forwardZ < -0.05) continue;
      if (dist2(f.pos, p) > reach + t.radius + 0.3) continue;
      const right = { x: Math.cos(t.facing), z: -Math.sin(t.facing) };
      const zones = down ? [['torso', p.x, 0.5, p.z, 0.38]] : [
        ['helmet', p.x, 1.7 * h, p.z, 0.26], ['torso', p.x, 1.25 * h, p.z, 0.42],
        ['armL', p.x - right.x * 0.43, 1.28 * h, p.z - right.z * 0.43, 0.24],
        ['armR', p.x + right.x * 0.43, 1.28 * h, p.z + right.z * 0.43, 0.24],
        ['legs', p.x, 0.57 * h, p.z, 0.34]
      ];
      for (const [zone, x, zy, z, radius] of zones) {
        const vx = tip.x - base.x, vy = tip.y - base.y, vz = tip.z - base.z;
        const dx = base.x - x, dy = base.y - zy, dz = base.z - z;
        const lengthSq = vx * vx + vy * vy + vz * vz, r = radius + 0.09;
        const b = dx * vx + dy * vy + dz * vz, c = dx * dx + dy * dy + dz * dz - r * r;
        const discriminant = b * b - lengthSq * c;
        if (lengthSq < 1e-9 || discriminant < 0) continue;
        const entry = c <= 0 ? 0 : (-b - Math.sqrt(discriminant)) / lengthSq;
        if (entry < 0 || entry > 1 || entry >= nearest) continue;
        nearest = entry;
        const edge = new THREE.Vector3(base.x + vx * entry, base.y + vy * entry, base.z + vz * entry);
        const normal = edge.clone().sub(new THREE.Vector3(x, zy, z)).normalize();
        if (normal.lengthSq() < 1e-9) normal.set(-vx, -vy, -vz).normalize();
        const surface = c <= 0 ? new THREE.Vector3(x, zy, z).addScaledVector(normal, radius) : edge.addScaledVector(normal, -0.09);
        best = t.team === f.team ? { blockedByAlly: true } : { target: t, zone, pos: surface, normal };
      }
    }
    if (best) return best;
  }
  return null;
}
function sweptSwingTarget(f, a, from, to) { const contact = traceSwing(f, a, from, to); return contact && contact.target || null; }
function resolveSwing(f, a, contact) {
  const w = f.weapon; if (!w) return;
  const reach = 0.6 + w.len * 0.92 + f.reachB + 0.1 * perk(f, 'steel.reaper');
  const t = contact === undefined ? findTarget(f, reach, a.arc === 'O' ? 0.55 + 0.1 * perk(f, 'steel.overhead') : 1.25, a.arc === 'O') : contact && (contact.target || contact);
  if (!t) { // whiff: over-commit
    if (G.match && G.match.metrics) G.match.metrics.whiffs[f.team]++;
    a.whiff = true; const fw = fwd(f.facing); applyImpulse(f, fw, (0.32 + 0.4 * a.charge) * (G.player && f !== G.player && f.team !== 0 && dist2(G.player.pos, f.pos) < reach + 0.6 && perk(G.player, 'lungs.slip') ? 1.25 : 1));
    if (f.isPlayer) { toast('Miss', 'bad', a.charge > 0.5 ? 'Big swings over-commit you' : ''); ev('miss'); }
    return;
  }
  const gap = dist2(f.pos, t.pos);
  if (weaponBindPossible(f, t, gap)) { resolveWeaponBind(f, t, a); return; }
  const tipSpeed = (a.arc === 'O' ? 10.5 : 11.5) * (0.78 + 0.42 * a.charge) * Math.sqrt(0.5 + 0.5 * f.gas) * (0.82 + 0.22 * w.len) / Math.pow(w.mass, 0.3);
  const p = w.mass * tipSpeed;
  let imp = 0.3 * Math.sqrt(p) * f.arch.power * botScale(f, 1.35);
  const sp = w.special; if (sp === 'squeak') imp *= 0.22;
  imp *= (1 + 0.04 * perk(f, 'steel.heavy')) * (a.arc === 'O' ? 1 + 0.12 * perk(f, 'steel.overhead') : 1) * (f.buffT > 0 ? f.buffImp || 1 : 1);
  if (perk(f, 'steel.combo')) { f.comboN = G.simTime - (f.lastHitT || -9) < 1.2 ? Math.min(3, (f.comboN || 0) + 1) : 0; f.lastHitT = G.simTime; imp *= 1 + 0.08 * f.comboN; if (f.comboN >= 2) toast(`Combo x${f.comboN + 1}`, 'good'); }
  imp *= 1 - 0.04 * perk(t, 'iron.thick');
  imp *= mod(f, 'imp');
  imp *= 1 + Math.min(0.3, closingSpeed(f, t) * 0.06); // momentum: a blow thrown while closing in hits harder
  if (CUTE.on) imp *= 0.86; // rubber swords and foam kit: bonks, not blows
  if (t.isPlayer && t.up) imp *= (1 - 0.05 * (t.up.padding || 0)) * (1 - 0.03 * armourTier(t, 'body')); // thicker gambeson, better breastplate
  imp *= 1 + 0.03 * weaponTier(f) + pfx(f, 'imp'); // better-made weapon, pommel, runes, drills
  imp *= 1 - pfx(t, 'push'); // rune of iron skin
  const tp = isDown(t) ? t.groundPos : t.pos;
  const dlen = Math.hypot(tp.x - f.pos.x, tp.z - f.pos.z) || 1;
  // A long weapon needs room to accelerate. At clinch distance the haft or
  // hilt lands, not the striking part; this is no full-power or scoring blow.
  const leverage = swingLeverage(w, dlen);
  imp *= leverage; a.smothered = leverage < 0.7;
  let dir = { x: (tp.x - f.pos.x) / dlen, z: (tp.z - f.pos.z) / dlen };
  if (a.arc !== 'O') { const s = a.arc === 'R2L' ? 1 : -1; const tan = { x: -dir.z * s, z: dir.x * s }; dir = vnorm({ x: dir.x + tan.x * 0.55, z: dir.z + tan.z * 0.55 }); }
  const hitPos = contact && contact.pos ? contact.pos.clone() : new THREE.Vector3(tp.x - dir.x * 0.25, 1.35, tp.z - dir.z * 0.25);
  G.stats.hits++; f.stats.hits++;
  if (G.match && G.match.metrics) G.match.metrics.hits[f.team]++;
  // ---- fouls ----
  if (isDown(t)) { if (!contact || !contact.pos) hitPos.y = 0.7; reportFoul(f, t, 'grounded'); AU.armourHit(0.6, vol(f)); sparks(hitPos, 5); return; }
  const behind = facingDot(t, f) < -0.55;
  if (a.arc === 'O' && behind && chance(0.22)) reportFoul(f, t, 'skull');
  // ---- guard ----
  const facingAtt = facingDot(t, f) > 0.3;
  let zone = contact && contact.zone || null, blocked = false, go = null;
  if (t.guard && t.state === 'standing' && facingAtt) {
    blocked = true; let bf = t.shield ? t.shield.block : t.weapon && t.weapon.special === 'sign' ? 0.38 : 0.62; go = guardOutcome(f, t, a, bf); bf = go.bf; imp *= bf * (1 - 0.12 * perk(t, 'iron.wall')); zone = 'shield'; G.stats.blocks++;
    if (G.match && G.match.metrics) G.match.metrics.guards[t.team]++;
    // perfect block: guard raised just before the blow lands. No breath spent, and the attacker is thrown off balance
    const perfect = !go.wrong && !go.mid && (G.simTime - (t.guardAt || -9) < (t.isPlayer || t.netUid || t.vin ? 0.2 : 0.12) || go.parry);
    if (perfect) { imp *= 0.35; t.riposteT = G.simTime + 0.8; applyImpulse(f, { x: -dir.x, z: -dir.z }, 0.55); f.cd = Math.max(f.cd, 0.45); sparks(new THREE.Vector3(t.pos.x + dir.x * -0.4, 1.3 * t.body.h / 1.8, t.pos.z + dir.z * -0.4), 16, 1.3, '#fff3b0');
      if (t.isPlayer) { toast('Perfect block!', 'big', 'They’re off balance. Hit back!'); comm('perfect', {}, 2); ev('perfect'); MT.perfect = (MT.perfect || 0) + 1; if (MT.perfect >= 5) unlock('perfect5'); impactFeel('heavy', null, 0.6); } }
    else {
      t.gas = Math.max(0, t.gas - (0.02 + 0.016 * (w.mass || 1.5)) * (t.shield ? 0.8 : 1)); // heavier weapons cost more breath to stop
      if (t.gas < 0.06 && imp > 0.9) { t.guard = false; t.guardBroken = G.simTime + 0.8; imp /= bf; blocked = false; zone = 'torso'; if (t.isPlayer) toast('Guard broken!', 'bad', 'Too tired to hold it up'); else if (f.isPlayer) toast('Guard broken!', 'big', 'They’re out of breath'); }
    }
    AU.block(t.shield ? t.shield.key : (t.weapon && t.weapon.haft ? 'haft' : 'clash'), 0.6 + imp * 0.3, vol(t));
    if (!contact || !contact.pos) hitPos.y = 1.25;
  } else if (zone) {
    if (zone === 'legs' && behind && chance(0.18)) reportFoul(f, t, 'knee');
    if (sp === 'squeak') AU.squeak(vol(t)); else if (sp === 'bong' && zone === 'helmet') AU.bong(vol(t)); else AU.armourHit(0.55 + imp * 0.35, vol(t));
  } else {
    const r = Math.random();
    // you land where you aim: the height your view points at on them picks the zone most of the time
    let aimZ = null;
    if (f.isPlayer && isCtl()) { const ay = f.body.h * 0.935 + Math.tan(FP.pitch) * dist2(f.pos, t.pos), th = t.body.h; aimZ = ay > th * 0.88 ? 'helmet' : ay < th * 0.48 ? 'legs' : 'torso'; f.aimZ = aimZ; }
    if (aimZ && chance(0.72)) { zone = aimZ === 'torso' && chance(0.3) ? (a.arc === 'R2L' ? 'armL' : 'armR') : aimZ; if (a.arc === 'O' && zone === 'legs') zone = 'torso'; }
    else if (a.arc === 'O') zone = r < 0.62 ? 'helmet' : r < 0.82 ? 'armR' : 'armL';
    else zone = r < 0.18 ? 'helmet' : r < 0.42 ? (a.arc === 'R2L' ? 'armL' : 'armR') : r < 0.92 ? 'torso' : 'legs';
    if (zone === 'helmet') hitPos.y = 1.7; else if (zone === 'legs') hitPos.y = 0.6;
    if (zone === 'legs' && behind && chance(0.18)) reportFoul(f, t, 'knee'); // back of the knee is off target (BR 6)
    if (sp === 'squeak') AU.squeak(vol(t)); else if (sp === 'bong' && zone === 'helmet') AU.bong(vol(t)); else AU.armourHit(0.55 + imp * 0.35, vol(t));
  }
  if (!contact || !contact.pos) hitPos.y *= t.body.h / 1.8;
  if (t.brace) imp *= 0.78 * (perk(t, 'iron.brace') ? 0.85 : 1);
  applyImpulse(t, dir, imp, { type: 'hit', by: f });
  // hit stun: struck mid-wind-up and the swing is lost, unless braced
  if (!blocked && imp > 0.6 && t.action && t.action.kind === 'swing' && t.action.phase === 'windup' && !t.brace) { t.action = null; t.cd = Math.max(t.cd, 0.28); if (t.isPlayer) toast('Swing knocked off!', 'bad', 'They struck first. Brace or guard'); else if (f.isPlayer) MT.interrupts = (MT.interrupts || 0) + 1; }
  if (!blocked && a.charge > 0.85 && perk(f, 'steel.thunder')) { // Thunderclap: the blow staggers everyone round the target
    for (const o of G.fighters) if (o !== t && o.team !== f.team && isUp(o) && dist2(o.pos, t.pos) < 1.9) applyImpulse(o, vnorm({ x: o.pos.x - t.pos.x, z: o.pos.z - t.pos.z }), 0.6, { type: 'hit', by: f });
    sparks(hitPos, 22, 1.6, '#f2c40f'); toast('Thunderclap!', 'big'); G.shake = Math.max(G.shake, 0.5);
  }
  if (!blocked && imp > 1.15 && perk(f, 'show.taunt')) for (const o of G.fighters) if (o.team !== f.team && isUp(o) && dist2(o.pos, f.pos) < 3) applyImpulse(o, vnorm({ x: rand(-1, 1), z: rand(-1, 1) }), 0.22);
  sparks(hitPos, blocked ? 6 : 12, 0.8 + imp * 0.3);
  t.gas = Math.max(0, t.gas - 0.012 * imp);
  if (!blocked) {
    const prot = zone === 'helmet' ? t.helm.prot : 1;
    if (zone !== 'torso') {
      // A helmet failure is a one-time equipment event.  Once the helmet is
      // off, a later head strike is still a legal target and knocks the
      // unprotected fighter down, but must not drop/rebuild the head model.
      if (zone === 'helmet' && t.kit.helmet && t.kit.helmet.failed && !t.kit.helmet.covered) {
        marshalGround(t, 'second head strike after helmet failure', 'REG 5.4.2');
      } else wearPiece(t, zone, p * 0.0055 * leverage / prot);
    }
    if (zone === 'helmet' && imp > 1.05) t.bell = Math.min(1, t.bell + (imp - 0.9) * 0.9 * (perk(f, 'steel.ringer') ? 1.35 : 1) * (perk(t, 'iron.neck') ? 0.6 : 1) * (1 - 0.06 * armourTier(t, 'helmet')) * (1 - pfx(t, 'bell')));
    if (zone === 'armR' && t.weapon && chance(0.045 * (0.5 + a.charge) * (sp === 'pry' ? 5 : 1) * (1 + 0.6 * perk(f, 'steel.armbreak')) * (t.up ? 1 - 0.25 * (t.up.gauntlets || 0) : 1) * (1 - pfx(t, 'disarm')))) disarm(t, sp === 'pry' ? 'pried loose with a wrench' : 'knocked loose');
    if (sp) specialHit(f, t, sp, zone, hitPos);
  } else if (t.shield) { /* shield soaks it */ } else wearPiece(t, 'haft', 0.02);
  if (f.weapon.haft) wearPiece(f, 'haft', 0.006);
  if (f.weapon.haft && f.weapon.hands === 2 && blocked && imp > 1.0 && f.kit.haft && chance((0.012 + 0.05 * Math.max(0, 0.5 - f.kit.haft.cond)) * (1 - 0.15 * weaponTier(f)))) { f.kit.haft.failed = true; disarm(f, 'snapped at the haft'); marshalCall('Broken weapon!', `${label(f)}: haft snapped`, 2); if (f.isPlayer) toast('Your haft snapped!', 'bad', 'Tape it between rounds'); }
  if (G.match && G.match.duel && !blocked && !a.smothered && imp >= 0.55 && G.phase === 'fight' && !(G.mod.headhunter && zone !== 'helmet')) duelScore(f, DUEL_PTS[zone] || 1, { helmet: 'Head', torso: 'Body', armL: 'Arm', armR: 'Arm', legs: 'Leg' }[zone] || 'Hit');
  if (f.isPlayer && !blocked && MT.zones) MT.zones.push(zone);
  if (!blocked && G.match) { const ht = G.match.hitsT || (G.match.hitsT = [0, 0]); ht[sideOf(f)]++; }
  if (f.isPlayer) ev('hit', { big: !blocked && imp > 1.15, blocked, zone, arc: a.arc, weapon: w.key });
  if (t.isPlayer && blocked) { ev('block'); rumble(0.35, 0.35, 90); }
  if (f.isPlayer) { hitMark(blocked ? '#8d979a' : imp > 1.15 ? '#f2c40f' : '#ffffff'); toast(blocked ? (go && go.wrong ? 'Half through!' : 'Blocked') : imp > 1.15 ? 'Big hit!' : 'Hit', blocked ? (go && go.wrong ? 'good' : 'bad') : imp > 1.15 ? 'big' : 'good', blocked ? (go && go.wrong ? 'They guarded the wrong side. Keep mixing it up.' : 'They had their guard up. Mix your sides, feint, or shield-bash.') : zone === 'helmet' ? 'Helmet. Ringing their bell.' : ''); }
  else if (t.isPlayer && blocked) toast(go && go.wrong ? 'Wrong side!' : go && go.mid ? 'Half blocked' : 'Blocked', go && (go.wrong || go.mid) ? 'bad' : 'info', go && go.wrong ? `It came in ${{ L: 'on your left', R: 'on your right', H: 'overhead' }[ARC_SIDE[a.arc]]}.` : go && go.mid ? 'Flick toward the blow for a full block.' : '');
  if (t.isPlayer || f.isPlayer) {
    impactFeel(blocked ? 'block' : t.isPlayer ? 'taken' : imp > 1.15 ? 'heavy' : 'light', a.arc === 'O' ? null : dir, clamp(imp, 0.5, 1.6));
    if (t.isPlayer && !blocked) flashHit();
    if (f.isPlayer && !blocked && imp > 1.15 && !CUTE.on) AU.cheer(0.55); // the crowd's "ooh" on a big one
    if (t.isPlayer && !blocked) AU.grunt(0.45); // your own grunt, inside the helm
  }
  if (CUTE.on && !blocked) t.squashT = 0.3; // foam kids squish when bonked
  netEvent(blocked ? 'b' : 'h', q3(hitPos.x), q3(hitPos.y), q3(hitPos.z), q3(imp));
  if (!blocked && imp > 1.0 && !CUTE.on) flipFx('impact', hitPos, 0.55 + imp * 0.35, 0.22, '#fff6d8', true);
}

function swingLeverage(w, distance) {
  return clamp(distance / (0.45 + 0.6 * w.len), 0.35, 1);
}

function weaponBindPossible(f, t, distance) {
  const other = t.action;
  return !!(f.weapon && t.weapon && f.weapon.hands === 2 && t.weapon.hands === 2
    && !f.clinch && !t.clinch && !t.guard && t.state === 'standing'
    && other && other.kind === 'swing' && other.phase === 'strike' && !other.hit
    && distance > f.radius + t.radius && distance < Math.min(reachOf(f), reachOf(t)) + 0.2
    && facingDot(f, t) > 0.45 && facingDot(t, f) > 0.45);
}

function resolveWeaponBind(f, t, a) {
  const other = t.action;
  a.phase = other.phase = 'recover'; a.t = other.t = 0;
  a.hit = other.hit = true; a.bind = other.bind = true;
  f.bindT = t.bindT = 0.3;
  f.gas = Math.max(0, f.gas - 0.025); t.gas = Math.max(0, t.gas - 0.025);
  f.vel.x *= 0.55; f.vel.z *= 0.55; t.vel.x *= 0.55; t.vel.z *= 0.55;
  G.stats.binds = (G.stats.binds || 0) + 1;
  const pos = new THREE.Vector3((f.pos.x + t.pos.x) / 2, 1.35, (f.pos.z + t.pos.z) / 2);
  sparks(pos, 9, 0.65); AU.block('clash', 0.8, Math.max(vol(f), vol(t)));
  if (f.isPlayer || t.isPlayer) {
    impactFeel('block', null, 0.7);
    toast('Weapons bind!', 'info', 'Step, shove, or grab when the blades meet.');
  }
}

// the Special rack's tricks
function specialHit(f, t, sp, zone, pos) {
  const P = f.isPlayer;
  if (sp === 'bong' && zone === 'helmet') { t.bell = Math.min(1, t.bell + 0.45); if (P) toast('BONG!', 'big', 'Their bell is ringing'); }
  else if (sp === 'burn') { t.gas = Math.max(0, t.gas - 0.08); sparks(pos, 14, 1, '#ff7a1a'); if (P) toast('Scorched', 'good', 'Their stamina is burning'); }
  else if (sp === 'shock') { t.noStep = Math.max(t.noStep, 0.35); t.tripWin = G.simTime + 0.9; sparks(pos, 16, 1.2, '#7fd8ff'); AU.crackle(vol(t)); if (P) toast('Zapped!', 'good', 'Legs locked. Trip now!'); }
  else if (sp === 'frost') { t.slowT = 1.8; sparks(pos, 10, 0.8, '#c9f2ff'); if (P) toast('Frozen', 'good', 'They are slowed'); }
  else if (sp === 'leech') { f.gas = Math.min(1, f.gas + 0.07); sparks(pos, 8, 0.7, '#b98cff'); }
  else if (sp === 'squeak') { AU.cheer(0.9); if (P && chance(0.5)) toast('Squeak!', 'good', 'The crowd loves it'); }
}
// duel points: a little floating call for every score
function duelScore(f, pts, what) {
  const m = G.match; m.pts[f.team] += pts;
  if (f.team === 1) netEvent('t', `+${pts} ${what}`, pts >= 3 ? 'big' : 'good', `${m.pts[1]}–${m.pts[0]}`);
  if (f.isPlayer) { toast(`+${pts} ${what}`, pts >= 3 ? 'big' : 'good', `${m.pts[0]}–${m.pts[1]}`); const a = $('#rwA'); a.classList.remove('bump'); void a.offsetWidth; a.classList.add('bump'); }
  else if (f.team !== 0 && G.player) { const b = $('#rwB'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } // their points pulse on the scoreboard instead of covering your view
  feed(`${label(f)}: ${what.toLowerCase()} +${pts}. ${m.pts[0]}–${m.pts[1]}.`, '', teamColor(f));
}
function isMale(f) { return G.match && G.match.category === 'men'; }
function vol(f) { if (BOUT.inSim) return boutEar(f.pos.x, f.pos.z); return G.player ? clamp(1.25 - dist2(G.player.pos, f.pos) / 18, 0.2, 1) : 0.7; }

function resolveShove(f) {
  const P = f.isPlayer; const t = findTarget(f, 1.2 + (P ? 0.3 : 0), P ? 1.2 : 0.95, false); f.gas = Math.max(0, f.gas - 0.055 * (1 - 0.2 * perk(f, 'lungs.endure')));
  if (!t) { applyImpulse(f, fwd(f.facing), 0.25); if (P) toast('Shove missed', 'bad', 'Get closer first'); return; }
  const dir = vnorm({ x: t.pos.x - f.pos.x, z: t.pos.z - f.pos.z });
  let imp = (f.shield ? 1.35 : 1.05) * (0.6 + 0.4 * f.gas) * Math.sqrt(massF(f) / massF(t)) * f.arch.power * botScale(f, 1.35) * (P ? 1.2 : 1) * (f.weapon && f.weapon.special === 'sweep' ? 1.45 : 1) * (1 + 0.07 * perk(f, 'grapple.shove'));
  const braced = t.brace && facingDot(t, f) > 0.2; if (braced) imp *= 0.5;
  // shield bash: a shield driven into a raised guard knocks it open
  if (f.shield && t.guard && facingDot(t, f) > 0.3) { t.guard = false; t.guardBroken = G.simTime + 0.7; if (t.ai) t.ai.guardT = -1; imp *= 1.15; if (P) toast('Shield bash!', 'big', 'Their guard is open. Hit them!'); else if (t.isPlayer) toast('Shield bash!', 'bad', 'Your guard was knocked aside'); }
  applyImpulse(t, dir, imp, { type: 'shove', by: f });
  applyImpulse(f, { x: -dir.x, z: -dir.z }, 0.22);
  if (P) { t.vel.x += dir.x * 1.9 * (braced ? 0.4 : 1); t.vel.z += dir.z * 1.9 * (braced ? 0.4 : 1); t.tripWin = G.simTime + (perk(f, 'grapple.opportunist') ? 1.5 : 1.0); hitMark('#ffffff'); toast(braced ? 'Shove: they braced' : 'Shoved!', braced ? 'bad' : 'good', braced ? '' : 'They\u2019re stumbling. Trip now!'); ev('shove'); }
  (f.shield ? AU.shieldHit : AU.thud).call(AU, 0.9, vol(f));
  if (t.clinch) breakClinch(t);
}

function resolveTrip(f) {
  const P = f.isPlayer; const t = findTarget(f, 1.05 + (P ? 0.3 : 0) + 0.15 * perk(f, 'grapple.longarms'), 1.4, false); f.gas = Math.max(0, f.gas - 0.07); G.stats.trips++;
  if (!t) { f.noStep = 0.2; f.action.failed = true; if (P) toast('Trip missed', 'bad', 'Nobody in reach'); return; }
  const ratio = vlen(t.lean) / FALL_L;
  const fromSide = facingDot(t, f) < 0.35;
  let p = 0.05 + 0.72 * ratio + (fromSide ? 0.16 : 0) + (t.stepRem > 0 ? 0.15 : 0) + (t.sprint ? 0.1 : 0) - (t.brace ? 0.28 : 0) - (t.guard ? 0.06 : 0) + (f.arch.key === 'grappler' || f.arch.key === 'runner' ? 0.08 : 0);
  p += 0.12 * (f.gas - t.gas);
  if (t.clinch && t.clinch !== f.clinch) p += 0.18; // tied up by your teammate
  const combo = G.simTime < (t.tripWin || 0);
  if (P) p += 0.08 + (combo ? 0.22 : 0); // the shove-then-trip combo
  if (f.weapon && f.weapon.special === 'hook') p += 0.16; // hockey stick
  if (meleeRolesOn() && f.ai.role === 'runner') p += 0.08;
  p += 0.04 * perk(f, 'grapple.ankle') + (G.simTime < (f.chainT || 0) ? 0.25 : 0);
  if (chance(clamp(p, 0.05, 0.92))) {
    if (P) { hitMark('#f2c40f'); toast('Tripped!', 'big'); ev('trip', { ok: true, combo }); t.comboTrip = combo; }
    G.stats.tripsOk++;
    const dir = vnorm({ x: t.pos.x - f.pos.x + t.lean.x * 2, z: t.pos.z - f.pos.z + t.lean.z * 2 });
    t.noStep = 0.65; applyImpulse(t, dir, 1.45 * botScale(f, 1.35), { type: 'trip', by: f });
    if (t.clinch) breakClinch(t);
    AU.thud(0.6, vol(f));
  } else {
    f.action.failed = true; f.noStep = 0.3; applyImpulse(f, vnorm({ x: t.pos.x - f.pos.x, z: t.pos.z - f.pos.z }), 0.45);
    if (P) { toast('Trip failed', 'bad', t.brace ? 'They were braced' : ratio < 0.3 ? 'Too steady. Shove or hit them first' : 'So close. Again!'); ev('trip', { ok: false }); }
  }
}

function resolveGrab(f) {
  const P = f.isPlayer;
  // a seized polearm haft: grab again to twist it out of their hands
  if (f.haftOn && G.simTime < f.haftUntil && isUp(f.haftOn) && f.haftOn.weapon) {
    const t = f.haftOn; f.haftOn = null;
    if (chance(0.55 + 0.1 * (f.arch.grip - t.arch.grip) + (f.gas - t.gas) * 0.3)) { disarm(t, 'twisted out of their hands'); if (P) { toast('Yoinked the polearm!', 'big', 'They have to run for a reserve'); ev('disarm'); } else if (t.isPlayer) toast('Haft twisted away!', 'bad', 'Get to your weapon zone'); }
    else { if (P) toast('They held on', 'bad'); applyImpulse(f, vnorm({ x: f.pos.x - t.pos.x, z: f.pos.z - t.pos.z }), 0.35); }
    return;
  }
  const far = findTarget(f, 1.95, 1.0, false);
  if (far && far.weapon && far.weapon.haft && far.weapon.hands === 2 && dist2(far.pos, f.pos) > 1.0 && !f.clinch && !far.clinch) { // grab the haft of a polearm (legal: BR 3.5)
    if (chance(far.brace ? 0.35 : 0.6)) { f.haftOn = far; f.haftUntil = G.simTime + 1.6; far.cd = Math.max(far.cd, 1.2); if (far.action && far.action.kind === 'swing') far.action = null; AU.thud(0.5, vol(f));
      if (P) toast('Haft seized!', 'good', 'Grab again to twist it away'); else if (far.isPlayer) toast('They grabbed your haft!', 'info', 'Shove or back off'); feed(`${label(f)} grabs ${label(far)}'s polearm haft.`, 'BR 3.5', teamColor(f)); }
    else if (P) toast('Missed the haft', 'bad');
    return;
  }
  const t = findTarget(f, 0.95 + (P ? 0.3 : 0) + 0.15 * perk(f, 'grapple.longarms'), P ? 1.2 : 1.0, false);
  if (!t || t.clinch || f.clinch || t.state !== 'standing') { f.action.failed = true; if (P) toast('Grab missed', 'bad', t && t.clinch ? 'Already tied up' : 'Get closer first'); return; }
  const c = { a: f, b: t, t: 0, idle: 0 }; f.clinch = c; t.clinch = c; G.clinches.push(c);
  t.action = null; AU.thud(0.6, vol(f));
  if (P) { toast('Clinch!', 'good', 'Swing = knee · Trip = throw · Grab = disarm'); ev('grab'); }
  else if (t.isPlayer) toast('Grabbed!', 'info', 'Shove to break free, or trip to throw');
}
function resolveKnee(f) { // free-hand punch or knee inside the clinch (BR 3.1)
  const c = f.clinch; if (!c) return; const t = c.a === f ? c.b : c.a;
  const dir = vnorm({ x: t.pos.x - f.pos.x, z: t.pos.z - f.pos.z });
  applyImpulse(t, dir, 0.42 * f.arch.power * botScale(f, 1.35), { type: 'hit', by: f }); t.gas = Math.max(0, t.gas - 0.045); f.gas = Math.max(0, f.gas - 0.03);
  AU.thud(0.8, vol(f)); c.idle = Math.max(0, c.idle - 1.5);
  if (f.isPlayer) { hitMark('#ffffff'); toast('Knee', 'good'); ev('knee'); }
}
function resolveThrow(f) { // hip throw or trip from the clinch (BR 3.4)
  const c = f.clinch; if (!c) return; const t = c.a === f ? c.b : c.a; f.gas = Math.max(0, f.gas - 0.08);
  let p = 0.18 + 0.5 * (f.gas - t.gas) + 1.4 * vlen(t.lean) / FALL_L + (f.arch.grip - 1) * 0.5 - (t.brace ? 0.2 : 0) + (massF(f) - massF(t)) * 0.4 + (f.up ? 0.04 * (f.up.gauntlets || 0) : 0) + pfx(f, 'grip') + 0.1 * perk(f, 'grapple.grip');
  if ((perk(f, 'grapple.suplex') && t.gas < 0.4) || chance(clamp(p, 0.06, 0.88))) {
    breakClinch(f);
    const side = chance(0.5) ? 1 : -1; const d = vnorm({ x: t.pos.x - f.pos.x, z: t.pos.z - f.pos.z });
    const dir = vnorm({ x: d.x - d.z * side * 0.8, z: d.z + d.x * side * 0.8 });
    t.noStep = 0.7; applyImpulse(t, dir, 1.7 * botScale(f, 1.35) * (1 + 0.25 * perk(f, 'grapple.hiptoss')), { type: 'throw', by: f }); AU.thud(1, vol(f)); if (perk(f, 'grapple.chain')) f.chainT = G.simTime + 3;
    if (f.isPlayer) { hitMark('#f2c40f'); toast('Thrown!', 'big'); ev('throw'); }
  } else { f.action.failed = true; f.noStep = 0.25; applyImpulse(f, vnorm({ x: t.pos.x - f.pos.x, z: t.pos.z - f.pos.z }), 0.38); c.idle = Math.max(0, c.idle - 1); if (f.isPlayer) toast('Throw failed', 'bad', 'Wear them down with knees first'); }
}
function resolveDisarm(f) { // grabbing the haft or hilt, never the blade (BR 3.3)
  const c = f.clinch; if (!c) return; const t = c.a === f ? c.b : c.a;
  if (!t.weapon) { f.action.failed = true; return; }
  const p = (0.2 + 0.45 * (f.gas - t.gas) + (f.arch.grip - 1) * 0.4 + 0.15 * perk(f, 'grapple.pickpocket')) * (t.up ? 1 - 0.25 * (t.up.gauntlets || 0) : 1) * (1 - pfx(t, 'disarm'));
  if (chance(clamp(p, 0.05, 0.7))) { disarm(t, `taken by ${label(f)}`); if (f.isPlayer) { toast('Disarmed them!', 'big'); ev('disarm'); } } else { f.action.failed = true; c.idle = Math.max(0, c.idle - 1); if (f.isPlayer) toast('Disarm failed', 'bad'); }
}

function disarm(f, how) {
  if (!f.weapon) return;
  dropWeaponProp(f);
  f.weapon = null; setWeaponModel(f); if (f.action && f.action.kind === 'swing') f.action = null;
  feed(`${label(f)} disarmed, weapon ${how}. A weapon lying flat can't be picked up.`, 'BR 3.5, 3.6', teamColor(f));
  if (f.spec.sidearm && !f.sidearmUsed) f.sidearmT = 1.3;
  AU.block('clash', 0.6, vol(f));
}

function updateRearm(f, dt) {
  if (f.weapon) return;
  if (f.sidearmT > 0) {
    f.sidearmT -= dt;
    if (f.sidearmT <= 0) { f.weapon = WEAPONS.short; f.sidearmUsed = true; setWeaponModel(f); AU.play('drawS0', 0.5 * vol(f)); feed(`${label(f)} draws the sidearm.`, 'BR 3.6', teamColor(f)); }
    return;
  }
  const sd = sideOf(f), zn = W3.zones[sd];
  if (Math.hypot(f.pos.x - zn.x, f.pos.z - zn.z) < 1.5 && G.reserves[sd] > 0) {
    f.rearmT += dt;
    if (f.rearmT > 0.6) {
      f.rearmT = 0; G.reserves[sd]--; f.weapon = WEAPONS.sword; setWeaponModel(f);
      const rs = G.reserveMeshes[sd].pop(); if (rs) rs.visible = false;
      feed(`${label(f)} takes a reserve passed over the rail.`, 'BR 3.6.2', teamColor(f));
    }
  } else f.rearmT = 0;
}

// ---------- armour wear ----------
function wearPiece(f, piece, amount) {
  const p = f.kit[piece]; if (!p) return;
  if (piece === 'haft' && !(f.weapon && f.weapon.haft && f.weapon.key === f.spec.weapon)) return;
  const mult = (p.tape ? TAPES[p.tape].wear : 1) * (G.mod && G.mod.glass ? 3 : 1) * pieceWearMult(f, piece);
  p.cond = Math.max(0, p.cond - amount * mult);
  if (p.failed && p.covered && p.cond <= 0.12) { failPiece(f, piece); return; }
  if (p.failed) return;
  if (p.cond < 0.3 && chance(0.1 + (0.3 - p.cond) * 2.0)) failPiece(f, piece);
}
function failPiece(f, piece) {
  const p = f.kit[piece];
  if (piece === 'haft') { if (!p.failed) { p.failed = true; if (f.isPlayer) feed('Your haft wrap is torn. Rewrap it before the next round.', 'WR 7.2.2', teamColor(f)); } return; }
  const melee = G.match && !G.match.duel && !G.match.training && G.phase === 'fight';
  if (melee) {
    if (p.failed && !p.covered) return;
    const newlyFailed = !p.failed;
    if (newlyFailed) G.stats.failures++;
    p.failed = true;
    if (p.cond > 0.12) {
      p.covered = true;
      if (newlyFailed) feed(`${label(f)} has loose ${PIECE_NAMES[piece].toLowerCase()}, but remains protected.`, 'BR 1.3.1', teamColor(f));
      return;
    }
    p.covered = false;
    if (piece === 'helmet') popHelmet(f);
    meleeArmourKnee(f, piece);
    return;
  }
  G.stats.failures++;
  if (piece === 'helmet') {
    if (p.failed) return;
    p.failed = true; popHelmet(f);
    if (armorStrike(f, piece)) return;
    emergencyArmourStop(f, piece);
    return;
  }
  const nm = PIECE_NAMES[piece].toLowerCase();
  if (p.failed) return;
  p.failed = true;
  p.covered = false;
  if (armorStrike(f, piece)) return;
  comm('armour', {}, 2); caption('strap', 'a strap snaps');
  emergencyArmourStop(f, piece);
}
function popHelmet(f) {
  const J = f.model; const helm = new THREE.Group();
  // The head group also contains face and hair meshes. Only the helmet shell falls.
  [...J.head.children].forEach(c => { if (c !== J.helmBand) J.head.remove(c); });
  mk(J.head, geo('coif', () => new THREE.SphereGeometry(0.12, 12, 10)), MAT.gambeson, 0, 0.11, 0).scale.setScalar(J.cute ? 1.4 : 1);
  mk(helm, geo('fallen_helmet', () => new THREE.SphereGeometry(0.14, 14, 10, 0, TAU, 0, Math.PI * 0.68)), J.cute ? J.strap : MAT.steel, 0, 0.08, 0);
  helm.position.set(f.pos.x + rand(-1, 1), 0.12, f.pos.z + rand(-1, 1)); helm.rotation.set(rand(0, 3), rand(0, 3), 1.4);
  W3.matchRoot.add(helm); G.props.push(helm);
}
function armorStrike(f, piece) {
  f.armorStrikes = (f.armorStrikes || 0) + 1;
  if (f.armorStrikes < 3) {
    feed(label(f) + ' has armour strike ' + f.armorStrikes + ' of 2. Repair it before returning.', 'BR 1.3.1', 'var(--card-red)');
    return false;
  }
  f.out = true;
  f.returnAt = -1;
  marshalCall('Armour failure', label(f) + ' has three armour strikes and loses.', 3);
  feed(label(f) + ' loses after the third armour strike.', 'REG 5.4.2', 'var(--card-red)');
  if (G.match && G.match.duel && G.phase === 'fight') {
    G.match.duelDQ = f.team;
    G.match.wins[1 - f.team] = 2;
    after(0.35, () => { if (G.phase === 'fight') endRound('duel'); });
  }
  return true;
}

// ---------- contact between bodies ----------
G.clinches = [];
function resolveCollisions(dt) {
  const fs = G.fighters;
  for (let i = 0; i < fs.length; i++) {
    const A = fs[i]; if (A.out) continue;
    for (let j = i + 1; j < fs.length; j++) {
      const B = fs[j]; if (B.out) continue;
      const aDown = isDown(A), bDown = isDown(B);
      if (aDown && bDown) continue;
      if (aDown || bDown) { bodyObstacle(aDown ? B : A, aDown ? A : B); continue; }
      if (A.clinch && A.clinch === B.clinch) continue;
      const dx = B.pos.x - A.pos.x, dz = B.pos.z - A.pos.z; const d = Math.hypot(dx, dz) || 0.001; const minD = A.radius + B.radius;
      if (d >= minD) continue;
      const nx = dx / d, nz = dz / d, ov = minD - d, tm = A.mass + B.mass;
      A.pos.x -= nx * ov * B.mass / tm; A.pos.z -= nz * ov * B.mass / tm;
      B.pos.x += nx * ov * A.mass / tm; B.pos.z += nz * ov * A.mass / tm;
      const rel = (A.vel.x - B.vel.x) * nx + (A.vel.z - B.vel.z) * nz;
      if (rel > 0) {
        if (rel > 1.4 && A.team !== B.team) { // a charge landing
          const imp = (rel - 1.4) * 0.34;
          applyImpulse(B, { x: nx, z: nz }, imp * 2 * A.mass / tm * (B.brace ? 0.55 : 1), { type: 'collision', by: A });
          applyImpulse(A, { x: -nx, z: -nz }, imp * 2 * B.mass / tm * (A.brace ? 0.55 : 1), { type: 'collision', by: B });
          if (rel > 2.2) AU.clang(0.5, Math.min(vol(A), vol(B)) * 0.8);
        }
        const share = rel * 0.5;
        A.vel.x -= nx * share; A.vel.z -= nz * share; B.vel.x += nx * share; B.vel.z += nz * share;
      }
    }
  }
  for (const f of fs) { if (!f.out && (f.state === 'standing' || f.state === 'posting')) clampToList(f); }
  // pinned: against the rail with an opponent on you
  for (const f of fs) {
    f.pinned = false; if (!isUp(f) || !f.atRail) continue;
    for (const o of fs) if (o.team !== f.team && isUp(o) && dist2(o.pos, f.pos) < f.radius + o.radius + 0.2) { f.pinned = true; break; }
  }
}
function bodyObstacle(S, D) {
  if (S.state !== 'standing' && S.state !== 'posting') return;
  const dx = S.pos.x - D.groundPos.x, dz = S.pos.z - D.groundPos.z; const d = Math.hypot(dx, dz) || 0.001; const minD = S.radius + 0.42;
  if (d >= minD) return;
  const nx = dx / d, nz = dz / d; S.pos.x += nx * (minD - d); S.pos.z += nz * (minD - d);
  const into = -(S.vel.x * nx + S.vel.z * nz);
  if (into > 1.6 && S.noStep <= 0) { applyImpulse(S, vnorm(S.vel), 0.45, { type: 'body', by: null }); S.noStep = 0.2; }
  if (into > 0) { S.vel.x += nx * into; S.vel.z += nz * into; }
}

function breakClinch(f) {
  const c = f.clinch; if (!c) return;
  c.a.clinch = null; c.b.clinch = null; const i = G.clinches.indexOf(c); if (i >= 0) G.clinches.splice(i, 1);
}
function updateClinches(dt) {
  for (const c of [...G.clinches]) {
    const { a, b } = c;
    if (a.state !== 'standing' || b.state !== 'standing' || G.phase !== 'fight') { breakClinch(a); continue; }
    c.t += dt; c.idle += dt;
    if (vlen(a.lean) > 0.2 || vlen(b.lean) > 0.2) c.idle = 0;
    // hold each other at grappling distance, drift with the stronger push
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z; const d = Math.hypot(dx, dz) || 0.01; const want = 0.72;
    const corr = (d - want) * 0.5; a.pos.x += dx / d * corr; a.pos.z += dz / d * corr; b.pos.x -= dx / d * corr; b.pos.z -= dz / d * corr;
    a.wantFace = Math.atan2(dx, dz); b.wantFace = Math.atan2(-dx, -dz);
    const sa = a.mass * (0.4 + a.gas) * a.arch.grip, sb = b.mass * (0.4 + b.gas) * b.arch.grip;
    const vx = (a.move.x * sa + b.move.x * sb) / (sa + sb) * 0.9, vz = (a.move.z * sa + b.move.z * sb) / (sa + sb) * 0.9;
    a.vel.x = b.vel.x = vx; a.vel.z = b.vel.z = vz;
    if (c.idle >= BREAK_AFTER) { G.stats.breaks++; fieldBreak(c); }
  }
}

