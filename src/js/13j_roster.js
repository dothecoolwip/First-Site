// ===================================================================
// BuhurtOS rosters: real teams and fighters (display names and team colours only, from the public steeltape-roster
// function; fighters who opted out of the card game are left out). Bots take real fighters' names first, and the
// rest come from a 200-name pool. A bot named after a real fighter has a soft glow in their club colour; when the real
// person is in the match themselves (signed in with BuhurtOS), their fighter gets the big glow and a banner.
// Live fights at real events show on the realm map and the nearest arena mirrors them.
// ===================================================================
const ROSTER_URL = BOS_URL + '/functions/v1/steeltape-roster';
const ROSTER = { teams: [], fighters: [], live: [], at: 0, loading: false, ok: false };
const ROSTER_VERSION = 2;
function rosterEligible(id) { return ROSTER.ok && ROSTER.fighters.some(f => f.id === id); }
function rosterAccept(d) {
  if (!d || d.version !== ROSTER_VERSION || d.scope !== 'hacsa' || !Array.isArray(d.teams) || !Array.isArray(d.fighters)) return false;
  const teams = d.teams.filter(t => t && typeof t.slug === 'string' && typeof t.name === 'string' && !/(?:^|[\s_-])(test|demo|sandbox)(?:$|[\s_-])/i.test(t.slug + ' ' + t.name));
  const slugs = new Set(teams.map(t => t.slug));
  const fighters = d.fighters.filter(f => f && typeof f.id === 'string' && typeof f.name === 'string' && slugs.has(f.team) && !/(?:^|[\s_-])(test|demo|sandbox)(?:$|[\s_-])/i.test(f.name));
  const ids = new Set(fighters.map(f => f.id));
  const live = (Array.isArray(d.live) ? d.live : []).filter(l => [l.a, l.b].every(s => s && slugs.has(s.team) && Array.isArray(s.fighters) && s.fighters.every(f => ids.has(f.id))));
  Object.assign(ROSTER, { teams, fighters, live, at: Date.now(), ok: true, rebranded: false });
  rosterReset(); rosterClubs(); rosterRebrand(); rosterLive();
  return true;
}
function rosterReset() {
  // Clear derived identities before rebuilding. Keep gameplay equipment and progress.
  const used = {};
  for (const [key, C] of Object.entries(CLUBS)) {
    if (key.startsWith('bos:') || key.startsWith('live:')) { delete CLUBS[key]; continue; }
    delete C.who; C.bos = null;
    if (key !== 'reavers') { C.name = C.full = 'Festival ' + (key.startsWith('ladder') ? 'Challengers' : 'Company'); C.short = 'FST'; }
    for (const s of C.roster || []) { delete s.bos; delete s.rn; delete s.keep; if (!s.player) s.name = poolName(used); }
  }
  for (const L of typeof LEAGUE_EXTRA !== 'undefined' ? LEAGUE_EXTRA : []) { L.name = 'Festival Company'; L.short = 'FST'; }
  // HACSA eligibility controls generated bots, not the player's saved team.
  // Roster loading or a removed bot affiliation must never rewrite CAREER.
  applyProfile();
  for (const f of G.fighters || []) if (!f.isPlayer && f.spec?.bos && !rosterEligible(f.spec.bos.id)) { f.spec = { ...f.spec, bos: null, keep: false }; f.name = f.spec.name = poolName(used); fighterGlow(f); }
}
const POOL_FIRST = ['Aiden', 'Ava', 'Blake', 'Brooke', 'Cody', 'Cassidy', 'Dylan', 'Dakota', 'Ethan', 'Emma', 'Finn', 'Faith', 'Garrett', 'Grace', 'Hunter', 'Hailey', 'Isaac', 'Ivy', 'Jace', 'Jade', 'Kyle', 'Kaitlyn', 'Logan', 'Lily', 'Mason', 'Madison', 'Nolan', 'Nora', 'Owen', 'Olivia', 'Parker', 'Paige', 'Quinn', 'Quincy', 'Riley', 'Reese', 'Spencer', 'Sierra', 'Tanner', 'Taylor', 'Tristan', 'Tessa', 'Wyatt', 'Willow', 'Brody', 'Bailey', 'Colton', 'Chloe', 'Dawson', 'Destiny', 'Easton', 'Ella', 'Gavin', 'Gemma', 'Holden', 'Harper', 'Jaxon', 'Josie', 'Kellan', 'Kenzie', 'Landon', 'Lacey', 'Maverick', 'Mya', 'Nash', 'Nevaeh', 'Rhett', 'Raelynn', 'Sawyer', 'Sadie', 'Travis', 'Tori', 'Brennan', 'Brynn', 'Dallas', 'Darcy', 'Emmett', 'Ember', 'Grady', 'Greta', 'Hayden', 'Hope', 'Jesse', 'Jolene', 'Keegan', 'Kira', 'Lane', 'Lexi', 'Marshall', 'Maeve', 'Reid', 'Rowan', 'Shane', 'Shelby', 'Ty', 'Tamsin', 'Wade', 'Wren', 'Zane', 'Zoey'];
const POOL_LAST = ['Anderson', 'Bergstrom', 'Bouchard', 'Brandt', 'Campbell', 'Chartrand', 'Dahl', 'Desjardins', 'Doucette', 'Dueck', 'Eriksen', 'Fehr', 'Fontaine', 'Friesen', 'Gagnon', 'Giesbrecht', 'Hamm', 'Halvorsen', 'Hiebert', 'Holt', 'Iverson', 'Janzen', 'Johansson', 'Klassen', 'Kowalchuk', 'Kozak', 'Lachance', 'Lindqvist', 'Loewen', 'MacLeod', 'Martens', 'McKenzie', 'Moreau', 'Neufeld', 'Nygaard', 'Olson', 'Ouellette', 'Penner', 'Petrenko', 'Pelletier', 'Quiring', 'Rempel', 'Robichaud', 'Rousseau', 'Sawatzky', 'Schmidt', 'Sorensen', 'Stewart', 'Thiessen', 'Toews', 'Tremblay', 'Unger', 'Vandale', 'Voth', 'Wiebe', 'Wozniak', 'Yaremko', 'Zacharias', 'Zimmer', 'Boychuk', 'Hrynyk', 'Melnyk', 'Sawchuk', 'Tkachuk', 'Fedoruk', 'Kostiuk', 'Prystupa', 'Shewchuk', 'Lavallee', 'Gauthier', 'Paquette', 'Beaulieu', 'Nicholson', 'Fraser', 'Gillis', 'Cameron', 'Murray', 'Ross', 'Grant', 'Bjornson', 'Magnusson', 'Thorsteinson', 'Gudmundson', 'Arnason', 'Olafson', 'Brekke', 'Haugen', 'Lunde', 'Solberg', 'Strand', 'Vik', 'Berg', 'Hagen', 'Dyck', 'Enns', 'Reimer', 'Wall', 'Harder', 'Peters', 'Krahn'];
function poolName(used) {
  for (let i = 0; i < 40; i++) { const n = pick(POOL_FIRST) + ' ' + pick(POOL_LAST); if (!used[n] && !ROSTER.fighters.some(f => f.name === n)) { used[n] = 1; return n; } }
  for (let i = 1; ; i++) { const n = 'Festival Fighter ' + i; if (!used[n] && !ROSTER.fighters.some(f => f.name === n)) { used[n] = 1; return n; } }
}
// load the roster: cached for a day, refreshed in the background; the live list refreshes every 30 s in town
function rosterLoad(force) {
  if (!ROSTER.ok) { try { const c = store.get('bosRoster', null); if (!c || Date.now() - c.at > 86400000 || !rosterAccept(c)) { store.set('bosRoster', null); rosterReset(); } else ROSTER.at = c.at; } catch (e) { rosterReset(); } }
  const stale = Date.now() - (ROSTER.at || 0) > (force ? 30000 : 86400000);
  if (!stale || ROSTER.loading || typeof fetch !== 'function') return;
  ROSTER.loading = true;
  fetch(ROSTER_URL, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
    ROSTER.loading = false; if (!rosterAccept(d)) return;
    try { store.set('bosRoster', { version: ROSTER_VERSION, scope: 'hacsa', teams: ROSTER.teams, fighters: ROSTER.fighters, at: ROSTER.at }); } catch (e) { }
  }).catch(() => { ROSTER.loading = false; });
}
// a colour per team: their own if they set one, otherwise one picked from their name
const ROSTER_DEFAULT_COLS = ['#2C4A8C', '#E9ECEF'];
function teamColours(T) {
  const c = (T.colors || []).filter(Boolean);
  if (c.length >= 2 && !(c[0].toUpperCase() === ROSTER_DEFAULT_COLS[0] && c[1].toUpperCase() === ROSTER_DEFAULT_COLS[1])) return [c[0], c[1]];
  const r = seeded('team' + T.slug); return [TABARDS[Math.floor(r() * TABARDS.length)], TRIMS[Math.floor(r() * TRIMS.length)]];
}
// every BuhurtOS team becomes a club the town bouts can use: real names and colours, the built-in fighting styles
function rosterClubs() {
  const tmpl = CLUBS.wardens.roster;
  for (const T of ROSTER.teams) {
    const key = 'bos:' + T.slug; if (CLUBS[key]) continue;
    const [tab, trim] = teamColours(T), nm = String(T.name || T.slug).replace(/^The /, '');
    CLUBS[key] = { key, name: nm.length > 18 ? nm.split(' ').slice(-2).join(' ') : nm, full: T.name, short: (T.initial || nm.slice(0, 1)).toUpperCase() + nm.replace(/[^A-Z]/g, '').slice(1, 3).padEnd(2, 'X'), tabard: tab, trim, charge: ['chevron', 'cross', 'saltire', 'chief', 'quarterly', 'bend'][Math.floor(seeded(key)() * 6)], flag: trim, bos: T.slug,
      roster: tmpl.map(s => ({ ...s, player: false, captain: false })) };
  }
}
// the made-up clubs (Bow River Wardens, Ironwood Rabble, the league, the ladder's fighters) become real BuhurtOS teams
// and fighters as soon as the roster is known, so nobody fights an invented team. Stable per player (seeded by their team).
function rosterRebrand() {
  if (!ROSTER.ok || !ROSTER.teams.length) return;
  const mine = (CAREER.club && CAREER.club.bos) || null, rnd = seeded('rebrand:' + (mine || 'none'));
  const count = T => ROSTER.fighters.filter(f => f.team === T.slug).length;
  let pool = ROSTER.teams.filter(T => T.slug !== mine).sort((a, b) => count(b) - count(a) || a.slug.localeCompare(b.slug));
  if (!pool.length) pool = ROSTER.teams.slice();
  if (!pool.length) return;
  const shuffled = pool.slice(); for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const brand = (key, T) => { const C = CLUBS[key]; if (!C || !T) return; rosterClubs(); const B = CLUBS['bos:' + T.slug]; if (!B) return; Object.assign(C, { name: B.name, full: B.full, short: B.short, tabard: B.tabard, trim: B.trim, charge: B.charge, bos: T.slug }); };
  const pickT = i => shuffled[i % shuffled.length];
  brand('wardens', pickT(0)); brand('rabble', pickT(1));
  if (typeof LEAGUE_EXTRA !== 'undefined') { if (typeof ensureLeagueClubs === 'function') ensureLeagueClubs(); LEAGUE_EXTRA.forEach((L, i) => { const T = pickT(2 + i), B = CLUBS['bos:' + T.slug]; if (!B) return; Object.assign(L, { name: B.name, short: B.short, tabard: B.tabard, trim: B.trim, charge: B.charge }); brand(L.key, T); }); }
  // the ladder: six real fighters, each from a different team where possible, one name per category
  const used = {};
  LADDER.forEach((L, i) => {
    const T = pickT(5 + i), who = {};
    for (const g of ['m', 'f']) { let list = ROSTER.fighters.filter(f => f.team === T.slug && (f.g === g || f.g == null) && !used[f.name]); if (!list.length) continue; const F = list[Math.floor(rnd() * list.length)]; used[F.name] = 1; who[g] = F; }
    const C = CLUBS['ladder' + i]; if (!C || (!who.m && !who.f)) return;
    brand('ladder' + i, T); C.who = who; C.name = (who.m || who.f).name.split(' ').slice(-1)[0]; C.full = `${(who.m || who.f).name} of ${C.full || T.name}`;
  });
  ROSTER.rebranded = true;
}
// the ladder rung's real fighter for this category (null if the roster isn't known)
function ladderWho(i, cat) { const C = CLUBS['ladder' + i]; if (!C || !C.who) return null; return cat === 'women' ? (C.who.f || null) : (C.who.m || null); }
function rosterClubKeys(min) { return Object.keys(CLUBS).filter(k => k.startsWith('bos:') && ROSTER.fighters.filter(f => f.team === CLUBS[k].bos).length >= (min || 1)); }
// a name for a bot: a real fighter (their own club's first), else the pool. Returns { name, bos }
function rosterName(club, spec, cat, used, o) {
  if (!ROSTER.ok || !ROSTER.fighters.length || (o && (o.online || o.daily || o.versus || o.kids)) || cat === 'youth') return { name: poolName(used), bos: null };
  const g = cat === 'women' ? 'f' : 'm', fits = F => !used[F.name] && (F.g === g || F.g == null);
  let list = club.bos ? ROSTER.fighters.filter(F => F.team === club.bos && fits(F)) : [];
  const taken = o ? [o.clubA, o.opp].map(k => CLUBS[k] && CLUBS[k].bos).filter(Boolean) : []; // the teams in this match keep their own fighters
  if (!list.length && !club.bos && chance(0.55)) list = ROSTER.fighters.filter(F => fits(F) && !taken.includes(F.team));
  if (list.length) { const F = pick(list); used[F.name] = 1; return { name: F.name, bos: { id: F.id, team: F.team } }; }
  return { name: poolName(used), bos: null };
}
// the glows: soft for a real fighter's name on a bot, big when the real person is in the match
let GLOW_TEX = null;
function glowTex() {
  if (GLOW_TEX) return GLOW_TEX;
  const c = cvs(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); GLOW_TEX = texFrom(c); return GLOW_TEX;
}
function fighterGlow(f) {
  const J = f.model; if (!J || !J.root) return;
  const creator = !!(f.creatorVerified || (f.isPlayer && f.spec?.player && creatorLocal()));
  const real = creator || !!((f.bosReal && rosterEligible(f.bosReal.id)) || (f.isPlayer && BOS.info && rosterEligible(BOS.info.fighter) && f.spec?.player));
  const bot = !!(f.spec?.bos && rosterEligible(f.spec.bos.id));
  const key = JSON.stringify([creator, real, bot, f.name, f.club?.tabard]);
  if (J.identityKey === key) return;
  J.identityKey = key; f.realGlow = false;
  for (const child of [...J.root.children]) if (child.userData.identity) { J.root.remove(child); child.geometry?.dispose(); if (child.material?.map && child.material.map !== GLOW_TEX) child.material.map.dispose(); child.material?.dispose(); }
  J.glow = J.banner = null;
  if (!real && !bot) return;
  const col = new THREE.Color(creator ? '#ffd45c' : f.club && f.club.tabard || '#f2c40f').lerp(new THREE.Color('#ffffff'), creator ? 0.1 : real ? 0.25 : 0.35);
  const m = new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: real ? 0.75 : 0.32 });
  const s = new THREE.Sprite(m); s.position.y = 1.05; s.scale.set(real ? 2.6 : 1.7, real ? 3.4 : 2.4, 1); s.renderOrder = 2; J.root.add(s); J.glow = s;
  s.userData.identity = true;
  if (real) {
    const t0 = Math.random() * 6; s.onBeforeRender = () => { const k = performance.now() / 1000 + t0; m.opacity = creator ? 0.3 + 0.07 * Math.sin(k * 2) : 0.6 + 0.25 * Math.sin(k * 3); s.scale.set((creator ? 2.1 : 2.6) + 0.15 * Math.sin(k * 2), (creator ? 2.7 : 3.4) + 0.2 * Math.sin(k * 2), 1); };
    // a pillar of light and a banner with their name
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 4.2, 14, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 2.1; if (!creator) J.root.add(beam); else { beam.geometry.dispose(); beam.material.dispose(); }
    beam.userData.identity = true;
    const c = cvs(512, 128), x = c.getContext('2d'); x.fillStyle = f.club && f.club.tabard || '#6d1b28'; x.fillRect(0, 0, 512, 128); x.strokeStyle = '#f2c40f'; x.lineWidth = 8; x.strokeRect(4, 4, 504, 120);
    x.fillStyle = '#fff'; x.font = '900 42px "Big Shoulders Display", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(creator ? 'Garrett Robson' : f.name || '').toUpperCase().slice(0, 18), 256, 38, 480); x.font = creator ? '800 44px system-ui' : '700 26px system-ui'; x.fillStyle = '#f2c40f'; x.fillText(creator ? 'Creator' : '★ THE REAL ONE ★', 256, 94, 480);
    const ban = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFrom(c), transparent: true, depthWrite: false })); ban.scale.set(1.4, 0.35, 1); ban.position.y = 2.75; ban.renderOrder = 6; J.root.add(ban); J.banner = ban;
    ban.userData.identity = true; ban.userData.label = creator ? 'Creator' : 'THE REAL ONE';
    if (creator) { ban.scale.set(1.8, 0.45, 1); ban.position.y = 2.65; }
    f.realGlow = true;
  }
}
// a takedown by the real person gets the crowd roaring
function realTakedown(by) { if (by && by.realGlow) { try { AU.cheer(1.6); } catch (e) { } } }
// live events: open lyst fields become LIVE flags on the arenas (first field the Dome, then the others)
function rosterLive() {
  const order = ['dome', 'peasant', 'forest', 'beach', 'castle', 'hall'];
  for (const A of ARENAS) { A.live = false; A.liveText = ''; A.liveMatch = null; }
  (ROSTER.live || []).slice(0, 6).forEach((L, i) => {
    const A = ARENAS.find(a => a.key === order[i]); if (!A || !L.a || !L.b) return;
    A.live = true; A.liveMatch = L; A.liveText = `LIVE at ${L.event || 'a real event'}: ${L.a.name} ${L.score[0]}–${L.score[1]} ${L.b.name}`;
  });
}
// the bout at an arena with a live fight mirrors it: the real names and teams, bots acting it out, the real score
function liveBoutPick(A) {
  const L = A && A.liveMatch; if (!L) return null;
  const mk2 = (side, key) => { const T = side.team && ROSTER.teams.find(t => t.slug === side.team); const base = T && CLUBS['bos:' + T.slug] || CLUBS.wardens;
    CLUBS[key] = { ...base, key, name: String(side.name).slice(0, 22), full: side.name, roster: base.roster.map((s, i) => ({ ...s, player: false, name: side.fighters[i] ? side.fighters[i].name : s.name, keep: !!side.fighters[i], bos: side.fighters[i] ? { id: side.fighters[i].id, team: side.team } : null })) }; return key; };
  const n = Math.max(1, Math.min(5, Math.max(L.a.fighters.length, L.b.fighters.length) || 1));
  return { mode: n === 4 ? 5 : n, clubA: mk2(L.a, 'live:a'), opp: mk2(L.b, 'live:b'), category: /wom|fem/i.test(L.category) ? 'women' : 'men', label: `LIVE · ${L.comp || L.event}`, live: L };
}

