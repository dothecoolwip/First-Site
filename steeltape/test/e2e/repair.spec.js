// The repair bench: tap a strap, rip / wrap / smooth, or let the squire do one; Done returns to the fight.
const { test, expect } = require('./fixtures');

test('repair bench: fix a strap by hand, squire patches another, Done carries on @touch', async ({ game, page }) => {
  await game.noRender();
  await game.run("(quickFight(5, 'wardens'), true)"); await game.until("G.screen === 'tactics'");
  await game.run("(G.player.kit.armL.cond = 0.3, G.player.kit.helmet.cond = 0.45, openRepair(45, () => { window.__repDone = 1; }), true)");
  await game.until("G.screen === 'repair'");
  await expect(page.locator('#kitlist .piece.worst')).toContainText('Left arm');
  await page.locator('#kitlist .piece.worst').click();
  expect(await game.run('REP.step')).toBe('rip');
  // rip, then swipe across the strap until the tear is covered, then rub out the bubbles
  await game.run("(REP.ripT = Math.asin(0) / 3.4, benchDown({ x: .5, y: .5 }), true)");
  expect(await game.run('REP.step')).toBe('wrap');
  for (let x = 0.37; x <= 0.64 && (await game.run('REP.step')) === 'wrap'; x += 0.05) await game.run(`(benchMove({ x: ${x}, y: .3 }), benchMove({ x: ${x}, y: .7 }), true)`);
  expect(await game.run('REP.step')).toBe('smooth');
  await game.run("(REP.wrinkles.forEach(w => benchMove({ x: w.x, y: .5 })), true)");
  expect(await game.run('REP.step')).toBe(null);
  expect(await game.run('G.player.kit.armL.cond')).toBeGreaterThan(0.75);
  // the squire takes the next worst
  await page.locator('#btnSquire').click();
  expect(await game.run('G.player.kit.helmet.cond')).toBeGreaterThan(0.8);
  await expect(page.locator('#btnSquire')).toBeHidden();
  await page.evaluate(() => (document.querySelector('#repair .hdrdone').offsetParent ? document.querySelector('#repair .hdrdone') : document.getElementById('btnRepairDone')).click());
  await game.until('window.__repDone === 1');
});
