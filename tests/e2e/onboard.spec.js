// First time in: choose new or existing account, then the test fight or sign-in.
// The throne: the first ever challenge is met with a bow; later ones are a fight.
const { test, expect } = require('./fixtures');

test('a brand new player: test fight, then help?, then the creator, then the tour', async ({ game, page }) => {
  await page.addInitScript(() => { window.__onboard = true; try { localStorage.removeItem('st-career'); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => window.__ST && window.__ST.G && window.__ST.G.screen === 'msgScr', null, { timeout: 60_000 });
  await game.noRender();
  await expect(page.locator('#msgPanel')).toContainText('Is this your first time playing');
  expect(await game.run("onbStage() === 'choice' && !G.match?.test")).toBe(true);
  await page.locator('#msgPanel .pfoot button', { hasText: 'First time playing' }).click();
  await expect(page.locator('#msgPanel')).toContainText('Your first fight');
  expect(await game.run("G.match && G.match.test && G.match.mode === 5")).toBe(true);
  await expect(page.locator('#onbGrid kbd').first()).toBeVisible();
  await page.locator('#msgPanel .pfoot button', { hasText: 'Fight' }).click();
  await game.until("G.phase === 'prefight' || G.phase === 'fight'");
  await expect(page.locator('#onbHints')).toBeVisible();
  // the fight ends however it ends
  await game.run("(G.match.wins = [0, 2], matchEnd(), true)");
  await game.until("G.screen === 'msgScr'");
  await expect(page.locator('#msgPanel')).toContainText('Online play beyond the tutorial requires BuhurtOS sign-in');
  await expect(page.locator('#msgPanel')).toContainText('Your progress is saved on this device');
  await page.locator('#msgPanel .pfoot button', { hasText: 'Sign in to continue' }).click();
  // account connection is now mandatory immediately after the first tutorial fight
  await game.until("G.screen === 'msgScr'");
  await expect(page.locator('#msgPanel')).toContainText('Sign in with BuhurtOS');
  // signed in (as the tests can't reach BuhurtOS, the login and roster are stubbed): pick a team, then the fighter
  await game.run(`(BOS.user = { id: 'u-test' }, BOS.info = { name: 'Wren', fighter: null }, Object.assign(ROSTER, { ok: true, teams: [{ slug: 'iron-wolves', name: 'The Iron Wolves', colors: ['#2C4A8C', '#E9ECEF'], initial: 'I' }, { slug: 'red-hart', name: 'Red Hart Company', colors: ['#8a1f2a', '#e8e1cf'], initial: 'R' }], fighters: [{ id: 'f2', name: 'Bjorn Steel', team: 'iron-wolves', g: 'm' }, { id: 'f3', name: 'Ulla Hart', team: 'red-hart', g: 'f' }] }), rosterClubs(), openCreator(), true)`);
  await game.until("G.screen === 'creator'");
  await expect(page.locator('#creatorTitle')).toHaveText('Your team');
  await page.locator('#creatorBody .up', { hasText: 'Red Hart Company' }).getByRole('button').click();
  await game.until("CAREER.teamPicked && CAREER.club.bos === 'red-hart'");
  expect(await game.run("CLUBS.reavers.name === 'Red Hart Company' && CLUBS.reavers.bos === 'red-hart'")).toBe(true);
  await expect(page.locator('#creatorTitle')).toHaveText('Make your fighter');
  await page.locator('#creatorBody input[placeholder*="fighter"]').fill('Wren');
  await page.locator('#creatorBody .seg button', { hasText: 'Tall' }).click();
  expect(await game.run("CAREER.name === 'Wren' && G.loadout.height === 'tall'")).toBe(true);
  await page.locator('#creatorDone').click();
  await game.until("TOWN.on && ONB.tour", 60000);
  await expect(page.locator('#tour')).toContainText('The Buhurt Festival');
  await page.locator('#tour button', { hasText: 'Skip' }).click();
  expect(await game.run("!ONB.tour && onbStage() === 'done' && !TOWN.busy")).toBe(true);
});

test('a new browser with an existing account goes to sign-in, not a new fight', async ({ game, page }) => {
  await page.addInitScript(() => { window.__onboard = true; try { localStorage.removeItem('st-career'); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => window.__ST && window.__ST.G && window.__ST.G.screen === 'msgScr', null, { timeout: 60_000 });
  await expect(page.locator('#msgPanel')).toContainText('Is this your first time playing');
  await page.locator('#msgPanel .pfoot button', { hasText: 'I have an account' }).click();
  await expect(page.locator('#msgPanel')).toContainText('Sign in with BuhurtOS');
  await expect(page.locator('#bosEmail')).toBeVisible();
  expect(await game.run("onbStage() === 'choice' && !G.match?.test")).toBe(true);
  await page.locator('#msgPanel .pfoot button', { hasText: 'Back' }).click();
  await expect(page.locator('#msgPanel')).toContainText('Is this your first time playing');
  expect(await game.run("onbStage() === 'choice'")).toBe(true);
});

test('an interrupted first fight offers account sign-in on the next visit', async ({ game, page }) => {
  await page.addInitScript(() => { window.__onboard = true; try { localStorage.setItem('st-career', JSON.stringify({ onboard: 'fight' })); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => window.__ST && window.__ST.G?.screen === 'msgScr', null, { timeout: 60_000 });
  await expect(page.locator('#msgPanel')).toContainText('Is this your first time playing');
  expect(await game.run("onbStage() === 'fight' && !G.match?.test")).toBe(true);
  await page.locator('#msgPanel .pfoot button', { hasText: 'I have an account' }).click();
  await expect(page.locator('#msgPanel')).toContainText('Sign in with BuhurtOS');
});

test('a saved session shows restoring rather than flashing the sign-in form', async ({ game, page }) => {
  await game.run("(window.__onboard = true, CAREER.onboard = 'done', BOS.booting = true, toTitle(), true)");
  await expect(page.locator('#msgPanel')).toContainText('Restoring your account');
  await expect(page.locator('#bosEmail')).toHaveCount(0);
  expect(await game.run("(onbResumeAfterAuth(), ONB.awaitingAuth && G.screen === 'msgScr')")).toBe(true);
  await game.run("(BOS.booting = false, BOS.user = { id: 'saved-session-test' }, CLOUD.uid = BOS.user.id, CLOUD.ready = true, onbResumeAfterAuth(), true)");
  expect(await game.run("G.screen === 'title' && CAREER.onboard === 'done'")).toBe(true);
});

test('startup screen stays up until the account route is resolved', async ({ game, page }) => {
  await game.run("(window.__onboard = true, CAREER.onboard = 'done', ONB.startup = true, document.querySelector('#startup').hidden = false, BOS.booting = true, toTitle(), true)");
  await expect(page.locator('#startup')).toBeVisible();
  await expect(page.locator('#startupStatus')).toContainText('Checking your BuhurtOS sign-in');
  await expect(page.locator('#bosEmail')).toHaveCount(0);
  // Exercise the hosted cloud gate; file-based tests normally bypass it.
  await game.run("(window.__steeltapeTest = false, BOS.booting = false, BOS.user = { id: 'startup-test' }, CLOUD.uid = BOS.user.id, CLOUD.ready = false, CLOUD.loading = true, toTitle(), true)");
  await expect(page.locator('#startup')).toBeVisible();
  await expect(page.locator('#startupStatus')).toContainText('Restoring your fighter and inventory');
  await game.run("(CLOUD.loading = false, CLOUD.ready = true, onbResumeAfterAuth(), true)");
  await expect(page.locator('#startup')).toBeHidden();
  await expect(page.locator('#title')).toBeVisible();
});

test('booting an existing session finishes on the saved fighter menu', async ({ game, page }) => {
  await game.run(`(window.__onboard = true, CAREER.onboard = 'done',
    localStorage.setItem('buhurt-game-buhurtos', 'saved'),
    CLOUD.uid = 'boot-test', CLOUD.ready = true,
    BOS.sb = { auth: { getSession: () => new Promise(resolve => setTimeout(() => resolve({ data: { session: { user: { id: 'boot-test', email: 'fighter@example.test' } } } }), 500)) },
      from: () => ({ select() { return this; }, eq() { return this; }, limit() { return this; }, maybeSingle() { return Promise.resolve({ data: null }); } }) },
    bosBoot(), toTitle(), true)`);
  await expect(page.locator('#msgPanel')).toContainText('Restoring your account');
  await game.until("!BOS.booting && G.screen === 'title'");
  expect(await game.run("CAREER.onboard === 'done' && !ONB.awaitingAuth && BOS.user?.id === 'boot-test'")).toBe(true);
});

test('signing into a restored fighter does not reopen first-time setup', async ({ game, page }) => {
  await page.addInitScript(() => { window.__onboard = true; try { localStorage.removeItem('st-career'); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => window.__ST && window.__ST.G?.screen === 'msgScr', null, { timeout: 60_000 });
  await page.locator('#msgPanel .pfoot button', { hasText: 'I have an account' }).click();
  expect(await game.run("onbStage() === 'choice'")).toBe(true);
  await game.run("(CAREER.onboard = 'done', CAREER.purse = 777, BOS.user = { id: 'returning-test' }, onbAfterAccount(), true)");
  expect(await game.run("G.screen === 'title' && CAREER.purse === 777 && CAREER.onboard === 'done'")).toBe(true);
});

test('a pending cloud restore cannot be overwritten by stale in-memory career data', async ({ game }) => {
  const safe = await game.run(`(async () => {
    BOS.user = { id: 'restoring-test' }; CLOUD.uid = BOS.user.id; CLOUD.ready = true; CLOUD.applying = true;
    localStorage.setItem('st-career', JSON.stringify({ onboard: 'done', purse: 777 }));
    await bosLoadInfo();
    const kept = JSON.parse(localStorage.getItem('st-career'));
    CLOUD.applying = false;
    return kept.onboard === 'done' && kept.purse === 777;
  })()`);
  expect(safe).toBe(true);
});

test('exiting a town fight returns to town; exiting the first fight returns to welcome', async ({ game, page }) => {
  expect(await game.run("(G.attract = false, G.hub = true, leaveTarget() === toTitle)")).toBe(true);
  await game.run("(onbSet('choice'), G.hub = false, G.match.test = true, G.attract = false, G.phase = 'fight', leaveScreen(), true)");
  await expect(page.locator('#msgPanel')).toContainText('Leave this match?');
  await page.locator('#msgPanel .pfoot button', { hasText: 'Leave' }).click();
  await expect(page.locator('#msgPanel')).toContainText('Is this your first time playing');
  expect(await game.run("onbStage() === 'choice' && G.screen === 'msgScr' && !G.match?.test")).toBe(true);
});

test('a completed legacy save cannot enter the town after signout and retains its progress', async ({ game, page }) => {
  await page.addInitScript(() => {
    window.__onboard = true; // real gate, not the normal isolated fixture's bypass
    try { localStorage.setItem('st-career', JSON.stringify({ onboard: 'done', purse: 1013, upgrades: { harness: 2 }, stats: { matches: 8, wins: 4 } })); } catch (e) {}
  });
  await page.reload();
  await page.waitForFunction(() => window.__ST && window.__ST.G && window.__ST.G.screen === 'msgScr', null, {timeout:60000});
  await expect(page.locator('#msgPanel')).toContainText('Sign in with BuhurtOS');
  expect(await game.run('CAREER.purse === 1013 && CAREER.upgrades.harness === 2 && CAREER.stats.matches === 8')).toBe(true);
  // Even a direct call to enterTown must not open the realm without a verified session.
  await game.run('(enterTown(), true)');
  expect(await game.run('!TOWN.on')).toBe(true);
  // Mock a verified account for the isolated, no-network browser suite.
  await game.run("(BOS.user = { id: 'verified-test-uid' }, toTitle(), true)");
  await game.until("G.screen === 'title'");
  expect(await game.run('CAREER.purse === 1013 && CAREER.upgrades.harness === 2 && CAREER.stats.matches === 8')).toBe(true);
});

test('someone who played before gets the creator next time they open the game', async ({ game, page }) => {
  await page.addInitScript(() => { window.__onboard = true; try { localStorage.setItem('st-career', JSON.stringify({ stats: { matches: 12 }, name: 'Old Hand' })); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => window.__ST && window.__ST.G && window.__ST.G.screen === 'msgScr', null, { timeout: 60_000 });
  await expect(page.locator('#msgPanel')).toContainText('Sign in with BuhurtOS');
  expect(await game.run("CAREER.name")).toBe('Old Hand');
});

test('the throne: first ever challenge bows, the next is a fight against a tougher stand-in', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until("TOWN.on && G.hub");
  // no writ: turned away
  await game.run("(townJump('throne'), townTalk(TOWN.stalls.find(s => s.V.key === 'throne')), true)");
  expect(await game.run("G.screen")).toBe(null);
  // with the writ, and a fake court roll where the king's seat has never been challenged
  await game.run("(CAREER.writs = { royal: 1, bailey: 1 }, THRONE.seats = { king: { name: 'Garrett Robson', uid: 'u1', challenges: 0 }, queen: { name: 'Taylor Robson', uid: 'u2', challenges: 3 } }, THRONE.at = Date.now(), true)");
  await game.run("(townTalk(TOWN.stalls.find(s => s.V.key === 'throne')), true)");
  await game.until("G.screen === 'townShop'");
  await expect(page.locator('#townShopBody')).toContainText('King Garrett Robson');
  await expect(page.locator('#townShopBody')).toContainText('Queen Taylor Robson');
  // the bow, as the server would answer the first challenge
  await game.run("(throneBow('king', 'Garrett Robson'), true)");
  await expect(page.locator('#msgPanel')).toContainText('The crown is yours');
  expect(await game.run("!!CAREER.throne.king && !!CAREER.ach.crowned")).toBe(true);
  // the queen's seat: a fight against her champion, at tier 3 and tougher than the guard
  await game.run("(throneFight('queen'), true)");
  await game.until("!TOWN.on && G.match && G.match.throne === 'queen'");
  expect(await game.run("G.fighters[1].name")).toBe('Taylor Robson');
  expect(await game.run("G.fighters[1].prof.react < 0.2 && aiTier(G.fighters[1]) === 3")).toBe(true);
});
