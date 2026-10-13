const { test, expect } = require('./fixtures');

test('Barber selections retain controls, scroll and focus @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && UAL.ready && TOWN.me');
  await game.run("(openVendor('barber'), true)");
  const beard = page.getByRole('button', { name: 'Full beard', exact: true });
  await beard.scrollIntoViewIfNeeded();
  await beard.focus();
  const before = await beard.evaluate(b => {
    window.__barberButton = b;
    window.__barberScroll = b.closest('.barber-controls');
    return window.__barberScroll.scrollTop;
  });
  await beard.click();
  expect(await beard.evaluate(b => b === window.__barberButton)).toBe(true);
  expect(await beard.evaluate(b => b.closest('.barber-controls') === window.__barberScroll)).toBe(true);
  expect(Math.abs(await beard.evaluate(b => b.closest('.barber-controls').scrollTop) - before)).toBeLessThanOrEqual(2);
  await expect(beard).toHaveAttribute('aria-pressed', 'true');
  await expect(beard).toBeFocused();
  expect(await game.run("lookState().beard")).toBe('full');
  await game.run("(closeVendor(), openVendor('barber'), true)");
  await expect(page.getByRole('button', { name: 'Full beard', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('Barber colours, hair and body persist without scrolling resets @touch', async ({ game, page }) => {
  await game.noRender(); await page.locator('#btnFight').click(); await game.until('TOWN.on && UAL.ready && TOWN.me');
  await game.run("(openVendor('barber'),true)");
  for (const key of ['hair','hairColor','eyes','beard']) {
    const buttons = page.locator(`.barber-section:not([hidden]) [data-barber-key="${key}"]`);
    const count = await buttons.count();
    for (const index of [count-1,0,count-1]) {
      const b = buttons.nth(index); await b.scrollIntoViewIfNeeded(); await b.focus();
      const before = await b.evaluate(el => ({scroll:el.closest('.barber-controls').scrollTop,value:el.dataset.barberValue}));
      await b.click(); await expect(b).toHaveAttribute('aria-pressed','true');
      expect(Math.abs(await b.evaluate(el=>el.closest('.barber-controls').scrollTop)-before.scroll)).toBeLessThanOrEqual(2);
      expect(await game.run(`lookState()['${key}']`)).toBe(before.value);
    }
  }
  await page.getByRole('tab',{name:/Body/}).click();
  await page.getByRole('button',{name:'Feminine',exact:true}).click();
  await expect(page.getByRole('tab',{name:/Body/})).toHaveAttribute('aria-pressed','true');
  const skin=page.locator('[data-barber-key="skin"]').last(); await skin.scrollIntoViewIfNeeded(); await skin.click(); await expect(skin).toHaveAttribute('aria-pressed','true');
  const state=await game.run('JSON.stringify(lookState())');
  await game.run("(closeVendor(),openVendor('barber'),true)"); expect(await game.run('JSON.stringify(lookState())')).toBe(state);
});

test('Barber preserves appearance controls in portrait @touch', async ({ game, page }) => {
  await page.setViewportSize({width:390,height:844});
  await game.noRender(); await page.locator('#btnFight').click(); await game.until('TOWN.on && UAL.ready && TOWN.me');
  await game.run("(openVendor('barber'),true)");
  const beard=page.getByRole('button',{name:'Full beard',exact:true}); await beard.scrollIntoViewIfNeeded();
  const before=await beard.evaluate(el=>{window.__portraitControl=el;return document.getElementById('townShopBody').scrollTop});
  await beard.click(); expect(await beard.evaluate(el=>el===window.__portraitControl)).toBe(true);
  expect(Math.abs(await page.locator('#townShopBody').evaluate(el=>el.scrollTop)-before)).toBeLessThanOrEqual(2);
  await expect(beard).toHaveAttribute('aria-pressed','true');
});

test('Help opens populated from the town map @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on');
  await game.run('(openTownMap(), true)');
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.locator('#howGrid')).not.toBeEmpty();
});

test('town marshal launches Quick fight after obsolete buttons are removed @touch', async ({ game, page }) => {
  await game.noRender(); await page.locator('#btnFight').click(); await game.until('TOWN.on');
  await game.run("(townTalk(TOWN.stalls.find(s=>s.V.key==='marshal')),true)");
  await page.getByRole('button',{name:'Quick fight',exact:true}).click();
  await expect(page.locator('#modes')).toBeVisible();
  expect(await page.locator('#btnQuick').count()).toBe(0);
});

test('Profile uses the same appearance editor as Marta @touch', async ({ game, page }) => {
  await game.noRender(); await game.run("(openCareer('profile'),true)");
  await page.getByRole('button',{name:'Edit fighter',exact:true}).click();
  await expect(page.locator('.appearance-editor .barber-controls')).toHaveCount(2);
  await page.getByRole('button',{name:'Long layers',exact:true}).click();
  expect(await game.run('lookState().hair')).toBe('long');
  await page.getByRole('button',{name:'Back to Profile',exact:true}).click();
  await expect(page.getByRole('button',{name:'Edit fighter',exact:true})).toBeVisible();
});
