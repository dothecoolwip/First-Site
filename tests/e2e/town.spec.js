// The town is the hub: Time to Fight walks you in, the gate folk start every mode, you come back to town after, the wardrobe and guilds.
const { test, expect } = require('./fixtures');

// vendor goods sit in tabs: open the tab that holds this card, then press its button
async function pick(page, text) {
  await page.evaluate(t => { const up = [...document.querySelectorAll('#townShopBody .up')].find(u => u.textContent.includes(t)); const sec = up && up.closest('.vsec'); if (sec && sec.hidden) document.querySelector(`#townShopBody .vtabs button[data-i="${sec.dataset.i}"]`).click(); }, text);
  const card = page.locator('#townShopBody .up', { hasText: text }).first();
  await (await card.locator('.vbuy').count() ? card.locator('.vbuy') : card.getByRole('button').first()).click();
}

test('home page has one button; the giant signs you up; after the fight you are back in town @touch', async ({ game, page }) => {
  await game.noRender();
  await expect(page.locator('#btnFight')).toBeVisible();
  await expect(page.locator('#btnRumble')).toBeHidden();
  await expect(page.locator('#btnQuick')).toBeHidden();
  await page.locator('#btnFight').click();
  await game.until("TOWN.on && G.hub");
  // every gate station and vendor is in town
  expect(await game.run("['giant', 'marshal', 'board', 'crier', 'house', 'wardrobe', 'ghost', 'smith'].every(k => TOWN.stalls.some(s => s.V.key === k))")).toBe(true);
  // walk up to the giant and talk
  await game.run("(townJump('giant'), true)");
  await game.until("TOWN.near && TOWN.near.V.key === 'giant'");
  await page.locator('#townPrompt').click();
  await game.until("G.screen === 'townShop'");
  await expect(page.locator('#townShopBody')).toContainText('Sign the scroll');
  // the marshal starts a quick fight: the town is put away and the fight runs
  await game.run("(closeVendor(), townJump('marshal'), true)");
  await game.until("TOWN.near && TOWN.near.V.key === 'marshal'");
  await game.run("(townTalk(TOWN.near), true)");
  await page.locator('#townShopBody .up', { hasText: 'Quick fight' }).getByRole('button').click();
  await game.until("!TOWN.on && G.screen === 'modes'");
  // Back from the fight menus returns to town, at the marshal
  await page.locator('#modes [data-back]').click();
  await game.until("TOWN.on && G.phase === 'town'");
  expect(await game.run("Math.hypot(TOWN.pos.x - 7, TOWN.pos.z - 26) < 5")).toBe(true);
  // a whole match, then home to town
  await game.run("(townTeardown(), quickFight(5, 'wardens'), true)");
  await game.until("G.screen === 'tactics' && !TOWN.on");
  await game.run("(toTitle(), true)");
  await game.until("TOWN.on && G.phase === 'town' && !G.screen");
  // the house door opens Your fighter; its Back comes back to town
  await game.run("(townJump('house'), townTalk(TOWN.stalls.find(s => s.V.key === 'house')), true)");
  await page.locator('#townShopBody .up', { hasText: 'Your fighter' }).getByRole('button').click();
  await game.until("G.screen === 'career'");
  await page.locator('#career [data-back]').click();
  await game.until("TOWN.on && G.screen === null");
  // Main menu goes home for real
  await game.run("(openTownMap(), true)");
  await page.locator('#townShopBody button', { hasText: 'Main menu' }).click();
  await game.until("G.screen === 'title' && !TOWN.on && !G.hub");
  expect(await game.run("G.stats.errors.length")).toBe(0);
});

test('wardrobe, the ghost, pets and a guild @touch', async ({ game, page }) => {
  await game.noRender();
  await game.run("(CAREER.purse = 100000, saveCareer(), enterTown('wardrobe'), true)");
  await game.until("TOWN.on");
  await game.run("(openVendor('wardrobe'), true)");
  const body = page.locator('#townShopBody');
  await pick(page, 'Golden crown');
  expect(await game.run("lookState().hat")).toBe('crown');
  await pick(page, 'Dog');
  expect(await game.run("lookState().pet")).toBe('dog');
  expect(await game.run("!!WORLD.pet && WORLD.pet.kind === 'dog'")).toBe(true);
  await game.run("(openVendor('ghost'), true)");
  await pick(page, 'Little ghost');
  expect(await game.run("WORLD.pet.kind")).toBe('ghost');
  await pick(page, 'Pumpkin head');
  expect(await game.run("lookState().hat")).toBe('pumpkin');
  // free basics cost nothing; owned things re-wear for free
  const purse = await game.run("CAREER.purse");
  await game.run("(openVendor('wardrobe'), true)");
  await pick(page, 'Golden crown');
  expect(await game.run("CAREER.purse")).toBe(purse);
  // clothes: an outfit from the wardrobe goes on your town self
  await game.run("(openVendor('wardrobe'), true)");
  await pick(page, 'Linen shirt and breeches');
  expect(await game.run("lookState().outfit")).toBe('Male_Peasant|peasant');
  expect(await game.run("TOWN.me.costume === 'Male_Peasant' || (!TOWN.people && !!TOWN.me.root)")).toBe(true);
  // weapon looks from the artificer: only the look changes
  await game.run("(G.loadout.weapon = 'mace', openVendor('artificer'), true)");
  await pick(page, 'Skull Club');
  expect(await game.run("skinFor('mace')")).toBe('orc_skullclub');
  expect(await game.run("buildMyWeapon('mace', CLUBS.reavers).userData.skin")).toBe('orc_skullclub');
  // the blacksmith's forge is at his counter, not behind Your fighter
  await game.run("(openVendor('smith'), true)");
  await expect(page.locator('#townShopBody .vtabs')).toContainText('Custom forging');
  // found a guild at the guildmaster
  await game.run("(openVendor('guild'), true)");
  await body.locator('input').first().fill('The Tape Wolves');
  await body.locator('input').nth(1).fill('tw');
  await pick(page, 'Found a guild');
  expect(await game.run("CAREER.guild && CAREER.guild.tag")).toBe('TW');
  await expect(body).toContainText('[TW] The Tape Wolves');
  // a guild invite from someone online
  await game.run(`(LOBBY.me = 'me1', guildCheck([{ peer: 'x', presence: { name: 'Robin', ginv: { to: 'me1', id: 'abc', name: 'Red Owls', tag: 'OWL', col: '#333', from: 'Robin', at: 1 } } }]), true)`);
  await game.until("G.screen === 'msgScr'");
  await page.locator('#msgPanel button', { hasText: 'Join the guild' }).click();
  expect(await game.run("CAREER.guild.tag")).toBe('OWL');
  expect(await game.run("G.stats.errors.length")).toBe(0);
});
