const { test, expect } = require('./fixtures');

test('town match keeps fight HUD hidden and top controls separate at landscape phone size @touch', async ({ game, page }) => {
  await page.setViewportSize({ width: 1280, height: 590 });
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && BOUT.on');
  await page.waitForTimeout(1800);
  await game.run('setHud(true)'); // A bout or delayed fight callback must not revive fight controls in town.
  expect(await game.run('document.querySelector("#hud").hidden')).toBe(true);
  await expect(page.locator('#sb')).toBeHidden();
  await expect(page.locator('#townHud')).toBeVisible();
  const rects = await page.evaluate(() => ['townBag','townMap','townLeave'].map(id => {
    const r = document.getElementById(id).getBoundingClientRect();
    return { id, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  }));
  for (let i = 1; i < rects.length; i++) expect(rects[i].left).toBeGreaterThanOrEqual(rects[i - 1].right);
});
