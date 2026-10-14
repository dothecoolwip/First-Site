// ---------- team AI: utility scoring around the 3:1 math ----------
function reachOf(f) { return f.weapon ? 0.6 + f.weapon.len * 0.92 + (f.reachB || 0) : 0.8; }
function leanRatio(f) { return clamp(vlen(f.lean) / FALL_L, 0, 1); }
function engagedBy(e, team, except) {
  let n = 0; for (const o of G.fighters) if (o.team === team && o !== except && isUp(o) && (o.ai.target === (e.source || e) || (o.isPlayer && o.softTarget === (e.source || e))) && dist2(o.pos, e.pos) < 2.8) n++;
  return n;
}
function teamPlan(team) {
  if (team === 0 && !G.autopilot) return G.orders[0];
  const mine = G.fighters.filter(f => f.team === team && isUp(f)).length, theirs = G.fighters.filter(f => f.team !== team && isUp(f)).length;
  if (team === 0) return G.orders[0];
  return mine > theirs ? 'pair' : mine < theirs ? 'hunt' : G.orders[1]; // ahead: control, behind: chaos
}

const MELEE_ROLES = { tank: 'Tank', rook: 'Rook', runner: 'Runner' };
const MELEE_ROLE_PATTERN = ['tank', 'rook', 'runner', 'runner', 'rook'];
function meleeRolesOn() { return !!(G.match && G.match.mode > 1 && !G.match.ffa && !G.match.training && !G.match.champion); }
function assignMeleeRoles(team) {
  if (!meleeRolesOn()) return;
  const bots = G.fighters.filter(f => f.team === team && !f.isPlayer && !f.netUid && !f.vin).sort((a, b) => a.idx - b.idx);
  const open = bots.filter(f => !f.ai.roleManual);
  const needs = Array.from({ length: bots.length }, (_, i) => MELEE_ROLE_PATTERN[i % MELEE_ROLE_PATTERN.length]);
  for (const f of bots) if (f.ai.roleManual) {
    f.ai.role = f.ai.roleManual;
    const at = needs.indexOf(f.ai.roleManual); if (at >= 0) needs.splice(at, 1); else needs.pop();
  }
  const score = (f, role) => role === 'tank' ? f.mass * 0.035 + f.arch.grip * 2 + f.arch.stab * 2
    : role === 'rook' ? f.arch.grip * 3 + f.arch.stab * 2 + (f.shield ? 1 : 0)
      : f.arch.speed + (f.arch.key === 'runner' ? 1 : 0);
  for (const role of needs) {
    const f = open.splice(open.reduce((best, candidate, i) => score(candidate, role) > score(open[best], role) ? i : best, 0), 1)[0];
    if (f) f.ai.role = role;
  }
}
function setMeleeRole(id, role) {
  if (!meleeRolesOn() || G.phase !== 'tactics' || (role !== 'auto' && !MELEE_ROLES[role])) return;
  const f = G.fighters.find(x => x.id === id && x.team === 0 && !x.isPlayer);
  if (!f) return;
  f.ai.roleManual = role === 'auto' ? null : role;
  assignMeleeRoles(0);
  renderLineup();
}
function roleTank(f, mates) { return mates.filter(m => m.ai && m.ai.role === 'tank' && isUp(m)).sort((a, b) => dist2(a.pos, f.pos) - dist2(b.pos, f.pos))[0] || null; }
function allyUnderPressure(f, mates, enemies) {
  return mates.filter(m => m !== f && enemies.filter(e => e.ai && e.ai.target === m && dist2(e.pos, m.pos) < 2.7).length >= 2)
    .sort((a, b) => dist2(a.pos, f.pos) - dist2(b.pos, f.pos))[0] || null;
}

function aiCanSee(f, e) {
  const d = dist2(f.pos, e.pos);
  if (d >= 32 || facingDot(f, e) <= -0.1) return false;
  const dx = e.pos.x - f.pos.x, dz = e.pos.z - f.pos.z, length2 = dx * dx + dz * dz;
  return !G.fighters.some(o => {
    if (o === f || o === e || !isUp(o) || length2 < 0.01) return false;
    const t = ((o.pos.x - f.pos.x) * dx + (o.pos.z - f.pos.z) * dz) / length2;
    return t > 0.08 && t < 0.92 && Math.hypot(o.pos.x - f.pos.x - t * dx, o.pos.z - f.pos.z - t * dz) < (o.radius || 0.3) * 0.7;
  });
}
function aiObserved(f, e) { return f.ai.observations?.get(e); }
function aiThreatReady(f, e) {
  e = e.source || e;
  const seen = f.ai.threats?.get(e);
  return !!(seen && seen.action === e.action && f.ai.observedTime - seen.at >= 0.11 - 1e-8 && aiCanSee(f, e));
}
function aiObserveThreats(f, dt) {
  const ai = f.ai; ai.observedTime = (ai.observedTime || 0) + dt;
  if (!ai.threats) ai.threats = new Map();
  if (!ai.observations) ai.observations = new Map();
  for (const e of G.fighters) {
    if (e === f || e.team === f.team) continue;
    const visible = isUp(e) && aiCanSee(f, e);
    if (visible) {
      const old = ai.observations.get(e);
      const exertion = e.sprint || e.action ? 0.15 : 0;
      const gas = clamp((old?.gas ?? 0.7) + dt * (exertion ? -exertion : 0.04), 0.15, 0.95);
      // Copy observable posture and motion; never expose enemy AI targets or private stamina.
      const observation = { source: e, id: e.id, team: e.team, pos: { ...e.pos }, vel: { ...e.vel }, lean: { ...e.lean }, facing: e.facing, state: e.state, out: e.out, weapon: e.weapon, radius: e.radius, mass: e.mass, reachB: e.reachB, guard: e.guard, brace: e.brace, atRail: e.atRail, gas, action: e.action ? { kind: e.action.kind, phase: e.action.phase, arc: e.action.arc, whiff: !!e.action.whiff, target: null } : null, clinch: e.clinch, stats: { takedowns: old?.stats.takedowns || 0 }, ai: {}, at: ai.observedTime };
      if (observation.action) observation.action.target = G.fighters.filter(m => m.team === f.team && isUp(m) && facingDot(e, m) > 0.55).sort((a, b) => dist2(e.pos, a.pos) - dist2(e.pos, b.pos))[0] || null;
      observation.ai.target = observation.action?.target || null;
      ai.observations.set(e, observation);
      if (e.action) { const threat = ai.threats.get(e); if (!threat || threat.action !== e.action) ai.threats.set(e, { action: e.action, at: ai.observedTime }); }
      else ai.threats.delete(e);
    } else {
      ai.threats.delete(e);
      const old = ai.observations.get(e);
      if (old) { old.action = null; old.ai.target = null; if (ai.observedTime - old.at > 1.0) ai.observations.delete(e); }
    }
  }
}
function aiControl(f, dt) {
  f.sprint = false;
  if (G.phase !== 'fight' || (f.state !== 'standing' && f.state !== 'posting')) { f.move.x = f.move.z = 0; f.guard = f.brace = false; return; }
  const prof = tierProf(f.prof || (f.team !== 0 || (G.match && G.match.ffa) ? DIFF[G.settings.difficulty] : DIFF.club), f);
  aiObserveThreats(f, dt);
  const ai = f.ai; ai.next -= dt; ai.guardT -= dt; ai.braceT -= dt;
  if (ai.mode && ai.mode !== 'easy') { trainingAI(f, dt); return; }
  f.guard = ai.guardT > 0 && !(f.action && f.action.kind !== 'swing');
  f.brace = ai.braceT > 0 && !f.guard;
  if (f.action && f.action.kind === 'swing' && f.action.phase === 'windup' && !f.action.checked) {
    const t = f.action.target;
    if (t && G.match?.duel && !t.weapon) { f.action.checked = true; f.action.cancel = true; }
    else if (t && isDown(t)) { f.action.checked = true; if (chance(prof.cancel)) f.action.cancel = true; }
  }
  if (f.guard && f.action && f.action.kind === 'swing' && f.action.phase === 'windup') f.action.cancel = true;
  const t = ai.target;
  const seenTarget = t && aiObserved(f, t); if (seenTarget && !f.clinch) f.wantFace = angTo(f.pos, seenTarget.pos);
  if (ai.next > 0) return;
  ai.next = Math.max(0.11, prof.react * rand(0.65, 1.3));
  think(f, prof);
}

// bot personalities: same skills, different temperaments
const TRAITS = { steady: { aggr: 1, guard: 1, want: 0 }, reckless: { aggr: 1.35, guard: 0.6, want: -0.2 }, cautious: { aggr: 0.75, guard: 1.35, want: 0.4 }, grappler: { aggr: 0.95, guard: 1, want: -0.25 }, showboat: { aggr: 1.1, guard: 0.9, want: 0 } };
function traitOf(f) { if (!f.trait) { const r = seeded('trait' + f.name + f.num)(); f.trait = r < 0.34 ? 'steady' : r < 0.52 ? 'reckless' : r < 0.7 ? 'cautious' : r < 0.86 ? 'grappler' : 'showboat'; } return f.trait; }
function think(f, prof) {
  aiObserveThreats(f, 0);
  const team = f.team, order = teamPlan(team), ai = f.ai, T = TRAITS[traitOf(f)];
  const pressure = botChallenge(f), stage = pressure > 0 ? challengeStage() : 0;
  const role = meleeRolesOn() ? ai.role : null;
  prof = { ...prof, aggr: prof.aggr * T.aggr, guard: Math.min(0.95, prof.guard * T.guard) };
  const enemies = [...(ai.observations || new Map()).values()].filter(o => !o.out && ai.observedTime - o.at <= 1.0);
  const mates = G.fighters.filter(o => o.team === team && o !== f && isUp(o));
  const tank = role === 'rook' ? roleTank(f, mates) : null;
  const pressured = role === 'rook' ? allyUnderPressure(f, mates, enemies) : null;
  const tankSafe = tank && tank.gas > 0.3 && leanRatio(tank) < 0.42 && enemies.filter(e => e.ai && e.ai.target === tank && dist2(e.pos, tank.pos) < 2.7).length <= 1;
  const protect = tank && (!pressured || !tankSafe) ? tank : pressured;
  if (role === 'rook' && protect && dist2(f.pos, protect.pos) < 1.5) {
    const attacker = enemies.find(e => aiThreatReady(f, e) && e.action && e.action.kind === 'swing' && e.action.phase === 'windup' && e.action.target === protect && dist2(e.pos, f.pos) < reachOf(e) + 0.5);
    if (attacker) { ai.guardT = Math.max(ai.guardT, 0.6); ai.gdir = aiReadArc(f, attacker); }
  }
  if (!enemies.length) {
    const centre = vnorm({ x: -f.pos.x, z: -f.pos.z });
    f.move = vlen(f.pos) > 2 ? centre : { x: 0, z: 0 };
    if (vlen(f.pos) > 2) f.wantFace = Math.atan2(centre.x, centre.z);
    const noise = G.fighters.find(e => e.team !== team && isUp(e) && dist2(e.pos, f.pos) < 3 && (e.sprint || e.action));
    if (noise) f.wantFace = angTo(f.pos, noise.pos); // audible bearing only: no directional counter
    return;
  }
  if (stage && (!ai.combatRole || G.simTime >= (ai.combatRoleUntil || 0))) {
    const troubled = mates.find(m => enemies.filter(e => dist2(e.pos, m.pos) < 2.2).length >= 2 && dist2(m.pos, f.pos) < 6);
    ai.combatRole = stage >= 2 && troubled ? 'rescuer' : mates.some(m => m.ai.target && isUp(m.ai.target) && dist2(m.pos, m.ai.target.pos) < 2.5) ? 'flanker' : 'engager';
    ai.rescue = troubled || null;
    ai.combatRoleUntil = G.simTime + 1.4 + rand(0, 0.9);
  }
  // react to a strike being wound up at you, or a charge
  for (const e of enemies) {
    const d = dist2(e.pos, f.pos);
    if (aiThreatReady(f, e) && e.action && e.action.kind === 'swing' && e.action.phase === 'windup' && d < reachOf(e) + 0.4 && facingDot(e, f) > 0.55 && chance(prof.guard)) { ai.guardT = rand(0.4, 0.7); ai.gdir = aiReadArc(f, e); }
    if (stage >= 3 && aiThreatReady(f, e) && e.action && e.action.kind === 'trip' && e.action.phase === 'windup' && d < 1.3 && facingDot(e, f) > 0.3) ai.braceT = Math.max(ai.braceT, 0.35);
    const closing = -((e.vel.x * (f.pos.x - e.pos.x) + e.vel.z * (f.pos.z - e.pos.z)) / (d || 1));
    if (aiThreatReady(f, e) && closing < -2.6 && d < 2.6 && chance(0.55)) ai.braceT = 0.6;
  }
  // disarmed: draw a sidearm or go to your weapon zone
  if (!f.weapon && !f.clinch) {
    const near = enemies.reduce((b, e) => Math.min(b, dist2(e.pos, f.pos)), 99);
    if (f.sidearmT > 0) { const e = enemies[0]; const away = vnorm({ x: f.pos.x - e.pos.x, z: f.pos.z - e.pos.z }); f.move = away; ai.guardT = 0.3; return; }
    if (G.reserves[sideOf(f)] > 0) {
      const zn = W3.zones[sideOf(f)]; const v = { x: zn.x - f.pos.x, z: zn.z - f.pos.z }; const l = vlen(v);
      f.move = l > 0.4 ? { x: v.x / l, z: v.z / l } : { x: 0, z: 0 }; f.sprint = l > 3 && f.gas > 0.3; if (near < 2) ai.guardT = 0.3;
      f.wantFace = Math.atan2(v.x, v.z); return;
    }
  }
  // pick a target
  const pairT = team === 0 && G.player && isUp(G.player) ? (G.player.softTarget || nearestEnemy(G.player)) : ai.target;
  let best = null, bs = -1e9;
  for (const e of enemies) {
    const d = dist2(e.pos, f.pos); const eng = engagedBy(e, team, f);
    let s = -d + 2.2 * leanRatio(e) * (order === 'hunt' ? 2 : 1);
    if (eng >= 1) s += order === 'pair' ? 1.8 : 0.6;
    if (eng >= 2) s -= 1.4;
    if (e.source === ai.target) s += G.simTime < (ai.targetUntil || 0) ? 4.0 : 1.0;
    if (order === 'pair' && e.source === pairT) s += 3;
    if (order === 'peel' && e.ai.target && engagedBy(e.ai.target, e.team) >= 2) s += 2.2;
    if (e.clinch) s += 0.8;
    s += peelBonus(f, e, mates);
    if (!e.weapon) s += 0.4;
    // team plays: gang up on someone isolated, rescue a mate in trouble, pin people on the rail
    const isolated = !enemies.some(o => o !== e && o.team === e.team && dist2(o.pos, e.pos) < 3);
    if (eng >= 1 && isolated && mates.length) s += 1.2;
    if (mates.some(m => (m.clinch && (m.clinch.a === e || m.clinch.b === e)) || (e.ai && e.ai.target === m && leanRatio(m) > 0.45))) s += 1.0;
    if (e.atRail && eng >= 1) s += 0.7;
    if (role === 'tank') s += 1.5 * e.mass / 120 + 0.45 * e.stats.takedowns + (e.ai && mates.some(m => e.ai.target === m) ? 0.7 : 0);
    if (role === 'rook' && protect) s += e === protect.ai.target ? 3.5 : e.ai && e.ai.target === protect ? 3.2 : 0;
    if (role === 'runner') s += 2.8 * leanRatio(e) + 1.2 * (1 - e.gas) + (isolated ? 1.1 : 0) + (e.atRail ? 0.7 : 0) + (e.clinch ? 1.0 : 0);
    if (ai.combatRole === 'rescuer' && ai.rescue && dist2(e.pos, ai.rescue.pos) < 2.2) s += 4;
    if (ai.combatRole === 'flanker' && mates.some(m => m.ai.target === e.source)) s += 2.4;
    if (s > bs) { bs = s; best = e; }
  }
  if (best.source !== ai.target) ai.targetUntil = G.simTime + 1.3 + pressure * 0.6;
  ai.target = best.source; const tg = best;
  if (G.match?.duel && !tg.weapon) {
    f.move = { x: 0, z: 0 }; f.sprint = false;
    f.wantFace = angTo(f.pos, tg.pos);
    if (f.action?.kind === 'swing' && f.action.phase === 'windup') f.action.cancel = true;
    return;
  }
  const d = dist2(tg.pos, f.pos);
  let aggr = prof.aggr * (mates.length + 1 < enemies.length ? 1.2 : 1);
  // movement goal
  const reach = reachOf(f);
  let want = f.weapon ? (f.weapon.key === 'polearm' ? 1.8 : Math.max(0.95, reach * 0.72)) : 0.8;
  if (f.gas < 0.25) want += 0.9 + pressure * 0.7;
  want += T.want; if (f.trait === 'cautious' && f.gas < 0.45) want += 1.1; // cautious fighters back off to breathe
  if (role === 'tank') want = Math.min(want, 0.82);
  if (role === 'rook') want = Math.min(want, 1.05);
  let gx, gz;
  if (order === 'hold' && team === 0 && d > 3.4 && !G.autopilot) {
    gx = f.home.x; gz = f.home.z - Math.sign(f.home.z) * 4; ai.braceT = 0.5;
  } else {
    const flank = (ai.combatRole === 'flanker' || engagedBy(tg, team, f) >= 1) && f.arch.key !== 'heavy';
    let a = angTo(tg.pos, f.pos);
    if (flank) { const behind = tg.facing + Math.PI; a = behind + clamp(angDiff(behind, a), -1.3, 1.3); }
    a += ai.strafe * 0.25;
    gx = tg.pos.x + Math.sin(a) * want; gz = tg.pos.z + Math.cos(a) * want;
    if (role === 'rook' && protect && dist2(f.pos, protect.pos) > 2.4) {
      gx = (gx + protect.pos.x) * 0.5; gz = (gz + protect.pos.z) * 0.5;
    }
  }
  let mx = gx - f.pos.x, mz = gz - f.pos.z; const ml = Math.hypot(mx, mz);
  if (ml < 0.25) { mx = mz = 0; if (chance(0.25)) ai.strafe *= -1; } else { mx /= ml; mz /= ml; }
  // In a duel, keep measuring and circling rather than sprinting straight
  // into a stationary swing exchange. Reverse the circle before the rail.
  const duelMeasure = !!(G.match && G.match.duel && !G.match.pro && !f.clinch && d < reach + 1.1);
  if (duelMeasure) {
    const rx = (f.pos.x - tg.pos.x) / (d || 1), rz = (f.pos.z - tg.pos.z) / (d || 1);
    const sx = -rz * ai.strafe, sz = rx * ai.strafe;
    if (Math.abs(f.pos.x + sx * 0.9) > LIST.W / 2 - f.radius - 0.45 || Math.abs(f.pos.z + sz * 0.9) > LIST.L / 2 - f.radius - 0.45) ai.strafe *= -1;
    const radial = clamp(want - d, -0.65, 0.65);
    mx = -rz * ai.strafe * 0.65 + rx * radial; mz = rx * ai.strafe * 0.65 + rz * radial;
    if (d < want - 0.25) { mx += rx * 0.35; mz += rz * 0.35; }
  }
  for (const m of mates) { const ax = f.pos.x - m.pos.x, az = f.pos.z - m.pos.z; const ad = Math.hypot(ax, az); if (ad < 1.2 && ad > 0.01) { mx += ax / ad * 0.6; mz += az / ad * 0.6; } }
  const l2 = Math.hypot(mx, mz); f.move = l2 > 1 ? { x: mx / l2, z: mz / l2 } : { x: mx, z: mz };
  f.sprint = !duelMeasure && ((d > 4 && f.gas > 0.5) || (d > 1.8 && d < 4 && f.gas > 0.6 && chance(role === 'runner' ? 0.7 : 0.4)));
  f.wantFace = angTo(f.pos, tg.pos);
  // actions
  if (f.cd > 0 || f.action || f.guard) return;
  if (f.gas < 0.12 + pressure * 0.08 && !f.clinch) { ai.guardT = 0.2; return; }
  if (f.clinch) {
    const opts = [['throw', 0.35 + (f.arch.grip - 1) * 0.8 + (f.gas - (aiObserved(f, f.clinch.a === f ? f.clinch.b : f.clinch.a)?.gas ?? 0.7))], ['knee', 0.45], ['disarm', f.arch.key === 'grappler' ? 0.35 : 0.1], ['shove', 0.18], ['none', 0.55]];
    if (role === 'tank') { opts[0][1] += 0.55; opts[2][1] += 0.55; opts[3][1] += 0.3; }
    if (role === 'rook' || role === 'runner') opts[0][1] += 0.3;
    const pickd = opts.map(o => [o[0], o[1] + rand(0, 0.4)]).sort((a, b) => b[1] - a[1])[0][0];
    if (pickd !== 'none') startAction(f, pickd);
    return;
  }
  const facingOk = Math.abs(angDiff(f.facing, angTo(f.pos, tg.pos))) < 0.6;
  const lr = leanRatio(tg), side = facingDot(tg, f) < 0.35;
  const crowdedWeapon = !!(f.weapon && swingLeverage(f.weapon, d) < 0.75);
  const opts = [['none', 0.55]];
  if (f.weapon && d < reach + 0.1 && facingOk) opts.push(['swing', aggr * (1 + (tg.guard && !side ? -0.55 : 0.3) + (f.arch.key === 'striker' ? 0.3 : 0) + (stage >= 3 && tg.gas < 0.25 ? 0.35 : 0) + (stage >= 4 && tg.action && tg.action.whiff ? 0.5 : 0)) * (crowdedWeapon ? 0.25 : 1) * (role === 'tank' ? 0.22 : role ? 0.48 : 1)]);
  if (d < 1.05) opts.push(['trip', 0.15 + 2.6 * lr + (side ? 0.6 : 0) + (tg.clinch ? 1.2 : 0) + (order === 'hunt' ? 0.35 : 0) + (f.arch.key === 'grappler' || f.arch.key === 'runner' ? 0.3 : 0) - (tg.brace ? 0.8 : 0)]);
  if (f.weapon && d < 1.15 && facingOk) opts.push(['shove', 0.2 + (tg.atRail ? 0.45 + pressure * 0.8 : 0) + lr * 1.2 + (f.shield ? 0.25 : 0) + (crowdedWeapon ? 0.8 : 0)]);
  if (d < 0.92 && !tg.clinch) opts.push(['grab', (f.arch.key === 'grappler' ? 0.85 : 0.08) + (f.trait === 'grappler' ? 0.45 : 0) + (crowdedWeapon ? 0.7 : 0)]);
  if (f.trait === 'grappler') { const tr = opts.find(o => o[0] === 'trip'); if (tr) tr[1] += 0.35; }
  if (role === 'rook' || role === 'runner') { const tr = opts.find(o => o[0] === 'trip'); if (tr) tr[1] += role === 'runner' ? 0.7 : 0.45; }
  if (role === 'tank') { const gr = opts.find(o => o[0] === 'grab'); if (gr) gr[1] += 1.15; const sh = opts.find(o => o[0] === 'shove'); if (sh) sh[1] += 0.65; }
  if (tg.atRail && engagedBy(tg, team, f) >= 1) { const sv = opts.find(o => o[0] === 'shove'); if (sv) sv[1] += 0.6; }
  if (d > 1.3 && d < 3.4 && facingOk && f.gas > 0.4) opts.push(['tackle', 0.12 + (f.arch.key === 'runner' || f.arch.key === 'heavy' ? 0.3 : 0) + (tg.atRail ? 0.35 : 0) + lr * 0.9 - (tg.brace ? 0.5 : 0) + (vlen(f.vel) > 3.5 ? 0.25 : 0)]);
  if (role === 'runner') { const tk = opts.find(o => o[0] === 'tackle'); if (tk) tk[1] += 0.75; }
  const choice = opts.map(o => [o[0], o[1] + rand(0, 0.4)]).sort((a, b) => b[1] - a[1])[0][0];
  if (choice === 'swing') {
    const ohP = f.weapon.key === 'mace' || f.weapon.key === 'axe' ? 0.38 : 0.26;
    f.swingSide *= -1;
    const arc = chance(ohP) ? 'O' : f.swingSide > 0 ? 'R2L' : 'L2R';
    if (startAction(f, 'swing', { arc: f.trait === 'showboat' && chance(0.4) ? 'O' : arc, charge: rand(0, 0.6) * aggr * (f.trait === 'showboat' ? 1.4 : 1), target: tg.source })) aiMaybeFeint(f);
  } else if (choice !== 'none') startAction(f, choice, { target: tg.source });
}
function nearestEnemy(f) { let b = null, bd = 1e9; for (const o of G.fighters) if (o.team !== f.team && isUp(o)) { const d = dist2(o.pos, f.pos); if (d < bd) { bd = d; b = o; } } return b; }

// training yard partners: stand still, or stand and swing slowly so you can practise your guard
function trainingAI(f, dt) {
  const p = G.player; f.move.x = f.move.z = 0; f.sprint = false; f.guard = false; f.brace = false;
  if (!p || !isUp(p)) return;
  f.wantFace = angTo(f.pos, p.pos);
  if (f.ai.mode !== 'swinger') return;
  const d = dist2(p.pos, f.pos), reach = reachOf(f);
  if (d > reach + 0.15) { const v = vnorm({ x: p.pos.x - f.pos.x, z: p.pos.z - f.pos.z }); f.move.x = v.x * 0.6; f.move.z = v.z * 0.6; }
  f.ai.swingT = (f.ai.swingT || 1.2) - dt;
  if (f.ai.swingT <= 0 && d < reach + 0.2 && !f.action && f.cd <= 0) {
    f.ai.swingT = rand(1.8, 2.6); f.swingSide *= -1;
    startAction(f, 'swing', { arc: f.swingSide > 0 ? 'R2L' : 'L2R', charge: 0.55, target: p }); // a slow, telegraphed blow
  }
}
