const path = require('path');
const { test, expect } = require('./fixtures');

test('each outer arena has terrain-following rope and Mirror Lake approach is coherent @touch', async ({ game, page }, testInfo) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.terrain');
  const ropes = await game.run(`ARENAS.slice(1).concat([{ key: 'training', x: -58, z: -56, practice: true }]).map(A => {
    const group = new THREE.Group(); arenaRope(group, A);
    return { key: A.key, stakes: group.children.filter(o => o.geometry?.parameters?.radiusTop === 0.055).length,
      cords: group.children.filter(o => o.geometry?.parameters?.width === 1).length,
      gateOpen: !A.practice || !group.children.some(o => o.geometry?.parameters?.width === 1 && Math.abs(o.position.z - (A.z + LIST.L / 2 + 4)) < 0.1 && Math.abs(o.position.x - A.x) < 2.5) };
  })`);
  for (const rope of ropes) { expect(rope.stakes, rope.key).toBeGreaterThan(30); expect(rope.cords, rope.key).toBeGreaterThan(30); expect(rope.gateOpen, rope.key).toBe(true); }
  await game.run('(TOWN.pos = { x: 145, z: 109 }, TOWN.yaw = 0, TOWN.pitch = 0.35, TOWN.cam = null, G.renderEvery = 1, true)');
  await page.waitForTimeout(700);
  await page.locator('#gl').screenshot({ path: path.join(__dirname, '..', '..', `mirror-lake-${testInfo.project.name}.png`) });
});

test('spectating uses the approached side and the look controls move the camera @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on');
  const A = await game.run("ARENAS.find(a => a.key === 'beach')");
  await game.run(`(TOWN.pos = { x: ${A.x - 14.55}, z: ${A.z - 9} }, true)`);
  await game.until("TOWN.near && TOWN.near.arena && TOWN.near.arena.key === 'beach'");
  await page.locator('#townPrompt').click();
  await game.until("TOWN.spec && TOWN.spec.side === -1 && TOWN.spec.offset === -9");
  expect(await game.run(`TOWN.pos.x < ${A.x} && TOWN.pos.z === ${A.z - 9}`)).toBe(true);
  const before = await game.run('({ yaw: TOWN.yaw, x: W3.camera.position.x, z: W3.camera.position.z, look: TOWN.look.clone() })');
  await game.run('(TOWN.yaw += 0.6, true)');
  await game.frames(8);
  const after = await game.run('({ yaw: TOWN.yaw, x: W3.camera.position.x, z: W3.camera.position.z, look: TOWN.look.clone() })');
  expect(Math.abs(after.look.z - before.look.z)).toBeGreaterThan(1);
  expect(after.x).toBeLessThan(A.x);
  await page.locator('#townSpec button', { hasText: 'Seat' }).click();
  expect(await game.run('TOWN.spec.side')).toBe(-1);
  expect(await game.run('TOWN.pos.x')).toBeLessThan(A.x);
  await page.locator('#townSpec button', { hasText: 'Leave' }).click();
  expect(await game.run('!TOWN.spec')).toBe(true);
});

test('waypoint shows a real arrow plus plain-language turning cue @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on');
  await game.run("(TOWN.pos = { x: 0, z: 40 }, TOWN.yaw = 0, setWaypoint(0, 20, 'North gate'), true)");
  await expect(page.locator('#townWp')).toContainText('Straight ahead');
  await expect(page.locator('#townWp .wparrow')).toContainText('↑');
  await game.run('(TOWN.yaw = Math.PI / 2, true)');
  await game.until("document.querySelector('#townWp').textContent.includes('Turn right')");
  await expect(page.locator('#townWp')).toContainText('Turn right');
});
