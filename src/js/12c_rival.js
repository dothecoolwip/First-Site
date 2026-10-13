// ---------- your rival: one named fighter who remembers how you beat them and comes back better ----------
const RIVAL_NAMES = { men: ['Brannock Vale', 'Casimir Rook', 'Garrick Stone', 'Torvald Kane'], women: ['Sigrun Holt', 'Morwen Ashby', 'Ilse Varga', 'Reyna Cole'], youth: ['Dex Thorne', 'Wren Ashby', 'Max Rook', 'Juno Vale'] };
function rivalState() {
  if (!CAREER.rival) { const i = (Math.random() * 4) | 0; CAREER.rival = { pick: i, arch: pick(['striker', 'grappler', 'heavy', 'runner']), helm: pick(['greathelm', 'pigface', 'sallet', 'barbute']), w: 0, l: 0, brace: 0, guard: 0, react: 0, last: null, taunt: 0 }; saveCareer(); }
  return CAREER.rival;
}
function rivalName(cat) { const R = rivalState(); if (CLUBS.rival && CLUBS.rival.roster[0].keep) return CLUBS.rival.roster[0].name; R.names = R.names || {}; if (!R.names[cat]) { R.names[cat] = poolName({}); saveCareer(); } return R.names[cat]; }
function rivalClub() {
  const R = rivalState(), cat = G.category, nm = rivalName(cat);
  const lvl = R.w + R.l, prof = { react: Math.max(0.1, 0.26 - 0.02 * lvl - 0.04 * R.react), aggr: 1.0 + 0.04 * lvl, guard: Math.min(0.85, 0.5 + 0.08 * R.guard + 0.02 * lvl), cancel: 0.9 };
  const RT = typeof ROSTER !== 'undefined' && ROSTER.rebranded ? (() => { const r = seeded('rival' + (CAREER.club.bos || '') + R.pick); const ts = ROSTER.teams.filter(t => t.slug !== CAREER.club.bos && ROSTER.fighters.some(f => f.team === t.slug)); return ts.length ? ts[Math.floor(r() * ts.length)] : null; })() : null;
  const RB = RT && CLUBS['bos:' + RT.slug], rnm = RT ? (ROSTER.fighters.filter(f => f.team === RT.slug && (cat === 'women' ? f.g !== 'm' : f.g !== 'f'))[R.pick % 4] || ROSTER.fighters.find(f => f.team === RT.slug)) : null;
  CLUBS.rival = { key: 'rival', name: RB ? RB.name : 'Festival Company', full: `${rnm ? rnm.name : nm} of ${RB ? RB.full : 'Festival Company'}`, short: RB ? RB.short : 'BLK', tabard: RB ? RB.tabard : '#231a2e', trim: RB ? RB.trim : '#c9a227', charge: RB ? RB.charge : 'saltire', flag: '#3b93ff', bos: RT ? RT.slug : null,
    roster: [{ num: 13, name: rnm ? rnm.name : nm, keep: !!rnm, bos: rnm ? { id: rnm.id, team: rnm.team } : null, arch: R.arch, weapon: 'sword', shield: 'heater', helm: R.helm, prof, stab: 1.02 + 0.03 * Math.min(6, lvl) + 0.05 * R.brace }] };
  return CLUBS.rival;
}
function startGrudge() {
  AU.init(); G.attract = false; G.tourney = null; REP.log = []; endTraining(); rivalClub();
  setupMatch({ mode: 1, opp: 'rival', stage: 'Grudge match', venue: G.quickVenue || 'castle', rival: true }); toTactics();
}
function openRival() {
  const R = rivalState(), nm = rivalName(G.category), lvl = R.w + R.l;
  const read = R.last === 'trip' ? 'Since you tripped them last time, they plant their feet and brace more.' : R.last === 'hit' ? 'Since you out-struck them last time, their guard comes up faster.' : 'They have been watching your fights.';
  msg('rival', nm, `<p><b>${nm}</b> of Festival Company. ${ARCH[R.arch].name}, ${HELMS[R.helm].name.toLowerCase()}.</p>
    <p>Record against you: <b class="num">${R.l} wins for you, ${R.w} for them</b>. ${lvl ? read : ''}</p>
    <p class="muted">Every grudge match they learn from how you beat them, and they get a little steadier and quicker each time. Beating them pays double.</p>`,
    [['Grudge match', startGrudge, true], ['Back', openModes]]);
}
// after a grudge match: they remember what beat them
function rivalAfter(m, won) {
  const R = rivalState(); const p = G.player;
  if (won) { R.l++; const trips = (MT.zones || []).filter(z => z === 'down').length, hits = (MT.zones || []).length - trips; R.last = trips >= 1 && trips * 3 >= hits ? 'trip' : 'hit'; if (R.last === 'trip') R.brace++; else R.guard++; R.react = Math.min(3, R.react + 0.5); }
  else R.w++;
  saveCareer();
  return won ? `<p>${rivalName(G.category)} won't forget that. Next time they'll ${R.last === 'trip' ? 'brace harder against your trips' : 'get their guard up faster'}. Rival purse doubled.</p>` : `<p>${rivalName(G.category)} goes up ${R.w}–${R.l} on you. They'll be back.</p>`;
}

