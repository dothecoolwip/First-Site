// Every screen has a way back: a Back (or Leave) button you can tap, and the pad's B / Escape do the same.
const { test, expect } = require('./fixtures');
const visibleBack = page => page.evaluate(() => { const s = document.getElementById(__ST.G.screen); const b = s && [...s.querySelectorAll('[data-back], [data-leave]')].find(x => x.getBoundingClientRect().width > 0); return !!b; });
const clickBack = page => page.evaluate(() => { const s = document.getElementById(__ST.G.screen); [...s.querySelectorAll('[data-back], [data-leave]')].find(x => x.getBoundingClientRect().width > 0).click(); });

test('title menus and message screens all have a Back that works @touch', async ({ game, page }) => {
  await game.noRender();
  const opens = ["openModes()", "openLadder()", "openCareer()", "openDaily()", "openRun()", "openSeason()", "openOnlineHub()", "openKids()", "openVersus()", "openBracket()",
    "(G.backTo = 'title', showScreen('settings'))", "(G.backTo = 'title', showScreen('howto'))", "document.getElementById('btnCredits').click()"];
  for (const o of opens) {
    await game.run(`(toTitle(), true)`); await game.frames(2);
    await game.run(`(${o}, true)`); await game.frames(3);
    const scr = await game.screen();
    expect(scr, o).not.toBe('title');
    expect(await visibleBack(page), `back button on ${o} (${scr})`).toBe(true);
    await clickBack(page); await game.frames(3);
    expect(await game.screen(), `after back from ${o}`).not.toBe(scr === 'msgScr' ? '__none__' : scr);
  }
});

test('leaving a match from the tactics screen asks first, then returns to the fight menu', async ({ game, page }) => {
  await game.noRender();
  await game.run("(quickFight(5, 'wardens'), true)");
  await game.until("G.screen === 'tactics'");
  expect(await visibleBack(page)).toBe(true);
  await clickBack(page);
  await game.until("G.screen === 'msgScr'");
  await expect(page.locator('#msgPanel')).toContainText('Leave this match?');
  await page.evaluate(() => [...document.querySelectorAll('#msgPanel .pfoot .btn')].find(b => b.textContent === 'Stay').click());
  await game.until("G.screen === 'tactics'");
  await page.keyboard.press('Escape'); // keyboard back works too
  await game.until("G.screen === 'msgScr'");
  await page.evaluate(() => document.querySelector('#msgPanel .pfoot .btn.primary').click());
  await game.until("G.screen === 'modes'");
});

test('score sheet and repair bench can be left mid-match', async ({ game, page }) => {
  await game.noRender();
  await game.run("(quickFight(5, 'wardens'), beginFight(), true)");
  await game.until("G.phase === 'fight'");
  await game.run("(G.phase = 'between', renderSheet(), showScreen('sheetScr'), true)");
  expect(await visibleBack(page)).toBe(true);
  await game.run("(openRepair(30, () => toTactics()), true)");
  await game.until("G.screen === 'repair'");
  expect(await visibleBack(page)).toBe(true);
  await clickBack(page);
  await game.until("G.screen === 'msgScr'");
  await page.evaluate(() => document.querySelector('#msgPanel .pfoot .btn.primary').click());
  await game.until("G.screen === 'modes'");
});
