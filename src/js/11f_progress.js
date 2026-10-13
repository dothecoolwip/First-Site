// ---------- progression: renown ranks to level 100, tiered awards, weapon mastery, daily and weekly challenges ----------
// Everything here reads counters (lifetime stats plus the extra tallies kept in CAREER.s2) and checks them often.
// Tiered awards pay XP and prize money; tier V of each pays a skill point too.
const S2_DEFAULT = { perfects: 0, helmets: 0, salutes: 0, online: 0, onlineWins: 0, duelWins: 0, teamWins: 0, ffaWins: 0, youthWins: 0, womenWins: 0, menWins: 0, dailies: 0, gauntlets: 0, seasons: 0, ladderBeat: 0, kidsGames: 0, shutouts: 0, comebacks: 0, venue: {}, wpn: {}, wpnXp: {} };
function S2() { CAREER.s2 = Object.assign({}, S2_DEFAULT, CAREER.s2 || {}); for (const k of ['venue', 'wpn', 'wpnXp']) CAREER.s2[k] = CAREER.s2[k] || {}; return CAREER.s2; }
function bump(k, n = 1) { if (G.autopilot || G.attract) return; const s = S2(); s[k] = (s[k] || 0) + n; saveCareer(); progressSoon(); }
// weapon families for mastery and awards
const WFAM = { sword: ['Sword', 'Swordsman'], axe: ['Axe', 'Axeman'], mace: ['Mace', 'Mace-bearer'], longsword: ['Longsword', 'Longswordsman'], longaxe: ['Long axe', 'Long-axe'], polearm: ['Polearm', 'Halberdier'], fantasy: ['Fantasy weapons', 'Storyteller'] };
function wfam(w) {
  if (!w) return null; let k = w.key;
  if (w.fantasy && k !== 'custom') return 'fantasy';
  if (k === 'custom' && w.base) k = w.base;
  if (k === 'falchion' || k === 'short' || k === 'sword') return 'sword';
  return WFAM[k] ? k : (w.hands === 2 ? (w.haft ? 'polearm' : 'longsword') : 'sword');
}
// ---- renown: a title every five levels, level 100 is the top
const RANKS = ['Fresh meat', 'Recruit', 'Novice', 'Squire', 'Shield-bearer', 'Man-at-arms', 'Sergeant', 'Veteran', 'Knight', 'Knight bachelor', 'Banneret', 'Captain', 'Marshal’s pick', 'Champion', 'Lord of the list', 'Warlord', 'Baron of steel', 'Duke of tape', 'Living legend', 'Immortal'];
function rankOf(lv) { return RANKS[Math.min(RANKS.length - 1, Math.floor((Math.max(1, lv) - 1) / 5))]; }
function nextRankAt(lv) { const r = Math.floor((Math.max(1, lv) - 1) / 5); return r >= RANKS.length - 1 ? null : (r + 1) * 5 + 1; }
// cosmetic unlocks by level: more tabard colours and trims
const TABARDS_LV = [['#0b5d3b', 8], ['#4b1d6b', 12], ['#8c1f4f', 16], ['#13324f', 20], ['#6b4e16', 24], ['#2c2c54', 28], ['#9a2a12', 32], ['#335c3f', 36], ['#5a0f0f', 40], ['#1d6b6b', 45], ['#3a3a3a', 50], ['#7c5cbf', 55], ['#c46a1c', 60], ['#0e4d92', 65], ['#a3122a', 70], ['#2b5d1e', 75], ['#5e3c99', 80], ['#d4af37', 85], ['#e5e4e2', 90], ['#000000', 100]];
const TRIMS_LV = [['#c0c0c0', 10], ['#b87333', 18], ['#3ad1b0', 26], ['#ffd166', 34], ['#ef476f', 42], ['#06d6a0', 50], ['#118ab2', 60], ['#f78c6b', 70], ['#ffffff', 80], ['#d4af37', 95]];
function applyCosmeticUnlocks() {
  const lv = CAREER.level || 1;
  for (const [c, need] of TABARDS_LV) if (lv >= need && !TABARDS.includes(c)) TABARDS.push(c);
  for (const [c, need] of TRIMS_LV) if (lv >= need && !TRIMS.includes(c)) TRIMS.push(c);
}
// ---- tiered awards: 5 tiers per counter
const TIER_NAMES = ['I', 'II', 'III', 'IV', 'V'], TIER_MEDAL = ['bronze', 'silver', 'gold', 'platinum', 'legend'];
const T_DEFS = [
  // [counter, award name, what it counts, thresholds]
  ['matches', 'Showing up', 'Play {n} matches', [1, 10, 50, 200, 1000]],
  ['wins', 'Winner', 'Win {n} matches', [1, 10, 50, 200, 750]],
  ['takedowns', 'Floor inspector', 'Take {n} opponents down', [5, 50, 250, 1000, 5000]],
  ['trips', 'Ankle tax', 'Trip {n} opponents', [5, 50, 200, 800, 3000]],
  ['hits', 'Clean contact', 'Land {n} clean hits', [25, 250, 1000, 5000, 20000]],
  ['bigHits', 'Bone shaker', 'Land {n} big hits', [5, 50, 250, 1000, 4000]],
  ['blocks', 'Iron curtain', 'Block {n} blows', [25, 250, 1000, 4000, 15000]],
  ['throws', 'Hip toss', 'Throw {n} people from the clinch', [3, 25, 100, 400, 1500]],
  ['disarms', 'Pickpocket', 'Disarm {n} opponents', [1, 10, 50, 200, 800]],
  ['tackles', 'Battering ram', 'Land {n} tackles', [3, 30, 150, 600, 2000]],
  ['repairs', 'Tape wizard', 'Repair {n} straps', [10, 50, 200, 800, 3000]],
  ['earned', 'Prize purse', 'Earn {n} in prize money', [500, 5000, 25000, 100000, 500000], true],
  ['spent', 'Big spender', 'Spend {n} in the shop', [500, 5000, 25000, 100000, 400000], true],
  ['rumbleWins', 'Rumble royalty', 'Win the Red Deer Rumble {n} times', [1, 3, 10, 25, 100]],
  ['perfects', 'Perfect parry', 'Make {n} perfect blocks', [1, 25, 100, 500, 2000]],
  ['helmets', 'Head hunter', 'Land {n} clean helmet hits', [10, 100, 500, 2000, 8000]],
  ['salutes', 'Crowd favourite', 'Salute the crowd {n} times', [1, 10, 50, 200, 1000]],
  ['online', 'Online regular', 'Play {n} online fights', [1, 10, 50, 200, 1000]],
  ['onlineWins', 'Online champion', 'Win {n} online fights', [1, 10, 50, 200, 750]],
  ['duelWins', 'Duellist', 'Win {n} duels', [1, 10, 50, 200, 750]],
  ['teamWins', 'Team player', 'Win {n} team fights', [1, 10, 50, 200, 750]],
  ['ffaWins', 'Last one standing', 'Win {n} free-for-alls', [1, 5, 25, 100, 400]],
  ['menWins', 'Men’s division', 'Win {n} men’s matches', [1, 10, 50, 200, 750]],
  ['womenWins', 'Women’s division', 'Win {n} women’s matches', [1, 10, 50, 200, 750]],
  ['youthWins', 'Little knight', 'Win {n} youth matches', [1, 5, 25, 100, 400]],
  ['dailies', 'Daily grind', 'Finish {n} Rumbles of the Day', [1, 7, 30, 100, 365]],
  ['gauntlets', 'Gauntlet runner', 'Win {n} Gauntlet runs', [1, 3, 10, 25, 100]],
  ['seasons', 'League table', 'Win {n} summer seasons', [1, 2, 5, 10, 25]],
  ['ladderBeat', 'Ladder climber', 'Win {n} Duel Ladder fights', [1, 5, 10, 25, 60]],
  ['kidsGames', 'Playground', 'Play {n} Little Knights games', [1, 10, 50, 200, 800]],
  ['shutouts', 'Shutout', 'Win {n} matches without dropping a round', [1, 10, 50, 200, 750]],
  ['comebacks', 'Comeback kid', 'Win {n} matches after losing the first round', [1, 5, 25, 100, 400]],
  ['minutes', 'Time served', 'Play for {n} minutes', [30, 300, 1500, 6000, 30000]],
  ['level', 'Renown', 'Reach level {n}', [5, 10, 25, 50, 100]],
  ['bestStreak', 'On a roll', 'Win {n} matches in a row', [3, 5, 10, 20, 50]],
  ['tdMatch', 'Wrecking crew', 'Take {n} opponents down in one match', [2, 4, 6, 8, 12]],
  ['gathered', 'Gatherer', 'Gather {n} things round the festival', [10, 100, 500, 2000, 8000]],
  ['made', 'Maker', 'Make {n} things at the furnace, the anvil or the bench', [1, 25, 100, 400, 1500]],
  ['tradeLv', 'Tradesman', 'Reach a total of {n} trade levels', [12, 40, 90, 180, 300]],
  ['achCount', 'Completionist', 'Earn {n} other awards', [10, 50, 100, 175, 230]],
];
const VENUE_T = [1, 10, 50, 150, 500], WPN_T = [1, 10, 50, 200, 750];
function buildTieredAch() {
  const out = [];
  for (const [k, nm, desc, th, money] of T_DEFS) th.forEach((n, i) => out.push({ id: `t_${k}_${i + 1}`, name: `${nm} ${TIER_NAMES[i]}`, desc: desc.replace('{n}', money ? fmtMoney(n) : n.toLocaleString('en-CA')), tier: i + 1, counter: k, need: n, group: k }));
  for (const V of Object.values(VENUES)) VENUE_T.forEach((n, i) => out.push({ id: `t_v_${V.key}_${i + 1}`, name: `${V.name} ${TIER_NAMES[i]}`, desc: `Win ${n} matches at ${V.name}`, tier: i + 1, counter: 'venue:' + V.key, need: n, group: 'venue:' + V.key }));
  for (const [fk, [fn]] of Object.entries(WFAM)) WPN_T.forEach((n, i) => out.push({ id: `t_w_${fk}_${i + 1}`, name: `${fn} ${TIER_NAMES[i]}`, desc: `Win ${n} matches with ${fn.toLowerCase().startsWith('fantasy') ? 'a fantasy weapon' : 'a ' + fn.toLowerCase()}`, tier: i + 1, counter: 'wpn:' + fk, need: n, group: 'wpn:' + fk }));
  return out;
}
const TIERED_ACH = buildTieredAch();
ACH.push(...TIERED_ACH);
function counterValue(k) {
  const s = S2(), S = CAREER.stats, R = CAREER.records || {};
  if (k.startsWith('venue:')) return s.venue[k.slice(6)] || 0;
  if (k.startsWith('wpn:')) return s.wpn[k.slice(4)] || 0;
  if (k === 'minutes') return Math.floor((CAREER.playSec || 0) / 60);
  if (k === 'level') return CAREER.level || 1;
  if (k === 'bestStreak') return R.streak || 0;
  if (k === 'gathered' || k === 'made') return (CAREER.trades && CAREER.trades[k]) || 0;
  if (k === 'tradeLv') return typeof TRADE_SKILLS === 'undefined' ? 0 : Object.keys(TRADE_SKILLS).reduce((a, sk) => a + tradeLevel(sk), 0);
  if (k === 'tdMatch') return R.tdMatch || 0;
  if (k === 'achCount') return Object.keys(CAREER.ach).filter(id => !id.startsWith('t_achCount')).length;
  if (k in S) return S[k] || 0;
  return s[k] || 0;
}
// ---- weapon mastery: XP per family from hits, takedowns and wins with it; 10 levels each
const MASTERY_NEED = lv => 150 * lv;
function masteryOf(fk) { let xp = S2().wpnXp[fk] || 0, lv = 0; while (lv < 10 && xp >= MASTERY_NEED(lv + 1)) { xp -= MASTERY_NEED(lv + 1); lv++; } return { lv, xp, need: lv >= 10 ? 0 : MASTERY_NEED(lv + 1) }; }
function masteryXp(fk, n) {
  if (!fk || G.autopilot || G.attract) return; const before = masteryOf(fk).lv; S2().wpnXp[fk] = (S2().wpnXp[fk] || 0) + n; const after = masteryOf(fk).lv;
  if (after > before) { ACHQ.push({ kicker: 'Weapon mastery', name: `${WFAM[fk][0]} mastery ${after}`, desc: after >= 10 ? `Mastered: you're a ${WFAM[fk][1]}. +1 skill point.` : `+${after * 40} XP` }); if (after >= 10) { skillsState(); } else gainXP(after * 40); if (!ACHQ.busy) showAch(); }
}
// ---- daily and weekly challenges: progress counts from the day's (or week's) starting numbers
const CHALLENGES = [
  ['hits', 'Land {n} clean hits', [20, 40, 60]], ['takedowns', 'Take {n} opponents down', [3, 6, 10]], ['trips', 'Trip {n} opponents', [3, 6, 10]],
  ['blocks', 'Block {n} blows', [15, 30, 50]], ['wins', 'Win {n} matches', [1, 2, 4]], ['matches', 'Play {n} matches', [2, 4, 6]],
  ['helmets', 'Land {n} helmet hits', [5, 10, 20]], ['perfects', 'Make {n} perfect blocks', [1, 3, 6]], ['repairs', 'Repair {n} straps', [2, 4, 8]],
  ['throws', 'Throw {n} people', [1, 3, 5]], ['duelWins', 'Win {n} duels', [1, 2, 3]], ['teamWins', 'Win {n} team fights', [1, 2, 3]],
  ['salutes', 'Salute the crowd {n} times', [1, 3, 5]], ['online', 'Play {n} online fights', [1, 2, 3]], ['bigHits', 'Land {n} big hits', [3, 6, 10]],
  ['tackles', 'Land {n} tackles', [2, 4, 6]], ['minutes', 'Play for {n} minutes', [10, 20, 40]], ['kidsGames', 'Play {n} Little Knights games', [1, 2, 3]],
];
function weekKey(d = new Date()) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(); return y + '-W' + Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7); }
function challengeSet(key, n, big) {
  const r = seeded('ch' + key); const pool = CHALLENGES.slice(), out = [];
  while (out.length < n && pool.length) { const [k, t, ns] = pool.splice(Math.floor(r() * pool.length), 1)[0]; const need = big ? ns[2] * 4 : ns[Math.floor(r() * 3)]; out.push({ k, need, text: t.replace('{n}', need) }); }
  return out;
}
function challenges() {
  const D = CAREER.chal = CAREER.chal || {}, today = dateKey(), wk = weekKey();
  const snap = list => Object.fromEntries(list.map(c => [c.k, counterValue(c.k)]));
  if (D.day !== today) { const list = challengeSet(today, 3); Object.assign(D, { day: today, daily: list, dBase: snap(list), dDone: {} }); saveCareer(); }
  if (D.week !== wk) { const list = challengeSet(wk, 2, true); Object.assign(D, { week: wk, weekly: list, wBase: snap(list), wDone: {} }); saveCareer(); }
  return D;
}
function chalProgress(c, base) { return Math.max(0, counterValue(c.k) - (base[c.k] || 0)); }
// ---- checking: after anything notable, a moment later
let progT = 0;
function progressSoon() { if (progT) return; progT = setTimeout(() => { progT = 0; progressCheck(); }, 600); }
function progressCheck() {
  if (G.autopilot) return; // counters only change in real play, so checking on the title screen is safe
  const fresh = TIERED_ACH.filter(a => !CAREER.ach[a.id] && counterValue(a.counter) >= a.need);
  if (fresh.length > 3) { // a big batch (an old save catching up): one summary instead of a long queue of pop-ups
    let xp = 0, cash = 0, sp = 0; skillsState();
    for (const a of fresh) { CAREER.ach[a.id] = Date.now(); xp += 60 * a.tier * a.tier; cash += 50 * a.tier; if (a.tier === 5) sp++; }
    skillsState(); saveCareer(); gainXP(xp); pay(cash);
    ACHQ.push({ kicker: 'Awards', name: `${fresh.length} awards earned`, desc: `+${xp} XP, +$${cash}${sp ? `, +${sp} skill point${sp === 1 ? '' : 's'}` : ''}. See Your fighter, Awards.` }); if (!ACHQ.busy) showAch();
  } else for (const a of fresh) unlock(a.id, true);
  const D = challenges();
  D.daily.forEach((c, i) => { if (!D.dDone[i] && chalProgress(c, D.dBase) >= c.need) { D.dDone[i] = 1; gainXP(200); pay(100); ACHQ.push({ kicker: 'Daily challenge done', name: c.text, desc: '+200 XP, +$100' }); if (!ACHQ.busy) showAch(); saveCareer(); } });
  D.weekly.forEach((c, i) => { if (!D.wDone[i] && chalProgress(c, D.wBase) >= c.need) { D.wDone[i] = 1; gainXP(800); pay(400); ACHQ.push({ kicker: 'Weekly challenge done', name: c.text, desc: '+800 XP, +$400' }); if (!ACHQ.busy) showAch(); saveCareer(); } });
  applyCosmeticUnlocks();
}
setInterval(progressCheck, 60000);
// what you do in a fight feeds the tallies and your weapon's mastery
EV_LISTENERS.push((type, d) => {
  const p = G.player, fk = p && wfam(p.weapon || (p.spec && WEAPONS[p.spec.weapon]));
  if (type === 'perfect') bump('perfects');
  else if (type === 'salute') bump('salutes');
  else if (type === 'hit' && d && !d.blocked) { if (d.zone === 'helmet') S2().helmets++; masteryXp(fk, d.big ? 4 : 2); progressSoon(); }
  else if (type === 'takedown') { masteryXp(fk, 15); progressSoon(); }
  else if (type === 'block' || type === 'trip' || type === 'throw' || type === 'disarm' || type === 'tackle' || type === 'repair') progressSoon();
});
// end of a match (any mode, online included)
function progressMatch(m, won) {
  if (G.autopilot || G.attract || !m || m.training) return;
  const s = S2(), p = G.player, fk = p && wfam(p.weapon || (p.spec && WEAPONS[p.spec.weapon]));
  if (m.online) { s.online++; if (won) s.onlineWins++; }
  if (won) {
    if (m.ffa) s.ffaWins++; else if (m.duel || m.mode === 1) s.duelWins++; else s.teamWins++;
    const cat = m.category || G.category; if (cat === 'youth') s.youthWins++; else if (cat === 'women') s.womenWins++; else s.menWins++;
    if (W3.venue) s.venue[W3.venue] = (s.venue[W3.venue] || 0) + 1;
    if (fk) { s.wpn[fk] = (s.wpn[fk] || 0) + 1; masteryXp(fk, 40); }
    const res = m.results || [], t = p ? (p.team > 0 && !m.ffa ? p.team : 0) : 0;
    if (res.length && res.every(r => r.winner === t || r.winner < 0)) s.shutouts++;
    if (res.length > 1 && res[0].winner >= 0 && res[0].winner !== t) s.comebacks++;
  }
  if (m.online) { // online fights don't go through the offline purse; pay a little and give XP here
    gainXP(40 + (won ? 120 : 0)); pay(won ? 60 : 20);
  }
  saveCareer(); progressCheck();
}
// ---- the Progress tab in Your fighter
function renderProgress(box) {
  skillsState(); const lv = CAREER.level || 1, nx = nextRankAt(lv);
  box.append(h('div', { class: 'rankcard' }, h('span', { class: 'lvnum num' }, String(lv)), h('div', null, h('b', null, rankOf(lv)), h('span', { class: 'xpbar' }, h('i', { style: `width:${Math.round((CAREER.xp || 0) / xpNeed(lv) * 100)}%` })), h('small', { class: 'muted' }, `${CAREER.xp || 0} / ${xpNeed(lv)} XP to level ${lv + 1}${nx ? ` · next rank, ${rankOf(nx)}, at level ${nx}` : ' · top rank'}`))));
  // challenges
  const D = challenges();
  const chal = (c, i, base, done, reward) => { const pr = Math.min(c.need, chalProgress(c, base)); return h('div', { class: 'chal' + (done[i] ? ' done' : '') }, h('span', null, c.text), h('span', { class: 'xpbar' }, h('i', { style: `width:${Math.round(pr / c.need * 100)}%` })), h('small', { class: 'muted num' }, done[i] ? '✓ done' : `${pr} / ${c.need} · ${reward}`)); };
  box.append(h('h4', { class: 'invh' }, 'Today’s challenges'));
  const dl = h('div', { class: 'chals' }); D.daily.forEach((c, i) => dl.append(chal(c, i, D.dBase, D.dDone, '200 XP, $100'))); box.append(dl);
  box.append(h('h4', { class: 'invh' }, 'This week'));
  const wl = h('div', { class: 'chals' }); D.weekly.forEach((c, i) => wl.append(chal(c, i, D.wBase, D.wDone, '800 XP, $400'))); box.append(wl);
  // weapon mastery
  box.append(h('h4', { class: 'invh' }, 'Weapon mastery'));
  const ml = h('div', { class: 'chals' });
  for (const [fk, [fn, title]] of Object.entries(WFAM)) { const M = masteryOf(fk); ml.append(h('div', { class: 'chal' + (M.lv >= 10 ? ' done' : '') }, h('span', null, `${fn} · level ${M.lv}${M.lv >= 10 ? ', ' + title : ''}`), h('span', { class: 'xpbar' }, h('i', { style: `width:${M.lv >= 10 ? 100 : Math.round(M.xp / M.need * 100)}%` })), h('small', { class: 'muted num' }, M.lv >= 10 ? 'mastered' : `${M.xp} / ${M.need}`))); }
  box.append(ml);
  // unlocks
  const nextT = TABARDS_LV.find(([, n]) => n > lv), nextTr = TRIMS_LV.find(([, n]) => n > lv);
  box.append(h('p', { class: 'muted small' }, `Unlocked ${TABARDS_LV.filter(([, n]) => n <= lv).length} of ${TABARDS_LV.length} bonus tabard colours and ${TRIMS_LV.filter(([, n]) => n <= lv).length} of ${TRIMS_LV.length} trims.${nextT ? ` Next tabard at level ${nextT[1]}.` : ''}${nextTr ? ` Next trim at level ${nextTr[1]}.` : ''} Every level also pays prize money.`));
}
// the Awards tab, grouped: the originals first, then every tiered track with its next goal
function renderAwards(box) {
  const got = Object.keys(CAREER.ach).length;
  box.append(h('p', { class: 'muted small' }, `${got} of ${ACH.length} awards. Tiered awards pay XP and money; tier V pays a skill point.`));
  const orig = ACH.filter(a => !a.tier);
  const ag = h('div', { class: 'achs' }); for (const a of orig) ag.append(h('div', { class: 'ach' + (CAREER.ach[a.id] ? ' on' : '') }, h('b', null, a.name), h('span', null, a.desc))); box.append(ag);
  box.append(h('h4', { class: 'invh' }, 'Tiered awards'));
  const groups = {}; for (const a of TIERED_ACH) (groups[a.group] = groups[a.group] || []).push(a);
  const tg = h('div', { class: 'achs tiered' });
  for (const list of Object.values(groups)) {
    const done = list.filter(a => CAREER.ach[a.id]).length, next = list.find(a => !CAREER.ach[a.id]), v = counterValue(list[0].counter);
    const medals = h('span', { class: 'medals' }); list.forEach((a, i) => medals.append(h('i', { class: (CAREER.ach[a.id] ? 'on ' : '') + TIER_MEDAL[i], title: a.name })));
    const base = list[0].name.replace(/ I$/, '');
    tg.append(h('div', { class: 'ach' + (done ? ' on' : '') }, h('b', null, base), medals, h('span', null, next ? `${next.desc} (${Math.min(v, next.need).toLocaleString('en-CA')} / ${next.need.toLocaleString('en-CA')})` : 'All five tiers done'), next ? h('span', { class: 'xpbar' }, h('i', { style: `width:${Math.round(Math.min(1, v / next.need) * 100)}%` })) : null));
  }
  box.append(tg);
}
applyCosmeticUnlocks();

