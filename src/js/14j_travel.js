// ===================================================================
// Getting around the realm without teleporting: waypoints with a trail of markers along the road, autowalk,
// a compass at the top of the screen, sprint stamina, and horses (hire one at the stables or own one).
// ===================================================================
const TRAVEL = { path: [], marks: [], progress: 0, auto: false, dots: null, beam: null, compassT: 0, frame: 0, stuck: 0 };
function realmView(on) {
  const cam = W3.camera, S = W3.scene;
  if (on) {
    if (!TRAVEL.saved) TRAVEL.saved = { far: cam.far, fogNear: S.fog && S.fog.near, fogFar: S.fog && S.fog.far, sun: W3.sun.position.clone(), sunT: W3.sun.target.position.clone(), sh: { ...W3.sun.shadow.camera } };
    cam.far = 520; cam.updateProjectionMatrix(); if (S.fog) { S.fog.near = IS_TOUCH ? 55 : 70; S.fog.far = IS_TOUCH ? 135 : 170; }
    const sc = W3.sun.shadow.camera; Object.assign(sc, { left: -34, right: 34, top: 34, bottom: -34, far: 90 }); sc.updateProjectionMatrix();
  } else if (TRAVEL.saved) {
    const s = TRAVEL.saved; cam.far = s.far; cam.updateProjectionMatrix(); if (S.fog && s.fogNear != null) { S.fog.near = s.fogNear; S.fog.far = s.fogFar; }
    W3.sun.position.copy(s.sun); W3.sun.target.position.copy(s.sunT); const sc = W3.sun.shadow.camera; Object.assign(sc, { left: s.sh.left, right: s.sh.right, top: s.sh.top, bottom: s.sh.bottom, far: s.sh.far }); sc.updateProjectionMatrix();
    TRAVEL.saved = null; W3.matchRoot.position.set(0, 0, 0); W3.fxOff = null; TRAVEL.path = []; TRAVEL.auto = false; TOWN.wp = null; TOWN.mounted = false; TOWN.horse = null; TOWN.horseRent = false; TOWN.district = null; TOWN.spec = null; TOWN.forceArena = null; ANIMAL.list = [];
  }
}
// called every frame from updateTown
function realmTick(dt) {
  TRAVEL.frame++;
  if (TRAVEL.frame % 6 === 0) realmCull();
  if (TRAVEL.frame % 15 === 0) realmDistrictTick();
  if (TRAVEL.frame % 10 === 3) peopleCull();
  if (TRAVEL.frame % 1800 === 900 && typeof rosterLoad === 'function') rosterLoad(true);
  // the sun (and its shadows) follow you round the realm
  if (TRAVEL.saved && TOWN.pos) { const o = TRAVEL.saved.sun.clone().sub(TRAVEL.saved.sunT); W3.sun.target.position.set(TOWN.pos.x, gy(TOWN.pos.x, TOWN.pos.z), TOWN.pos.z); W3.sun.position.set(TOWN.pos.x + o.x, o.y, TOWN.pos.z + o.z); W3.sun.target.updateMatrixWorld(); }
  // stamina for sprinting
  const run = TOWN.speed > 3.6 && !TOWN.mounted;
  const testAdmin = typeof BOS !== 'undefined' && BOS.testAdmin;
  // Village travel is intentionally more forgiving than a fight. Lungs talents
  // then improve recovery and reduce the running drain on top of that baseline.
  const breath = G.player && typeof perk === 'function' ? perk(G.player, 'lungs.breath') : 0;
  const marathon = G.player && typeof perk === 'function' ? perk(G.player, 'lungs.marathon') : 0;
  const drain = 0.105 * (marathon ? 0.7 : 1);
  const recovery = 0.30 * (1 + 0.08 * breath);
  TOWN.stam = testAdmin ? 1 : clamp((TOWN.stam == null ? 1 : TOWN.stam) + (run ? -drain : recovery) * dt, 0, 1);
  if (TOWN.stam <= 0.01) TOWN.winded = true; if (TOWN.winded && TOWN.stam > 0.35) TOWN.winded = false;
  const sb = $('#townStam'); if (sb) { sb.hidden = TOWN.stam > 0.995; sb.firstChild.style.width = Math.round(TOWN.stam * 100) + '%'; sb.classList.toggle('low', !!TOWN.winded); }
  updateWaypoint(dt); updateHorse(dt); arenaTicker(dt);
}
// ---- waypoints
// A route is planned ONCE when you set a waypoint: a short local leg to the nearest road, the road network between
// districts, and a local leg at the far end (both legs are a bounded A* on a 2 m grid; inside the fairground the
// whole route is local). Markers are fixed points along that route and never move; they just disappear behind you.
// It's only re-planned if you wander well off it. Autowalk follows the route with a look-ahead, so it rounds corners.
// a waypoint on something solid (a wall, the list) snaps to the nearest open ground
function freeNear(x, z) {
  // Use the same one-metre clearance as route segment validation. A point can
  // be free for the player yet too close to a rope for the planner's path.
  if (!navBlocked(x, z, 1.0)) return [x, z];
  for (let r = 2; r <= 40; r += 2) for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r; if (!navBlocked(nx, nz, 1.0)) return [nx, nz]; }
  return [x, z];
}
function setWaypoint(x, z, label) {
  [x, z] = freeNear(x, z);
  if (typeof playtestAction === 'function') playtestAction('waypoint', { x, z, label: label || 'Waypoint' });
  TOWN.wp = { x, z, label: label || 'Waypoint' }; AU.click && AU.click();
  travelPlan();
  toastMenu(TRAVEL.unreachable ? `No clear walking route to ${TOWN.wp.label}. Move closer or choose another spot.` : `Waypoint: ${TOWN.wp.label}. Follow the gold markers${IS_TOUCH ? ', or tap Walk there' : ' (R walks you there)'}.`);
  compassHud();
}
function clearWaypoint() { TOWN.wp = null; TRAVEL.path = []; TRAVEL.marks = []; TRAVEL.auto = false; TRAVEL.stuck = 0; TRAVEL.unreachable = false; if (TRAVEL.dots) TRAVEL.dots.count = 0; if (TRAVEL.beam) TRAVEL.beam.visible = false; compassHud(); }
// the walk-to of old: now it marks the way instead of moving you
function townWalkTo(key) { const S = TOWN.stalls.find(s => s.V.key === key); if (!S) return; setWaypoint(S.ax, S.az, S.V.name); }
// for tests and debugging only: stand at someone's counter straight away
function townJump(key) { const S = TOWN.stalls.find(s => s.V.key === key); if (!S) return; TOWN.pos = { x: S.ax, z: S.az }; TOWN.yaw = S.ry; TOWN.face = S.ry + Math.PI; TOWN.cam = null; }
function buildWaypoint() {
  const n = 120, g = new THREE.CircleGeometry(0.3, 10); g.rotateX(-Math.PI / 2);
  TRAVEL.dots = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: '#f2c40f', transparent: true, opacity: 0.85, depthWrite: false }), n); TRAVEL.dots.count = 0; TRAVEL.dots.frustumCulled = false; TRAVEL.dots.userData.dyn = true; TOWN.root.add(TRAVEL.dots);
  TRAVEL.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 40, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#f2c40f', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  TRAVEL.beam.visible = false; TRAVEL.beam.userData.dyn = true; TOWN.root.add(TRAVEL.beam);
  if (TOWN.wp) travelPlan();
}
// plan the route from where you stand and lay the markers along it
function travelPlan() {
  const W = TOWN.wp; if (!W || !TOWN.pos) return;
  TRAVEL.path = realmRoute(TOWN.pos.x, TOWN.pos.z, W.x, W.z) || [];
  TRAVEL.unreachable = !TRAVEL.path.length;
  if (TRAVEL.unreachable) { TRAVEL.auto = false; TRAVEL.failedAt = { x: TOWN.pos.x, z: TOWN.pos.z }; }
  TRAVEL.marks = []; TRAVEL.stuck = 0; TRAVEL.replans = (TRAVEL.replans || 0) + 1;
  let px = TOWN.pos.x, pz = TOWN.pos.z, s = 0, carry = 2;
  for (const [x, z] of TRAVEL.path) { const seg = Math.hypot(x - px, z - pz); while (carry <= seg) { const t = carry / seg; TRAVEL.marks.push([px + (x - px) * t, pz + (z - pz) * t, s + carry]); carry += 3; } carry -= seg; s += seg; px = x; pz = z; }
  TRAVEL.pathLen = s; TRAVEL.progress = 0;
}
// where along the route you are: the nearest point on it (within 12 m), as a distance from its start
function travelProgress() {
  const P = TRAVEL.path; if (!P.length) return { s: 0, off: 0 };
  let px = TOWN.pos.x, pz = TOWN.pos.z, s = 0, best = 1e9, bs = 0, ax = TRAVEL.startX, az = TRAVEL.startZ;
  if (ax == null) { ax = px; az = pz; }
  let cx = ax, cz = az;
  for (const [x, z] of P) {
    const dx = x - cx, dz = z - cz, L2 = dx * dx + dz * dz || 1e-6, t = clamp(((px - cx) * dx + (pz - cz) * dz) / L2, 0, 1);
    const d = Math.hypot(px - (cx + dx * t), pz - (cz + dz * t));
    if (d < best) { best = d; bs = s + Math.sqrt(L2) * t; }
    s += Math.sqrt(L2); cx = x; cz = z;
  }
  return { s: bs, off: best };
}
function updateWaypoint(dt) {
  const W = TOWN.wp; if (!W || !TOWN.pos) { if (TRAVEL.beam) TRAVEL.beam.visible = false; return; }
  const d = Math.hypot(W.x - TOWN.pos.x, W.z - TOWN.pos.z);
  if (d < 3) { toastMenu(`You’re there: ${W.label}.`); clearWaypoint(); return; }
  if (!TRAVEL.path.length && (!TRAVEL.unreachable || Math.hypot(TOWN.pos.x - TRAVEL.failedAt.x, TOWN.pos.z - TRAVEL.failedAt.z) > 6)) travelPlan();
  if (!TRAVEL.path.length) { TRAVEL.auto = false; if (TRAVEL.dots) TRAVEL.dots.count = 0; compassHud(d); return; }
  const pr = travelProgress(); TRAVEL.progress = Math.max(TRAVEL.progress || 0, pr.s); TRAVEL.off = pr.off;
  // wandered well off the route (or autowalk is stuck on something): plan again from here
  if (pr.off > 12 || TRAVEL.stuck > 1.4) {
    const now = performance.now();
    if (!TRAVEL.lastReplanAt || now - TRAVEL.lastReplanAt > 1200) {
      TRAVEL.lastReplanAt = now;
      TRAVEL.stuckLog = (TRAVEL.stuckLog || []).concat([[Math.round(TOWN.pos.x), Math.round(TOWN.pos.z)]]);
      const moved = TRAVEL.lastReplanPos ? Math.hypot(TOWN.pos.x - TRAVEL.lastReplanPos.x, TOWN.pos.z - TRAVEL.lastReplanPos.z) : Infinity;
      TRAVEL.noProgress = moved < 1 ? (TRAVEL.noProgress || 0) + 1 : 0;
      TRAVEL.lastReplanPos = { x: TOWN.pos.x, z: TOWN.pos.z };
      if (TRAVEL.noProgress >= 3) { TRAVEL.auto = false; TRAVEL.unreachable = true; TRAVEL.failedAt = TRAVEL.lastReplanPos; TRAVEL.path = []; TRAVEL.marks = []; toastMenu('Walk there stopped: no clear route from here. Move or choose another waypoint.'); }
      else travelPlan();
    }
  }
  // markers from just behind you to 60 m ahead; they're fixed points, only which ones show changes
  const D = TRAVEL.dots, m4 = new THREE.Matrix4(); let k = 0;
  for (const [x, z, s] of TRAVEL.marks) { if (s < TRAVEL.progress - 2) continue; if (s > TRAVEL.progress + 60 || k >= D.instanceMatrix.count) break; m4.makeTranslation(x, gy(x, z) + 0.08 + 0.03 * Math.sin(G.realTime * 4 + s), z); D.setMatrixAt(k++, m4); }
  D.count = k; D.instanceMatrix.needsUpdate = true;
  const B = TRAVEL.beam; B.visible = true; B.position.set(W.x, gy(W.x, W.z) + 20, W.z); B.material.opacity = 0.18 + 0.1 * Math.sin(G.realTime * 3);
  TRAVEL.compassT -= dt; if (TRAVEL.compassT <= 0) { TRAVEL.compassT = 0.15; compassHud(d); }
}
// the route: local legs on the grid, the roads in between
function realmRoute(sx, sz, tx, tz) {
  TRAVEL.startX = sx; TRAVEL.startZ = sz;
  const safe = path => path && routeSafe(sx, sz, path) ? path : null;
  const direct = Math.hypot(tx - sx, tz - sz);
  if (lineFree(sx, sz, tx, tz)) return [[tx, tz]];
  if (direct < 70) { const L = safe(localPath(sx, sz, tx, tz) || (direct < 40 ? localPath(sx, sz, tx, tz, 70) : null)); if (L) return L; }
  const A = nearestRoad(sx, sz), Bq = nearestRoad(tx, tz);
  if (!A || !Bq || (A.d > 60 && Bq.d > 60)) return safe(localPath(sx, sz, tx, tz, 60));
  const road = roadRoute(A, { ...Bq, x: tx, z: tz });
  if (!road) return safe(localPath(sx, sz, tx, tz, 60));
  const leg1 = A.d < 2 ? [] : (safe(localPath(sx, sz, A.x, A.z) || localPath(sx, sz, A.x, A.z, 70)) || null);
  if (!leg1) return safe(localPath(sx, sz, tx, tz, 60));
  { const f = road[0], p0 = leg1.length ? leg1[leg1.length - 1] : [sx, sz]; if (f && !lineFree(p0[0], p0[1], f[0], f[1])) { const L = localPath(p0[0], p0[1], f[0], f[1], 12); if (L) road.splice(0, 0, ...L); } }
  const out = [...leg1, ...road]; if (!out.length || out[out.length - 1][0] !== tx || out[out.length - 1][1] !== tz) out.push([tx, tz]);
  return safe(out) || safe(localPath(sx, sz, tx, tz, 60));
}
function routeSafe(sx, sz, path) {
  let x = sx, z = sz;
  for (const [nx, nz] of path) { if (!lineFree(x, z, nx, nz)) return false; x = nx; z = nz; }
  return true;
}
// the road network as a graph (built once)
const ROADNET = { nodes: [], adj: [] };
function roadNetBuild() {
  if (ROADNET.nodes.length) return;
  const node = (x, z) => { let i = ROADNET.nodes.findIndex(n => Math.hypot(n[0] - x, n[1] - z) < 3); if (i < 0) { i = ROADNET.nodes.length; ROADNET.nodes.push([x, z]); ROADNET.adj.push([]); } return i; };
  const link = (a, b, local) => { if (a === b) return; const d = Math.hypot(ROADNET.nodes[a][0] - ROADNET.nodes[b][0], ROADNET.nodes[a][1] - ROADNET.nodes[b][1]) * (local ? 1.3 : 1); if (!ROADNET.adj[a].some(e => e[0] === b)) { ROADNET.adj[a].push([b, d, !!local]); ROADNET.adj[b].push([a, d, !!local]); } };
  for (const R of ROADS) { let prev = null; for (const [x, z] of R.pts) { const i = node(x, z); if (prev != null) link(prev, i); prev = i; } }
  // the roads meet at the fairground's edge; between those ends the way is found locally round the stalls and the dome
  for (const [a, b] of [[[0, -24], [-52, -2]], [[0, -24], [52, 6]], [[-52, -2], [-16, 70]], [[52, 6], [0, 70]], [[0, 70], [-16, 70]]]) { const i = node(a[0], a[1]), j = node(b[0], b[1]); link(i, j, true); }
}
// the nearest point on any road segment, with the two nodes it lies between
function nearestRoad(x, z) {
  roadNetBuild(); let best = null;
  for (let a = 0; a < ROADNET.nodes.length; a++) for (const [b, , local] of ROADNET.adj[a]) {
    if (b < a || local) continue;
    const [x0, z0] = ROADNET.nodes[a], [x1, z1] = ROADNET.nodes[b], dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz || 1e-6;
    const t = clamp(((x - x0) * dx + (z - z0) * dz) / L2, 0, 1), px = x0 + dx * t, pz = z0 + dz * t, d = Math.hypot(x - px, z - pz) + Math.abs(gy(px, pz) - gy(x, z)) * 12; // a road on another terrace is further than it looks
    if (!best || d < best.d) best = { x: px, z: pz, d, a, b, ta: Math.hypot(px - x0, pz - z0), tb: Math.hypot(px - x1, pz - z1) };
  }
  return best;
}
// Dijkstra over the road nodes from one projected point to another
function roadRoute(A, B) {
  const N = ROADNET.nodes.length, rejected = new Set(), rejectedEnds = new Set();
  const stamp = `${NAV.version || 0}:${gateOpen('bailey')}:${gateOpen('royal')}`;
  if (ROADNET.cacheStamp !== stamp) { ROADNET.cacheStamp = stamp; ROADNET.edgeCache = new Map(); }
  const routes = ROADNET.edgeCache;
  const edge = (u, v) => {
    const key = `${u}:${v}`; if (routes.has(key)) return routes.get(key);
    const a = ROADNET.nodes[u], b = ROADNET.nodes[v], e = ROADNET.adj[u].find(q => q[0] === v);
    const path = lineFree(a[0], a[1], b[0], b[1]) ? [b] : localPath(a[0], a[1], b[0], b[1], e && e[2] ? 20 : 24);
    if (!path || !routeSafe(a[0], a[1], path)) { routes.set(key, null); return null; }
    const result = { path }; routes.set(key, result); return result;
  };
  const connector = (x, z, tx, tz) => lineFree(x, z, tx, tz) ? [[tx, tz]] : localPath(x, z, tx, tz, 70);
  const starts = [];
  for (const u of [A.a, A.b]) {
    const start = connector(A.x, A.z, ...ROADNET.nodes[u]);
    if (!start || !routeSafe(A.x, A.z, start)) continue;
    let x = A.x, z = A.z, length = 0; for (const [nx, nz] of start) { length += Math.hypot(nx - x, nz - z); x = nx; z = nz; }
    starts.push({ u, path: start, length });
  }
  if (!starts.length) return null;
  const ends = [];
  for (let u = 0; u < N; u++) {
    const n = ROADNET.nodes[u];
    if ((u === B.a || u === B.b || Math.hypot(n[0] - B.x, n[1] - B.z) < 50) && Math.abs(gy(n[0], n[1]) - gy(B.x, B.z)) < 2) ends.push(u);
  }
  // Search optimistically; only inspect geometry on the selected route. If a
  // road link has no safe detour, exclude it and choose the next graph route.
  for (let attempt = 0; attempt < 32; attempt++) {
    const dist = new Array(N).fill(Infinity), from = new Array(N).fill(-1), done = new Array(N).fill(false);
    for (const S of starts) dist[S.u] = Math.min(dist[S.u], S.length);
    for (let it = 0; it < N; it++) {
      let u = -1; for (let i = 0; i < N; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || !Number.isFinite(dist[u])) break; done[u] = true;
      for (const [v, w] of ROADNET.adj[u]) if (!rejected.has(`${u}:${v}`) && dist[u] + w < dist[v]) { dist[v] = dist[u] + w; from[v] = u; }
    }
    let end = -1, best = Infinity;
    for (const u of ends) {
      if (rejectedEnds.has(u) || !Number.isFinite(dist[u])) continue;
      const n = ROADNET.nodes[u], score = dist[u] + Math.hypot(n[0] - B.x, n[1] - B.z);
      if (score < best) { best = score; end = u; }
    }
    if (end < 0) return null;
    const ids = []; for (let c = end; c >= 0; c = from[c]) ids.push(c); ids.reverse();
    const first = ROADNET.nodes[ids[0]], start = connector(A.x, A.z, first[0], first[1]);
    if (!start || !routeSafe(A.x, A.z, start)) { rejectedEnds.add(end); continue; }
    const out = [...start]; let bad = false;
    for (let k = 1; k < ids.length; k++) {
      const u = ids[k - 1], v = ids[k], E = edge(u, v);
      if (!E) { rejected.add(`${u}:${v}`); rejected.add(`${v}:${u}`); bad = true; break; }
      out.push(...E.path);
    }
    if (bad) continue;
    const n = ROADNET.nodes[end], tail = connector(n[0], n[1], B.x, B.z);
    if (!tail || !routeSafe(n[0], n[1], tail)) { rejectedEnds.add(end); continue; }
    out.push(...tail);
    if (routeSafe(A.x, A.z, out)) return out;
    rejectedEnds.add(end);
  }
  return null;
}
// a bounded A* on a 2 m grid round the two ends (for the legs off the road and short trips), string-pulled
function localPath(sx, sz, tx, tz, margin) {
  if (navBlocked(tx, tz, 1.0)) return null;
  const C = 2, M = margin || 30, x0 = Math.min(sx, tx) - M, x1 = Math.max(sx, tx) + M, z0 = Math.min(sz, tz) - M, z1 = Math.max(sz, tz) + M;
  const ci = v => Math.floor(v / C), key = (i, j) => (i + 4096) * 8192 + (j + 4096);
  const freeCache = new Map(), roadCache = new Map(), edgeCache = new Map();
  const free = (i, j) => {
    const k = key(i, j); if (freeCache.has(k)) return freeCache.get(k);
    const x = i * C + 1, z = j * C + 1;
    const ok = x > x0 && x < x1 && z > z0 && z < z1 && !navBlocked(x, z, 1.0);
    freeCache.set(k, ok); return ok;
  };
  const road = (i, j) => {
    const k = key(i, j); if (!roadCache.has(k)) roadCache.set(k, onRoad(i * C + 1, j * C + 1, 0));
    return roadCache.get(k);
  };
  const edgeFree = (i, j, ni, nj, x, z, nx, nz) => {
    const k = `${key(i, j)}:${key(ni, nj)}`;
    if (!edgeCache.has(k)) edgeCache.set(k, lineFree(x, z, nx, nz));
    return edgeCache.get(k);
  };
  const si = ci(sx), sj = ci(sz), ti = ci(tx), tj = ci(tz);
  const open = [], g = new Map([[key(si, sj), 0]]), from = new Map(); let n = 0, found = false;
  const H = (i, j) => Math.hypot(i - ti, j - tj) * 1.001;
  const push = e => { let i = open.length; open.push(e); while (i) { const p = (i - 1) >> 1; if (open[p][0] <= e[0]) break; open[i] = open[p]; i = p; } open[i] = e; };
  const pop = () => { const first = open[0], last = open.pop(); if (open.length) { let i = 0; while (i * 2 + 1 < open.length) { let c = i * 2 + 1; if (c + 1 < open.length && open[c + 1][0] < open[c][0]) c++; if (open[c][0] >= last[0]) break; open[i] = open[c]; i = c; } open[i] = last; } return first; };
  push([0, si, sj, 0]);
  while (open.length && n++ < 12000) {
    const [, i, j, gc] = pop(); if (gc !== g.get(key(i, j))) continue;
    if (i === ti && j === tj) { found = true; break; }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = i + di, nj = j + dj, kk = key(ni, nj);
      if (!(ni === ti && nj === tj) && !free(ni, nj)) continue;
      if (di && dj && (!free(i + di, j) || !free(i, j + dj))) continue;
      if (!edgeFree(i, j, ni, nj, i === si && j === sj ? sx : i * C + 1, i === si && j === sj ? sz : j * C + 1,
        ni === ti && nj === tj ? tx : ni * C + 1, ni === ti && nj === tj ? tz : nj * C + 1)) continue;
      const ng = gc + (di && dj ? 1.414 : 1) + (road(ni, nj) ? 0 : 0.25);
      if (ng < (g.has(kk) ? g.get(kk) : 1e9)) { g.set(kk, ng); from.set(kk, key(i, j)); push([ng + H(ni, nj), ni, nj, ng]); }
    }
  }
  if (!found) return null;
  const cells = []; let c = key(ti, tj); while (c !== undefined && c !== key(si, sj)) { cells.push([(Math.floor(c / 8192) - 4096) * C + 1, (c % 8192 - 4096) * C + 1]); c = from.get(c); }
  cells.reverse(); if (cells.length) cells[cells.length - 1] = [tx, tz]; else cells.push([tx, tz]);
  const out = []; let ax = sx, az = sz, i = 0;
  while (i < cells.length) { let j = Math.min(cells.length - 1, i + 40); while (j > i && !lineFree(ax, az, cells[j][0], cells[j][1])) j--; out.push(cells[j]); ax = cells[j][0]; az = cells[j][1]; i = j + 1; }
  return out;
}
function realmPath(sx, sz, tx, tz) { return realmRoute(sx, sz, tx, tz); }
function lineFree(x0, z0, x1, z1) { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L)); for (let k = 1; k <= n; k++) { const t = k / n; if (navBlocked(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, 1.0)) return false; } return true; }
// autowalk: when on and you aren't steering, walk toward a point a few metres ahead along the route
function travelAutoVel(speed, dt = 1 / 60) {
  if (!TRAVEL.auto || !TOWN.wp || !TRAVEL.path.length) return null;
  const look = (TRAVEL.progress || 0) + (TOWN.mounted ? 6 : 3.5);
  let px = TRAVEL.startX, pz = TRAVEL.startZ, s = 0, tx = TOWN.wp.x, tz = TOWN.wp.z;
  for (const [x, z] of TRAVEL.path) { const seg = Math.hypot(x - px, z - pz); if (s + seg >= look) { const t = (look - s) / (seg || 1); tx = px + (x - px) * t; tz = pz + (z - pz) * t; break; } s += seg; px = x; pz = z; }
  let dx = tx - TOWN.pos.x, dz = tz - TOWN.pos.z; const d = Math.hypot(dx, dz) || 1;
  // blocked by someone or something: slide sideways round it
  if ((TRAVEL.stuck || 0) >= 0.5) { const side = Math.round(TRAVEL.stuck / 0.5) % 2 ? 1 : -1, px = -dz / d, pz = dx / d; dx = dx / d + px * side * 1.5; dz = dz / d + pz * side * 1.5; }
  const d2 = Math.hypot(dx, dz) || 1; dx /= d2; dz /= d2;
  // not getting anywhere along the route (pushed about by something, or walking into it): count it as stuck
  TRAVEL.stuckT = (TRAVEL.stuckT || 0) + dt;
  if (TRAVEL.stuckT >= 0.5) { TRAVEL.stuckT = 0; if ((TRAVEL.progress || 0) - (TRAVEL.lastProg || 0) < 0.4) TRAVEL.stuck = (TRAVEL.stuck || 0) + 0.5; else TRAVEL.stuck = 0; TRAVEL.lastProg = TRAVEL.progress || 0; }
  return { vx: dx * speed, vz: dz * speed };
}
// the compass: an arrow pointing at the waypoint from the camera's view, its name and distance
function compassHud(dist) {
  const el = $('#townWp'); if (!el) return;
  const W = TOWN.wp; el.hidden = !W || !!G.screen; if (!W) return;
  const d = dist != null ? dist : Math.hypot(W.x - TOWN.pos.x, W.z - TOWN.pos.z);
  const ang = Math.atan2(W.x - TOWN.pos.x, W.z - TOWN.pos.z) - (TOWN.yaw + Math.PI);
  const turn = Math.atan2(Math.sin(-ang), Math.cos(-ang));
  const degrees = Math.abs(turn) * 180 / Math.PI;
  const direction = degrees < 20 ? 'Straight ahead' : degrees < 65 ? `Bear ${turn > 0 ? 'right' : 'left'}` : degrees < 135 ? `Turn ${turn > 0 ? 'right' : 'left'}` : 'Turn around';
  if (!el.firstChild) {
    el.append(h('span', { class: 'wparrow', 'aria-hidden': 'true' }, '↑'), h('span', { class: 'wptxt' }, h('b'), h('small')),
      h('button', { class: 'btn tape small wpauto', onclick: e => { e.stopPropagation(); TRAVEL.auto = !TRAVEL.auto; compassHud(); } }, 'Walk there'),
      h('button', { class: 'btn tape small wpx', 'aria-label': 'Clear waypoint', onclick: e => { e.stopPropagation(); clearWaypoint(); } }, '✕'));
  }
  el.querySelector('.wparrow').style.transform = `rotate(${-ang}rad)`;
  el.querySelector('.wptxt b').textContent = W.label; el.querySelector('.wptxt small').textContent = `${Math.round(d)} m · ${direction}`;
  el.setAttribute('aria-label', `Waypoint ${W.label}, ${Math.round(d)} metres. ${direction}.`);
  const a = el.querySelector('.wpauto'); a.textContent = TRAVEL.auto ? 'Stop' : 'Walk there'; a.classList.toggle('on', TRAVEL.auto);
}
// ---- horses: hire one at the stables for this visit, or buy your own and whistle for it anywhere outdoors
const HORSE = { gltf: null, loading: false };
function horseLoad(cb) {
  if (HORSE.gltf) { cb(HORSE.gltf); return; } if (typeof ANIMAL_GLB === 'undefined' || typeof GLTFX === 'undefined') return;
  if (HORSE.loading) { HORSE.cbs.push(cb); return; } HORSE.loading = true; HORSE.cbs = [cb];
  const bin = atob(ANIMAL_GLB.Horse), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  new GLTFX.GLTFLoader().parse(u8.buffer, '', g => { HORSE.gltf = g; HORSE.cbs.forEach(f => f(g)); }, e => { HORSE.failed = String(e); });
}
function animalMake(kind, cb, tint) {
  const src = typeof ANIMAL_GLB !== 'undefined' && ANIMAL_GLB[kind]; if (!src) return;
  const go = g => {
    const root = new THREE.Group(), body = SkelUtils.clone(g.scene); root.add(body);
    const box = new THREE.Box3().setFromObject(body), hgt = box.max.y - box.min.y || 1, want = { Horse: 2.15, Cow: 1.7, Alpaca: 1.9 }[kind] || 1.6; body.scale.setScalar(want / hgt);
    body.traverse(o => { if (o.isMesh) { o.castShadow = SHADOWS; o.frustumCulled = false; if (tint && o.material) { o.material = o.material.clone(); o.material.color && o.material.color.multiply(new THREE.Color(tint)); } } });
    const mixer = new THREE.AnimationMixer(body), acts = {}; g.animations.forEach(a => acts[a.name] = mixer.clipAction(a));
    const A = { root, mixer, acts, cur: null, play(n, f = 0.3) { if (A.cur === n || !acts[n]) return; acts[n].reset().fadeIn(f).play(); if (A.cur) acts[A.cur].fadeOut(f); A.cur = n; } };
    A.play('Idle', 0); if (acts.Idle) acts.Idle.time = Math.random() * 2; cb(A);
  };
  ANIMAL.cache = ANIMAL.cache || {};
  if (ANIMAL.cache[kind]) { go(ANIMAL.cache[kind]); return; }
  const bin = atob(src), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  new GLTFX.GLTFLoader().parse(u8.buffer, '', g => { ANIMAL.cache[kind] = g; go(g); }, () => { });
}
const ANIMAL = { list: [] };
function horseAvailable() { return !!(TOWN.horseRent || shopState().owned.horse); }
function callHorse() {
  if (TOWN.mineOn) { toastMenu('Your horse must wait above ground. Take the lift to call it.'); return; }
  if (!horseAvailable()) { toastMenu('No horse. Hire one from Edda at the stables just outside the festival gate.'); return; }
  if (TOWN.horse) { if (TOWN.mounted) dismount(); else if (Math.hypot(TOWN.horse.x - TOWN.pos.x, TOWN.horse.z - TOWN.pos.z) < 3.5) mount(); else { TOWN.horse.come = true; toastMenu('You whistle. Your horse trots over.'); } return; }
  animalMake('Horse', A => {
    if (!TOWN.on) return;
    const back = TOWN.face + Math.PI, x = TOWN.pos.x + Math.sin(back) * 16, z = TOWN.pos.z + Math.cos(back) * 16;
    TOWN.horse = { A, x, z, face: TOWN.face, come: true }; A.root.position.set(x, gy(x, z), z); A.root.userData.dyn = true; TOWN.root.add(A.root);
    toastMenu('You whistle. Your horse trots over.');
  }, shopState().owned.horse === 'white' ? '#ffffff' : null);
}
function mount() { if (!TOWN.horse) return; TOWN.mounted = true; unlock('rider', true); TOWN.pos.x = TOWN.horse.x; TOWN.pos.z = TOWN.horse.z; TOWN.face = TOWN.horse.face; if (typeof playtestAction === 'function') playtestAction('mount'); AU.click && AU.click(); horseHud(); }
function dismount() { if (!TOWN.horse) return; TOWN.mounted = false; const s = TOWN.face + Math.PI / 2; TOWN.pos.x += Math.sin(s) * 1.4; TOWN.pos.z += Math.cos(s) * 1.4; townCollide(); if (typeof playtestAction === 'function') playtestAction('dismount'); horseHud(); }
function updateHorse(dt) {
  const H = TOWN.horse; if (!H) { horseHud(); return; }
  if (TOWN.mineOn) { H.A.root.visible = false; horseHud(); return; }
  H.A.root.visible = true;
  if (TOWN.mounted) { H.x = TOWN.pos.x; H.z = TOWN.pos.z; H.face = TOWN.face; H.come = false; }
  else if (H.come) {
    const dx = TOWN.pos.x - H.x, dz = TOWN.pos.z - H.z, d = Math.hypot(dx, dz);
    if (d > 2.6) { const sp = d > 10 ? 7 : 3; H.x += dx / d * sp * dt; H.z += dz / d * sp * dt; H.face = Math.atan2(dx, dz); H.spd = sp; } else { H.come = false; H.spd = 0; }
  } else H.spd = 0;
  const sp = TOWN.mounted ? TOWN.speed : H.spd || 0;
  const hy = gy(H.x, H.z); H.A.root.position.set(H.x, hy, H.z); H.A.root.rotation.y = H.face; H.A.root.rotation.x = Math.atan2(gslope(H.x, H.z), 1) * 0.5; H.A.play(sp > 6 ? 'Gallop' : sp > 0.4 ? 'Walk' : 'Idle', 0.25); H.A.mixer.update(dt);
  // the rider sits on the saddle
  const J = TOWN.me; if (J) { if (TOWN.mounted) { J.root.position.set(H.x - Math.sin(H.face) * 0.1, hy + 1.12, H.z - Math.cos(H.face) * 0.1); J.root.rotation.y = H.face; if (J.ual) { J.play('Sitting_Idle_Loop', 0.2); J.mixer.update(dt); } } }
  if (TRAVEL.frame % 20 === 0) horseHud();
}
function horseHud() {
  const b = $('#townHorse'); if (!b) return;
  const ok = horseAvailable() && !TOWN.mineOn && !G.screen; b.hidden = !ok; if (!ok) return;
  const near = TOWN.horse && Math.hypot(TOWN.horse.x - TOWN.pos.x, TOWN.horse.z - TOWN.pos.z) < 3.5;
  b.textContent = TOWN.mounted ? '🐴 Dismount' : near ? '🐴 Mount' : '🐴 Whistle';
}
// the stable by the festival gate: Edda hires horses and sells them
function stableRows(box) {
  const s = shopState();
  stationRows(box, '“Need to get across the realm? The lake’s a fair walk and the castle further. A good horse makes short work of it.”', [
    ['Hire a horse', 'Yours until you leave town. Whistle (H, or the horse button) to call it, then mount up. Rides at a gallop.', TOWN.horseRent || s.owned.horse ? 'Got one' : `Hire ${fmtMoney(40)}`, () => { if (TOWN.horseRent || s.owned.horse) return; if (!spend(40, 'A hired horse')) return; TOWN.horseRent = true; closeVendor(); callHorse(); }],
    ['Buy a bay horse', 'Your own horse, every visit, anywhere outdoors.', s.owned.horse ? 'Owned' : `Buy ${fmtMoney(9000)}`, () => { if (s.owned.horse) return; if (!spend(9000, 'A bay horse')) return; s.owned.horse = 'bay'; saveCareer(); closeVendor(); callHorse(); }],
    ['Buy a white horse', 'A grey destrier fit for the king’s court.', s.owned.horse === 'white' ? 'Owned' : `Buy ${fmtMoney(22000)}`, () => { if (s.owned.horse === 'white') return; if (!spend(22000, 'A white horse')) return; s.owned.horse = 'white'; saveCareer(); TOWN.horse && TOWN.root.remove(TOWN.horse.A.root); TOWN.horse = null; TOWN.mounted = false; closeVendor(); callHorse(); }]
  ]);
}
// animals round the farms (they wander a little)
function buildAnimals() {
  ANIMAL.list = [];
  const spots = [['Cow', -244, 186], ['Cow', -252, 192], ['Cow', -238, 172], ['Horse', -30, -296], ['Horse', -44, -294], ['Horse', 22, 90], ['Cow', 70, -12], ['Alpaca', -150, 205]];
  for (const [k, x, z] of spots.slice(0, IS_TOUCH ? 5 : 8)) animalMake(k, A => {
    if (!TOWN.on) return; A.root.position.set(x, gy(x, z), z); A.root.rotation.y = Math.random() * TAU; A.root.userData.dyn = true; TOWN.root.add(A.root);
    ANIMAL.list.push({ A, hx: x, hz: z, x, z, tx: x, tz: z, t: Math.random() * 6, face: A.root.rotation.y });
  });
}
function updateAnimals(dt) {
  for (const N of ANIMAL.list) {
    const far = Math.hypot(N.x - TOWN.pos.x, N.z - TOWN.pos.z) > 120; N.A.root.visible = !far; if (far) continue;
    N.t -= dt; if (N.t <= 0) { N.t = 4 + Math.random() * 8; if (Math.random() < 0.5) { N.tx = N.hx + (Math.random() - 0.5) * 10; N.tz = N.hz + (Math.random() - 0.5) * 10; } }
    const dx = N.tx - N.x, dz = N.tz - N.z, d = Math.hypot(dx, dz);
    if (d > 0.4) { N.x += dx / d * 0.8 * dt; N.z += dz / d * 0.8 * dt; N.face += Math.atan2(Math.sin(Math.atan2(dx, dz) - N.face), Math.cos(Math.atan2(dx, dz) - N.face)) * Math.min(1, dt * 3); N.A.play('Walk'); }
    else N.A.play(N.A.acts.Eating && N.t > 6 ? 'Eating' : 'Idle');
    N.A.root.position.set(N.x, gy(N.x, N.z), N.z); N.A.root.rotation.y = N.face; N.A.mixer.update(dt);
  }
}
// people far off aren't drawn or animated (skinning a whole realm's worth of townsfolk is the heaviest thing we do)
function peopleCull() {
  const c = W3.camera.position, F = IS_TOUCH ? 45 : 65, vis = (o, f) => { if (o) o.visible = Math.hypot(o.position.x - c.x, o.position.z - c.z) < f; };
  for (const N of (typeof FOLK !== 'undefined' && FOLK.people) || []) vis(N.J.root, N.suspended ? 0 : F);
  for (const S of (typeof SPECT !== 'undefined' && SPECT.people) || []) vis(S.J.root, F + 25);
  const rigs = [...FOLK.people.filter(N => !N.suspended).map(N => ({ J: N.J, owner: N })), ...SPECT.people.map(S => ({ J: S.J, owner: S })), ...SPECT.seated.map(S => ({ J: S.J, owner: S }))];
  rigs.sort((a, b) => a.J.root.position.distanceToSquared(c) - b.J.root.position.distanceToSquared(c));
  rigs.forEach((R, i) => { R.owner.budgetHidden = i >= (IS_TOUCH ? 44 : 80); if (R.owner.budgetHidden) R.J.root.visible = false; });
  for (const S of TOWN.stalls || []) if (S.npc && S.npc.root) {
    const cameraDistance = Math.hypot(S.x - c.x, S.z - c.z);
    const playerDistance = Math.hypot(S.x - TOWN.pos.x, S.z - TOWN.pos.z);
    S.npc.root.visible = cameraDistance < F || playerDistance < 14;
  }
}
