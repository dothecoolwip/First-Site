const { test, expect } = require('./fixtures');

test('town shows one figure per account and never shows another session as yourself @touch', async ({ game }) => {
  await game.run('enterTown()');
  await game.until('TOWN.on && TOWN.me');

  await game.run(`(() => {
    BOS.user = { id: 'self-account' };
    const peer = (id, uid, started) => ({ peer: id, kind: 'viewer', presence: {
      name: 'Same Name', bu: uid, pr: { on: started },
      tw: { x: 6 + started, z: 35, f: 0, l: {} }
    } });
    LOBBY.rawPeers = [
      peer('self-other-tab', 'self-account', 1),
      peer('remote-old-tab', 'remote-account', 1),
      peer('remote-new-tab', 'remote-account', 2),
      peer('other-same-name', 'different-account', 1)
    ];
    LOBBY.peers = [];
    updateTown(0.05);
  })()`);
  expect(await game.run('LOBBY.peers.map(p => p.peer).sort()')).toEqual(['other-same-name', 'remote-new-tab']);
  expect(await game.run('Object.keys(WORLD.others).sort()')).toEqual(['other-same-name', 'remote-new-tab']);
  expect(await game.run('TOWN.stalls.filter(s => s.player).length')).toBe(2);

  await game.run(`(BOS.user = { id: 'remote-account' }, updateTown(0.05), true)`);
  expect(await game.run('LOBBY.peers.map(p => p.peer).sort()')).toEqual(['other-same-name', 'self-other-tab']);
  expect(await game.run('Object.keys(WORLD.others).sort()')).toEqual(['other-same-name', 'self-other-tab']);
  expect(await game.run('TOWN.stalls.filter(s => s.player).length')).toBe(2);

  await game.run(`(LOBBY.rawPeers = [], updateTown(0.05), true)`);
  expect(await game.run('Object.keys(WORLD.others)')).toEqual([]);
  expect(await game.run('TOWN.stalls.filter(s => s.player).length')).toBe(0);
});
