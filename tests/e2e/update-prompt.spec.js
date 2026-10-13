const path = require('path');
const fs = require('fs');
const { test, expect } = require('playwright/test');

const script = path.join(__dirname, '..', '..', 'src', 'update_prompt.js');

test('new build asks for update, Later defers only that build @touch', async ({ page }) => {
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><title>Steel & Tape</title>');
  await page.evaluate(() => {
    window.BUILD_VER = 'steel-tape-v1';
    window.availableBuild = 'steel-tape-v1';
    window.fetch = async () => ({ ok: true, json: async () => ({ version: window.availableBuild }) });
  });
  await page.addScriptTag({ path: script });
  await page.waitForTimeout(1400);
  const toast = page.locator('#gameUpdateToast');
  await expect(toast).toBeHidden();

  await page.evaluate(() => { window.availableBuild = 'steel-tape-v2'; window.dispatchEvent(new Event('focus')); });
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('New update available — please update now.');
  await expect(toast.getByRole('button', { name: 'Update now' })).toBeVisible();
  const bounds = await toast.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  await toast.getByRole('button', { name: 'Later' }).click();
  await expect(toast).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(toast).toBeHidden();

  await page.evaluate(() => { window.availableBuild = 'steel-tape-v3'; window.dispatchEvent(new Event('focus')); });
  await expect(toast).toBeVisible();
});

test('Update now reloads the page @touch', async ({ page }) => {
  await page.setContent('<title>Steel & Tape</title>');
  await page.evaluate(() => {
    window.BUILD_VER = 'steel-tape-v1';
    window.fetch = async () => ({ ok: true, json: async () => ({ version: 'steel-tape-v2' }) });
  });
  await page.addScriptTag({ path: script });
  const button = page.locator('#gameUpdateToast .updateNow');
  await expect(button).toBeVisible();
  await button.click();
  await expect(page).toHaveURL(/update=steel-tape-v2/);
  await expect(page.locator('#gameUpdateToast')).toHaveCount(0);
});

test('hosted page, version endpoint, and worker agree on the build', () => {
  const hosted = path.join(__dirname, '..', '..', 'pwa-hosted');
  const version = JSON.parse(fs.readFileSync(path.join(hosted, 'version.json'), 'utf8')).version;
  const html = fs.readFileSync(path.join(hosted, 'index.html'), 'utf8');
  const worker = fs.readFileSync(path.join(hosted, 'sw.js'), 'utf8');
  expect(html).toContain(`window.BUILD_VER="${version}";`);
  expect(worker).toContain(`const VERSION = '${version}';`);
});
