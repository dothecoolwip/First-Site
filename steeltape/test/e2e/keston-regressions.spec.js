const { test, expect } = require('./fixtures');

for (const side of [0, 1]) {
  test(`a round-two duel red card disqualifies team ${side}, even when ahead on points`, async ({ game }) => {
    await game.noRender();
    await game.run("(quickFight(1, 'wardens'), true)");
    await game.until("G.screen === 'tactics'");
    await game.run('(beginFight(), true)');
    await game.until("G.phase === 'fight'");
    const result = await game.run(`(() => {
      const f = G.fighters.find(x => x.team === ${side});
      G.match.round = 2;
      G.match.pts = ${side === 0 ? '[50, 1]' : '[1, 50]'};
      f.rec.warnings = 1;
      f.rec.yellows = 1;
      penalize(f, 'test foul', 'REG 6.3.3');
      const stopped = { out: f.out, returnAt: f.returnAt, dq: G.match.duelDQ };
      endRound('duel');
      return { ...stopped, winner: G.match.results.at(-1).winner, reason: G.match.results.at(-1).reason, wins: G.match.wins };
    })()`);
    expect(result).toMatchObject({ out: true, returnAt: -1, dq: side, winner: 1 - side, reason: 'dq' });
    expect(result.wins[1 - side]).toBeGreaterThanOrEqual(2);
  });
}

test('failed helmet stays off, falls only once, and cannot bypass emergency repair @touch', async ({ game }) => {
  await game.noRender();
  await game.run("(quickFight(1, 'wardens'), true)");
  await game.until("G.screen === 'tactics'");
  const result = await game.run(`(() => {
    G.phase = 'fight';
    failPiece(G.player, 'helmet');
    const first = { failed: G.player.kit.helmet.failed, returnAt: G.player.returnAt, props: G.props.length,
      fallenMeshes: G.props[0].children.length };
    failPiece(G.player, 'helmet');
    const propsAfter = G.props.length;
    openRepair(30, () => { window.__repairReturned = true; }, { emergency: true, failuresOnly: true, onFail: () => { window.__repairFailed = true; } });
    closeRepair();
    const blocked = REP.active;
    REP.timer = 0;
    closeRepair();
    return { first, propsAfter, blocked, failed: !!window.__repairFailed, returned: !!window.__repairReturned };
  })()`);
  expect(result.first).toMatchObject({ failed: true, returnAt: -1, props: 1, fallenMeshes: 1 });
  expect(result.propsAfter).toBe(1);
  expect(result).toMatchObject({ blocked: true, failed: true, returned: false });
});

test('third armour failure ends a duel; unresolved repair times out instead of restarting the fight', async ({ game }) => {
  await game.noRender();
  await game.run("(quickFight(1, 'wardens'), true)");
  await game.until("G.screen === 'tactics'");
  const strike = await game.run(`(() => {
    G.phase = 'fight';
    G.player.armorStrikes = 2;
    failPiece(G.player, 'armL');
    return { strikes: G.player.armorStrikes, out: G.player.out, dq: G.match.duelDQ };
  })()`);
  expect(strike).toMatchObject({ strikes: 3, out: true, dq: 0 });

  await game.run("(quickFight(1, 'wardens'), true)");
  await game.until("G.screen === 'tactics'");
  await game.fast();
  await game.run(`(() => {
    G.player.kit.helmet.failed = true;
    G.match.round = 1;
    afterRound();
    return true;
  })()`);
  await game.until("G.screen === 'sheetScr'");
  await game.run("(document.querySelector('#btnSheetNext').click(), true)");
  await game.until("G.screen === 'repair'");
  const result = await game.run(`(() => {
    const corner = { ...G.player.pos };
    REP.timer = 0;
    closeRepair();
    return { corner, phase: G.phase, wins: G.match.wins, repairDone: G.match.repairDone, screen: G.screen };
  })()`);
  expect(Math.abs(result.corner.x)).toBeGreaterThan(1);
  expect(result).toMatchObject({ phase: 'over', repairDone: true });
  expect(result.wins[1]).toBeGreaterThanOrEqual(2);
  expect(result.screen).not.toBe('repair');
});

test('XP cost and opponent difficulty accelerate after level 70', async ({ game }) => {
  const curve = await game.run('([xpNeed(69), xpNeed(70), xpNeed(80), xpNeed(90), xpNeed(100)])');
  expect(curve[2]).toBeGreaterThan(curve[1] * 2);
  expect(curve[3]).toBeGreaterThan(curve[2] * 2);
  expect(curve[4]).toBeGreaterThan(curve[3] * 2);
  const difficulty = await game.run(`(() => {
    const foe = { team: 1 };
    const profile = { react: 1, guard: 0.2, aggr: 1 };
    CAREER.level = 70; const at70 = tierProf(profile, foe);
    CAREER.level = 90; const at90 = tierProf(profile, foe);
    return { at70, at90 };
  })()`);
  expect(difficulty.at90.react).toBeLessThan(difficulty.at70.react);
  expect(difficulty.at90.guard).toBeGreaterThan(difficulty.at70.guard);
  expect(difficulty.at90.aggr).toBeGreaterThan(difficulty.at70.aggr);
});
