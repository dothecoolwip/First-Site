const { test, expect } = require('./fixtures');
const fs = require('fs');
const path = require('path');
const PHOTOS = path.resolve(__dirname, '..', '..', '..', '..', 'asset-research', 'photos');

async function pick(page, text) {
  await page.evaluate(t => {
    const card = [...document.querySelectorAll('#townShopBody .up')].find(u => u.textContent.includes(t));
    const sec = card && card.closest('.vsec');
    if (sec && sec.hidden) document.querySelector(`#townShopBody .vtabs button[data-i="${sec.dataset.i}"]`).click();
  }, text);
  await page.locator('#townShopBody .up', { hasText: text }).first().locator('.vbuy').click();
}

test('downloaded props parse and vendor gear persists @touch', async ({ game, page }) => {
  expect(await game.run("new Promise(resolve => libraryModel('Anvil', m => resolve(!!m)))")).toBe(true);
  expect(await game.run("new Promise(resolve => libraryModel('Stall_Cart_Empty', m => resolve(!!m)))")).toBe(true);
  expect(await game.run("new Promise(resolve => libraryModel('Sword_Bronze', m => resolve(!!m)))")).toBe(true);
  for (const key of ['Bench', 'Bucket_Wooden_1', 'Cauldron', 'Chest_Wood',
    'Pickaxe_Bronze', 'Rope_1', 'CommonTree_2', 'Rock_Medium_2',
    'Flower_3_Group', 'Mushroom_Common', 'Dock_Boat_A_1', 'Dock_Boat_B_2']) {
    expect(await game.run(`new Promise(resolve => libraryModel('${key}', m => resolve(!!m)))`), key).toBe(true);
  }
  await game.noRender();
  await game.run("(CAREER.purse = 100000, G.loadout.weapon = 'sword', enterTown(), true)");
  await game.until('TOWN.on');
  expect(await game.run('AU.wantMarket')).toBe(true);
  await game.run("(openVendor('smith'), true)");
  await pick(page, 'Light arming sword');
  expect(await game.run("playerWeaponDef('sword').name")).toBe('Light arming sword');
  await game.run("(openVendor('artificer'), true)");
  await pick(page, 'Bronze festival sword');
  expect(await game.run("skinFor('sword')")).toBe('pack_bronze_sword');
  await game.run("(openVendor('wardrobe'), true)");
  await pick(page, 'Woven straw hat');
  await pick(page, 'Festival work boots');
  expect(await game.run('lookState().hat')).toBe('straw');
  expect(await game.run('lookState().foot')).toBe('workboots');
  expect(await game.run("!!shopState().owned['variant:light_sword']")).toBe(true);
  expect(await game.run("!!store.get('career').shop.owned['variant:light_sword']")).toBe(true);
});

test('capture integrated world, product, and inventory photos', async ({ game, page }) => {
  test.setTimeout(180000);
  fs.mkdirSync(PHOTOS, { recursive: true });
  await game.noRender();
  await game.run("(CAREER.purse = 100000, G.loadout.weapon = 'sword', true)");
  await game.run("(openVendor('smith'), true)");
  await page.screenshot({ path: path.join(PHOTOS, 'smith-weapons.png') });
  await game.run("(openVendor('artificer'), true)");
  await page.evaluate(() => {
    const card = [...document.querySelectorAll('#townShopBody .up')].find(u => u.textContent.includes('Bronze festival sword'));
    const sec = card && card.closest('.vsec');
    if (sec && sec.hidden) document.querySelector(`#townShopBody .vtabs button[data-i="${sec.dataset.i}"]`).click();
  });
  await game.until("!!LIBRARY.models.Sword_Bronze");
  await page.screenshot({ path: path.join(PHOTOS, 'artificer-swords.png') });
  await page.locator('#townShopBody .up', { hasText: 'Bronze festival sword' }).first().screenshot({ path: path.join(PHOTOS, 'bronze-sword-product.png') });
  await game.run("(openVendor('wardrobe'), true)");
  await page.screenshot({ path: path.join(PHOTOS, 'wardrobe-clothing.png') });
  await page.locator('#townShopBody .vtabs button', { hasText: 'Hats' }).click();
  await page.locator('#townShopBody .up', { hasText: 'Woven straw hat' }).first().screenshot({ path: path.join(PHOTOS, 'straw-hat-product.png') });
  await page.locator('#townShopBody .vtabs button', { hasText: 'Footwear' }).click();
  await page.locator('#townShopBody .up', { hasText: 'Festival work boots' }).first().screenshot({ path: path.join(PHOTOS, 'work-boots-product.png') });
  await game.run("(['copper_ore','iron_ore','silver_ore','gold_ore','crystal','bone','oak'].forEach((m,i) => give(m, i + 2)), openCareer('inv'), true)");
  await expect(page.locator('#careerBody img.libicon').first()).toBeVisible();
  await page.screenshot({ path: path.join(PHOTOS, 'inventory-icons.png') });
});
