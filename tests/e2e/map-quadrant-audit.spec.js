const { test, expect } = require('./fixtures');
const fs = require('fs');
const path = require('path');

// Repeatable north-up aerial survey of the complete playable ellipse.
const COLS = 8, ROWS = 8;
const X0 = -620, X1 = 620, Z0 = -640, Z1 = 640;
const DX = (X1 - X0) / COLS, DZ = (Z1 - Z0) / ROWS;
const SIZE = Number(process.env.MAP_AUDIT_SIZE || 1200);
const FOCUS = process.env.MAP_AUDIT_FOCUS?.split(',').map(s => s.trim().toUpperCase());
const LIMIT = Number(process.env.MAP_AUDIT_LIMIT || 64);
const OUT = path.resolve(__dirname, '..', '..', '..', '..', 'asset-research', 'map-quadrants', '2026-10-12');

test('capture every map quadrant from above @touch', async ({ game, page }) => {
  test.setTimeout(1_200_000);
  fs.mkdirSync(path.join(OUT, 'photos'), { recursive: true });
  await game.noRender();
  await game.run('(enterTown(), true)');
  await game.until('TOWN.on && TOWN.cells');
  await page.setViewportSize({ width: SIZE, height: SIZE });
  await page.waitForTimeout(1800);
  await game.run(`(G.renderEvery = 1e9, W3.renderer.setPixelRatio(1), W3.renderer.setSize(${SIZE}, ${SIZE}), W3.camera.aspect = 1, W3.camera.fov = 55, W3.camera.near = 0.1, W3.camera.far = 900, W3.camera.updateProjectionMatrix(), W3.scene.fog = null, true)`);
  const entries = [];
  let count = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const id = `R${String(row + 1).padStart(2, '0')}C${String(col + 1).padStart(2, '0')}`;
      const xMin = X0 + col * DX, xMax = xMin + DX;
      const zMin = Z0 + row * DZ, zMax = zMin + DZ;
      const x = (xMin + xMax) / 2, z = (zMin + zMax) / 2;
      const entry = { id, row: row + 1, col: col + 1, xMin, xMax, zMin, zMax, centerX: x, centerZ: z, photo: `photos/${id}.png` };
      entries.push(entry);
      if (FOCUS && !FOCUS.includes(id)) continue;
      if (count >= LIMIT) continue;
      const details = await game.ev(({ x, z }) => {
        const { W3, TOWN, gy, realmCull } = window.__ST;
        const cam = W3.camera;
        const h = gy(x, z);
        cam.up.set(0, 0, -1);
        cam.position.set(x, h + 170, z);
        cam.lookAt(x, h, z);
        cam.updateMatrixWorld(true);
        realmCull();
        // The normal update loop tracks the player, so render the survey frame immediately.
        W3.renderer.render(W3.scene, cam);
        return { cameraY: cam.position.y, terrainY: h, visibleCells: TOWN.cells.filter(c => c.g.visible).length, image: W3.renderer.domElement.toDataURL('image/png') };
      }, { x, z });
      fs.writeFileSync(path.join(OUT, entry.photo), Buffer.from(details.image.split(',')[1], 'base64'));
      console.log(`MAP ${id} x=${x} z=${z} cells=${details.visibleCells}`);
      count++;
    }
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ bounds: { xMin: X0, xMax: X1, zMin: Z0, zMax: Z1 }, rows: ROWS, cols: COLS, photoSize: SIZE, cameraAltitude: 170, fov: 55, northUp: true, entries }, null, 2));
  expect(await game.loopErrors()).toEqual([]);
});
