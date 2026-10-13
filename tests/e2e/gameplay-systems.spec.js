const { test, expect } = require('./fixtures');

test('world collision, movement, steering and loose props work together @touch', async ({ game }) => {
  test.setTimeout(120000);
  expect(await game.run("['SAT','YUKA','CANNON','RAPIER','BVH'].every(k => !!({SAT,YUKA,CANNON,RAPIER,BVH})[k])")).toBe(true);
  await game.noRender();
  await game.run('(enterTown(), true)');
  await game.until('TOWN.on');
  await game.until('GAMEPLAY.rapier && GAMEPLAY.rapier.ready', 60000);
  expect(await game.run('GAMEPLAY.terrainBVH && !!TOWN.terrain.geometry.boundsTree')).toBe(true);
  expect(await game.run('GAMEPLAY.shapes.length >= 8')).toBe(true);
  expect(await game.run('gameplayShapeBlocked(-20, 58, 0.42)')).toBe(true);
  const push = await game.run('(() => { const p={x:-20.4,z:58}; gameplayShapePush(p,0.42); return !gameplayShapeBlocked(p.x,p.z,0.4); })()');
  expect(push).toBe(true);
  const move = await game.run('(() => { const p={x:-22,z:58}; gameplayMove(p,4,0); return p.x; })()');
  expect(move).toBeLessThan(-20);
  expect(await game.run('Number.isFinite(gameplayGroundAt(0,0))')).toBe(true);
  expect(await game.run('GAMEPLAY.cannon.props.length')).toBe(3);
  const before = await game.run('GAMEPLAY.cannon.props[0].body.position.x');
  await game.run("(() => { const b=GAMEPLAY.cannon.props[0].body; b.applyImpulse(new CANNON.Vec3(3,0,0), b.position); gameplayCannonTick(1/30); return true; })()");
  expect(await game.run('GAMEPLAY.cannon.props[0].body.position.x')).toBeGreaterThan(before);
  expect(await game.run('(() => { const n={x:0,z:0,spd:1.4}; const d=gameplayFolkDirection(n,5,0,1/60,1,0); return d.length===2 && d.every(Number.isFinite) && !!n.gameVehicle; })()')).toBe(true);
});
