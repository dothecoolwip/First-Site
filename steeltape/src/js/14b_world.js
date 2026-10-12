// ---------- the living town: Kenney props, the gate (giant, marshal, notice board, crier), the wardrobe, pets, a haunted graveyard,
// a windmill, townsfolk, and other players walking around online. Models: Kenney Fantasy Town, Nature and Graveyard kits (CC0).
const KMAT = {};
function kmat(m) {
  const key = m.n + m.c.join(',') + m.a;
  return KMAT[key] || (KMAT[key] = lmat({ color: new THREE.Color(m.c[0], m.c[1], m.c[2]).convertSRGBToLinear(), roughness: 0.85, flatShading: true, transparent: m.a < 1, opacity: m.a, emissive: /water/i.test(m.n) ? '#0a3a4a' : /flame|fire|light|candle|glow/i.test(m.n) ? '#ff8a20' : '#000000' }));
}
const PMAT = { m: null };
const SRGB_LIN = Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
function b64(s, T) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); }
function kpiece(parent, key, x, y, z, ry = 0, s = 1) {
  const pk = (typeof PACK_GEO !== 'undefined' && PACK_GEO[key]) || (typeof DECOR_GEO !== 'undefined' && DECOR_GEO[key]) || (typeof REALM_GEO !== 'undefined' && REALM_GEO[key]) || (typeof CASTLE_GEO !== 'undefined' && CASTLE_GEO[key]);
  if (pk) { // Slavic World / PolygonSight models: one mesh with vertex colours
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); parent.add(g);
    const gg = geo('pack:' + key, () => { const b = new THREE.BufferGeometry(); const P = b64(pk.p, Int16Array), F = new Float32Array(P.length); for (let i = 0; i < P.length; i++) F[i] = P[i] / 1000; b.setAttribute('position', new THREE.BufferAttribute(F, 3)); const C8 = b64(pk.c, Uint8Array), CF = new Float32Array(C8.length); for (let i = 0; i < C8.length; i++) CF[i] = SRGB_LIN[C8[i]]; b.setAttribute('color', new THREE.BufferAttribute(CF, 3)); b.setIndex(new THREE.BufferAttribute(b64(pk.i, pk.b ? Uint32Array : Uint16Array), 1)); b.computeVertexNormals(); b.computeBoundingSphere(); return b; });
    PMAT.m = PMAT.m || lmat({ vertexColors: true, roughness: 0.9, flatShading: true });
    const me = new THREE.Mesh(gg, PMAT.m); me.castShadow = SHADOWS; me.receiveShadow = true; g.add(me); return g;
  }
  const src = typeof KENNEY_GEO !== 'undefined' && KENNEY_GEO[key]; if (!src) return null;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); parent.add(g);
  src.mats.forEach((m, i) => {
    const gg = geo('ken:' + key + i, () => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(m.v.map(q => q / 1000), 3)); b.setIndex(m.i); const nb = b.toNonIndexed(); nb.computeVertexNormals(); return nb; });
    const me = new THREE.Mesh(gg, kmat(m)); me.castShadow = SHADOWS && m.a >= 1; me.receiveShadow = true; g.add(me);
  });
  return g;
}
const WORLD = { spin: [], bob: [], flick: [], walkers: [], others: {}, pet: null, lastTw: 0 };

// ---- the wardrobe: what you wear walking around town (free basics; the rest is for sale)
const LOOKS = {
  hat: [['none', 'No hat', 0], ['cap', 'Flat cap', 0], ['helm', 'Your fight helmet', 0], ['hood', 'Hood', 200], ['flowers', 'Flower crown', 800], ['wizard', 'Wizard hat', 1500], ['horns', 'Horned helmet', 3000], ['crown', 'Golden crown', 25000], ['pumpkin', 'Pumpkin head', 2500, 'ghost']],
  cape: [['none', 'No cape', 0], ['club', 'Club cape', 0], ['royal', 'Royal cape', 2000], ['shadow', 'Shadow cape', 5000], ['shroud', 'Ghostly shroud', 7000, 'ghost']],
  hand: [['weapon', 'Your weapon', 0], ['none', 'Empty hands', 0], ['torch', 'Torch', 300], ['lantern', 'Candle lantern', 400], ['banner', 'Club banner', 600], ['lute', 'Lute', 900], ['scythe', 'Scythe', 4000, 'ghost']],
  outfit: [['none', 'Club tunic', 0, '', 'Plain, in your club colours. Free.'], ['Male_Peasant|peasant', 'Linen shirt and breeches', 1200, '', 'A festival classic. Boots, belt and rolled sleeves.'], ['Female_Peasant|peasant', 'Leather bodice and skirt', 1200, '', 'Laced bodice, long skirt, practical boots.'], ['Male_Peasant|peasant2', 'Smith\u2019s dark garb', 1800, '', 'Dark shirt and breeches. Hides soot and mead.'], ['Female_Peasant|peasant2', 'Dark bodice dress', 1800, '', 'The evening version, for the tavern.'], ['Male_Ranger|ranger', 'Ranger leathers', 4500, '', 'Hooded leathers, pauldron and belts. Very mysterious.'], ['Female_Ranger|ranger', 'Ranger leathers (fitted)', 4500, '', 'Hood, pauldrons, belts. Even more mysterious.'], ['Male_Ranger|ranger2', 'Forest ranger', 6000, '', 'Green and brown, for blending into hedges.'], ['Female_Ranger|ranger2', 'Forest ranger (fitted)', 6000, '', 'Green and brown, fitted. Hedges beware.']],
  pet: [['none', 'No pet', 0], ['dog', 'Dog', 2000], ['pumpkin', 'Pumpkin buddy', 1500], ['ghost', 'Little ghost', 5000, 'ghost'], ['skeleton', 'Skeleton', 4000, 'ghost'], ['zombie', 'Zombie', 6000, 'ghost'], ['vampire', 'Vampire', 8000, 'ghost']]
};
const LOOK_SLOT = { hat: 'Hats', cape: 'Capes', hand: 'In your hand', pet: 'Pets', outfit: 'Outfits' };
function lookState() { const s = shopState(), d = { hat: 'cap', cape: 'club', hand: 'weapon', pet: 'none', body: '', trim: '' }; const L = s.look || (s.look = {}); for (const k in d) if (L[k] == null) L[k] = d[k]; return L; }
function lookOwned(slot, key) { const it = LOOKS[slot].find(x => x[0] === key); return !!it && ((it[2] === 0 && it[3] !== 'hidden') || !!shopState().owned['wd:' + slot + ':' + key]); }
function lookLite() { const L = lookState(); return { b: L.body || CAREER.club.tabard, t: L.trim || CAREER.club.trim, h: L.hat, c: L.cape, p: L.pet, n: L.hand, o: L.outfit && L.outfit !== 'none' ? L.outfit : '', s: L.skin || '', d: L.dye ? 1 : 0 }; }
function dress(J, L) {
  const head = (J.bones && J.bones.Head) || J.torso || J.root, ual = !!J.ual, hy = ual ? 0.12 : 0.72;
  const club = { tabard: L.b, trim: L.t };
  const hat = grp(head, 0, hy, 0);
  if (L.h === 'cap') { mk(hat, geo('w_cap', () => new THREE.CylinderGeometry(0.115, 0.12, 0.08, 14)), tmat(L.t), 0, 0.04, 0); mk(hat, geo('w_brim', () => new THREE.BoxGeometry(0.2, 0.015, 0.12)), tmat(L.t), 0, 0.005, 0.1); }
  else if (L.h === 'hood') mk(hat, geo('w_hood', () => new THREE.SphereGeometry(0.15, 14, 10, 0, TAU, 0, Math.PI * 0.62)), tmat(L.b), 0, -0.02, -0.02);
  else if (L.h === 'flowers') for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; mk(hat, geo('w_fl', () => new THREE.SphereGeometry(0.028, 8, 6)), tmat(['#ff6fa0', '#ffd24d', '#ffffff', '#9b7bff'][i % 4]), Math.cos(a) * 0.115, 0.03, Math.sin(a) * 0.115); }
  else if (L.h === 'helm') { try { const hd = grp(hat, 0, ual ? -0.1 : -0.7, 0); buildHelmet(hd, (G.loadout && G.loadout.helm) || 'pigface'); } catch (e) { } }
  else if (L.h === 'wizard') { mk(hat, geo('t_hat', () => new THREE.ConeGeometry(0.16, 0.5, 14)), tmat('#2a1a5a'), 0, 0.22, 0); mk(hat, geo('t_brim', () => new THREE.CylinderGeometry(0.27, 0.27, 0.02, 18)), tmat('#2a1a5a'), 0, 0, 0); }
  else if (L.h === 'horns') { const st = tmat('#9aa3a8', { metalness: 0.6, roughness: 0.4 }); mk(hat, geo('w_dome', () => new THREE.SphereGeometry(0.135, 14, 10, 0, TAU, 0, Math.PI / 2)), st, 0, 0, 0); for (const sx of [-1, 1]) { const h2 = mk(hat, geo('w_horn', () => new THREE.ConeGeometry(0.035, 0.2, 8)), tmat('#efe6cf'), sx * 0.15, 0.07, 0); h2.rotation.z = -sx * 0.9; } }
  else if (L.h === 'crown') { const gold = tmat('#e3b341', { metalness: 0.8, roughness: 0.25 }); mk(hat, geo('w_crown', () => new THREE.CylinderGeometry(0.12, 0.12, 0.07, 16, 1, true)), gold, 0, 0.04, 0).material.side = THREE.DoubleSide; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; mk(hat, geo('w_spk', () => new THREE.ConeGeometry(0.022, 0.07, 6)), gold, Math.cos(a) * 0.115, 0.1, Math.sin(a) * 0.115); } mk(hat, geo('w_gem', () => new THREE.OctahedronGeometry(0.022)), tmat('#ff3d5a', { emissive: '#7a0010' }), 0, 0.05, 0.122); }
  else if (L.h === 'hermit') { mk(hat, geo('w_hood', () => new THREE.SphereGeometry(0.15, 14, 10, 0, TAU, 0, Math.PI * 0.62)), tmat('#5a4630'), 0, -0.02, -0.02); mk(hat, geo('w_hpt', () => new THREE.ConeGeometry(0.06, 0.16, 8)), tmat('#5a4630'), 0, 0.02, -0.15).rotation.x = -1.2; }
  else if (L.h === 'crypt') { try { const hd = grp(hat, 0, ual ? -0.1 : -0.7, 0); buildHelmet(hd, 'greathelm'); hd.traverse(o => { if (o.isMesh) o.material = tmat('#bfe6ff', { emissive: '#3a7aa0', emissiveIntensity: 0.7, transparent: true, opacity: 0.8 }); }); } catch (e) { } }
  else if (L.h === 'smuggler') { mk(hat, geo('w_mask', () => new THREE.CylinderGeometry(0.118, 0.118, 0.05, 16, 1, true)), tmat('#111214'), 0, -0.06, 0).material.side = THREE.DoubleSide; }
  else if (L.h === 'pumpkin') { const p = kpiece(hat, 'pumpkinCarved', 0, -0.15, 0, 0, 0.55); if (p) p.traverse(o => { if (o.isMesh && /orange|pumpkin/i.test(o.material.name || '')) o.material = tmat('#ff7a1a', { emissive: '#7a2a00' }); }); }
  // cape: hung from the shoulders, sways a little
  if (L.c && L.c !== 'none') {
    const col = L.c === 'royal' ? '#9b111e' : L.c === 'shadow' ? '#111214' : L.c === 'shroud' ? '#e8f4ff' : L.c === 'ranger' ? '#2f5a2a' : L.c === 'courtier' ? '#5b2a86' : L.b;
    const cp = new THREE.Group(); cp.position.set(0, 1.42, -0.16); J.root.add(cp);
    const cm = lmat({ color: col, roughness: 0.9, side: THREE.DoubleSide, transparent: L.c === 'shroud', opacity: L.c === 'shroud' ? 0.55 : 1, emissive: L.c === 'shroud' ? '#2a4a6a' : '#000000' });
    const cape = mk(cp, geo('w_cape', () => { const g2 = new THREE.PlaneGeometry(0.42, 0.8, 1, 4); const pa = g2.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i), x = pa.getX(i); pa.setX(i, x * (1 + (0.4 - y) * 0.35)); pa.setZ(i, -Math.abs(x) * 0.25); } g2.translate(0, -0.4, 0); g2.computeVertexNormals(); return g2; }), cm, 0, 0, 0); cape.rotation.x = 0.12; J.cape = cp;
    if (L.c === 'royal') mk(cp, geo('w_ctrim', () => new THREE.BoxGeometry(0.52, 0.04, 0.02)), tmat('#e3b341', { metalness: 0.7 }), 0, -0.84, 0.05);
  }
  // in your hand
  const hand = J.handR; if (hand && L.n !== 'none') {
    const it = grp(hand, 0, 0.08, 0.02); J.heldItem = it;
    if (L.n === 'weapon') { try { it.add(buildMyWeapon(G.loadout && G.loadout.weapon || 'sword', CLUBS.reavers)); } catch (e) { } }
    else if (L.n === 'torch') { mk(it, geo('w_tst', () => new THREE.CylinderGeometry(0.025, 0.02, 0.55, 6)), tmat('#5a3b24'), 0, 0.2, 0); const fl = mk(it, geo('w_flame', () => new THREE.ConeGeometry(0.06, 0.18, 8)), tmat('#ffb02e', { emissive: '#ff6a00', emissiveIntensity: 1.6 }), 0, 0.55, 0); WORLD.flick.push(fl); }
    else if (L.n === 'lantern') kpiece(it, 'lanternCandle', 0, -0.25, 0, 0, 0.6);
    else if (L.n === 'banner') { mk(it, geo('w_bp', () => new THREE.CylinderGeometry(0.02, 0.02, 1.9, 6)), tmat('#4a3422'), 0, 0.6, 0); const f = mk(it, geo('w_bf', () => new THREE.PlaneGeometry(0.55, 0.38)), lmat({ color: L.b, side: THREE.DoubleSide }), 0.28, 1.35, 0); WORLD.bob.push({ o: f, k: 'flag' }); }
    else if (L.n === 'lute') { mk(it, geo('t_lute', () => new THREE.SphereGeometry(0.15, 12, 10)), tmat('#a8743a'), 0, 0.12, 0).scale.z = 0.4; mk(it, geo('t_neck', () => new THREE.BoxGeometry(0.04, 0.4, 0.03)), tmat('#5a3b24'), 0, 0.4, 0); }
    else if (L.n === 'driftwood') { const c = mk(it, geo('w_drift', () => new THREE.CylinderGeometry(0.035, 0.07, 0.9, 7)), tmat('#b8a98c'), 0, 0.35, 0); c.rotation.z = 0.12; mk(it, geo('w_knot', () => new THREE.SphereGeometry(0.08, 7, 5)), tmat('#a89878'), 0.03, 0.78, 0); }
    else if (L.n === 'goblet') kpiece(it, 'mk_Chalice', 0, -0.02, 0, 0, 0.9);
    else if (L.n === 'scythe') { mk(it, geo('w_sh', () => new THREE.CylinderGeometry(0.02, 0.02, 1.7, 6)), tmat('#3a2a1a'), 0, 0.5, 0); const bl = mk(it, geo('w_sb', () => new THREE.BoxGeometry(0.6, 0.08, 0.015)), tmat('#c9d2d6', { metalness: 0.8, roughness: 0.3 }), -0.28, 1.32, 0); bl.rotation.z = -0.35; }
  }
  return J;
}
function makePet(kind) {
  if (!kind || kind === 'none') return null;
  const g = new THREE.Group();
  if (kind === 'dog') {
    const fur = tmat('#a8743a'), dk = tmat('#5a3b24');
    mk(g, geo('p_body', () => new THREE.BoxGeometry(0.22, 0.2, 0.5)), fur, 0, 0.32, 0); mk(g, geo('p_head', () => new THREE.BoxGeometry(0.2, 0.2, 0.22)), fur, 0, 0.48, 0.3);
    mk(g, geo('p_snout', () => new THREE.BoxGeometry(0.1, 0.09, 0.1)), dk, 0, 0.44, 0.44); for (const sx of [-1, 1]) mk(g, geo('p_ear', () => new THREE.BoxGeometry(0.05, 0.1, 0.06)), dk, sx * 0.08, 0.6, 0.27);
    g.legs = []; for (const [lx, lz] of [[-0.08, 0.18], [0.08, 0.18], [-0.08, -0.18], [0.08, -0.18]]) { const l = mk(g, geo('p_leg', () => { const c = new THREE.CylinderGeometry(0.035, 0.035, 0.24, 6); c.translate(0, -0.12, 0); return c; }), fur, lx, 0.25, lz); g.legs.push(l); }
    const tail = mk(g, geo('p_tail', () => new THREE.CylinderGeometry(0.02, 0.03, 0.22, 6)), fur, 0, 0.42, -0.3); tail.rotation.x = -0.8; g.tail = tail;
  } else if (kind === 'pumpkin') kpiece(g, 'pumpkinCarved', 0, 0, 0, 0, 0.7);
  else kpiece(g, kind, 0, 0, 0, 0, kind === 'ghost' ? 0.8 : 0.85);
  g.kind = kind; return g;
}
// ---- decoration: the festival layout lives in 14d_festival.js
function townDecor(R) { buildFestival(R); }
// ---- the gate: a giant with the Rumble scroll, the list marshal, the notice board, the town crier; your house door
const STATIONS = [
  { key: 'giant', name: 'Ulfric the Giant', role: 'Rumble herald', icon: '📜', at: [-7, 26] },
  { key: 'marshal', name: 'Marshal Brenna', role: 'Enter the lists', icon: '⚔️', at: [7, 26] },
  { key: 'board', name: 'Notice board', role: 'Daily, Gauntlet, Season', icon: '📌', at: [13.5, 26.5] },
  { key: 'crier', name: 'Wilf the Crier', role: 'Online fights and friends', icon: '🔔', at: [-13.5, 26.5] },
  { key: 'house', name: 'Your house', role: 'Your fighter', icon: '🚪', at: [HOME_AT[0], HOME_AT[1] - 5.8] },
  { key: 'stables', name: 'Edda the Stablehand', role: 'Hire or buy a horse', icon: '🐴', at: [9, 84], ry: -Math.PI / 2 }
];
function buildStations() {
  for (const st of STATIONS) {
    const [x, z] = st.at, ry = st.ry != null ? st.ry : st.key === 'house' ? Math.PI : 0; // gate folk face the market; the house door faces the fountain
    const g = new THREE.Group(); g.position.set(x, gy(x, z), z); g.rotation.y = ry; TOWN.root.add(g);
    let npc = null, labY = 2.5, reach = 1.9;
    if (st.arena || st.practice) {
      const tall = st.service === 'giant';
      npc = costumeOr({ main: st.col, joints: '#302b28', h: tall ? 2.15 : 1.68 + st.look * 0.1, anim: st.service === 'crier' ? 'Idle_Talking_Loop' : 'Idle_Loop' },
        { outfit: st.service === 'marshal' ? 'Female_Ranger' : st.look === 2 ? 'Female_Peasant' : 'Male_Peasant', tex: st.service === 'marshal' ? 'ranger' : 'peasant', tint: st.col,
          skin: ['#a97453', '#d2a67e', '#8f614a'][st.look] });
      g.add(npc.root); TOWN.obst.push({ x, z, r: 0.5 });
      if (st.service === 'giant' && npc.handR) {
        const sc = grp(npc.handR, 0, 0.08, 0.03);
        mk(sc, geo('arena_scroll', () => new THREE.CylinderGeometry(0.06, 0.06, 0.38, 10)), tmat('#e9dfc6'), 0, 0, 0);
      }
      if (st.service === 'crier' && npc.handR) {
        const bell = grp(npc.handR, 0, 0.06, 0);
        mk(bell, geo('arena_bell', () => new THREE.ConeGeometry(0.08, 0.14, 10)), tmat('#d2aa54'), 0, 0.14, 0);
      }
      labY = tall ? 2.9 : 2.5;
    } else if (st.key === 'giant') {
      npc = costumeOr({ main: '#5a4632', joints: '#3a2a1a', h: 4.4, anim: 'Idle_Loop' }, { outfit: 'Male_Peasant', tex: 'peasant', tint: '#e8d2b0', skin: '#c68a62' }); g.add(npc.root);
      if (npc.handR) { const sc = grp(npc.handR, 0, 0.1, 0.05); mk(sc, geo('g_scroll', () => new THREE.CylinderGeometry(0.07, 0.07, 0.42, 12)), tmat('#e9dfc6'), 0, 0, 0); for (const sy of [-0.23, 0.23]) mk(sc, geo('g_knob', () => new THREE.SphereGeometry(0.045, 8, 6)), tmat('#7a1f2a'), 0, sy, 0); mk(sc, geo('g_seal', () => new THREE.CylinderGeometry(0.035, 0.035, 0.02, 10)), tmat('#b0182a'), 0.07, 0, 0).rotation.z = Math.PI / 2; }
      const beard = mk((npc.bones && npc.bones.Head) || npc.root, geo('g_beard', () => new THREE.ConeGeometry(0.11, 0.25, 10)), tmat('#d9c9a8'), 0, npc.ual ? 0.0 : 0.6, 0.09); beard.rotation.x = Math.PI;
      labY = 5.3; reach = 2.6; TOWN.obst.push({ x, z, r: 1.1 });
    } else if (st.key === 'marshal') {
      npc = typeof UAL !== 'undefined' && UAL.ready ? ualMarshal('knight') : townPerson({ main: '#26344d' }); g.add(npc.root); TOWN.obst.push({ x, z, r: 0.5 });
    } else if (st.key === 'board') {
      for (const sx of [-0.9, 0.9]) mk(g, geo('b_post', () => new THREE.CylinderGeometry(0.07, 0.08, 2.4, 6)), tmat('#4a3422'), sx, 1.2, 0);
      const c = cvs(512, 340), cx = c.getContext('2d'); cx.fillStyle = '#7a5a36'; cx.fillRect(0, 0, 512, 340); cx.fillStyle = '#f1e8cf';
      [[30, 40, 200, 130], [260, 30, 220, 150], [60, 200, 180, 110], [280, 210, 190, 100]].forEach(([a, b, w, hh]) => { cx.fillRect(a, b, w, hh); }); cx.fillStyle = '#3a2a1a'; cx.font = '900 34px "Big Shoulders Display", sans-serif';
      cx.fillText('RUMBLE OF', 44, 90); cx.fillText('THE DAY', 44, 128); cx.fillText('GAUNTLET', 280, 85); cx.fillText('RUN', 280, 125); cx.fillText('SUMMER', 75, 250); cx.fillText('SEASON', 75, 288); cx.fillText('WANTED:', 295, 255); cx.fillText('FIGHTERS', 295, 290);
      mk(g, geo('b_board', () => new THREE.BoxGeometry(2.2, 1.5, 0.08)), lmat({ map: texFrom(c), roughness: 0.9 }), 0, 1.75, 0);
      labY = 3.0; reach = 1.6; TOWN.obst.push({ x, z, r: 1.1 });
    } else if (st.key === 'crier') {
      npc = costumeOr({ main: '#7a1f2a', joints: '#e3b341', h: 1.76, anim: 'Idle_Talking_Loop' }, { outfit: 'Male_Peasant', tex: 'peasant', tint: '#ffb8b0' }); g.add(npc.root); TOWN.obst.push({ x, z, r: 0.5 });
      if (npc.handR) { const b = grp(npc.handR, 0, 0.06, 0.02); mk(b, geo('c_bell', () => new THREE.ConeGeometry(0.08, 0.14, 12, 1, true)), tmat('#e3b341', { metalness: 0.8, roughness: 0.3 }), 0, 0.16, 0).material.side = THREE.DoubleSide; }
      const hat = grp((npc.bones && npc.bones.Head) || npc.root, 0, npc.ual ? 0.13 : 0.72, 0); mk(hat, geo('c_tri', () => new THREE.ConeGeometry(0.2, 0.12, 3)), tmat('#111214'), 0, 0.04, 0);
    } else if (st.key === 'house') { labY = 3.3; reach = 1.5; }
    else if (st.knight) { npc = typeof UAL !== 'undefined' && UAL.ready ? ualMarshal('knight') : townPerson({ main: '#26344d' }); g.add(npc.root); TOWN.obst.push({ x, z, r: 0.5 }); }
    else if (st.key === 'stables') {
      npc = costumeOr({ main: '#6a5a3a', joints: '#3a2a1a', h: 1.7, anim: 'Idle_Loop' }, { outfit: 'Female_Peasant', tex: 'peasant', tint: '#d8c6a0' }); g.add(npc.root); TOWN.obst.push({ x, z, r: 0.5 });
      landmark(TOWN.root, () => { const b = kpiece(TOWN.root, 'fb_openbarn', x + 9, 0, z, -Math.PI / 2, 1.4); if (b) TOWN.obst.push({ x: x + 9, z, r: 4.5 }); });
      kpiece(TOWN.root, 'fb_fence', x + 3, 0, z + 6, 0, 1.2); kpiece(TOWN.root, 'fb_fence', x + 3, 0, z - 6, 0, 1.2);
    }
    const lab = townLabel(st.name, `${st.icon} ${st.role}`, st.key === 'giant' ? '#e3b341' : '#f2c40f'); lab.position.set(0, labY, 0); g.add(lab);
    const fx = Math.sin(ry), fz = Math.cos(ry);
    TOWN.stalls.push({ V: st, g, npc, ry, x, z, ax: x + fx * reach, az: z + fz * reach, label: lab, open: () => openStation(st.key), station: true });
  }
}
// townsfolk with things to do: see 14c_folk.js
function buildWalkers() { buildFolk(); }
function freeSpot() {
  for (let t = 0; t < 60; t++) {
    const a = rand(0, TAU), r = rand(22, 80), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (arenaBlocked(x, z, 1.5)) continue;
    if (Math.hypot(x / FAIR_RX, z / FAIR_RZ) > 0.92) continue;
    if (TOWN.obst.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 1.2)) continue;
    return { x, z };
  }
  return { x: 0, z: 30 };
}
function buildWorld() {
  WORLD.spin = []; WORLD.bob = []; WORLD.flick = []; WORLD.others = {}; WORLD.pet = null;
  townDecor(TOWN.root); buildStations(); buildWalkers();
}
// ---- every frame: sails, flames, ghosts, walkers, your pet, other players
function updateWorld(dt) {
  const t = G.realTime;
  for (const s of WORLD.spin) s.rotation.z += dt * 0.6;
  for (const f of WORLD.flick) { const k = 0.85 + Math.sin(t * 17 + f.id) * 0.08 + Math.sin(t * 29 + f.id * 3) * 0.07; f.scale.set(k, k * (1 + Math.sin(t * 11 + f.id) * 0.12), k); }
  for (const b of WORLD.bob) {
    if (b.k === 'float') { b.o.position.y = 1 + Math.sin(t * 1.3 + b.ph) * 0.35; b.o.position.x = b.cx + Math.sin(t * 0.4 + b.ph) * 2.2; b.o.position.z = b.cz + Math.cos(t * 0.33 + b.ph) * 1.6; b.o.rotation.y = t * 0.5 + b.ph; }
    else if (b.k === 'sway') b.o.rotation.z = Math.sin(t * 1.4 + b.ph) * 0.08;
    else if (b.k === 'flag') b.o.rotation.y = Math.sin(t * 2.2) * 0.25;
  }
  updateFolk(dt);
  // your cape sways when you move; your pet follows at your heel
  const me = TOWN.me; if (me && me.cape) me.cape.rotation.x = 0.1 + Math.min(0.5, (TOWN.speed || 0) * 0.09) + Math.sin(t * 3) * 0.03;
  const P = WORLD.pet; if (P) {
    const back = TOWN.face + Math.PI, tx = TOWN.pos.x + Math.sin(back) * 1.2 + Math.sin(TOWN.face + Math.PI / 2) * 0.7, tz = TOWN.pos.z + Math.cos(back) * 1.2 + Math.cos(TOWN.face + Math.PI / 2) * 0.7;
    const dx = tx - P.position.x, dz = tz - P.position.z, d = Math.hypot(dx, dz), mv = d > 0.15;
    if (d > 12) { P.position.x = tx; P.position.z = tz; }
    else if (mv) { const sp = Math.min(d * 3.2, 7); P.position.x += dx / d * sp * dt; P.position.z += dz / d * sp * dt; P.rotation.y += (Math.atan2(dx, dz) - P.rotation.y + Math.PI * 3) % TAU - Math.PI > 0 ? 0 : 0; P.rotation.y = Math.atan2(dx, dz); }
    if (P.kind === 'ghost') P.position.y = 0.6 + Math.sin(t * 2) * 0.15;
    else if (P.kind === 'pumpkin') P.position.y = mv ? Math.abs(Math.sin(t * 9)) * 0.3 : 0;
    else if (P.kind === 'dog') { P.legs.forEach((l, i) => { l.rotation.x = mv ? Math.sin(t * 14 + (i % 2 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * 0.6 : 0; }); P.tail.rotation.z = Math.sin(t * 12) * 0.5; }
    else P.rotation.z = mv ? Math.sin(t * 8) * 0.12 : 0;
  }
  updateOthers(dt);
}
function buildMyPet() { if (WORLD.pet) TOWN.root.remove(WORLD.pet); WORLD.pet = makePet(lookState().pet); if (WORLD.pet) { WORLD.pet.position.set(TOWN.pos.x - 1, gy(TOWN.pos.x, TOWN.pos.z), TOWN.pos.z - 1); TOWN.root.add(WORLD.pet); } }
// ---- other players online, walking around their own town: shown here as they move
function townPresence() {
  if (!TOWN.on) { if (WORLD.lastTw) { lobbySet({ tw: null }); WORLD.lastTw = 0; } return; }
  if (G.realTime - WORLD.lastTw < 1) return; WORLD.lastTw = G.realTime;
  lobbySet({ tw: { x: Math.round(TOWN.pos.x * 10) / 10, z: Math.round(TOWN.pos.z * 10) / 10, f: Math.round(TOWN.face * 100) / 100, mine: !!TOWN.mineOn, l: lookLite(), g: guildTag() } });
}
function updateOthers(dt) {
  townPresence();
  const seen = {};
  for (const p of (LOBBY.peers || [])) {
    const tw = p.presence && p.presence.tw; if (!tw || typeof tw.x !== 'number') continue;
    seen[p.peer] = 1; let O = WORLD.others[p.peer];
    if (!O) {
      const L = tw.l || {}; const J = lookPerson({ b: L.b, t: L.t, h: L.h, c: L.c, n: L.n, o: L.o, s: L.s, d: L.d }, 1.8);
      const nm = String(p.presence.name || 'A fighter').slice(0, 20), lab = townLabel(nm, (tw.g ? `[${tw.g}] ` : '') + 'online now', '#7fb6ff'); lab.position.y = 2.35; J.root.add(lab);
      J.root.position.set(tw.x, tw.mine ? DEEP_MINE.y : gy(tw.x, tw.z), tw.z); TOWN.root.add(J.root);
      O = WORLD.others[p.peer] = { J, x: tw.x, z: tw.z, mine: !!tw.mine, f: tw.f || 0, p, lk: JSON.stringify(tw.l || {}) };
      TOWN.stalls.push({ V: { key: 'p:' + p.peer, name: nm, role: 'Online player', icon: '🟢' }, g: J.root, npc: null, ry: 0, x: tw.x, z: tw.z, ax: tw.x, az: tw.z, label: lab, mine: !!tw.mine, open: () => { AU.click(); openProfile(O.p, () => { showScreen(null); refreshTouchUI(); townPrompt(); }); }, player: p.peer });
    }
    if (O.lk !== JSON.stringify(tw.l || {})) { TOWN.root.remove(O.J.root); delete WORLD.others[p.peer]; TOWN.stalls = TOWN.stalls.filter(s2 => s2.player !== p.peer); continue; } // they changed clothes: rebuild next frame
    O.p = p; if (O.mine !== !!tw.mine) { O.x = tw.x; O.z = tw.z; O.mine = !!tw.mine; } const k = Math.min(1, dt * 4), ox = O.x, oz = O.z;
    O.x += (tw.x - O.x) * k; O.z += (tw.z - O.z) * k; O.f = tw.f || O.f;
    O.J.root.position.set(O.x, O.mine ? DEEP_MINE.y : gy(O.x, O.z), O.z); O.J.root.rotation.y = O.f; O.J.root.visible = O.mine === !!TOWN.mineOn;
    const sp = Math.hypot(O.x - ox, O.z - oz) / Math.max(dt, 1e-3);
    if (O.J.ual) { O.J.play(sp > 3.5 ? 'Jog_Fwd_Loop' : sp > 0.3 ? 'Walk_Loop' : 'Idle_Loop', 0.25); O.J.mixer.update(dt); }
    const S = TOWN.stalls.find(s => s.player === p.peer); if (S) { S.x = S.ax = O.x; S.z = S.az = O.z; S.mine = O.mine; }
  }
  for (const id in WORLD.others) if (!seen[id]) { TOWN.root.remove(WORLD.others[id].J.root); delete WORLD.others[id]; TOWN.stalls = TOWN.stalls.filter(s => s.player !== id); }
}
// ---- what the gate folk say and offer
function townPanel(title, fill) {
  AU.click(); TOWN.vendor = null;
  const box = $('#townShopBody'); box.innerHTML = '';
  $('#townShopHead').innerHTML = '';
  $('#townShopHead').append(h('button', { class: 'back', 'data-back': '', 'data-gp': 'B', 'aria-label': 'Back', onclick: e => { e.stopPropagation(); AU.click(); closeVendor(); } }, h('span', null, '‹ Back')), h('h2', { class: 'ttape tape mk' }, title));
  fill(box); box.scrollTop = 0;
  showScreen('townShop'); $('#townPrompt').hidden = true; refreshTouchUI();
}
function stationRows(box, hi, rows) {
  box.append(h('p', { class: 'vhi' }, hi));
  const list = h('div', { class: 'ups shop' }); box.append(list);
  for (const [name, desc, label, fn, hidden] of rows) { if (hidden) continue; list.append(h('div', { class: 'up' }, h('div', null, h('div', { class: 'uph' }, h('b', null, name)), h('div', { class: 'muted' }, desc)), h('button', { class: 'btn primary flagtape small', onclick: () => { AU.click(); fn(); } }, label))); }
  return list;
}
// leave town and press one of the (hidden) title buttons: every mode keeps working exactly as before
function townGo(btn, from) { TOWN.returnTo = from; leaveTown(() => { const b = $('#' + btn); if (b) b.click(); }); }
function openStation(key) {
  const S = STATIONS.find(s => s.key === key);
  const service = S && S.service || key;
  const go = btn => { if (S && S.arena) G.quickVenue = S.arena === 'dome' ? 'field' : S.arena; townGo(btn, key); };
  if (key === 'stables') { townPanel('The stables', box => stableRows(box)); return; }
  if (key === 'sergeant') { stationTrial('bailey'); return; }
  if (key === 'captain') { stationTrial('royal'); return; }
  if (service === 'training') { townPanel('Coach Sigrid · Fairground Training Yard', box => stationRows(box,
    '“Step through the practice gate. Pells first, then a sparring partner. No clock, no cards.”',
    [['Start lessons', 'Learn movement, guard, strikes, clinch and throws in the practice list.', 'Train', () => townGo('btnTrain', key)]])); return; }
  if (service === 'giant') townPanel(S && S.arena ? S.name + ' · ' + ARENAS.find(a => a.key === S.arena).name : 'The Red Deer Rumble', box => stationRows(box, 'Sign the scroll and enter the tournament. Two fights, one title, all the glory!', [
    ['Sign up for the Rumble', 'A semi-final and a final, with repair breaks and a kit check. The big prize money is here.', 'Sign the scroll', () => go('btnRumble')],
    ['Continue the Rumble', 'Pick up where you left off.', 'Continue', () => go('btnContinue'), !store.get('tourney', null)],
    ['Rumble of the Day', 'One fight, the same for everyone today. Keep your streak going.', 'Fight today’s', () => go('btnDaily')]]));
  else if (service === 'marshal') townPanel(S && S.arena ? S.name + ' · ' + ARENAS.find(a => a.key === S.arena).name : 'Enter the lists', box => stationRows(box, '“Kit checked? Straps taped? Then step into the lists. Pick your fight.”', [
    ['Quick fight', '1v1 up to 12v12, any arena, any weapons.', 'Quick fight', () => go('btnQuick')],
    ['Duel Ladder', 'Climb the rungs one duel at a time. Each rung pays more.', 'Duel Ladder', () => go('btnLadder')],
    ['Training Yard', 'Learn the moves against the pells and a sparring partner.', 'Train', () => go('btnTrain')],
    ['Gauntlet run', 'Five fights in a row. Your kit damage carries over.', 'Run it', () => go('btnRun')],
    ['Summer season', 'Six stops around central Alberta and a league table.', 'Season', () => go('btnSeason')]]));
  else if (key === 'board') townPanel('Notice board', box => {
    stationRows(box, 'Notices pinned with daggers. Someone has drawn a moustache on the Wanted poster.', [
      ['Rumble of the Day', 'Today’s fight is the same for everyone.', 'Fight', () => townGo('btnDaily', 'board')],
      ['Gauntlet run', 'Five fights, damage carries, boons between fights.', 'Run', () => townGo('btnRun', 'board')],
      ['Summer season', 'Sign veterans, tape well, top the table.', 'Season', () => townGo('btnSeason', 'board')]]);
    try { const C = challenges(); const all = [...(C.daily || []), ...(C.weekly || [])]; if (all.length) { box.append(h('h4', null, 'Challenges')); for (const c of all) box.append(h('p', { class: 'muted small' }, `${c.done ? '✓ ' : ''}${c.text || c.desc || ''}`)); } } catch (e) { }
  });
  else if (service === 'crier') townPanel(S && S.arena ? S.name + ' · Online' : 'Online', box => {
    const n = (LOBBY.peers || []).length, inTown = Object.keys(WORLD.others).length;
    stationRows(box, `“HEAR YE! ${n ? `${n} fighter${n === 1 ? '' : 's'} online right now${inTown ? `, ${inTown} of them here in town` : ''}!` : 'Nobody else online just now, but they’ll come!'} Fight them, invite your friends, start a guild!”`, [
      ['Play online', 'Find a match, open a lobby for up to 20, invite a friend by link.', 'Go online', () => { TOWN.returnTo = key; openOnlineHub(); }],
      ['Find a match', 'Join an open lobby, or open one and wait.', 'Find a match', () => { TOWN.returnTo = key; findMatch(); }],
      ['Start a guild with friends', 'Guildmaster Osric on the west side handles guilds.', 'Show me', () => { closeVendor(); townWalkTo('guild'); }]]);
    if (n) { box.append(h('h4', null, 'Online now')); for (const p of LOBBY.peers) box.append(h('div', { class: 'up' }, h('div', null, h('b', null, String(p.presence.name || 'A fighter').slice(0, 20)), h('div', { class: 'muted' }, `${p.presence.tw ? 'in town' : String(p.presence.st || 'online')}${p.presence.tw && p.presence.tw.g ? ` · [${p.presence.tw.g}]` : ''}`)), h('button', { class: 'btn tape small', onclick: () => openProfile(p, () => openStation(key)) }, 'Profile'))); }
  });
  else if (key === 'house') townPanel(shopState().home ? 'Your ' + HOMES[shopState().home].name.toLowerCase() : 'Your plot', box => stationRows(box, shopState().home ? 'Home sweet home. Your trophies, your skills, your record.' : 'An empty plot with your name on it. Wendell the land agent can build you a house.', [
    ['Your fighter', 'Skills, profile, progress, awards and your record.', 'Open', () => { TOWN.returnTo = 'house'; openCareer(); }],
    ['Settings', 'Controls, sound, graphics, your BuhurtOS account.', 'Settings', () => { TOWN.returnTo = 'house'; G.backTo = 'title'; showScreen('settings'); }],
    ['How to play', 'Every move and rule.', 'Read', () => { TOWN.returnTo = 'house'; G.backTo = 'title'; showScreen('howto'); }]]));
  else if (S) toastMenu(S.name);
}
// ---- guilds with friends: made at the Guildmaster, shared over the online lobby
function guildState() { return CAREER.guild || null; }
function guildTag() { const g = guildState(); return g ? g.tag : ''; }
function guildCreate(name, tag) {
  name = String(name || '').trim().slice(0, 24); tag = String(tag || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (name.length < 3 || tag.length < 2) { toastMenu('A guild needs a name (3+ letters) and a tag (2–4 letters).'); return false; }
  if (!spend(2000, 'A guild charter')) return false;
  CAREER.guild = { id: Math.random().toString(36).slice(2, 10), name, tag, col: CAREER.club.tabard, owner: true, members: [myName()], since: Date.now() }; saveCareer();
  lobbySet({ gd: { id: CAREER.guild.id, name, tag, col: CAREER.guild.col } }); toastMenu(`[${tag}] ${name} is founded!`); return true;
}
function guildInvite(p) { const g = guildState(); if (!g) return; lobbySet({ ginv: { to: p.peer, id: g.id, name: g.name, tag: g.tag, col: g.col, from: myName(), at: Date.now() } }); toastMenu(`Guild invite sent to ${String(p.presence.name || 'them').slice(0, 20)}.`); }
function guildLeave() { CAREER.guild = null; saveCareer(); lobbySet({ gd: null }); toastMenu('You left the guild.'); }
// called from the lobby when presences change: guild invites to me, and who's in my guild
function guildCheck(peers) {
  const g = guildState();
  for (const p of peers) {
    const pr = p.presence || {}, inv = pr.ginv;
    if (inv && inv.to === LOBBY.me && inv.id && (!g || g.id !== inv.id)) {
      const key = 'g' + p.peer + inv.id + inv.at; if (LOBBY.seen[key]) continue; LOBBY.seen[key] = 1;
      const from = String(inv.from || pr.name || 'A friend').slice(0, 20), nm = String(inv.name).slice(0, 24), tag = String(inv.tag).slice(0, 4);
      msg('guild', `Join [${escTxt(tag)}] ${escTxt(nm)}?`, `<p><b>${escTxt(from)}</b> invited you to their guild.${g ? ` You'll leave [${escTxt(g.tag)}] ${escTxt(g.name)}.` : ''}</p>`,
        [['Join the guild', () => { CAREER.guild = { id: inv.id, name: nm, tag, col: inv.col || '#6d1b28', owner: false, members: [from, myName()], since: Date.now() }; saveCareer(); lobbySet({ gd: { id: inv.id, name: nm, tag, col: inv.col } }); toastMenu(`Welcome to [${tag}] ${nm}!`); if (TOWN.on) { showScreen(null); refreshTouchUI(); } else leaveScreen(); }, true], ['No thanks', () => { if (TOWN.on) { showScreen(null); refreshTouchUI(); } else leaveScreen(); }]]);
    }
    if (g && pr.gd && pr.gd.id === g.id) { const nm = String(pr.name || '').slice(0, 20); if (nm && !g.members.includes(nm)) { g.members.push(nm); saveCareer(); } }
  }
}
function guildOnline() { const g = guildState(); return g ? (LOBBY.peers || []).filter(p => p.presence && p.presence.gd && p.presence.gd.id === g.id) : []; }
function renderGuildSection(list, again) {
  const g = guildState();
  list.append(h('h4', null, 'Your guild (with friends)'));
  if (!g) {
    list.append(h('p', { class: 'muted small' }, 'Found a guild, then invite friends who are online. Your tag shows over your head in town.'));
    const nm = h('input', { class: 'smithname', maxlength: 24, placeholder: 'Guild name, e.g. The Tape Wolves' }), tg = h('input', { class: 'smithname', maxlength: 4, placeholder: 'TAG', style: 'text-transform:uppercase;max-width:90px' });
    list.append(h('div', { class: 'up' }, h('div', null, h('div', { class: 'uph' }, h('b', null, 'Found a guild')), h('div', { class: 'row fields' }, nm, tg), h('div', { class: 'muted' }, 'A guild charter costs $2,000.')),
      h('button', { class: 'btn primary flagtape small', onclick: () => { if (guildCreate(nm.value, tg.value)) again(); } }, 'Found it')));
    return;
  }
  const on = guildOnline();
  list.append(h('div', { class: 'up' }, h('div', null, h('div', { class: 'uph' }, h('span', { class: 'sw mini', style: `--c:${g.col}` }), h('b', null, `[${g.tag}] ${g.name}`), h('span', { class: 'tier' }, g.owner ? 'Founder' : 'Member')), h('div', { class: 'muted' }, `Members: ${g.members.join(', ')}. ${on.length} online now.`)),
    h('button', { class: 'btn tape small', onclick: () => { guildLeave(); again(); } }, 'Leave')));
  const others = (LOBBY.peers || []).filter(p => !(p.presence.gd && p.presence.gd.id === g.id));
  list.append(h('p', { class: 'muted small' }, others.length ? 'Invite someone who is online:' : 'Nobody else is online to invite right now. Send a friend the game link and invite them when they show up.'));
  for (const p of others.slice(0, 19)) list.append(h('div', { class: 'up' }, h('div', null, h('b', null, String(p.presence.name || 'A fighter').slice(0, 20)), h('div', { class: 'muted' }, p.presence.gd ? `In [${String(p.presence.gd.tag).slice(0, 4)}]` : 'No guild')), h('button', { class: 'btn primary flagtape small', onclick: () => guildInvite(p) }, 'Invite')));
}
// ---- the wardrobe counter (Madame Velour) and the ghost's spooky stock (Sir Reginald)
function renderWardrobe(list, again, spooky, row) {
  const L = lookState(), s = shopState();
  if (!spooky) {
    list.append(h('h4', null, 'Outfits'));
    list.append(h('p', { class: 'muted small' }, 'Real clothes for walking round the festival. Everyone in town sees what you wear.'));
    for (const [key, name, cost, , desc] of LOOKS.outfit) {
      const own = lookOwned('outfit', key), on = (L.outfit || 'none') === key;
      row(name, on ? 'Wearing' : own && cost ? 'Owned' : null, desc || (cost ? 'Buy once, wear any time.' : 'Free.'), on ? 'Wearing' : own ? 'Wear it' : `Buy ${fmtMoney(cost)}`, !on && (own || CAREER.purse >= cost),
        () => { if (!own) { if (!spend(cost, name)) return false; s.owned['wd:outfit:' + key] = 1; } L.outfit = key; saveCareer(); townDressMe(); }, on ? ' cur' : '', outfitThumb(key),
        own || !cost ? null : { skill: 'artificing', R: outfitMats(cost), apply: () => { s.owned['wd:outfit:' + key] = 1; L.outfit = key; townDressMe(); }, label: 'Sew it' });
    }
    list.append(h('h4', null, 'Colours'));
    const sw = (arr, k2, dflt) => { const r = h('div', { class: 'swatches' }); for (const c of arr) r.append(h('button', { class: 'sw', style: `--c:${c}`, 'aria-pressed': String((L[k2] || dflt) === c), 'aria-label': c, onclick: () => { L[k2] = c; saveCareer(); townDressMe(); again(); } })); return r; };
    list.append(h('div', { class: 'up vcard vwide' }, h('div', null, h('b', null, 'Body (and outfit dye)'), sw(TABARDS, 'body', CAREER.club.tabard))), h('div', { class: 'up vcard vwide' }, h('div', null, h('b', null, 'Trim'), sw(TRIMS, 'trim', CAREER.club.trim))),
      h('div', { class: 'up vcard vwide' }, h('div', null, h('b', null, 'Skin tone'), sw(SKIN_TONES, 'skin', SKIN_TONES[2]))));
    { const on = !!L.dye; row('Dye my outfit', on ? 'On' : null, 'Tints your outfit with your body colour. Free.', on ? 'Undye' : 'Dye it', true, () => { L.dye = !on; saveCareer(); townDressMe(); }); }
  }
  for (const slot of ['hat', 'cape', 'hand', 'pet']) {
    const items = LOOKS[slot].filter(it => spooky ? it[3] === 'ghost' : it[3] !== 'ghost' && (it[3] !== 'hidden' || lookOwned(slot, it[0]))); if (!items.length) continue;
    list.append(h('h4', null, LOOK_SLOT[slot]));
    for (const [key, name, cost] of items) {
      const own = lookOwned(slot, key), on = L[slot] === key;
      row(name, on ? 'Wearing' : own && cost ? 'Owned' : null, cost ? (own ? 'Yours.' : 'Buy once, wear any time.') : 'Free.', on ? 'Wearing' : own ? 'Wear' : `Buy ${fmtMoney(cost)}`, !on && (own || CAREER.purse >= cost),
        () => { if (!own) { if (!spend(cost, name)) return false; s.owned['wd:' + slot + ':' + key] = 1; } L[slot] = key; saveCareer(); townDressMe(); }, on ? ' cur' : '');
    }
  }
}
function townDressMe() { if (!TOWN.on) return; buildAvatar(); buildMyPet(); }
// the wardrobe tent and the ghost in the graveyard are vendors with their own little buildings
function buildSpecialVendors() {
  for (const V of VENDORS.filter(v => v.custom)) {
    const [x, z] = STALL_AT[V.key], ry = STALL_FACE[V.key] != null ? STALL_FACE[V.key] : Math.atan2(0 - x, 30 - z);
    const g = new THREE.Group(); g.position.set(x, gy(x, z), z); g.rotation.y = ry; TOWN.root.add(g);
    let npc;
    if (V.key === 'wardrobe') {
      kpiece(g, 'tent_detailedOpen', 0, 0, -1.4, Math.PI, 3.2);
      for (let i = 0; i < 3; i++) { const rack = grp(g, -1.6 + i * 1.6, 0, -2.4); mk(rack, geo('wd_rack', () => new THREE.BoxGeometry(1.2, 0.05, 0.05)), tmat('#4a3422'), 0, 1.8, 0); for (let j = 0; j < 3; j++) mk(rack, geo('wd_cl', () => new THREE.PlaneGeometry(0.32, 0.8)), lmat({ color: SHOP_TABARDS[(i * 3 + j) % SHOP_TABARDS.length][0], side: THREE.DoubleSide }), -0.4 + j * 0.4, 1.38, 0); }
      const mirror = mk(g, geo('wd_mirror', () => new THREE.PlaneGeometry(0.8, 1.7)), tmat('#cfe3f7', { metalness: 0.9, roughness: 0.05 }), 2.3, 1.1, -0.8); mirror.rotation.y = -0.6;
      npc = costumeOr({ main: V.col, joints: '#e3b341', h: 1.72, anim: 'Idle_Loop' }, vendorOutfit(V)); npc.root.position.set(0, 0, -0.6); g.add(npc.root);
      TOWN.obst.push({ x: x - Math.sin(ry) * 1.6, z: z - Math.cos(ry) * 1.6, r: 2.4 });
    } else {
      kpiece(g, 'gravestoneDecorative', -1.2, 0, -0.6, 0, 1.8); kpiece(g, 'lanternCandle', 1.1, 0, -0.4, 0, 2);
      npc = { root: kpiece(g, 'ghost', 0, 1.2, -0.5, 0, 2.2) || new THREE.Group(), ghost: true }; WORLD.bob.push({ o: npc.root, k: 'float', ph: 9, cx: 0, cz: -0.5 });
      TOWN.obst.push({ x, z, r: 1.4 });
    }
    const lab = townLabel(V.name, `${V.icon} ${V.role}`, V.awn); lab.position.set(0, V.key === 'ghost' ? 3.6 : 4.4, 0); g.add(lab);
    const fx = Math.sin(ry), fz = Math.cos(ry);
    TOWN.stalls.push({ V, g, npc, ry, x, z, ax: x + fx * 1.4, az: z + fz * 1.4, label: lab });
  }
}
