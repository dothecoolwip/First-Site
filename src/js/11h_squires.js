// Team companions are support characters, never entries in the HACSA fighter roster.
const SQUIRE_SPOTS = [
  { x: -6, z: -128, hint: 'beside the castle gate' },
  { x: 33, z: 29, hint: 'near the tavern campfire' },
  { x: -38, z: 32, hint: 'beside the armourer’s yard' },
  { x: 48, z: 60, hint: 'near the club camp' },
  { x: 60, z: 16, hint: 'beside the training stalls' }
];
const SQUIRE_STAGES = ['Not started', 'Find your squire', 'A meal and a plan', 'Somewhere to sleep', 'Ready for the corner', 'Learning the trade', 'Earn their trust', 'Recruited'];
const COMPANION = { group: null, model: null, stall: null, team: null, route: [], routeT: 0, stuck: 0 };
function squireBook() {
  const B = CAREER.squires || (CAREER.squires = {});
  B.version = 1; B.teams = B.teams || {}; B.stock = B.stock || { meals: 0, straps: 0, fittings: 0, hafts: 0 };
  for (const k of ['meals', 'straps', 'fittings', 'hafts']) B.stock[k] = Math.max(0, Math.floor(Number(B.stock[k]) || 0));
  return B;
}
function squireTeam(club) {
  const slug = club ? club.bos || (club.key === 'reavers' ? CAREER.club.bos : null) : CAREER.club.bos;
  // The built-in Reavers slot can be rebranded; only its actual identity gets Halfling.
  return slug ? 'bos:' + slug : club && club.key !== 'reavers' ? club.key : CAREER.teamPicked ? 'festival' : 'reavers';
}
function isReaversSquire(key) { return key === 'reavers' || /^bos:(?:red-deer-)?reavers$/.test(key) || key === 'bos:red-deer-reavers'; }
function teamSquire(key = squireTeam()) {
  if (isReaversSquire(key)) key = 'reavers';
  const B = squireBook(); if (B.teams[key]) return B.teams[key];
  const r = seeded('squire:' + key), first = ['Finn', 'Owen', 'Robin', 'Milo', 'Toby', 'Eli', 'Rowan', 'Jamie', 'Jasper', 'Kit', 'Ash', 'Theo'];
  const last = ['Copper', 'Brook', 'Reed', 'Alder', 'Moss', 'Thistle', 'Bramble', 'Flint', 'Vale', 'Sparrow', 'Pike', 'Birch'];
  const real = isReaversSquire(key); let name = real ? 'halfling' : first[Math.floor(r() * first.length)] + ' ' + last[Math.floor(r() * last.length)];
  // Resolve generated-name collisions once, then preserve the identity in the save.
  if (!real) { let attempts = 0; while (Object.values(B.teams).some(s => s.name === name)) { name = first[Math.floor(r() * first.length)] + ' ' + last[Math.floor(r() * last.length)] + (attempts++ > 100 ? '-' + last[Math.floor(r() * last.length)] : ''); } }
  const S = B.teams[key] = { key, name, spot: real ? 0 : 1 + Math.floor(r() * (SQUIRE_SPOTS.length - 1)), stage: 0, recruited: false, departed: false,
    food: 3, rest: 3, clothes: 20, neglect: 0, lodging: null, outfit: {}, training: {}, trial: false, command: 'follow', autoFeed: false, autoRest: false, budget: 0, colour: null,
    skin: ['#d2a67e','#a97453','#8f614a'][Math.floor(r()*3)], height: real ? 1.55 : 1.6 + r()*0.18, personality: real ? 'cheerful' : ['eager','practical','wry'][Math.floor(r()*3)] };
  saveCareer(); return S;
}
function squireActive(key = squireTeam()) { const S = teamSquire(key); return S.recruited && !S.departed; }
function squireGoodCare() { const S = teamSquire(); return squireActive() && S.food > 0 && S.rest > 0 && S.clothes > 0; }
function squireSearchSpot(S) {
  const p = SQUIRE_SPOTS[S.spot];
  if (S.spot === 0) { const gate = TOWN.gates?.find(g => g.key === 'bailey'); if (gate) return { x: gate.x - 6, z: gate.z + 14 }; }
  return { x: p.x, z: p.z };
}
function squireStage(S, stage) { if (S.stage !== stage) return false; S.stage++; saveCareer(); return true; }
function squireBuy(kind, n = 1) {
  const prices = { meals: 10, straps: 25, fittings: 20, hafts: 40 };
  if (!prices[kind] || !spend(prices[kind] * n, 'Squire supplies')) return false;
  squireBook().stock[kind] += n; saveCareer(); return true;
}
function squireFeed(S) {
  const B = squireBook(); if (!B.stock.meals && !squireBuy('meals')) return false;
  B.stock.meals--; S.food = 3; saveCareer(); return true;
}
function squireRest(S, lodging) {
  if (lodging === 'home' && !shopState().home) return false;
  if (lodging === 'inn' && !spend(20, 'Squire inn lodging')) return false;
  if (!['home', 'inn'].includes(lodging)) return false;
  S.lodging = lodging; S.rest = 3; saveCareer(); return true;
}
function squireOutfit(S, slot) {
  if (S.outfit[slot]) return true;
  if (!spend(25, 'Squire ' + slot)) return false;
  S.outfit[slot] = true; S.clothes = 20; saveCareer(); return true;
}
function squireMatchComplete(m) {
  if (!m || m.squireCounted || !careerMatch(m) || !G.player) return;
  m.squireCounted = true; for (const p of Object.values(G.player.kit)) p.cleaned = false; persistPlayerKit();
  const S = teamSquire(m.squireTeam || squireTeam());
  if (S.stage === 6 && Number(m.mode) > 1 && !m.ffa) S.trial = true;
  if (S.recruited && !S.departed) {
    S.food = Math.max(0, S.food - 1); S.rest = Math.max(0, S.rest - 1); S.clothes = Math.max(0, S.clothes - 1);
    if (S.food && S.rest && S.clothes) S.neglect = 0;
    else { if (S.neglect >= 3) { S.departed = true; S.command = 'wait'; } else S.neglect++;
      toastMenu(S.departed ? `${S.name} has gone back to ${SQUIRE_SPOTS[S.spot].hint}. Speak with him to make things right.` : `${S.name} needs ${!S.food ? 'food' : !S.rest ? 'rest' : 'his clothes mended'}. ${4 - S.neglect} match(es) before he leaves.`); }
  }
  saveCareer();
}
function squireReconcile(S) {
  if (!S.recruited || !S.departed || S.food <= 0 || S.rest <= 0 || S.clothes <= 0 || !S.lodging) return false;
  S.departed = false; S.neglect = 0; S.command = 'follow'; saveCareer(); return true;
}
function squireAutomate(S) {
  if (!S.recruited || S.departed) return;
  const B = squireBook();
  if (S.autoFeed && S.food <= 0) {
    if (B.stock.meals > 0) squireFeed(S);
    else if (S.budget >= 10 && CAREER.purse >= 10 && squireFeed(S)) S.budget -= 10;
  }
  if (S.autoRest && S.rest <= 0 && S.lodging) {
    if (S.lodging === 'home') squireRest(S, 'home');
    else if (S.budget >= 20 && CAREER.purse >= 20 && squireRest(S, 'inn')) S.budget -= 20;
  }
  if (S.food && S.rest && S.clothes) S.neglect = 0;
  saveCareer();
}
function openSquireQuest() {
  const S = teamSquire();
  townPanel('Find your squire · Ada the Corner Guide', box => {
    box.append(h('p', null, 'A squire watches your corner, carries two shared reserve weapons each round, and helps with repairs. Until you finish recruitment, nobody hands you a replacement weapon. A weapon lying flat cannot be picked up. Use a legal backup you already carry, or keep helping your team with grappling.'));
    box.append(h('p', null, `Your team’s squire is ${S.name}. Look ${SQUIRE_SPOTS[S.spot].hint} for an eager spectator in worn clothes.`));
    box.append(h('p', { class: 'muted' }, 'Current objective: ' + SQUIRE_STAGES[S.stage]));
    box.append(h('button', { class: 'btn primary', onclick: () => { squireStage(S, 0); openSquireQuest(); } }, S.stage ? 'Quest accepted' : 'Find your squire'));
    if (S.stage) box.append(h('button', { class: 'btn', onclick: () => { closeVendor(); const p = S.searchAt || squireSearchSpot(S); setWaypoint(p.x + (S.stage === 1 ? 5 : 0), p.z, S.stage > 1 ? S.name : 'Squire search area'); } }, S.stage > 1 ? 'Route to your squire' : 'Show search area'));
  });
}
function openSquire() {
  const S = teamSquire();
  townPanel(S.name + ' · ' + (S.departed ? 'Let’s make things right' : SQUIRE_STAGES[S.stage]), box => {
    const action = (label, fn, disabled) => box.append(h('button', { class: 'btn', disabled: !!disabled, onclick: () => { fn(); if (G.screen === 'townShop' && $('#townShopHead h2')?.textContent?.startsWith(S.name)) openSquire(); squireBuildTown(); } }, label));
    const greetings = { eager: '“I watched every round! Let me learn to keep your corner ready.”', practical: '“Check the straps, count the reserves, keep a steady head. That’s a good corner.”', wry: '“A spare weapon and a sound strap. Less glamorous than winning, until you need them!”' };
    box.append(h('p', null, isReaversSquire(S.key) ? '“Did you see that fight? I love what the Reavers do! Let me help your corner.”' : greetings[S.personality] || greetings.eager));
    if (!S.stage) { action('Ask Ada at the main entrance', () => { closeVendor(); townWalkTo('squire-guide'); }); return; }
    if (S.stage === 1) action('Meet your squire', () => { squireStage(S, 1); });
    else if (S.stage === 2) { box.append(h('p', null, 'Share a meal and make a plan at Bram’s tavern.')); action('Route to tavern', () => { closeVendor(); townWalkTo('tavern'); }); }
    else if (S.stage === 3) { box.append(h('p', null, 'Arrange a bed at the inn or your home.')); action('Visit tavern', () => { closeVendor(); townWalkTo('tavern'); }); action('Visit your home', () => { closeVendor(); townWalkTo('house'); }); }
    else if (S.stage === 4) { box.append(h('p', null, 'Buy clothes and shoes from the wardrobe, and a tool belt from the quartermaster.')); action('Visit wardrobe', () => { closeVendor(); townWalkTo('wardrobe'); }); action('Visit quartermaster', () => { closeVendor(); townWalkTo('quarter'); }); }
    else if (S.stage === 5) { box.append(h('p', null, `Training: strap ${S.training.strap ? '✓' : 'needed'}, wrap ${S.training.wrap ? '✓' : 'needed'}, handoff ${S.training.handoff ? '✓' : 'needed'}. Practise at the armourer’s bench.`)); action('Visit armourer', () => { closeVendor(); townWalkTo('armour'); }); }
    else if (S.stage === 6) { box.append(h('p', null, 'Finish a career team match without corner support, then return. Victory is not required.')); action('Hire your squire', () => { if (S.trial) { S.recruited = true; squireStage(S, 6); S.command = 'follow'; } }, !S.trial); }
    else {
      box.append(h('p', null, `Food: ${S.food}/3 · Rest: ${S.rest}/3 · Clothes: ${S.clothes}/20 · ${S.lodging || 'No lodging'} · ${S.neglect ? 'Needs attention' : 'Happy and ready'}`));
      action('Feed · stored meal or 10 coins', () => squireFeed(S));
      action('Rest at inn · 20 coins', () => squireRest(S, 'inn'));
      action('Rest at home · free', () => squireRest(S, 'home'), !shopState().home);
      action('Mend clothes · 25 coins', () => { if (spend(25, 'Squire clothing')) { S.clothes = 20; saveCareer(); } });
      const palette = h('select', { 'aria-label': 'Squire clothing colour', onchange: e => { S.colour = e.target.value; saveCareer(); squireBuildTown(); } });
      for (const [i,c] of TABARDS.entries()) palette.append(h('option', { value: c, selected: (S.colour || CAREER.club.tabard) === c }, ['Burgundy','Blue','Forest green','Purple','Brown','Black','Teal','Ochre','Grey','Red'][i] || 'Custom colour')); box.append(palette);
      if (S.departed) action('Apologize and invite him back', () => squireReconcile(S), !(S.food && S.rest && S.clothes && S.lodging));
      else {
        for (const [label, command] of [['Follow me', 'follow'], ['Wait here', 'wait'], ['Return to lodging', 'home']]) action(label, () => { S.command = command; if (command === 'wait' && COMPANION.group) S.waitAt = { x: COMPANION.group.position.x, z: COMPANION.group.position.z }; saveCareer(); });
        action('Equipment and servicing', () => openWorkshop());
      }
      for (const [label, key] of [['Feed automatically', 'autoFeed'], ['Rest automatically on returning to town', 'autoRest']]) {
        box.append(h('label', null, h('input', { type: 'checkbox', checked: S[key], onchange: e => { S[key] = e.target.checked; saveCareer(); } }), label));
      }
      box.append(h('label', null, 'Remaining upkeep budget ', h('input', { type: 'number', min: 0, max: 10000, value: S.budget, onchange: e => { S.budget = clamp(Math.floor(Number(e.target.value) || 0), 0, 10000); saveCareer(); } })));
    }
    saveCareer();
  });
}
function squireVendorRows(key, box) {
  const S = teamSquire(), row = (text, fn) => box.append(h('button', { class: 'btn', onclick: () => { fn(); if (TOWN.vendor === key) openVendor(key); } }, text));
  if (key === 'tavern') {
    if (S.stage === 2) row('Share a meal with ' + S.name + ' · 10 coins', () => { if (squireFeed(S)) squireStage(S, 2); });
    if (S.stage === 3 || S.recruited) row('Arrange squire lodging · 20 coins', () => { if (squireRest(S, 'inn')) squireStage(S, 3); });
    row('Store a squire meal · 10 coins', () => squireBuy('meals'));
  }
  if (S.stage === 4) {
    for (const slot of key === 'wardrobe' ? ['clothes', 'shoes'] : key === 'quarter' ? ['tool belt'] : []) row(`${S.outfit[slot] ? '✓ ' : ''}Squire ${slot} · 25 coins`, () => { squireOutfit(S, slot); if (S.outfit.clothes && S.outfit.shoes && S.outfit['tool belt']) squireStage(S, 4); });
  }
  if (key === 'armour') row('Open repair workshop', () => openWorkshop());
  if (key === 'quarter' || key === 'smith' || key === 'armour') for (const [kind, price] of [['straps', 25], ['fittings', 20], ['hafts', 40]]) row(`Spare ${kind} · ${squireBook().stock[kind]} stored · ${price} coins`, () => squireBuy(kind));
}
function squireBuildTown() {
  if (!TOWN.on || !TOWN.root) return;
  const existing = COMPANION.group?.parent === TOWN.root ? { x: COMPANION.group.position.x, z: COMPANION.group.position.z, team: COMPANION.team } : null;
  if (COMPANION.group) TOWN.root.remove(COMPANION.group);
  TOWN.stalls = TOWN.stalls.filter(s => !s.squireNPC);
  const S = teamSquire(); squireAutomate(S); const p = squireSearchSpot(S);
  const start = S.recruited && !S.departed ? existing?.team === S.key ? existing : S.command === 'home' ? (S.lodging === 'home' ? { x: HOME_AT[0], z: HOME_AT[1] - 6 } : { x: 33, z: 29 }) : S.command === 'wait' && S.waitAt ? S.waitAt : { x: TOWN.pos.x - 2, z: TOWN.pos.z - 2 } : p;
  const free = navFree(start.x, start.z) || { x: freeNear(start.x, start.z)[0], z: freeNear(start.x, start.z)[1] }; if (!free || navBlocked(free.x, free.z, 0.32)) { COMPANION.group = null; return; }
  if (!S.recruited || S.departed) { S.searchAt = { x: free.x, z: free.z }; saveCareer(); }
  const clothed = S.outfit.clothes || S.recruited, tint = clothed ? S.colour || CAREER.club.tabard : '#91836b';
  const model = costumeOr({ main: tint, joints: '#443c32', h: S.height || 1.55, anim: 'Idle_Talking_Loop' }, { outfit: 'Male_Peasant', tex: 'peasant', tint, skin: S.skin || '#d2a67e' });
  const group = new THREE.Group(); group.add(model.root); group.position.set(free.x, gy(free.x, free.z), free.z); TOWN.root.add(group);
  if (S.outfit['tool belt']) { const belt = mk(group, geo('squire_belt', () => new THREE.TorusGeometry(0.18, 0.025, 5, 12)), tmat('#50321c'), 0, 0.82, 0); belt.rotation.x = Math.PI / 2; mk(group, geo('squire_pouch', () => new THREE.BoxGeometry(0.12, 0.16, 0.08)), tmat('#8d643a'), 0.19, 0.75, 0); }
  const label = townLabel(S.name, S.recruited ? 'Your squire' : 'Eager spectator', '#f2c40f'); label.position.y = 2.2; group.add(label);
  const stall = { V: { key: 'personal-squire', name: S.name, role: 'Squire', icon: '🧰' }, x: free.x, z: free.z, ax: free.x + 1, az: free.z + 1, ry: 0, g: group, npc: model, label, open: openSquire, station: true, squireNPC: true };
  TOWN.stalls.push(stall); Object.assign(COMPANION, { group, model, stall, team: S.key, route: [], routeSearch: null, routeT: 0, stuck: 0 });
}
function squireTownTick(dt) {
  const C = COMPANION, S = teamSquire(); if (!C.group || !TOWN.on) return;
  if (C.team !== S.key) { squireBuildTown(); return; }
  const P = C.group.position;
  if (navBlocked(P.x, P.z, 0.32)) { const free = navFree(P.x, P.z); if (free) { P.set(free.x, gy(free.x, free.z), free.z); C.route = []; C.routeSearch = null; C.routeT = 0; } }
  Object.assign(C.stall, { x: P.x, z: P.z, ax: P.x + 1, az: P.z + 1, ry: C.group.rotation.y });
  C.group.visible = Math.hypot(P.x - TOWN.pos.x, P.z - TOWN.pos.z) < (IS_TOUCH ? 50 : 70);
  if (C.model.ual && C.group.visible) C.model.mixer.update(dt);
  if (!S.recruited || S.departed) return;
  if (!['follow', 'home'].includes(S.command) || G.screen || TOWN.spec || GATHER.on || TOWN.mineOn) return;
  const home = S.lodging === 'home' ? { x: HOME_AT[0], z: HOME_AT[1] - 6 } : { x: 33, z: 29 };
  const tx = S.command === 'home' ? home.x : TOWN.pos.x - Math.sin(TOWN.face) * 2, tz = S.command === 'home' ? home.z : TOWN.pos.z - Math.cos(TOWN.face) * 2;
  const d = Math.hypot(P.x - tx, P.z - tz); const anim = d < 1 ? 'Idle_Talking_Loop' : 'Walking_A_Loop';
  if (C.model.ual && C.anim !== anim) { C.model.play(UAL.clips[anim] ? anim : 'Idle_Loop', 0.2); C.anim = anim; }
  if (d < 1) return;
  if (S.command === 'follow' && d > 65 && !navBlocked(TOWN.pos.x, TOWN.pos.z, 0.4)) { const f = navFree(tx, tz); if (f) { P.set(f.x, gy(f.x, f.z), f.z); C.route = []; } }
  C.routeT -= dt;
  if (C.routeT <= 0 && !C.routeSearch) { const free = navFree(tx, tz); if (free) C.routeSearch = folkRouteSteps(P.x, P.z, free.x, free.z); C.routeT = 2; }
  // Shared civilian search yields every 128 visits: one bounded chunk per frame.
  if (C.routeSearch) { const step = C.routeSearch.next(); if (step.done) { C.route = step.value || []; C.routeSearch = null; } else return; }
  let target = C.route[0]; if (target && Math.hypot(P.x - target[0], P.z - target[1]) < 0.8) { C.route.shift(); target = C.route[0]; }
  const goal = target || [tx, tz], N = { x: P.x, z: P.z, hx: Math.sin(C.group.rotation.y), hz: Math.cos(C.group.rotation.y), sideX: 0, sideZ: 0 };
  const dir = navSteer(N, goal[0], goal[1]), step = Math.min(3.4 * dt, 0.18);
  const nx = P.x + dir[0] * step, nz = P.z + dir[1] * step;
  if (!navBlocked(nx, nz, 0.32) && castleWalkable(P.x, P.z, nx, nz, 0.32)) { P.set(nx, gy(nx, nz), nz); C.group.rotation.y = Math.atan2(dir[0], dir[1]); C.stuck = 0; }
  else { C.stuck += dt; if (C.stuck > 2) { C.routeT = 0; C.stuck = 0; } }
  Object.assign(C.stall, { x: P.x, z: P.z, ax: P.x + 1, az: P.z + 1, ry: C.group.rotation.y });
}
function reserveAllowed(f) {
  if (!humanFighter(f)) return true;
  return f.isPlayer && !(G.match && (G.match.online || G.match.versus)) ? squireActive(G.match?.squireTeam || squireTeam()) : f.squireRecruited === true;
}
function refreshPlayerCorner() {
  if (!G.player) return;
  const t = G.player.team, crew = G.crew.find(o => o.userData?.squire === t), active = G.match?.online ? G.player.squireRecruited === true : squireActive(G.match?.squireTeam);
  if (!active) { if (crew) { W3.matchRoot.remove(crew); G.crew = G.crew.filter(o => o !== crew); } return; }
  let root = crew;
  if (!root) { const s = UAL.ready ? ualSquire(G.player.club) : buildSupportModel(G.player.club), zn = W3.zones[t]; root = s.root; root.position.set(zn.x + Math.sign(zn.x) * 1.9, 0, zn.z); root.userData = { squire: t, J: s.ual ? s : null }; W3.matchRoot.add(root); G.crew.push(root); }
  for (const child of [...root.children]) if (child.userData?.cornerLabel) root.remove(child);
  const S = teamSquire(G.match?.online ? squireTeam() : G.match?.squireTeam), label = townLabel(S.name, 'Your corner squire', '#f2c40f'); label.userData.cornerLabel = true; label.position.y = 2.4; root.add(label); root.userData.name = S.name;
}
function reserveWeapons() { return Object.keys(WEAPONS).filter(k => !WEAPONS[k].fantasy && !SPECIAL_WEAPONS.includes(k) && k !== 'custom'); }
function prepareReserveWeapons() {
  G.reserveKeys = [[], []]; G.reserves = [2, 2]; G.reserveMeshes = [[], []];
  for (const t of [0, 1]) {
    for (const w of G.reserveAll[t] || []) { W3.matchRoot.remove(w); G.crew = G.crew.filter(o => o !== w); }
    G.reserveAll[t] = [];
    const club = G.fighters.find(f => f.team === t)?.club; if (!club) continue;
    const keys = reserveWeapons(), zn = W3.zones[t], sx = Math.sign(zn.x);
    for (let i = 0; i < 2; i++) { const key = pick(keys), w = buildWeapon(key, club); G.reserveKeys[t].push(key); w.position.set(zn.x + sx * 0.95, 0.62, zn.z - 0.6 + i * 1.1); W3.matchRoot.add(w); G.crew.push(w); G.reserveAll[t].push(w); }
    G.reserveMeshes[t] = G.reserveAll[t].slice();
  }
}
function syncReserveRack(keys, counts) {
  for (const t of [0, 1]) {
    if (!Array.isArray(keys[t]) || keys[t].length !== 2 || keys[t].some(k => !reserveWeapons().includes(k))) continue;
    const club = G.fighters.find(f => f.team === t)?.club; if (!club) continue;
    if (JSON.stringify(G.reserveKeys?.[t]) !== JSON.stringify(keys[t])) {
      for (const w of G.reserveAll[t] || []) { W3.matchRoot.remove(w); G.crew = G.crew.filter(o => o !== w); }
      G.reserveAll[t] = []; const zn = W3.zones[t], sx = Math.sign(zn.x);
      for (let i = 0; i < 2; i++) { const w = buildWeapon(keys[t][i], club); w.position.set(zn.x + sx * 0.95, 0.62, zn.z - 0.6 + i * 1.1); W3.matchRoot.add(w); G.crew.push(w); G.reserveAll[t].push(w); }
    }
    G.reserveKeys[t] = keys[t].slice(); G.reserves[t] = clamp(Math.floor(Number(counts[t]) || 0), 0, 2);
    G.reserveAll[t].forEach((w, i) => { w.visible = i >= 2 - G.reserves[t]; });
    G.reserveMeshes[t] = G.reserveAll[t].filter(w => w.visible);
  }
}
function handReserve(f) {
  const t = sideOf(f); if (!reserveAllowed(f) || !G.reserves[t]) return false;
  const index = 2 - G.reserves[t], key = G.reserveKeys?.[t]?.[index]; if (!WEAPONS[key]) return false;
  G.reserves[t]--; f.weapon = humanFighter(f) ? profileWeapon(key, combatProfile(f)) : WEAPONS[key];
  f.shield = f.weapon.hands === 2 || G.mod?.noshield ? null : SHIELDS[f.spec.shield] || null;
  setWeaponModel(f); setShieldModel(f); recalcBody(f);
  const mesh = G.reserveMeshes[t].shift(); if (mesh) mesh.visible = false;
  const name = f.isPlayer ? teamSquire(G.match?.squireTeam).name : teamSquire(squireTeam(f.club)).name;
  feed(`${name} hands ${label(f)} a ${f.weapon.name.toLowerCase()}. No picking!`, 'BR 3.6.2', teamColor(f)); return true;
}
