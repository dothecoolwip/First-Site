const { test, expect } = require('./fixtures');
const fs = require('fs');
const path = require('path');

// A repeatable walking-height survey of every settled district and the long roads.
const VIEWS = [
  ['fair-gate', 0, 66, 0], ['fair-main', 0, 38, 0], ['fair-dome', 0, 24, 0], ['fair-stand', 14.6, 9, Math.PI / 2],
  ['fair-forge', -40, 22, -1.0], ['fair-food', 39, 15, 1.0],
  ['fair-home', -46, 50, -0.7], ['fair-pond', -56, 77, Math.PI],
  ['fair-camp', 44, 58, 0.8], ['fair-training', -58, -35, Math.PI], ['fair-crates', -58, -43, 0],
  ['fair-graveyard', 44, -48, Math.PI], ['north-road', 0, -91, Math.PI],
  ['bailey-gate', 0, -140, Math.PI], ['bailey-yard', 0, -172, Math.PI],
  ['bailey-west', -75, -205, -1.2], ['bailey-east', 65, -205, 1.2],
  ['ward', 0, -235, Math.PI], ['hall', 0, -257, Math.PI],
  ['village-green', -180, 132, Math.PI], ['village-homes', -197, 113, -0.7],
  ['village-farm', -232, 189, Math.PI], ['village-fields', -132, 193, 0.8],
  ['village-pond', -230, 101, Math.PI], ['village-lists', -176, 134, Math.PI],
  ['woods-entry', -196, -78, -1], ['woods-arena', -214, -74, Math.PI],
  ['woods-quarry', -260, -40, -1], ['woods-hunter', -250, -136, Math.PI],
  ['lake-entry', 145, 45, 1], ['lake-shore', 172, 75, 1.4],
  ['lake-boathouse', 156, 12, 1.3], ['lake-boats', 184, 13, 1.2],
  ['lake-boat-north', 191, 65, 1.2], ['lake-arena', 148, 103, Math.PI],
  ['country-south', -30, 160, 0], ['country-ford', -57, 202, 0],
  ['country-ridge', -309, -17, -0.7], ['country-east', 304, 145, 1],
  ['country-north', 27, -369, 0], ['country-west', -333, 48, -1],
];

test('capture walking-height world survey @touch', async ({ game, page }) => {
  test.setTimeout(400_000);
  const out = path.resolve(__dirname, '..', '..', '..', '..', 'asset-research', 'world-audit', process.env.WORLD_AUDIT_OUTPUT || '');
  fs.mkdirSync(out, { recursive: true });
  await game.noRender();
  await game.run('(enterTown(), true)');
  await game.until('TOWN.on');
  await game.run('(G.renderEvery = 1, true)');
  await page.evaluate(() => { document.querySelector('#townHud').hidden = true; });
  const focus = process.env.WORLD_AUDIT_FOCUS?.split(',');
  const near = !!process.env.WORLD_AUDIT_NEAR;
  for (const [name, x, z, yaw] of VIEWS.filter(([name]) => !focus || focus.includes(name))) {
    await game.run(`(TOWN.pos = {x:${x},z:${z}}, TOWN.yaw = ${yaw}, TOWN.pitch = ${near ? 0.36 : 0.47}, TOWN.dist = ${near ? 8 : 20}, TOWN.cam = null, updateTownCamera(1), realmCull(), W3.renderer.render(W3.scene, W3.camera), true)`);
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
    if (process.env.WORLD_AUDIT_DEBUG) {
      const props = await game.run("(() => { const found = []; TOWN.root.updateMatrixWorld(true); TOWN.root.traverse(o => { if (!o.userData.assetKey) return; const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld), q = p.clone().project(W3.camera); if (q.z > -1 && q.z < 1 && Math.abs(q.x) < 0.7 && Math.abs(q.y) < 0.7) found.push({key:o.userData.assetKey,x:p.x.toFixed(1),z:p.z.toFixed(1),sx:q.x.toFixed(2),sy:q.y.toFixed(2),depth:p.distanceTo(W3.camera.position).toFixed(1)}); }); return found.sort((a,b) => Math.hypot(a.sx,a.sy)-Math.hypot(b.sx,b.sy)).slice(0,20); })()");
      console.log(name, JSON.stringify(props));
    }
  }
  expect(await game.loopErrors()).toEqual([]);
});
