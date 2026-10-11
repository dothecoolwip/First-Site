// Online play away from claude.ai (PeerJS, faked here over BroadcastChannel): lobbies, teams, bots, up to 20 people.
const { test, expect, route } = require('./fixtures');
const installFakePeer = require('./fake-peer');
test.setTimeout(300_000);

async function openPage(context, url, name) {
  const pg = await context.newPage(); await route(pg); await pg.addInitScript(installFakePeer);
  await pg.addInitScript(n => { try { localStorage.setItem('st-lobbyName', JSON.stringify(n)); } catch (e) { } }, name);
  await pg.goto(url);
  await pg.waitForFunction(() => window.__ST && window.__ST.G.screen === 'title', null, { timeout: 90_000 });
  await pg.evaluate(() => { __ST.G.renderEvery = 1e9; });
  return pg;
}
async function hostPage(page, name) {
  await page.addInitScript(installFakePeer);
  await page.addInitScript(n => { try { localStorage.setItem('st-lobbyName', JSON.stringify(n)); } catch (e) { } }, name);
  await page.reload();
  await page.waitForFunction(() => window.__ST && window.__ST.G.screen === 'title', null, { timeout: 60_000 });
  await page.evaluate(() => { __ST.G.renderEvery = 1e9; });
}
const humans = pg => pg.evaluate(() => document.querySelectorAll('#lobTeams .lobp').length);

test('make a lobby, a friend joins by link, the host sets 1 a side and starts', async ({ game, page, context }) => {
  await hostPage(page, 'Dad');
  await page.evaluate(() => __ST.hostLobby(false));
  await page.waitForFunction(() => __ST.NET.code && document.getElementById('lobTeams'), null, { timeout: 30_000 });
  const code = await page.evaluate(() => __ST.NET.code);
  const b = await openPage(context, page.url().split('#')[0] + '#join=' + code, 'Kid');
  await b.waitForFunction(() => document.getElementById('lobTeams') && document.querySelectorAll('#lobTeams .lobp').length === 2, null, { timeout: 60_000 });
  await expect.poll(() => humans(page), { timeout: 30_000 }).toBe(2);
  // host: 1 a side, no bots (the friend took the other side automatically)
  await page.evaluate(() => { __ST.ONL.L.n = 1; __ST.ONL.L.bots = [0, 0]; });
  await page.evaluate(() => [...document.querySelectorAll('#msgPanel .pfoot .btn')].find(x => x.textContent === 'Start fight').click());
  await b.waitForFunction(() => __ST.NET.on && __ST.G.player && __ST.G.fighters.length === 2, null, { timeout: 60_000 });
  expect(await b.evaluate(() => __ST.G.player.team)).toBe(1);
  expect(await page.evaluate(() => [__ST.G.fighters.length, __ST.G.player.team])).toEqual([2, 0]);
  // match over: the host goes back to the lobby and the friend follows
  await page.waitForFunction(() => __ST.G.phase === 'fight', null, { timeout: 60_000 });
  await page.evaluate(() => { __ST.G.match.wins = [2, 0]; __ST.matchEnd(); });
  await b.waitForFunction(() => __ST.G.phase === 'over', null, { timeout: 60_000 });
  await page.evaluate(() => [...document.querySelectorAll('#msgPanel .pfoot .btn')].find(x => x.textContent === 'Back to lobby').click());
  await b.waitForFunction(() => document.getElementById('lobTeams') && !__ST.NET.on, null, { timeout: 60_000 });
});

test('find a match: the second player lands in the first player’s open lobby; bots fill a 3v3', async ({ game, page, context }) => {
  await hostPage(page, 'Alpha');
  const b = await openPage(context, page.url().split('#')[0], 'Bravo');
  await page.waitForTimeout(2500);
  await page.evaluate(() => { __ST.openOnlineHub(); });
  await page.waitForFunction(() => document.getElementById('mmFind'), null, { timeout: 30_000 });
  await page.evaluate(() => document.getElementById('mmFind').click());
  await page.waitForFunction(() => __ST.NET.role === 'host' && document.getElementById('lobTeams'), null, { timeout: 30_000 });
  await b.evaluate(() => { __ST.openOnlineHub(); });
  await b.waitForFunction(() => document.getElementById('inviteList') && document.querySelector('#inviteList .invrow.looking'), null, { timeout: 60_000 });
  await b.evaluate(() => document.getElementById('mmFind').click());
  await b.waitForFunction(() => __ST.NET.role === 'guest' && document.querySelectorAll('#lobTeams .lobp').length === 2, null, { timeout: 60_000 });
  await page.evaluate(() => { __ST.ONL.L.n = 3; __ST.ONL.L.bots = [null, null]; });
  await page.evaluate(() => [...document.querySelectorAll('#msgPanel .pfoot .btn')].find(x => x.textContent === 'Start fight').click());
  await b.waitForFunction(() => __ST.NET.on && __ST.G.fighters.length === 6, null, { timeout: 60_000 });
});

test('three people in a 10 v 10: everyone else is a bot, and the snapshot carries all twenty', async ({ game, page, context }) => {
  await hostPage(page, 'Host');
  await page.evaluate(() => __ST.hostLobby(false));
  await page.waitForFunction(() => __ST.NET.code, null, { timeout: 30_000 });
  const code = await page.evaluate(() => __ST.NET.code);
  const url = page.url().split('#')[0] + '#join=' + code;
  const b = await openPage(context, url, 'Blue');
  const c = await openPage(context, url, 'Green');
  await expect.poll(() => humans(page), { timeout: 60_000 }).toBe(3);
  // Green moves to the host's side
  await c.evaluate(() => { __ST.ONL.team = 0; __ST.NET.room.presence({ team: 0 }); });
  await expect.poll(() => page.evaluate(() => __ST.ONL.peers.filter(p => p.presence && p.presence.team === 0 && p.presence.uid).length), { timeout: 30_000 }).toBe(2);
  await page.evaluate(() => { __ST.ONL.L.n = 10; __ST.ONL.L.bots = [null, null]; });
  await page.evaluate(() => [...document.querySelectorAll('#msgPanel .pfoot .btn')].find(x => x.textContent === 'Start fight').click());
  for (const pg of [b, c]) await pg.waitForFunction(() => __ST.NET.on && __ST.G.fighters.length === 20 && __ST.G.player, null, { timeout: 90_000 });
  expect(await c.evaluate(() => __ST.G.player.team)).toBe(0);
  expect(await b.evaluate(() => __ST.G.player.team)).toBe(1);
  await page.waitForFunction(() => __ST.G.phase === 'fight', null, { timeout: 60_000 });
  await b.waitForFunction(() => __ST.NET.snap && __ST.NET.snap.s && __ST.NET.snap.s.length === 20, null, { timeout: 60_000 });
});

test('tap a player for their stats and play time', async ({ game, page, context }) => {
  await hostPage(page, 'Stats');
  const b = await openPage(context, page.url().split('#')[0], 'Viewer');
  await page.evaluate(() => { __ST.CAREER.name = 'Stats'; __ST.CAREER.stats.matches = 12; __ST.CAREER.stats.wins = 7; __ST.CAREER.playSec = 3725; });
  await b.evaluate(() => { __ST.openOnlineHub(); });
  await b.waitForFunction(() => [...document.querySelectorAll('#inviteList .invwho b')].some(x => x.textContent === 'Stats'), null, { timeout: 60_000 });
  await b.waitForTimeout(5500); // profiles refresh every few seconds
  await b.evaluate(() => [...document.querySelectorAll('#inviteList .invrow')].find(r => r.querySelector('.invwho').textContent.startsWith('Stats')).querySelector('.profbtn').click()); // the profile icon beside Invite
  await expect(b.locator('#msgPanel')).toContainText('Total time played', { timeout: 10_000 });
  await expect(b.locator('#msgPanel')).toContainText('1 h 2 min');
  await expect(b.locator('#msgPanel')).toContainText('58%');
});
