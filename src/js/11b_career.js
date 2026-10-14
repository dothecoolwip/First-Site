// ---------- your fighter & career: profile, purse, kit upgrades, achievements, lifetime stats ----------
const CAREER_DEFAULT = () => ({
  name: 'You', num: 4,
  club: { name: 'Reavers', short: 'RVR', tabard: '#6d1b28', trim: '#e8e1cf', charge: 'chevron' },
  purse: 150, upgrades: { harness: 0, padding: 0, boots: 0, gauntlets: 0, cardio: 0 }, ach: {},
  stats: { matches: 0, wins: 0, takedowns: 0, trips: 0, hits: 0, bigHits: 0, blocks: 0, throws: 0, disarms: 0, tackles: 0, repairs: 0, views: 0, earned: 0, rumbleWins: 0 },
  ladder: { rung: 0 }, trained: false
});
const CAREER = (() => { const d = CAREER_DEFAULT(), s = store.get('career', null); if (!s) return d; return { ...d, ...s, club: { ...d.club, ...(s.club || {}) }, upgrades: { ...d.upgrades, ...(s.upgrades || {}) }, stats: { ...d.stats, ...(s.stats || {}) }, ladder: { ...d.ladder, ...(s.ladder || {}) }, ach: s.ach || {} }; })();
CAREER.level = clamp(Math.floor(Number(CAREER.level) || 1), 1, 100);
if (CAREER.level === 100) CAREER.xp = 0;
function saveCareer() {
  if (typeof testAdminApply === 'function' && typeof BOS !== 'undefined' && BOS.testAdmin) testAdminApply(false);
  store.set('career', CAREER);
}

const UPGRADES = [
  { key: 'harness', name: 'Spring-steel harness', desc: 'Lighter plates. +3% speed per level.' },
  { key: 'boots', name: 'Grippy boots', desc: 'Better footing. +3.5% balance per level.' },
  { key: 'padding', name: 'Thicker gambeson', desc: 'Soaks blows. Hits on you push 5% less per level.' },
  { key: 'gauntlets', name: 'Riveted gauntlets', desc: 'Hold on tight: 25% fewer disarms per level, better throws.' },
  { key: 'cardio', name: 'Cardio block', desc: 'Summer training. +10% stamina recovery per level.' },
];
const UP_COST = [120, 240, 400, 650, 1000, 1500, 2200, 3100, 4300, 6000];
const TABARDS = ['#6d1b28', '#1c3454', '#2a3d26', '#3d2a4f', '#5b4a2a', '#111214', '#1f4a4a', '#7a4a12', '#8a8f92', '#b8241f'];
const TRIMS = ['#e8e1cf', '#d4b44a', '#d8dde2', '#f0c27a', '#ff3d8b', '#7fb6ff', '#111214'];
const CHARGES = [['chevron', 'Chevron'], ['pale', 'Pale'], ['bend', 'Bend'], ['cross', 'Cross'], ['saltire', 'Saltire'], ['chief', 'Chief'], ['quarterly', 'Quarterly']];

const ACH = [
  { id: 'writ1', name: 'Through the gate', desc: 'Beat Sergeant Brask and earn the Bailey writ.' },
  { id: 'writ2', name: 'Seen at court', desc: 'Beat the King’s Guard and earn the Royal writ.' },
  { id: 'explorer', name: 'Explorer', desc: 'Find all six hidden places in the realm.' },
  { id: 'rider', name: 'Saddled up', desc: 'Ride a horse across the realm.' },
  { id: 'spectator', name: 'From the stands', desc: 'Watch a full bout at any arena.' },
  { id: 'crowned', name: 'Crowned', desc: 'Take the King’s or the Queen’s seat in the Great Hall.' },
  { id: 'season', name: 'Prairie Cup', desc: 'Top the league table at the end of a summer season.' },
  { id: 'streak3', name: 'Regular', desc: 'Win the Rumble of the Day three days running.' },
  { id: 'gauntlet', name: 'Ran the gauntlet', desc: 'Win all five fights of a Gauntlet run.' },
  { id: 'perfect5', name: 'Wall of steel', desc: 'Five perfect blocks in one match.' },
  { id: 'first', name: 'First one down', desc: 'Take an opponent to the floor.' },
  { id: 'hat', name: 'Hat trick', desc: 'Three takedowns in one match.' },
  { id: 'combo', name: 'Shove, then trip', desc: 'Take someone down with a trip right after a shove.' },
  { id: 'trips', name: 'Ankle collector', desc: '10 successful trips.' },
  { id: 'wall', name: 'Wall of steel', desc: 'Block 25 blows.' },
  { id: 'throws', name: 'Clinch king', desc: 'Throw 3 people from the clinch.' },
  { id: 'disarm', name: 'Mine now', desc: 'Disarm an opponent.' },
  { id: 'big', name: 'Heavy hitter', desc: 'Land a big hit.' },
  { id: 'tackle', name: 'Freight train', desc: 'Take someone down with a tackle.' },
  { id: 'grad', name: 'Graduate', desc: 'Finish every lesson in the Training Yard.' },
  { id: 'champ', name: 'Rumble champion', desc: 'Win the Red Deer Rumble.' },
  { id: 'clean', name: 'Clean fighter', desc: 'Win the Rumble without a single card.' },
  { id: 'ladder', name: 'Top of the ladder', desc: 'Beat the Duel Ladder champion.' },
  { id: 'massacre', name: 'Last one standing', desc: 'Win a 12v12 Massacre round while still on your feet.' },
  { id: 'pan', name: 'Kitchen duty', desc: 'Take someone down with the frying pan.' },
  { id: 'chicken', name: 'Fowl play', desc: 'Win a match with the rubber chicken.' },
  { id: 'fantasy', name: 'Storybook', desc: 'Win a match with a fantasy weapon.' },
  { id: 'taped', name: 'Gear bag', desc: 'Repair 10 straps.' },
  { id: 'shopper', name: 'Garage forge', desc: 'Buy a kit upgrade.' },
  { id: 'hopper', name: 'Camera operator', desc: 'Switch between first and third person 10 times.' },
];
function unlock(id, force) {
  if (CAREER.ach[id] || (!force && (G.autopilot || G.attract))) return;
  const a = ACH.find(x => x.id === id); if (!a) return;
  CAREER.ach[id] = Date.now(); skillsState();
  saveCareer();
  if (a.tier) { const xp = 60 * a.tier * a.tier, cash = 50 * a.tier; ACHQ.push({ ...a, kicker: `Award, tier ${['I', 'II', 'III', 'IV', 'V'][a.tier - 1]} · +${xp} XP, +$${cash}${a.tier === 5 ? ', +1 skill point' : ''}` }); gainXP(xp); pay(cash); }
  else ACHQ.push(a);
  if (!ACHQ.busy) showAch(); if (typeof progressSoon === 'function') progressSoon();
}
const ACHQ = [];
function showAch() {
  const a = ACHQ.shift(); const el = $('#achPop'); if (!a) { ACHQ.busy = false; el.classList.remove('on'); return; }
  ACHQ.busy = true; el.innerHTML = ''; el.append(h('span', { class: 'k' }, a.kicker || 'Achievement, +1 skill point'), h('b', null, a.name), h('small', null, a.desc));
  el.classList.add('on'); AU.click(); setTimeout(() => { el.classList.remove('on'); setTimeout(showAch, 350); }, 2800);
}
// per-match tallies feed the achievements and the purse
const MT = { takedowns: 0 };
function resetMatchTally() { MT.takedowns = 0; MT.xp = 0; MT.zones = []; MT.tape = 0; MT.firstDownT = null; MT.brokenRecords = []; }

// one bus for every notable thing you do: the tutorial, achievements and lifetime stats all listen here
const EV_LISTENERS = [];
function ev(type, d = {}) {
  if (G.autopilot || G.attract) return;
  const S = CAREER.stats;
  switch (type) {
    case 'hit': if (!d.blocked) { S.hits++; if (d.big) { S.bigHits++; unlock('big'); } } break;
    case 'block': S.blocks++; if (S.blocks >= 25) unlock('wall'); break;
    case 'trip': if (d.ok) { S.trips++; if (S.trips >= 10) unlock('trips'); } break;
    case 'throw': S.throws++; if (S.throws >= 3) unlock('throws'); break;
    case 'disarm': S.disarms++; unlock('disarm'); break;
    case 'tackle': S.tackles++; break;
    case 'takedown':
      S.takedowns++; MT.takedowns++; unlock('first'); if (MT.takedowns >= 3) unlock('hat');
      if (d.combo) unlock('combo'); if (d.how === 'tackle') unlock('tackle'); if (d.weapon === 'x_pan') unlock('pan');
      break;
    case 'view': S.views++; if (S.views >= 10) unlock('hopper'); break;
    case 'repair': S.repairs++; if (S.repairs >= 10) unlock('taped'); break;
  }
  for (const fn of EV_LISTENERS) { try { fn(type, d); } catch (e) { G.stats.errors.push(String(e)); } }
  if (type !== 'hit' && type !== 'miss') saveCareer();
}

function pay(amount, why) { if (amount <= 0) return 0; CAREER.purse += amount; CAREER.stats.earned += amount; saveCareer(); return amount; }
function fmtMoney(n) { return '$' + Math.round(n).toLocaleString('en-CA'); }

// your club's name, colours and charge, and your number, go on the Reavers' kit
function applyProfile() {
  const C = CLUBS.reavers, P = CAREER.club;
  C.name = C.full = P.name || 'Reavers'; C.short = (P.short || C.name.slice(0, 3)).toUpperCase().slice(0, 3); C.tabard = P.tabard; C.trim = P.trim; C.charge = P.charge;
  C.roster[0].dispNum = CAREER.num; C.bos = P.bos || null;
  if (typeof ROSTER !== 'undefined' && !ROSTER.teams.some(t => t.slug === C.bos)) C.bos = null; // No imported bot identity; preserve the player's own banner.
  delete _tabardCache.reavers; delete _shieldCache.reavers;
  if (FP.vm) { FP.vm.team = null; }
  updateTitlePurse();
}
function updateTitlePurse() {
  const el = $('#titleStats'); if (!el) return;
  const n = Object.keys(CAREER.ach).length;
  skillsState();
  el.innerHTML = ''; el.append(h('span', { class: 'cnum' }, String(CAREER.num)), h('span', null, h('b', null, `${CAREER.name === 'You' ? 'Your fighter' : CAREER.name}${shopState().title ? ' ' + shopState().title : ''}, level ${CAREER.level}`), h('br'), h('span', { class: 'crank' }, rankOf(CAREER.level)), h('br'), `${CAREER.club.name}, `, h('span', { class: 'cpurse' }, fmtMoney(CAREER.purse)), `, ${n} of ${ACH.length} achievements`), CAREER.sp > 0 ? h('span', { class: 'spbadge' }, `${CAREER.sp} skill point${CAREER.sp === 1 ? '' : 's'}`) : null);
}

// ---- the Your fighter screen ----
function shieldPreview(club, size = 96) {
  const c = cvs(size, size * 1.15), x = c.getContext('2d');
  x.save(); x.beginPath(); x.moveTo(4, 4); x.lineTo(size - 4, 4); x.lineTo(size - 4, size * 0.55); x.quadraticCurveTo(size - 6, size * 0.95, size / 2, size * 1.12); x.quadraticCurveTo(6, size * 0.95, 4, size * 0.55); x.closePath(); x.clip();
  x.fillStyle = club.tabard; x.fillRect(0, 0, size, size * 1.2); drawCharge(x, club, size / 2, size * 0.5, size * 0.8, size * 0.8); x.restore();
  x.strokeStyle = '#aab4b8'; x.lineWidth = 3; x.beginPath(); x.moveTo(4, 4); x.lineTo(size - 4, 4); x.lineTo(size - 4, size * 0.55); x.quadraticCurveTo(size - 6, size * 0.95, size / 2, size * 1.12); x.quadraticCurveTo(6, size * 0.95, 4, size * 0.55); x.closePath(); x.stroke();
  return c;
}
function renderCareer() {
  const P = CAREER.club, box = $('#careerBody'); box.innerHTML = '';
  if (['forge', 'forge-gone'].includes(G.careerTab)) G.careerTab = 'shop'; if (G.careerTab === '__oldach') G.careerTab = 'ach'; // the Forge lives at the blacksmith now
  const tab = G.careerTab || 'profile';
  $$('#careerTabs [data-tab]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.tab === tab)));
  if (['progress', 'ach', 'record'].includes(tab)) {
    box.append(h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Progress sections' }, ...[['progress', 'Progress'], ['ach', 'Awards'], ['record', 'Record']].map(([key, name]) => h('button', { role: 'tab', 'aria-pressed': String(tab === key), onclick: () => { G.careerTab = key; renderCareer(); } }, name))));
    const parent = $('#careerTabs [data-tab="progress"]'); if (parent) parent.setAttribute('aria-pressed', 'true');
  }
  if (G.appearanceEditor && tab === 'profile') {
    box.append(h('button', { class: 'btn tape small', 'data-back': '', onclick: () => { G.appearanceEditor = false; renderCareer(); } }, 'Back to Profile'));
    const editor = h('div', { class: 'appearance-editor' }); box.append(editor); renderVendor(editor, 'barber', renderCareer); return;
  }
  if (tab === 'skills') { renderSkills(box); return; }
  if (tab === 'profile') {
    const field = (label, input) => h('label', { class: 'fld' }, h('span', { class: 'label' }, label), input);
    const nameIn = h('input', { type: 'text', maxlength: '16', value: CAREER.name === 'You' ? '' : CAREER.name, placeholder: 'Your name', autocomplete: 'off' });
    nameIn.oninput = () => { CAREER.name = nameIn.value.trim() || 'You'; saveCareer(); updateTitlePurse(); };
    const numIn = h('input', { type: 'number', min: '1', max: '99', value: String(CAREER.num), inputmode: 'numeric' });
    numIn.oninput = () => { const v = clamp(parseInt(numIn.value || '4', 10) || 4, 1, 99); CAREER.num = v; saveCareer(); applyProfile(); prev(); };
    const clubIn = h('input', { type: 'text', maxlength: '22', value: P.name, placeholder: 'Club name', autocomplete: 'off' });
    clubIn.oninput = () => { P.name = clubIn.value.trim() || 'Reavers'; saveCareer(); applyProfile(); prev(); };
    const shortIn = h('input', { type: 'text', maxlength: '3', value: P.short, placeholder: 'RVR', style: 'text-transform:uppercase', autocomplete: 'off' });
    shortIn.oninput = () => { P.short = shortIn.value.trim().toUpperCase() || P.name.slice(0, 3).toUpperCase(); saveCareer(); applyProfile(); prev(); };
    const pv = h('div', { class: 'shieldpv' });
    const prev = () => { pv.innerHTML = ''; pv.append(shieldPreview(P, 92), h('b', null, P.name), h('span', { class: 'muted' }, `${P.short} · number ${CAREER.num}`)); };
    const sw = (list, key) => { const row = h('div', { class: 'swatches' }); for (const c of list) row.append(h('button', { class: 'sw', style: `--c:${c}`, 'aria-pressed': String(P[key] === c), 'aria-label': c, onclick: () => { P[key] = c; saveCareer(); applyProfile(); renderCareer(); AU.click(); } })); return row; };
    const chg = h('div', { class: 'seg small' }); for (const [v, t] of CHARGES) chg.append(h('button', { 'aria-pressed': String(P.charge === v), onclick: () => { P.charge = v; saveCareer(); applyProfile(); renderCareer(); AU.click(); } }, t));
    const teamRow = h('div', { class: 'up vcard vwide' }, h('div', null, h('b', null, P.bos ? `Team: ${P.name}` : 'Not on a team'), h('div', { class: 'muted small' }, P.bos ? 'Your BuhurtOS team. Your real team-mates fill the roster.' : 'Fighting under your own banner.')), h('button', { class: 'btn tape small', onclick: () => { AU.click(); G.creatorReturn = () => { renderCareer(); showScreen('career'); }; CAREER.teamPicked = false; saveCareer(); openCreator(); } }, 'Change team'));
    box.append(teamRow);
    box.append(h('div', { class: 'up vcard vwide' }, h('div', null, h('b', null, 'Appearance'), h('div', { class: 'muted small' }, 'Change your body style, height, build, skin, hair, facial hair and eyes.')), h('button', { class: 'btn primary flagtape small', onclick: () => { AU.click(); G.appearanceEditor = true; renderCareer(); } }, 'Edit fighter')));
    box.append(h('div', { class: 'profgrid' },
      h('div', { class: 'stack' }, h('div', { class: 'row fields' }, field('Fighter name', nameIn), field('Number', numIn)), h('div', { class: 'row fields' }, field('Club', clubIn), field('Short name', shortIn)),
        h('span', { class: 'label' }, 'Tabard'), sw(TABARDS, 'tabard'), h('span', { class: 'label' }, 'Trim'), sw(TRIMS, 'trim'), h('span', { class: 'label' }, 'Charge'), chg),
      pv));
    prev();
  } else if (tab === 'shop') { renderShop(box);
  } else if (tab === 'inv') { renderInventory(box);
  } else if (tab === 'trades') { renderTrades(box);
  } else if (tab === 'progress') { renderProgress(box);
  } else if (tab === 'ach') { renderAwards(box); } else {
    const S = CAREER.stats;
    const rows = [['Matches', S.matches], ['Wins', S.wins], ['Takedowns', S.takedowns], ['Successful trips', S.trips], ['Throws', S.throws], ['Disarms', S.disarms], ['Tackles', S.tackles], ['Hits landed', S.hits], ['Big hits', S.bigHits], ['Blocks', S.blocks], ['Straps repaired', S.repairs], ['Rumble titles', S.rumbleWins], ['Duel Ladder', `${CAREER.ladder.rung} of ${LADDER.length}`], ['Prize money earned', fmtMoney(S.earned)]];
    const RC = CAREER.records || {}; rows.push(['Best win streak', RC.streak || 0], ['Most takedowns in a match', RC.tdMatch || 0], ['Most helmet hits in a match', RC.heads || 0], ['Most duel points in a round', RC.duelPts || 0], ['Fastest takedown', RC.fastTd != null ? RC.fastTd + ' s' : '–']);
    box.append(h('div', { class: 'statgrid', html: rows.map(([k, v]) => `<span>${k}</span><b class="num">${v}</b>`).join('') }));
    box.append(h('div', { class: 'row end' }, h('button', { class: 'btn tape small quiet', onclick: () => { if (!confirmReset.armed) { confirmReset.armed = true; setTimeout(() => confirmReset.armed = false, 3000); toastMenu('Press again to wipe your career'); return; } Object.assign(CAREER, CAREER_DEFAULT()); saveCareer(); applyProfile(); renderCareer(); } }, 'Reset career')));
  }
}
const confirmReset = { armed: false };
function toastMenu(text) { const el = $('#achPop'); el.innerHTML = ''; el.append(h('b', null, text)); el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 2200); }
function openCareer(tab) { G.appearanceEditor = false; G.backTo = G.screen === 'msgScr' ? 'title' : 'title'; skillsState(); G.careerTab = tab || (CAREER.sp > 0 ? 'skills' : 'profile'); renderCareer(); showScreen('career'); }

// prize money and match achievements at full time
function careerMatchEnd(m, won) {
  if (typeof eventMatch === 'function') eventMatch(m, won);
  if (G.autopilot || G.attract || m.training) return null;
  const S = CAREER.stats; S.matches++; if (won) S.wins++;
  if (m.category === 'youth') { sticker('unicorn'); if (won) sticker('star'); }
  // personal bests
  const R = CAREER.records || (CAREER.records = {}), brk = [];
  const best = (k, v, label, low) => { if (v == null || v <= 0) return; if (R[k] == null || (low ? v < R[k] : v > R[k])) { if (R[k] != null) brk.push(label); R[k] = v; } };
  R.streak = won ? (R.streakNow = (R.streakNow || 0) + 1) && Math.max(R.streak || 0, R.streakNow) : (R.streakNow = 0, R.streak || 0);
  best('tdMatch', MT.takedowns, 'Most takedowns in a match');
  if (m.duel) best('duelPts', Math.max(...m.results.map(r => r.a || 0), 0), 'Most duel points in a round');
  best('heads', (MT.zones || []).filter(z => z === 'helmet').length, 'Most helmet hits in a match');
  if (MT.firstDownT != null) best('fastTd', Math.round(MT.firstDownT * 10) / 10, 'Fastest takedown', true);
  MT.brokenRecords = brk;
  // A first win buys an entry cosmetic after a few fights; a loss still pays enough to progress.
  const base = { 1: 100, 2: 130, 3: 160, 5: 180, 12: 250 }[m.mode] || 160;
  let money = won ? base : Math.round(base * 0.45), lines = [`${won ? 'Win' : 'Appearance'} ${fmtMoney(money)}`];
  gainXP(65 + (won ? 135 : 0) + 35 * m.wins[0] + (m.ladder != null && won ? 100 : 0));
  const tb = MT.takedowns * 15; if (tb) { money += tb; lines.push(`${MT.takedowns} takedown${MT.takedowns === 1 ? '' : 's'} ${fmtMoney(tb)}`); }
  if (m.ladder != null && won) { const lb = 50 * (m.ladder + 1); money += lb; lines.push(`Ladder rung ${m.ladder + 1} ${fmtMoney(lb)}`); }
  const p = G.player, w = p && p.spec ? WEAPONS[p.spec.weapon] : null;
  if (won && w && w.key === 'x_chicken') unlock('chicken');
  if (won && w && w.fantasy && !w.specialSet) unlock('fantasy');
  const pb = (CAREER.skills && CAREER.skills['show.purse']) || 0; if (pb) { const extra = Math.round(money * 0.12 * pb); money += extra; lines.push(`Crowd pleaser ${fmtMoney(extra)}`); }
  const sm = shopPrizeMult(); if (sm > 1) { const extra = Math.round(money * (sm - 1)); if (extra) { money += extra; lines.push(`Shop bonuses ${fmtMoney(extra)}`); } }
  const inc = sponsorIncome(); if (inc) { money += inc; lines.push(`Sponsors ${fmtMoney(inc)}`); }
  shopMatchEnd();
  if (MT.xp) lines.push(`+${MT.xp} XP`);
  if (CAREER.sp > 0) lines.push(`Level ${CAREER.level}, ${CAREER.sp} skill point${CAREER.sp === 1 ? '' : 's'} to spend`);
  pay(money, 'match'); saveCareer(); updateTitlePurse();
  progressMatch(m, won);
  return { money, lines };
}
