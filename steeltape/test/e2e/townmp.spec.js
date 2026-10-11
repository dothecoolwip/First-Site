const { test, expect, route } = require('./fixtures');
const installFakeRoom = require('./fake-room');
const installFakePeer = require('./fake-peer');

test.setTimeout(240_000);
for (const [via, install] of [['room', installFakeRoom], ['p2p', installFakePeer]])
test(`two players in town see each other walk about (${via}), and the list always has a fight on`, async ({ game, page, context }) => {
  const nm = n => { try { localStorage.setItem('st-lobbyName', JSON.stringify(n)); } catch (e) { } };
  await page.addInitScript(install); await page.addInitScript(nm, 'Dad'); await page.reload();
  await page.waitForFunction(() => window.__ST && window.__ST.G.screen === 'title', null, { timeout: 60_000 });
  const b = await context.newPage();
  await route(b); await b.addInitScript(install); await b.addInitScript(nm, 'Kid'); await b.goto(page.url());
  await b.waitForFunction(() => window.__ST && window.__ST.G.screen === 'title', null, { timeout: 60_000 });
  await page.waitForTimeout(2500); // the lobby starts 1.5 s after the title
  for (const pg of [page, b]) await pg.evaluate(() => document.getElementById('btnFight').click());
  for (const pg of [page, b]) await pg.waitForFunction(() => __ST.TOWN.on && __ST.G.phase === 'town', null, { timeout: 60_000 });
  // Dad walks to the fountain; Kid should see him there
  await page.evaluate(() => { __ST.TOWN.pos = { x: 4, z: 44 }; });
  await b.waitForFunction(() => { const o = Object.values(__ST.WORLD.others); return o.length === 1 && Math.hypot(o[0].x - 4, o[0].z - 44) < 1.5; }, null, { timeout: 60_000 });
  await page.waitForFunction(() => Object.keys(__ST.WORLD.others).length === 1, null, { timeout: 60_000 });
  // he's on Kid's map and talkable
  expect(await b.evaluate(() => __ST.TOWN.stalls.some(s => s.player && s.V.role === 'Online player'))).toBe(true);
  // when Dad leaves town for a fight, he disappears from Kid's town
  await page.evaluate(() => __ST.leaveTown(() => {}));
  await b.waitForFunction(() => Object.keys(__ST.WORLD.others).length === 0, null, { timeout: 60_000 });
  // a festival bout runs in Kid's list, with no player and no stats
  await b.waitForFunction(() => __ST.BOUT.on && __ST.G.fighters.length >= 2 && !__ST.G.player && __ST.G.attract && __ST.G.phase === 'town', null, { timeout: 60_000 });
  // starting a real fight from town puts the bout away
  await b.evaluate(() => __ST.quickFight(1));
  await b.waitForFunction(() => !__ST.BOUT.on && !__ST.TOWN.on && __ST.G.player, null, { timeout: 60_000 });
  for (const pg of [page, b]) expect(await pg.evaluate(() => __ST.G.stats.errors.length)).toBe(0);
});
