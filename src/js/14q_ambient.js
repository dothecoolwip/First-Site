// Shared civilian clearance, routes, population pacing, and reserved seat transitions.
const FOLK_RADIUS = 0.32;
function folkLineFree(x, z, tx, tz) {
  const count = Math.max(1, Math.ceil(Math.hypot(tx - x, tz - z) / 0.2));
  for (let i = 0; i <= count; i++) if (navBlocked(x + (tx - x) * i / count, z + (tz - z) * i / count, FOLK_RADIUS)) return false;
  return true;
}
function* folkRouteSteps(x, z, tx, tz) {
  if (navBlocked(x, z, FOLK_RADIUS) || navBlocked(tx, tz, FOLK_RADIUS)) return null;
  if (folkLineFree(x, z, tx, tz)) return [[tx, tz]];
  const cell = 0.8, sx = Math.round(x / cell), sz = Math.round(z / cell), ex = Math.round(tx / cell), ez = Math.round(tz / cell);
  const key = (i, j) => i + ',' + j, start = key(sx, sz), goal = key(ex, ez);
  const cost = new Map([[start, 0]]), from = new Map(), freeCache = new Map(), heap = [];
  const free = (i, j) => { const k = key(i, j); if (!freeCache.has(k)) freeCache.set(k, !navBlocked(i * cell, j * cell, FOLK_RADIUS)); return freeCache.get(k); };
  const push = entry => { let i = heap.length; heap.push(entry); while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= entry[0]) break; heap[i] = heap[p]; i = p; } heap[i] = entry; };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let i = 0; heap[0] = last; for (;;) { let c = i * 2 + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1][0] < heap[c][0]) c++; if (heap[c][0] >= last[0]) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return top; };
  if (!folkLineFree(x, z, sx * cell, sz * cell) || !folkLineFree(ex * cell, ez * cell, tx, tz)) return null;
  push([0, sx, sz, 0]); let found = false, visits = 0;
  while (heap.length && visits++ < 6000) {
    if (visits % 128 === 0) yield null;
    const [, i, j, oldCost] = pop(), k = key(i, j);
    if (cost.get(k) !== oldCost) continue;
    if (k === goal) { found = true; break; }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = i + di, nj = j + dj, nk = key(ni, nj);
      if (ni < Math.min(sx, ex) - 15 || ni > Math.max(sx, ex) + 15 || nj < Math.min(sz, ez) - 15 || nj > Math.max(sz, ez) + 15 || !free(ni, nj)) continue;
      if (di && dj && (!free(i + di, j) || !free(i, j + dj))) continue;
      if (!folkLineFree(i * cell, j * cell, ni * cell, nj * cell)) continue;
      const next = oldCost + Math.hypot(di, dj);
      if (next >= (cost.get(nk) ?? Infinity)) continue;
      cost.set(nk, next); from.set(nk, k); push([next + Math.hypot(ex - ni, ez - nj), ni, nj, next]);
    }
  }
  if (!found) return null;
  const path = [[tx, tz]]; let k = goal;
  while (k !== start) { const [i, j] = k.split(',').map(Number); path.push([i * cell, j * cell]); k = from.get(k); }
  path.reverse(); const out = []; let ax = x, az = z, index = 0;
  while (index < path.length) { let end = Math.min(index + 20, path.length - 1); while (end > index && !folkLineFree(ax, az, ...path[end])) end--; out.push(path[end]); [ax, az] = path[end]; index = end + 1; }
  return out;
}
function folkRoute(x, z, tx, tz) {
  const search = folkRouteSteps(x, z, tx, tz); let step;
  do { step = search.next(); } while (!step.done);
  return step.value;
}
function folkWaypoint(N) {
  if (N.routeWait > 0) { N.routeWait = Math.max(0, N.routeWait - (N.elapsedStep || 0.016)); return null; }
  if (N.route?.length) return N.route[0];
  if (FOLK.routeBudget <= 0) return null;
  FOLK.routeBudget--;
  if (!N.routeSearch) N.routeSearch = folkRouteSteps(N.x, N.z, N.tx, N.tz);
  const step = N.routeSearch.next();
  if (!step.done) return null;
  N.routeSearch = null; N.route = step.value;
  if (!N.route) { folkRelease(N); N.state = 'choose'; N.timer = rand(1, 3); folkPlay(N, 'Idle_Loop'); return null; }
  N.best = Infinity; N.stuck = 0; return N.route[0];
}
function folkMove(N, dx, dz) {
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.1));
  for (let i = 0; i < count; i++) {
    const x = N.x + dx / count, z = N.z + dz / count;
    if (!navBlocked(x, z, FOLK_RADIUS) && castleWalkable(N.x, N.z, x, z, FOLK_RADIUS)) { N.x = x; N.z = z; }
    else if (!navBlocked(x, N.z, FOLK_RADIUS) && castleWalkable(N.x, N.z, x, N.z, FOLK_RADIUS)) N.x = x;
    else if (!navBlocked(N.x, z, FOLK_RADIUS) && castleWalkable(N.x, N.z, N.x, z, FOLK_RADIUS)) N.z = z;
  }
}
function folkSpawnSafe(x, z) {
  return !navBlocked(x, z, 0.65) && !TOWN.stalls.some(S => Math.hypot(x - S.ax, z - S.az) < 2 || Math.hypot(x - S.x, z - S.z) < 1.4);
}
function folkDistrictSpawn(index) {
  const districts = [[-39, 8], [36, 14], [43, 59], [-37, 53], [-43, -29], [39, -44], [-12, 48], [10, -156]];
  const [cx, cz] = districts[index % districts.length];
  for (let n = 0; n < 60; n++) { const x = cx + rand(-10, 10), z = cz + rand(-10, 10); if (folkSpawnSafe(x, z)) return { x, z }; }
  return freeSpot();
}
function folkNeighborBuild() {
  FOLK.nearGrid.clear();
  for (const N of FOLK.people) { if (N.suspended) continue; const k = Math.floor(N.x / 2) + ',' + Math.floor(N.z / 2); if (!FOLK.nearGrid.has(k)) FOLK.nearGrid.set(k, []); FOLK.nearGrid.get(k).push(N); }
}
function folkNeighbors(N) {
  const out = [], x = Math.floor(N.x / 2), z = Math.floor(N.z / 2);
  for (let i = x - 1; i <= x + 1; i++) for (let j = z - 1; j <= z + 1; j++) out.push(...(FOLK.nearGrid.get(i + ',' + j) || []));
  return out;
}
function folkPopulationTick(dt) {
  if (G.fast || G.renderEvery > 100) return; // simulation regression fast-forward is not device timing
  FOLK.ema += (dt - FOLK.ema) * (1 - Math.exp(-dt / 2));
  FOLK.slow = dt > 0.025 && FOLK.ema > 0.025 ? FOLK.slow + dt : 0;
  FOLK.healthy = FOLK.ema < 0.020 ? FOLK.healthy + dt : 0;
  const max = IS_TOUCH ? 28 : 48, min = IS_TOUCH ? 12 : 20;
  if (FOLK.slow > 4) { FOLK.limit = Math.max(min, FOLK.limit - 4); FOLK.slow = 0; }
  if (FOLK.healthy > 12) { FOLK.limit = Math.min(max, FOLK.limit + 2); FOLK.healthy = 0; }
  let active = FOLK.people.filter(N => !N.suspended).length;
  for (const N of [...FOLK.people].sort((a, b) => pd(b, TOWN.pos) - pd(a, TOWN.pos))) {
    if (active <= FOLK.limit) break;
    if (['guard', 'gateguard', 'smith', 'gardener'].includes(N.role) || N.suspended || pd(N, TOWN.pos) < 18) continue;
    folkRelease(N); N.suspended = true; N.state = 'choose'; N.route = null; N.J.root.visible = false; active--;
  }
  for (const N of FOLK.people) if (active < FOLK.limit && N.suspended && folkSpawnSafe(N.x, N.z)) { N.suspended = false; N.elapsed = 0; active++; }
}

// Sitting is a reserved placement. Walking starts in a real aisle beside the row.
function folkSeatAisle(S) {
  const exitZ = S.A.z + S.exit * (LIST.L * 0.5 + 0.7);
  // The front bench sits between the rope and another bench. Probe actual
  // clearances rather than assuming that a fixed 0.95 m offset is an aisle.
  for (const offset of [1.2, 1.5, 1.8, 2.7, 3.4, 4.5, 5.6, 7.8]) for (const side of [S.sx, -S.sx]) {
    const x = S.x + side * offset;
    if (!navBlocked(x, S.z, FOLK_RADIUS) && !navBlocked(x, exitZ, FOLK_RADIUS) && folkLineFree(x, S.z, x, exitZ)) return x;
  }
  return null;
}
function folkSeatWalk(S, dt) {
  if (S.aisleX == null) S.aisleX = folkSeatAisle(S);
  if (S.aisleX == null) { S.phase = 'sit'; S.timer = 10; S.J.play('Sitting_Idle_Loop', 0.3); return false; }
  const aisleX = S.aisleX;
  if (!S.stood) {
    S.transition = Math.min(1, (S.transition || 0) + dt * 2);
    S.J.root.position.x = S.x + (aisleX - S.x) * S.transition;
    S.J.root.position.y = S.y * (1 - S.transition) + gy(aisleX, S.J.root.position.z) * S.transition;
    if (S.transition < 1) return false;
    S.stood = true;
  }
  const tx = aisleX, tz = S.phase === 'leave' ? S.A.z + S.exit * (LIST.L * 0.5 + 0.7) : S.z;
  const N = { x: S.J.root.position.x, z: S.J.root.position.z };
  if (!S.route) S.route = folkRoute(N.x, N.z, tx, tz);
  if (!S.route) { S.retry = (S.retry || 0) + dt; if (S.retry > 2) { S.phase = 'away'; S.timer = 5; S.J.root.visible = false; } return false; }
  const [x, z] = S.route[0], d = Math.hypot(x - N.x, z - N.z);
  if (d > 0.05) { const step = Math.min(d, dt * 1.7); folkMove(N, (x - N.x) / d * step, (z - N.z) / d * step); S.J.root.position.set(N.x, gy(N.x, N.z), N.z); S.J.root.rotation.y = Math.atan2(x - N.x, z - N.z); }
  if (d < 0.15) S.route.shift();
  return !S.route.length;
}
