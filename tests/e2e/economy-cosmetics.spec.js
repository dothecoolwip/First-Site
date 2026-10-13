const { test, expect } = require('./fixtures');

async function showCard(page, name) {
  await page.evaluate(t => {
    const card = [...document.querySelectorAll('#townShopBody .up')].find(el => el.textContent.includes(t));
    const section = card && card.closest('.vsec');
    if (section && section.hidden) document.querySelector(`#townShopBody .vtabs button[data-i="${section.dataset.i}"]`).click();
  }, name);
  return page.locator('#townShopBody .up', { hasText: name }).first();
}

test('Fantasy looks can be bought, while playful looks are free and leave weapon rules intact @touch', async ({ game, page }) => {
  await game.noRender();
  await game.run('(CAREER.purse = 500, enterTown(), openVendor("artificer"), true)');
  const names = await game.run('Object.keys(WEAPONS).filter(k => k.startsWith("f_") && wskinList().includes(k))');
  expect(names).toHaveLength(12);

  const sword = await showCard(page, "Knight's sword");
  await expect(sword).toContainText('Buy $350');
  await sword.locator('.vbuy').click();
  expect(await game.run('CAREER.purse')).toBe(150);
  expect(await game.run('skinFor("sword")')).toBe('f_sword');
  expect(await game.run('buildMyWeapon("sword", CLUBS.reavers).userData.skin')).toBe('f_sword');
  expect(await game.run('[WEAPONS.sword.mass, WEAPONS.sword.len]')).toEqual([1.4, 0.92]);

  await game.run('(openVendor("artificer"), true)');
  const foam = await showCard(page, 'Foam sword');
  await expect(foam).toContainText('Equip free');
  await foam.locator('.vbuy').click();
  expect(await game.run('CAREER.purse')).toBe(150);
  expect(await game.run('skinFor("sword")')).toBe('fun_foam');
  expect(await game.run('buildMyWeapon("sword", CLUBS.reavers).userData.skin')).toBe('fun_foam');
  expect(await game.run('wskinList("mace").includes("fun_pan")')).toBe(true);
  expect(await game.run('[xpNeed(1), xpNeed(20), xpNeed(70)]')).toEqual([252, 2180, 12430]);
});
