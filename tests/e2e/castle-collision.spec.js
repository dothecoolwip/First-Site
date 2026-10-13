const { test, expect } = require('./fixtures');
const path = require('path');

test('castle floors, cliff faces, and every ramp agree with player collision @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.terrain && GAMEPLAY.terrainBVH');
  const audit = await game.run(`(() => {
    const floors = HILL.tiers.map((T, i) => {
      const r = T.rx * 0.9;
      const x = T.cx + r, z = T.cz;
      return { tier: i + 1, expected: gy(x, z), physics: gameplayGroundAt(x, z) };
    });
    const cliffs = HILL.tiers.slice(1).map((T, i) => {
      const x0 = T.cx - T.rx - 2, x1 = T.cx - T.rx + 2, z = T.cz;
      return { tier: i + 2, blocked: !castleWalkable(x0, z, x1, z, 0.42) };
    });
    const ramps = HILL.ramps.map(Rp => {
      const T = HILL.tiers[Rp.k], r = T.rx + HILL.rampW / 2;
      let clear = 0, blocked = 0;
      for (let i = 0; i < 24; i++) {
        const a = Rp.a + (Rp.b - Rp.a) * i / 24, b = Rp.a + (Rp.b - Rp.a) * (i + 1) / 24;
        const ok = castleWalkable(T.cx + r * Math.sin(a), T.cz + r * Math.cos(a), T.cx + r * Math.sin(b), T.cz + r * Math.cos(b), 0.42);
        if (ok) clear++; else blocked++;
      }
      const point = (radius, angle) => [T.cx + radius * Math.sin(angle), T.cz + radius * Math.cos(angle)];
      const bottom = point(T.rx + HILL.rampW + 1.5, Rp.a), start = point(r, Rp.a);
      const end = point(r, Rp.b), top = point(T.rx - 2, Rp.b);
      const entrance = castleWalkable(...bottom, ...start, 0.42);
      const exit = castleWalkable(...end, ...top, 0.42);
      const nav = [start, point(r, (Rp.a + Rp.b) / 2), end].map(([x, z]) => navBlocked(x, z, 0.42));
      const nearest = TOWN.obst.map(o => ({ d: Math.hypot(o.x - end[0], o.z - end[1]) - o.r, x: o.x, z: o.z, r: o.r })).sort((a, b) => a.d - b.d).slice(0, 3);
      return { tier: Rp.k + 1, clear, blocked, entrance, exit, nav, nearest, cliff: cliffAt(...end, 0.42), gate: gateBlocked(...end, 0.42) };
    });
    const edges = HILL.tiers.slice(1).map((T, i) => {
      let blocked = 0;
      for (let j = 0; j < 144; j++) {
        const a = j * Math.PI * 2 / 144;
        const x0 = T.cx + (T.rx + 2) * Math.sin(a), z0 = T.cz + (T.rz + 2) * Math.cos(a);
        const x1 = T.cx + (T.rx - 2) * Math.sin(a), z1 = T.cz + (T.rz - 2) * Math.cos(a);
        if (!castleWalkable(x0, z0, x1, z1, 0.42)) blocked++;
      }
      return { tier: i + 2, blocked };
    });
    return { floors, cliffs, ramps, edges };
  })()`);
  for (const floor of audit.floors) expect(floor.physics).toBeCloseTo(floor.expected, 1);
  for (const cliff of audit.cliffs) expect(cliff.blocked).toBe(true);
  for (const ramp of audit.ramps) {
    expect(ramp.blocked, JSON.stringify(audit)).toBe(0);
    expect(ramp.entrance, JSON.stringify(audit)).toBe(true);
    expect(ramp.exit, JSON.stringify(audit)).toBe(true);
    expect(ramp.nav, JSON.stringify(audit)).toEqual([false, false, false]);
  }
  for (const edge of audit.edges) expect(edge.blocked, JSON.stringify(audit)).toBeGreaterThan(125);
});

test('waypoints can reach a vendor on each castle level through the gates and ramps @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.stalls.length > 10');
  const routes = await game.run(`(() => {
    const writs = { ...(CAREER.writs || {}) };
    CAREER.writs = { ...writs, bailey: true, royal: true };
    const targets = ['marmour', 'msmith', 'rsmith', 'throne'];
    const results = targets.map(key => {
      const S = TOWN.stalls.find(s => s.V.key === key);
      const route = realmPath(0, -137, S.ax, S.az);
      let blocked = 0, length = 0, prev = [0, -137], problems = [];
      for (const next of route) {
        const d = Math.hypot(next[0] - prev[0], next[1] - prev[1]);
        const n = Math.max(1, Math.ceil(d)); length += d;
        for (let i = 1; i < n; i++) {
          const t = i / n, x = prev[0] + (next[0] - prev[0]) * t, z = prev[1] + (next[1] - prev[1]) * t;
          const nav = navBlocked(x, z, 0.42), floor = castleSurfaceSafe(x, z, 0.42);
          if (nav || !floor) { blocked++; if (problems.length < 5) problems.push({ x: +x.toFixed(1), z: +z.toFixed(1), nav, floor, tier: tierOf(x, z), from: prev, to: next,
            nearest: TOWN.obst.map(o => ({ d: +(Math.hypot(o.x - x, o.z - z) - o.r).toFixed(2), x: +o.x.toFixed(1), z: +o.z.toFixed(1), r: o.r })).sort((a, b) => a.d - b.d)[0] }); }
        }
        prev = next;
      }
      return { key, points: route.length, length, blocked, problems };
    });
    CAREER.writs = writs;
    return results;
  })()`);
  for (const route of routes) {
    expect(route.points, JSON.stringify(routes)).toBeGreaterThan(1);
    expect(route.blocked, JSON.stringify(routes)).toBe(0);
  }
});

test('castle levels remain visible and walkable from the road and courts @touch', async ({ game, page }, testInfo) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.terrain');
  const views = [
    ['bailey', 0, -170], ['lower-terrace', 45, -215],
    ['kings-court', 30, -235], ['citadel', 0, -232]
  ];
  for (const [name, x, z] of views) {
    await game.run(`(TOWN.pos = { x: ${x}, z: ${z} }, TOWN.yaw = 0, TOWN.pitch = 0.35, TOWN.cam = null, G.renderEvery = 1, true)`);
    await page.waitForTimeout(250);
    await page.locator('#gl').screenshot({ path: path.join(__dirname, '..', '..', `castle-${name}-${testInfo.project.name}.png`) });
    expect(await game.run(`Math.abs(gameplayGroundAt(${x}, ${z}) - gy(${x}, ${z}))`)).toBeLessThan(0.1);
  }
});

test('player and townsfolk cannot pass through a terrace face, but can climb every ramp @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.terrain');
  const audit = await game.run(`(() => {
    const old = { ...TOWN.pos }, edges = HILL.tiers.slice(1).map(T => {
      const from = { x: T.cx - T.rx - 2, z: T.cz }, into = { x: T.cx - T.rx + 2, z: T.cz };
      TOWN.pos = { ...into }; townCollide(from);
      const player = tierOf(TOWN.pos.x, TOWN.pos.z) < tierOf(into.x, into.z);
      const npc = { ...into }; navPushOut(npc, from);
      return { tier: tierOf(into.x, into.z), player, npc: tierOf(npc.x, npc.z) < tierOf(into.x, into.z) };
    });
    const ramps = HILL.ramps.map(Rp => {
      const T = HILL.tiers[Rp.k], r = T.rx + HILL.rampW / 2;
      const point = i => ({ x: T.cx + r * Math.sin(Rp.a + (Rp.b - Rp.a) * i / 40), z: T.cz + r * Math.cos(Rp.a + (Rp.b - Rp.a) * i / 40) });
      TOWN.pos = point(0); let error = 0;
      for (let i = 1; i <= 40; i++) {
        const before = { ...TOWN.pos }, target = point(i);
        TOWN.pos = { ...target }; townCollide(before);
        error = Math.max(error, Math.hypot(TOWN.pos.x - target.x, TOWN.pos.z - target.z));
      }
      return { tier: Rp.k + 1, error, height: gy(TOWN.pos.x, TOWN.pos.z) };
    });
    TOWN.pos = old;
    return { edges, ramps };
  })()`);
  for (const edge of audit.edges) { expect(edge.player, JSON.stringify(audit)).toBe(true); expect(edge.npc, JSON.stringify(audit)).toBe(true); }
  for (const ramp of audit.ramps) { expect(ramp.error, JSON.stringify(audit)).toBeLessThan(0.2); expect(ramp.height).toBeCloseTo(ramp.tier * 6 - 6, 1); }
});

test('castle gates, perimeter, and vendor approaches stay navigable where intended @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.stalls.length > 10');
  const audit = await game.run(`(() => {
    const outside = HILL.tiers[0], perimeter = [];
    for (let i = 0; i < 180; i++) {
      const a = i * Math.PI * 2 / 180;
      const x = outside.cx + outside.rx * Math.sin(a), z = outside.cz + outside.rz * Math.cos(a);
      perimeter.push({ a, blocked: navBlocked(x, z, 0.42) });
    }
    const vendors = TOWN.stalls.filter(s => tierOf(s.ax, s.az) > 0 && !s.mine).map(s => ({
      key: s.V.key, tier: tierOf(s.ax, s.az), x: s.ax, z: s.az, blocked: navBlocked(s.ax, s.az, 0.42),
      cliff: cliffAt(s.ax, s.az, 0.42), arena: !!arenaBlocked(s.ax, s.az, 0.42),
      nearest: TOWN.obst.map(o => ({ d: +(Math.hypot(o.x - s.ax, o.z - s.az) - o.r).toFixed(2), x: +o.x.toFixed(1), z: +o.z.toFixed(1), r: o.r })).sort((a, b) => a.d - b.d).slice(0, 1)
    }));
    const gates = (TOWN.gates || []).map(g => ({ key: g.key, x: g.x, z: g.z, closed: gateBlocked(g.x, g.z, 0.42) }));
    const writs = { ...(CAREER.writs || {}) };
    CAREER.writs = { ...writs, bailey: true, royal: true };
    for (const gate of gates) gate.open = !navBlocked(gate.x, gate.z, 0.42);
    CAREER.writs = writs;
    const throne = TOWN.stalls.find(s => s.V.key === 'throne');
    const path = realmPath(0, -234.9, throne.ax, throne.az);
    let blockedSteps = 0, previous = [0, -234.9];
    for (const next of path) {
      const distance = Math.hypot(next[0] - previous[0], next[1] - previous[1]);
      for (let i = 1; i < Math.ceil(distance); i++) {
        const t = i / Math.ceil(distance);
        if (navBlocked(previous[0] + (next[0] - previous[0]) * t, previous[1] + (next[1] - previous[1]) * t, 0.42)) blockedSteps++;
      }
      previous = next;
    }
    return { perimeterBlocked: perimeter.filter(p => p.blocked).length, gaps: perimeter.filter(p => !p.blocked).map(p => +p.a.toFixed(2)), vendorCount: vendors.length, vendors: vendors.filter(v => v.blocked), gates, throneRoute: { points: path.length, blockedSteps } };
  })()`);
  expect(audit.perimeterBlocked, JSON.stringify(audit)).toBe(180);
  expect(audit.vendorCount).toBeGreaterThan(8);
  expect(audit.vendors, JSON.stringify(audit)).toEqual([]);
  expect(audit.gates.every(g => g.closed)).toBe(true);
  expect(audit.gates.every(g => g.open), JSON.stringify(audit)).toBe(true);
  expect(audit.throneRoute.points).toBeGreaterThan(1);
  expect(audit.throneRoute.blockedSteps, JSON.stringify(audit)).toBe(0);
});
