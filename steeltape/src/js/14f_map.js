// ===================================================================
// Town map: a top-down drawing of the festival with every vendor, station and online player on it.
// The big one opens from the Map button (tap to set a waypoint); a small one sits in the corner while you walk.
// North (the castle, -z) is up.
// ===================================================================
const TMAP = { mini: null, miniT: 0, hits: [], view: null };
const TMAP_PLACES = [
  ['The list', 0, 0], ['Market', 0, 46], ['Forge yard', -46, 28], ['Training yard', -39, -40], ['Tavern', 45, 14],
  ['Food stalls', 38, -8], ['Archery', 64, 10], ['Farm', 60, -16], ['Homes', -44, 48], ['Club camp', 46, 62], ['Graveyard', 44, -56], ['Pond', -56, 72], ['Festival gate', 0, 70]
];
function tmapMarkers() {
  const out = [];
  for (const S of TOWN.stalls || []) {
    if (S.player) { const O = WORLD.others && WORLD.others[S.player]; out.push({ x: O ? O.x : S.x, z: O ? O.z : S.z, icon: '', name: S.V.name, kind: 'player', S }); continue; }
    if (S.arena || (S.secret && !secretFound(S.secret.key))) continue;
    if (S.node) { out.push({ x: S.x, z: S.z, icon: '', name: S.V.name, role: S.V.role, kind: 'node', col: S.node.N.col, S }); continue; }
    out.push({ x: S.x, z: S.z, icon: S.V.icon || '•', name: S.V.name, role: S.V.role, kind: S.station ? 'station' : 'vendor', key: S.V.key, S });
  }
  return out;
}
// draw the realm into ctx. view = { cx, cz, scale (px per metre), w, h, labels, round }
function drawTownMap(ctx, view) {
  const { w, h: H, scale: k } = view, cx = view.cx, cz = view.cz;
  const X = x => w / 2 + (x - cx) * k, Y = z => H / 2 + (z - cz) * k;
  ctx.save(); ctx.clearRect(0, 0, w, H);
  if (view.round) { ctx.beginPath(); ctx.arc(w / 2, H / 2, Math.min(w, H) / 2 - 1, 0, Math.PI * 2); ctx.clip(); }
  ctx.fillStyle = '#3f6630'; ctx.fillRect(0, 0, w, H);
  // the realm's open country, then the fairground's trodden meadow
  ctx.fillStyle = '#6f9a4e'; ctx.beginPath(); ctx.ellipse(X(0), Y(0), TOWN_RX * k, TOWN_RZ * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7ea65a'; ctx.beginPath(); ctx.ellipse(X(0), Y(0), FAIR_RX * k, FAIR_RZ * k, 0, 0, Math.PI * 2); ctx.fill();
  // the woods
  ctx.fillStyle = 'rgba(38,70,34,.75)'; ctx.beginPath(); ctx.ellipse(X(-215), Y(-70), 72 * k, 92 * k, 0, 0, Math.PI * 2); ctx.fill();
  // the lake
  ctx.fillStyle = '#4f8fb8'; ctx.beginPath(); ctx.ellipse(X(LAKE.x), Y(LAKE.z), LAKE.rx * k, LAKE.rz * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8c690'; ctx.fillRect(X(LAKE.x - LAKE.rx - 14), Y(LAKE.z + 10), 16 * k, 60 * k);
  // roads
  ctx.strokeStyle = '#c2ac80'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const R of ROADS) { ctx.lineWidth = Math.max(1.5, R.w * k * 0.8); ctx.beginPath(); R.pts.forEach(([x, z], i) => i ? ctx.lineTo(X(x), Y(z)) : ctx.moveTo(X(x), Y(z))); ctx.stroke(); }
  // paths, yards and squares
  for (const [x0, x1, z0, z1, col] of TOWN.mapRects || []) { ctx.fillStyle = col || '#b9a37c'; ctx.fillRect(X(x0), Y(z0), (x1 - x0) * k, (z1 - z0) * k); }
  // the castle: the outer curtain, the inner ward, the Great Hall
  const wall = (B, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, lw * k); ctx.strokeRect(X(B.x0), Y(B.z0), (B.x1 - B.x0) * k, (B.z1 - B.z0) * k); };
  ctx.fillStyle = 'rgba(160,150,130,.35)'; ctx.fillRect(X(BAILEY.x0), Y(BAILEY.z0), (BAILEY.x1 - BAILEY.x0) * k, (BAILEY.z1 - BAILEY.z0) * k);
  ctx.fillStyle = 'rgba(190,170,120,.35)'; ctx.fillRect(X(WARD.x0), Y(WARD.z0), (WARD.x1 - WARD.x0) * k, (WARD.z1 - WARD.z0) * k);
  wall(BAILEY, '#6d6a66', 2.4); wall(WARD, '#7d776e', 2); ctx.fillStyle = '#8a8378'; ctx.fillRect(X(HALL.x0), Y(HALL.z0), (HALL.x1 - HALL.x0) * k, (HALL.z1 - HALL.z0) * k);
  for (const Gt of TOWN.gates || []) { const open = gateOpen(Gt.key); ctx.fillStyle = open ? '#d9c49a' : '#a8342c'; ctx.beginPath(); ctx.arc(X(Gt.x), Y(Gt.z), Math.max(3, 2.4 * k), 0, Math.PI * 2); ctx.fill(); }
  // the arenas: a live one pulses red
  for (const A of ARENAS) {
    if (A.key === 'hall' && k < 1.6) continue;
    ctx.fillStyle = A.key === 'dome' ? '#cbb994' : '#d9c49a'; ctx.fillRect(X(A.x - A.bx * 0.6), Y(A.z - A.bz * 0.6), A.bx * 1.2 * k, A.bz * 1.2 * k);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = Math.max(1, k * 0.5); ctx.strokeRect(X(A.x - A.bx * 0.6), Y(A.z - A.bz * 0.6), A.bx * 1.2 * k, A.bz * 1.2 * k);
    const live = arenaLive(A);
    if (live) { const r = Math.max(6, A.bx * k) * (1 + 0.15 * Math.sin(G.realTime * 5)); ctx.strokeStyle = '#ff4b3a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(X(A.x), Y(A.z), r, 0, Math.PI * 2); ctx.stroke(); }
  }
  // fighters in the bout right now
  if (typeof BOUT !== 'undefined' && BOUT.on) { const o = W3.matchRoot ? W3.matchRoot.position : { x: 0, z: 0 }; for (const f of G.fighters || []) { if (f.out) continue; ctx.fillStyle = f.club && f.club.tabard ? f.club.tabard : '#888'; ctx.beginPath(); ctx.arc(X(f.pos.x + o.x), Y(f.pos.z + o.z), Math.max(1.4, k * 0.5), 0, Math.PI * 2); ctx.fill(); } }
  if (typeof GRAVE !== 'undefined') { ctx.fillStyle = '#5d6b55'; ctx.fillRect(X(GRAVE.x - 7), Y(GRAVE.z - 6), 14 * k, 12 * k); }
  // your waypoint
  if (TOWN.wp) { ctx.strokeStyle = '#f2c40f'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(TRAVEL.startX != null ? TRAVEL.startX : TOWN.pos.x), Y(TRAVEL.startZ != null ? TRAVEL.startZ : TOWN.pos.z)); for (const [x, z] of TRAVEL.path || []) ctx.lineTo(X(x), Y(z)); if (!(TRAVEL.path || []).length) ctx.lineTo(X(TOWN.wp.x), Y(TOWN.wp.z)); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#f2c40f'; ctx.beginPath(); ctx.arc(X(TOWN.wp.x), Y(TOWN.wp.z), 5, 0, Math.PI * 2); ctx.fill(); }
  // place names: districts when zoomed out, the fairground's corners when zoomed in
  if (view.labels) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lab = (n, x, z, sz, col) => { ctx.font = `700 ${sz}px system-ui, sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,24,18,.75)'; ctx.strokeText(n, X(x), Y(z)); ctx.fillStyle = col; ctx.fillText(n, X(x), Y(z)); };
    for (const D of DISTRICTS) if (D.key !== 'fair' || k < 2) lab(D.name, D.x, D.z - (D.key === 'bailey' ? 64 : D.key === 'ward' ? -4 : 0) - (D.key === 'fair' ? 0 : 22), k < 2 ? 13 : 15, '#f7e7b8');
    for (const A of ARENAS) if (k >= 0.9) lab((arenaLive(A) ? '● ' : '') + A.name, A.x, A.z + A.bz * 0.6 + 7, 10, arenaLive(A) ? '#ff8a7a' : '#efe6cf');
    if (k >= 2) for (const [n, x, z] of TMAP_PLACES) lab(n, x, z, Math.round(clamp(k * 3.2, 10, 14)), '#f3ecd8');
  }
  // vendors, stations, other players (vendors only once you're zoomed in enough to tell them apart)
  const hits = []; const icon = Math.round(clamp(k * 4.2, 11, 22));
  for (const M of tmapMarkers()) {
    const px = X(M.x), py = Y(M.z);
    if (px < -20 || py < -20 || px > w + 20 || py > H + 20) continue;
    if (M.kind === 'node') { if (k < 0.9 && !view.round) continue; ctx.fillStyle = M.col; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, Math.max(2.2, k * 1.1), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); hits.push({ px, py, M }); continue; }
    if (M.kind === 'player') {
      ctx.fillStyle = '#36c2ff'; ctx.strokeStyle = '#0b1a22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, Math.max(3.5, k * 1.4), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (view.labels) { ctx.font = `700 ${Math.round(icon * 0.62)}px system-ui, sans-serif`; ctx.fillStyle = '#bfeaff'; ctx.textAlign = 'center'; ctx.fillText(M.name, px, py - icon * 0.8); }
    } else {
      if (k < 1.6 && !M.far) { if (!view.round) continue; }
      ctx.fillStyle = 'rgba(14,16,14,.72)'; ctx.beginPath(); ctx.arc(px, py, icon * 0.68, 0, Math.PI * 2); ctx.fill();
      ctx.font = `${icon}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(M.icon, px, py + 1);
    }
    hits.push({ px, py, M });
  }
  // you
  if (TOWN.pos) {
    const px = X(TOWN.pos.x), py = Y(TOWN.pos.z), f = TOWN.face || 0, s = Math.max(7, Math.min(12, k * 2.6)), dx = Math.sin(f), dy = Math.cos(f);
    ctx.fillStyle = '#ff3d3d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(px + dx * s, py + dy * s); ctx.lineTo(px - dx * s * 0.6 + dy * s * 0.6, py - dy * s * 0.6 - dx * s * 0.6); ctx.lineTo(px - dx * s * 0.25, py - dy * s * 0.25); ctx.lineTo(px - dx * s * 0.6 - dy * s * 0.6, py - dy * s * 0.6 + dx * s * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (view.round) { ctx.restore(); ctx.save(); ctx.strokeStyle = 'rgba(240,230,210,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w / 2, H / 2, Math.min(w, H) / 2 - 1, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#f3ecd8'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('N', w / 2, 9); }
  ctx.restore();
  return hits;
}
// is a fight on in this arena right now? (yours, or a real BuhurtOS fight mirrored there)
function arenaLive(A) { return !!((typeof BOUT !== 'undefined' && BOUT.on && TOWN.boutArena === A.key) || A.live); }
// the big map: drag to pan, pinch / wheel / buttons to zoom, tap a marker (or anywhere) to set a waypoint
function townMapCanvas() {
  const wrap = h('div', { class: 'tmapwrap' }), cv = h('canvas', { class: 'tmap', 'aria-label': 'Realm map. Drag to look around, tap to set a waypoint.' });
  const tip = h('div', { class: 'tmaptip muted small' }, 'Drag to look around, zoom with + and −. Tap a marker or any spot to set a waypoint; gold markers then lead you there.');
  const V = TMAP.view = TMAP.view || { cx: TOWN.pos.x, cz: TOWN.pos.z, k: 0 };
  const zb = (t, f) => h('button', { class: 'btn tape small', onclick: e => { e.stopPropagation(); f(); draw(); } }, t);
  const bar = h('div', { class: 'tmapbar' }, zb('−', () => V.k = Math.max(V.kmin, V.k / 1.5)), zb('+', () => V.k = Math.min(9, V.k * 1.5)), zb('Me', () => { V.cx = TOWN.pos.x; V.cz = TOWN.pos.z; V.k = Math.max(V.k, 2.4); }), zb('Realm', () => { V.k = V.kmin; V.cx = 0; V.cz = -5; }));
  wrap.append(bar, cv, tip);
  let W = 0, H = 0;
  const draw = () => {
    W = Math.max(260, Math.min(wrap.clientWidth || 640, 760)); H = Math.round(Math.min(W * 1.05, (window.innerHeight || 700) * 0.62)); const dpr = Math.min(2, window.devicePixelRatio || 1);
    V.kmin = Math.min(W / (TOWN_RX * 2 + 20), H / (TOWN_RZ * 2 + 20)); if (!V.k) { V.k = Math.max(V.kmin, 1.2); V.cx = TOWN.pos.x; V.cz = TOWN.pos.z; }
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    TMAP.hits = drawTownMap(ctx, { w: W, h: H, scale: V.k, cx: V.cx, cz: V.cz, labels: true });
  };
  const pts = new Map(); let moved = 0, pinch0 = 0, k0 = 0;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); k0 = V.k; } });
  cv.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    if (pts.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); V.k = clamp(k0 * d / (pinch0 || 1), V.kmin, 9); moved = 99; draw(); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy); p.x = e.clientX; p.y = e.clientY;
    if (moved > 6) { V.cx -= dx / V.k; V.cz -= dy / V.k; draw(); }
  });
  const up = e => {
    const had = pts.has(e.pointerId); pts.delete(e.pointerId); if (!had || moved > 6) return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 24; for (const H0 of TMAP.hits) { const d = Math.hypot(H0.px - x, H0.py - y); if (d < bd) { bd = d; best = H0; } }
    AU.click();
    if (best) {
      const M = best.M;
      if (M.kind === 'player') setWaypoint(M.x, M.z, M.name);
      else if (M.kind === 'node') setWaypoint(M.S.ax, M.S.az, M.name);
      else setWaypoint(M.S.ax, M.S.az, M.name);
    } else {
      const wx = V.cx + (x - W / 2) / V.k, wz = V.cz + (y - H / 2) / V.k;
      const A = ARENAS.find(a => Math.abs(wx - a.x) < a.bx && Math.abs(wz - a.z) < a.bz);
      if (A) setWaypoint(A.x, A.z + A.bz + 2, A.name);
      else if (Math.hypot(wx / TOWN_RX, wz / TOWN_RZ) < 0.98) setWaypoint(wx, wz, districtAt(wx, wz).name);
      else return;
    }
    tip.textContent = `Waypoint set: ${TOWN.wp.label}. Follow the gold markers.`; draw();
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => pts.delete(e.pointerId));
  cv.addEventListener('wheel', e => { e.preventDefault(); V.k = clamp(V.k * (e.deltaY < 0 ? 1.2 : 1 / 1.2), V.kmin || 0.4, 9); draw(); }, { passive: false });
  requestAnimationFrame(draw); setTimeout(draw, 120);
  return wrap;
}
// the corner minimap: follows you, redrawn a few times a second
function updateMiniMap(dt) {
  const cv = $('#townMini'); if (!cv) return;
  const show = TOWN.on && !G.screen && G.settings.minimap !== false; cv.hidden = !show; if (!show) return;
  TMAP.miniT -= dt; if (TMAP.miniT > 0) return; TMAP.miniT = 0.2;
  const S = cv.clientWidth || 120, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== S * dpr) { cv.width = S * dpr; cv.height = S * dpr; }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawTownMap(ctx, { w: S, h: S, scale: S / (TOWN.mounted ? 150 : 100), cx: TOWN.pos.x, cz: TOWN.pos.z, labels: false, round: true });
}
