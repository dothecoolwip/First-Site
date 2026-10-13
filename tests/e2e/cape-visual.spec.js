const { test, expect } = require('./fixtures');
const fs = require('fs');
const path = require('path');

test('inspect cape silhouettes on the town player @touch', async ({ game, page }) => {
  test.setTimeout(240000);
  const out = path.resolve(__dirname, '..', '..', '..', '..', 'asset-research', 'cape-audit');
  fs.mkdirSync(out, { recursive: true });
  await game.noRender();
  await game.run('(enterTown(), true)');
  await game.until('TOWN.on');
  await page.evaluate(() => { document.querySelector('#townHud').hidden = true; });
  const focus = process.env.CAPE_AUDIT_FOCUS;
  for (const kind of ['club', 'royal', 'shadow', 'shroud', 'ranger', 'courtier'].filter(k => !focus || focus === k)) {
    await game.run(`(lookState().cape='${kind}', townDressMe(), TOWN.pos={x:0,z:31}, TOWN.face=Math.PI, TOWN.yaw=0, TOWN.pitch=0.22, TOWN.dist=3.2, TOWN.cam=null, G.renderEvery=1, true)`);
    await page.waitForTimeout(300);
    await page.locator('#gl').screenshot({ path: path.join(out, `${kind}.png`) });
    await game.noRender();
  }
  if (!focus) {
    await game.run("(lookState().cape='royal', lookState().outfit='Male_Ranger|ranger', townDressMe(), TOWN.yaw=-0.55, TOWN.cam=null, G.renderEvery=1, true)");
    await page.waitForTimeout(300);
    await page.locator('#gl').screenshot({ path: path.join(out, 'royal-ranger-side.png') });
  }
  expect(await game.loopErrors()).toEqual([]);
});
