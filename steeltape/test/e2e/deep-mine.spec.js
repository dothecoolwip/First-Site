const path = require('path');
const { test, expect } = require('./fixtures');

test('the Old Woods quarry leads into an enclosed, mapped underground mine @touch', async ({ game, page }, testInfo) => {
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.mine && G.hub');
  expect(await game.run("TOWN.stalls.some(s => s.V.key === 'mine:enter')")).toBe(true);
  await game.run("(TOWN.pos = { x: -256, z: -39.5 }, true)");
  await game.until("TOWN.near && TOWN.near.V.key === 'mine:enter'");
  await expect(page.locator('#townPrompt')).toContainText('Descend');
  await page.locator('#townPrompt').click();
  await game.until('TOWN.mineOn && TOWN.mine.visible');
  expect(await game.run('TOWN.me.root.position.y')).toBe(-25);
  expect(await game.run('GATHER.nodes.filter(n => n.mine).length')).toBe(5);
  expect(await game.run('TOWN.stalls.filter(s => s.mine && s.node).length')).toBe(5);
  await game.until('W3.camera.position.y < -15');
  await game.run("(TOWN.pos = { x: -156, z: -146 }, townCollide(), true)");
  expect(await game.run('Math.abs(TOWN.pos.x + 256) <= 29 && Math.abs(TOWN.pos.z + 46) <= 29')).toBe(true);
  await game.run("(TOWN.pos = { x: -249, z: -51 }, TOWN.yaw = 0.45, TOWN.cam = null, true)");
  await game.frames(8);
  await page.screenshot({ path: path.join(__dirname, '..', '..', `deep-mine-world-${testInfo.project.name}.png`) });
  await page.locator('#townMap').click();
  await game.until("G.screen === 'townShop'");
  await expect(page.locator('#townShopHead')).toContainText('Old Woods Deep Mine');
  await expect(page.locator('#townShopBody')).toContainText(/crystal grotto/i);
  await page.locator('canvas[aria-label="Map of the Old Woods Deep Mine"]').screenshot({ path: path.join(__dirname, '..', '..', `deep-mine-map-${testInfo.project.name}.png`) });
  await page.locator('#townShopBody button', { hasText: 'Ride the lift' }).click();
  await game.until('!TOWN.mineOn && !TOWN.mine.visible');
  expect(await game.run('TOWN.me.root.position.y >= 0')).toBe(true);
});

test('deep mine veins use the existing mining skill and tool rules', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.mine');
  await game.run("(TOWN.stalls.find(s => s.V.key === 'mine:enter').open(), true)");
  const node = await game.run("GATHER.nodes.find(n => n.mine && n.type === 'copper').id");
  expect(node).toBe('deep:copper');
  await game.run("(startGather(GATHER.nodes.find(n => n.id === 'deep:copper')), true)");
  await game.until('GATHER.on && TOWN.busy');
  await expect(page.locator('#gather')).toContainText('Copper vein');
  await game.run("(stopGather(false), true)");
  expect(await game.run('!GATHER.on && !TOWN.busy')).toBe(true);
});

test('a horse waits above ground while its rider explores the mine', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.mine');
  await game.run("(TOWN.horseRent = true, TOWN.horse = { A: { root: { visible: true } }, x: -256, z: -42, come: true }, TOWN.stalls.find(s => s.V.key === 'mine:enter').open(), true)");
  await game.until('TOWN.mineOn && TOWN.horse.A.root.visible === false');
  expect(await page.locator('#townHorse').isHidden()).toBe(true);
  await game.run('(callHorse(), true)');
  expect(await game.run('TOWN.horse.come')).toBe(false);
  await game.run('(TOWN.pos = { x: -228, z: -18 }, TOWN.yaw = 0.8, TOWN.pitch = 0.95, TOWN.cam = null, true)');
  await game.frames(5);
  expect(await game.run('W3.camera.position.y <= -19.2 && W3.camera.position.x <= -229 && W3.camera.position.z <= -19')).toBe(true);
  await game.run("(TOWN.horse = null, TOWN.stalls.find(s => s.V.key === 'mine:exit').open(), true)");
  expect(await game.run('!TOWN.mineOn')).toBe(true);
});
