// Trades: gather round the festival, level the skills, make upgrades and cosmetics without gold.
const { test, expect } = require('./fixtures');

async function pick(page, text, btn) {
  await page.evaluate(t => { const up = [...document.querySelectorAll('#townShopBody .up')].find(u => u.textContent.includes(t)); const sec = up && up.closest('.vsec'); if (sec && sec.hidden) document.querySelector(`#townShopBody .vtabs button[data-i="${sec.dataset.i}"]`).click(); }, text);
  const card = page.locator('#townShopBody .up', { hasText: text }).first();
  await (btn ? card.getByRole('button', { name: btn }) : card.getByRole('button')).click();
}

test('mine a vein with the timing game, smelt, forge, and make upgrades and skins for materials @touch', async ({ game, page }) => {
  await game.noRender();
  await game.run("(CAREER.purse = 150, saveCareer(), enterTown(), true)");
  await game.until("TOWN.on && GATHER.nodes.length > 20");
  // nodes are on the map and in the stall list with a verb
  expect(await game.run("TOWN.stalls.filter(s => s.node).length")).toBeGreaterThan(20);
  // walk to a copper vein and mine it: three swings in the green
  await game.run("(() => { const n = GATHER.nodes.find(n => n.type === 'copper'); TOWN.pos = { x: n.ax, z: n.az }; return true; })()");
  await game.until("TOWN.near && TOWN.near.node && TOWN.near.node.type === 'copper'");
  await expect(page.locator('#townPrompt')).toContainText('Mine Copper vein');
  await page.locator('#townPrompt').click();
  await game.until("GATHER.on && TOWN.busy");
  await expect(page.locator('#gather')).toBeVisible();
  for (let i = 0; i < 3; i++) await game.run("(GATHER.pos = GATHER.zoneAt, gatherSwing(), true)");
  await game.until("!GATHER.on");
  expect(await game.run("have('copper_ore')")).toBeGreaterThanOrEqual(2);
  await game.until("tradeState().xp.mining > 0");
  // the vein is worked out, then grows back
  expect(await game.run("GATHER.nodes.find(n => n.type === 'copper').until > G.realTime")).toBe(true);
  await game.run("(() => { const n = TOWN.near.node; n.until = G.realTime - 1; return true; })()");
  await game.until("!GATHER.nodes.find(n => n.type === 'copper').until");
  // too low a level, or too poor a tool, and the node says no
  await game.run("(startGather(GATHER.nodes.find(n => n.type === 'gold')), true)");
  expect(await game.run("!!GATHER.on")).toBe(false);
  // a miss counts for less than a hit
  await game.run("(startGather(GATHER.nodes.find(n => n.type === 'copper')), true)");
  await game.run("(GATHER.pos = GATHER.zoneAt > 0.5 ? 0 : 1, gatherSwing(), true)");
  expect(await game.run("GATHER.swings[0]")).toBeLessThan(1);
  await game.run("(stopGather(false), true)");
  expect(await game.run("TOWN.busy")).toBe(false);
  // the furnace: smelt copper, then forge a copper pickaxe (needs forging 2, so level up by smelting)
  await game.run("(give('copper_ore', 10), give('ash', 6), true)");
  await game.run("(openVendor('smith'), true)");
  await pick(page, 'Smelt copper ingot', 'Smelt');
  expect(await game.run("have('copper_ingot')")).toBe(1);
  expect(await game.run("tradeState().xp.forging")).toBe(14);
  // the anvil: a weapon tier for ingots instead of gold, with the purse untouched
  await game.run("(give('copper_ingot', 3), openVendor('smith'), true)");
  await pick(page, 'Flanged mace', 'Forge it');
  expect(await game.run("shopState().wq.mace")).toBe(1);
  expect(await game.run("CAREER.purse")).toBeGreaterThanOrEqual(150); // nothing spent (awards may have paid out)
  expect(await game.run("tradeLevel('smithing')")).toBe(1);
  // not enough skill: the button is off
  await game.run("(openVendor('smith'), true)");
  expect(await page.evaluate(() => [...document.querySelectorAll('#townShopBody .up')].find(u => u.textContent.includes('Smelt iron ingot')).querySelector('.vmk').disabled)).toBe(true);
  // a kit upgrade and an armour tier at the armourer
  await game.run("(give('iron_ingot', 4), give('hide', 4), give('copper_ingot', 4), true)");
  await game.run("(openVendor('armour'), true)");
  await pick(page, 'Riveted gauntlets', 'Make it');
  expect(await game.run("CAREER.upgrades.gauntlets")).toBe(1);
  await game.run("(tradeState().xp.smithing = 400, openVendor('armour'), true)");
  await pick(page, 'Helmet', 'Make it');
  expect(await game.run("shopState().aq.helmet")).toBe(1);
  // a skin at the Artificer and an outfit at the wardrobe, crafted
  await game.run("(give('bone', 6), give('iron_ingot', 2), give('hide', 2), give('flax', 4), give('herb', 2), G.loadout.weapon = 'mace', openVendor('artificer'), true)");
  await pick(page, 'Skull Club', 'Craft it');
  expect(await game.run("!!shopState().owned['ws:orc_skullclub'] && skinFor('mace') === 'orc_skullclub'")).toBe(true);
  await game.run("(openVendor('wardrobe'), true)");
  await pick(page, 'Linen shirt and breeches', 'Sew it');
  expect(await game.run("lookState().outfit")).toBe('Male_Peasant|peasant');
  expect(await game.run("tradeState().xp.artificing")).toBeGreaterThan(50);
  // the Trades tab shows it all
  await game.run("(closeVendor(), openCareer('trades'), true)");
  await expect(page.locator('#careerBody')).toContainText('Mining');
  await expect(page.locator('#careerBody')).toContainText('Satchel');
  expect(await game.run("G.stats.errors.length")).toBe(0);
});
