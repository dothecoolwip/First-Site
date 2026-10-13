const { test, expect } = require('./fixtures');

test('fighter creator gives a clothed, distinct person and updates the town avatar @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && UAL.ready && TOWN.me && TOWN.me.costume');
  expect(await game.run('TOWN.me.costume')).toBe('Male_Peasant');

  await game.run("openCareer('profile')");
  await page.getByRole('button', { name: 'Edit fighter' }).click();
  await expect(page.locator('#creatorBody')).toContainText('Your appearance');
  await expect(page.locator('#creatorBody .crportrait')).toBeVisible();
  await page.getByRole('button', { name: 'Feminine' }).click();
  await page.getByRole('button', { name: 'Braided buns', exact: true }).click();
  await page.locator('#creatorBody input[aria-label="Body mass"]').evaluate(el => {
    el.value = '90'; el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(await game.run('lookState().frame')).toBe('female');
  expect(await game.run('lookState().hair')).toBe('braid');
  expect(await game.run("lookState().shape.mass")).toBe(90);
  expect(await game.run('TOWN.me.costume')).toBe('Female_Peasant');
  expect(await game.run('TOWN.me.root.scale.x')).toBeGreaterThan(1);
  expect(await game.run("!!TOWN.me.bones.Head.getObjectByName('fighterAppearance')")).toBe(true);
  expect(await game.run("!!TOWN.me.root.getObjectByName('fighterUBCHead')?.material.map")).toBe(true);
  expect(await game.run("!!TOWN.me.root.getObjectByName('fighterUBCEyes')?.isSkinnedMesh")).toBe(true);
  if (process.env.APPEARANCE_SCREENSHOT) await page.screenshot({ path: process.env.APPEARANCE_SCREENSHOT });
  await page.locator('#creatorDone').click();
  await expect(page.locator('#career')).toBeVisible();
});
