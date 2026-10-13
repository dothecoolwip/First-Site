// Spawn scoreboards: real BuhurtOS-account career results and signed-in online heartbeats.
// The public endpoint never exposes user IDs or visitor records.
const BOARDS = {
  data: null, error: '', faces: {}, nextPoll: 0, inflight: null, heartbeat: null,
};
const BOARDS_URL = BOS_URL + '/functions/v1/steeltape-boards';
const BOARD_SPOTS = [
  { kind: 'leaderboard', x: -2.2, z: 42, title: 'Hall of Champions', sub: 'All-time career wins', col: '#deb978' },
  { kind: 'online', x: 8, z: 42, title: 'Fighters Online', sub: 'Who is playing now', col: '#7ecb8c' },
];
function boardCrownPose(seat) {
  const board = BOARD_SPOTS[0], ry = Math.atan2(-board.x, 31 - board.z);
  const side = seat === 'king' ? 3.3 : -3.3, front = 0.4;
  return { x: board.x + Math.cos(ry) * side + Math.sin(ry) * front,
    z: board.z - Math.sin(ry) * side + Math.cos(ry) * front, ry };
}

function boardCrownPlaque(seat, name) {
  const c = cvs(768, 280), ctx = c.getContext('2d');
  ctx.fillStyle = '#312414'; ctx.fillRect(0, 0, 768, 280);
  ctx.strokeStyle = '#d8ae5d'; ctx.lineWidth = 14; ctx.strokeRect(8, 8, 752, 264);
  ctx.textAlign = 'center'; ctx.fillStyle = '#eac477';
  ctx.font = '900 104px "Big Shoulders Display", Georgia, serif'; ctx.fillText(seat.toUpperCase(), 384, 117);
  ctx.fillStyle = '#fff4dc'; ctx.font = '700 76px "Barlow Semi Condensed", sans-serif';
  ctx.fillText(String(name || 'Unclaimed').slice(0, 25), 384, 222, 704);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 0.66), lmat({ map: texFrom(c), roughness: 0.9 }));
  plaque.name = 'crownNamePlaque';
  return plaque;
}

function boardCrownStatues() {
  if (!TOWN.root || !THRONE.seats) return;
  for (const seat of ['king', 'queen']) {
    const holder = THRONE.seats[seat], signature = JSON.stringify([holder && holder.name, holder && holder.since, holder && holder.look]);
    if (BOARDS.statueSignatures && BOARDS.statueSignatures[seat] === signature && BOARDS.statues && BOARDS.statues[seat]?.parent === TOWN.root) continue;
    BOARDS.statueSignatures = BOARDS.statueSignatures || {}; BOARDS.statueSignatures[seat] = signature;
    const old = BOARDS.statues && BOARDS.statues[seat];
    if (old) TOWN.root.remove(old);
    const { x, z, ry } = boardCrownPose(seat);
    const g = new THREE.Group(); g.position.set(x, gy(x, z), z); g.rotation.y = ry;
    TOWN.root.add(g); BOARDS.statues = BOARDS.statues || {}; BOARDS.statues[seat] = g;
    mk(g, geo('crown_statue_base', () => new THREE.CylinderGeometry(0.8, 0.95, 0.8, 8)), tmat('#8b8171'), 0, 0.4, 0);
    const look = holder && holder.look;
    if (look) {
      const L = { b: look.b || '#6b5240', t: look.t || '#c8b99c', h: look.h || 'none', f: look.f || 'none', c: look.c || 'none', n: look.n || 'none', o: look.o || '', s: look.s || '', d: look.d || 0, e: look.e, w: look.w, g: look.g || (seat === 'queen' ? 'female' : 'male'), ha: look.ha, hc: look.hc, be: look.be, ec: look.ec, ht: look.ht, bd: look.bd, sh: look.sh };
      const J = lookPerson(L, 2.05 * (L.ht || 1.8) / 1.8); J.root.position.y = 0.82; g.add(J.root);
      if (J.mixer) J.mixer.update(0.6);
    } else {
      // An older title holder may not have an outfit record yet. Show a carved
      // placeholder until their next authenticated game visit captures it.
      const stone = tmat('#8b8984');
      mk(g, geo('crown_pending_body', () => new THREE.CylinderGeometry(0.27, 0.39, 1.3, 8)), stone, 0, 1.57, 0);
      mk(g, geo('crown_pending_head', () => new THREE.SphereGeometry(0.22, 12, 8)), stone, 0, 2.44, 0);
      const pending = townLabel('OUTFIT PENDING', 'Until the holder returns', '#aaa8a2');
      pending.name = 'crownOutfitPending';
      pending.position.set(0, 0.92, 1); g.add(pending);
    }
    // The crown floats above the copied outfit so the last-worn hat stays visible.
    const crown = mk(g, geo('crown_statue_ring', () => new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12, 1, true)), tmat('#e3b341'), 0, 3.04, 0);
    crown.material.side = THREE.DoubleSide;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; mk(g, geo('crown_statue_point', () => new THREE.ConeGeometry(0.035, 0.14, 6)), tmat('#e3b341'), Math.sin(a) * 0.15, 3.14, Math.cos(a) * 0.15); }
    const plaque = boardCrownPlaque(seat, holder?.name);
    plaque.position.set(0, 0.42, 0.94); g.add(plaque);
    const label = townLabel(seat.toUpperCase(), String(holder?.name || 'Unclaimed').slice(0, 25), '#deb978');
    label.position.set(seat === 'king' ? 0.28 : -0.28, 3.75, 0); g.add(label);
  }
}

function boardInk(ctx, kind) {
  const W = 1024, H = 720, online = kind === 'online';
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#412b1b'); bg.addColorStop(1, '#241811');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // Carved timber surround, weathered linen inset and iron corner straps.
  ctx.fillStyle = '#6c4a2b'; ctx.fillRect(18, 18, W - 36, H - 36);
  ctx.strokeStyle = '#9e7044'; ctx.lineWidth = 9; ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.fillStyle = '#151b1c'; ctx.fillRect(55, 57, W - 110, H - 116);
  ctx.strokeStyle = '#ab864d'; ctx.lineWidth = 4; ctx.strokeRect(65, 67, W - 130, H - 136);
  for (const x of [35, W - 35]) for (const y of [35, H - 35]) {
    ctx.fillStyle = '#292e30'; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8a078'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#deb978';
  ctx.font = '900 68px "Big Shoulders Display", Georgia, serif';
  ctx.fillText(online ? 'FIGHTERS ONLINE' : 'HALL OF CHAMPIONS', W / 2, 150);
  ctx.fillStyle = '#c5bfae'; ctx.font = '600 32px "Barlow Semi Condensed", sans-serif';
  ctx.fillText(online ? 'SIGNED-IN FIGHTERS IN THE REALM' : 'ALL-TIME CAREER WINS', W / 2, 194);
  ctx.fillStyle = '#9e7846'; ctx.fillRect(100, 215, W - 200, 3);
  ctx.textAlign = 'left';

  const D = BOARDS.data || {};
  const rows = online ? (D.online || []) : (D.leaderboard || []);
  if (BOARDS.error && !BOARDS.data) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#edc9b2';
    ctx.font = '600 39px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('BOARD TEMPORARILY UNAVAILABLE', W / 2, 345);
    ctx.fillText('Tap to try again', W / 2, 401);
    return;
  }
  if (!BOARDS.data) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#e2d1b0';
    ctx.font = '600 42px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('FETCHING LIVE RESULTS...', W / 2, 360);
    return;
  }
  if (online) {
    ctx.fillStyle = '#7ecb8c'; ctx.font = '800 34px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('● ' + (D.onlineCount || 0) + ' CURRENTLY ONLINE', 105, 270);
  } else {
    ctx.fillStyle = '#aaa89f'; ctx.font = '600 32px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('RANK', 103, 270);
    ctx.fillText('FIGHTER', 208, 270);
    ctx.textAlign = 'right'; ctx.fillText('WINS', 800, 270); ctx.fillText('LVL', 912, 270);
    ctx.textAlign = 'left';
  }
  if (!rows.length) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#e2d1b0';
    ctx.font = '600 40px "Barlow Semi Condensed", sans-serif';
    ctx.fillText(online ? 'Nobody online right now' : 'No ranked victories yet', W / 2, 382);
    ctx.font = '500 30px "Barlow Semi Condensed", sans-serif';
    ctx.fillText(online ? 'Be the first fighter here!' : 'Fight while signed in to earn a place', W / 2, 435);
  }
  rows.slice(0, 7).forEach((p, i) => {
    const y = 322 + i * 50;
    ctx.fillStyle = i % 2 ? '#20282a' : '#293031'; ctx.fillRect(94, y - 35, 836, 46);
    ctx.textAlign = 'left'; ctx.fillStyle = i < 3 ? '#e9c786' : '#f0e7d6';
    ctx.font = '700 36px "Barlow Semi Condensed", sans-serif';
    if (!online) ctx.fillText(String(i + 1) + '.', 108, y);
    ctx.fillText(String(p.name || 'A fighter').slice(0, 24), online ? 119 : 208, y, online ? 615 : 475);
    ctx.textAlign = 'right'; ctx.fillStyle = '#d7d3c6';
    if (!online) { ctx.fillText(String(p.wins || 0), 800, y); ctx.fillText(String(p.level || 1), 912, y); }
    else ctx.fillText('LVL ' + (p.level || 1), 913, y);
  });
  ctx.textAlign = 'center'; ctx.fillStyle = '#bda989'; ctx.font = '600 28px "Barlow Semi Condensed", sans-serif';
  const seats = THRONE.seats || {};
  ctx.fillText(online ? 'Live signed-in fighters • updates automatically'
    : `KING ${String(seats.king?.name || '—').slice(0, 18)}  •  QUEEN ${String(seats.queen?.name || '—').slice(0, 18)}`, W / 2, 680, 850);
}

function boardRedraw() {
  for (const kind of ['leaderboard', 'online']) {
    const face = BOARDS.faces[kind]; if (!face) continue;
    boardInk(face.c.getContext('2d'), kind);
    face.tex.needsUpdate = true;
  }
}

async function boardFetch(force) {
  if (BOARDS.inflight) return BOARDS.inflight;
  if (!force && Date.now() < BOARDS.nextPoll) return;
  BOARDS.nextPoll = Date.now() + 10000;
  BOARDS.inflight = (async () => {
    try {
      const r = await fetch(BOARDS_URL, { method: 'GET', cache: 'no-store', headers: { apikey: BOS_KEY } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      if (!Array.isArray(d.leaderboard) || !Array.isArray(d.online)) throw new Error('Invalid scoreboard response');
      BOARDS.data = d; BOARDS.error = '';
    } catch (e) {
      BOARDS.error = 'Scores unavailable'; BOARDS.nextPoll = Date.now() + 12000;
    }
    boardRedraw();
    const title = BOARDS.openKind === 'online' ? 'Fighters currently online' : 'Hall of Champions';
    if (BOARDS.openKind && TOWN.on && G.screen === 'townShop' && $('#townShopHead h2')?.textContent === title)
      boardOpen(BOARDS.openKind, true);
  })();
  try { await BOARDS.inflight; } finally { BOARDS.inflight = null; }
}
function boardTick() {
  if (!TOWN.on || document.hidden || G.autoflow || G.autopilot || location.hash === '#autotest') return;
  if (!BOARDS.inflight && Date.now() >= BOARDS.nextPoll) boardFetch(false);
  throneLoad(false);
}
function boardOpen(kind, silent = false) {
  BOARDS.openKind = kind;
  const online = kind === 'online', rows = ((BOARDS.data || {})[online ? 'online' : 'leaderboard'] || []);
  townPanel(online ? 'Fighters currently online' : 'Hall of Champions', box => {
    box.append(h('p', { class: 'vhi' }, online
      ? 'Signed-in fighters playing right now.'
      : 'Global all-time game victories recorded for signed-in fighters. Highest wins rank first.'));
    if (BOARDS.error) box.append(h('p', { class: 'muted' }, BOARDS.error + '. Showing the last available results.'));
    if (!rows.length) box.append(h('p', { class: 'muted' }, online ? 'Nobody is online right now.' : 'No career wins have been recorded yet.'));
    else {
      box.append(h('div', { class: 'ups shop' },
        ...rows.map((p, i) => h('div', { class: 'up' },
          h('div', null, h('b', null, (online ? '● ' : '#' + (i + 1) + '  ') + p.name),
            h('div', { class: 'muted small' }, online ? 'Level ' + p.level : p.wins + ' wins · ' + p.matches + ' matches · Level ' + p.level))))));
    }
    box.append(h('p', { class: 'muted small' }, 'Updates automatically while you are in the realm.'));
  }, silent);
}

function buildSpawnBoards() {
  BOARDS.faces = {}; BOARDS.nextPoll = 0; BOARDS.statues = {}; BOARDS.statueSignatures = {};
  TOWN.obst = TOWN.obst.filter(o => !o.crownStatue);
  for (const seat of ['king', 'queen']) {
    const { x, z } = boardCrownPose(seat);
    TOWN.obst.push({ x, z, r: 0.85, crownStatue: true });
  }
  for (const spot of BOARD_SPOTS) {
    const g = new THREE.Group();
    g.position.set(spot.x, gy(spot.x, spot.z), spot.z);
    const ry = Math.atan2(-spot.x, 31 - spot.z);
    g.rotation.y = ry;
    TOWN.root.add(g);
    const wood = tmat('#513820'), iron = tmat('#303638');
    for (const sx of [-2.25, 2.25]) {
      mk(g, geo('sb_post', () => new THREE.BoxGeometry(0.23, 5, 0.26)), wood, sx, 2.5, 0);
      const wx = spot.x + Math.cos(ry) * sx, wz = spot.z - Math.sin(ry) * sx;
      TOWN.obst.push({ x: wx, z: wz, r: 0.22 }); // Only the two posts block walking, not the entire sign.
    }
    mk(g, geo('sb_beam', () => new THREE.BoxGeometry(5.05, 0.22, 0.33)), wood, 0, 4.8, 0);
    mk(g, geo('sb_base', () => new THREE.BoxGeometry(5.05, 0.17, 0.32)), iron, 0, 1.35, 0);
    const c = cvs(1024, 720), tex = texFrom(c);
    const back = mk(g, geo('sb_back', () => new THREE.BoxGeometry(4.8, 3.4, 0.16)), wood, 0, 3.1, 0.09);
    back.name = 'scoreboardBacking';
    const front = mk(g, geo('sb_face', () => new THREE.PlaneGeometry(4.8, 3.4)),
      lmat({ map: tex, roughness: 0.96 }), 0, 3.1, 0.19);
    front.name = 'scoreboardFace';
    BOARDS.faces[spot.kind] = { c, tex };
    const lab = townLabel(spot.title, spot.sub, spot.col);
    lab.position.set(0, 5.6, 0.1); g.add(lab);
    const ax = spot.x + Math.sin(ry) * 1.5, az = spot.z + Math.cos(ry) * 1.5;
    TOWN.stalls.push({
      V: { key: 'scoreboard:' + spot.kind, name: spot.title, role: spot.sub, icon: '📜' },
      g, npc: null, ry, x: spot.x, z: spot.z, ax, az, label: lab,
      open: () => boardOpen(spot.kind), station: true,
    });
  }
  boardRedraw();
  throneLoad(true);
  boardFetch(true);
}

function boardsStartHeartbeat() {
  if (BOARDS.heartbeat) return;
  const beat = () => {
    if (!BOS.user || document.hidden || G.autoflow || G.autopilot || location.hash === '#autotest') return;
    sendEvent('heartbeat', { level: CAREER.level || 1 });
  };
  BOARDS.heartbeat = setInterval(beat, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
}

