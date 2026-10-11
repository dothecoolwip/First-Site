// ---------- season: a summer of events around central Alberta, a league table, kit damage that lasts, and recruiting ----------
const LEAGUE_EXTRA = [
  { key: 'lancers', name: 'Lacombe Lancers', short: 'LAC', tabard: '#5b4a2a', trim: '#e3d6a8', charge: 'bend', base: 'wardens', str: 0.9 },
  { key: 'pikes', name: 'Ponoka Pikes', short: 'PON', tabard: '#3d2a4f', trim: '#d8c9e6', charge: 'cross', base: 'rabble', str: 1.0 },
  { key: 'crows', name: 'Camrose Crows', short: 'CAM', tabard: '#24324f', trim: '#e8e1cf', charge: 'quarterly', base: 'wardens', str: 1.1 },
];
function ensureLeagueClubs() {
  for (const L of LEAGUE_EXTRA) if (!CLUBS[L.key]) CLUBS[L.key] = { key: L.key, name: L.name, full: L.name, short: L.short, tabard: L.tabard, trim: L.trim, charge: L.charge, flag: '#3b93ff', roster: CLUBS[L.base].roster.map(s => ({ ...s })) };
}
const SEASON_STOPS = [
  { town: 'Lacombe', venue: 'field', mode: 3, opp: 'lancers', note: 'Fall fair, on the grass behind the grandstand.' },
  { town: 'Ponoka', venue: 'arena', mode: 5, opp: 'pikes', note: 'Stampede grounds arena. Concrete and a big crowd.' },
  { town: 'Sylvan Lake', venue: 'rink', mode: 2, opp: 'wardens', note: 'Pairs on the frozen lake rink. Watch your footing.' },
  { town: 'Olds', venue: 'castle', mode: 5, opp: 'rabble', note: 'A night card in the college’s mock castle.' },
  { town: 'Camrose', venue: 'fair', mode: 3, opp: 'crows', note: 'Medieval fair weekend. Triples between the market stalls.' },
  { town: 'Red Deer', venue: 'stadium', mode: 5, opp: 'wardens', note: 'The season final under the stadium floodlights.', final: true },
];
const LEAGUE_KEYS = ['reavers', 'wardens', 'rabble', 'lancers', 'pikes', 'crows'];
function seasonState() { return store.get('season', null); }
function newSeason() {
  ensureLeagueClubs(); const S = { stop: 0, table: {}, squad: 0, kit: freshKit(playerSpec(CLUBS.reavers.roster[0]), true), log: [] };
  LEAGUE_KEYS.forEach(k => S.table[k] = { p: 0, w: 0, d: 0, l: 0, pts: 0 }); store.set('season', S); openSeason();
}
function tableHtml(S) {
  const rows = LEAGUE_KEYS.slice().sort((a, b) => S.table[b].pts - S.table[a].pts || S.table[b].w - S.table[a].w).map((k, i) => { const T = S.table[k]; return `<tr class="${k === 'reavers' ? 'me' : ''}"><td>${i + 1}</td><td>${CLUBS[k].name}</td><td>${T.p}</td><td>${T.w}</td><td>${T.d}</td><td>${T.l}</td><td><b>${T.pts}</b></td></tr>`; }).join('');
  return `<div class="sheet"><div class="tblwrap"><table><thead><tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function openSeason() {
  ensureLeagueClubs(); const S = seasonState();
  if (!S) { msg('season', 'Summer season', `<p>Six stops around central Alberta, one match at each, and a league table. Your kit damage lasts the whole summer, so tape well, and spend prize money signing better teammates. Top of the table at the end wins the Prairie Cup.</p>`, [['Start the season', newSeason, true], ['Back', toTitle]]); return; }
  if (S.stop >= SEASON_STOPS.length) return seasonEnd(S);
  const st = SEASON_STOPS[S.stop], recruitCost = 150 + 100 * S.squad;
  msg('season', `Stop ${S.stop + 1}: ${st.town}`, `<p><b>${st.mode} v ${st.mode}</b> against <b>${CLUBS[st.opp].name}</b> at the ${VENUES[st.venue].name.toLowerCase()}. ${st.note}</p>${tableHtml(S)}
    <p class="muted">Squad level ${S.squad}: your teammates are ${S.squad ? `${S.squad * 6}% steadier and quicker to react` : 'the usual Reavers'}. Purse ${fmtMoney(CAREER.purse)}.</p>`,
    [['Fight', () => startSeasonMatch(), true], [`Sign a veteran · ${fmtMoney(recruitCost)}`, () => { if (CAREER.purse < recruitCost) { toastMenu('Not enough in the purse.'); return; } if (S.squad >= 5) { toastMenu('Your squad is as good as it gets.'); return; } CAREER.purse -= recruitCost; S.squad++; store.set('season', S); saveCareer(); updateTitlePurse(); toastMenu('A veteran joins the Reavers.'); openSeason(); }], ['Abandon season', () => { store.del('season'); toTitle(); }]]);
}
function startSeasonMatch() {
  const S = seasonState(), st = SEASON_STOPS[S.stop];
  G.attract = false; G.tourney = null; REP.log = []; endTraining(); G.run = { kit: S.kit }; G.boon = null;
  setupMatch({ mode: st.mode, opp: st.opp, stage: `Season, ${st.town}`, venue: st.venue, season: true, run: 'season' });
  G.shareKind = 'match'; G.shareExtra = {};
  for (const f of G.fighters) if (f.team === 0 && !f.isPlayer) { f.stabMul *= 1 + 0.06 * S.squad; f.prof = { react: Math.max(0.12, 0.26 - 0.025 * S.squad), aggr: 1, guard: 0.5 + 0.06 * S.squad, cancel: 0.92 }; }
  toTactics();
}
function simResult(a, b) { const sa = (LEAGUE_EXTRA.find(x => x.key === a) || { str: 1 }).str, sb = (LEAGUE_EXTRA.find(x => x.key === b) || { str: 1 }).str, r = Math.random() * (sa + sb + 0.3); return r < sa ? 0 : r < sa + sb ? 1 : -1; }
function seasonAfter(m, won, drawn, withPurse) {
  const S = seasonState(); if (!S) return false;
  const st = SEASON_STOPS[S.stop];
  if (G.player) S.kit = JSON.parse(JSON.stringify(G.player.kit));
  const rec = (k, res) => { const T = S.table[k]; T.p++; if (res === 'w') { T.w++; T.pts += 3; } else if (res === 'd') { T.d++; T.pts += 1; } else T.l++; };
  rec('reavers', won ? 'w' : drawn ? 'd' : 'l'); rec(st.opp, won ? 'l' : drawn ? 'd' : 'w');
  const others = LEAGUE_KEYS.filter(k => k !== 'reavers' && k !== st.opp).sort(() => Math.random() - 0.5);
  const lines = [];
  for (let i = 0; i + 1 < others.length; i += 2) { const a = others[i], b = others[i + 1], r = simResult(a, b); rec(a, r === 0 ? 'w' : r === 1 ? 'l' : 'd'); rec(b, r === 1 ? 'w' : r === 0 ? 'l' : 'd'); lines.push(`${CLUBS[a].name} ${r === 0 ? 'beat' : r === 1 ? 'lost to' : 'drew with'} ${CLUBS[b].name}`); }
  S.stop++; store.set('season', S);
  msg('season', won ? `Won in ${st.town}` : drawn ? `Drawn in ${st.town}` : `Lost in ${st.town}`, withPurse(`<p>Elsewhere: ${lines.join('; ')}.</p>${tableHtml(S)}<p class="muted">Your kit damage carries to the next stop.</p>`), [[S.stop >= SEASON_STOPS.length ? 'Final standings' : 'Next stop', openSeason, true], ['Title', toTitle]]);
  return true;
}
function seasonEnd(S) {
  const order = LEAGUE_KEYS.slice().sort((a, b) => S.table[b].pts - S.table[a].pts || S.table[b].w - S.table[a].w), top = order[0] === 'reavers';
  if (top && !S.paid) { pay(600); S.paid = true; store.set('season', S); unlock('season'); bump('seasons'); updateTitlePurse(); }
  msg('season', top ? 'Prairie Cup champions' : `Season over: ${order.indexOf('reavers') + 1}${['st', 'nd', 'rd'][order.indexOf('reavers')] || 'th'} place`, `${tableHtml(S)}${top ? '<p>+$600 and the Prairie Cup. The Reavers are the best club in central Alberta.</p>' : '<p>Tape up, recruit, and go again next summer.</p>'}`, [['New season', () => { store.del('season'); newSeason(); }, true], ['Title', toTitle]]);
}
