// ---------- screens, matches, the Red Deer Rumble ----------

const SCREENS = ['title', 'howto', 'settings', 'tactics', 'sheetScr', 'repair', 'msgScr', 'pause', 'modes', 'ladder', 'career', 'townShop', 'creator'];

function showScreen(id) {

  if (id === 'howto') { renderHow(G.helpKind || IN.mode); selectTab($('#howTabs'), 'controls'); }

  if (id) { const oh = document.getElementById('onbHints'); if (oh) oh.hidden = true; }

  if (id === 'title' && G.hub && typeof TOWN !== 'undefined') { if (TOWN.on) { id = null; setTimeout(() => { refreshTouchUI(); townHudUpdate(); townPrompt(); }, 0); } else { enterTown(TOWN.returnTo); return; } } SCREENS.forEach(s => { $('#' + s).hidden = s !== id; }); G.screen = id; if (id && (IN.mode === 'pad' || IN.mode === 'kb')) setTimeout(() => { if (G.screen === id) { if (document.activeElement && document.activeElement !== document.body && !$('#' + id).contains(document.activeElement)) document.activeElement.blur(); if (IN.mode === 'pad') focusFirst(); } }, 30); updateLegend(); }

function setHud(on) {

  // Festival bouts reuse the fight simulation while the player remains in town.

  // Their scoreboard and camera controls must never cover the town controls.

  $('#hud').hidden = !on || (typeof TOWN !== 'undefined' && TOWN.on);

  refreshTouchUI();

}



const STAGES = [{ opp: 'wardens', name: 'Semi-final' }, { opp: 'rabble', name: 'Final' }];



function clearMatch() {

  persistPlayerKit();

  G.repairStop = false;

  for (const f of G.fighters) if (f.model) W3.matchRoot.remove(f.model.root);

  for (const p of G.props) W3.matchRoot.remove(p); G.props = [];

  (G.crew || []).forEach(o => W3.matchRoot.remove(o)); G.crew = [];

  G.fighters = []; G.clinches = []; G.timers = []; G.player = null; G.lastDown = null;

}



function rosterFor(club, mode, isA) {

  const r = club.roster;

  if (mode === 'train') return isA ? [r[0]] : r.slice(0, 2);

  if (mode === 12 || mode === 21) return bigRoster(club, mode);

  if (typeof mode === 'number' && (mode === 4 || mode > 5)) return bigRoster(club, mode).slice(0, mode); // online sides of any size

  if (mode === 5) return r;

  if (mode === 3) return isA ? [r[0], r[1], r[3]] : [r[0], r[1], r[2]];

  if (mode === 2) return isA ? [r[0], r[2]] : [r[0], r[3]];

  return [r[0]];

}

// starting spots: x across the list, z = how far back from your own start line

function slotsFor(n) {

  if (n === 21) { const out = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) out.push({ x: -7.2 + c * 2.4, z: r * 1.7 }); return out; }

  if (n === 12) { const xs = [-6.5, -3.9, -1.3, 1.3, 3.9, 6.5]; return xs.map(x => ({ x, z: 0 })).concat(xs.map(x => ({ x: x + 1.3 * Math.sign(x) * 0, z: 1.8 }))); }

  if (n === 5) return [-2.6, 0, 2.6, -5.2, 5.2].map(x => ({ x, z: 0 }));

  if (n === 3) return [-2.2, 0, 2.2].map(x => ({ x, z: 0 }));

  if (n === 2) return [-1.6, 1.6].map(x => ({ x, z: 0 }));

  if (n > 1) { const out = [], per = n > 7 ? Math.ceil(n / 2) : n; for (let i = 0; i < n; i++) { const row = Math.floor(i / per), c = i % per, w = Math.min(per, n - row * per); out.push({ x: (c - (w - 1) / 2) * 2.3, z: row * 1.8 }); } return out; }

  return [{ x: 0, z: 0 }];

}



G.loadout = Object.assign({ helm: 'pigface', weapon: 'mace', shield: 'heater', height: 'avg', build: 'medium' }, store.get('loadout', {}));

G.category = store.get('category', 'men');

// the weapon you actually carry: fantasy and special pieces never get past a kit check (Rumble, Duel Ladder)

function loadoutWeapon() { const w = WEAPONS[G.loadout.weapon] || WEAPONS.mace; return w.fantasy && (G.tourney || G.strict) ? WEAPONS.mace : w; }

function playerSpec(spec) {

  const L = G.loadout; const w = loadoutWeapon();

  return { ...spec, helm: L.helm, weapon: w.key, shield: w.hands === 2 || (G.mod && G.mod.noshield) ? null : (L.shield === 'none' ? null : L.shield) };

}

// duels are fought within one weapon category (sword and shield, sword and buckler, longsword, polearm); only profight mixes them

function duelStyle(spec) {

  const w = WEAPONS[spec.weapon] || WEAPONS.sword, hist = !w.fantasy;

  if (w.hands === 2 && w.haft) return { cat: 'Polearm', weapon: hist ? spec.weapon : 'polearm', shield: null };

  if (w.hands === 2) return { cat: 'Longsword', weapon: hist ? spec.weapon : 'longsword', shield: null };

  const sh = spec.shield || null;

  return { cat: sh === 'heater' ? 'Sword and shield' : sh === 'buckler' ? 'Sword and buckler' : 'Single weapon', weapon: hist ? spec.weapon : 'sword', shield: sh };

}

function matchDuelOpponent() {

  const m = G.match, p = G.player; if (!m || !m.duel || m.pro || !p) return;

  const st = duelStyle(p.spec); m.duelCat = st.cat;

  for (const f of G.fighters) if (f.team === 1) { f.spec = { ...f.spec, weapon: st.weapon, shield: st.shield }; f.weapon = WEAPONS[st.weapon]; f.shield = st.shield ? SHIELDS[st.shield] : null; resetFighterForRound(f); }

}

function setupMatch(o) {

  if (typeof TOWN !== 'undefined' && TOWN.on && !o.townBout) { TOWN.matchExit = TOWN.pos ? { x: TOWN.pos.x, z: TOWN.pos.z } : null; townTeardown(); } // a fight started from town: put the town away (a festival bout runs inside it)

  clearMatch(); clearReplay(); COMM.q = []; { const ce = $('#comm'); if (ce) { ce.textContent = ''; ce.classList.remove('on'); } } if (KID.on && !o.kids) { KID.on = false; KID.objs.forEach(x => W3.matchRoot.remove(x)); KID.objs = []; if (KID.pig) { W3.matchRoot.remove(KID.pig.g); KID.pig = null; } $('#lSkip').hidden = false; $('#lesson').hidden = true; }

  $('#lExit').onclick = lExitDefault; dropPhoto();

  G.strict = !!(G.tourney || o.ladder != null); if (!o.attract) resetMatchTally();

  if (!o.versus) { VS.on = false; G.bracket = null; VS.names = null; document.body.classList.remove('split', 'split4'); const sl = $('#splitLabels'); if (sl) sl.innerHTML = ''; } if (!o.online && !o.townBout && NET.on) netLeave();

  G.mod = o.mod || {}; if (!o.run) { G.run = null; G.boon = null; } if (!o.daily && !o.run) { G.shareKind = 'match'; G.shareExtra = {}; }

  setVenue(o.venue || (o.attract ? W3.venue : 'arena'));

  setWeather(o.weather || (o.attract ? 'clear' : (VENUES[W3.venue] && VENUES[W3.venue].weather) || 'clear'));

  const cat = o.category || G.category; const usedNames = {};

  setCuteDeco(cat === 'youth'); // kid-size fighters, foam kit and rubber weapons: set before anyone is built

  const A = (o.clubA && CLUBS[o.clubA]) || CLUBS.reavers, B = CLUBS[o.opp];

  for (const [club, team] of [[A, 0], [B, 1]]) {

    const ros = rosterFor(club, o.mode, team === 0); const slots = slotsFor(ros.length);

    ros.forEach((spec0, i) => {

      let spec = spec0;

      if (G.mod.noshield && spec.shield) spec = { ...spec, shield: null };

      if (team === 1 && o.mode === 1 && !o.pro && !o.attract && G.player) { const st = duelStyle(G.player.spec); spec = { ...spec, weapon: st.weapon, shield: st.shield }; }

      if (spec.player && team === 0 && !o.attract) spec = playerSpec(spec);

      else if ((club.key === 'rival' || spec.keep) && spec.bos && rosterEligible(spec.bos.id)) { usedNames[spec.name] = 1; }

      else if (spec.ladder != null && typeof ladderWho === 'function' && ladderWho(spec.ladder, cat)) { const W = ladderWho(spec.ladder, cat); spec = { ...spec, name: W.name, bos: { id: W.id, team: W.team } }; }

      else if (spec.ladder != null) { spec = { ...spec, name: poolName(usedNames), bos: null }; }

      else if (typeof rosterName === 'function' && (spec.rn = rosterName(club, spec, cat, usedNames, o))) spec = { ...spec, name: spec.rn.name, bos: spec.rn.bos };

      else { const pool = NAMES[cat]; let k = (club.key.length * 7 + spec.num * 3 + (cat === 'men' ? 0 : 5)) % pool.length; let guard = 0; while (usedNames[pool[k]] && guard++ < pool.length) k = (k + 1) % pool.length; usedNames[pool[k]] = 1; spec = { ...spec, name: pool[k] }; }

      usedNames[spec.name] = 1;

      const body = makeBody(cat, spec.arch, club.key + spec.num + cat, spec.player && team === 0 && !o.attract ? G.loadout : null);

      let kit = null;

      if (G.tourney && team === 0) kit = G.tourney.kits[spec.num] || (G.tourney.kits[spec.num] = spec.player ? boostKit(freshKit(spec, true)) : freshKit(spec, false));

      else if (G.run && spec.player && team === 0 && !o.attract) kit = G.run.kit; // Gauntlet: the damage carries

      else if (spec.player && team === 0) kit = careerMatch(o) ? careerKit(spec) : freshKit(spec, true);

      const f = createFighter(spec, club, team, i, kit || freshKit(spec, false), body);

      if (spec.player && team === 0 && !o.attract) { f.isPlayer = true; G.player = f; }

      if (spec.player && team === 0 && careerMatch(o)) for (const k of Object.keys(kit)) normalizeRepairPiece(kit[k], k);

      const sl = slots[i]; const x = team === 0 ? sl.x : -sl.x; const back = LIST.L / 2 - 3 + sl.z;

      f.home = { x, z: team === 0 ? back : -back };

      if (G.tourney && team === 0) f.redMatches = G.tourney.reds[spec.num] || 0;

      G.fighters.push(f);

      buildFighterModel(f); W3.matchRoot.add(f.model.root);

    });

  }

  // support crew holding reserves outside each weapon zone (BR 3.6.2)

  G.crew = []; G.reserveAll = [[], []];

  [A, B].forEach((club, t) => {

    const zn = W3.zones[t]; const sx = Math.sign(zn.x);

    if (t === 0 && G.player && !squireActive(squireTeam(A))) return;

    const s = UAL.ready ? ualSquire(club) : buildSupportModel(club); s.root.position.set(zn.x + sx * 1.9, 0, zn.z); s.root.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; s.root.userData = { name: t === 0 && G.player ? teamSquire(squireTeam(A)).name : teamSquire(squireTeam(club)).name, squire: t, ual: !!s.ual, J: s.ual ? s : null }; if (t === 0 && G.player) { const label = townLabel(teamSquire(squireTeam(A)).name, 'Your corner squire', '#f2c40f'); label.userData.cornerLabel = true; label.position.y = 2.4; s.root.add(label); } W3.matchRoot.add(s.root); G.crew.push(s.root);

    for (let i = 0; i < 2; i++) { const w = buildWeapon('sword', club); w.position.set(zn.x + sx * 0.95, 0.62, zn.z - 0.6 + i * 1.1); w.rotation.set(0, 0, sx * 0.22); W3.matchRoot.add(w); G.crew.push(w); G.reserveAll[t].push(w); }

  });

  buildMarshals();

  G.match = { ...o, challengeLevel: clamp(Math.floor(Number(o.challengeLevel == null ? CAREER.level : o.challengeLevel) || 1), 1, 100), duelCat: o.mode === 1 && G.player ? duelStyle(G.player.spec).cat : null, category: cat, wins: [0, 0], round: 0, results: [], cards: [], takedowns: [0, 0], clock: ROUND_TIME, champion: false, playerHits: 0, duel: o.mode === 1 && !o.attract, pts: [0, 0], cute: cat === 'youth', metrics: { start: G.simTime, actions: [{}, {}], hits: [0, 0], whiffs: [0, 0], guards: [0, 0] } };

  G.match.squireTeam = squireTeam(A); G.match.careerWeapon = G.player?.spec.weapon; refreshPlayerCorner();

  G.match.challengePressure = clamp((challengeFactor(G.match.challengeLevel) - 1) / (CHALLENGE_MAX - 1), 0, 1);

  assignMeleeRoles(0); assignMeleeRoles(1);

  $('#sbA').textContent = A.short; $('#sbB').textContent = B.short;

  buildPips();

}



function resetFighterForRound(f) {

  Object.assign(f, {

    state: 'standing', vel: { x: 0, z: 0 }, lean: { x: 0, z: 0 }, leanV: { x: 0, z: 0 }, gas: 1, bell: 0, action: null, cd: 0, noStep: 0, stepRem: 0, stepCd: 0,

    clinch: null, graceUntil: -1, plantCd: 0, rearmT: 0, sidearmT: 0, sidearmUsed: false, brace: false, guard: false, sprint: false, touched: false, fallT: 0,

    groundStyle: 'fall', returnAt: -1, armorKnee: false, foulVictimT: -9, earlyRiseT: 0, earlyWarned: false, earlyCarded: false, softTarget: null, lastCause: null, fatigue: (f.fatigue || 0) * 0.55, tiredWarn: 0, unbreakUsed: false, secondUsed: false, buffT: 0, comboN: 0, chainT: 0

  });

  f.ai.target = null; f.ai.next = rand(0, 0.4); f.move = { x: 0, z: 0 };

  f.pos = { ...f.home }; f.facing = f.wantFace = f.ffaFace != null ? f.ffaFace : f.team === 0 ? Math.PI : 0;

  if (f.isPlayer) { FP.yaw = f.facing; FP.pitch = -0.06; f.lookYaw = f.facing; CAM.tpInit = false; IN.lock = null; }

  // weapon back in hand; a torn haft wrap keeps the weapon out (WR 7.2.2)

  let wk = f.spec.weapon;

  if (f.kit.haft.failed) { if (f.isPlayer || G.attract) wk = 'sword'; else { f.kit.haft.failed = false; f.kit.haft.cond = 0.7; } }

  f.weapon = f.isPlayer && f.kit.haft.failed && !squireActive() ? null : humanFighter(f) ? profileWeapon(wk, combatProfile(f)) : WEAPONS[wk]; f.shield = f.weapon?.hands === 2 ? null : SHIELDS[f.spec.shield] || null; recalcBody(f);

  for (const k in f.kit) if (k !== 'haft' && f.kit[k].failed && !f.kit[k].covered && !f.isPlayer) { f.kit[k].failed = false; f.kit[k].cond = Math.max(f.kit[k].cond, 0.55); f.kit[k].tape = 'black'; }

  if (f.kit.helmet.failed && !f.isPlayer) { f.kit.helmet.failed = false; f.kit.helmet.cond = Math.max(f.kit.helmet.cond, 0.5); }

  // rebuild the model (helmet back on, weapon, tape)

  W3.matchRoot.remove(f.model.root); buildFighterModel(f); W3.matchRoot.add(f.model.root);

  f.model.root.visible = !f.out;

}



// 5v5 squads register eight (BI): three fresh fighters wait on the bench and come on for the tired or the battered between rounds.

// Red cards are never replaced: that team fights a fighter short (REG 6.3.3).

function benchRotation(m) {

  if (m.mode !== 5 || m.versus || m.online || m.training || m.round <= 1) return;

  m.bench = m.bench || [3, 3]; const cat = m.category, pool = NAMES[cat] || NAMES.men;

  for (const t of [0, 1]) for (const f of G.fighters.filter(x => x.team === t && !x.isPlayer && !x.out)) {

    if (m.bench[t] <= 0) break;

    const kitAvg = (f.kit.helmet.cond + f.kit.armL.cond + f.kit.armR.cond + f.kit.legs.cond) / 4;

    if ((f.fatigue || 0) < 0.4 && kitAvg > 0.45) continue;

    const old = label(f), why = (f.fatigue || 0) >= 0.4 ? 'blown' : 'kit in pieces';

    const used = new Set(G.fighters.map(x => x.name)); let nm = pick(pool), g = 0; while (used.has(nm) && g++ < 40) nm = pick(pool);

    f.name = nm; f.spec = { ...f.spec, name: nm, num: 20 + ((Math.random() * 40) | 0), dispNum: null }; f.num = f.spec.num;

    f.body = makeBody(cat, f.spec.arch, f.club.key + nm, null); f.kit = freshKit(f.spec, false); f.fatigue = 0; m.bench[t]--;

    if (!G.attract) feed(`Bench: ${f.club.short} ${f.num} ${nm} comes on for ${old} (${why}). ${m.bench[t]} left on the bench.`, 'REG 3', teamColor(f));

  }

}

function startRound() {

  const m = G.match; m.round++; m.clock = m.duel ? (m.overtime ? DUEL_OT : DUEL_TIME) : ROUND_TIME; m.pts = [0, 0];

  for (const p of G.props) W3.matchRoot.remove(p); G.props = [];

  prepareReserveWeapons();

  for (const f of G.fighters) {

    f.out = m.champion ? !(f.spec.player || (f.team === 1 && f.spec.captain) || (f.team === 0 && !G.player && f.spec.player)) : f.redMatches > 0;

  }

  for (const t of [0, 1]) { // a team never fields fewer than 3 (REG 6.3.3)

    const team = G.fighters.filter(f => f.team === t);

    if (!m.champion && team.length >= 3) { let n = team.filter(f => !f.out).length; for (const f of team) if (n < 3 && f.out) { f.out = false; n++; } }

  }

  benchRotation(m);

  G.fighters.forEach(resetFighterForRound);

  if (G.player && G.player.weapon && G.player.weapon.key !== G.player.spec.weapon && !G.attract) after(0.2, () => feed('Your haft wrap is torn, so the marshal won\'t let that weapon in (WR 7.2.2). You fight with a reserve arming sword.', 'WR 7.2.2', 'var(--marshal)'));

  buildPips();

  G.marshals.forEach(mm => { mm.pos = { ...mm.home }; mm.breakTarget = null; });

}



function toTactics() {

  if (G.autoflow) { startRound(); beginFight(); return; }

  AU.music(true);

  startRound(); G.phase = 'tactics'; setHud(false);

  const m = G.match, B = CLUBS[m.opp];

  $('#tacStage').textContent = (m.champion ? "Champion's fight" : `${m.stage}, round ${m.round}`);

  $('#tacTitle').textContent = `${CLUBS.reavers.name} vs ${B.full}`;

  $('#tacSub').textContent = m.champion ? "Rounds are level. One fighter from each side, first to the floor loses." : m.mode > 1 ? 'Pick the call your squad opens with. You can change it mid-fight.' : m.pro ? `Profight: armoured MMA. Any weapon against any weapon, grappling counts, and a takedown scores ${DUEL_PTS.takedown + 1}. Clean hits: head ${DUEL_PTS.helmet}, body ${DUEL_PTS.torso}, limbs 1. ${DUEL_TIME}-second rounds, best of three.` : `${m.duelCat || 'Duel'} category: you both fight with the same kind of weapon. Head ${DUEL_PTS.helmet}, body ${DUEL_PTS.torso}, arms and legs 1, takedown ${DUEL_PTS.takedown}. Change your weapon and your opponent changes to match. ${DUEL_TIME}-second rounds, best of three.`;

  $('#tacSub').append(document.createTextNode(` Challenge level ${m.challengeLevel} · ${G.settings.difficulty}. Milestones: 25, 50, 75, 80, 90, 100.`));

  renderKitPicker(); if (!G.player) renderLineup();

  selectTab($('#tacTabs'), G.player ? 'helm' : 'squad'); $$('#tacTabs [data-tab]').forEach(b => b.hidden = !G.player && b.dataset.tab !== 'squad');

  const ob = $('#orders'); ob.innerHTML = '';

  if (m.mode > 1 && !m.champion) for (const k of ['free', 'pair', 'hold', 'hunt', 'peel']) {

    const b = h('button', { class: 'order', 'aria-pressed': String(G.orders[0] === k), onclick: () => { setOrder(k); $$('.order').forEach(x => x.setAttribute('aria-pressed', String(x === b))); } }, h('b', null, ORDERS[k].name), h('span', null, ORDERS[k].desc));

    ob.append(b);

  }

  showScreen('tactics');

  G.tacClock = 90;

}

function renderLineup() {

  const lu = $('#lineup'); lu.innerHTML = '';

  if (G.match && G.match.mode === 5 && !G.match.training) { const b = G.match.bench || [3, 3]; lu.append(h('p', { class: 'muted small' }, `Bench: ${b[0]} fresh for ${CLUBS.reavers.name}, ${b[1]} for ${CLUBS[G.match.opp].name}. Tired or battered teammates swap out between rounds.`)); }

  for (const f of G.fighters) {

    if (f.out) { lu.append(h('div', { class: 'lu' + (f.team ? ' foe' : '') }, h('span', { class: 'n' }, f.num), h('div', null, h('div', null, `${f.name} · sitting out`), h('div', { class: 'w' }, f.redMatches > 0 ? 'Red card (REG 6.3.3)' : 'On the bench')), h('span', { class: 'cond' }, ''))); continue; }

    const w = f.weapon; const kitAvg = Math.round((f.kit.helmet.cond + f.kit.armL.cond + f.kit.armR.cond + f.kit.legs.cond) / 4 * 100);

    const spec = f.isPlayer ? (w.fantasy ? `${w.name}, ${w.mass} kg, ${Math.round(w.len * 100)} cm: ${w.specialSet ? 'special' : 'fantasy'}, exhibition only` : `${w.name}, ${w.mass} kg, ${Math.round(w.len * 100)} cm: in spec for ${w.cls} (${w.spec})`) : `${w.name} ${w.mass} kg · ${HELMS[f.spec.helm].name}`;

    const detail = h('div', null, h('div', null, `${f.isPlayer ? (CAREER.name === 'You' ? 'You' : CAREER.name + ' (you)') : f.name} · ${f.arch.name}${f.isPlayer ? '' : ' · ' + traitOf(f)} · ${f.body.h.toFixed(2)} m${f.spec.captain ? ' · capt.' : ''}${meleeRolesOn() && f.ai.role ? ' · ' + MELEE_ROLES[f.ai.role] : ''}`), h('div', { class: 'w' }, spec));

    if (meleeRolesOn() && !f.team && !f.isPlayer && !G.match.online && !G.match.versus) {

      const controls = h('div', { class: 'role-picker', 'aria-label': `${f.name} melee role` });

      for (const role of ['auto', 'tank', 'rook', 'runner']) controls.append(h('button', { type: 'button', 'aria-pressed': String((f.ai.roleManual || 'auto') === role), onclick: () => setMeleeRole(f.id, role) }, role === 'auto' ? `Auto: ${MELEE_ROLES[f.ai.role]}` : MELEE_ROLES[role]));

      detail.append(controls);

    }

    lu.append(h('div', { class: 'lu' + (f.team ? ' foe' : '') + (f.isPlayer ? ' me' : '') }, h('span', { class: 'n' }, f.num), detail, h('span', { class: 'cond num' }, `kit ${kitAvg}%`)));

  }

}



function beginFight() {

  if (G.player && careerMatch() && !G.match.duel && !squireActive(G.match.squireTeam) && !G.match.squireWarning) { G.match.squireWarning = true; toast('No squire recruited', 'bad', 'No corner replacement weapons. Find your squire at the main entrance.'); }

  hideAll(); setHud(true); G.phase = 'prefight'; refreshTouchUI(); AU.music(false);

  // Fullscreen is entered only through the explicit settings control.

  COMM.firstDown = false; COMM.q.length = 0; showIntro();

  $('#rnd').textContent = G.match.champion ? 'Champion' : G.match.overtime ? 'Overtime' : 'Round ' + G.match.round;

  $('#cmd').textContent = ORDERS[G.orders[0]].name;

  AU.setCrowd(0.06);

  const m = G.match; const rv = m.champion ? 'sudden_death' : m.round >= 3 ? 'final_round' : 'round_' + m.round;

  if (m.training) { $('#rnd').textContent = 'Training'; after(0.3, () => { marshalCall('Training yard', 'No clock, no cards. Everyone gets back up.', 1, false); G.phase = 'fight'; refreshTouchUI(); }); return; }

  after(0.2, () => { marshalCall(m.champion ? "Champion's fight" : 'Round ' + m.round, '', 1, false); AU.vo(rv); });

  after(1.4, () => { marshalCall('Fighters ready?', '', 1, false); AU.vo('ready'); });

  after(2.5, () => { marshalCall('Fight!', '', 3, false); AU.vo('fight'); raiseFlags('knight'); G.phase = 'fight'; AU.cheer(0.8); refreshTouchUI(); AU.gong && AU.gong(0.5);

    const w = m.wins; const tn = t => t === 0 ? CLUBS.reavers.name : CLUBS[m.opp].name;

    if (m.rival && m.round === 1) { const R = rivalState(); comm('rival', { who: rivalName(m.category), last: R.last === 'trip' ? 'a trip that put them on the floor' : 'a hiding on points' }, 3); }

    else if (m.round >= 3 || m.champion) comm('final', {}, 2); else if (w[0] === 1 || w[1] === 1) comm('matchpoint', { team: tn(w[0] === 1 ? 0 : 1) }, 2); else comm('start', { r: m.round }, 2);

  });

}

function hideAll() { showScreen(null); }



function standing(team) { return G.fighters.filter(f => f.team === team && isUp(f)).length; }

function checkRoundEnd() {

  if (G.phase !== 'fight' || (G.match && (G.match.training || G.match.duel))) return; // duels run the clock and count points

  if (G.match && G.match.ffa) { ffaRoundCheck(); return; }

  const a = standing(0), b = standing(1);

  if (a === 0 || b === 0 || a >= 3 * b || b >= 3 * a) endRound('3:1');

}



function endRound(reason) {

  if (G.phase !== 'fight') return;

  const m = G.match; G.phase = 'stopping';

  const a = m.duel ? m.pts[0] : standing(0), b = m.duel ? m.pts[1] : standing(1);

  let winner = m.duel && m.duelDQ != null ? 1 - m.duelDQ : a > b ? 0 : b > a ? 1 : -1;

  if (m.ffa) { const wf = ffaWinner(reason); winner = -1; if (wf) { m.ffaWins[wf.team]++; G.lastDown = G.lastDown || wf; } m.ffaLast = wf; reason = reason === 'time' ? 'time' : 'ffa';

    const me = G.player || (VS.on && VS.humans && VS.humans[0]); m.wins = [me ? m.ffaWins[me.team] : 0, Math.max(0, ...G.fighters.filter(f => f !== me).map(f => m.ffaWins[f.team]))]; }

  else if (m.duel && m.duelDQ != null) m.wins[winner] = Math.max(2, m.wins[winner]);

  else if (winner >= 0) m.wins[winner]++;

  if (m.duel) reason = m.duelDQ != null ? 'dq' : 'duel';

  const time = (m.duel ? (m.overtime ? DUEL_OT : DUEL_TIME) : ROUND_TIME) - m.clock;

  m.results.push({ round: m.champion ? 'C' : m.round, winner, a, b, time, reason });

  G.stats.rounds++; G.stats.roundTimes.push(Math.round(time));

  G.slowmo = 0.8;

  if (m.mode === 12 && winner === 0 && G.player && isUp(G.player) && !G.attract) unlock('massacre');

  if (reason !== 'time' && G.lastDown && !G.match.training) startCine(G.lastDown, 2.2);

  if (reason === '3:1' && !G.attract) comm('ratio', {}, 3); // the round-ending takedown, slowed down

  for (const f of G.fighters) { f.action = null; f.move = { x: 0, z: 0 }; f.guard = f.brace = false; if (f.clinch) breakClinch(f); }

  if (G.attract) { after(3, () => { if (!G.attract) return; if (BOUT.on && BOUT.inSim) boutAfterRound(); else { startRound(); G.phase = 'fight'; } }); return; }

  marshalCall('Hold! Stop fight!', reason === 'dq' ? 'Disqualification.' : reason === 'time' || reason === 'duel' ? 'Time.' : '', 3); raiseFlags(); if (reason === 'time' || reason === 'duel') AU.vo('time');

  const wname = m.ffa ? (m.ffaLast ? (m.ffaLast.isPlayer ? 'you' : m.ffaLast.name) : null) : winner < 0 ? null : winner === 0 ? CLUBS.reavers.name : CLUBS[m.opp].name;

  after(1.7, () => marshalCall(wname ? `Round to ${wname}` : 'Round drawn', reason === 'dq' ? 'Disqualification' : m.duel ? `${a}–${b} on points` : `${a}–${b} standing (REG 4.${reason === 'time' ? 2 : 1})`, 2));

  after(3.4, () => { if (m.duelDQ != null) return; marshalCall('All rise.', '', 1); for (const f of G.fighters) if (isDown(f) && !f.out) { if (f.state === 'falling') f.state = 'grounded'; f.state = 'rising'; f.riseT = 0; } });

  after(5.0, afterRound);

}



function afterRound() {

  const m = G.match; G.phase = 'between';

  if (m.ffa) {

    if (Object.values(m.ffaWins).some(v => v >= 2) || m.round >= 4) { G.phase = 'over'; setHud(false); ffaMatchEnd(); return; }

    const next = () => { teamRepairs(); startRound(); beginFight(); };

    if (G.player && ['helmet', 'armL', 'armR', 'legs'].some(k => G.player.kit[k].failed)) {

      openRepair(30, next, { failuresOnly: true, emergency: true, onFail: () => { G.phase = 'over'; setHud(false); ffaMatchEnd(); } });

    } else after(0.1, next);

    return;

  }

  const decided = m.wins[0] >= 2 || m.wins[1] >= 2 || m.champion && m.results[m.results.length - 1].winner >= 0;

  if (decided) { matchEnd(); return; }

  if (m.duel) { if (m.round >= 3) { if (m.wins[0] === m.wins[1] && !m.overtime) m.overtime = true; else { matchEnd(); return; } } }

  else if (m.round >= 3 && !m.champion) {

    if (m.wins[0] === m.wins[1]) { m.champion = true; }

    else { matchEnd(); return; }

  }

  if (m.online || m.versus) { after(0.1, () => { if (!m.duel) teamRepairs(true); startRound(); beginFight(); }); G.phase = 'between'; return; } // no bench between online or versus rounds

  if (m.run && !m.season && G.player) {

    setHud(false);

    openGauntletRepair(30, () => { teamRepairs(); startRound(); beginFight(); }, () => {

      m.wins[1] = Math.max(2, m.wins[1]);

      m.repairDone = true;

      marshalCall('Repair time expired', 'Unsafe armour. You cannot return to the list.', 3);

      matchEnd();

    });

    return;

  }

  if (G.autoflow) { toTactics(); return; }

  const failedArmour = G.player && ['helmet', 'armL', 'armR', 'legs'].some(k => G.player.kit[k].failed);

  if (!failedArmour && !m.online && !m.versus && G.player && !G.player.out) { after(0.1, () => { startRound(); beginFight(); }); G.phase = 'between'; return; }

  setHud(false); renderSheet(); showScreen('sheetScr');

  $('#btnSheetNext').textContent = 'Continue';

  $('#btnSheetNext').onclick = () => {

    const failedArmour = G.player && ['helmet', 'armL', 'armR', 'legs'].some(k => G.player.kit[k].failed);

    if (failedArmour) (m.duel ? runToRepairCorner : done => done())(() => openRepair(30, () => { teamRepairs(); toTactics(); }, { failuresOnly: true, emergency: true, onFail: () => {

      m.wins[1] = Math.max(2, m.wins[1]);

      m.repairDone = true;

      marshalCall('Repair time expired', 'Unsafe armour. You cannot return to the list.', 3);

      matchEnd();

    } }));

    else openRepair(Math.round(45 * mod(null, 'repair') + (G.boon && G.boon.repairAdd || 0)), () => { teamRepairs(); toTactics(); });

  };

}



function runToRepairCorner(done, fighter = G.player) {

  const f = fighter, m = G.match, zone = W3.zones && W3.zones[f.team];

  if (!f || !zone) { done(); return; }

  showScreen(null); setHud(false);

  marshalCall('Armour failure', f.isPlayer ? (squireActive() ? `Run to your corner. You and ${teamSquire().name} have 30 seconds to repair it.` : 'Run to your corner. You have 30 seconds at the manual repair bench; no squire is recruited.') : `${label(f)} runs to the squire for an armour check.`, 2);

  const start = { ...f.pos }, edge = LIST.W / 2 - f.radius - 0.2;

  const target = { x: clamp(zone.x, -edge, edge), z: clamp(zone.z, -LIST.L / 2 + 1, LIST.L / 2 - 1) };

  f.state = 'standing'; f.returnAt = -1; f.vel = { x: 0, z: 0 };

  const steps = Math.max(1, Math.ceil(Math.hypot(target.x - start.x, target.z - start.z) / (3.7 * 0.055)));

  let step = 0;

  const advance = () => {

    if (G.match !== m || G.phase !== 'between') return;

    const old = { ...f.pos }, t = ++step / steps;

    f.pos.x = start.x + (target.x - start.x) * t;

    f.pos.z = start.z + (target.z - start.z) * t;

    f.vel = { x: (f.pos.x - old.x) / 0.055, z: (f.pos.z - old.z) / 0.055 };

    f.facing = f.wantFace = Math.atan2(target.x - start.x, target.z - start.z);

    if (step < steps) after(0.055, advance);

    else { f.vel = { x: 0, z: 0 }; done(); }

  };

  advance();

}



function meleeArmourKnee(f, piece) {

  if (!isUp(f)) return;

  if (f.clinch) breakClinch(f);

  f.action = null; f.move = { x: 0, z: 0 }; f.vel = { x: 0, z: 0 };

  f.guard = f.brace = false; f.lastCause = null; f.returnAt = -1;

  f.state = 'kneeling'; f.kneelT = 0; f.groundStyle = 'kneel'; f.armorKnee = true;

  marshalCall('Armour failure', `${label(f)} has exposed ${PIECE_NAMES[piece].toLowerCase()} and takes a knee. The melee continues.`, 2);

  G.needRoundCheck = true;

}



function emergencyArmourStop(f, piece) {

  const m = G.match;

  if (!m || G.phase !== 'fight') return;

  // Stop every exchange immediately: an exposed head or limb is never a valid target.

  G.phase = 'between'; G.repairStop = true;

  for (const fighter of G.fighters) {

    if (fighter.clinch) breakClinch(fighter);

    fighter.action = null; fighter.move = { x: 0, z: 0 };

    fighter.vel = { x: 0, z: 0 }; fighter.guard = fighter.brace = false;

  }

  marshalCall('Hold! Armour failure', `${label(f)}: ${PIECE_NAMES[piece].toLowerCase()} failed. To the lyst-side squire, not the floor.`, 3);

  runToRepairCorner(() => {

    if (G.match !== m || !G.repairStop) return;

    if (f.isPlayer) {

      openRepair(30, () => {

        if (G.match !== m) return;

        restoreRepairedFighter(f);

        resumeAfterArmourRepair();

      }, { failuresOnly: true, emergency: true, onFail: () => {

        if (G.match !== m) return;

        f.out = true; f.returnAt = -1;

        m.wins[1 - f.team] = Math.max(2, m.wins[1 - f.team]);

        if (m.duel) m.duelDQ = f.team;

        marshalCall('Repair time expired', 'Unsafe armour. You cannot return to the list.', 3);

        G.repairStop = false; G.phase = 'fight'; endRound('repair');

      } });

    } else {

      // The opposing squire works while play is held; never send an unprotected AI back in.

      after(2, () => {

        if (G.match !== m || !G.repairStop) return;

        const pc = f.kit[piece]; pc.failed = false; pc.covered = false;

        pc.cond = Math.max(0.65, pc.cond); pc.tape = 'black';

        restoreRepairedFighter(f);

        resumeAfterArmourRepair();

      });

    }

  }, f);

}



function restoreRepairedFighter(f) {

  W3.matchRoot.remove(f.model.root);

  buildFighterModel(f); W3.matchRoot.add(f.model.root);

}



function resumeAfterArmourRepair() {

  G.repairStop = false; G.phase = 'fight';

  showScreen(null); setHud(true);

  marshalCall('Fight!', 'Armour checked. Resume.', 2);

}



function teamRepairs(includePlayers = false) { // your club patches its own kit; they stick to legal cloth tape

  for (const f of G.fighters) {

    if (f.isPlayer && !includePlayers) continue;

    for (const k in f.kit) { const p = f.kit[k]; if (p.cond < 0.5) { p.cond = Math.min(0.85, p.cond + 0.32); p.tape = 'black'; p.failed = false; p.covered = false; } }

  }

}



function renderSheet(extraTitle) {

  const m = G.match, B = CLUBS[m.opp];

  const rows = m.results.map(r => `<tr><td>${r.round}</td><td class="hand">${r.winner < 0 ? 'draw' : r.winner === 0 ? CLUBS.reavers.name : B.name}</td><td>${r.a}–${r.b}</td><td>${fmtClock(r.time)}</td><td>${r.reason === 'dq' ? 'Disqualification' : r.reason === 'duel' ? 'More points (duel rules)' : r.reason === 'time' ? 'Time, more standing (REG 4.2)' : 'Outnumbered 3 to 1 (REG 4.1)'}</td></tr>`).join('');

  const cards = m.cards.length ? m.cards.map(c => `<tr><td>${c.round}</td><td>${c.who}</td><td>${cardIcon(c.card) || ''}${c.card}</td><td>${c.text}</td><td>${c.cite}</td></tr>`).join('') : '<tr><td colspan="5">None recorded.</td></tr>';

  const green = G.tourney ? Object.keys(G.tourney.green) : [];

  $('#sheet').innerHTML = `

    <div class="src">Secretary's sheet · BuhurtOS</div>

    <h3>${extraTitle || `${m.stage}: ${CLUBS.reavers.name} vs ${B.full}`}</h3>

    <div class="meta"><span><b>Event</b> ${m.ladder != null ? 'Duel Ladder' : G.tourney ? 'Red Deer Rumble' : 'Exhibition'}</span><span><b>Format</b> ${m.mode}v${m.mode}, best of 3 rounds</span><span><b>Rounds</b> <span class="hand">${m.wins[0]}–${m.wins[1]}</span></span><span><b>Appeals</b> none filed (1 available, REG 7.1)</span></div>

    <div class="tblwrap"><table><thead><tr><th>Rd</th><th>Winner</th><th>${m.duel ? 'Points' : 'Standing'}</th><th>Time</th><th>Result</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No rounds yet.</td></tr>'}</tbody></table></div>

    <div class="tblwrap"><table><thead><tr><th>Rd</th><th>Fighter</th><th>Card</th><th>Reason</th><th>Rule</th></tr></thead><tbody>${cards}</tbody></table></div>

    ${green.length ? `<div class="meta"><span><b>Green cards carried</b> ${green.map(k => k.replace('reavers-', 'RVR ')).join(', ')} (TS 2)</span></div>` : ''}`;

}



// every message screen: tape label and a big title up top, scrolling body, actions pinned to the bottom

// leaving a match from the tactics, score-sheet or repair screen (or a message with no back of its own): ask first

// when a match is under way, then go back to the menu the match came from

function leaveTarget() {

  const m = G.match;

  if (!m || G.attract) return toTitle;

  if (m.test) return () => { clearMatch(); G.match = null; G.phase = ''; onbSet('choice'); G.hub = false; toTitle({ home: true }); };

  if (m.ladder != null) return () => { toTitle(); openLadder(); };

  if (G.tourney || m.run || m.season || m.daily || m.rival || m.online || m.kids || m.training || m.trial || m.throne) return toTitle;

  if (m.versus) return () => { toTitle(); openVersus(); };

  if (G.hub) return toTitle;

  return () => { toTitle(); openModes(); };

}

function leaveScreen() {

  const from = G.screen, m = G.match, live = m && !G.attract && G.phase !== 'over';

  if (!live) { toTitle(); return; }

  msg('leave', 'Leave this match?', `<p>${G.tourney ? 'Your Rumble is saved: Continue the Rumble from the title screen picks it up again.' : 'This match ends and doesn’t count.'}</p>`,

    [['Leave', () => { if (NET.on) netLeave(); leaveTarget()(); }, true], ['Stay', () => showScreen(from === 'msgScr' ? 'title' : from)]]);

}

function msg(kicker, title, bodyHtml, buttons) {

  const p = $('#msgPanel'); p.innerHTML = '';

  const same = kicker.toLowerCase() === String(title).toLowerCase();

  const BACKISH = /^(back|cancel|title|no thanks|close|stop|quit|leave|other games|couch play|done)/i;

  const backBtn = buttons.find(([text]) => BACKISH.test(String(text)));

  const goBack = backBtn ? backBtn[1] : leaveScreen;

  const hb = h('button', { class: 'back', 'data-back': '', 'data-gp': 'B', 'aria-label': 'Back', onclick: e => { e.stopPropagation(); AU.click(); goBack(); } });

  hb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg><span>Back</span>';

  p.append(h('header', { class: 'phead' }, hb, h('div', { class: 'ttape tape mk' }, kicker), same ? null : h('h2', { class: 'msgtitle' }, title)));

  const body = h('div', { class: 'pbody' }); body.innerHTML = bodyHtml; p.append(body);

  const row = h('footer', { class: 'pfoot' });

  buttons.forEach(([text, fn, primary]) => row.append(h('button', { class: 'btn ' + (primary ? 'primary flagtape' : 'tape'), 'data-gp': primary ? 'A' : null, onclick: () => { AU.click(); fn(); } }, text)));

  p.append(row); showScreen('msgScr');

}



function tapeLogHtml(list) {

  if (!list.length) return '<p class="muted">No repairs yet. The gear bag is still full of black tape.</p>';

  return '<div class="taplog">' + list.map(e => `<div><span>${e.piece}: ${e.tape.toLowerCase()}${e.q != null ? `, ${Math.round(e.q * 100)}% wrap` : ''}</span><span class="muted">${e.where}</span></div>`).join('') + '</div>';

}



function matchEnd() {

  if (G.match && G.match.run && !G.match.season && G.match.gauntletResultShown) return;

  const m = G.match; G.phase = 'over'; setHud(false);

  if (!m.repairDone && G.player && !(m.run && !m.season) && !m.training && !m.online && !m.versus && !m.tourney && !m.test) {

    m.repairDone = true;

    const failed = ['helmet', 'armL', 'armR', 'legs'].some(k => G.player.kit[k].failed);

    openRepair(failed ? 30 : Math.round(45 * mod(null, 'repair') + (G.boon && G.boon.repairAdd || 0)), () => { teamRepairs(); matchEnd(); }, failed ? { failuresOnly: true, emergency: true } : {});

    return;

  }

  if (G.autoflow) { G.stats.matches = (G.stats.matches || 0) + 1; if (G.autoNext) G.autoNext(); return; }

  if (m.run && !m.season) m.gauntletResultShown = true;

  squireMatchComplete(m);

  const won = m.wins[0] > m.wins[1], drawn = m.wins[0] === m.wins[1]; AU.music(true);

  if (m.versus || (m.online && NET.role === 'host')) eventMatch(m, won);

  if (m.versus && G.bracket) { VS.on = false; document.body.classList.remove('split', 'split4'); $('#splitLabels').innerHTML = ''; bracketResult(m.wins[0] > m.wins[1] ? 0 : m.wins[1] > m.wins[0] ? 1 : (m.pts && m.pts[1] > m.pts[0] ? 1 : 0)); return; }

  if (m.versus) { VS.on = false; document.body.classList.remove('split', 'split4'); $('#splitLabels').innerHTML = ''; const k = VS.kind; const t = drawn ? 'Draw' : k === 'duel' ? (won ? 'Player 1 wins' : 'Player 2 wins') : k === 'tag' ? (won ? 'Players 1 and 3 win' : 'Players 2 and 4 win') : (won ? 'You two win' : 'The bots win'); msg('local play', t, `<p>${m.wins[0]}–${m.wins[1]} in rounds.</p>`, [['Rematch', () => startVersus(k), true], ['Couch play', openVersus], ['Title', toTitle]]); return; }

  if (m.online) { onlineMatchEnd(); return; }

  renderSheet();

  const p = G.player;

  if (G.tourney) { G.tourney.playerCards = (G.tourney.playerCards || 0) + m.cards.filter(c => c.who === 'You').length; }

  // the Rumble's prize money is paid below; everything else pays here

  const pay0 = careerMatchEnd(m, won);

  let purseHtml = pay0 ? `<div class="paybox"><b class="num">+${fmtMoney(pay0.money)}</b><span>${pay0.lines.join(' · ')}</span><span class="muted">Purse ${fmtMoney(CAREER.purse)}. Spend it in Your fighter.</span></div>` : '';

  const summary = `<p>${won ? `${CLUBS.reavers.name} take it` : `${CLUBS[m.opp].name} take it`}, ${m.wins[0]}–${m.wins[1]} in rounds. You took ${p ? p.stats.takedowns : 0} fighter${p && p.stats.takedowns === 1 ? '' : 's'} down and landed ${p ? p.stats.hits : 0} strikes.</p>${hitMapHtml()}PBS

    PURSE<details><summary>Secretary's sheet</summary><div><div class="sheet">${$('#sheet').innerHTML}</div></div></details>

    <details><summary>Tape log</summary><div>${tapeLogHtml(G.tourney ? G.tourney.tapeLog : REP.log)}</div></details>`;

  const shareBtn = '<div class="sharerow"><button class="btn tape" data-share>Copy result to share</button></div>';

  const pbs = MT.brokenRecords && MT.brokenRecords.length ? `<div class="paybox"><b>New personal best${MT.brokenRecords.length > 1 ? 's' : ''}</b><span>${MT.brokenRecords.join(' · ')}</span></div>` : '';

  const withPurse = extra => summary.replace('PBS', pbs).replace('PURSE', purseHtml + (extra || '') + shareBtn);

  if (m.daily && typeof dailyEnd === 'function') { dailyEnd(m, won, withPurse); return; }

  if (m.season && seasonAfter(m, won, drawn, withPurse)) return;

  if (m.rival) { if (won && pay0) { pay(pay0.money); updateTitlePurse(); } const note = rivalAfter(m, won); msg('grudge match', won ? 'Rival beaten' : 'Rival wins', withPurse(note), [['Rematch', startGrudge], ['Title', toTitle, true]]); return; }

  if (m.run && !m.season && typeof runEnd === 'function') { runEnd(m, won, withPurse); return; }

  if (m.test && typeof onbAfterFight === 'function') { onbAfterFight(m, won, withPurse); return; }

  if (m.trial && typeof trialEnd === 'function') { trialEnd(m, won, withPurse); return; }

  if (m.throne && typeof throneEnd === 'function') { throneEnd(m, won, withPurse); return; }

  if (m.ladder != null) {

    if (won) { CAREER.ladder.rung = Math.max(CAREER.ladder.rung, m.ladder + 1); bump('ladderBeat'); saveCareer(); if (m.ladder === LADDER.length - 1) unlock('ladder'); }

    const next = m.ladder + 1 < LADDER.length && won;

    msg('duel ladder', won ? (m.ladder === LADDER.length - 1 ? 'Top of the ladder' : `Rung ${m.ladder + 1} cleared`) : 'Knocked off the ladder', withPurse(won && m.ladder === LADDER.length - 1 ? '<p>You beat the Rumble champion one on one. Nobody in central Alberta is left to fight.</p>' : ''),

      next ? [['Ladder', openLadder], ['Next rung', () => startLadder(m.ladder + 1), true]] : [['Ladder', openLadder, !won], ['Retry', () => startLadder(m.ladder), won ? false : true], ['Title', toTitle]]);

    return;

  }

  // red cards carry into the next match (REG 6.3.3)

  if (G.tourney) for (const f of G.fighters) if (f.team === 0) { G.tourney.reds[f.spec.num] = Math.max(0, (f.redMatches || 0) - 1); }

  if (!G.tourney) { msg('full time', won ? 'Won' : drawn ? 'Draw' : 'Lost', withPurse(), [['Rematch', () => quickFight(m.mode, m.opp, m.pro ? { pro: true } : undefined)], [G.hub ? 'Return to town' : 'Title', toTitle, true]]); return; }

  const T = G.tourney; T.results.push({ stage: m.stage, won, score: `${m.wins[0]}–${m.wins[1]}` });

  const bonus = won && T.stage === 0 ? 150 : won ? 400 : m.stage === 'Final' ? 100 : 0;

  if (bonus && pay0) { pay(bonus); pay0.money += bonus; pay0.lines.push(`Rumble ${won && T.stage === 1 ? 'title' : won ? 'semi-final' : 'runner-up'} ${fmtMoney(bonus)}`); purseHtml = `<div class="paybox"><b class="num">+${fmtMoney(pay0.money)}</b><span>${pay0.lines.join(' · ')}</span><span class="muted">Purse ${fmtMoney(CAREER.purse)}. Spend it in Your fighter.</span></div>`; updateTitlePurse(); }

  if (won && T.stage === 0) {

    T.stage = 1; saveTourney();

    msg('semi-final', 'Through to the final', withPurse('<p>Next: a 75-second repair window, then the Technical Marshal checks your kit before the final (REG 5.1.2).</p>'), [['To the repair bench', () => openRepair(75, () => { teamRepairs(); kitCheck(); }), true]]);

  } else if (won) {

    store.del('tourney'); CAREER.stats.rumbleWins++; saveCareer(); unlock('champ'); if (m.category === 'youth') sticker('trophy'); if (!T.playerCards) unlock('clean');

    msg('red deer rumble', 'Champions', withPurse(`<p>Second-hand harness, a garage forge and a bag of hockey tape. ${CLUBS.reavers.name} win the Red Deer Rumble.</p>`), [['Title', toTitle, true]]);

  } else {

    store.del('tourney');

    msg('red deer rumble', m.stage === 'Final' ? 'Runners-up' : 'Out in the semi', withPurse('<p>Tape it up and come back next summer.</p>'), [['Try again', startTourney, true], ['Title', toTitle]]);

  }

}



function kitCheck() {

  const T = G.tourney, p = G.player || G.fighters.find(f => f.spec.player); const kit = T.kits[4];

  const rows = []; let illegal = [];

  const w = loadoutWeapon();

  for (const k of ['helmet', 'armL', 'armR', 'legs'].concat(w.haft ? ['haft'] : [])) {

    const pc = kit[k]; const nm = k === 'haft' ? `${w.name} haft wrap` : PIECE_NAMES[k];

    if (!pc.tape) { rows.push(`<tr><td>${nm}</td><td>original strap</td><td>pass</td></tr>`); continue; }

    const t = TAPES[pc.tape];

    if (!t.legal) { illegal.push(nm); rows.push(`<tr><td>${nm}</td><td>${t.name}</td><td><b>modern material (BR 2.1.5)</b></td></tr>`); }

    else if (k === 'haft' && t.haft === 'warn') rows.push(`<tr><td>${nm}</td><td>${t.name}</td><td>noted: looks off on a haft</td></tr>`);

    else rows.push(`<tr><td>${nm}</td><td>${t.name}</td><td>pass</td></tr>`);

  }

  rows.push(`<tr><td>Weapon</td><td>${w.name}, ${w.mass} kg, ${Math.round(w.len * 100)} cm</td><td>${w.cls} (${w.spec}): pass</td></tr>`);

  let verdict;

  if (illegal.length) { T.green['reavers-4'] = true; verdict = `<p><span class="card" style="background:var(--card-green)"></span><b>Green card.</b> ${illegal.join(', ')} taped with modern material. A green card follows you between tournaments (TS 2), and a later yellow becomes a red (REG 6.4).</p>`; }

  else verdict = '<p><b>Passed.</b> Neutral cloth tape only. The Technical Marshal nods at your black hockey tape and slaps an inspection sticker on your weapon. No sticker, no fighting.</p>';

  T.sticker = true;

  saveTourney();

  msg('kit check', 'Technical Marshal', `<p class="muted">Higher-tier rounds check authenticity before the list (REG 5.1.2).</p><div class="sheet"><div class="src">Kit check · Reavers 4</div><div class="tblwrap"><table><thead><tr><th>Piece</th><th>Repair</th><th>Result</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></div>${verdict}`,

    [['Into the final', () => { setupMatch({ mode: 5, opp: STAGES[1].opp, stage: STAGES[1].name, venue: 'hall' }); toTactics(); }, true]]);

}



function newTourney() { return { stage: 0, kits: {}, tapeLog: [], green: {}, reds: {}, results: [] }; }

function startTourney() {

  G.attract = false; G.tourney = newTourney(); REP.log = [];

  G.tourney.kits[4] = careerKit(playerSpec(CLUBS.reavers.roster[0]));

  saveTourney();

  const s = STAGES[0]; setupMatch({ mode: 5, opp: s.opp, stage: s.name }); toTactics();

}

function continueTourney() {

  const t = store.get('tourney', null) || (window.__hotData && window.__hotData.tourney); if (!t) return startTourney();

  G.attract = false; G.tourney = t; const s = STAGES[t.stage] || STAGES[0];

  setupMatch({ mode: 5, opp: s.opp, stage: s.name, venue: s.name === 'Final' ? 'hall' : undefined }); toTactics();

}

function saveTourney() { if (G.tourney) store.set('tourney', G.tourney); }

function quickFight(mode, opp, extra) {

  G.attract = false; G.tourney = null; REP.log = []; endTraining();

  const names = { 1: 'Exhibition duel', 2: 'Exhibition pairs', 3: 'Triples', 5: 'Exhibition', 12: 'Massacre', 21: 'Battle of the Rumble' };

  const qm = {}; for (const k of (G.quickMods || [])) qm[k] = true;

  setupMatch({ mod: qm, mode, opp: opp || pick(['wardens', 'rabble']), stage: extra && extra.pro ? 'Profight' : names[mode] || 'Exhibition', venue: G.quickVenue || W3.venue || 'arena', weather: G.quickWeather, ...(extra || {}) }); toTactics();

}

// ---- quick fight menu ----

const PARTY_MODS = [['bigheads', 'Big heads', 'Everyone wears a giant helmet'], ['turbo', 'Turbo', 'The whole fight runs 30% faster'], ['glass', 'Glass armour', 'Straps and buckles fail three times as fast'], ['bouncy', 'Bouncy falls', 'Fallen fighters bounce'], ['headhunter', 'Headhunter', 'Duels: only helmet hits score']];

const MODES = [

  { mode: 1, name: 'Duel', sub: '1 v 1', desc: 'Same weapon category as you. Points by where you hit: head 3, body 2, limbs 1.' },

  { mode: 1, pro: true, name: 'Profight', sub: '1 v 1 open', desc: 'Armoured MMA. Any weapon against any weapon, grappling counts.' },

  { mode: 2, name: 'Pairs', sub: '2 v 2', desc: 'You and a partner. Work the 2-on-1.' },

  { mode: 3, name: 'Triples', sub: '3 v 3', desc: 'Small-team buhurt. Every takedown swings it.' },

  { mode: 5, name: 'Team', sub: '5 v 5', desc: 'The classic format. Outnumber them 3 to 1.' },

  { mode: 12, name: 'Massacre', sub: '12 v 12', desc: 'Two full clubs on one list. Chaos. (Heavier on older phones.)' },

  { mode: 21, name: 'Battle', sub: '21 v 21', desc: 'A Battle of the Nations-sized clash. Best on a computer.' },

  { mode: 'ffa', name: 'Free-for-all', sub: 'melee', desc: 'You and five others, everyone against everyone. Last one standing.' },

];

function openModes() {

  G.backTo = 'title'; const box = $('#modeCards'); box.innerHTML = '';

  for (const M of MODES) box.append(h('button', { class: 'mode', onclick: () => { AU.init(); AU.click(); M.mode === 'ffa' ? startFFA(6, 0) : quickFight(M.mode, G.quickOpp === 'random' ? null : G.quickOpp, M.pro ? { pro: true } : null); } }, h('span', { class: 'big num', html: M.pro ? 'PRO' : M.mode === 'ffa' ? 'FFA' : `${M.mode}<i>v</i>${M.mode}` }), h('b', null, M.name), h('span', null, M.desc)));

  const vs = $('#venueSeg'); vs.innerHTML = ''; G.quickVenue = G.quickVenue || W3.venue || 'arena';

  for (const V of Object.values(VENUES)) { if (V.practice) continue; vs.append(h('button', { 'aria-pressed': String(G.quickVenue === V.key), title: V.sub, onclick: () => { G.quickVenue = V.key; setVenue(V.key); setWeather('clear'); openModes(); AU.click(); } }, V.name)); }

  const ms = $('#modSeg'); if (ms) { ms.innerHTML = ''; G.quickMods = G.quickMods || store.get('quickMods', []);

    for (const [k, t, d] of PARTY_MODS) ms.append(h('button', { 'aria-pressed': String(G.quickMods.includes(k)), title: d, onclick: () => { G.quickMods = G.quickMods.includes(k) ? G.quickMods.filter(x => x !== k) : G.quickMods.concat(k); store.set('quickMods', G.quickMods); openModes(); AU.click(); } }, t)); }

  const wx = $('#weatherSeg'); if (wx) { wx.innerHTML = ''; for (const [v, t] of [['clear', 'Clear'], ['rain', 'Rain'], ['snow', 'Snow'], ['random', 'Random']]) wx.append(h('button', { 'aria-pressed': String((G.quickWeather || 'clear') === v), onclick: () => { G.quickWeather = v; openModes(); AU.click(); } }, t)); }

  const seg = $('#oppSeg'); seg.innerHTML = '';

  for (const [v, t] of [['random', 'Random'], ['wardens', CLUBS.wardens.name], ['rabble', CLUBS.rabble.name]]) seg.append(h('button', { 'aria-pressed': String((G.quickOpp || 'random') === v), onclick: () => { G.quickOpp = v; openModes(); } }, t));

  box.append(h('button', { class: 'mode', onclick: () => { AU.click(); openKids(); } }, h('span', { class: 'big' }, '🎈'), h('b', null, 'Little Knights games'), h('span', null, 'Foam dummies, balloon pop and catch the pig, plus a sticker book.')));

  box.append(h('button', { class: 'mode', onclick: () => { AU.click(); openRival(); } }, h('span', { class: 'big num', html: 'VS' }), h('b', null, 'Grudge match'), h('span', null, `Your rival, ${rivalName(G.category)}, remembers how you beat them.`)));

  box.append(h('button', { class: 'mode', onclick: () => { AU.click(); openVersus(); } }, h('span', { class: 'big num', html: 'P1<i>v</i>P2' }), h('b', null, 'Local versus'), h('span', null, 'Two players on one screen: two controllers, or keyboard and a controller.')));

  box.append(h('button', { class: 'mode', onclick: () => { AU.click(); openOnline(); } }, h('span', { class: 'big num', html: 'NET' }), h('b', null, 'Online duel'), h('span', null, 'Fight a friend on another device with a four-letter code.')));

  showScreen('modes');

}

// ---- Duel Ladder: six 1v1s against tougher and tougher fighters ----

function openLadder() {

  G.backTo = 'title'; setHud(false); if (G.phase === 'over' || G.phase === 'between') { startAttract(); }

  const box = $('#ladderRungs'); box.innerHTML = ''; const cat = G.category; const top = CAREER.ladder.rung;

  LADDER.forEach((L, i) => {

    const W = typeof ladderWho === 'function' ? ladderWho(i, cat) : null, nm = W ? W.name : (L.festivalName || (L.festivalName = poolName({}))); const done = i < top, open = i <= top;

    const w = WEAPONS[L.weapon];

    box.append(h('li', null, h('button', { class: 'rung' + (done ? ' done' : '') + (i === top ? ' next' : ''), disabled: open ? null : true, onclick: () => { AU.init(); startLadder(i); } },

      h('span', { class: 'rn num' }, String(i + 1)),

      h('span', null, h('b', null, nm), h('span', { class: 'kit' }, `${L.champ ? 'Rumble champion, ' : ''}${W && CLUBS['ladder' + i].bos ? (ROSTER.teams.find(t => t.slug === CLUBS['ladder' + i].bos) || {}).name || 'Festival Company' : 'Festival Company'}. ${ARCH[L.arch].name}, ${w.name.toLowerCase()}${L.shield ? ' and ' + SHIELDS[L.shield].name.toLowerCase() : ''}, ${HELMS[L.helm].name.toLowerCase()}.`)),

      h('span', { class: 'stt' }, done ? 'Beaten' : open ? `Fight · ${fmtMoney(50 * (i + 1))}` : 'Locked'))));

  });

  $('#ladderProg').textContent = `${Math.min(top, LADDER.length)} of ${LADDER.length} beaten`;

  showScreen('ladder');

}

function startLadder(i) {

  G.attract = false; G.tourney = null; REP.log = []; endTraining();

  setupMatch({ mode: 1, opp: 'ladder' + i, stage: `Duel Ladder, rung ${i + 1}`, ladder: i }); toTactics();

}



function lExitDefault() { AU.click(); if (G.onbTrain) { G.onbTrain = false; endTraining(); openCreator(); return; } toTitle(); }

function dropPhoto() { if (!G.photo) return; try { stopReplay(); } catch (e) {} if (typeof PHOTO !== 'undefined') PHOTO.on = false; G.photo = false; $('#photo').hidden = true; $('#gl').style.filter = ''; $('#photoFrame').hidden = true; }

function refreshDaily() { dailyState(); dailyPlan(); }

function toTitle(opts) {

  persistPlayerKit();

  // Account gate must run even for old completed saves and callers using skipOnb/home.

  if (typeof onbAccountGate === 'function' && onbAccountGate()) return;

  if (typeof onbTitle === 'function' && !(opts && opts.skipOnb) && onbStage() !== 'done' && onbStage() !== 'tour') { G.bracket = null; G.paused = false; setHud(false); G.autopilot = false; G.autoflow = false; endTraining(); if (onbTitle()) { startupDone(); return; } }

  if (G.hub && !(opts && opts.home) && typeof enterTown === 'function') { enterTown(TOWN.returnTo); startupDone(); return; }

  G.bracket = null; VS.names = null; refreshDaily(); if (LOBBY.pending) setTimeout(showInvite, 400);

  G.paused = false; setHud(false); G.autopilot = false; G.autoflow = false; AU.music(true); endTraining(); updateTitlePurse();

  startAttract();

  showScreen('title');

  startupDone();

}

function startAttract() {

  G.attract = true; G.tourney = null;

  setupMatch({ mode: 5, opp: pick(['wardens', 'rabble']), stage: 'Exhibition', attract: true });

  startRound(); G.phase = 'fight'; AU.setCrowd(0.04);

}



function onlineCoop() { return !!(NET.on && G.match?.netSpec?.H?.length && new Set(G.match.netSpec.H.map(h => h.t)).size === 1); }

function onlinePauseRequest(on) { NET.pauseRequested = !!on; if (!onlineCoop()) G.paused = false; }

function togglePause(force) {

  if (NET.on) {

    const open = force === undefined ? G.screen !== 'pause' : !!force;

    onlinePauseRequest(open); resetTransientInput();

    if (open) { showScreen('pause'); $('#touch').hidden = true; } else { hideAll(); refreshTouchUI(); }

    return;

  }

  if (G.phase !== 'fight' && G.phase !== 'prefight' && !G.paused) return;

  G.paused = force !== undefined ? force : !G.paused;

  if (G.paused) { showScreen('pause'); refreshTouchUI(); $('#touch').hidden = true; if (window.speechSynthesis) speechSynthesis.cancel(); COMM_AUDIO.stop(); }

  else { hideAll(); refreshTouchUI(); }

}



function renderHow(kind) {

  kind = ['touch', 'kb', 'pad'].includes(kind) ? kind : 'kb'; G.helpKind = kind;

  $$('#howSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.how === kind)));

  const rows = {

    touch: [['Left thumb', 'Drag anywhere on the left to move. Push forward past the ring to run. With nobody locked on, pushing sideways turns you.'], ['Target lock', 'Your view follows the nearest opponent (yellow marker), so your right thumb is free for the buttons. Tap the right side of the screen to switch target; drag there to look around.'], ['1P / 3P', 'Top right: switch first and third person any time, even mid-fight.'], ['Swing pad', 'Hold to wind up, swipe to pick the arc (left, right, or up for overhead), let go to strike. Hold longer for a heavier blow.'], ['Trip', 'Back-heel. Works best on someone already stumbling, or from the side.'], ['Shove', 'Shield bash or haft push. Drives fighters into the rail.'], ['Grab', 'Clinch. In a clinch: swing pad = knee, trip = throw, grab = disarm.'], ['Guard / Brace', 'Hold. Drag on the guard button left, right or up to guard that side (a blow from the other side gets half through). Brace widens your base.'], ['Pair · Hold · Hunt · Peel', 'Squad calls for your teammates.']],

    kb: [['W A S D', 'Move. Shift to sprint.'], ['Mouse', 'Look and aim. Target lock picks up whoever you look at.'], ['Tab', 'Switch target'], ['V', 'First / third person'], ['C', 'Tackle'], ['Left button', 'Hold to wind up, drag to pick the arc, release to strike.'], ['Right button', 'Guard. Flick the mouse left, right or up while holding it to guard that side; a blow from the other side gets half through.'], ['Space', 'Brace'], ['E', 'Trip (in a clinch: throw)'], ['Q', 'Shove'], ['F', 'Grab (in a clinch: disarm)'], ['1 to 5', 'Pair on, Hold the line, Hunt, Peel, Free fight'], ['Hold Y', 'Yield by kneeling'], ['Esc', 'Pause'], ['Menus', 'Arrow keys to move, Enter to pick, Esc to go back']],

    pad: [['Left stick', 'Move. Push it all the way forward to run.'], ['Right stick', 'Look around and aim: up for the head, down for the legs. While RT is held it sets the swing arc.'], ['RT', 'Hold to wind up, release to strike. Hold longer for a heavier blow.'], ['LT', 'Guard. Push the right stick left, right or up while holding it to guard that side.'], ['A', 'Brace'], ['B', 'Trip (in a clinch: throw)'], ['X', 'Shove'], ['Y', 'Tackle'], ['RB', 'Grab (in a clinch: disarm). LB works too.'], ['R3', 'Switch target (L3 too)'], ['D-pad', 'Squad calls: up Pair, down Hold, left Hunt, right Peel'], ['View', 'Tap: first or third person. Hold: yield by kneeling'], ['Menu', 'Pause'], ['Menus', 'D-pad or stick to move, A to pick, B to go back, LB and RB to switch tabs, Menu to start']]

  }[kind];

  const GL = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'R3', 'L3', 'View'];

  $('#howGrid').innerHTML = rows.map(r => `${kind === 'pad' && GL.includes(r[0]) ? `<span><i class="gp" data-k="${r[0]}">${gpName(r[0])}</i></span>` : `<kbd>${r[0]}</kbd>`}<span>${r[1]}</span>`).join('') + '<span></span><span class="muted">There is no thrust button. Thrusting is prohibited (BR 4.2).</span>';

}



function launchActivity(id) {

  const routes = {

    btnRumble: () => { AU.init(); store.del('tourney'); startTourney(); },

    btnContinue: () => { AU.init(); continueTourney(); }, btnQuick: () => { AU.init(); openModes(); },

    btnLadder: () => { AU.init(); openLadder(); }, btnDaily: openDaily, btnRun: openRun,

    btnSeason: () => { AU.init(); openSeason(); }, btnInvite: () => { AU.click(); openInvite(); },

    btnTrain: () => { AU.init(); startTraining(); }, btnCareer: () => { AU.init(); openCareer(); }

  };

  if (routes[id]) routes[id]();

}

function initMenus() {

  // Semantic version is intentionally human readable; suffix identifies the exact PWA build.

  const titleVersion = $('#titleVersion');

  if (titleVersion) {

    const build = String(window.BUILD_VER || '').replace(/^steel-tape-(?:hosted-|hacsa-|debug-)?/, '');

    titleVersion.textContent = 'v0.1.0' + (/^[0-9a-f]{7,}$/i.test(build) ? ' · ' + build.slice(0, 7) : '');

  }

  const catTag = () => { const t = $('.tagline'); if (t) t.textContent = G.category === 'youth' ? 'Little knights. Foam swords. Very big helmets.' : 'Real steel. Real rules. Half of it held together with hockey tape.'; document.body.dataset.cat = G.category; };

  document.querySelectorAll('#catSeg button').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.cat === (G.category === 'youth' ? 'youth' : 'men'))); b.onclick = () => { G.category = b.dataset.cat; store.set('category', G.category); document.querySelectorAll('#catSeg button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); catTag(); if (G.category === 'youth') AU.boing(0.7); else AU.click(); }; });

  catTag();

  $('#nowPlaying').onclick = () => { AU.click(); openInvite(); }; setTimeout(initLobby, 1500); setTimeout(checkJoinLink, 0);

  refreshDaily();

  $('#lSkip').onclick = () => { AU.click(); setLesson(TR.i >= LESSONS.length - 1 ? 0 : TR.i + 1); };

  $('#lExit').onclick = lExitDefault;

  $('#btnCredits').onclick = () => { G.backTo = 'title'; msg('credits', 'Credits', CREDITS_HTML, [['Back', () => showScreen('title')]]); };

  $('#btnSettings').onclick = () => { G.backTo = 'title'; showScreen('settings'); };

  $$('[data-back]').forEach(b => b.onclick = () => showScreen(G.backTo || 'title'));

  $$('[data-leave]').forEach(b => b.onclick = () => { AU.click(); leaveScreen(); });

  $$('#howSeg button').forEach(b => b.onclick = () => renderHow(b.dataset.how));

  $$('#diffSeg button').forEach(b => b.onclick = () => { G.settings.difficulty = b.dataset.diff; $$('#diffSeg button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); saveSettings(); });

  { const el = $('#optFP'); el.checked = G.settings.view !== 'tp'; el.onchange = () => setView(el.checked ? 'fp' : 'tp'); }

  $('#viewBtn').onclick = e => { AU.init(); setView(G.settings.view === 'tp' ? 'fp' : 'tp'); e.currentTarget.blur(); };

  updateViewBtn();

  $$('[data-snd]').forEach(b => b.onclick = () => { AU.test(b.dataset.snd); $('#sndStat').textContent = AU.status(); });

  setInterval(() => { if (G.screen === 'settings') $('#sndStat').textContent = AU.status(); }, 400);

  for (const [id, key] of [['#optRing', 'ring'], ['#optVoice', 'voice'], ['#optShake', 'shake'], ['#optAssist', 'assist'], ['#optInvert', 'invert'], ['#optRumble', 'rumble'], ['#optLegend', 'legend'], ['#optCine', 'cine'], ['#optFlash', 'flash'], ['#optComm', 'comm'], ['#optCap', 'cap'], ['#optSpokenComm', 'spokenComm']]) { const el = $(id); el.checked = G.settings[key]; el.onchange = () => { G.settings[key] = el.checked; if (key === 'spokenComm' && !el.checked) COMM_AUDIO.stop(); VOICE.enabled = G.settings.voice; saveSettings(); }; }

  $$('#diffSeg button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.diff === G.settings.difficulty)));

  $('#btnReady').onclick = () => { AU.init(); AU.click(); beginFight(); };

  $('#btnRepairDone').onclick = () => { AU.click(); closeRepair(); };

  $('#btnSquire').onclick = () => { AU.click(); squirePatch(); };

  $('#btnRepairDone2').onclick = () => { AU.click(); closeRepair(); };

  $('#btnResume').onclick = () => togglePause(false);

  $('#btnYield').onclick = () => { togglePause(false); playerYield(); };

  $('#btnPauseHow').onclick = () => { G.backTo = 'pause'; renderHow(IN.mode); selectTab($('#howTabs'), 'controls'); showScreen('howto'); };

  $('#btnPauseLog').onclick = () => msg('gear bag', 'Tape Log', tapeLogHtml(G.tourney ? G.tourney.tapeLog : REP.log), [['Back', () => showScreen('pause'), true]]);

  { const fill = () => VOICE.fillPicker($('#voiceSel')); fill(); if (window.speechSynthesis) { try { speechSynthesis.addEventListener('voiceschanged', fill); } catch (e) { } } $('#voiceTest').onclick = () => { AU.click(); VOICE.test(); }; }

  $('#btnQuit').onclick = () => { if (window.speechSynthesis) speechSynthesis.cancel(); COMM_AUDIO.stop(); toTitle(); };

  $('#pauseBtn').onclick = () => togglePause();

  $('#btnPauseSettings').onclick = () => { G.backTo = 'pause'; showScreen('settings'); };

  $('#titleStats').onclick = () => { AU.init(); openCareer(); };

  // tab bars switch the panes inside their own panel

  $$('.tabs').forEach(bar => bar.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { selectTab(bar, b.dataset.tab); AU.click(); })));

  $$('#gfxSeg button').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.gfx === (G.settings.gfx || 'auto'))); b.onclick = () => { G.settings.gfx = b.dataset.gfx; $$('#gfxSeg button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); saveSettings(); GFX.autoPr = 0; applyGfx(true); }; });

  { const sl = $('#optShakeAmt'); sl.value = String(G.settings.shakeAmt == null ? 1 : G.settings.shakeAmt); sl.oninput = () => { G.settings.shakeAmt = +sl.value; saveSettings(); G.shake = 0.3 * +sl.value; }; }

  { const sl = $('#optSpeed'); sl.value = String(G.settings.speed || 1); sl.oninput = () => { G.settings.speed = +sl.value; saveSettings(); }; }

  const segSet = (id, attr, key, after) => $$(id + ' button').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset[attr] === String(G.settings[key]))); b.onclick = () => { G.settings[key] = b.dataset[attr]; $$(id + ' button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); saveSettings(); if (after) after(); AU.click(); }; });

  segSet('#teleSeg', 'tele', 'tele'); segSet('#textSeg', 'ts', 'ts', applyTextSize); applyTextSize();

  $('#btnFull').onclick = () => goFullscreen(true);

  document.addEventListener('fullscreenchange', syncFullscreenControl);

  document.addEventListener('webkitfullscreenchange', syncFullscreenControl);

  syncFullscreenControl();

  { const sl = $('#optAssistStrength'), out = $('#assistPercent');

    sl.value = String(Math.round(G.settings.assistStrength * 100)); out.textContent = sl.value + '%';

    sl.oninput = () => { G.settings.assistStrength = +sl.value / 100; out.textContent = sl.value + '%'; if (!aimStrength()) IN.lock = null; saveSettings(); };

  }

  $('#btnPadSetup').onclick = () => { AU.click(); openPadSetup(); };

  $('#btnBos').onclick = () => { AU.click(); const back = () => showScreen('settings'); if (BOS.info) msg('buhurtos', 'BuhurtOS account', '<div id="bosBox" class="bosbox"></div>', [['Back', back, true]]), renderBosBox(); else openBosSignIn(back); };

  bosBoot(); setTimeout(() => { if (typeof rosterLoad === 'function') rosterLoad(); }, 1500); setTimeout(() => { if (typeof eventSession === 'function') eventSession(); }, 4000);

  { const segL = () => $$('#lettersSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === (G.settings.padLetters || 'auto')))); segL(); $$('#lettersSeg button').forEach(b => b.onclick = () => { G.settings.padLetters = b.dataset.l; saveSettings(); segL(); NIN.on = null; checkNintendo(); AU.click(); }); }

  $('#btnPausePad').onclick = () => { AU.click(); openPadSetup(() => showScreen('pause')); };

  $('#btnPauseFeedback').onclick = () => { AU.click(); openFeedback(() => showScreen('pause')); };

  { const sl = $('#optSens'); sl.value = String(G.settings.sens || 1); sl.oninput = () => { G.settings.sens = +sl.value; saveSettings(); }; }

  $('#muteBtn').onclick = () => { AU.init(); AU.setMuted(!AU.muted); $('#muteWave').style.display = AU.muted ? 'none' : ''; store.set('muted', AU.muted); };

}

function migrateAimStrength(saved) {

  if (typeof saved.assistStrength === 'number' && Number.isFinite(saved.assistStrength)) return clamp(saved.assistStrength, 0, 1);

  if (Object.prototype.hasOwnProperty.call(saved, 'assist')) return saved.assist === false ? 0 : 1;

  return 0.5;

}

function saveSettings() { store.set('settings3', G.settings); }

function selectTab(bar, tab) {

  bar.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.tab === tab)));

  const panel = bar.closest('.panel'); panel.querySelectorAll('.tabpane').forEach(p => p.hidden = p.dataset.pane !== tab);

  const body = panel.querySelector('.pbody'); if (body) { body.scrollTop = 0; body.scrollLeft = 0; }

  if (bar.id === 'careerTabs') { G.careerTab = tab; renderCareer(); }

}



// ---------- kit picker: helm changes how you see, weapon changes how you fight ----------

function weaponBars(w) {

  const m = w.mass * (w.hands === 2 ? 0.82 : 1); const wind = 0.12 + 0.055 * m;

  const speed = clamp(1 - (wind - 0.16) / 0.16, 0.08, 1), reach = clamp((0.6 + w.len * 0.92 - 1.0) / 1.45, 0.08, 1);

  const tip = 11.5 * (0.82 + 0.22 * w.len) / Math.pow(w.mass, 0.3); const impact = clamp((Math.sqrt(w.mass * tip) - 3.3) / 2.6, 0.08, 1);

  return [['Speed', speed], ['Reach', reach], ['Impact', impact]];

}

function bars(list) { return `<div class="bars">${list.map(([k, v]) => `<span>${k}</span><i style="--v:${Math.round(v * 100)}%"></i>`).join('')}</div>`; }

function applyLoadout() {

  store.set('loadout', G.loadout);

  const f = G.player; if (!f) return;

  const ns = playerSpec(f.spec); Object.assign(f.spec, ns); f.shield = f.spec.shield ? SHIELDS[f.spec.shield] : null;

  f.body = makeBody(G.match.category, f.spec.arch, 'player', G.loadout);

  resetFighterForRound(f);

  matchDuelOpponent(); // your opponent switches to the same weapon category

}

function renderKitPicker() {

  const p = G.player; if (!p) return;

  const L = G.loadout;

  const hc = $('#helmCards'); hc.innerHTML = '';

  if (CUTE.on) { // youth kit: one soft helmet for everyone

    const H = FOAM_HELM, b = h('button', { class: 'kcard', 'aria-pressed': 'true' });

    b.append(visorPreview('foam'), h('b', null, H.name), h('span', { class: 'st', html: bars([['View', (H.fov - 40) / 40], ['Protect', (H.prot - 0.7) / 0.55], ['Breath', (H.breath - 0.6) / 0.6]]) }), h('span', { class: 'st' }, `${H.weight} kg · Youth kit: everyone wears the squishy open-face one. Ears optional, giggles guaranteed.`));

    hc.append(b);

  }

  else for (const k of HELM_ORDER) {

    const H = HELMS[k];

    const b = h('button', { class: 'kcard', 'aria-pressed': String(L.helm === k), onclick: () => { L.helm = k; applyLoadout(); renderKitPicker(); AU.click(); } });

    b.append(visorPreview(k), h('b', null, H.name), h('span', { class: 'st', html: bars([['View', (H.fov - 40) / 40], ['Protect', (H.prot - 0.7) / 0.55], ['Breath', (H.breath - 0.6) / 0.6]]) }), h('span', { class: 'st' }, `${H.weight} kg · ${H.note}`));

    hc.append(b);

  }

  // weapon set: the Buhurt-legal historical weapons, or the fantasy rack (quick fights only)

  const fantasyOk = !G.strict; if (!fantasyOk) L.wset = 'hist';

  const set = ['fantasy', 'special'].includes(L.wset) ? L.wset : 'hist';

  const LISTS = { hist: PICK_WEAPONS, fantasy: FANTASY_WEAPONS, special: SPECIAL_WEAPONS };

  const ws = $('#wsetSeg'); ws.innerHTML = '';

  for (const [v, t] of [['hist', 'Historical'], ['fantasy', 'Fantasy'], ['special', 'Special']]) ws.append(h('button', { 'aria-pressed': String(set === v), disabled: v !== 'hist' && !fantasyOk ? true : null, onclick: () => { L.wset = v; const list = LISTS[v]; if (!list.includes(L.weapon)) L.weapon = list[0]; applyLoadout(); renderKitPicker(); AU.click(); } }, t));

  $('#wsetNote').textContent = !fantasyOk ? 'Fantasy and Special weapons are for quick fights and training. This event’s kit check would bounce them.' : set === 'fantasy' ? 'Not Buhurt legal. Just for fun in quick fights; the bots stay historical.' : set === 'special' ? 'Original game-style weapons, each with a trick. Quick fights and training only.' : 'Every weapon here meets the Buhurt International weapon rules.';

  const wc = $('#weapCards'); wc.innerHTML = '';

  const cur = loadoutWeapon().key;

  for (const k of LISTS[set]) {

    const w = WEAPONS[k];

    const b = h('button', { class: 'kcard', 'aria-pressed': String(cur === k), onclick: () => { L.weapon = k; applyLoadout(); renderKitPicker(); AU.click(); } });

    let icon = null; try { icon = weaponIcon(k); } catch (e) { }

    if (icon) { icon.className = 'wicon'; b.append(icon); }

    b.append(h('b', null, w.name), h('span', { class: 'st' }, `${w.cls} · ${w.mass} kg · ${Math.round(w.len * 100)} cm${w.hands === 2 ? ' · two hands' : ''}`), h('span', { class: 'st', html: bars(weaponBars(w)) }), h('span', { class: 'st' }, w.feel));

    wc.append(b);

  }

  const seg = (id, opts, key, disabled) => { const el = $(id); el.innerHTML = ''; for (const [v, t] of opts) el.append(h('button', { 'aria-pressed': String(L[key] === v), disabled: disabled ? true : null, onclick: () => { L[key] = v; applyLoadout(); renderKitPicker(); AU.click(); } }, t)); };

  const twoH = loadoutWeapon().hands === 2;

  seg('#shieldSeg', twoH ? [['none', 'Two hands on the weapon']] : [['heater', 'Heater'], ['buckler', 'Buckler'], ['none', 'None']], twoH ? '_' : 'shield', false);

  const C = CATEGORIES[G.match.category];

  seg('#heightSeg', [['short', `Short ${(C.h[0] + 0.06).toFixed(2)} m`], ['avg', `Average ${((C.h[0] + C.h[1]) / 2).toFixed(2)} m`], ['tall', `Tall ${(C.h[1] - 0.03).toFixed(2)} m`]], 'height');

  seg('#buildSeg', [['light', 'Light, quicker'], ['medium', 'Medium'], ['heavy', 'Heavy, steadier']], 'build');

  renderLineup();

}



const CREDITS_HTML = `<p>Created and developed by <b>Garrett Robson</b> · with assistance from AI.</p><p><b>Keston Piche</b> · OG Knight &amp; Head Bug Tester — first through the gate, occasionally through the floor.</p><p>Thanks to these free assets:</p>

<div class="taplog">

<div><span>Crowd cheering and ambience by Gregor Quendel (gregorquendel.com), modified (trimmed)</span><span class="muted">CC BY 4.0</span></div>

<div><span>Medieval weapon impacts and swings by Ben Jaszczak and Brian Nelson (Still North Media)</span><span class="muted">CC0</span></div>

<div><span>Male grunts and yells by HaelDB</span><span class="muted">CC0</span></div>

<div><span>Metal footsteps on concrete by Thimras</span><span class="muted">CC0</span></div>

<div><span>Duct tape tear by AlaskaRobotics (freesound.org)</span><span class="muted">CC0</span></div>

<div><span>Music: Medieval: Battle by RandomMind</span><span class="muted">CC0</span></div>

<div><span>Impact, RPG, interface and fighter voice-over sounds by Kenney (kenney.nl)</span><span class="muted">CC0</span></div>

<div><span>Town props: Fantasy Town Kit, Nature Kit and Graveyard Kit by Kenney (kenney.nl)</span><span class="muted">CC0</span></div>

<div><span>Watchtower, barn, well, sheds, trees and props: Slavic World Free by Maciej EmacArt (emaceart.dev)</span><span class="muted">EmacEArt license</span></div>

<div><span>Timbered houses and blacksmith, camp and market props: PolygonSight medieval pack</span><span class="muted">supplied by the game’s owner</span></div>

<div><span>Heater shield (repainted) and the Fantasy weapon set from the Medieval Weapons Pack by Quaternius (quaternius.com)</span><span class="muted">CC0</span></div>

<div><span>Cottages, wagon, crates and fences from the Medieval Village MegaKit by Quaternius</span><span class="muted">CC0</span></div>

<div><span>Hit flashes, dust clouds and star bursts from Brackeys' VFX Bundle (Picster, Kenney, Thomas Iché, CodeManu)</span><span class="muted">CC0</span></div>

<div><span>Sword clashes by StarNinjas (OpenGameArt)</span><span class="muted">CC0</span></div>

<div><span>Gong, claps (VCSL) and timpani (VSCO 2 CE) by Sam Gossner and contributors</span><span class="muted">CC0</span></div>

<div><span>Wind by felix.blume, birds by kvgarlic (freesound.org); crickets by Lisa Redfern and fireplace by ezwa (soundbible.com), via Blanket</span><span class="muted">CC0 / public domain</span></div>

<div><span>Female announcer from the Kenney Voiceover Pack</span><span class="muted">CC0</span></div>

<div><span>Fight commentary generated with <a href="https://github.com/OHF-Voice/piper1-gpl" target="_blank" rel="noopener">Piper</a> and the <a href="https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/libritts/high/MODEL_CARD" target="_blank" rel="noopener">LibriTTS voice</a></span><span class="muted"><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0 dataset</a></span></div>

<div><span>Marshal and squire animations: Universal Animation Library by Quaternius</span><span class="muted">CC0</span></div>

<div><span>Townsfolk costumes: Modular Character Outfits - Fantasy by Quaternius</span><span class="muted">CC0</span></div>

<div><span>Cosmetic weapon skins: 3D Orc Weapons Pack and 3D Fantasy Weapons Pack 2 (polyy.ai)</span><span class="muted">CC0</span></div>

<div><span>Gathering spots and tools: Kenney, Avramania nature and Slavic World pieces</span><span class="muted">CC0 / EmacEArt</span></div>

<div><span>The realm: Fantasy Props MegaKit, Ultimate RPG Items, Nature Crops, Farm Buildings, Posed Background Characters and Ultimate Animated Animals (horses, cows, alpaca) by Quaternius</span><span class="muted">CC0</span></div>

<div><span>The Old Woods: Forest Nature Pack by KayKit (Kay Lousberg)</span><span class="muted">CC0</span></div>

<div><span>Docks, crates and pulleys: Retro Medieval Kit by Kenney</span><span class="muted">CC0</span></div>

<div><span>Riding, chopping, harvesting and court animations: Universal Animation Library 2 by Quaternius</span><span class="muted">CC0</span></div>

<div><span>Real teams and fighters: BuhurtOS (display names and team colours only; fighters who opted out are left out)</span><span class="muted">with thanks</span></div>

<div><span>GLTFLoader and SkeletonUtils from three.js</span><span class="muted">MIT</span></div>

</div>

<p class="muted">CC BY 4.0: creativecommons.org/licenses/by/4.0. Rules cited from Buhurt International documents.</p>`;
