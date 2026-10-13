const path = require('path');
const { test, expect } = require('./fixtures');

test('the country uses a walkable heightfield, winding roads and forest corridors @touch', async ({ game, page }, testInfo) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.terrain');
  expect(await game.run('TOWN.terrain.geometry.attributes.position.count')).toBeGreaterThan(16000);
  expect(await game.run('Math.abs(gy(-410, 80))')).toBeGreaterThan(2);
  expect(await game.run("TOWN.cells.length > 30")).toBe(true);
  await game.run('(TOWN.pos = { x: -310, z: -84 }, TOWN.yaw = 0.7, TOWN.pitch = 0.35, TOWN.cam = null, G.renderEvery = 1, true)');
  await page.waitForTimeout(700);
  await page.locator('#gl').screenshot({ path: path.join(__dirname, '..', '..', `world-terrain-${testInfo.project.name}.png`) });
});

test('the fairground road reaches the Dome and is visible on raised terrain @touch', async ({ game, page }, testInfo) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.terrain');
  expect(await game.run("TOWN.mapRoads.some(R => R.w === 9 && R.pts.some(P => P[0] === 0 && P[1] === 27))")).toBe(true);
  expect(await game.run("!!realmPath(0, 31, ARENAS[0].entry[0], ARENAS[0].entry[1])")).toBe(true);
  expect(await game.run("!TOWN.obst.some(O => Math.hypot(O.x, O.z - 31.86) < O.r + 0.75)")).toBe(true);
  await game.run('(TOWN.pos = { x: 0, z: 39 }, TOWN.yaw = 0, TOWN.pitch = 0.35, TOWN.cam = null, G.renderEvery = 1, true)');
  await page.waitForTimeout(500);
  await page.locator('#gl').screenshot({ path: path.join(__dirname, '..', '..', `fair-approach-${testInfo.project.name}.png`) });
});

test('castle terraces do not pull the coarse grass terrain over the Bailey lists @touch', async ({ game, page }, testInfo) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.terrain');
  const heights = await game.run(`(() => {
    const p = TOWN.terrain.geometry.attributes.position, samples = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      if (x > -110 && x < -45 && z > -235 && z < -175) samples.push(p.getY(i));
    }
    return { count: samples.length, max: Math.max(...samples), min: Math.min(...samples) };
  })()`);
  expect(heights.count).toBeGreaterThan(10);
  expect(heights.max).toBeLessThan(0.1);
  expect(heights.min).toBeGreaterThan(-0.2);
  await game.run('(TOWN.pos = { x: -74, z: -204 }, TOWN.yaw = 1.1, TOWN.pitch = 0.35, TOWN.cam = null, G.renderEvery = 1, true)');
  await page.waitForTimeout(500);
  await page.locator('#gl').screenshot({ path: path.join(__dirname, '..', '..', `bailey-terrain-${testInfo.project.name}.png`) });
});
