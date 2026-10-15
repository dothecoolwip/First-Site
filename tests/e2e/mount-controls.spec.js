const { test, expect } = require('./fixtures');

test('creator tools leave mobile horse controls tappable @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on');
  await game.run('(BOS.testAdmin = true, testAdminRefresh(), TOWN.horseRent = true, true)');
  await expect(page.locator('#townHorse')).toBeVisible();
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 667, height: 375 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => {
      const horse = document.querySelector('#townHorse').getBoundingClientRect();
      const admin = document.querySelector('#townAdmin').getBoundingClientRect();
      return { separated: horse.bottom <= admin.top || admin.bottom <= horse.top || horse.right <= admin.left || admin.right <= horse.left,
        hit: document.elementFromPoint(horse.x + horse.width / 2, horse.y + horse.height / 2)?.id };
    });
    expect(layout.separated).toBe(true);
    expect(layout.hit).toBe('townHorse');
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('#townHorse').tap();
  await game.until('TOWN.horse');
  await game.run('(TOWN.horse.x = TOWN.pos.x + 1, TOWN.horse.z = TOWN.pos.z, TOWN.horse.come = false, true)');
  await expect(page.locator('#townHorse')).toContainText('Mount');
  await page.locator('#townHorse').tap();
  await game.until('TOWN.mounted');
  await expect(page.locator('#townHorse')).toContainText('Dismount');
  await page.locator('#townHorse').tap();
  await game.until('!TOWN.mounted');
  await page.locator('#townAdmin').tap();
  await expect(page.locator('#townShopBody')).toContainText('Teleport');
});
