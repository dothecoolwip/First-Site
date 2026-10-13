// ===================================================================
// Six hidden places round the realm, each with a free cosmetic (and a little loot) the first time you find it.
// No labels, no map marker until found: walk close and the prompt says Search. Nothing here changes fighting.
// ===================================================================
const SECRETS = [
  { key: 'hermit', name: 'The hermit’s cave', x: -286, z: -40, hint: 'Behind the quarry, where the rocks lean together, someone used to live.', look: ['hat', 'hermit'], loot: { gold_ore: 2 }, verb: 'Search the cave' },
  { key: 'crypt', name: 'The chapel crypt', x: 90, z: -254, hint: 'A lever behind the bailey chapel. Nobody’s pulled it in years.', look: ['hat', 'crypt'], loot: { silver_ore: 2 }, verb: 'Pull the old lever', gate: 'bailey' },
  { key: 'lookout', name: 'The treetop lookout', x: -238, z: -122, hint: 'Deep in the Old Woods a ladder goes up into one particular tree.', look: ['cape', 'ranger'], loot: { hickory: 3 }, verb: 'Climb the hidden ladder' },
  { key: 'boat', name: 'The sunken boat', x: 226, z: 128, hint: 'At the far end of Mirror Lake, half in the reeds, an old boat rots.', look: ['hand', 'driftwood'], loot: { oak: 3 }, verb: 'Search the wreck' },
  { key: 'cellar', name: 'The king’s wine cellar', x: -16, z: -290, hint: 'On the citadel, behind the Great Hall, steps go down to the cellar.', look: ['hand', 'goblet'], look2: ['cape', 'courtier'], loot: {}, item: 'royal_seal', verb: 'Go down to the cellar', gate: 'royal' },
  { key: 'smuggler', name: 'The smugglers’ grate', x: -113, z: -200, hint: 'Smugglers once ran a tunnel from Millbrook’s mill to a grate in the bailey’s west wall.', look: ['hat', 'smuggler'], loot: {}, item: 'map_scrap', verb: 'Peer through the grate', peek: true }
];
LOOKS.hat.push(['hermit', 'Hermit’s hood', 0, 'hidden'], ['crypt', 'Crypt knight helm', 0, 'hidden'], ['smuggler', 'Smuggler’s mask', 0, 'hidden']);
LOOKS.cape.push(['ranger', 'Ranger’s cloak', 0, 'hidden'], ['courtier', 'Courtier’s mantle', 0, 'hidden']);
LOOKS.hand.push(['driftwood', 'Driftwood club', 0, 'hidden'], ['goblet', 'Royal goblet', 0, 'hidden']);
function secretFound(key) { return !!(CAREER.found && CAREER.found[key]); }
// the places themselves: a few props each, and an invisible stall you can only find by walking up to it
function buildSecrets(R) {
  const add = (k, x, z, ry, s, y) => kpiece(R, k, x, (y || 0) + gy(x, z), z, ry || 0, s || 1);
  // hermit's cave: leaning boulders, a dark mouth, a candle and a bedroll
  for (const [k, dx, dz, ry, s] of [['fy_rock_big_1', -3, -2, 0.4, 1.6], ['fy_rock_big_3', 3, -2.5, 2.2, 1.5], ['fy_rock_big_pillar', 0, -4.5, 1.2, 1.2], ['fy_rock_medium_4', -4, 1.5, 0.8, 1.1]]) { add(k, -286 + dx, -40 + dz, ry, s); TOWN.obst.push({ x: -286 + dx, z: -40 + dz, r: 1.6 }); }
  { const m = mk(R, new THREE.PlaneGeometry(2.2, 2.4), lmat({ color: '#0a0806' }), -286, 1.2, -42.6); m.rotation.y = 0; }
  add('dp_candle_big', -285, -40.6, 0, 1.2); add('mk_Chest_Wood', -287.4, -41.2, 0.3, 0.9);
  // crypt lever behind the chapel
  add('mk_Chain_Coil', 90, -255.4, 0, 0.9); { const lv = mk(R, geo('sc_lever', () => new THREE.BoxGeometry(0.08, 0.9, 0.08)), tmat('#3a3d40', { metalness: 0.7 }), 90, 0.9 + gy(90, -253.6), -253.6); lv.rotation.z = 0.5; }
  // lookout: a tall trunk, a ladder, a platform
  { const tr = mk(R, geo('sc_trunk', () => new THREE.CylinderGeometry(0.5, 0.7, 9, 8)), tmat('#5a3b24'), -238, 4.5, -123.4); tr.castShadow = true; TOWN.obst.push({ x: -238, z: -123.4, r: 0.8 }); }
  for (let i = 0; i < 12; i++) mk(R, geo('sc_rung', () => new THREE.BoxGeometry(0.6, 0.05, 0.05)), tmat('#7a5a36'), -238, 0.4 + i * 0.55, -122.7);
  for (const sx of [-0.3, 0.3]) mk(R, geo('sc_rail', () => new THREE.BoxGeometry(0.06, 6.8, 0.06)), tmat('#6a4a2a'), -238 + sx, 3.4, -122.7);
  mk(R, geo('sc_plat', () => new THREE.BoxGeometry(3, 0.2, 3)), tmat('#6e4d31'), -238, 7, -123.4); add('kf_tree_1_c', -238, -123.4, 0, 1.6, 6);
  // the wreck in the reeds
  { const hull = mk(R, geo('sc_hull', () => new THREE.SphereGeometry(1.4, 10, 6, 0, TAU, 0, Math.PI / 2)), tmat('#5a4630'), 226, 0.1, 128); hull.scale.set(1, 0.5, 2.4); hull.rotation.x = Math.PI + 0.25; TOWN.obst.push({ x: 226, z: 128, r: 1.8 }); }
  for (let i = 0; i < 10; i++) add('cr_grass_1', 222 + (i % 5) * 2, 124 + Math.floor(i / 5) * 6, i, 1.6);
  // cellar steps in the ward
  mk(R, geo('sc_hatch', () => new THREE.BoxGeometry(1.8, 0.08, 1.4)), tmat('#4a3422'), -16, 0.05 + gy(-16, -290), -290); add('mk_Barrel', -18, -291, 0, 1); add('mk_Barrel', -14, -291.5, 0.4, 1);
  // the smugglers' grate low in the bailey's west wall (and a hint scrawled by the mill)
  mk(R, geo('sc_grate', () => new THREE.BoxGeometry(0.1, 0.9, 1.4)), tmat('#2a2d30', { metalness: 0.8 }), -110.6, 0.5, -200).rotation.y = 0.3;
  for (const S of SECRETS) {
    const lab = new THREE.Object3D();
    TOWN.stalls.push({ V: { key: 's:' + S.key, name: S.name, role: 'Hidden place', icon: '✨' }, g: lab, npc: null, ry: 0, x: S.x, z: S.z, ax: S.x, az: S.z, label: lab, secret: S, open: () => findSecret(S), verb: S.verb });
  }
}
function findSecret(S) {
  CAREER.found = CAREER.found || {};
  if (S.peek) secretPeek();
  if (CAREER.found[S.key]) { toastMenu(`${S.name}: you’ve been here before.`); return; }
  CAREER.found[S.key] = Date.now();
  const s = shopState(), give1 = ([slot, key]) => { s.owned['wd:' + slot + ':' + key] = 1; return LOOKS[slot].find(x => x[0] === key)[1]; };
  const got = [give1(S.look)]; if (S.look2) got.push(give1(S.look2));
  for (const m in S.loot) give(m, S.loot[m]);
  if (S.item) bagAdd(S.item, 1);
  bagAdd('old_coin', 3 + Math.floor(Math.random() * 6));
  saveCareer();
  const n = Object.keys(CAREER.found).length;
  ACHQ.push({ name: S.name, desc: `Found! ${got.join(' and ')} ${got.length > 1 ? 'are' : 'is'} yours, free. (${n} of ${SECRETS.length} hidden places)`, kicker: 'Hidden place' }); if (!ACHQ.busy) showAch();
  AU.cheer && AU.cheer(0.8);
  if (n === SECRETS.length && typeof unlock === 'function') try { unlock('explorer', true); } catch (e) { }
}
// the grate: a look into the bailey from outside, a few seconds long (uses the spectator camera)
function secretPeek() {
  const A = { name: 'The Outer Bailey', x: -74, z: -200, indoor: false };
  TOWN.peek = 3.5; TOWN.peekAt = A;
}
function renderSecrets(box) {
  const n = SECRETS.filter(S => secretFound(S.key)).length;
  box.append(h('h4', null, `Hidden places: ${n} of ${SECRETS.length}`));
  const el = h('div', { class: 'secrets' });
  for (const S of SECRETS) el.append(h('div', { class: 'small ' + (secretFound(S.key) ? '' : 'muted') }, secretFound(S.key) ? `✨ ${S.name}: found.` : `❔ ${S.hint}`));
  box.append(el);
}

