// ---------- game data (rules cited from the design doc; numbers marked tuning are game design) ----------
const LIST = { W: 20, L: 30 }; // list size in metres (tuning)
const ROUND_TIME = 300;        // 5-minute round clock (REG 4.2)
const BREAK_AFTER = 10;
// 1v1 duels are scored, not decided by takedowns: clean hits by zone, 60-second rounds (game rules for this mode)
const DUEL_TIME = 60, DUEL_OT = 30;
const DUEL_PTS = { helmet: 3, torso: 2, armL: 1, armR: 1, legs: 1, takedown: 2, foul: 2 };        // passive clinch broken after 10 s (BR 4.10, tuning per design)

const WEAPONS = {
  mace:     { key: 'mace',     name: 'Flanged mace', cls: 'Type 1 hafted', spec: '0.7–1.3 kg, 50–70 cm',   mass: 1.1, len: 0.62, hands: 1, haft: true,  feel: 'Fast, short, good on helmets' },
  axe:      { key: 'axe',      name: 'Axe',          cls: 'Type 2 hafted', spec: '0.7–1.3 kg, 50–90 cm',   mass: 1.2, len: 0.82, hands: 1, haft: true,  feel: 'Hooks shields, a bit more reach' },
  sword:    { key: 'sword',    name: 'Arming sword', cls: 'Type 1 bladed', spec: '1.1–1.7 kg, 72–100 cm',  mass: 1.4, len: 0.92, hands: 1, haft: false, feel: 'Quick recovery, steady reach' },
  falchion: { key: 'falchion', name: 'Falchion',     cls: 'Type 1 bladed', spec: '1.1–1.7 kg, 72–100 cm',  mass: 1.5, len: 0.86, hands: 1, haft: false, feel: 'Heavy tip, chops hard' },
  longsword:{ key: 'longsword',name: 'Longsword',    cls: 'Type 2 bladed', spec: '1.7–2.3 kg, 100–140 cm', mass: 1.9, len: 1.15, hands: 2, haft: false, feel: 'Two hands, long and fast for its size' },
  longaxe:  { key: 'longaxe',  name: 'Longaxe',      cls: 'Type 3 hafted', spec: '1.3–2.5 kg, 90–130 cm',  mass: 2.2, len: 1.15, hands: 2, haft: true,  feel: 'Two hands, breaks armour and guards' },
  polearm:  { key: 'polearm',  name: 'Polearm',      cls: 'Type 4 hafted', spec: '2.2–3.2 kg, 130–220 cm', mass: 2.8, len: 1.9,  hands: 2, haft: true,  feel: 'Huge reach and impact, slow to recover' },
  short:    { key: 'short',    name: 'Sidearm sword',cls: 'Type 1 bladed', spec: '1.1–1.7 kg, 72–100 cm',  mass: 1.15, len: 0.74, hands: 1, haft: false, feel: 'Backup blade' },
};
const PICK_WEAPONS = ['mace', 'axe', 'sword', 'falchion', 'longsword', 'longaxe', 'polearm'];
// Fantasy set (Quaternius models): quick fights only, they would never pass a Buhurt kit check
const FW = (key, name, mass, len, hands, haft, feel) => ({ key, name, cls: 'Fantasy', spec: 'not Buhurt legal', mass, len, hands, haft, feel, fantasy: true });
Object.assign(WEAPONS, {
  f_sword:    FW('f_sword', "Knight's sword", 1.4, 0.86, 1, false, 'Story-book blade. Balanced and honest.'),
  f_rune:     FW('f_rune', 'Runeblade', 1.5, 0.86, 1, false, 'Hooked, wicked edge. Looks scarier than it hits.'),
  f_golden:   FW('f_golden', 'Gilded sword', 1.7, 0.92, 1, false, 'Gold furniture. Hits like a bank vault door.'),
  f_hatchet:  FW('f_hatchet', 'Hatchet', 0.9, 0.47, 1, true, 'Tiny and very fast. Gets inside guards.'),
  f_axe:      FW('f_axe', 'Bearded axe', 1.5, 0.76, 1, true, 'Big bearded bit. Hooks shields.'),
  f_hammer:   FW('f_hammer', 'War hammer', 1.7, 0.7, 1, true, 'Spiked head. Rings helmets.'),
  f_great:    FW('f_great', 'Greatsword', 2.4, 1.15, 2, false, 'Huge blade, huge arcs, huge recovery.'),
  f_claymore: FW('f_claymore', 'Crimson claymore', 2.7, 1.22, 2, false, 'Red steel, two hands. Clears space.'),
  f_dblaxe:   FW('f_dblaxe', 'Double axe', 3.0, 0.92, 2, true, 'Two bits, two hands, no subtlety.'),
  f_maul:     FW('f_maul', 'Maul', 3.6, 0.82, 2, true, 'A sledge on a stick. Slow, enormous impact.'),
  f_scythe:   FW('f_scythe', 'Scythe', 2.5, 1.25, 2, true, 'Reaper reach. Hooks round shields.'),
  f_spear:    FW('f_spear', 'War spear', 2.3, 1.7, 2, true, 'Longest reach here. Swung like a staff, never thrust.'),
});
// Special rack: original game-style weapons with a trick each (quick fights and training only)
const SW = (key, name, mass, len, hands, haft, special, feel) => ({ key, name, cls: 'Special', spec: 'not Buhurt legal', mass, len, hands, haft, feel, special, fantasy: true, specialSet: true });
Object.assign(WEAPONS, {
  x_pan:     SW('x_pan', 'Frying pan', 1.6, 0.55, 1, true, 'bong', 'Rings helmets like a church bell.'),
  x_hockey:  SW('x_hockey', 'Hockey stick', 0.7, 1.25, 2, true, 'hook', 'Light and long. Hooks ankles, so trips land far more.'),
  x_broom:   SW('x_broom', 'Curling broom', 0.8, 1.05, 2, true, 'sweep', 'Hurry hard! Shoves send people flying.'),
  x_ember:   SW('x_ember', 'Ember cleaver', 2.6, 0.95, 2, true, 'burn', 'Glowing edge. Every hit burns their stamina.'),
  x_storm:   SW('x_storm', 'Storm maul', 3.2, 0.9, 2, true, 'shock', 'Crackling head. Hits lock their legs for a moment.'),
  x_glacier: SW('x_glacier', 'Glacier club', 1.8, 0.75, 1, true, 'frost', 'Ice-crusted club. Hits slow them right down.'),
  x_crystal: SW('x_crystal', 'Crystal greatsword', 2.2, 1.2, 2, false, 'leech', 'Amethyst blade. Landing hits gives you your breath back.'),
  x_wrench:  SW('x_wrench', 'Giant wrench', 2.0, 0.72, 1, true, 'pry', 'Pries weapons loose. Disarms far more often.'),
  x_stop:    SW('x_stop', 'Stop sign', 2.4, 1.1, 2, true, 'sign', 'Blocks like a shield when you guard.'),
  x_chicken: SW('x_chicken', 'Rubber chicken', 0.4, 0.55, 1, false, 'squeak', 'Does no damage at all. The crowd loves it.'),
});
const SPECIAL_WEAPONS = ['x_pan', 'x_hockey', 'x_broom', 'x_ember', 'x_storm', 'x_glacier', 'x_crystal', 'x_wrench', 'x_stop', 'x_chicken'];
const FANTASY_WEAPONS = ['f_sword', 'f_rune', 'f_golden', 'f_hatchet', 'f_axe', 'f_hammer', 'f_great', 'f_claymore', 'f_dblaxe', 'f_maul', 'f_scythe', 'f_spear'];
const SHIELDS = {
  heater:  { key: 'heater',  name: 'Heater shield', spec: '5 kg or less, 55–75 cm', mass: 4.2, block: 0.3 },
  buckler: { key: 'buckler', name: 'Buhurt buckler', spec: '20–40 cm across', mass: 1.3, block: 0.55 },
};
const ARCH = {
  heavy:    { key: 'heavy',    name: 'Heavy',    kit: 34, stab: 1.22, speed: 4.4, power: 1.08, grip: 1.0,  radius: 0.42, bodyB: 0.18 },
  polearm:  { key: 'polearm',  name: 'Polearm',  kit: 26, stab: 1.0,  speed: 5.0, power: 1.0,  grip: 0.9,  radius: 0.38, bodyB: 0 },
  grappler: { key: 'grappler', name: 'Grappler', kit: 25, stab: 1.1,  speed: 5.1, power: 0.9,  grip: 1.45, radius: 0.38, bodyB: 0.05 },
  striker:  { key: 'striker',  name: 'Striker',  kit: 29, stab: 1.05, speed: 4.8, power: 1.12, grip: 1.0,  radius: 0.4,  bodyB: 0.1 },
  runner:   { key: 'runner',   name: 'Runner',   kit: 21, stab: 0.92, speed: 5.8, power: 0.92, grip: 1.15, radius: 0.36, bodyB: -0.12 },
};
// Helms change how you see: field of view through the visor, protection, weight, and how well you breathe and hear inside
const HELMS = {
  greathelm: { key: 'greathelm', name: 'Great helm',        note: 'Two thin slits. You see almost nothing, and nothing gets in.', prot: 1.22, weight: 3.4, fov: 46, breath: 0.72, muffle: 0.6 },
  pigface:   { key: 'pigface',   name: 'Pig-face bascinet', note: 'Houndskull visor. Narrow slit, perforated snout.',            prot: 1.12, weight: 3.0, fov: 54, breath: 0.86, muffle: 0.4 },
  klapp:     { key: 'klapp',     name: 'Klappvisor bascinet', note: 'One long slit under a hinged visor.',                     prot: 1.06, weight: 2.8, fov: 58, breath: 0.86, muffle: 0.32 },
  cross:     { key: 'cross',     name: 'Bascinet with cross', note: 'Flat visor with crosses punched for air and light.',     prot: 1.05, weight: 3.0, fov: 60, breath: 0.92, muffle: 0.3 },
  grill:     { key: 'grill',     name: 'Grilled bascinet',  note: 'Bars instead of a visor. Wide view, lots of air.',         prot: 0.95, weight: 2.9, fov: 68, breath: 1.05, muffle: 0.14 },
  sallet:    { key: 'sallet',    name: 'Sallet with bevor', note: 'Wide horizontal slit, chin covered by the bevor.',         prot: 1.0,  weight: 2.6, fov: 64, breath: 0.95, muffle: 0.24 },
  barbute:   { key: 'barbute',   name: 'Barbuta',           note: 'T-shaped opening. Great view, face less covered.',         prot: 0.88, weight: 2.4, fov: 72, breath: 1.08, muffle: 0.14 },
  kettle:    { key: 'kettle',    name: 'Kettle hat with bevor', note: 'Open view under a brim. Least protection.',            prot: 0.8,  weight: 2.3, fov: 78, breath: 1.15, muffle: 0.06 },
};
const HELM_ORDER = ['greathelm', 'pigface', 'klapp', 'cross', 'grill', 'sallet', 'barbute', 'kettle'];
const CATEGORIES = {
  men:   { key: 'men',   name: "Adult",   h: [1.68, 1.98], b: [0.92, 1.28], body: 82 },
  women: { key: 'women', name: "Adult", h: [1.55, 1.83], b: [0.86, 1.2],  body: 66 },
  youth: { key: 'youth', name: 'Kids',   h: [1.18, 1.52], b: [0.86, 1.1],  body: 38 }, // kid-size: foam kit, rubber weapons
};
const NAMES = {
  men: ['Dale', 'Hutch', 'Nolan', 'Marcus', 'Brandt', 'Tremblay', 'Okafor', 'Lindqvist', 'Gauthier', 'Rourke', 'Haldane', 'Szabo', 'Ferreira', 'Kowalczyk', 'Arjun', 'Wes', 'Gord', 'Luc', 'Rafael', 'Desmond', 'Kenji', 'Tomasz', 'Ibrahim', 'Cormac', 'Viktor', 'Ezra', 'Bastien', 'Rhys', 'Mateo', 'Stellan'],
  women: ['Priya', 'Tess', 'Maren', 'Jo', 'Kateri', 'Aoife', 'Brooke', 'Sienna', 'Ines', 'Dagny', 'Rosa', 'Hana', 'Lena', 'Freya', 'Nadia', 'Mara', 'Bea', 'Isolde', 'Tamsin', 'Yara', 'Signe', 'Ruth', 'Keely', 'Esme', 'Noor', 'Greta', 'Pippa', 'Liv', 'Odessa', 'Sabine'],
  youth: ['Ty', 'Ava', 'Mason', 'Zoe', 'Eli', 'Maya', 'Owen', 'Lily', 'Jonah', 'Ella', 'Sam', 'Nia', 'Cole', 'Ruby', 'Finn', 'Ari', 'Kai', 'Leo', 'Isla', 'Theo', 'June', 'Milo', 'Ivy', 'Remy', 'Nora', 'Abe', 'Gus', 'Tilly', 'Rio', 'Bodhi'],
};
function seeded(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
// every fighter gets their own height and build; bigger is steadier, smaller is quicker
function makeBody(cat, arch, seedStr, frame) {
  const C = CATEGORIES[cat]; const r = seeded(seedStr);
  let hgt = lerp(C.h[0], C.h[1], r()), b = clamp(lerp(C.b[0], C.b[1], r()) + (ARCH[arch].bodyB || 0), 0.78, 1.38);
  if (frame) {
    hgt = Number.isFinite(frame.heightValue) ? lerp(C.h[0], C.h[1], clamp(frame.heightValue / 100, 0, 1))
      : ({ short: C.h[0] + 0.06, avg: (C.h[0] + C.h[1]) / 2, tall: C.h[1] - 0.03 }[frame.height] || hgt);
    b = Number.isFinite(frame.massValue) ? lerp(0.86, 1.24, clamp(frame.massValue / 100, 0, 1))
      : ({ light: 0.86, medium: 1.02, heavy: 1.24 }[frame.build] || b);
  }
  const girl = cat === 'women' || (cat === 'youth' && r() < 0.5);
  return { h: hgt, b, bodyMass: C.body * Math.pow(hgt / 1.8, 2) * b, braid: girl && r() < 0.6, girl, fem: cat === 'women' || !!(frame && frame.gender === 'female') };
}
const TAPES = {
  black: { key: 'black', name: 'Black hockey tape', color: '#18191a', legal: true, haft: 'ok', wear: 1.55, note: 'Neutral cloth tape. Legal for kit repair and haft wraps (BR 2.1.5, WR 7.2.2).' },
  white: { key: 'white', name: 'White hockey tape', color: '#ecebe4', legal: true, haft: 'warn', wear: 1.55, note: 'Legal for repairs. On a haft it looks off to an authenticity officer.' },
  grey:  { key: 'grey',  name: 'Grey cloth tape',   color: '#8a8f92', legal: true, haft: 'ok', wear: 1.55, note: 'Neutral cloth tape. Legal for repairs and hafts (WR 7.2.2).' },
  duct:  { key: 'duct',  name: 'Duct tape',         color: '#a9afb3', legal: false, haft: 'no', wear: 1.15, instant: true, note: 'Modern adhesive tape is not permitted (BR 2.1.5). Green card risk at the kit check.' },
  zip:   { key: 'zip',   name: 'Zip ties',          color: '#2b2b2b', legal: false, haft: 'no', wear: 1.3, instant: true, note: 'Plastic ties are not permitted (BR 2.1.5). Green card risk at the kit check.' },
};
const PIECE_NAMES = { helmet: 'Helmet chin strap', armL: 'Left elbow strap', armR: 'Right elbow strap', legs: 'Knee cop straps', haft: 'Haft wrap' };

const CLUBS = {
  reavers: {
    key: 'reavers', name: 'Reavers', full: 'Reavers', short: 'RVR', tabard: '#6d1b28', trim: '#e8e1cf', charge: 'chevron', flag: '#ff3d8b',
    roster: [
      { num: 4,  name: 'You',   arch: 'heavy',    weapon: 'mace',     shield: 'heater',  helm: 'pigface', player: true },
      { num: 7,  name: 'Dale',  arch: 'striker',  weapon: 'longaxe',  shield: null,      helm: 'greathelm', captain: true },
      { num: 12, name: 'Priya', arch: 'polearm',  weapon: 'polearm',  shield: null,      helm: 'sallet' },
      { num: 9,  name: 'Hutch', arch: 'grappler', weapon: 'sword',    shield: 'buckler', helm: 'klapp', sidearm: true },
      { num: 22, name: 'Nolan', arch: 'runner',   weapon: 'falchion', shield: 'buckler', helm: 'kettle', sidearm: true },
    ]
  },
  wardens: {
    key: 'wardens', name: 'Bow River Wardens', full: 'Bow River Wardens', short: 'BRW', tabard: '#1c3454', trim: '#d8dde2', charge: 'pale', flag: '#3b93ff',
    roster: [
      { num: 3,  name: 'Brandt',    arch: 'heavy',    weapon: 'axe',      shield: 'heater',  helm: 'greathelm', captain: true },
      { num: 15, name: 'Kowalczyk', arch: 'polearm',  weapon: 'polearm',  shield: null,      helm: 'sallet' },
      { num: 8,  name: 'Tremblay',  arch: 'striker',  weapon: 'longaxe',  shield: null,      helm: 'cross' },
      { num: 11, name: 'Okafor',    arch: 'grappler', weapon: 'sword',    shield: 'buckler', helm: 'grill', sidearm: true },
      { num: 5,  name: 'Lindqvist', arch: 'runner',   weapon: 'sword',    shield: 'buckler', helm: 'barbute', sidearm: true },
    ]
  },
  rabble: {
    key: 'rabble', name: 'Ironwood Rabble', full: 'Ironwood Rabble', short: 'IWR', tabard: '#2a3d26', trim: '#d4b44a', charge: 'bend', flag: '#3b93ff',
    roster: [
      { num: 1,  name: 'Gauthier', arch: 'heavy',    weapon: 'mace',     shield: 'heater',  helm: 'sallet', captain: true },
      { num: 21, name: 'Rourke',   arch: 'heavy',    weapon: 'axe',      shield: 'heater',  helm: 'pigface' },
      { num: 6,  name: 'Haldane',  arch: 'polearm',  weapon: 'polearm',  shield: null,      helm: 'greathelm' },
      { num: 13, name: 'Szabo',    arch: 'striker',  weapon: 'longsword', shield: null,     helm: 'cross' },
      { num: 2,  name: 'Ferreira', arch: 'runner',   weapon: 'falchion', shield: 'buckler', helm: 'barbute', sidearm: true },
    ]
  }
};

// training yard partners and the Duel Ladder (invented fighters from around central Alberta)
CLUBS.sparring = { key: 'sparring', name: 'Sparring partners', full: 'Sparring partners', short: 'SPR', tabard: '#45494b', trim: '#d9d4c5', charge: 'pale', flag: '#3b93ff',
  roster: [{ num: 1, name: 'Pell', arch: 'heavy', weapon: 'sword', shield: 'heater', helm: 'greathelm' }, { num: 2, name: 'Coach', arch: 'striker', weapon: 'axe', shield: 'buckler', helm: 'sallet' }] };
const LADDER = [
  { from: 'Lacombe',     names: ['Jory', 'Jory', 'Jory'],    sur: 'Pelletier', arch: 'runner',   weapon: 'sword',     shield: 'buckler', helm: 'kettle',    prof: { react: 0.44, aggr: 0.7,  guard: 0.3,  cancel: 0.95 }, stab: 0.94, tabard: '#5b4a2a', trim: '#e3d6a8', charge: 'bend' },
  { from: 'Ponoka',      names: ['Wade', 'Wren', 'Wes'],     sur: 'Fortin',    arch: 'heavy',    weapon: 'mace',      shield: 'heater',  helm: 'greathelm', prof: { react: 0.33, aggr: 0.9,  guard: 0.45, cancel: 0.93 }, stab: 1.0,  tabard: '#3d2a4f', trim: '#d8c9e6', charge: 'cross' },
  { from: 'Sylvan Lake', names: ['Soren', 'Sigrid', 'Sky'],  sur: 'Holm',      arch: 'polearm',  weapon: 'polearm',   shield: null,      helm: 'sallet',    prof: { react: 0.27, aggr: 1.0,  guard: 0.55, cancel: 0.9 },  stab: 1.04, tabard: '#1f4a4a', trim: '#cfe6e0', charge: 'saltire' },
  { from: 'Olds',        names: ['Teo', 'Tala', 'Teo'],      sur: 'Ruiz',      arch: 'grappler', weapon: 'axe',       shield: 'buckler', helm: 'pigface',   prof: { react: 0.22, aggr: 1.05, guard: 0.62, cancel: 0.88 }, stab: 1.08, tabard: '#6a3b12', trim: '#f0c27a', charge: 'chief' },
  { from: 'Camrose',     names: ['Mathieu', 'Marguerite', 'Max'], sur: 'Dube', arch: 'striker',  weapon: 'longsword', shield: null,      helm: 'cross',     prof: { react: 0.17, aggr: 1.2,  guard: 0.72, cancel: 0.86 }, stab: 1.12, tabard: '#24324f', trim: '#e8e1cf', charge: 'quarterly' },
  { from: 'Red Deer',    names: ['Hal', 'Hallie', 'Harper'], sur: 'Brennan',   arch: 'heavy',    weapon: 'longaxe',   shield: null,      helm: 'greathelm', prof: { react: 0.13, aggr: 1.3,  guard: 0.8,  cancel: 0.84 }, stab: 1.18, tabard: '#111214', trim: '#d4b44a', charge: 'chevron', champ: true },
];
LADDER.forEach((L, i) => { CLUBS['ladder' + i] = { key: 'ladder' + i, name: L.sur, full: `${L.sur} of ${L.from}`, short: L.sur.slice(0, 3).toUpperCase(), tabard: L.tabard, trim: L.trim, charge: L.charge, flag: '#3b93ff', roster: [{ num: 10 + i * 7, name: L.sur, arch: L.arch, weapon: L.weapon, shield: L.shield, helm: L.helm, prof: L.prof, stab: L.stab, ladder: i }] }; });
// 12v12 Massacre: each club fills out its bench with the rest of the club
function bigRoster(club, n) {
  const base = club.roster.slice(); const r = seeded(club.key + 'bench'); const used = new Set(base.map(s => s.num));
  const kits = { heavy: [['mace', 'heater'], ['axe', 'heater']], polearm: [['polearm', null]], striker: [['longaxe', null], ['longsword', null]], grappler: [['sword', 'buckler']], runner: [['falchion', 'buckler'], ['sword', 'buckler']] };
  const archs = ['heavy', 'striker', 'polearm', 'grappler', 'runner', 'heavy', 'striker'];
  while (base.length < n) {
    const arch = archs[base.length % archs.length]; const k = kits[arch][(r() * kits[arch].length) | 0];
    let num = 2 + ((r() * 60) | 0); while (used.has(num)) num = num % 70 + 1; used.add(num);
    base.push({ num, name: 'Bench', arch, weapon: k[0], shield: k[1], helm: HELM_ORDER[(r() * HELM_ORDER.length) | 0], sidearm: arch === 'grappler' || arch === 'runner' });
  }
  return base;
}

const DIFF = {
  rookie:    { react: 0.36, aggr: 0.75, guard: 0.4, cancel: 0.92, playerStab: 1.16, label: 'Rookie' },
  club:      { react: 0.24, aggr: 1.0,  guard: 0.6, cancel: 0.88, playerStab: 1.06, label: 'Club' },
  nationals: { react: 0.15, aggr: 1.2,  guard: 0.75, cancel: 0.84, playerStab: 1.0,  label: 'Nationals' },
};

const ORDERS = {
  free: { name: 'Free fight', short: 'Free', desc: 'Everyone picks their own fight.' },
  pair: { name: 'Pair on', short: 'Pair', desc: 'Two nearest double your target.' },
  hold: { name: 'Hold the line', short: 'Hold', desc: 'Brace and receive the charge.' },
  hunt: { name: 'Hunt', short: 'Hunt', desc: 'Finish anyone who is stumbling.' },
  peel: { name: 'Peel', short: 'Peel', desc: 'Break teammates out of 2-on-1s.' },
};

function freshKit(spec, worn) {
  const r = () => worn ? rand(0.62, 0.86) : rand(0.8, 0.97);
  const kit = {};
  for (const k of ['helmet', 'armL', 'armR', 'legs', 'haft']) kit[k] = { cond: r(), tape: null, failed: false, covered: false };
  return kit;
}

