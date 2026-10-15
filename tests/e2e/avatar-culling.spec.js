const { test, expect } = require('./fixtures');

test('player remains in the moving scene across distant cities and town re-entry @touch', async ({ game }) => {
  await game.run('enterTown()');
  await game.until('TOWN.on && TOWN.me && TOWN.me.root.parent === TOWN.root');

  for (const [x, z] of [[0, 31], [-510, -250], [530, 140], [-90, 620], [0, -690]]) {
    await game.ev(([x, z]) => {
      const s = window.__ST;
      s.TOWN.pos = { x, z };
      s.TOWN.cam = null;
    }, [x, z]);
    await game.until(`Math.hypot(W3.camera.position.x - ${x}, W3.camera.position.z - ${z}) < 30`);
    const avatar = await game.run(`(() => {
      const J = TOWN.me, p = J.root.getWorldPosition(new THREE.Vector3());
      let meshes = 0;
      J.root.traverse(o => { if (o.isMesh && o.visible) meshes++; });
      return { parent: J.root.parent === TOWN.root, visible: J.root.visible && TOWN.root.visible,
        meshes, x: p.x, z: p.z };
    })()`);
    expect(avatar.parent).toBe(true);
    expect(avatar.visible).toBe(true);
    expect(avatar.meshes).toBeGreaterThan(0);
    expect(Math.hypot(avatar.x - x, avatar.z - z)).toBeLessThan(1);
  }

  await game.run('leaveTown()');
  await game.run('enterTown()');
  await game.until('TOWN.on && TOWN.me && TOWN.me.root.parent === TOWN.root');
});
