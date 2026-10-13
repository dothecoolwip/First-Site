const { test, expect } = require('./fixtures');

test('barber and wardrobe let a fighter change appearance in town @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && UAL.ready && TOWN.me && TOWN.me.costume');
  expect(await game.run("['barber', 'wardrobe'].every(k => TOWN.stalls.some(s => s.V.key === k))")).toBe(true);

  await game.run("(openVendor('barber'), true)");
  await expect(page.locator('#townShopBody')).toContainText('Hair style');
  await expect(page.locator('#townShopBody .barber-body').first()).toBeVisible();
  await page.getByRole('button', { name: 'Twin buns' }).click();
  await page.getByRole('button', { name: '#d5ab61' }).click();
  expect(await game.run('lookState().hair')).toBe('bun');
  expect(await game.run('lookState().hairColor')).toBe('#d5ab61');
  expect(await game.run("TOWN.me.root.getObjectByName('fighterHair')?.geometry.attributes.position.count > 400")).toBe(true);
  if (process.env.BARBER_HAIR_SCREENSHOT) await page.locator('#townShopBody .barber-mirror').first().screenshot({ path: process.env.BARBER_HAIR_SCREENSHOT });
  if (process.env.BARBER_ALL_HAIR) {
    for (const name of ['Buzz cut', 'Side part', 'Long layers', 'Twin buns']) {
      await page.getByRole('button', { name }).click();
      await page.locator('#townShopBody .barber-mirror').first().screenshot({ path: `${process.env.BARBER_ALL_HAIR}-${name.replaceAll(' ', '-')}.png` });
    }
  }

  await page.getByRole('tab', { name: /Body/ }).click();
  await page.getByRole('button', { name: 'Feminine' }).click();
  for (const label of ['Height', 'Body mass']) {
    const slider = page.getByRole('slider', { name: label, exact: true });
    await slider.evaluate(el => {
      el.value = '90'; el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  const layout = await page.locator('.barber-section:not([hidden])').evaluate(section => {
    const mirror = section.querySelector('.barber-mirror').getBoundingClientRect();
    return [...section.querySelectorAll('.shape-control')].every(el => {
      const rect = el.getBoundingClientRect();
      return rect.right <= mirror.left || rect.top >= mirror.bottom || rect.bottom <= mirror.top;
    });
  });
  expect(layout).toBe(true);
  expect(await game.run("!!TOWN.me.root.getObjectByName('fighterNeck')")).toBe(false);
  expect(await game.run("!!TOWN.me.root.getObjectByName('fighterUBCHead')?.isSkinnedMesh")).toBe(true);
  // The final control must remain reachable with the mirror visible after
  // scrolling independently on a short landscape viewport.
  const lastSlider = page.getByRole('slider', { name: 'Mouth width', exact: true });
  await lastSlider.scrollIntoViewIfNeeded();
  const track = await lastSlider.boundingBox();
  await page.mouse.click(track.x + track.width - 8, track.y + track.height / 2);
  expect(Number(await lastSlider.inputValue())).toBeGreaterThan(90);
  const mirrorBox = await page.locator('.barber-section:not([hidden]) .barber-mirror').boundingBox();
  expect(mirrorBox.y).toBeGreaterThanOrEqual(0);
  expect(mirrorBox.y + mirrorBox.height).toBeLessThanOrEqual(page.viewportSize().height);
  expect(await game.run('lookState().frame')).toBe('female');
  expect(await game.run('G.loadout.height')).toBe('tall');
  expect(await game.run('G.loadout.build')).toBe('heavy');
  expect(await game.run('TOWN.me.costume')).toBe('Female_Peasant');
  if (process.env.BARBER_SCREENSHOT) await page.screenshot({ path: process.env.BARBER_SCREENSHOT });

  await game.run("(openVendor('wardrobe'), true)");
  await expect(page.locator('#townShopBody')).toContainText('Outfits');
  await expect(page.locator('#townShopBody')).toContainText('Club tunic');
  await expect(page.locator('#townShopBody')).toContainText('Trail scout');
  await expect(page.locator('#townShopBody')).toContainText('Festival mercenary');
  expect(await game.run("(lookState().outfit='Female_Ranger_Scout|ranger', townDressMe(), TOWN.me.costume)")).toBe('Female_Ranger_Scout');
  await expect(page.locator('#townShopBody')).not.toContainText('Skin tone');
});
