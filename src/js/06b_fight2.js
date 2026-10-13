// ===================================================================
// Fighting 2.0: layered on the fighter sim (06_fighter) and the team AI (08_ai).
//  - Directions matter: bots read which side a blow comes from and guard that side; a blow from the side they didn't
//    guard gets half through. Repeat the same side and they learn it; mix it up and they guess.
//  - Timed parry: a perfect block also gives a riposte (your next blow winds up much faster).
//  - Shield bash: a shove with a shield into a raised guard knocks the guard open.
//  - Feints: a wind-up you call off (guard during the wind-up) baits bots into blocking; the better bots feint you too.
//  - Momentum: a blow thrown while closing at speed hits harder. Hit stun: get struck mid-wind-up and the swing is lost
//    unless you're braced.
//  - Balance meter under the breath bar (trips already work against balance, not luck).
//  - Team play: bots peel a teammate who's being doubled.
//  - AI tiers: fairground bots are forgiving, bailey bots parry and feint, the King's Guard mixes everything.
// ===================================================================
// 1 = fairground (forgiving), 2 = bailey, 3 = king's court
const CHALLENGE_MILESTONES = [25, 50, 75, 80, 90, 100];
const CHALLENGE_MAX = Math.pow(1.12, 3) * Math.pow(1.20, 3);
function challengeLevel() {
  const level = G.match && G.match.challengeLevel != null ? G.match.challengeLevel : (typeof CAREER !== 'undefined' ? CAREER.level : 1);
  return clamp(Math.floor(Number(level) || 1), 1, 100);
}
function challengeStage(level = challengeLevel()) { return CHALLENGE_MILESTONES.filter(n => level >= n).length; }
function challengeFactor(level = challengeLevel()) {
  const stage = challengeStage(level);
  return Math.pow(1.12, Math.min(stage, 3)) * Math.pow(1.20, Math.max(0, stage - 3));
}
function botChallenge(f) {
  if (!f || f.isPlayer || f.vin || f.netUid || !G.match || G.match.training || G.match.attract || G.attract) return 0;
  if (f.team === 0 && !G.match.online && ((!G.match.versus && !G.match.ffa) || (G.match.local && G.match.local.startsWith('coop')))) return 0;
  return G.match.challengePressure || 0;
}
function botScale(f, cap) { return 1 + (cap - 1) * botChallenge(f); }
function aiTier(f) {
  const m = G.match; if (!m) return 1;
  if (m.training || m.attract) return 1;
  if (f && f.team === 0 && !m.online && ((!m.versus && !m.ffa) || (m.local && m.local.startsWith('coop')))) return 1;
  if (m.aiTier) return m.aiTier;
  if (m.trial) return m.trial === 'royal' ? 3 : 2;
  if (m.townBout && typeof TOWN !== 'undefined' && TOWN.boutArena) { const A = ARENAS.find(a => a.key === TOWN.boutArena); return A && A.district === 'ward' ? 3 : A && A.district === 'bailey' ? 2 : 1; }
  return Math.min(3, 1 + challengeStage());
}
const AI_TIER = {
  1: { read: 0.4, learn: 0.18, parry: 0.04, feint: 0, unfooled: 0, peel: 0.6 },
  2: { read: 0.58, learn: 0.25, parry: 0.14, feint: 0.12, unfooled: 0.35, peel: 1.2 },
  3: { read: 0.72, learn: 0.28, parry: 0.24, feint: 0.2, unfooled: 0.6, peel: 1.8 }
};
function tierProf(prof, f) {
  const k = aiTier(f); if (f.team === 0 && !(G.match && (G.match.ffa || G.match.online || (G.match.versus && !(G.match.local && G.match.local.startsWith('coop')))))) return prof;
  const growth = botChallenge(f);
  const tierReact = k === 3 ? 0.82 : k === 2 ? 0.92 : 1;
  const tierGuard = k === 3 ? 0.14 : k === 2 ? 0.07 : 0;
  const tierAggr = k === 3 ? 1.1 : k === 2 ? 1.04 : 1;
  return {
    ...prof,
    react: Math.max(0.11, prof.react * tierReact * (1 - 0.35 * growth)),
    guard: Math.min(0.92, prof.guard + tierGuard + 0.16 * growth),
    aggr: prof.aggr * tierAggr * (1 + 0.35 * growth)
  };
}
// which side will this blow come from? a bot guesses, better if it has seen you favour one side
function aiReadArc(f, e) {
  const T = AI_TIER[aiTier(f)], arc = e.action && e.action.arc || 'R2L', seen = f.ai.seen || [];
  const fav = seen.length >= 2 ? ['R2L', 'L2R', 'O'].map(a => [a, seen.filter(s => s === a).length]).sort((a, b) => b[1] - a[1])[0] : null;
  let p = T.read + (fav && fav[0] === arc ? T.learn * Math.min(1, fav[1] / 3) : 0);
  if (e.action && e.action.held) p -= 0.15; // a blow still being cocked is harder to read
  if (chance(clamp(p, 0.1, 0.92))) return arc;
  const others = ['R2L', 'L2R', 'O'].filter(a => a !== arc); return fav && fav[0] !== arc ? fav[0] : pick(others);
}
function noteArc(t, arc) { if (!t.ai) return; const s = t.ai.seen || (t.ai.seen = []); s.push(arc); if (s.length > 5) s.shift(); }
// called from resolveSwing at the guard check: how much of a guarded blow gets through, and is it a parry?
// the side a blow lands on, seen by the defender: the attacker's right-to-left arrives on your left
const ARC_SIDE = { R2L: 'L', L2R: 'R', O: 'H' };
function guardOutcome(f, t, a, bf) {
  noteArc(t, a.arc);
  if (t.isPlayer || t.netUid || t.vin || t.gdir) {
    const want = ARC_SIDE[a.arc] || 'H', g = t.gdir || 'mid';
    if (g === want) return { bf, parry: false };
    return { bf: (bf + 1) / 2, parry: false, wrong: g !== 'mid', mid: g === 'mid' };
  }
  if (!t.ai) return { bf, parry: false };
  const T = AI_TIER[aiTier(t)];
  if (t.ai.gdir && t.ai.gdir !== a.arc) return { bf: (bf + 1) / 2, parry: false, wrong: true }; // guarded the wrong side
  return { bf, parry: chance(T.parry) };
}
// momentum: closing speed toward the target, in m/s
function closingSpeed(f, t) { const d = vnorm({ x: t.pos.x - f.pos.x, z: t.pos.z - f.pos.z }); return Math.max(0, f.vel.x * d.x + f.vel.z * d.z); }
// a bot about to swing may feint instead (tier 2+)
function aiMaybeFeint(f) {
  const T = AI_TIER[aiTier(f)]; if (!T.feint || !f.action || f.action.kind !== 'swing') return;
  if (chance(T.feint)) f.action.feintAt = rand(0.06, Math.max(0.08, (f.action.wind || swingTimes(f).wind) * 0.7));
}
// someone called off a wind-up: bots who'd raised a guard for it may drop it (the better ones aren't fooled for long)
function feintCalled(f) {
  for (const o of G.fighters) {
    if (o.team === f.team || o.isPlayer || !o.ai || !isUp(o) || o.ai.guardT <= 0 || dist2(o.pos, f.pos) > 3) continue;
    if (chance(AI_TIER[aiTier(o)].unfooled)) o.ai.guardT = Math.min(o.ai.guardT, 0.08);
  }
  if (f.isPlayer) { MT.feints = (MT.feints || 0) + 1; }
}
// team play: a bonus for going after whoever is doubling one of my mates
function peelBonus(f, e, mates) {
  const T = AI_TIER[aiTier(f)];
  for (const m of mates) if (dist2(e.pos, m.pos) < 2.5 && facingDot(e, m) > 0.25) {
    let n = 0; for (const o of G.fighters) if (o.team === e.team && isUp(o) && dist2(o.pos, m.pos) < 2.5) n++;
    if (n >= 2) return T.peel;
  }
  return 0;
}

