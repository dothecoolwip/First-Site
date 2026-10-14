// ===================================================================

// Town map: a top-down drawing of the festival with every vendor, station and online player on it.

// The big one opens from the Map button (tap to set a waypoint); a small one sits in the corner while you walk.

// North (the castle, -z) is up.

// ===================================================================

const TMAP = { mini: null, miniT: 0, hits: [], view: null };

const TMAP_PLACES = [

  ['The list', 0, 0], ['Market', 0, 46], ['Forge yard', -46, 28], ['Tavern', 45, 14],

  ['Food stalls', 38, -8], ['Archery', 64, 10], ['Farm', 60, -16], ['Homes', -44, 48], ['Club camp', 46, 62], ['Graveyard', 44, -56], ['Pond', -56, 72], ['Festival gate', 0, 70], ['Deep Mine', -256, -42]

];

function tmapSites() { return [...ARENAS, TRAINING_GROUND]; }

function mapStallVisible(S) {

  return (!S.squireNPC || teamSquire().stage > 1) && !S.mine && !S.player && !S.node && !S.arena && (!S.secret || secretFound(S.secret.key)) &&

    (!S.hiddenTunnel || !!(CAREER.found && CAREER.found['tunnel:' + S.hiddenTunnel]) || !!(CAREER.bag && CAREER.bag.items && CAREER.bag.items.moon_map));

}

function placesDirectory(route) {

  const box = h('div', { class: 'places-directory' });

  const search = h('input', { type: 'search', placeholder: 'Search places & services', 'aria-label': 'Search places & services' });

  const list = h('div', { class: 'ups shop', 'aria-label': 'Places & services' });

  const draw = () => {

    list.replaceChildren(); const query = search.value.trim().toLowerCase();

    const rows = tmapSites().map(A => ({ name: A.name, icon: A.icon, role: A.practice ? 'Training' : 'Arena', x: A.entry[0], z: A.entry[1], description: A.gate && !gateOpen(A.gate) ? 'Gate locked' : '' }));

    for (const S of TOWN.stalls || []) if (mapStallVisible(S)) rows.push({ name: S.V.name, icon: S.V.icon || '•', role: S.V.role || 'Destination', x: S.ax, z: S.az, description: vendorBlurb(S.V.key) || '' });

    rows.sort((a, b) => Math.hypot(a.x - TOWN.pos.x, a.z - TOWN.pos.z) - Math.hypot(b.x - TOWN.pos.x, b.z - TOWN.pos.z));

    for (const r of rows) {

      if (!`${r.name} ${r.role} ${r.description}`.toLowerCase().includes(query)) continue;

      const district = districtAt(r.x, r.z);

      const desc = [r.description, district && district.name, `${Math.round(Math.hypot(r.x - TOWN.pos.x, r.z - TOWN.pos.z))} m away`].filter(Boolean).join(' · ');

      list.append(h('div', { class: 'up' }, h('div', null, h('b', null, `${r.icon} ${r.name}`), h('div', { class: 'muted small' }, `${r.role} · ${desc}`)), h('button', { class: 'btn tape small', onclick: () => route(r) }, 'Route')));

    }

    if (!list.children.length) list.append(h('p', { class: 'muted' }, 'No matching places or services.'));

  };

  search.oninput = draw; box.append(h('h3', null, 'Places & services'), search, list); draw(); return box;

}

function tmapMarkers() {

  const out = tmapSites().map(A => ({ x: A.x, z: A.z, icon: A.icon, name: A.name, kind: 'arena', A, far: true }));

  for (const S of TOWN.stalls || []) {

    if (S.mine) continue;

    if (S.player) { const O = WORLD.others && WORLD.others[S.player]; out.push({ x: O ? O.x : S.x, z: O ? O.z : S.z, icon: '', name: S.V.name, kind: 'player', S }); continue; }

    if (S.arena || (S.secret && !secretFound(S.secret.key)) || (S.hiddenTunnel && !(CAREER.found && CAREER.found['tunnel:' + S.hiddenTunnel]) && !(CAREER.bag && CAREER.bag.items && CAREER.bag.items.moon_map))) continue;

    if (S.node) { out.push({ x: S.x, z: S.z, icon: '', name: S.V.name, role: S.V.role, kind: 'node', col: S.node.N.col, S }); continue; }

    out.push({ x: S.x, z: S.z, icon: S.V.icon || '•', name: S.V.name, role: S.V.role, kind: S.station ? 'station' : 'vendor', key: S.V.key, far: S.V.key === 'mine:enter', S });

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

  // Broad elevation bands and forest belts reflect the actual heightfield and

  // wooded travel corridors instead of treating the expanded realm as empty lawn.

  const step = 40;

  for (let z = -TOWN_RZ; z < TOWN_RZ; z += step) for (let x = -TOWN_RX; x < TOWN_RX; x += step) {

    if ((x / TOWN_RX) ** 2 + (z / TOWN_RZ) ** 2 > 0.97) continue;

    const y = realmHeight(x + step / 2, z + step / 2);

    if (y < 3) continue;

    ctx.fillStyle = y > 10 ? 'rgba(116,119,91,.42)' : y > 6 ? 'rgba(128,151,92,.25)' : 'rgba(156,172,99,.15)';

    ctx.fillRect(X(x), Y(z), step * k + 1, step * k + 1);

  }

  ctx.fillStyle = 'rgba(36,75,38,.48)';

  COUNTRY_FORESTS.forEach(([x, z, r], j) => {

    ctx.beginPath();

    for (let i = 0; i <= 40; i++) {

      const a = i / 40 * Math.PI * 2;

      const uneven = 0.83 + 0.1 * Math.sin(a * 3 + j * 1.7) + 0.07 * Math.cos(a * 5 - j * 0.8);

      const px = X(x + Math.cos(a) * r * uneven), py = Y(z + Math.sin(a) * r * uneven);

      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);

    }

    ctx.closePath(); ctx.fill();

  });

  ctx.fillStyle = '#7ea65a'; ctx.beginPath(); ctx.ellipse(X(0), Y(0), FAIR_RX * k, FAIR_RZ * k, 0, 0, Math.PI * 2); ctx.fill();

  // the woods

  ctx.fillStyle = 'rgba(38,70,34,.75)'; ctx.beginPath(); ctx.ellipse(X(-215), Y(-70), 72 * k, 92 * k, 0, 0, Math.PI * 2); ctx.fill();

  // the lake

  ctx.fillStyle = '#4f8fb8'; ctx.beginPath(); ctx.ellipse(X(LAKE.x), Y(LAKE.z), LAKE.rx * k, LAKE.rz * k, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#d8c690'; ctx.fillRect(X(LAKE.x - LAKE.rx - 14), Y(LAKE.z + 10), 16 * k, 60 * k);

  // regional landmarks follow the same footprints as the village fields, quarry and lake docks.

  for (const [x0, z0, ww, hh, col] of [[-270, 200, 34, 10, '#bdab55'], [-138, 196, 26, 20, '#a39a4a'], [-276, -64, 40, 44, '#a89a86']]) {

    ctx.fillStyle = col; ctx.fillRect(X(x0), Y(z0), ww * k, hh * k);

    ctx.strokeStyle = 'rgba(58,55,42,.5)'; ctx.lineWidth = Math.max(1, k); ctx.strokeRect(X(x0), Y(z0), ww * k, hh * k);

  }

  ctx.strokeStyle = '#715f43'; ctx.lineWidth = Math.max(2, 4 * k);

  for (const [x0, z0, x1] of [[168, 20, 185], [172, 70, 186]]) { ctx.beginPath(); ctx.moveTo(X(x0), Y(z0)); ctx.lineTo(X(x1), Y(z0)); ctx.stroke(); }

  // roads

  ctx.strokeStyle = '#c2ac80'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  for (const R of ROADS) { ctx.lineWidth = Math.max(1.5, R.w * k * 0.8); ctx.beginPath(); R.pts.forEach(([x, z], i) => i ? ctx.lineTo(X(x), Y(z)) : ctx.moveTo(X(x), Y(z))); ctx.stroke(); }

  // paths, yards and squares

  for (const [x0, x1, z0, z1, col] of TOWN.mapRects || []) { ctx.fillStyle = col || '#b9a37c'; ctx.fillRect(X(x0), Y(z0), (x1 - x0) * k, (z1 - z0) * k); }

  // the castle: the outer curtain, the inner ward, the Great Hall

  const wall = (B, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, lw * k); ctx.strokeRect(X(B.x0), Y(B.z0), (B.x1 - B.x0) * k, (B.z1 - B.z0) * k); };

  HILL_T.forEach((T, i) => { ctx.fillStyle = ['rgba(160,150,130,.35)', 'rgba(175,162,128,.4)', 'rgba(190,172,122,.45)', 'rgba(205,186,130,.5)'][i]; ctx.beginPath(); ctx.ellipse(X(T.cx), Y(T.cz), T.rx * k, T.rz * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = i ? '#7d776e' : '#6d6a66'; ctx.lineWidth = Math.max(1.5, 2 * k); ctx.stroke(); });

  void wall; ctx.fillStyle = '#8a8378'; ctx.fillRect(X(HALL.x0), Y(HALL.z0), (HALL.x1 - HALL.x0) * k, (HALL.z1 - HALL.z0) * k);

  for (const Gt of TOWN.gates || []) { const open = gateOpen(Gt.key); ctx.fillStyle = open ? '#d9c49a' : '#a8342c'; ctx.beginPath(); ctx.arc(X(Gt.x), Y(Gt.z), Math.max(3, 2.4 * k), 0, Math.PI * 2); ctx.fill(); }

  // The arena footprints match the actual world geometry. Their entry markers sit outside the rails.

  for (const A of tmapSites()) {

    ctx.fillStyle = A.indoor ? '#bdb2a0' : A.key === 'dome' ? '#cbb994' : '#d9c49a'; ctx.fillRect(X(A.x - A.bx), Y(A.z - A.bz), A.bx * 2 * k, A.bz * 2 * k);

    ctx.strokeStyle = A.accent; ctx.lineWidth = Math.max(1.5, k); ctx.strokeRect(X(A.x - A.bx), Y(A.z - A.bz), A.bx * 2 * k, A.bz * 2 * k);

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

    if (k >= 1.5) for (const D of DISTRICTS) if (D.key !== 'fair' || k < 2) lab(D.name, D.x, D.z - (D.key === 'bailey' ? 64 : D.key === 'ward' ? -4 : 0) - (D.key === 'fair' ? 0 : 22), k < 2 ? 13 : 15, '#f7e7b8');

    for (const A of tmapSites()) if (k >= 1.5) lab((arenaLive(A) ? '● ' : '') + A.name, A.x, A.z + A.bz + 8, 10, arenaLive(A) ? '#ff8a7a' : '#efe6cf');

    if (k >= 0.42) { lab('Hunter’s Rest', -224, -340, 10, '#e5ddb9'); lab('Ridge Waystation', 113, -351, 10, '#e5ddb9'); }

    if (k >= 2) for (const [n, x, z] of TMAP_PLACES) lab(n, x, z, Math.round(clamp(k * 3.2, 10, 14)), '#f3ecd8');

  }

  // vendors, stations, other players (vendors only once you're zoomed in enough to tell them apart)

  const hits = []; const icon = Math.round(clamp(k * 4.2, 11, 22));

  for (const M of tmapMarkers()) {

    const px = X(M.x), py = Y(M.z);

    if (px < -20 || py < -20 || px > w + 20 || py > H + 20) continue;

    if (M.kind === 'arena') {

      const radius = view.round ? 7 : 12;

      ctx.fillStyle = M.A.gate && !gateOpen(M.A.gate) ? '#6b5551' : M.A.accent;

      ctx.strokeStyle = '#f8e6bd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.font = `${view.round ? 10 : 16}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(M.icon, px, py + 1);

      if (view.labels && k < 1.5) {

        const short = { dome: 'Dome', peasant: 'Millbrook', forest: 'Old Woods', beach: 'Lakeshore', castle: 'Bailey', hall: 'Great Hall', training: 'Training' }[M.A.key];

        ctx.font = '700 11px system-ui, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#20251c'; ctx.strokeText(short, px, py + 23); ctx.fillStyle = '#fff1d5'; ctx.fillText(short, px, py + 23);

      }

      hits.push({ px, py, M }); continue;

    }

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

  else { ctx.fillStyle = 'rgba(18,31,25,.8)'; ctx.fillRect(w - 37, 8, 29, 33); ctx.font = '700 17px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#f7e7b8'; ctx.fillText('N', w - 22, 31); }

  ctx.restore();

  return hits;

}

// is a fight on in this arena right now? (yours, or a real BuhurtOS fight mirrored there)

function arenaLive(A) { return !!((typeof BOUT !== 'undefined' && BOUT.on && TOWN.boutArena === A.key) || A.live); }

// the big map: drag to pan, pinch / wheel / buttons to zoom, tap a marker (or anywhere) to set a waypoint

function townMapCanvas() {

  const wrap = h('div', { class: 'tmapwrap' }), cv = h('canvas', { class: 'tmap', 'aria-label': 'Realm map. Drag to look around, tap to set a waypoint.' });

  const tip = h('div', { class: 'tmaptip muted small' }, 'Choose an arena below or tap its marker. The gold trail leads to its entrance; locked gates still require their writ.');

  const V = TMAP.view = TMAP.view || { cx: TOWN.pos.x, cz: TOWN.pos.z, k: 0 };

  const zb = (t, f) => h('button', { class: 'btn tape small', onclick: e => { e.stopPropagation(); f(); draw(); } }, t);

  const bar = h('div', { class: 'tmapbar' }, zb('−', () => V.k = Math.max(V.kmin, V.k / 1.5)), zb('+', () => V.k = Math.min(9, V.k * 1.5)), zb('Me', () => { V.cx = TOWN.pos.x; V.cz = TOWN.pos.z; V.k = Math.max(V.k, 2.4); }), zb('Realm', () => { V.k = V.kmin; V.cx = 0; V.cz = -5; }));

  const stops = placesDirectory(r => { setWaypoint(r.x, r.z, r.name); V.cx = r.x; V.cz = r.z; V.k = Math.max(V.k, 2); tip.textContent = `Waypoint set: ${r.name}. Follow the gold markers.`; draw(); });

  wrap.append(bar, cv, tip, h('div', { class: 'tmaplegend muted small' }, '🏟️ Arena  ·  🔴 Live bout  ·  Gold trail: route  ·  Grey marker: locked gate'), stops);

  let W = 0, H = 0;

  const draw = () => {

    W = Math.max(260, Math.min(wrap.clientWidth || 640, 760)); H = Math.round(W * 0.9); const dpr = Math.min(2, window.devicePixelRatio || 1);

    V.kmin = Math.min(W / (TOWN_RX * 2 + 20), H / (TOWN_RZ * 2 + 20)); if (!V.k) { V.k = V.kmin; V.cx = 0; V.cz = -5; }

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

      if (M.kind === 'arena') setWaypoint(M.A.entry[0], M.A.entry[1], M.name);

      else if (M.kind === 'player') setWaypoint(M.x, M.z, M.name);

      else if (M.kind === 'node') setWaypoint(M.S.ax, M.S.az, M.name);

      else setWaypoint(M.S.ax, M.S.az, M.name);

    } else {

      const wx = V.cx + (x - W / 2) / V.k, wz = V.cz + (y - H / 2) / V.k;

      const A = tmapSites().find(a => Math.abs(wx - a.x) < a.bx && Math.abs(wz - a.z) < a.bz);

      if (A) setWaypoint(A.entry[0], A.entry[1], A.name);

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

  if (TOWN.mineOn) drawDeepMineMap(ctx, S, S, true);

  else drawTownMap(ctx, { w: S, h: S, scale: S / (TOWN.mounted ? 150 : 100), cx: TOWN.pos.x, cz: TOWN.pos.z, labels: false, round: true });

}
