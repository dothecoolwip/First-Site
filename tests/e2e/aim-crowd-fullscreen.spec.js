const { test, expect } = require('./fixtures');

test('manual head aim survives release and assistance scales across frame rates @touch', async ({ game, page }) => {
  await game.noRender();
  await game.run("(quickFight(1), beginFight(), G.paused = true, G.settings.cine = false, true)");
  const result = await page.evaluate(() => {
    const S = window.__ST, { G, IN, FP } = S, f = G.player;
    const opponent = G.fighters.find(o => o.team !== f.team);
    opponent.pos.x = f.pos.x + 2; opponent.pos.z = f.pos.z + 3; opponent.state = 'standing';
    G.settings.assist = true;
    const samples = [];
    for (const view of ['fp', 'tp']) for (const mode of ['touch', 'kb', 'pad']) for (const strength of [0, 0.5, 1]) for (const fps of [30, 60, 120]) {
      G.settings.view = view; IN.mode = mode; G.settings.assistStrength = strength;
      FP.yaw = 0; FP.pitch = 0.42; FP.looking = 0.2; IN.mouseIdle = 0; IN.lockHold = 0; IN.lock = opponent;
      S.updateLock(f, 1 / fps); const during = FP.yaw;
      FP.looking = 0; IN.mouseIdle = 9; IN.lockHold = 0; IN.lock = opponent;
      for (let i = 0; i < fps; i++) S.updateLock(f, 1 / fps);
      samples.push({ view, mode, strength, fps, during, pitch: FP.pitch, yaw: FP.yaw });
    }
    IN.mode = 'touch'; G.settings.assistStrength = 1; FP.pitch = 0;
    const zone = document.querySelector('#lookzone');
    zone.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 91, pointerType: 'touch', clientX: 600, clientY: 200 }));
    zone.dispatchEvent(new PointerEvent('pointermove', { pointerId: 91, pointerType: 'touch', clientX: 600, clientY: 140 }));
    zone.dispatchEvent(new PointerEvent('pointerup', { pointerId: 91, pointerType: 'touch', clientX: 600, clientY: 140 }));
    const touchPitch = FP.pitch; FP.looking = 0; IN.lockHold = 0; IN.lock = opponent;
    for (let i = 0; i < 600; i++) S.updateLock(f, 1 / 60);
    const finalPitch = FP.pitch;
    IN.mode = 'kb'; G.paused = false; FP.pitch = 0;
    document.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: -90 }));
    G.paused = true; const mousePitch = FP.pitch; FP.looking = 0; IN.mouseIdle = 9; IN.lockHold = 0; IN.lock = opponent;
    for (let i = 0; i < 600; i++) S.updateLock(f, 1 / 60);
    const mouseFinal = FP.pitch;
    const lunges = [];
    for (const strength of [0, 0.5, 1]) {
      G.settings.assistStrength = strength; FP.looking = 0; IN.mouseIdle = 9; f.facing = 0;
      S.playerLunge(f, 'swing', opponent); lunges.push(f.facing);
    }
    FP.looking = 0.2; f.facing = 0; G.settings.assistStrength = 1; S.playerLunge(f, 'swing', opponent);
    return { samples, touchPitch, finalPitch, mousePitch, mouseFinal, lunges, manualLunge: f.facing };
  });
  expect(result.touchPitch).toBeGreaterThan(0.1); expect(result.finalPitch).toBe(result.touchPitch);
  expect(result.mousePitch).toBeGreaterThan(0.1); expect(result.mouseFinal).toBe(result.mousePitch);
  expect(result.lunges[0]).toBe(0); expect(result.lunges[1]).toBeGreaterThan(0); expect(result.lunges[2]).toBeGreaterThan(result.lunges[1]); expect(result.manualLunge).toBe(0);
  for (const sample of result.samples) { expect(sample.pitch).toBe(0.42); expect(sample.during).toBe(0); if (!sample.strength) expect(sample.yaw).toBe(0); }
  for (const mode of ['touch', 'kb', 'pad']) {
    const a = result.samples.filter(s => s.mode === mode && s.view === 'fp' && s.strength === 0.5);
    expect(Math.max(...a.map(s => s.yaw)) - Math.min(...a.map(s => s.yaw))).toBeLessThan(0.015);
    const at = n => result.samples.find(s => s.mode === mode && s.view === 'fp' && s.strength === n && s.fps === 60).yaw;
    expect(at(0.5)).toBeGreaterThan(at(0)); expect(at(1)).toBeGreaterThan(at(0.5));
  }
});

test('assist migration and visible slider preserve sensitivity and save @touch', async ({ game, page }) => {
  expect(await game.run("[migrateAimStrength({}), migrateAimStrength({assist:false}), migrateAimStrength({assist:true}), migrateAimStrength({assistStrength:2}), migrateAimStrength({assistStrength:'bad'})]")).toEqual([0.5, 0, 1, 1, 0.5]);
  await game.run("(showScreen('settings'), true)");
  const sens = await game.run('G.settings.sens');
  await page.locator('#optAssistStrength').evaluate(el => { el.value = '50'; el.dispatchEvent(new Event('input')); });
  await expect(page.locator('#assistPercent')).toHaveText('50%');
  expect(await game.run('G.settings.sens')).toBe(sens);
  expect(await game.run("store.get('settings3', {}).assistStrength")).toBe(0.5);
  await page.locator('#optAssistStrength').scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('assist-settings.png') });
  if (test.info().project.name === 'phone') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#optAssistStrength').scrollIntoViewIfNeeded();
    await expect(page.locator('#assistPercent')).toHaveText('50%');
    await page.screenshot({ path: test.info().outputPath('assist-settings-portrait.png') });
  }
});

test('fullscreen only follows explicit gestures and survives internal transitions @touch', async ({ game, page }) => {
  await game.noRender();
  await page.evaluate(() => {
    window.__fsRequests = 0; window.__fsExits = 0; window.__mockFull = null;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => window.__mockFull });
    document.documentElement.requestFullscreen = async () => { window.__fsRequests++; window.__mockFull = document.documentElement; document.dispatchEvent(new Event('fullscreenchange')); };
    document.exitFullscreen = async () => { window.__fsExits++; window.__mockFull = null; document.dispatchEvent(new Event('fullscreenchange')); };
  });
  await game.run("(setMode('touch'), quickFight(1), beginFight(), toTitle(), quickFight(1), beginFight(), true)");
  expect(await page.evaluate(() => window.__fsRequests)).toBe(0);
  await game.run('(goFullscreen(true), true)'); await expect.poll(() => game.run('fullscreenActive()')).toBe(true);
  await game.run('(toTitle(), quickFight(1), beginFight(), true)');
  expect(await page.evaluate(() => window.__fsRequests)).toBe(1); expect(await game.run('fullscreenActive()')).toBe(true);
  await page.evaluate(() => { window.__mockFull = null; document.dispatchEvent(new Event('fullscreenchange')); });
  await game.run('(toTitle(), quickFight(1), beginFight(), true)'); expect(await page.evaluate(() => window.__fsRequests)).toBe(1);
  await game.run('(goFullscreen(true), true)'); await expect.poll(() => game.run('fullscreenActive()')).toBe(true);
  await game.run('(goFullscreen(true), true)'); await expect.poll(() => game.run('fullscreenActive()')).toBe(false);
});

test('shared footprints keep civilian routes clear over three simulated minutes @touch', async ({ game, page }) => {
  test.setTimeout(180000);
  await page.evaluate(() => { let seed = 20261013; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; });
  await game.noRender(); await game.run('(enterTown(), true)'); await game.until('UAL.ready && FOLK.people.length > 0');
  const result = await page.evaluate(() => {
    const S = window.__ST, { FOLK, GAMEPLAY, TOWN } = S;
    const report = { count: FOLK.people.length, shapes: GAMEPLAY.shapes.length, penetrations: 0, seatPenetrations: 0, seatWalking: 0, walking: 0, moved: 0, runtimeMs: 0 };
    const before = FOLK.people.map(N => [N.x, N.z]);
    const start = performance.now();
    for (let i = 0; i < 1800; i++) {
      S.updateFolk(0.1);
      for (const N of FOLK.people) if (N.state === 'walk') { report.walking++; if (S.navBlocked(N.x, N.z, 0.30)) report.penetrations++; }
      for (const seat of S.SPECT.seated) if (seat.stood && ['leave', 'enter'].includes(seat.phase)) { report.seatWalking++; if (S.navBlocked(seat.J.root.position.x, seat.J.root.position.z, 0.30)) report.seatPenetrations++; }
    }
    report.runtimeMs = performance.now() - start;
    report.moved = FOLK.people.filter((N, i) => Math.hypot(N.x - before[i][0], N.z - before[i][1]) > 2).length;
    report.spawnSafe = FOLK.people.filter(N => N.state === 'walk' || N.state === 'choose').every(N => !S.navBlocked(N.x, N.z, 0.30));
    report.roles = [...new Set(FOLK.people.map(N => N.role))];
    const barber = TOWN.stalls.find(st => st.V.key === 'barber'); report.barberApproach = !S.navBlocked(barber.ax, barber.az, 0.32);
    const savedPos = TOWN.pos, A = S.ARENAS[0], x = A.x + S.LIST.W / 2 + 6.3 + 1.1;
    TOWN.pos = { x, z: A.z }; S.townCollide();
    report.playerAisle = Math.hypot(TOWN.pos.x - x, TOWN.pos.z - A.z) < 0.01;
    TOWN.pos = savedPos;
    return report;
  });
  await test.info().attach('crowd-simulation', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(result.count).toBeGreaterThanOrEqual(28); expect(result.shapes).toBeGreaterThan(20);
  expect(result.penetrations).toBe(0); expect(result.moved).toBeGreaterThan(8); expect(result.spawnSafe).toBe(true); expect(result.barberApproach).toBe(true);
  expect(result.seatWalking).toBeGreaterThan(0); expect(result.seatPenetrations).toBe(0);
  expect(result.playerAisle).toBe(true);
  expect(result.roles).toEqual(expect.arrayContaining(['visitor', 'walker', 'fan']));
});

test('rotated footprints, overlap recovery and population pacing @touch', async ({ game, page }) => {
  await game.noRender(); await game.run('(enterTown(), true)'); await game.until('UAL.ready && FOLK.people.length > 0');
  const result = await page.evaluate(() => {
    const S = window.__ST; let base = null;
    for (let x = -90; x <= 90 && !base; x += 10) for (let z = -40; z <= 70 && !base; z += 10) {
      if ([-4, 0, 4].every(dx => [-4, 0, 4].every(dz => !S.navBlocked(x + dx, z + dz, 0.7)))) base = { x, z };
    }
    if (!base) throw new Error('No clear test area');
    const { x, z } = base, yaw = Math.PI / 4;
    S.gameplayShape(x, z, 2, 0.5, yaw, 1);
    const rotated = S.gameplayShapeBlocked(x + Math.cos(yaw) * 1.5, z - Math.sin(yaw) * 1.5, 0.1);
    const clearSide = !S.gameplayShapeBlocked(x + Math.sin(yaw) * 1.5, z + Math.cos(yaw) * 1.5, 0.1);
    const route = S.folkRoute(x - 4, z, x + 4, z);
    let safe = !!route, ax = x - 4, az = z;
    for (const [bx, bz] of route || []) { for (let i = 0; i <= 20; i++) if (S.navBlocked(ax + (bx - ax) * i / 20, az + (bz - az) * i / 20, 0.30)) safe = false; ax = bx; az = bz; }
    const recovered = S.navFree(x, z, 0.32);
    const N = { x: x - 4, z }; S.folkMove(N, 8, 0);
    const collisionSafe = !S.navBlocked(N.x, N.z, 0.30) && N.x < x;
    S.G.renderEvery = 1; const original = S.FOLK.limit;
    for (let i = 0; i < 400; i++) S.folkPopulationTick(0.04);
    const reduced = S.FOLK.limit;
    for (let i = 0; i < 1600; i++) S.folkPopulationTick(0.016);
    const restored = S.FOLK.limit; S.G.renderEvery = 1e9;
    S.peopleCull();
    const visible = [...S.FOLK.people, ...S.SPECT.people, ...S.SPECT.seated].filter(n => n.J.root.visible).length;
    return { rotated, clearSide, safe, recovered: !!recovered && !S.navBlocked(recovered.x, recovered.z, 0.30), collisionSafe, original, reduced, restored, visible };
  });
  expect(result.rotated).toBe(true); expect(result.clearSide).toBe(true); expect(result.safe).toBe(true); expect(result.recovered).toBe(true); expect(result.collisionSafe).toBe(true);
  expect(result.reduced).toBeLessThan(result.original); expect(result.restored).toBeGreaterThan(result.reduced); expect(result.visible).toBeLessThanOrEqual(test.info().project.name === 'phone' ? 44 : 80);
});
