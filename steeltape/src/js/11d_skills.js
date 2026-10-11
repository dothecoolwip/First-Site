// ---------- skill trees: XP, levels, five trees of perks ----------
// Tier gates: a node needs this many points already spent in its tree (0, 2, 5, 8, 11 for the capstone).
const TIER_GATE = [0, 2, 5, 8, 11];
const SKILL_TREES = [
  { key: 'steel', name: 'Steel', color: '#d6dde0', blurb: 'Striking: harder, faster, nastier blows.', icon: 'sword', nodes: [
    { id: 'heavy', name: 'Heavy hands', desc: 'Strikes push {4}% harder per rank.', max: 3, tier: 0, col: 0 },
    { id: 'recover', name: 'Quick recovery', desc: 'Recover from a swing {5}% faster per rank.', max: 3, tier: 0, col: 2 },
    { id: 'windup', name: 'Wind-up discipline', desc: 'Heavy blows charge 25% faster.', max: 1, tier: 1, col: 0, req: 'heavy' },
    { id: 'ringer', name: 'Bell ringer', desc: 'Helmet hits ring their bell 35% more.', max: 1, tier: 1, col: 2, req: 'recover' },
    { id: 'overhead', name: 'Overhead specialist', desc: 'Overheads hit 12% harder with a wider window.', max: 2, tier: 2, col: 0, req: 'windup' },
    { id: 'combo', name: 'Combo flow', desc: 'Each hit within 1.2 s of the last adds 8% (stacks 3).', max: 1, tier: 2, col: 1 },
    { id: 'armbreak', name: 'Arm breaker', desc: 'Arm hits knock weapons loose 60% more often per rank.', max: 2, tier: 2, col: 2, req: 'ringer' },
    { id: 'reaper', name: 'Long arc', desc: 'Your swings reach 10 cm further per rank.', max: 2, tier: 3, col: 1, req: 'combo' },
    { id: 'thunder', name: 'Thunderclap', desc: 'Capstone. Fully charged hits stagger everyone around the target.', max: 1, tier: 4, col: 1, req: 'reaper', cap: true },
  ] },
  { key: 'grapple', name: 'Grapple', color: '#e8675c', blurb: 'Trips, throws and dirty work in the clinch.', icon: 'hand', nodes: [
    { id: 'ankle', name: 'Ankle hunter', desc: 'Trips land {4}% more often per rank.', max: 3, tier: 0, col: 0 },
    { id: 'shove', name: 'Snap shove', desc: 'Shoves push {7}% harder per rank.', max: 3, tier: 0, col: 2 },
    { id: 'longarms', name: 'Long arms', desc: 'Trip and grab reach +15 cm.', max: 1, tier: 1, col: 0, req: 'ankle' },
    { id: 'opportunist', name: 'Opportunist', desc: 'The trip window after a shove lasts 50% longer.', max: 1, tier: 1, col: 2, req: 'shove' },
    { id: 'grip', name: 'Iron grip', desc: 'Throws from the clinch land 10% more often per rank.', max: 2, tier: 2, col: 0, req: 'longarms' },
    { id: 'hiptoss', name: 'Hip toss', desc: 'Throws fling them 25% harder.', max: 1, tier: 2, col: 1 },
    { id: 'pickpocket', name: 'Pickpocket', desc: 'Disarms in the clinch work 15% more often per rank.', max: 2, tier: 2, col: 2, req: 'opportunist' },
    { id: 'chain', name: 'Chain wrestler', desc: 'After a successful throw your next trip is 25% likelier.', max: 1, tier: 3, col: 1, req: 'hiptoss' },
    { id: 'suplex', name: 'Suplex', desc: 'Capstone. Throws always land on anyone below 40% stamina.', max: 1, tier: 4, col: 1, req: 'chain', cap: true },
  ] },
  { key: 'iron', name: 'Iron', color: '#5b9be6', blurb: 'Balance, guard and staying on your feet.', icon: 'shield', nodes: [
    { id: 'rooted', name: 'Rooted', desc: '+{3}% balance per rank.', max: 3, tier: 0, col: 0 },
    { id: 'thick', name: 'Thick skin', desc: 'Hits on you push {4}% less per rank.', max: 3, tier: 0, col: 2 },
    { id: 'brace', name: 'Brace for impact', desc: 'Bracing soaks 15% more.', max: 1, tier: 1, col: 0, req: 'rooted' },
    { id: 'wall', name: 'Shield wall', desc: 'Blows through your guard push 12% less per rank.', max: 2, tier: 1, col: 2, req: 'thick' },
    { id: 'rail', name: 'Rail fighter', desc: '+30% balance when pinned against the rail.', max: 1, tier: 2, col: 0, req: 'brace' },
    { id: 'neck', name: 'Iron neck', desc: 'Helmet hits ring your bell 40% less.', max: 1, tier: 2, col: 1 },
    { id: 'anchor', name: 'Anchor', desc: 'Tackles and charges push you 20% less per rank.', max: 2, tier: 2, col: 2, req: 'wall' },
    { id: 'catch', name: 'Catlike', desc: 'Recovery steps reach 15% further, so you catch yourself more.', max: 1, tier: 3, col: 1, req: 'neck' },
    { id: 'unbreak', name: 'Unbreakable', desc: 'Capstone. Once per round, your first fall becomes a stumble.', max: 1, tier: 4, col: 1, req: 'catch', cap: true },
  ] },
  { key: 'lungs', name: 'Lungs', color: '#62c462', blurb: 'Stamina, footwork and running people over.', icon: 'wind', nodes: [
    { id: 'breath', name: 'Deep breaths', desc: 'Stamina comes back {8}% faster per rank.', max: 3, tier: 0, col: 0 },
    { id: 'footwork', name: 'Footwork', desc: 'Turn and accelerate {6}% faster per rank.', max: 3, tier: 0, col: 2 },
    { id: 'sprinter', name: 'Sprinter', desc: 'Run 7% faster.', max: 1, tier: 1, col: 0, req: 'breath' },
    { id: 'marathon', name: 'Marathon', desc: 'Running drains 30% less stamina.', max: 1, tier: 1, col: 2, req: 'footwork' },
    { id: 'charger', name: 'Charger', desc: 'Tackles hit 20% harder per rank.', max: 2, tier: 2, col: 0, req: 'sprinter' },
    { id: 'second', name: 'Second wind', desc: 'Once per round, at 20% stamina you get 35% back.', max: 1, tier: 2, col: 1 },
    { id: 'slip', name: 'Slippery', desc: 'Swings that miss you leave the swinger 25% more off balance.', max: 1, tier: 2, col: 2, req: 'marathon' },
    { id: 'endure', name: 'Endurance', desc: 'Swings and shoves cost 20% less stamina per rank.', max: 2, tier: 3, col: 1, req: 'second' },
    { id: 'freight', name: 'Freight train', desc: 'Capstone. Full-sprint tackles hit 60% harder.', max: 1, tier: 4, col: 1, req: 'endure', cap: true },
  ] },
  { key: 'show', name: 'Showman', color: '#ff3d8b', blurb: 'The crowd, the purse, the bench and your squad.', icon: 'star', nodes: [
    { id: 'purse', name: 'Crowd pleaser', desc: 'Prize money +{12}% per rank.', max: 3, tier: 0, col: 0 },
    { id: 'tape', name: 'Tape artist', desc: 'Repairs come out 15% better, with 15 s more on the clock.', max: 1, tier: 0, col: 2 },
    { id: 'scout', name: 'Fast learner', desc: 'XP +{15}% per rank.', max: 2, tier: 1, col: 0, req: 'purse' },
    { id: 'marshal', name: "Marshal's favourite", desc: 'Your first warning each match is let go.', max: 1, tier: 1, col: 2, req: 'tape' },
    { id: 'hype', name: 'Hype', desc: 'Your takedowns steady your whole team (+{5}% balance for 10 s) per rank.', max: 2, tier: 2, col: 0, req: 'scout' },
    { id: 'rally', name: 'Rally', desc: 'Teammates keep their feet 8% better while you stand.', max: 1, tier: 2, col: 1 },
    { id: 'taunt', name: 'Taunt', desc: 'Opponents near you lose 10% balance when you land a big hit.', max: 1, tier: 2, col: 2, req: 'marshal' },
    { id: 'captain', name: 'Captain', desc: 'Squad calls make your team 6% steadier for 8 s per rank.', max: 2, tier: 3, col: 1, req: 'rally' },
    { id: 'legend', name: 'Legend', desc: 'Capstone. Your takedowns send the crowd wild: big team buff for 8 s.', max: 1, tier: 4, col: 1, req: 'captain', cap: true },
  ] },
];
const SKILL_BY_ID = {}; SKILL_TREES.forEach(T => T.nodes.forEach(n => { n.tree = T.key; SKILL_BY_ID[T.key + '.' + n.id] = n; }));
function skillsState() { if (!CAREER.skills) CAREER.skills = {}; if (CAREER.xp == null) { CAREER.xp = 0; CAREER.level = 1; CAREER.sp = 3; } return CAREER.skills; }
// rank of a perk for this fighter (only the player has perks)
function perk(f, key) { if (!f || !f.isPlayer || G.autopilot) return 0; return (CAREER.skills && CAREER.skills[key]) || 0; }
function treeSpent(tree) { const S = skillsState(); let n = 0; for (const k in S) if (k.startsWith(tree + '.')) n += S[k]; return n; }
function totalSpent() { const S = skillsState(); let n = 0; for (const k in S) n += S[k]; return n; }
function xpNeed(lv) { return 120 + 80 * lv; }
function canLearn(n) {
  const S = skillsState(), key = n.tree + '.' + n.id, r = S[key] || 0;
  if (r >= n.max) return 'Maxed';
  if (CAREER.sp <= 0) return 'No skill points';
  if (treeSpent(n.tree) < TIER_GATE[n.tier]) return `Needs ${TIER_GATE[n.tier]} points in ${SKILL_TREES.find(t => t.key === n.tree).name}`;
  if (n.req && !(S[n.tree + '.' + n.req] > 0)) return `Needs ${SKILL_BY_ID[n.tree + '.' + n.req].name}`;
  return '';
}
function learn(n) { const why = canLearn(n); if (why) return why; const S = skillsState(), key = n.tree + '.' + n.id; S[key] = (S[key] || 0) + 1; CAREER.sp--; saveCareer(); AU.cheer(0.5); return ''; }
// XP for everything you do; a level is a skill point
const XP_FOR = { hit: 3, block: 2, trip: 8, throw: 12, disarm: 12, tackle: 6, takedown: 25, knee: 1, shove: 2, repair: 6 };
function gainXP(amount, why) {
  if (G.autopilot || G.attract || amount <= 0) return; skillsState();
  amount = Math.round(amount * (1 + 0.15 * ((CAREER.skills['show.scout']) || 0)) * shopXpMult());
  CAREER.xp += amount; MT.xp = (MT.xp || 0) + amount;
  while (CAREER.xp >= xpNeed(CAREER.level)) { CAREER.xp -= xpNeed(CAREER.level); CAREER.level++; CAREER.sp++; levelUp(); }
}
function levelUp() { const cash = 25 * CAREER.level; CAREER.purse += cash; CAREER.stats.earned += cash; const rk = CAREER.level % 5 === 1 && CAREER.level > 1 ? ` New rank: ${rankOf(CAREER.level)}!` : ''; if (typeof applyCosmeticUnlocks === 'function') applyCosmeticUnlocks(); ACHQ.push({ name: `Level ${CAREER.level}`, desc: `Skill point and $${cash} earned.${rk}`, kicker: 'Level up' }); if (!ACHQ.busy) showAch(); AU.cheer(1.1); updateTitlePurse(); }
EV_LISTENERS.push((type, d) => {
  if (type === 'hit') { if (!d.blocked) gainXP(XP_FOR.hit + (d.big ? 5 : 0)); return; }
  if (XP_FOR[type] && (type !== 'trip' || d.ok)) gainXP(XP_FOR[type]);
});

// ---- the skills screen: five columns, tiers top to bottom, lines to prerequisites ----
const ICONS_SVG = {
  sword: '<path d="M5 19l3-3M7 21l-4-4M8 16L19 5V3h-2L6 14"/>',
  hand: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V11M16 11V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.6L7 15"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
};
function iconSvg(k) { return `<svg viewBox="0 0 24 24" class="sico">${ICONS_SVG[k]}</svg>`; }
function renderSkills(box) {
  skillsState();
  const sel = G.skillSel || 'steel.heavy';
  const head = h('div', { class: 'skhead' },
    h('div', { class: 'sklv' }, h('span', { class: 'lvnum num' }, String(CAREER.level)), h('span', null, h('b', null, `Level ${CAREER.level}`), h('span', { class: 'xpbar' }, h('i', { style: `width:${Math.round(CAREER.xp / xpNeed(CAREER.level) * 100)}%` })), h('small', { class: 'muted num' }, `${CAREER.xp} / ${xpNeed(CAREER.level)} XP`))),
    h('div', { class: 'skpts' + (CAREER.sp > 0 ? ' has' : '') }, h('b', { class: 'num' }, String(CAREER.sp)), h('span', null, CAREER.sp === 1 ? 'skill point' : 'skill points')),
    h('button', { class: 'chip', onclick: () => { const n = totalSpent(); if (!n) return; if (!renderSkills.armed) { renderSkills.armed = true; setTimeout(() => renderSkills.armed = false, 3000); toastMenu('Press again to refund every point'); return; } CAREER.sp += n; CAREER.skills = {}; saveCareer(); renderCareer(); } }, 'Refund all'));
  box.append(head);
  const trees = h('div', { class: 'sktrees' });
  for (const T of SKILL_TREES) {
    const spent = treeSpent(T.key);
    const col = h('div', { class: 'sktree', style: `--tc:${T.color}` }, h('div', { class: 'sktitle' }, h('span', { html: iconSvg(T.icon) }), h('b', null, T.name), h('span', { class: 'num spent' }, String(spent))));
    const grid = h('div', { class: 'skgrid' });
    const svgNS = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('class', 'sklines'); svg.setAttribute('viewBox', '0 0 300 500'); svg.setAttribute('preserveAspectRatio', 'none');
    const pos = n => ({ x: 50 + n.col * 100, y: 50 + n.tier * 100 });
    for (const n of T.nodes) if (n.req) { const a = pos(SKILL_BY_ID[T.key + '.' + n.req]), b = pos(n); const l = document.createElementNS(svgNS, 'line'); l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y); l.setAttribute('class', (CAREER.skills[T.key + '.' + n.req] > 0 ? 'on' : '')); svg.append(l); }
    for (let t = 1; t < 5; t++) { const l = document.createElementNS(svgNS, 'line'); l.setAttribute('x1', 6); l.setAttribute('x2', 294); l.setAttribute('y1', t * 100); l.setAttribute('y2', t * 100); l.setAttribute('class', 'gate' + (spent >= TIER_GATE[t] ? ' open' : '')); svg.append(l); }
    grid.append(svg);
    for (const n of T.nodes) {
      const key = T.key + '.' + n.id, r = CAREER.skills[key] || 0, why = canLearn(n);
      const state = r >= n.max ? 'max' : r > 0 ? 'some' : !why ? 'avail' : (why === 'No skill points' && spent >= TIER_GATE[n.tier] && (!n.req || CAREER.skills[T.key + '.' + n.req] > 0)) ? 'ready' : 'locked';
      const b = h('button', { class: `sknode ${state}${n.cap ? ' cap' : ''}${sel === key ? ' sel' : ''}`, style: `grid-column:${n.col + 1};grid-row:${n.tier + 1}`, 'aria-label': `${n.name}, rank ${r} of ${n.max}`, onclick: () => { G.skillSel = key; renderCareer(); }, ondblclick: () => { if (!learn(n)) renderCareer(); } },
        h('span', { html: iconSvg(n.cap ? 'star' : T.icon) }), h('i', { class: 'rk num' }, `${r}/${n.max}`));
      grid.append(b);
    }
    col.append(grid); trees.append(col);
  }
  const wrap = h('div', { class: 'skwrap' }); wrap.append(trees); box.append(wrap);
  // the selected node, with its learn button
  const n = SKILL_BY_ID[sel] || SKILL_BY_ID['steel.heavy']; const T = SKILL_TREES.find(t => t.key === n.tree);
  const r = CAREER.skills[n.tree + '.' + n.id] || 0, why = canLearn(n);
  const desc = n.desc.replace(/\{(\d+)\}/g, (m, v) => String(+v)) + (n.max > 1 ? ` Rank ${r} of ${n.max}.` : '');
  wrap.append(h('div', { class: 'skdetail', style: `--tc:${T.color}` },
    h('div', null, h('b', null, n.name), h('span', { class: 'muted small' }, ` ${T.name}${n.cap ? ', capstone' : ''}, tier ${n.tier + 1}`), h('p', { class: 'small' }, desc)),
    h('button', { class: 'btn ' + (why ? 'tape' : 'primary flagtape') + ' small', 'data-gp': why ? null : 'A', disabled: why ? true : null, onclick: () => { if (!learn(n)) renderCareer(); } }, why || (r ? 'Rank up' : 'Learn'))));
}
