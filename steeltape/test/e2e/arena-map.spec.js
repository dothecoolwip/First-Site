const { test, expect } = require('./fixtures');
const path = require('path');
const fs = require('fs');

test('realm arena map routes to entrances and each arena has a distinct service crew @touch', async ({ game, page }, testInfo) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && G.hub');

  const crews = await game.run(`ARENAS.slice(1).map(A => STATIONS.filter(S => S.arena === A.key).map(S => ({ name: S.name, service: S.service, colour: S.col, at: S.at })))`);
  expect(crews.map(c => c.length)).toEqual([3, 3, 3, 3, 3]);
  expect(new Set(crews.flat().map(s => s.name)).size).toBe(15);
  expect(new Set(crews.flat().map(s => s.colour)).size).toBe(15);
  for (const crew of crews) expect(crew.map(s => s.service).sort()).toEqual(['crier', 'giant', 'marshal']);
  expect(await game.run(`ARENAS.every(A => TOWN.stalls.some(S => S.arena && S.arena.key === A.key))`)).toBe(true);
  expect(await game.run(`ARENAS.slice(1).every(A => TOWN.stalls.filter(S => S.V.arena === A.key).length === 3)`)).toBe(true);

  await game.run('(openTownMap(), true)');
  await expect(page.locator('.tmapwrap [aria-label="Arena destinations"] .up')).toHaveCount(7);
  await expect(page.locator('.tmapwrap [aria-label="Arena destinations"]')).toContainText('Fairground Training Yard');
  const mapPng = await page.locator('.tmap').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  fs.writeFileSync(path.join(__dirname, '..', '..', `arena-map-${testInfo.project.name}.png`), Buffer.from(mapPng, 'base64'));
  await page.locator('.tmapwrap [aria-label="Arena destinations"] .up', { hasText: 'Old Woods Clearing' }).getByRole('button', { name: 'Route' }).click();
  expect(await game.run(`TOWN.wp.label === 'Old Woods Clearing' && Math.hypot(TOWN.wp.x + 214, TOWN.wp.z + 74) < 12`)).toBe(true);
  await game.run('(closeVendor(), townJump("forest:marshal"), townTalk(TOWN.stalls.find(S => S.V.key === "forest:marshal")), true)');
  await expect(page.locator('#townShopHead')).toContainText('Rowan Ashshield');
  await page.locator('#townShopBody .up', { hasText: 'Quick fight' }).getByRole('button').click();
  await game.until(`!TOWN.on && G.quickVenue === 'forest'`);
});

test('the tutorial yard is walkable, mapped and launches lessons with its own venue @touch', async ({ game, page }, testInfo) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && G.hub');
  expect(await game.run(`!navBlocked(-58, -37, 0.4)`)).toBe(true);
  expect(await game.run(`!!realmPath(-38, -30, -58, -37)`)).toBe(true);
  expect(await game.run(`!!realmPath(-58, -37, -58, -53)`)).toBe(true);
  expect(await game.run(`GATHER.nodes.every(N => Math.abs(N.x + 58) >= 14 || Math.abs(N.z + 56) >= 19)`)).toBe(true);
  if (testInfo.project.name === 'desktop') {
    await game.run('(TOWN.pos = { x: -55, z: -54 }, TOWN.yaw = Math.PI / 2, TOWN.dist = 18, TOWN.cam = null, G.renderEvery = 1, true)');
    await page.waitForTimeout(400);
    await page.locator('#gl').screenshot({ path: path.join(__dirname, '..', '..', 'tutorial-yard-world.png') });
    await game.noRender();
  }
  await game.run('(openTownMap(), true)');
  await page.locator('.tmapwrap [aria-label="Arena destinations"] .up', { hasText: 'Fairground Training Yard' }).getByRole('button', { name: 'Route' }).click();
  expect(await game.run(`TOWN.wp && TOWN.wp.label === 'Fairground Training Yard' && Math.hypot(TOWN.wp.x + 58, TOWN.wp.z + 37) < 5`)).toBe(true);
  await game.run('(closeVendor(), townJump("training:coach"), townTalk(TOWN.stalls.find(S => S.V.key === "training:coach")), true)');
  await expect(page.locator('#townShopHead')).toContainText('Coach Sigrid');
  await page.locator('#townShopBody .up', { hasText: 'Start lessons' }).getByRole('button').click();
  await game.until(`!TOWN.on && TR.on && W3.venue === 'training' && G.match.training`);
  await page.locator('#lExit').click();
  await game.until(`TOWN.on && G.phase === 'town'`);
  expect(await game.run(`Math.hypot(TOWN.pos.x + 53, TOWN.pos.z + 37) < 7`)).toBe(true);
});
