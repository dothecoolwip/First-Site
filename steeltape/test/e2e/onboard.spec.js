// First time in: the 5v5 test fight, help or not, the character creator, the realm tour. Existing players: creator only.
// The throne: the first ever challenge is met with a bow; later ones are a fight.
const { test, expect } = require('./fixtures');

test('a brand new player: test fight, then help?, then the creator, then the tour', async ({ game, page }) => {
  await page.addInitScript(() => { window.__onboard = true; try { localStorage.removeItem('st-career'); } catch (e) {} });
  await page.reload();
  await page.waitForFunction(() => window.__ST && window.__ST.G && window.__ST.G.screen === 'msgScr', null, { timeout: 60_000 });
  await game.noRender();
  await expect(page.locator('#msgPanel')).toContainText('Your first fight');
  expect(await game.run("G.match && G.match.test && G.match.mode === 5")).toBe(true);
  await expect(page.locator('#onbGrid kbd').first()).toBeVisible();
  await page.locator('#msgPanel .pfoot button', { hasText: 'Fight' }).click();
  await game.until("G.phase === 'prefight' || G.phase === 'fight'");
  await expect(page.locator('#onbHints')).toBeVisible();
  // the fight ends however it ends
  await game.run("(G.match.wins = [0, 2], matchEnd(), true)");
  await game.until("G.screen === 'msgScr'");
  await expect(page.locator('#msgPanel')).toContainText('help learning');
  await page.locator('#msgPanel .pfoot button', { hasText: 'got it' }).click();
  // the creator starts with BuhurtOS sign-in
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
