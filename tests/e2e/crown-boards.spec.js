const { test, expect } = require('./fixtures');

test('realm boards update on their own and show both crowned fighters in their last saved outfits', async ({ game, page }) => {
  let wins = 3;
  await page.route('**/functions/v1/steeltape-boards', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    leaderboard: [{ name: 'Arena Fighter', wins, matches: wins + 1, level: 4 }],
    online: [{ name: 'Arena Fighter', level: 4 }], onlineCount: 1,
  }) }));
  await page.route('**/functions/v1/steeltape-throne', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ seats: {
    king: { name: 'King Fighter', uid: 'king', since: '2026-10-12T00:00:00Z', look: { b: '#334455', t: '#aabbcc', h: 'cap', c: 'none', n: 'none' } },
    queen: { name: 'Queen Fighter', uid: 'queen', since: '2026-10-12T00:00:00Z', look: { b: '#553344', t: '#ccaabb', h: 'flowers', c: 'none', n: 'none' } },
  } }) }));
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && BOARDS.data && THRONE.seats && BOARDS.statues && BOARDS.statues.king && BOARDS.statues.queen');
  expect(await game.run('BOARDS.data.onlineCount')).toBe(1);
  expect(await game.run('BOARDS.statues.king.parent === TOWN.root && BOARDS.statues.queen.parent === TOWN.root')).toBe(true);
  expect(await game.run('BOARDS.statues.king.children.some(x => x.position.y === 0.82)')).toBe(true);
  expect(await game.run(`['king', 'queen'].every(seat => {
    const statue = BOARDS.statues[seat], quarter = STALL_AT.quarter, herald = STALL_AT.herald;
    return statue.children.some(x => x.name === 'crownNamePlaque') &&
      Math.hypot(statue.position.x - quarter[0], statue.position.z - quarter[1]) > 5 &&
      Math.hypot(statue.position.x - herald[0], statue.position.z - herald[1]) > 5;
  })`)).toBe(true);
  wins = 9;
  await game.run('(BOARDS.nextPoll = 0, true)');
  await game.until('BOARDS.data.leaderboard[0].wins === 9');
  expect(await game.run('G.screen')).not.toBe('townShop');
});

test('a crowned fighter without a saved outfit keeps their name and shows an outfit-pending statue', async ({ game, page }) => {
  await page.route('**/functions/v1/steeltape-throne', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ seats: {
    king: { name: 'King Fighter', uid: 'king', since: '2026-10-12T00:00:00Z', look: { g: 'male' } },
    queen: { name: 'Queen Fighter', uid: 'queen', since: '2026-10-12T00:00:00Z', look: null },
  } }) }));
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && BOARDS.statues && BOARDS.statues.queen && THRONE.seats?.queen');
  expect(await game.run("BOARDS.statues.queen.getObjectByName('crownNamePlaque') !== undefined")).toBe(true);
  expect(await game.run("BOARDS.statues.queen.getObjectByName('fighterUBCHead') !== undefined")).toBe(false);
  expect(await game.run("BOARDS.statues.queen.getObjectByName('crownOutfitPending') !== undefined")).toBe(true);
});

