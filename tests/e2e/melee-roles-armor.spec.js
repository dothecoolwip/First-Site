const { test, expect } = require('./fixtures');

test('team melee roles are assigned and the home lineup can override them @touch', async ({ game, page }) => {
  await game.noRender();
  await game.run("(quickFight(5, 'wardens'), true)");
  await game.until("G.screen === 'tactics'");
  const roles = await game.run("G.fighters.map(f => ({ team: f.team, player: f.isPlayer, role: f.ai.role }))");
  expect(roles.filter(f => f.team === 0 && !f.player).map(f => f.role).sort()).toEqual(['rook', 'runner', 'runner', 'tank']);
  expect(roles.filter(f => f.team === 1).map(f => f.role).sort()).toEqual(['rook', 'rook', 'runner', 'runner', 'tank']);
  await page.locator('#tacTabs [data-tab="squad"]').click();
  await expect(page.locator('.role-picker').first()).toBeVisible();
  await page.locator('.role-picker').first().getByRole('button', { name: 'Runner', exact: true }).click();
  expect(await game.run("G.fighters.find(f => f.team === 0 && !f.isPlayer).ai.roleManual")).toBe('runner');
});

test('covered armor continues; exposed armor makes one melee fighter kneel without a pause @touch', async ({ game }) => {
  await game.noRender();
  await game.run("(quickFight(5, 'wardens'), true)");
  await game.until("G.screen === 'tactics'");
  const result = await game.run(`(() => {
    G.phase = 'fight';
    const f = G.player;
    f.kit.armL.cond = 0.2;
    failPiece(f, 'armL');
    const covered = { phase: G.phase, state: f.state, failed: f.kit.armL.failed, covered: f.kit.armL.covered };
    f.kit.armL.cond = 0.1;
    failPiece(f, 'armL');
    const exposed = { phase: G.phase, state: f.state, covered: f.kit.armL.covered, knee: f.armorKnee, repairStop: G.repairStop, enemyUp: G.fighters.some(x => x.team === 1 && !x.out && x.state === 'standing') };
    return { covered, exposed };
  })()`);
  expect(result.covered).toMatchObject({ phase: 'fight', state: 'standing', failed: true, covered: true });
  expect(result.exposed).toMatchObject({ phase: 'fight', state: 'kneeling', covered: false, knee: true, enemyUp: true });
  expect(result.exposed.repairStop).toBeFalsy();
});

test('free-for-all uses the same unsafe-armor knee rule', async ({ game }) => {
  await game.noRender();
  await game.run('(startFFA(6, 0), true)');
  const result = await game.run(`(() => {
    G.phase = 'fight';
    const f = G.fighters.find(x => !x.isPlayer);
    f.kit.helmet.cond = 0.08;
    failPiece(f, 'helmet');
    return { ffa: G.match.ffa, state: f.state, phase: G.phase, stop: G.repairStop, winners: G.fighters.filter(x => x !== f && x.state === 'standing').length };
  })()`);
  expect(result).toMatchObject({ ffa: true, state: 'kneeling', phase: 'fight' });
  expect(result.stop).toBeFalsy();
  expect(result.winners).toBeGreaterThan(0);
});

test('main screen credits and fight button fit a phone landscape viewport @touch', async ({ game, page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('.title-credits')).toContainText('Garrett Robson');
  await expect(page.locator('.title-credits')).toContainText('Keston Piche');
  const button = await page.locator('#btnFight').boundingBox();
  expect(button).not.toBeNull();
  expect(button.y + button.height).toBeLessThanOrEqual(390);
});
