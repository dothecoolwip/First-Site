const { test, expect, route } = require('./fixtures');
const installFakeRoom = require('./fake-room');

test.setTimeout(240_000);
test('invite a friend: host sees the friend online, invites them, both land in the duel', async ({ game, page, context }) => {
  // the fixture already loaded page A; reload both pages with the fake room installed
  await page.addInitScript(installFakeRoom); await page.reload();
  await page.waitForFunction(() => window.__ST && window.__ST.G.screen === 'title', null, { timeout: 60_000 });
  const b = await context.newPage();
  await route(b);
  await b.addInitScript(installFakeRoom);
  await b.goto(page.url());
  await b.waitForFunction(() => window.__ST && window.__ST.G.screen === 'title', null, { timeout: 60_000 });
  for (const pg of [page, b]) await pg.evaluate(() => { __ST.G.renderEvery = 1e9; });
  await page.evaluate(() => { localStorage.setItem('lobbyName', 'Dad'); });
  await b.evaluate(() => { localStorage.setItem('lobbyName', 'Kid'); });
  await page.waitForTimeout(2500); // lobby starts 1.5 s after the title
  await page.evaluate(() => document.getElementById('btnInvite').click());
  await expect(page.locator('#inviteList .invrow')).toHaveCount(1, { timeout: 15_000 });
  await page.evaluate(() => document.querySelector('#inviteList .invrow .invacts > button:last-child').click());
  await expect(b.locator('#msgPanel')).toContainText('invited you', { timeout: 15_000 });
  await b.evaluate(() => document.querySelector('#msgPanel .pfoot .btn.primary').click());
  await b.waitForFunction(() => __ST.NET.role === 'guest' && document.querySelectorAll('#lobTeams .lobp').length === 2, null, { timeout: 60_000 });
  await page.waitForFunction(() => document.querySelectorAll('#lobTeams .lobp').length === 2, null, { timeout: 60_000 });
  await page.evaluate(() => [...document.querySelectorAll('#msgPanel .pfoot .btn')].find(x => x.textContent === 'Start fight').click());
  await page.waitForFunction(() => __ST.NET.on && __ST.NET.role === 'host', null, { timeout: 30_000 });
  await b.waitForFunction(() => __ST.NET.on && __ST.NET.role === 'guest', null, { timeout: 60_000 });
});
