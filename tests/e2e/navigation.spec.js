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

test('controller Back closes a vendor and lost movement input clears @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.people');
  await game.run("(openVendor('smith'), true)");
  expect(await game.run("G.screen")).toBe('townShop');
  const pad = await game.addPad();
  await game.press(pad, 1);
  expect(await game.run("G.screen")).not.toBe('townShop');
  expect(await game.run('TOWN.vendor')).toBeNull();
  await game.run("(IN.keys.KeyW=true, IN.stick.id=13, IN.stick.y=-1, IN.pad.id=14, IN.pad.dy=1, true)");
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await game.run('!IN.keys.KeyW && IN.stick.id === null && IN.pad.id === null && IN.stick.y === 0 && IN.pad.dy === 0')).toBe(true);
  await game.run("(BOS.user={id:'00000000-0000-4000-8000-000000000001'}, TOWN.pos={x:12.3,z:35.2}, true)");
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect(await game.run('CAREER.townPosition?.x')).toBe(12.3);
  expect(await game.run('CAREER.townPosition?.z')).toBe(35.2);
});
