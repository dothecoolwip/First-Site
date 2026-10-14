// ---------- Rumble of the Day (same fight for everyone on a date) and the Gauntlet run (five fights, one life) ----------

// match modifiers: G.mod applies to everyone, G.boon only to you (Gauntlet boons)

function mod(f, key) { return ((G.mod && G.mod[key]) || 1) * (f && f.isPlayer && G.boon && G.boon[key] || 1); }

function dateKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

function dayNumber(d = new Date()) { return Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(2026, 0, 1)) / 864e5) + 1; }



const DAILY_MODS = [

  { key: 'rain', icon: '🌧️', name: 'Rain on the field', desc: 'Wet grass: everyone is less steady on their feet.', venue: 'field', mod: { stab: 0.88 } },

  { key: 'tape', icon: '🩹', name: 'Tape shortage', desc: 'Half the usual time at the repair bench.', mod: { repair: 0.5 } },

  { key: 'heat', icon: '🥵', name: 'Heat wave', desc: 'Fatigue builds half again as fast.', mod: { fat: 1.5 } },

  { key: 'heavy', icon: '🔨', name: 'Heavy hitters', desc: 'Every blow lands 15% harder.', mod: { imp: 1.15 } },

  { key: 'night', icon: '🔥', name: 'Torchlight', desc: 'A night fight in the castle yard.', venue: 'castle', mod: {} },

  { key: 'kids', icon: '🧸', name: 'Little Knights day', desc: 'Youth division. Foam kit, rubber swords.', cat: 'youth', mod: {} },

  { key: 'noshield', icon: '⚔️', name: 'Two-hander day', desc: 'Nobody gets a shield.', mod: { noshield: true } },

  { key: 'duel', icon: '🎯', name: 'Duel day', desc: 'One on one. Points by where you hit.', mode: 1, mod: {} },

];

function dailyPlan(key = dateKey()) {

  const r = seeded('BUHURT' + key);

  const M = DAILY_MODS[Math.floor(r() * DAILY_MODS.length)];

  const mode = M.mode || [3, 5, 5, 2][Math.floor(r() * 4)];

  const opp = mode === 1 ? 'ladder' + (2 + Math.floor(r() * 4)) : ['wardens', 'rabble'][Math.floor(r() * 2)];

  const venue = M.venue || ['arena', 'field', 'castle'][Math.floor(r() * 3)];

  return { key, day: dayNumber(), M, mode, opp, venue, cat: M.cat || null };

}

function dailyState() { return store.get('daily', { last: null, streak: 0, best: 0, done: {} }); }

function openDaily() {

  AU.init(); const P = dailyPlan(), S = dailyState(), done = S.done[P.key];

  const modeName = P.mode === 1 ? 'Duel, 1 v 1' : `${P.mode} v ${P.mode}`;

  const oppName = CLUBS[P.opp] ? CLUBS[P.opp].full || CLUBS[P.opp].name : P.opp;

  msg('rumble of the day', `Daily #${P.day}`, `<div class="daily"><div class="dmod"><span class="dicon">${P.M.icon}</span><div><b>${P.M.name}</b><span>${P.M.desc}</span></div></div>

    <p>${modeName} against <b>${oppName}</b> at the ${VENUES[P.venue].name.toLowerCase()}. Everyone playing today gets the same fight.</p>

    <p class="muted">${done ? `Today's result: <b>${done.won ? 'won' : 'lost'} ${done.score}</b>. Replays are practice and don't change your streak.` : 'Your first try today counts for the streak.'} 🔥 Streak ${S.streak} · best ${S.best}</p></div>`,

    [['Fight', () => startDaily(P), true], ['Title', toTitle]]);

}

function startDaily(P) {

  G.attract = false; G.tourney = null; REP.log = []; endTraining(); G.boon = null; G.run = null;

  const catWas = G.category; if (P.cat) G.category = P.cat;

  setupMatch({ mode: P.mode, opp: P.opp, stage: `Daily #${P.day}`, venue: P.venue, mod: P.M.mod, daily: P, weather: P.M.key === 'rain' ? 'rain' : 'clear' });

  G.category = catWas; G.shareKind = 'daily'; toTactics();

}

function dailyEnd(m, won, withPurse) {

  const P = m.daily, S = dailyState(); let note = '';

  if (!S.done[P.key]) {

    const y = new Date(); y.setDate(y.getDate() - 1);

    S.streak = won ? (S.last === dateKey(y) || S.last === P.key ? S.streak + 1 : 1) : 0; S.best = Math.max(S.best, S.streak);

    S.last = P.key; S.done[P.key] = { won, score: `${m.wins[0]}–${m.wins[1]}` };

    const keys = Object.keys(S.done).sort(); while (keys.length > 40) delete S.done[keys.shift()];

    store.set('daily', S); note = won ? `<p>🔥 Streak ${S.streak}. Come back tomorrow for a new fight.</p>` : '<p>Streak reset. Tomorrow is another Rumble.</p>';

    if (won && S.streak >= 3) unlock('streak3');

    bump('dailies');

  } else note = '<p class="muted">Practice replay. Your counted result stays.</p>';

  G.shareExtra = { day: P.day, mod: P.M.icon, streak: S.streak }; G.shareKind = 'daily';

  msg('rumble of the day', won ? 'Daily won' : 'Daily lost', withPurse(note), [['Replay', () => startDaily(P)], ['Title', toTitle, true]]);

}



// ---- Gauntlet: a seeded weekend of five fights. Kit damage carries, one loss ends the run, a boon after every win ----

const RUN_STEPS = [{ mode: 1, rung: [0, 1] }, { mode: 3 }, { mode: 1, rung: [2, 3] }, { mode: 5 }, { mode: 1, rung: [5, 5], boss: true }];

const BOONS = [

  { key: 'tape', icon: '🩹', name: 'Lucky roll of tape', desc: '+20 seconds at every repair bench.', apply: B => B.repairAdd = (B.repairAdd || 0) + 20 },

  { key: 'squire', icon: '🧽', name: 'A keen squire', desc: 'A free proper-service labour voucher. Redeem it explicitly at the workshop.', apply: () => { const B = squireBook(); B.serviceCredits = (B.serviceCredits || 0) + 1; saveCareer(); } },

  { key: 'lungs', icon: '🫁', name: 'Second lungs', desc: 'Fatigue builds 20% slower.', apply: B => B.fat = (B.fat || 1) * 0.8 },

  { key: 'iron', icon: '🦶', name: 'Planted feet', desc: '12% steadier against shoves and hits.', apply: B => B.stab = (B.stab || 1) * 1.12 },

  { key: 'edge', icon: '💪', name: 'Heavy arm', desc: 'Your blows land 10% harder.', apply: B => B.imp = (B.imp || 1) * 1.1 },

  { key: 'sponsor', icon: '💰', name: 'Local sponsor', desc: '+$120 to your purse, paid now.', apply: () => { pay(120); updateTitlePurse(); } },

  { key: 'wind', icon: '🌬️', name: 'Iron lungs', desc: 'Breath comes back 25% faster.', apply: B => B.regen = (B.regen || 1) * 1.25 },

];

function runCode(n) { return 'RDR-' + (n >>> 0).toString(16).toUpperCase().padStart(4, '0').slice(-4); }

function runPlan(code) {

  const r = seeded('gauntlet' + code);

  return RUN_STEPS.map((s, i) => {

    if (s.mode === 1) { const rung = s.rung[0] + Math.floor(r() * (s.rung[1] - s.rung[0] + 1)); return { mode: 1, opp: 'ladder' + rung, venue: ['arena', 'field', 'castle'][Math.floor(r() * 3)], boss: !!s.boss }; }

    return { mode: s.mode, opp: ['wardens', 'rabble'][Math.floor(r() * 2)], venue: ['arena', 'field', 'castle'][Math.floor(r() * 3)] };

  });

}

function openRun() {

  AU.init(); const R = store.get('run', null), best = store.get('runBest', 0);

  const steps = c => runPlan(c).map((s, i) => `<li${R && R.code === c && i < R.step ? ' class="done"' : R && R.code === c && i === R.step ? ' class="now"' : ''}><b>${i + 1}</b> ${s.mode === 1 ? 'Duel' : s.mode + ' v ' + s.mode} · ${i === 2 ? 'your rival' : CLUBS[s.opp] ? (CLUBS[s.opp].full || CLUBS[s.opp].name) : s.opp}${s.boss ? ' · the champion' : ''}</li>`).join('');

  const body = `<div class="runbox"><p>Five fights across one weekend. Kit damage carries between fights, one loss ends the run, and every win earns a boon. You get 30 seconds to repair between rounds and 60 seconds after choosing your reward between fights. These timers are fixed. Share your run code so friends can fight the exact same bracket.</p>

    ${R && R.boons.includes('tape') ? '<p class="muted">Your saved Lucky roll of tape is still recorded. Gauntlet repair windows now have fixed timers, so it no longer adds time here.</p>' : ''}

    ${R ? `<p><b>Run ${R.code}</b>, fight ${R.step + 1} of 5${R.boons.length ? ' · boons: ' + R.boons.map(k => BOONS.find(b => b.key === k).icon).join(' ') : ''}</p><ol class="runsteps">${steps(R.code)}</ol>` : ''}

    <label class="runcode"><span>Play a friend's bracket</span><input id="runCodeIn" placeholder="RDR-7F3A" maxlength="8" autocomplete="off"></label>

    <p class="muted">Best run: ${best} of 5 fights won.</p></div>`;

  const btns = []; if (R) btns.push(['Continue run', () => startRunFight(), true]);

  btns.push(['New run', () => { const v = ($('#runCodeIn') && $('#runCodeIn').value || '').trim().toUpperCase(); newRun(/^RDR-[0-9A-F]{4}$/.test(v) ? v : runCode(Math.random() * 65536)); }, !R]);

  btns.push(['Title', toTitle]);

  msg('gauntlet', 'Gauntlet run', body, btns);

}

function newRun(code) {

  const R = { code, step: 0, boons: [], kit: careerKit(playerSpec(CLUBS.reavers.roster[0])), weapon: G.loadout.weapon, cat: G.category };

  store.set('run', R); startRunFight();

}

function runBoon(R) { const B = {}; for (const k of R.boons) { const b = BOONS.find(x => x.key === k); if (b && b.key !== 'squire' && b.key !== 'sponsor') b.apply(B, R); } return B; }

function startRunFight() {

  const R = store.get('run', null); if (!R) return openRun();

  const s = runPlan(R.code)[R.step];

  G.attract = false; G.tourney = null; REP.log = []; endTraining(); G.run = R; G.boon = runBoon(R);

  const catWas = G.category; G.category = R.cat || G.category;

  if (R.step === 2) { rivalClub(); s.opp = 'rival'; }

  setupMatch({ mode: s.mode, opp: s.opp, stage: `Gauntlet ${R.code}, fight ${R.step + 1}${s.boss ? ' (the champion)' : ''}`, venue: s.venue, run: R.code });

  G.category = catWas; G.shareKind = 'run'; G.shareExtra = { code: R.code }; toTactics();

}

function openGauntletRepair(seconds, done, onFail) {

  const m = G.match;

  openRepair(seconds, () => { if (G.match === m) done(); }, {

    fixedDuration: true, requireSafeArmour: true,

    onFail: () => { if (G.match === m && onFail) onFail(); }

  });

}

function gauntletRepairFailed(R) {

  if (store.get('run', null)?.code !== R.code) return;

  store.del('run'); store.set('runBest', Math.max(store.get('runBest', 0), R.step));

  msg('gauntlet', 'Run over', `<p>Repair time expired after fight ${R.step}. Unsafe armour means you cannot return to the list. Your earned rewards are kept.</p>`, [['New run', openRun, true], ['Title', toTitle]]);

}

function runEnd(m, won, withPurse) {

  if (m.gauntletRunEnded) return;

  const R = store.get('run', null); if (!R) { toTitle(); return; }

  m.gauntletRunEnded = true;

  if (G.player) R.kit = JSON.parse(JSON.stringify(G.player.kit)); // the damage comes with you

  G.shareKind = 'run'; G.shareExtra = { code: R.code };

  if (!won) {

    store.del('run'); store.set('runBest', Math.max(store.get('runBest', 0), R.step));

    msg('gauntlet', 'Run over', withPurse(`<p>Out at fight ${R.step + 1} of 5 on run <b>${R.code}</b>. Send a friend the code and see if they get further.</p>`), [['New run', openRun, true], ['Title', toTitle]]);

    return;

  }

  R.step++;

  if (R.step >= 5) {

    store.del('run'); store.set('runBest', 5); pay(500); updateTitlePurse(); unlock('gauntlet'); bump('gauntlets');

    msg('gauntlet', 'Gauntlet champion', withPurse(`<p>Five fights, five wins on run <b>${R.code}</b>. +$500 from the organisers.</p>`), [['Title', toTitle, true]]);

    return;

  }

  store.set('run', R);

  const r = seeded('boon' + R.code + R.step); const pool = BOONS.filter(b => b.key !== 'tape'); const offer = [];

  while (offer.length < 3) offer.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);

  let chosen = false;

  const choose = b => {

    if (chosen || G.match !== m) return; chosen = true;

    b.apply({}, R); R.boons.push(b.key);

    if (G.player) G.player.kit = R.kit;

    G.run = R; G.boon = runBoon(R); store.set('run', R);

    openGauntletRepair(60, () => { teamRepairs(); if (G.player) { R.kit = JSON.parse(JSON.stringify(G.player.kit)); store.set('run', R); } startRunFight(); }, () => gauntletRepairFailed(R));

  };

  msg('gauntlet', `Fight ${R.step} won`, withPurse(`<p>Pick one boon for the rest of the run. Then you have 60 seconds at the repair bench: your kit carries its damage into fight ${R.step + 1}.</p><div class="boons">${offer.map((b, i) => `<div class="boon"><span class="dicon">${b.icon}</span><b>${b.name}</b><span>${b.desc}</span></div>`).join('')}</div>`),

    offer.map((b, i) => [b.icon + ' ' + b.name, () => choose(b), i === 0]));

}
