// ---------- party modes: free-for-all melee, friends' bracket, couch kit picks ----------
const FFA_COLS = ['#ff3d8b', '#3b93ff', '#f2c40f', '#2fd18a', '#b07cff', '#ff8a3c', '#ffffff', '#34d4e0'];
const FFA_MATS = [];
function ffaColor(f) { return FFA_COLS[(f.team || 0) % FFA_COLS.length]; }
function ffaFlagMat(f) { const i = (f.team || 0) % FFA_COLS.length; return FFA_MATS[i] || (FFA_MATS[i] = new THREE.MeshStandardMaterial({ color: FFA_COLS[i], roughness: 0.4, emissive: new THREE.Color(FFA_COLS[i]).multiplyScalar(0.25) })); }
function sideOf(f) { return f.side != null ? f.side : f.team; }
// everyone in a ring, everyone against everyone; last one standing takes the round, two rounds take the match
function startFFA(n = 6, humans = 0) {
  AU.init(); G.attract = false; G.tourney = null; REP.log = []; endTraining();
  const qm = {}; for (const k of (G.quickMods || store.get('quickMods', []))) qm[k] = true;
  const half = Math.ceil(n / 2);
  setupMatch({ mod: qm, mode: half >= 5 ? 5 : half, opp: pick(['wardens', 'rabble']), stage: 'Free-for-all', venue: G.quickVenue || W3.venue || 'arena', weather: G.quickWeather, ffa: true, versus: humans > 0, local: humans ? 'ffa' : null });
  // trim to n fighters, give each their own colour and spot on a ring facing the middle
  while (G.fighters.length > n) { const f = G.fighters.filter(x => !x.isPlayer).pop(); W3.matchRoot.remove(f.model.root); G.fighters.splice(G.fighters.indexOf(f), 1); }
  G.fighters.forEach((f, i) => {
    f.side = f.team; f.team = i; const a = i / G.fighters.length * TAU, r = 7.5;
    f.home = { x: Math.sin(a) * r, z: Math.cos(a) * r }; f.ffaFace = a + Math.PI;
    W3.matchRoot.remove(f.model.root); buildFighterModel(f); W3.matchRoot.add(f.model.root);
  });
  const m = G.match; m.ffa = true; m.ffaWins = {}; G.fighters.forEach(f => m.ffaWins[f.team] = 0);
  if (humans) {
    VS.on = true; VS.kind = 'ffa'; VS.vins = Array.from({ length: humans }, newVin); VS.prev = [[], [], [], []]; SPLIT.init = [false, false, false, false];
    G.fighters.forEach(f => f.isPlayer = false); G.player = null;
    VS.humans = G.fighters.slice(0, humans); VS.humans.forEach((f, i) => { f.vin = VS.vins[i]; f.name = VS.names && VS.names[i] || 'Player ' + (i + 1); f.pslot = i; applyPick(f, i); });
    document.body.classList.toggle('split', SPLIT.on); document.body.classList.toggle('split4', SPLIT.on && humans > 2); $('#splitLabels').innerHTML = '';
  }
  $('#sbA').textContent = humans ? 'P1' : 'YOU'; $('#sbB').textContent = 'BEST';
  startRound(); beginFight();
}
function ffaRoundCheck() {
  const alive = G.fighters.filter(f => !f.out && isUp(f));
  if (alive.length <= 1) endRound('ffa');
}
function ffaWinner(reason) {
  const alive = G.fighters.filter(f => !f.out && isUp(f));
  if (alive.length === 1) return alive[0];
  if (!alive.length) return null;
  return alive.sort((a, b) => b.stats.takedowns - a.stats.takedowns)[0]; // time: most takedowns among those still up
}
// a tie at the top is broken by takedowns; still tied means nobody wins the melee
function ffaLeader() { const w = G.match.ffaWins, s = G.fighters.slice().sort((a, b) => (w[b.team] - w[a.team]) || (b.stats.takedowns - a.stats.takedowns)); if (s.length > 1 && w[s[0].team] === w[s[1].team] && s[0].stats.takedowns === s[1].stats.takedowns) return null; return s[0] || null; }
function ffaMatchEnd() {
  const m = G.match, lead = ffaLeader(), me = VS.on ? null : G.player;
  VS.on = false; document.body.classList.remove('split', 'split4'); $('#splitLabels').innerHTML = '';
  const table = G.fighters.slice().sort((a, b) => m.ffaWins[b.team] - m.ffaWins[a.team]).map(f => `<div><span><i class="ffadot" style="background:${ffaColor(f)}"></i>${f.isPlayer ? 'You' : f.name}</span><span class="num">${m.ffaWins[f.team]} round${m.ffaWins[f.team] === 1 ? '' : 's'} · ${f.stats.takedowns} down</span></div>`).join('');
  const won = me && lead === me;
  if (me) careerMatchEnd({ ...m, wins: [won ? 2 : 0, won ? 0 : 2] }, won);
  if (G.bracket && m.versus && !m.ffa) return;
  msg('free-for-all', lead ? `${lead.isPlayer ? 'You' : lead.name} win${lead.isPlayer ? '' : 's'} the melee` : 'Nobody standing', `<div class="taplog">${table}</div>`, [['Rematch', () => startFFA(G.fighters.length, m.local ? (VS.humans || []).length : 0), true], ['Title', toTitle]]);
}

// ---- couch kit picks: each player chooses a weapon style and a helm before the fight ----
const PICK_WEAPONS2 = [['sword', 'heater', 'Sword & shield'], ['sword', 'buckler', 'Sword & buckler'], ['longsword', null, 'Longsword'], ['polearm', null, 'Polearm'], ['axe', 'heater', 'Axe & shield'], ['mace', 'heater', 'Mace & shield'], ['longaxe', null, 'Long axe']];
const PICK_HELMS = ['greathelm', 'pigface', 'sallet', 'barbute', 'kettle'];
function applyPick(f, i) {
  VS.picks = VS.picks || store.get('couchPicks', []); const P = VS.picks[i]; if (!P) return;
  f.spec = { ...f.spec, weapon: P.weapon, shield: P.shield, helm: P.helm }; f.weapon = WEAPONS[P.weapon]; f.shield = P.shield ? SHIELDS[P.shield] : null; resetFighterForRound(f);
}
function openPicks(players, go) {
  VS.picks = VS.picks || store.get('couchPicks', []);
  for (let i = 0; i < players; i++) VS.picks[i] = VS.picks[i] || { weapon: 'sword', shield: 'heater', helm: PICK_HELMS[i % PICK_HELMS.length], w: 0 };
  const rows = Array.from({ length: players }, (_, i) => `<div class="pickrow"><b>${VS.names && VS.names[i] || 'Player ' + (i + 1)}</b>
    <div class="seg small" data-pw="${i}">${PICK_WEAPONS2.map((w, j) => `<button data-j="${j}" aria-pressed="${VS.picks[i].w === j}">${w[2]}</button>`).join('')}</div>
    <div class="seg small" data-ph="${i}">${PICK_HELMS.map(k => `<button data-k="${k}" aria-pressed="${VS.picks[i].helm === k}">${HELMS[k].name.replace(/ with .*/, '')}</button>`).join('')}</div></div>`).join('');
  msg('couch play', 'Pick your kit', `<div class="picks">${rows}</div>`, [['Fight', () => { store.set('couchPicks', VS.picks); go(); }, true], ['Back', openVersus]]);
  $$('#msgPanel [data-pw] button').forEach(b => b.onclick = () => { const i = +b.parentNode.dataset.pw, w = PICK_WEAPONS2[+b.dataset.j]; Object.assign(VS.picks[i], { weapon: w[0], shield: w[1], w: +b.dataset.j }); $$('button', b.parentNode).forEach(x => x.setAttribute('aria-pressed', String(x === b))); AU.click(); });
  $$('#msgPanel [data-ph] button').forEach(b => b.onclick = () => { const i = +b.parentNode.dataset.ph; VS.picks[i].helm = b.dataset.k; $$('button', b.parentNode).forEach(x => x.setAttribute('aria-pressed', String(x === b))); AU.click(); });
}

// ---- friends' bracket: 4 or 8 names, one-on-one duels, the game keeps the draw and passes the controllers ----
function openBracket() {
  const saved = store.get('bracketNames', ['', '', '', '', '', '', '', '']);
  msg('friends’ bracket', 'Tournament night', `<p>Type 4 or 8 names. Each match is a one-on-one duel on two controllers (or keyboard and controller); hand them over between matches.</p>
    <div class="namegrid">${saved.map((n, i) => `<input class="bname" maxlength="14" placeholder="Fighter ${i + 1}" value="${String(n).replace(/"/g, '')}" autocomplete="off">`).join('')}</div>`,
    [['Start bracket', () => { const names = $$('.bname').map(e => e.value.trim().replace(/[<>&"]/g, '')).filter(Boolean); store.set('bracketNames', $$('.bname').map(e => e.value.trim())); if (names.length !== 4 && names.length !== 8) { toastMenu('Enter exactly 4 or 8 names.'); return; } startBracket(names); }, true], ['Back', openVersus]]);
}
function startBracket(names) {
  const sh = names.slice().sort(() => Math.random() - 0.5);
  G.bracket = { rounds: [sh.map(n => n)], cur: 0, match: 0, results: [] };
  showBracket();
}
function bracketPairs() { const B = G.bracket, r = B.rounds[B.cur]; const out = []; for (let i = 0; i < r.length; i += 2) out.push([r[i], r[i + 1]]); return out; }
function showBracket() {
  const B = G.bracket, names = ['Quarter-finals', 'Semi-finals', 'Final']; const total = Math.log2(B.rounds[0].length);
  const html = B.rounds.map((r, ri) => `<div class="bcol"><b>${names[names.length - (total - ri)] || 'Round ' + (ri + 1)}</b>${Array.from({ length: r.length / 2 }, (_, k) => { const a = r[2 * k], b = r[2 * k + 1], w = B.results[ri] && B.results[ri][k]; return `<div class="bmatch${ri === B.cur && k === B.match ? ' now' : ''}"><span class="${w === a ? 'win' : w ? 'lose' : ''}">${a}</span><span class="${w === b ? 'win' : w ? 'lose' : ''}">${b}</span></div>`; }).join('')}</div>`).join('');
  const champ = B.champion;
  if (champ) { msg('friends’ bracket', `${champ} wins the night`, `<div class="bracket">${html}</div>`, [['New bracket', () => { G.bracket = null; VS.names = null; openBracket(); }, true], ['Title', () => { G.bracket = null; toTitle(); }]]); return; }
  const [a, b] = bracketPairs()[B.match];
  msg('friends’ bracket', `${a} vs ${b}`, `<div class="bracket">${html}</div><p>Player 1: <b>${a}</b>. Player 2: <b>${b}</b>. Pass the controllers.</p>`, [['Fight', () => { VS.names = [a, b]; startVersus('duel'); }, true], ['Quit bracket', () => { G.bracket = null; toTitle(); }]]);
}
function bracketResult(winnerSlot) {
  const B = G.bracket, [a, b] = bracketPairs()[B.match], w = winnerSlot === 0 ? a : b;
  (B.results[B.cur] = B.results[B.cur] || [])[B.match] = w;
  B.match++;
  if (B.match >= B.rounds[B.cur].length / 2) { const next = B.results[B.cur].slice(); if (next.length === 1) B.champion = next[0]; else { B.rounds.push(next); B.cur++; B.match = 0; } }
  VS.names = null; showBracket();
}
