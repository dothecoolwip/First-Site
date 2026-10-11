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
function aiTier(f) {
  const m = G.match; if (!m) return 1;
  if (m.aiTier) return m.aiTier;
  if (m.trial) return m.trial === 'royal' ? 3 : 2;
  if (m.townBout && typeof TOWN !== 'undefined' && TOWN.boutArena) { const A = ARENAS.find(a => a.key === TOWN.boutArena); return A && A.district === 'ward' ? 3 : A && A.district === 'bailey' ? 2 : 1; }
  return 1;
}
const AI_TIER = {
  1: { read: 0.4, learn: 0.18, parry: 0.04, feint: 0, unfooled: 0, peel: 0.6 },
  2: { read: 0.58, learn: 0.25, parry: 0.14, feint: 0.12, unfooled: 0.35, peel: 1.2 },
  3: { read: 0.72, learn: 0.28, parry: 0.24, feint: 0.2, unfooled: 0.6, peel: 1.8 }
};
function tierProf(prof, f) {
  const k = aiTier(f); if (k <= 1 || f.team === 0 && !(G.match && G.match.ffa)) return prof;
  return { ...prof, react: prof.react * (k === 3 ? 0.82 : 0.92), guard: Math.min(0.95, prof.guard + (k === 3 ? 0.14 : 0.07)), aggr: prof.aggr * (k === 3 ? 1.1 : 1.04) };
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
  for (const m of mates) if (e.ai && e.ai.target === m && engagedBy(m, e.team) >= 2) return T.peel;
  return 0;
}
