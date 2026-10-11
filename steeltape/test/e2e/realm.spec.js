// The realm: waypoints instead of teleporting, autowalk, stamina, the stables and horses, districts, gates, arenas, nodes spread out.
const { test, expect } = require('./fixtures');

test('waypoints lead the way, autowalk walks it, horses gallop, gates stay shut without the writ @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until("TOWN.on && G.hub && TOWN.people");
  // reagents are spread across the districts, and every district has some
  expect(await game.run("GATHER.nodes.length")).toBeGreaterThan(80);
  expect(await game.run("['fair', 'woods', 'village', 'lake', 'bailey'].every(k => GATHER.nodes.some(n => districtAt(n.x, n.z).key === k))")).toBe(true);
  // six arenas, the bout plays at the one nearest you
  expect(await game.run("ARENAS.length")).toBe(6);
  expect(await game.run("boutArenaFor(-180, 150).key")).toBe('peasant');
  expect(await game.run("boutArenaFor(0, -262).key")).toBe('hall');
  // the map: Go no longer teleports, it marks the way
  await game.run("(TOWN.pos = { x: 0, z: 40 }, true)");
  const p0 = await game.run("({ ...TOWN.pos })");
  await game.run("(openTownMap(), true)");
  await page.locator('#townShopBody .up', { hasText: 'Edda the Stablehand' }).getByRole('button').click();
  await game.until("!G.screen && TOWN.wp && TOWN.wp.label === 'Edda the Stablehand'");
  expect(await game.run("Math.hypot(TOWN.pos.x - " + p0.x + ", TOWN.pos.z - " + p0.z + ") < 0.5")).toBe(true);
  await game.until("TRAVEL.path.length > 0 && TRAVEL.dots.count > 0");
  await expect(page.locator('#townWp')).toBeVisible();
  // autowalk takes you there
  await page.locator('#townWp .wpauto').click();
  await game.until("!TOWN.wp", 60000);
  expect(await game.run("Math.hypot(TOWN.pos.x - 9, TOWN.pos.z - 84) < 6")).toBe(true);
  // the stables: hire a horse, whistle, mount, ride
  await game.run("(townJump('stables'), townTalk(TOWN.stalls.find(s => s.V.key === 'stables')), true)");
  await game.until("G.screen === 'townShop'");
  await expect(page.locator('#townShopBody')).toContainText('Hire a horse');
  await game.run("(CAREER.purse = Math.max(CAREER.purse || 0, 500), true)");
  await page.locator('#townShopBody .up', { hasText: 'Hire a horse' }).getByRole('button').click();
  await game.until("TOWN.horseRent && TOWN.horse", 30000);
  await game.run("(TOWN.horse.x = TOWN.pos.x + 1, TOWN.horse.z = TOWN.pos.z, TOWN.horse.come = false, true)");
  await page.locator('#townHorse').click();
  await game.until("TOWN.mounted");
  await expect(page.locator('#townHorse')).toContainText('Dismount');
  // a waypoint far off, autowalk on horseback: faster than on foot
  await game.run("(setWaypoint(0, -120, 'North road'), TRAVEL.auto = true, true)");
  await game.until("TOWN.speed > 6");
  await game.run("(dismount(), clearWaypoint(), true)");
  expect(await game.run("TOWN.mounted")).toBe(false);
  // the bailey gate keeps you out without the writ
  await game.run("(TOWN.pos = { x: 0, z: -146 }, true)");
  await game.run("(setWaypoint(0, -170, 'Inside'), TRAVEL.auto = true, true)");
  await page.waitForTimeout(3000);
  expect(await game.run("TOWN.pos.z > -151.5")).toBe(true);
  expect(await game.run("gateOpen('bailey')")).toBe(false);
});

test('tiers: fairground smiths stop part-way up the bar; Sergeant Brask duels you for the Bailey writ; the gate opens', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until("TOWN.on && G.hub && TOWN.people");
  // the bailey and court vendors exist, inside the walls
  expect(await game.run("['msmith', 'marmour', 'mtrainer', 'rsmith', 'rarmour', 'rtailor'].every(k => TOWN.stalls.some(s => s.V.key === k))")).toBe(true);
  expect(await game.run("districtAt(TOWN.stalls.find(s => s.V.key === 'msmith').x, TOWN.stalls.find(s => s.V.key === 'msmith').z).key")).toBe('bailey');
  expect(await game.run("districtAt(TOWN.stalls.find(s => s.V.key === 'rsmith').x, TOWN.stalls.find(s => s.V.key === 'rsmith').z).key")).toBe('ward');
  // at the fairground smith, quality past Masterwork-ish (3 of 5) is Bailey only
  await game.run("(shopState().wq.sword = 3, CAREER.purse = 99999, townJump('smith'), townTalk(TOWN.stalls.find(s => s.V.key === 'smith')), true)");
  await game.until("G.screen === 'townShop'");
  await expect(page.locator('#townShopBody .vcard', { hasText: 'Arming sword' }).first().locator('.vbuy')).toHaveText('Bailey only');
  await game.run("(closeVendor(), true)");
  // the master smith in the bailey takes it further
  await game.run("(townJump('msmith'), townTalk(TOWN.stalls.find(s => s.V.key === 'msmith')), true)");
  await game.until("G.screen === 'townShop'");
  await expect(page.locator('#townShopBody .vcard', { hasText: 'Arming sword' }).first().locator('.vbuy')).not.toHaveText('Bailey only');
  await game.run("(closeVendor(), true)");
  // Sergeant Brask: too low a level and he sends you away
  await game.run("(CAREER.level = 5, townJump('sergeant'), townTalk(TOWN.stalls.find(s => s.V.key === 'sergeant')), true)");
  await game.until("G.screen === 'townShop'");
  await expect(page.locator('#townShopBody')).toContainText('Level 15 needed');
  await game.run("(closeVendor(), true)");
  // at level 15 he duels you; win and the writ is yours
  await game.run("(CAREER.level = 15, townTalk(TOWN.stalls.find(s => s.V.key === 'sergeant')), true)");
  await game.until("G.screen === 'townShop'");
  await page.locator('#townShopBody .up', { hasText: 'Duel Sergeant Brask' }).getByRole('button').click();
  await game.until("!TOWN.on && G.match && G.match.trial === 'bailey'");
  expect(await game.run("G.fighters.find(f => f.team === 1).name")).toBe('Sgt. Brask');
  await game.run("(G.match.wins = [2, 0], matchEnd(), true)");
  await game.until("G.screen === 'msgScr'");
  await expect(page.locator('#msgPanel')).toContainText('Bailey writ won');
  expect(await game.run("gateOpen('bailey')")).toBe(true);
  await page.locator('#msgPanel .pfoot button', { hasText: 'Back to the realm' }).click();
  await game.until("TOWN.on && G.phase === 'town'");
  expect(await game.run("Math.hypot(TOWN.pos.x - 6.5, TOWN.pos.z + 145) < 5")).toBe(true);
});

test('inventory: slots, stacks and equipment; a full bag stops gathering; hidden places give free cosmetics; spectate an arena', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until("TOWN.on && G.hub && TOWN.people");
  // the bag button opens the inventory with slots and the equipment panel
  await game.run("(give('copper_ore', 150), true)");
  await page.locator('#townBag').click();
  await game.until("G.screen === 'townShop'");
  await expect(page.locator('#townShopBody .invhead')).toContainText('/ 30 slots');
  expect(await page.locator('#townShopBody .invslot:not(.empty)').count()).toBeGreaterThanOrEqual(2); // 150 copper is two stacks
  await expect(page.locator('#townShopBody .inveq')).toContainText('Pickaxe');
  await expect(page.locator('#townShopBody')).toContainText('Hidden places: 0 of 6');
  await game.run("(closeVendor(), true)");
  // fill the bag: gathering refuses
  await game.run("(() => { const ks = Object.keys(MATS); for (let i = 0; bagSlots() < bagState().size; i++) give(ks[i % ks.length], 99); return true; })()");
  await game.run("(() => { const n = GATHER.nodes.find(n => n.type === 'herb' && !have('herb') ) || GATHER.nodes.find(n => n.type === 'ash'); startGather(n); return true; })()");
  expect(await game.run("!GATHER.on")).toBe(true);
  // a hidden place: walk up, search, the hood is yours and the wardrobe shows it
  await game.run("(() => { const t = tradeState(); t.inv = {}; return true; })()");
  await game.run("(TOWN.pos = { x: -286, z: -40 }, true)");
  await game.until("TOWN.near && TOWN.near.secret && TOWN.near.secret.key === 'hermit'");
  await game.run("(townTalk(TOWN.near), true)");
  expect(await game.run("secretFound('hermit') && lookOwned('hat', 'hermit') && have('gold_ore') >= 2")).toBe(true);
  // the hermit's cave can be walked to from the fairground
  expect(await game.run("!!realmPath(0, 40, -286, -40)")).toBe(true);
  // spectate the Forest arena: the bout moves there and the camera watches
  await game.run("(TOWN.pos = { x: ARENAS[2].x + ARENAS[2].bx + 0.9, z: ARENAS[2].z }, true)");
  await game.until("TOWN.near && TOWN.near.arena && TOWN.near.arena.key === 'forest'");
  await game.run("(townTalk(TOWN.near), true)");
  await game.until("TOWN.spec && TOWN.boutArena === 'forest' && BOUT.on", 30000);
  await expect(page.locator('#townSpec')).toBeVisible();
  expect(await game.run("Math.abs(W3.matchRoot.position.x - ARENAS[2].x) < 0.1")).toBe(true);
  await page.locator('#townSpec button', { hasText: 'Leave' }).click();
  expect(await game.run("!TOWN.spec")).toBe(true);
});
