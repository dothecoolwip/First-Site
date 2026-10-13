const { test, expect } = require('./fixtures');

test('spoken commentary matches fixed captions exactly; dynamic calls remain text-only @touch', async ({ game, page }) => {
  expect(await game.run('G.settings.spokenComm')).toBe(true);
  await game.run('AU.init()');
  await game.until('!!AU.buf[commClipName("Three to one! That’s the round!")]');
  await game.run(`(window.__commentClips = [], window.__oldAudioPlay = AU.play,
    AU.play = function(name, ...args) { window.__commentClips.push(name); return window.__oldAudioPlay.call(this, name, ...args); },
    COMM.busy = 0, COMM.q.push({ type: 'ratio', who: 'pa', txt: 'Three to one! That’s the round!', pri: 3, raw: 'Three to one! That’s the round!' }), true)`);
  await page.waitForFunction(() => window.__commentClips.includes(window.__ST.commClipName('Three to one! That’s the round!')));
  await expect(page.locator('#comm')).toContainText('Three to one! That’s the round!');

  await game.run(`(COMM_AUDIO.stop(), window.__commentClips = [], COMM.busy = 0,
    COMM.q.push({ type: 'first', who: 'co', txt: 'First body on the floor goes to Red Team!', pri: 3, raw: 'First body on the floor goes to {team}!' }), true)`);
  await expect(page.locator('#comm')).toContainText('First body on the floor goes to Red Team!');
  expect(await game.run('window.__commentClips.filter(name => name.startsWith("comm_line_")).length')).toBe(0);

  await game.run(`(G.settings.spokenComm = false, COMM.busy = 0,
    COMM.q.push({ type: 'head', who: 'co', txt: 'Right on the helmet. Three points.', pri: 3, raw: 'Right on the helmet. Three points.' }), true)`);
  await expect(page.locator('#comm')).toContainText('Right on the helmet. Three points.');
  expect(await game.run('window.__commentClips.filter(name => name.startsWith("comm_line_")).length')).toBe(0);
  await game.run('(AU.play = window.__oldAudioPlay, true)');
});
