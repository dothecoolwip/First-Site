// ---------- team AI: utility scoring around the 3:1 math ----------
function reachOf(f) { return f.weapon ? 0.6 + f.weapon.len * 0.92 + (f.reachB || 0) : 0.8; }
function leanRatio(f) { return clamp(vlen(f.lean) / FALL_L, 0, 1); }
function engagedBy(e, team, except) {
  let n = 0; for (const o of G.fighters) if (o.team === team && o !== except && isUp(o) && (o.ai.target === e || (o.isPlayer && o.softTarget === e)) && dist2(o.pos, e.pos) < 2.8) n++;
  return n;
}
function teamPlan(team) {
  if (team === 0 && !G.autopilot) return G.orders[0];
  const mine = G.fighters.filter(f => f.team === team && isUp(f)).length, theirs = G.fighters.filter(f => f.team !== team && isUp(f)).length;
  if (team === 0) return G.orders[0];
  return mine > theirs ? 'pair' : mine < theirs ? 'hunt' : G.orders[1]; // ahead: control, behind: chaos
}

function aiControl(f, dt) {
  f.sprint = false;
  if (G.phase !== 'fight' || (f.state !== 'standing' && f.state !== 'posting')) { f.move.x = f.move.z = 0; f.guard = f.brace = false; return; }
  const prof = tierProf(f.prof || (f.team !== 0 || (G.match && G.match.ffa) ? DIFF[G.settings.difficulty] : DIFF.club), f);
  const ai = f.ai; ai.next -= dt; ai.guardT -= dt; ai.braceT -= dt;
  if (ai.mode && ai.mode !== 'easy') { trainingAI(f, dt); return; }
  f.guard = ai.guardT > 0 && !(f.action && f.action.kind !== 'swing');
  f.brace = ai.braceT > 0 && !f.guard;
  if (f.action && f.action.kind === 'swing' && f.action.phase === 'windup' && !f.action.checked) {
    const t = f.action.target; if (t && isDown(t)) { f.action.checked = true; if (chance(prof.cancel)) f.action.cancel = true; }
  }
  if (f.guard && f.action && f.action.kind === 'swing' && f.action.phase === 'windup') f.action.cancel = true;
  const t = ai.target;
  if (t && isUp(t) && !f.clinch) f.wantFace = angTo(f.pos, t.pos);
  if (ai.next > 0) return;
  ai.next = prof.react * rand(0.65, 1.3);
  think(f, prof);
}

// bot personalities: same skills, different temperaments
const TRAITS = { steady: { aggr: 1, guard: 1, want: 0 }, reckless: { aggr: 1.35, guard: 0.6, want: -0.2 }, cautious: { aggr: 0.75, guard: 1.35, want: 0.4 }, grappler: { aggr: 0.95, guard: 1, want: -0.25 }, showboat: { aggr: 1.1, guard: 0.9, want: 0 } };
function traitOf(f) { if (!f.trait) { const r = seeded('trait' + f.name + f.num)(); f.trait = r < 0.34 ? 'steady' : r < 0.52 ? 'reckless' : r < 0.7 ? 'cautious' : r < 0.86 ? 'grappler' : 'showboat'; } return f.trait; }
function think(f, prof) {
  const team = f.team, order = teamPlan(team), ai = f.ai, T = TRAITS[traitOf(f)];
  prof = { ...prof, aggr: prof.aggr * T.aggr, guard: Math.min(0.95, prof.guard * T.guard) };
  const enemies = G.fighters.filter(o => o.team !== team && isUp(o));
  const mates = G.fighters.filter(o => o.team === team && o !== f && isUp(o));
  if (!enemies.length) { f.move.x = f.move.z = 0; return; }
  // react to a strike being wound up at you, or a charge
  for (const e of enemies) {
    const d = dist2(e.pos, f.pos);
    if (e.action && e.action.kind === 'swing' && e.action.phase === 'windup' && d < reachOf(e) + 0.4 && facingDot(e, f) > 0.55 && chance(prof.guard)) { ai.guardT = rand(0.4, 0.7); ai.gdir = aiReadArc(f, e); }
    const closing = -((e.vel.x * (f.pos.x - e.pos.x) + e.vel.z * (f.pos.z - e.pos.z)) / (d || 1));
    if (closing < -2.6 && d < 2.6 && chance(0.55)) ai.braceT = 0.6;
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
    if (e === ai.target) s += 1.0;
    if (order === 'pair' && e === pairT) s += 3;
    if (order === 'peel' && e.ai.target && engagedBy(e.ai.target, e.team) >= 2) s += 2.2;
    if (e.clinch) s += 0.8;
    s += peelBonus(f, e, mates);
    if (!e.weapon) s += 0.4;
    // team plays: gang up on someone isolated, rescue a mate in trouble, pin people on the rail
    const isolated = !G.fighters.some(o => o !== e && o.team === e.team && isUp(o) && dist2(o.pos, e.pos) < 3);
    if (eng >= 1 && isolated && mates.length) s += 1.2;
    if (mates.some(m => (m.clinch && (m.clinch.a === e || m.clinch.b === e)) || (e.ai && e.ai.target === m && leanRatio(m) > 0.45))) s += 1.0;
    if (e.atRail && eng >= 1) s += 0.7;
    if (s > bs) { bs = s; best = e; }
  }
  ai.target = best; const tg = best;
  const d = dist2(tg.pos, f.pos);
  let aggr = prof.aggr * (mates.length + 1 < enemies.length ? 1.2 : 1);
  // movement goal
  const reach = reachOf(f);
  let want = f.weapon ? (f.weapon.key === 'polearm' ? 1.8 : Math.max(0.95, reach * 0.72)) : 0.8;
  if (f.gas < 0.25) want += 0.9;
  want += T.want; if (f.trait === 'cautious' && f.gas < 0.45) want += 1.1; // cautious fighters back off to breathe
  let gx, gz;
  if (order === 'hold' && team === 0 && d > 3.4 && !G.autopilot) {
    gx = f.home.x; gz = f.home.z - Math.sign(f.home.z) * 4; ai.braceT = 0.5;
  } else {
    const flank = engagedBy(tg, team, f) >= 1 && f.arch.key !== 'heavy';
    let a = angTo(tg.pos, f.pos);
    if (flank) { const behind = tg.facing + Math.PI; a = behind + clamp(angDiff(behind, a), -1.3, 1.3); }
    a += ai.strafe * 0.25;
    gx = tg.pos.x + Math.sin(a) * want; gz = tg.pos.z + Math.cos(a) * want;
  }
  let mx = gx - f.pos.x, mz = gz - f.pos.z; const ml = Math.hypot(mx, mz);
  if (ml < 0.25) { mx = mz = 0; if (chance(0.25)) ai.strafe *= -1; } else { mx /= ml; mz /= ml; }
  for (const m of mates) { const ax = f.pos.x - m.pos.x, az = f.pos.z - m.pos.z; const ad = Math.hypot(ax, az); if (ad < 1.2 && ad > 0.01) { mx += ax / ad * 0.6; mz += az / ad * 0.6; } }
  const l2 = Math.hypot(mx, mz); f.move = l2 > 1 ? { x: mx / l2, z: mz / l2 } : { x: mx, z: mz };
  f.sprint = (d > 4 && f.gas > 0.5) || (d > 1.8 && d < 4 && f.gas > 0.6 && chance(0.4));
  f.wantFace = angTo(f.pos, tg.pos);
  // actions
  if (f.cd > 0 || f.action || f.guard) return;
  if (f.clinch) {
    const opts = [['throw', 0.35 + (f.arch.grip - 1) * 0.8 + (f.gas - (f.clinch.a === f ? f.clinch.b : f.clinch.a).gas)], ['knee', 0.45], ['disarm', f.arch.key === 'grappler' ? 0.35 : 0.1], ['shove', 0.18], ['none', 0.55]];
    const pickd = opts.map(o => [o[0], o[1] + rand(0, 0.4)]).sort((a, b) => b[1] - a[1])[0][0];
    if (pickd !== 'none') startAction(f, pickd);
    return;
  }
  const facingOk = Math.abs(angDiff(f.facing, angTo(f.pos, tg.pos))) < 0.6;
  const lr = leanRatio(tg), side = facingDot(tg, f) < 0.35;
  const opts = [['none', 0.55]];
  if (f.weapon && d < reach + 0.1 && facingOk) opts.push(['swing', aggr * (1 + (tg.guard && !side ? -0.55 : 0.3) + (f.arch.key === 'striker' ? 0.3 : 0))]);
  if (d < 1.05) opts.push(['trip', 0.15 + 2.6 * lr + (side ? 0.6 : 0) + (tg.clinch ? 1.2 : 0) + (order === 'hunt' ? 0.35 : 0) + (f.arch.key === 'grappler' || f.arch.key === 'runner' ? 0.3 : 0) - (tg.brace ? 0.8 : 0)]);
  if (f.weapon && d < 1.15 && facingOk) opts.push(['shove', 0.2 + (tg.atRail ? 0.45 : 0) + lr * 1.2 + (f.shield ? 0.25 : 0)]);
  if (d < 0.92 && !tg.clinch) opts.push(['grab', (f.arch.key === 'grappler' ? 0.85 : 0.08) + (f.trait === 'grappler' ? 0.45 : 0)]);
  if (f.trait === 'grappler') { const tr = opts.find(o => o[0] === 'trip'); if (tr) tr[1] += 0.35; }
  if (tg.atRail && engagedBy(tg, team, f) >= 1) { const sv = opts.find(o => o[0] === 'shove'); if (sv) sv[1] += 0.6; }
  if (d > 1.3 && d < 3.4 && facingOk && f.gas > 0.4) opts.push(['tackle', 0.12 + (f.arch.key === 'runner' || f.arch.key === 'heavy' ? 0.3 : 0) + (tg.atRail ? 0.35 : 0) + lr * 0.9 - (tg.brace ? 0.5 : 0) + (vlen(f.vel) > 3.5 ? 0.25 : 0)]);
  const choice = opts.map(o => [o[0], o[1] + rand(0, 0.4)]).sort((a, b) => b[1] - a[1])[0][0];
  if (choice === 'swing') {
    const ohP = f.weapon.key === 'mace' || f.weapon.key === 'axe' ? 0.38 : 0.26;
    f.swingSide *= -1;
    const arc = chance(ohP) ? 'O' : f.swingSide > 0 ? 'R2L' : 'L2R';
    if (startAction(f, 'swing', { arc: f.trait === 'showboat' && chance(0.4) ? 'O' : arc, charge: rand(0, 0.6) * aggr * (f.trait === 'showboat' ? 1.4 : 1), target: tg })) aiMaybeFeint(f);
  } else if (choice !== 'none') startAction(f, choice, { target: tg });
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
