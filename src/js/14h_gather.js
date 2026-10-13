// ===================================================================
// Gathering round the realm: ore in the quarry and the castle mine, marked trees in the Old Woods, herbs, flax, hides and bone.
// Walk up, press the prompt, then time three swings: the marker sweeps a bar and the green zone is the sweet spot.
// Good swings give more and teach you more. Worked-out nodes grow back after a while.
// ===================================================================
const GATHER = { on: null, nodes: [], t: 0, dir: 1, pos: 0, swings: [], anim: 0, actPrev: true, done: 0 };
// Reagents are spread across the realm: easy stuff round the fairground, the good stuff out in the districts,
// the best behind the castle walls. Each zone is [type, x, z, rx, rz, count]; spots are picked with a fixed seed so
// everyone's realm matches, keeping clear of roads, the lake, buildings and other nodes.
const NODE_ZONES = [
  // the fairground's edges: starter copper, ash, herbs and berries
  ['copper', 0, 10, 88, 92, 3], ['ash', 0, 10, 88, 92, 3], ['herb', 0, 10, 88, 92, 3], ['berry', 0, 10, 88, 92, 2], ['bone', 44, -56, 9, 8, 2],
  // the quarry in the Old Woods
  ['copper', -256, -42, 18, 20, 3], ['iron', -256, -42, 18, 20, 4], ['coal', -256, -42, 18, 20, 4], ['crystal', -262, -52, 10, 10, 1],
  // the Old Woods
  ['ash', -190, -60, 60, 70, 5], ['oak', -205, -80, 70, 85, 6], ['hickory', -230, -110, 50, 50, 5], ['herb', -200, -70, 70, 80, 3], ['berry', -170, -40, 40, 50, 3], ['bone', -250, -140, 14, 12, 2], ['hide', -250, -140, 12, 10, 2],
  // Millbrook: flax in the fields, hides at the farm
  ['flax', -205, 115, 40, 30, 6], ['hide', -235, 178, 22, 16, 3], ['berry', -150, 170, 40, 30, 3], ['herb', -160, 110, 50, 40, 2], ['ash', -130, 190, 40, 25, 2],
  // Mirror Lake: herbs on the shore, ore in the cliffs
  ['herb', 200, 40, 75, 100, 4], ['flax', 150, 0, 25, 30, 2], ['berry', 160, -30, 30, 30, 2], ['copper', 262, -40, 22, 34, 2], ['iron', 262, -40, 22, 34, 2], ['coal', 262, 100, 22, 30, 2],
  // the Outer Bailey: the mine shaft (silver, gold, crystal) and the castle orchard
  ['silver', 84, -282, 20, 14, 3], ['gold', 84, -282, 20, 14, 2], ['crystal', 84, -282, 20, 14, 2], ['iron', 84, -282, 20, 14, 2], ['coal', 84, -282, 20, 14, 1], ['oak', -84, -280, 20, 18, 2], ['herb', -84, -262, 20, 12, 2]
];
function nodeSites() {
  const rnd = seeded('realm-nodes-v1'), out = [];
  for (const [type, cx, cz, rx, rz, n] of NODE_ZONES) {
    let put = 0;
    for (let t = 0; t < 400 && put < n; t++) {
      const a = rnd() * TAU, r = Math.sqrt(rnd()), x = cx + Math.cos(a) * rx * r, z = cz + Math.sin(a) * rz * r;
      if (cx === 0 && cz === 10 && Math.hypot(x / FAIR_RX, z / FAIR_RZ) < 0.6) continue; // fairground nodes sit round the edge
      if (Math.abs(x - TRAINING_GROUND.x) < TRAINING_GROUND.bx + 2 && Math.abs(z - TRAINING_GROUND.z) < TRAINING_GROUND.bz + 2) continue;
      if (Math.hypot(x - DEEP_MINE.entrance[0], z - DEEP_MINE.entrance[1]) < 7) continue;
      if (Math.hypot(x / TOWN_RX, z / TOWN_RZ) > 0.93 || lakeIn(x, z, 3) || onRoad(x, z, 2) || navBlocked(x, z, 1.8)) continue;
      if (out.some(o => Math.hypot(o[1] - x, o[2] - z) < (o[0] === type ? 12 : 5))) continue;
      out.push([type, x, z, rnd() * TAU]); put++;
    }
  }
  return out;
}
function buildGatherNodes(R) {
  GATHER.nodes = [];
  nodeSites().forEach(([type, x, z, ry], i) => {
    const N = NODES[type]; if (!N) return;
    const g = new THREE.Group(); g.position.set(x, gy(x, z), z); g.rotation.y = ry || 0; R.add(g);
    const fruit = new THREE.Group(); g.add(fruit); // the part that disappears when you've worked it
    const col = N.col;
    if (N.skill === 'mining') {
      kpiece(g, i % 2 ? 'nt_boulder' : 'fy_rock_medium_4', 0, 0, 0, 0, i % 2 ? 1.5 : 1.1);
      const m = type === 'crystal' ? tmat(col, { emissive: '#2a7aa0', emissiveIntensity: 0.6, roughness: 0.2 }) : type === 'gold' ? tmat(col, { metalness: 0.9, roughness: 0.3 }) : tmat(col, { metalness: 0.5, roughness: 0.6 });
      const big = i % 2 ? 1.5 : 1.1;
      for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.4, r = big * (0.62 + (k % 2) * 0.3); const c = mk(fruit, geo('g_ore', () => new THREE.IcosahedronGeometry(0.2, 0)), m, Math.cos(a) * r, 0.12 + (k % 3) * 0.28, Math.sin(a) * r); c.rotation.set(k, k * 0.7, 0); c.scale.setScalar(0.9 + (k % 3) * 0.3); if (type === 'crystal') { c.scale.y = 2.2; c.rotation.set(0.2, k, 0.1); } }
      // a seam of the stuff across the rock face
      { const seam = mk(fruit, geo('g_seam', () => new THREE.TorusGeometry(0.5, 0.07, 6, 16)), m, 0, 0.7 * big, 0); seam.scale.set(big * 1.1, big * 0.8, big * 1.1); seam.rotation.set(1.2, 0.3, 0.5); }
      TOWN.obst.push({ x, z, r: 1.3 });
    } else if (N.skill === 'woodcut') {
      const tree = kpiece(fruit, type === 'hickory' ? 'tree_oak_dark' : type === 'oak' ? 'nt_oak' : 'nt_birch', 0, 0, 0, 0, type === 'hickory' ? 2.6 : 1.3);
      if (!tree) kpiece(fruit, 'tree', 0, 0, 0, 0, 2.6);
      kpiece(g, 'nt_stump', 0, 0, 0, 0, 1).visible = false; g.userData.stump = g.children[g.children.length - 1];
      // an axe blaze so you can tell it from the rest of the wood
      mk(g, geo('g_blaze', () => new THREE.BoxGeometry(0.22, 0.3, 0.05)), tmat('#f2d6a0'), 0, 1.1, 0.34);
      TOWN.obst.push({ x, z, r: 0.9 });
    } else if (type === 'herb') { kpiece(fruit, 'nt_fern', -0.3, 0, 0, 0, 1.4); kpiece(fruit, 'nt_flowers', 0.4, 0, 0.2, 1, 1.4); kpiece(g, 'nt_grass', 0, 0, -0.4, 0, 1.3); }
    else if (type === 'berry') { kpiece(g, 'slv_bush1', 0, 0, 0, 0, 1.2); const m = tmat('#6a2a8a', { roughness: 0.4 }); for (let k = 0; k < 9; k++) mk(fruit, geo('g_berry', () => new THREE.SphereGeometry(0.07, 8, 6)), m, Math.cos(k * 1.7) * 0.5, 0.5 + (k % 3) * 0.22, Math.sin(k * 1.7) * 0.5); TOWN.obst.push({ x, z, r: 0.8 }); }
    else if (type === 'flax') { const m = tmat('#d9c47a'); for (let k = 0; k < 14; k++) { const s = mk(fruit, geo('g_flax', () => new THREE.CylinderGeometry(0.012, 0.02, 0.9, 5)), m, (k % 5 - 2) * 0.22, 0.45, Math.floor(k / 5) * 0.25 - 0.25); s.rotation.z = Math.sin(k) * 0.15; const f = mk(fruit, geo('g_flaxf', () => new THREE.SphereGeometry(0.05, 6, 5)), tmat('#7fb0ff'), (k % 5 - 2) * 0.22, 0.92, Math.floor(k / 5) * 0.25 - 0.25); f.scale.y = 1.4; } }
    else if (type === 'hide') { const rk = kpiece(g, 'bf_armor_rack', 0, 0, 0, 0, 1); if (!rk) mk(g, geo('g_rack', () => new THREE.BoxGeometry(1.4, 0.06, 0.06)), tmat('#4a3422'), 0, 1.5, 0); const hd = mk(fruit, geo('g_hide', () => new THREE.PlaneGeometry(0.9, 1.1)), lmat({ color: '#7a4a22', roughness: 1, side: THREE.DoubleSide }), 0, 0.95, 0.12); hd.rotation.y = 0.1; TOWN.obst.push({ x, z, r: 0.8 }); }
    else if (type === 'bone') { kpiece(fruit, 'fy_cem_bones_group', 0, 0, 0, 0, 1.3); kpiece(g, 'nt_rocks', 0.6, 0, 0.4, 0, 1); TOWN.obst.push({ x, z, r: 0.9 }); }
    const lab = townLabel(N.name, `${TRADE_SKILLS[N.skill].icon} ${TRADE_SKILLS[N.skill].name} ${N.lvl}`, col); lab.position.y = N.skill === 'woodcut' ? 3.4 : 1.9; g.add(lab);
    const toC = Math.atan2(-x, -z), ax = x + Math.sin(toC) * 1.7, az = z + Math.cos(toC) * 1.7;
    const node = { id: type + i, type, N, g, fruit, x, z, ax, az, until: 0, lab };
    GATHER.nodes.push(node);
    TOWN.stalls.push({ V: { key: 'n:' + node.id, name: N.name, role: `${TRADE_SKILLS[N.skill].name} ${N.lvl}`, icon: TRADE_SKILLS[N.skill].icon }, g, npc: null, ry: toC + Math.PI, x, z, ax, az, label: lab, open: () => startGather(node), node, verb: N.skill === 'mining' ? 'Mine' : N.skill === 'woodcut' ? 'Chop' : 'Gather' });
  });
}
function gatherVerb(N) { return N.skill === 'mining' ? 'Mining' : N.skill === 'woodcut' ? 'Chopping' : 'Gathering'; }
function startGather(node) {
  const N = node.N, t = tradeState(), L = tradeLevel(N.skill), S = TRADE_SKILLS[N.skill];
  if (node.until > G.realTime) { toastMenu(`Worked out. ${N.name === 'Hides on the rack' ? 'More hides' : 'It'} comes back in ${Math.ceil(node.until - G.realTime)} s.`); return; }
  if (L < N.lvl) { toastMenu(`${N.name} needs ${S.name} ${N.lvl}. You're level ${L}: try something easier first.`); return; }
  if ((t.tools[S.tool] || 0) < N.tool) { toastMenu(`You need a ${TOOL_TIERS[N.tool].toLowerCase()} ${TOOLS[S.tool].name.toLowerCase()} for that. Make one at the furnace.`); return; }
  if (typeof bagRoom === 'function' && bagRoom(N.mat) <= 0) { toastMenu('Your bag is full. Make room first: smelt, forge, or drop a stack (Inventory).'); return; }
  AU.click();
  GATHER.on = node; GATHER.swings = []; GATHER.pos = 0; GATHER.dir = 1; GATHER.t = 0; GATHER.actPrev = true; GATHER.done = 0;
  // speed and sweet spot: harder nodes sweep faster, skill and a better tool widen the zone
  const tier = t.tools[S.tool] || 0;
  GATHER.speed = 1.1 + N.lvl / 28 - tier * 0.08; GATHER.zone = clamp(0.13 + L / 220 + tier * 0.02, 0.12, 0.34); GATHER.zoneAt = rand(0.3, 0.7);
  TOWN.busy = true; $('#townPrompt').hidden = true;
  holdTool(S.tool, tier);
  const J = TOWN.me; if (J && J.ual) { J.play('Idle_Loop', 0.2); const dx = node.x - TOWN.pos.x, dz = node.z - TOWN.pos.z; TOWN.face = Math.atan2(dx, dz); }
  gatherUI(true);
}
function gatherUI(show) {
  const el = $('#gather'); if (!el) return; el.hidden = !show; if (!show) return;
  const node = GATHER.on, N = node.N, S = TRADE_SKILLS[N.skill], P = tradeProgress(N.skill);
  el.innerHTML = '';
  const key = IN.mode === 'pad' ? 'A' : IN.mode === 'touch' ? 'Tap' : 'E';
  el.append(h('div', { class: 'gh' }, h('span', { class: 'gi' }, S.icon), h('div', null, h('b', null, `${gatherVerb(N)}: ${N.name}`), h('small', null, `${S.name} ${P.L} · ${Math.round(P.f * 100)}% to next`))),
    h('div', { class: 'gbar' }, h('i', { class: 'gzone', style: `left:${(GATHER.zoneAt - GATHER.zone / 2) * 100}%;width:${GATHER.zone * 100}%` }), h('i', { class: 'gmark' })),
    h('div', { class: 'gsw' }, ...[0, 1, 2].map(i => h('span', { class: 'gdot' }))),
    h('button', { class: 'btn primary flagtape gswing', onclick: e => { e.stopPropagation(); gatherSwing(); } }, h('kbd', null, key), ` Swing in the green`),
    h('button', { class: 'btn tape small gstop', onclick: e => { e.stopPropagation(); stopGather(false); } }, 'Stop'));
  el.onpointerdown = e => { if (e.target.closest('button')) return; gatherSwing(); };
}
function gatherSwing() {
  if (!GATHER.on || GATHER.swings.length >= 3 || GATHER.done) return;
  const d = Math.abs(GATHER.pos - GATHER.zoneAt), half = GATHER.zone / 2;
  const q = d <= half ? 1 : d <= half * 2.2 ? 0.5 : 0.15;
  GATHER.swings.push(q);
  const J = TOWN.me; if (J && J.ual && J.acts.Sword_Attack) { const a = J.acts.Sword_Attack; a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; a.setEffectiveWeight(1); a.fadeIn(0.05).play(); if (J.cur && J.acts[J.cur]) J.acts[J.cur].fadeOut(0.1); J.cur = 'Sword_Attack'; GATHER.anim = 0.9; }
  const N = GATHER.on.N; try { if (N.skill === 'mining') AU.clang(0.5 + q * 0.5, 0.9); else if (N.skill === 'woodcut') AU.thud(0.8, 0.9); else AU.wrap(); } catch (e) { }
  const dots = $$('#gather .gdot'); const i = GATHER.swings.length - 1; if (dots[i]) dots[i].classList.add(q === 1 ? 'hit' : q === 0.5 ? 'near' : 'miss');
  if (q === 1) { const gp = new THREE.Vector3(GATHER.on.x, 0.9, GATHER.on.z); try { sparks(gp, 10, 0.8, N.col); } catch (e) { } }
  if (GATHER.swings.length >= 3) { GATHER.done = 0.7; }
}
function finishGather() {
  const node = GATHER.on, N = node.N, S = TRADE_SKILLS[N.skill], t = tradeState(), tier = t.tools[S.tool] || 0, L = tradeLevel(N.skill);
  const qs = GATHER.swings, avg = qs.reduce((a, b) => a + b, 0) / 3, perfect = qs.every(q => q === 1);
  let n = N.n[0] + Math.floor(Math.random() * (N.n[1] - N.n[0] + 1)); if (avg < 0.4) n = Math.max(1, n - 1); if (perfect) n++; if (Math.random() < Math.min(0.5, L / 100 + tier * 0.08)) n++;
  const xp = N.xp * (0.55 + 0.45 * avg) * (1 + 0.06 * tier) * (perfect ? 1.25 : 1);
  n = give(N.mat, n); node.until = G.realTime + N.respawn; node.fruit.visible = false; if (node.g.userData.stump) node.g.userData.stump.visible = true; node.lab.visible = false;
  if (typeof playtestAction === 'function') playtestAction('gather', { material: N.mat, amount: n, skill: N.skill, quality: +avg.toFixed(2) });
  toast(`+${n} ${MATS[N.mat].name}`, perfect ? 'big' : 'good', perfect ? 'Three clean swings!' : avg >= 0.6 ? 'Good work.' : 'Sloppy, but it counts.');
  setTimeout(() => tradeGain(N.skill, xp), 500);
  stopGather(true);
}
function stopGather(finished) {
  if (!GATHER.on) return;
  GATHER.on = null; TOWN.busy = false; $('#gather').hidden = true; holdTool(null);
  const J = TOWN.me; if (J && J.ual) { J.cur = null; J.play('Idle_Loop', 0.2); }
  TOWN.actPrev = true; townPrompt(); refreshTouchUI();
  if (!finished) AU.click();
}
// the tool in your hand: pickaxe, felling axe or sickle, in the tier's metal
function holdTool(kind, tier) {
  const J = TOWN.me; if (!J) return;
  if (J.tool) { J.tool.parent && J.tool.parent.remove(J.tool); J.tool = null; }
  if (!kind || !J.handR) { if (J.heldItem) J.heldItem.visible = true; return; }
  if (J.heldItem) J.heldItem.visible = false;
  const metal = ['#8a7a6a', '#c8763a', '#8a8f94', '#d8e0e4'][tier || 0], mm = tmat(metal, { metalness: 0.7, roughness: 0.35 }), wood = tmat('#6e4d31');
  const g = new THREE.Group(); g.position.set(0, 0.08, 0.02);
  if (kind === 'pick') { mk(g, geo('tl_haft', () => new THREE.CylinderGeometry(0.016, 0.02, 0.8, 7)), wood, 0, 0.3, 0); const hd = mk(g, geo('tl_pick', () => new THREE.CylinderGeometry(0.02, 0.035, 0.5, 7)), mm, 0, 0.68, 0); hd.rotation.x = Math.PI / 2; }
  else if (kind === 'axe') { mk(g, geo('tl_haft2', () => new THREE.CylinderGeometry(0.016, 0.02, 0.7, 7)), wood, 0, 0.25, 0); const b = mk(g, geo('tl_axe', () => new THREE.BoxGeometry(0.03, 0.22, 0.2)), mm, 0, 0.56, 0.1); b.rotation.x = 0.2; }
  else { mk(g, geo('tl_grip', () => new THREE.CylinderGeometry(0.016, 0.018, 0.26, 7)), wood, 0, 0.06, 0); const c = mk(g, geo('tl_sickle', () => new THREE.TorusGeometry(0.14, 0.012, 6, 14, Math.PI * 1.2)), mm, 0, 0.28, 0.06); c.rotation.y = Math.PI / 2; }
  J.handR.add(g); J.tool = g;
}
function updateGather(dt) {
  // nodes grow back
  for (const n of GATHER.nodes) if (n.until && G.realTime > n.until) { n.until = 0; n.fruit.visible = true; if (n.g.userData.stump) n.g.userData.stump.visible = false; n.lab.visible = true; }
  if (!GATHER.on) return;
  if (G.screen) { stopGather(false); return; }
  if (GATHER.anim > 0) { GATHER.anim -= dt; if (GATHER.anim <= 0) { const J = TOWN.me; if (J && J.ual) { J.cur = null; J.play('Idle_Loop', 0.25); } } }
  if (GATHER.done) { GATHER.done -= dt; if (GATHER.done <= 0) { GATHER.done = 0; finishGather(); } return; }
  GATHER.pos += GATHER.dir * GATHER.speed * Math.min(dt, 1 / 30); if (GATHER.pos > 1) { GATHER.pos = 1; GATHER.dir = -1; } if (GATHER.pos < 0) { GATHER.pos = 0; GATHER.dir = 1; }
  const m = $('#gather .gmark'); if (m) m.style.left = (GATHER.pos * 100) + '%';
  const k = IN.keys, act = !!(PIN.brace || k.KeyE || k.Enter || k.Space || (typeof NIN !== 'undefined' && NIN.on && IN.edges.has('trip')));
  IN.edges.delete('trip');
  if (act && !GATHER.actPrev) gatherSwing();
  GATHER.actPrev = act;
  if (IN.edges.has('pause')) { IN.edges.delete('pause'); stopGather(false); }
}

