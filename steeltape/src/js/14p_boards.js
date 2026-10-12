// Spawn scoreboards: real BuhurtOS-account career results and signed-in online heartbeats.
// The public endpoint never exposes user IDs or visitor records.
const BOARDS = {
  data: null, error: '', faces: {}, nextPoll: 0, inflight: null, heartbeat: null,
};
const BOARDS_URL = BOS_URL + '/functions/v1/steeltape-boards';

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
  ctx.fillText(online ? 'Updated from player activity • 2-minute window' : 'Signed-in match results • refreshed live', W / 2, 680);
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
  BOARDS.nextPoll = Date.now() + 30000;
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
  })();
  try { await BOARDS.inflight; } finally { BOARDS.inflight = null; }
}
function boardTick() {
  if (!TOWN.on || document.hidden || G.autoflow || G.autopilot || location.hash === '#autotest') return;
  if (!BOARDS.inflight && Date.now() >= BOARDS.nextPoll) boardFetch(false);
}
function boardOpen(kind) {
  const online = kind === 'online', rows = ((BOARDS.data || {})[online ? 'online' : 'leaderboard'] || []);
  townPanel(online ? 'Fighters currently online' : 'Hall of Champions', box => {
    box.append(h('p', { class: 'vhi' }, online
      ? 'Signed-in accounts active within the last two minutes. This is not a list of NPCs.'
      : 'Global all-time game victories recorded for signed-in fighters. Highest wins rank first.'));
    if (BOARDS.error) box.append(h('p', { class: 'muted' }, BOARDS.error + '. Showing the last available results.'));
    if (!rows.length) box.append(h('p', { class: 'muted' }, online ? 'Nobody is online right now.' : 'No career wins have been recorded yet.'));
    else {
      box.append(h('div', { class: 'ups shop' },
        ...rows.map((p, i) => h('div', { class: 'up' },
          h('div', null, h('b', null, (online ? '● ' : '#' + (i + 1) + '  ') + p.name),
            h('div', { class: 'muted small' }, online ? 'Level ' + p.level : p.wins + ' wins · ' + p.matches + ' matches · Level ' + p.level))))));
    }
    box.append(h('button', { class: 'btn primary flagtape', onclick: async () => {
      AU.click(); await boardFetch(true); if (TOWN.on && G.screen === 'townShop') boardOpen(kind);
    } }, 'Refresh board'));
  });
}

function buildSpawnBoards() {
  BOARDS.faces = {}; BOARDS.nextPoll = 0;
  const spots = [
    { kind: 'leaderboard', x: -6.5, z: 39.5, title: 'Hall of Champions', sub: 'All-time career wins', col: '#deb978' },
    { kind: 'online', x: 6.5, z: 39.5, title: 'Fighters Online', sub: 'Who is playing now', col: '#7ecb8c' },
  ];
  for (const spot of spots) {
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
    mk(g, geo('sb_face', () => new THREE.PlaneGeometry(4.8, 3.4)),
      lmat({ map: tex, side: THREE.DoubleSide, roughness: 0.96 }), 0, 3.1, 0.19);
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
}

function boardsStartHeartbeat() {
  if (BOARDS.heartbeat) return;
  const beat = () => {
    if (!BOS.user || document.hidden || G.autoflow || G.autopilot || location.hash === '#autotest') return;
    sendEvent('heartbeat', { level: CAREER.level || 1 });
  };
  BOARDS.heartbeat = setInterval(beat, 35000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
}
