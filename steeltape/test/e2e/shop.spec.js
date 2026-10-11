// The market: vendors in town sell weapon and armour quality, runes, drills, tape, squires, sponsors, a house and a statue.
const { test, expect } = require('./fixtures');

// vendor goods sit in tabs: open the tab that holds this card, then press its button
async function pick(page, text) {
  await page.evaluate(t => { const up = [...document.querySelectorAll('#townShopBody .up')].find(u => u.textContent.includes(t)); const sec = up && up.closest('.vsec'); if (sec && sec.hidden) document.querySelector(`#townShopBody .vtabs button[data-i="${sec.dataset.i}"]`).click(); }, text);
  const card = page.locator('#townShopBody .up', { hasText: text }).first();
  await (await card.locator('.vbuy').count() ? card.locator('.vbuy') : card.getByRole('button').first()).click();
}

test('town: walk to a vendor, talk, buy, and walk away @touch', async ({ game, page }) => {
  await game.noRender();
  await game.run("(CAREER.purse = 500000, saveCareer(), true)");
  await page.locator('#btnFight').click();
  await game.until("TOWN.on && G.phase === 'town'");
  await expect(page.locator('#townHud')).toBeVisible();
  // the list blocks you: you can't walk into it
  await game.run("(TOWN.pos = { x: 0, z: 10 }, townCollide(), true)");
  expect(await game.run("Math.abs(TOWN.pos.z) >= 23 || Math.abs(TOWN.pos.x) >= 18")).toBe(true);
  // stand at the blacksmith: the prompt appears and talking opens his counter
  await game.run("(() => { const S = TOWN.stalls.find(s => s.V.key === 'smith'); TOWN.pos = { x: S.ax, z: S.az }; return true; })()");
  await game.until("TOWN.near && TOWN.near.V.key === 'smith'");
  await expect(page.locator('#townPrompt')).toContainText('Gunnar');
  await page.locator('#townPrompt').click();
  await game.until("G.screen === 'townShop'");
  const body = page.locator('#townShopBody');
  await expect(body).toContainText('Weapon quality');
  await pick(page, 'Arming sword');
  expect(await game.run("shopState().wq.sword")).toBe(1);
  await pick(page, 'Steel pommel');
  expect(await game.run("shopState().lv.pommel")).toBe(1);
  expect(await game.run("shopFx('imp')")).toBeCloseTo(0.015);
  // Back closes the counter and you can walk again
  await page.locator('#townShopHead .back').click();
  await game.until("G.screen === null");
  // the map marks the way to the wizard (no teleporting); walk there, buy a skill point and a potion
  await page.locator('#townMap').click();
  await game.until("G.screen === 'townShop'");
  await pick(page, 'Mordecai');
  await game.until("!G.screen && TOWN.wp && /Mordecai/.test(TOWN.wp.label)");
  await game.run("(townJump('wizard'), true)");
  await game.until("TOWN.near && TOWN.near.V.key === 'wizard'");
  await game.run("(openVendor('wizard'), true)");
  const sp = await game.run("CAREER.sp");
  await pick(page, 'A skill point');
  expect(await game.run("CAREER.sp")).toBe(sp + 1);
  expect(await game.run("spCost()")).toBeGreaterThan(1500);
  await pick(page, 'Draught of fury');
  expect(await game.run("shopFx('imp')")).toBeCloseTo(0.095);
  // the land agent sells a house that appears in town
  await game.run("(openVendor('estate'), true)");
  await pick(page, 'No house yet');
  expect(await game.run("shopState().home")).toBe(1);
  expect(await game.run("!!TOWN.home && TOWN.home.children.length > 3")).toBe(true);
  await pick(page, 'A statue of you');
  expect(await game.run("!!TOWN.statue")).toBe(true);
  // leave town: back to the title, venue restored
  await page.locator('#townShopHead .back').click();
  await page.locator('#townLeave').click();
  await game.until("G.screen === 'title' && !TOWN.on && !G.hub");
  expect(await game.run("G.stats.errors.length")).toBe(0);
});

test('every vendor opens, and the effects land in a fight @touch', async ({ game, page }) => {
  await game.noRender();
  await game.run("(CAREER.purse = 900000, saveCareer(), enterTown(), true)");
  for (const k of ['smith', 'armour', 'quarter', 'wizard', 'tavern', 'trainer', 'herald', 'bard', 'guild', 'estate']) {
    await game.run(`(openVendor('${k}'), true)`);
    expect(await page.locator('#townShopBody .up').count()).toBeGreaterThan(1);
  }
  const body = page.locator('#townShopBody');
  // armour: kit upgrades past 3, tape: refill and sponsor, tavern: squire, guild: sponsor income, bard: a title
  await game.run("(CAREER.upgrades.harness = 3, openVendor('armour'), true)");
  await pick(page, 'Spring-steel harness');
  expect(await game.run("shopUp().harness")).toBe(3.5);
  await game.run("(openVendor('quarter'), true)");
  await pick(page, 'Gold-thread tape');
  expect(await game.run("tapeLeft('gold')")).toBe(10);
  await pick(page, 'Tape sponsor');
  expect(await game.run("shopState().sponsor")).toBe(true);
  await game.run("(openVendor('tavern'), true)");
  await pick(page, 'Hire a squire');
  expect(await game.run("shopState().squires")).toBe(1);
  await game.run("(openVendor('guild'), true)");
  await pick(page, 'Red Deer Brewing');
  expect(await game.run("sponsorIncome()")).toBe(40);
  await game.run("(openVendor('bard'), true)");
  await pick(page, 'the Taped');
  expect(await game.run("shopState().title")).toBe('the Taped');
  await game.run("(openVendor('herald'), true)");
  await pick(page, 'Royal purple');
  expect(await game.run("CAREER.club.tabard")).toBe('#5b2a86');
  expect(await game.run("S2().spent")).toBeGreaterThan(3000);
  // caps hold even with everything maxed
  await game.run("(ITEMS.forEach(it => shopState().lv[it.id] = it.max), true)");
  expect(await game.run("shopFx('imp')")).toBeLessThanOrEqual(0.4);
  expect(await game.run("shopFx('spd')")).toBeLessThanOrEqual(0.25);
  // effects: player only
  const r = JSON.parse(await game.run(`(() => {
    const f = { isPlayer: true, weapon: WEAPONS.sword, spec: { weapon: 'sword' }, fatigue: 0, kit: {} };
    return JSON.stringify({ wear: pieceWearMult(f, 'helmet'), npc: pieceWearMult({ isPlayer: false }, 'helmet'), npcImp: pfx({ isPlayer: false }, 'imp'), kit: boostKit({ a: { cond: 0.7 } }).a.cond });
  })()`));
  expect(r.wear).toBeCloseTo(0.8); expect(r.npc).toBe(1); expect(r.npcImp).toBe(0); expect(r.kit).toBeGreaterThan(0.8);
  await game.run("(closeVendor(), leaveTown(), true)");
  await game.until("G.screen === 'title'");
  // the Town tab in Your fighter lists the vendors
  await game.run("(openCareer('shop'), true)");
  await expect(page.locator('#careerBody')).toContainText('Mordecai the Odd');
});

test('the repair bench uses up tape and refills an empty roll @touch', async ({ game, page }) => {
  await game.noRender();
  await game.run("(CAREER.purse = 1000, shopState().tape.black = 0, shopState().tape.grey = 0, shopState().tape.white = 0, saveCareer(), true)");
  await game.run("(quickFight(5, 'wardens'), true)"); await game.until("G.screen === 'tactics'");
  await game.run("(G.player.kit.armL.cond = 0.3, openRepair(45, () => {}), true)"); await game.until("G.screen === 'repair'");
  await expect(page.locator('#drawer')).toContainText('empty');
  await page.locator('#drawer .tapechip', { hasText: 'Black' }).click();
  expect(await game.run("tapeLeft('black')")).toBe(20);
  expect(await game.run("CAREER.purse")).toBe(960);
  await expect(page.locator('#benchMsg')).toContainText('Bought 20 more wraps');
});
