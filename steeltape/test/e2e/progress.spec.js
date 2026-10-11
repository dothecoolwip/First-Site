// Progression: ten times the awards, renown ranks, weapon mastery, daily and weekly challenges.
const { test, expect } = require('./fixtures');

test('awards, ranks, mastery and challenges @touch', async ({ game, page }) => {
  await game.noRender();
  expect(await game.run('ACH.length')).toBeGreaterThanOrEqual(240);
  // an old save with real numbers catches up in one summary
  await game.run("(CAREER.stats.matches = 60, CAREER.stats.wins = 12, CAREER.stats.hits = 300, CAREER.level = 26, CAREER.playSec = 2000 * 60, progressCheck(), true)");
  expect(await game.run("!!CAREER.ach.t_matches_3 && !!CAREER.ach.t_wins_2 && !!CAREER.ach.t_hits_2 && !CAREER.ach.t_hits_3 && !!CAREER.ach.t_level_3")).toBe(true);
  expect(await game.run('rankOf(26)')).toBe('Man-at-arms');
  const ch = await game.run('JSON.stringify(challenges().daily)');
  expect(JSON.parse(ch).length).toBe(3);
  await game.run("(G.attract = false, G.player = { weapon: WEAPONS.longsword, spec: { weapon: 'longsword' }, team: 0 }, progressMatch({ mode: 1, duel: true, results: [{ winner: 0 }, { winner: 0 }], category: 'men' }, true), true)");
  expect(await game.run("S2().duelWins")).toBe(1);
  expect(await game.run("S2().wpn.longsword")).toBe(1);
  expect(await game.run("masteryOf('longsword').xp > 0 || masteryOf('longsword').lv > 0")).toBe(true);
  await game.run("(G.player = null, true)");
  await game.run("(openCareer('progress'), true)");
  await expect(page.locator('#careerBody')).toContainText('Today’s challenges');
  await expect(page.locator('#careerBody')).toContainText('Weapon mastery');
  await game.run("(G.careerTab = 'ach', renderCareer(), true)");
  await expect(page.locator('#careerBody')).toContainText('Tiered awards');
  expect(await page.locator('#careerBody .achs.tiered .ach').count()).toBeGreaterThan(40);
});
