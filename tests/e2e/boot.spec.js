const { test, expect } = require('./fixtures');

test('boots to the title with no errors @touch', async ({ game, page }) => {
  await expect(page.locator('#title')).toBeVisible();
  await expect(page.locator('#btnFight')).toBeVisible();
  expect(await game.run('G.attract')).toBe(true);
});
