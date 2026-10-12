// ===================================================================
// First time in: a 5 v 5 test fight with nothing but the button hints, then "want some help learning?", then the
// character creator, then a skippable tour of the realm when you walk in. Anyone who played before the creator existed
// gets the creator (and the tour) the next time they open the game.
// ===================================================================
const ONB = { tour: null, awaitingAuth: false };
function onbStage() { return CAREER.onboard || (CAREER.stats.matches > 0 ? 'create' : 'fight'); }
function onbSet(st) { CAREER.onboard = st; saveCareer(); }
// Production game policy: no guest play beyond the first instructional fight.
// Tests that run from file: explicitly opt in to their isolated mock accounts.
function onbAccountRequired() {
  // Never allow a hosted game URL parameter to bypass sign-in.
  if (location.protocol === 'file:' && window.__steeltapeTest && !window.__onboard) return false;
  return onbStage() !== 'fight';
}
function onbAccountGate(forceAccount) {
  // Direct entry to the town requires a linked account even if the tutorial is unfinished.
  if (location.protocol === 'file:' && window.__steeltapeTest && !window.__onboard) return false;
  if (!forceAccount && !onbAccountRequired()) return false;
  // Offline is the one exception: keep playing from the device save, even
  // if sign-in or the cloud cannot be reached. Require sign-in on reconnect.
  if (typeof cloudIsOffline === 'function' && cloudIsOffline()) return false;
  if (BOS.user) {
    if (location.protocol === 'file:' && window.__steeltapeTest) return false;
    if (typeof CLOUD !== 'undefined' && !CLOUD.ready && !CLOUD.offline) {
      ONB.awaitingAuth = true;
      if (!CLOUD.loading && !CLOUD.holding) cloudOnAuth(BOS.user.id, true);
      if (!CLOUD.holding && !(G.screen === 'msgScr' && $('#msgPanel')?.textContent.includes('Cloud save'))) {
        msg('link save', 'Connecting your game save', '<p>Checking your saved character and inventory before you continue. Your local progress is still on this device.</p>', []);
      }
      return true;
    }
    return false;
  }
  ONB.awaitingAuth = true;
  // This backup is local and temporary. A cloud save is only linked after verified login.
  if (typeof cloudPrepareGuestLink === 'function') cloudPrepareGuestLink();
  if (!(G.screen === 'msgScr' && $('#bosEmail'))) creatorSignIn();
  return true;
}
function onbResumeAfterAuth() {
  if (!ONB.awaitingAuth || (!BOS.user && !(typeof cloudIsOffline === 'function' && cloudIsOffline()))) return;
  if (typeof CLOUD !== 'undefined' && !CLOUD.ready && !CLOUD.offline && !(location.protocol === 'file:' && window.__steeltapeTest)) return;
  ONB.awaitingAuth = false;
  toTitle();
}
// called when the title would show: steer first-timers into the flow instead
function onbTitle() {
  const st = onbStage();
  if (onbAccountGate()) return true;
  if (st === 'done' || G.autoflow || location.hash === '#autotest' || G.noOnboard) return false;
  if (st === 'fight') { onbTestFight(); return true; }
  if (st === 'help') { onbHelp(); return true; }
  if (st === 'create') { openCreator(); return true; }
  return false; // 'tour' happens in town
}
// ---- the test fight: a 5 v 5, no instructions, the buttons shown once
function onbTestFight() {
  G.attract = false; G.tourney = null; REP.log = []; endTraining(); G.hub = false;
  setupMatch({ mode: 5, opp: 'wardens', stage: 'Your first fight', venue: 'field', test: true });
  startRound(); G.phase = 'tactics'; setHud(false);
  msg('welcome', 'Your first fight', `<p>Five a side. You're number ${CAREER.num}, in the ${CLUBS.reavers.name}. Down is out; the side with more standing at the end takes the round.</p><p>No lessons: here's what the buttons do, then in you go.</p><div class="ctrlgrid onbgrid" id="onbGrid"></div>`,
    [['Fight', () => { beginFight(); onbHints(); }, true]]);
  onbFillGrid($('#onbGrid'));
}
function onbKind() { return IN.mode === 'pad' ? 'pad' : IN.mode === 'touch' ? 'touch' : 'kb'; }
function onbFillGrid(el) {
  if (!el) return; const was = $('#howGrid').innerHTML; renderHow(onbKind()); el.innerHTML = $('#howGrid').innerHTML; $('#howGrid').innerHTML = was;
}
// a button card in the corner for the first fight; ? brings it back
function onbHints() {
  let el = $('#onbHints'); if (!el) { el = h('div', { id: 'onbHints', class: 'onbhints' }); document.body.append(el); }
  el.innerHTML = ''; const grid = h('div', { class: 'ctrlgrid' }); onbFillGrid(grid);
  el.append(h('div', { class: 'onbh' }, h('b', null, 'The buttons'), h('button', { class: 'btn tape small', onclick: () => { el.hidden = true; } }, 'Got it')), grid); el.hidden = false;
  setTimeout(() => { if (el) el.hidden = true; }, 14000);
}
// after the test fight (from matchEnd)
function onbAfterFight(m, won, withPurse) {
  onbSet('help'); { const el = $('#onbHints'); if (el) el.hidden = true; }
  if (typeof cloudPrepareGuestLink === 'function' && !BOS.user) cloudPrepareGuestLink();
  msg('your first fight', won ? 'You won it' : 'Lost that one',
    withPurse(`<p>${won ? 'Not bad at all for a first go.' : 'Everyone loses their first. The steel is heavy and the lungs are small.'}</p><p>Your progress is saved on this device. Online play beyond the tutorial requires BuhurtOS sign-in. If you're offline, you can keep playing and connect when you're back online.</p>`),
    [[(typeof cloudIsOffline === 'function' && cloudIsOffline()) ? 'Continue offline' : 'Sign in to continue', () => { if (!onbAccountGate()) onbHelp(); }, true]]);
}
function onbHelp() {
  if (onbAccountGate()) return;
  msg('welcome back', 'Help learning?', '<p>Want some help learning the moves before the festival?</p>', [['Teach me', () => { onbSet('create'); G.onbTrain = true; startTraining(); }, true], ['I’ve got it', () => { onbSet('create'); openCreator(); }]]);
}
// ---- the character creator: sign in with BuhurtOS, join your real team (or say you're not on one), make your fighter
function openCreator() {
  if (onbAccountGate()) return;
  G.backTo = 'title'; skillsState();
  if (typeof rosterLoad === 'function') rosterLoad();
  if (!BOS.user) { creatorSignIn(); return; }
  if (!CAREER.teamPicked) { creatorTeam(); return; }
  creatorFighter();
}
function creatorSignIn() {
  ONB.awaitingAuth = true;
  msg('your fighter', 'Sign in with BuhurtOS', `<p>Everyone in the realm plays as themselves: your BuhurtOS account names your fighter and puts you on your real team. Your existing progress is kept on this device until you connect your account. Already registered? Sign in to link this character. New players can create an account using <b>Email me a code</b>, <b>Google</b> or <b>Discord</b>.</p>
    <label class="runcode"><span>Email</span><input id="bosEmail" type="email" autocomplete="email" placeholder="you@example.com"></label>
    <label class="runcode"><span>Password</span><input id="bosPass" type="password" autocomplete="current-password"></label>
    <div class="bosalt"><button class="btn tape small" id="bosCode">Email me a code (new or existing)</button><button class="btn tape small" id="bosGoogle">Google</button><button class="btn tape small" id="bosDiscord">Discord</button></div>
    <p class="muted small" id="bosMsg"></p>`,
    [['Sign in', () => bosPassword(openCreator), true], ['Play under my own banner', () => { creatorJoin(null, null); creatorFighter(); }]]);
  const say = t => { const m = $('#bosMsg'); if (m) m.textContent = t; };
  $('#bosCode').onclick = async () => {
    const email = ($('#bosEmail').value || '').trim(); if (!email) { say('Type your email first.'); return; }
    say('Sending…');
    try { const { error } = await (await bosClient()).auth.signInWithOtp({ email, options: { shouldCreateUser: true } }); if (error) throw error; BOS.otpEmail = email; openBosCode(openCreator); } catch (e) { say('Couldn’t send a code: ' + (e.message || e)); }
  };
  const oauth = provider => async () => { say('Opening ' + provider + '…'); try { await (await bosClient()).auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } }); } catch (e) { say('Couldn’t open ' + provider + ': ' + (e.message || e)); } };
  $('#bosGoogle').onclick = oauth('google'); $('#bosDiscord').onclick = oauth('discord');
}
// the team: your own if BuhurtOS knows you as a fighter, else pick one, or say you're not on a team
function creatorTeam() {
  const I = BOS.info || {}, mine = I.fighter && typeof ROSTER !== 'undefined' && ROSTER.fighters.find(f => f.id === I.fighter);
  const teams = (typeof ROSTER !== 'undefined' && ROSTER.teams) || [];
  const box = $('#creatorBody'); box.innerHTML = ''; $('#creatorTitle').textContent = 'Your team';
  const choose = (slug, name) => { creatorJoin(slug, name); if (G.creatorReturn) { const r = G.creatorReturn; G.creatorReturn = null; r(); } else creatorFighter(); };
  if (mine && mine.team) {
    const T = teams.find(t => t.slug === mine.team), tn = T ? T.name : I.team;
    box.append(h('p', null, 'BuhurtOS knows you: ', h('b', null, I.name), ' of ', h('b', null, tn), '.'),
      h('div', { class: 'ups shop' }, h('div', { class: 'up' }, h('div', null, h('div', { class: 'uph' }, h('b', null, tn), h('span', { class: 'tier' }, 'Your team')), h('div', { class: 'muted' }, 'You fight in your team’s colours, and your real team-mates fill the roster.')), h('button', { class: 'btn primary flagtape small', onclick: () => { AU.click(); choose(mine.team, tn); } }, 'Join'))));
  } else {
    box.append(h('p', { class: 'muted small' }, I.fighter ? 'Your BuhurtOS fighter isn’t on a team yet. Pick the team you fight with, or carry on as a festival-goer.' : 'Pick the team you fight with. Not a fighter on a team? That’s fine: carry on as a festival-goer with your own colours.'));
    const list = h('div', { class: 'ups shop' }); box.append(list);
    if (!teams.length) list.append(h('p', { class: 'muted small' }, 'Fetching the teams from BuhurtOS… if nothing appears, check you’re online and try again.'));
    for (const T of teams.slice().sort((a, b) => a.name.localeCompare(b.name))) {
      const n = (typeof ROSTER !== 'undefined' ? ROSTER.fighters : []).filter(f => f.team === T.slug).length, [tab, trim] = teamColours(T);
      list.append(h('div', { class: 'up' }, h('div', { class: 'teamrow' }, h('span', { class: 'teamdot', style: `--a:${tab};--b:${trim}` }, T.initial), h('div', null, h('b', null, T.name), h('div', { class: 'muted small' }, `${n} fighter${n === 1 ? '' : 's'} on BuhurtOS`))), h('button', { class: 'btn tape small', onclick: () => { AU.click(); choose(T.slug, T.name); } }, 'Join')));
    }
    list.append(h('div', { class: 'up' }, h('div', null, h('div', { class: 'uph' }, h('b', null, 'Not on a team'), h('span', { class: 'tier' }, 'Festival-goer')), h('div', { class: 'muted' }, 'Fight under your own banner. You can join a team later in Your fighter → Profile.')), h('button', { class: 'btn tape small', onclick: () => { AU.click(); choose(null, null); } }, 'Carry on')));
  }
  $('#creatorDone').hidden = true; $('#creatorBack').hidden = true;
  showScreen('creator');
}
function creatorJoin(slug, name) {
  const P = CAREER.club;
  if (slug) { const T = (ROSTER.teams || []).find(t => t.slug === slug), [tab, trim] = T ? teamColours(T) : [P.tabard, P.trim]; P.name = (name || slug).replace(/^The /, '').slice(0, 22); P.short = ((T && T.initial) || P.name.slice(0, 1)).toUpperCase() + P.name.replace(/[^A-Za-z]/g, '').slice(1, 3).toUpperCase(); P.tabard = tab; P.trim = trim; P.bos = slug; }
  else { P.bos = null; if (!P.name || P.name === 'Reavers') P.name = 'Festival Company'; }
  CAREER.teamPicked = true; saveCareer(); applyProfile();
}
function creatorFighter() {
  const P = CAREER.club, L = lookState(), lo = G.loadout, I = BOS.info || {};
  if (I.name && (CAREER.name === 'You' || !CAREER.name)) CAREER.name = String(I.name).slice(0, 16);
  const box = $('#creatorBody'); box.innerHTML = ''; $('#creatorTitle').textContent = 'Make your fighter';
  const field = (label, input) => h('label', { class: 'fld' }, h('span', { class: 'label' }, label), input);
  const nameIn = h('input', { type: 'text', maxlength: '16', value: CAREER.name === 'You' ? '' : CAREER.name, placeholder: 'Your fighter’s name', autocomplete: 'off' });
  nameIn.oninput = () => { CAREER.name = nameIn.value.trim() || 'You'; saveCareer(); prev(); };
  const numIn = h('input', { type: 'number', min: '1', max: '99', value: String(CAREER.num), inputmode: 'numeric' });
  numIn.oninput = () => { const v = clamp(parseInt(numIn.value || '4', 10) || 4, 1, 99); CAREER.num = v; saveCareer(); applyProfile(); prev(); };
  const seg = (opts, get, set) => { const s = h('div', { class: 'seg small' }); for (const [v, t] of opts) s.append(h('button', { 'aria-pressed': String(get() === v), onclick: () => { set(v); AU.click(); s.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.textContent === t))); prev(); } }, t)); return s; };
  const sw = (list, get, set) => { const row = h('div', { class: 'swatches' }); for (const c of list) row.append(h('button', { class: 'sw', style: `--c:${c}`, 'aria-pressed': String(get() === c), 'aria-label': c, onclick: () => { set(c); AU.click(); row.querySelectorAll('.sw').forEach(b => b.setAttribute('aria-pressed', String(b.style.getPropertyValue('--c') === c))); prev(); } })); return row; };
  const pv = h('div', { class: 'crpv' }), prev = () => { pv.innerHTML = ''; PORTRAITS.none = null; const c = outfitThumb('none'); c.className = 'crportrait'; pv.append(c, shieldPreview(P, 72), h('b', null, `${CAREER.name === 'You' ? 'Your fighter' : CAREER.name} · #${CAREER.num}`), h('span', { class: 'muted' }, P.name)); };
  const own = !P.bos, clubIn = h('input', { type: 'text', maxlength: '22', value: P.name, placeholder: 'Your banner’s name', autocomplete: 'off' });
  clubIn.oninput = () => { P.name = clubIn.value.trim() || 'Festival Company'; P.short = P.name.slice(0, 3).toUpperCase(); saveCareer(); applyProfile(); prev(); };
  const left = h('div', { class: 'stack' },
    h('div', { class: 'row fields' }, field('Name', nameIn), field('Number', numIn)),
    h('span', { class: 'label' }, 'Division'), seg([['men', 'Adult'], ['youth', 'Kids']], () => G.category === 'youth' ? 'youth' : 'men', v => { G.category = v; store.set('category', v); }),
    h('span', { class: 'label' }, 'Height'), seg([['short', 'Short'], ['avg', 'Average'], ['tall', 'Tall']], () => lo.height, v => { lo.height = v; store.set('loadout', lo); }),
    h('span', { class: 'label' }, 'Build'), seg([['light', 'Light'], ['medium', 'Medium'], ['heavy', 'Heavy']], () => lo.build, v => { lo.build = v; store.set('loadout', lo); }),
    h('span', { class: 'label' }, 'Skin'), sw(SKIN_TONES, () => L.skin || SKIN_TONES[2], c => { L.skin = c; saveCareer(); }));
  if (own) left.append(h('div', { class: 'row fields' }, field('Your banner', clubIn)), h('span', { class: 'label' }, 'Colour'), sw(TABARDS, () => P.tabard, c => { P.tabard = c; saveCareer(); applyProfile(); }), h('span', { class: 'label' }, 'Trim'), sw(TRIMS, () => P.trim, c => { P.trim = c; saveCareer(); applyProfile(); }));
  else left.append(h('p', { class: 'muted small' }, `You fight in ${P.name}’s colours.`));
  left.append(h('span', { class: 'label' }, 'Charge'), seg(CHARGES, () => P.charge, v => { P.charge = v; saveCareer(); applyProfile(); }),
    h('p', { class: 'muted small' }, 'Armour, weapons, outfits and everything else are bought or made in the realm. All of this can be changed later in Your fighter → Profile.'));
  box.append(h('div', { class: 'profgrid' }, left, pv));
  prev();
  $('#creatorDone').hidden = false; $('#creatorBack').hidden = false;
  $('#creatorBack').onclick = () => { AU.click(); CAREER.teamPicked = false; saveCareer(); creatorTeam(); };
  $('#creatorDone').onclick = () => { AU.click(); if (onbAccountGate()) return; onbSet('tour'); showScreen(null); G.hub = true; enterTown(); };
  showScreen('creator');
}
// ---- the tour: a skippable fly-over of the realm with captions, the first time you walk in
const TOUR_STOPS = [
  { at: [0, 42, 120], look: [0, 0, 0], t: 6, cap: ['The Buhurt Festival', 'A real-life medieval festival. Everyone here is a person in costume: vendors, fighters, townsfolk. Walk up to anyone with a name over their head and press the prompt to talk.'] },
  { at: [34, 10, 40], look: [0, 3, 0], t: 6, cap: ['The Dome', 'The list. There’s always a fight on. Press Watch at any arena to sit in the stands, or talk to Marshal Brenna by the gate to fight yourself.'] },
  { at: [-20, 14, 40], look: [-38, 2, 16], t: 6, cap: ['The vendors', 'Smith, armourer, quartermaster, wizard, tavern, wardrobe, artificer: better gear, boosts and looks, for gold or made with your own hands.'] },
  { at: [-60, 40, 0], look: [-200, 0, -80], t: 6, cap: ['The realm', 'Six districts: the Old Woods west, Millbrook Village south-west, Mirror Lake east, the castle north. Roads and signposts link them. Nothing teleports: walk, or hire a horse at the stables.'] },
  { at: [0, 70, -60], look: [0, 10, -200], t: 7, cap: ['The castle', 'Two gates. Level 15 and a duel with Sergeant Brask open the Outer Bailey; level 40 and the King’s Guard open the King’s Court. The King and Queen sit in the Great Hall.'] },
  { at: [8, 6, 52], look: [0, 1.5, 44], t: 6, cap: ['Getting about', 'Map (top right) to set a waypoint: gold markers lead you there, Walk there walks you. Minimap bottom left. 🎒 is your bag. Your fighter is in the pause menu.'] }
];
function tourStart() {
  if (!TOWN.on || ONB.tour) return;
  ONB.tour = { i: 0, t: 0, el: null }; TOWN.busy = true; TOWN.tour = true; $('#townHud').hidden = true;
  const S = W3.scene, cam = W3.camera; ONB.view = { near: S.fog && S.fog.near, far: S.fog && S.fog.far, cf: cam.far }; if (S.fog) { S.fog.near = 260; S.fog.far = 700; } cam.far = 1200; cam.updateProjectionMatrix();
  const el = h('div', { class: 'tour', id: 'tour' }, h('div', { class: 'tourcap' }, h('small'), h('b'), h('p')), h('button', { class: 'btn tape small', onclick: e => { e.stopPropagation(); tourEnd(); } }, 'Skip'));
  document.body.append(el); ONB.tour.el = el; tourCap();
}
function tourCap() { const T = ONB.tour, S = TOUR_STOPS[T.i], el = T.el; el.querySelector('small').textContent = `${T.i + 1} / ${TOUR_STOPS.length}`; el.querySelector('b').textContent = S.cap[0]; el.querySelector('p').textContent = S.cap[1]; }
function tourTick(dt) {
  const T = ONB.tour; if (!T) return false;
  const S = TOUR_STOPS[T.i], N = TOUR_STOPS[T.i + 1]; T.t += dt;
  const k = Math.min(1, T.t / S.t), e = k * k * (3 - 2 * k), cam = W3.camera;
  const to = N || S, p = [0, 1, 2].map(i => S.at[i] + (to.at[i] - S.at[i]) * (N ? e * 0.35 : 0)), l = [0, 1, 2].map(i => S.look[i] + (to.look[i] - S.look[i]) * (N ? e * 0.35 : 0));
  cam.position.set(p[0], p[1], p[2]); cam.lookAt(l[0], l[1], l[2]);
  if (TOWN.cells) for (const C of TOWN.cells) C.g.visible = true;
  if (k >= 1) { T.i++; T.t = 0; if (T.i >= TOUR_STOPS.length) { tourEnd(); return false; } tourCap(); }
  return true;
}
function tourEnd() { const T = ONB.tour; if (!T) return; if (T.el) T.el.remove(); ONB.tour = null; TOWN.busy = false; TOWN.tour = false; TOWN.cam = null; onbSet('done'); $('#townHud').hidden = false;
  if (ONB.view) { const S = W3.scene, cam = W3.camera; if (S.fog && ONB.view.near != null) { S.fog.near = ONB.view.near; S.fog.far = ONB.view.far; } cam.far = ONB.view.cf; cam.updateProjectionMatrix(); ONB.view = null; } toastMenu('Welcome to the festival. Marshal Brenna by the gate starts your fights.'); }
