// Controllers: standard pads, Switch pads, raw (Firefox-style) layouts, phantom devices, couch seating, blocked API.
const { test, expect } = require('./fixtures');
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const focused = page => page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.textContent.trim().slice(0, 30)));

test.beforeEach(async ({ game }) => { await game.noRender(); });

test('a standard pad drives the title menu', async ({ game, page }) => {
  const p = await game.addPad();
  await game.press(p, B.DOWN);
  expect(await game.run('IN.mode')).toBe('pad');
  const first = await focused(page);
  expect(first).toBeTruthy();
  await game.press(p, B.UP);
  expect(await focused(page)).not.toBe(first);
  await game.run("(showScreen('modes'), true)");
  await game.press(p, B.B);
  await game.until("G.screen === 'title'");
  // A on Time to Fight walks you into town
  await page.evaluate(() => document.getElementById('btnFight').focus());
  await game.press(p, B.A);
  await game.until("TOWN.on && G.phase === 'town'");
});

test('a phantom device listed first does not steal or jam the controls', async ({ game }) => {
  await game.addPad({ id: 'Virtual HID device', mapping: '', axes: [-1, -1, -1, -1, -1, -1], held: [3] }); // stuck axes and a stuck button
  const real = await game.addPad();
  await game.page.waitForTimeout(2300); // a button still held after two seconds is treated as stuck
  await game.run("(quickFight(5, 'wardens'), beginFight(), true)");
  await game.until("G.phase === 'fight'");
  await game.setAxes(real, [0, 0]); await game.frames(4);
  expect(await game.run('Math.hypot(PIN.raw.x, PIN.raw.y)')).toBeLessThan(0.05);
  await game.setAxes(real, [0, -1]); await game.frames(4);
  expect(await game.run('PIN.raw.y')).toBeGreaterThan(0.8);
  expect(await game.run('PADS.active.length')).toBe(1);
});

test('the pad that wakes up on a button press counts straight away', async ({ game, page }) => {
  const p = await game.addPad({ held: [B.DOWN] }); // browsers reveal a pad on the press that wakes it
  await game.until('PADS.active.length === 1');
  expect(await game.run('PADS.active.length')).toBe(1);
  await game.setButton(p, B.DOWN, 0); await game.frames(2);
  await game.press(p, B.DOWN);
  expect(await focused(page)).toBeTruthy();
});

test('Switch Pro Controller: Nintendo labels, A (right) confirms, B (bottom) goes back', async ({ game, page }) => {
  const p = await game.addPad({ id: 'Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)' });
  await game.press(p, B.DOWN);
  expect(await game.run('NIN.on')).toBe(true);
  expect(await page.evaluate(() => document.body.classList.contains('nin'))).toBe(true);
  await game.run("(showScreen('modes'), true)");
  expect(await page.locator('#modes [data-back]').getAttribute('data-gp')).toBe('B'); // prompt says B, and B is the button that goes back
  await game.press(p, 0); // bottom face button = Nintendo B
  await game.until("G.screen === 'title'");
  // in fights the legend uses Nintendo names for the same positions
  await game.run("(quickFight(5, 'wardens'), beginFight(), true)");
  expect(await page.locator('#legend .gp[data-k="RT"]').textContent()).toBe('ZR');
});

test('Xbox pad in a raw layout on a phone: triggers on buttons 6 and 7 still swing and guard', async ({ game }) => {
  // phones often report the pad without the standard mapping, with extra axes parked at -1
  const p = await game.addPad({ id: 'Xbox Wireless Controller (Vendor: 045e Product: 0b13)', mapping: '', buttons: 17, axes: [0, 0, -1, 0, 0, -1, 0, 0] });
  await game.press(p, B.A);
  await game.run("(quickFight(1, 'wardens'), beginFight(), true)");
  await game.until("G.phase === 'fight'");
  await game.setButton(p, B.LT, 1); await game.frames(4);
  expect(await game.run('PIN.guard')).toBe(true);
  await game.setButton(p, B.LT, 0);
  await game.setButton(p, B.RT, 1); await game.frames(4);
  await game.until("G.player.action && G.player.action.kind === 'swing'");
  await game.setButton(p, B.RT, 0); await game.frames(3);
});

test('a standard Xbox pad: RT swings and LT guards', async ({ game }) => {
  const p = await game.addPad();
  await game.press(p, B.A);
  await game.run("(quickFight(1, 'wardens'), beginFight(), true)");
  await game.until("G.phase === 'fight'");
  await game.setButton(p, B.LT, 0.8); await game.frames(4);
  expect(await game.run('PIN.guard')).toBe(true);
  await game.setButton(p, B.LT, 0);
  await game.setButton(p, B.RT, 0.9); await game.frames(4);
  await game.until("G.player.action && G.player.action.kind === 'swing'");
});

test('generic pad with a hat-switch d-pad navigates menus', async ({ game, page }) => {
  const p = await game.addPad({ id: 'USB Gamepad (Vendor: 0079 Product: 0011)', mapping: '', buttons: 12, axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.28] });
  await game.setAxes(p, [null, null, null, null, null, null, null, null, null, 0.14]); await game.frames(4); // hat down
  await game.setAxes(p, [null, null, null, null, null, null, null, null, null, 1.28]); await game.frames(3);
  expect(await game.run('IN.mode')).toBe('pad');
  expect(await focused(page)).toBeTruthy();
});

test('couch play: seats follow who pressed first; each pad moves its own fighter', async ({ game }) => {
  const a = await game.addPad(), b = await game.addPad();
  await game.frames(3); // let both pads be seen idle first
  await game.press(b, B.A); await game.press(a, B.A); // pad b joined first, so it is player 1
  await game.run("(VS.names = null, startVersus('duel'), true)");
  await game.until("G.phase === 'fight'", 40_000);
  await game.setAxes(b, [1, 0]); await game.frames(4);
  expect(Math.abs(await game.run('VS.vins[0].mx') || 0) + Math.abs(await game.run('VS.vins[0].mz') || 0)).toBeGreaterThan(0.5);
  expect(Math.abs(await game.run('VS.vins[1].mx')) + Math.abs(await game.run('VS.vins[1].mz'))).toBeLessThan(0.05);
  await game.setAxes(b, [0, 0]);
});

test('couch play: Start pauses once and stays paused, from either pad', async ({ game }) => {
  const a = await game.addPad(), b = await game.addPad();
  await game.press(a, B.A); await game.press(b, B.A);
  await game.run("(VS.names = null, startVersus('duel'), true)");
  await game.until("G.phase === 'fight'", 40_000);
  await game.press(a, B.START); await game.frames(6);
  expect(await game.run('G.paused')).toBe(true);
  await game.press(a, B.START); await game.frames(4);
  expect(await game.run('G.paused')).toBe(false);
  await game.press(b, B.START); await game.frames(6);
  expect(await game.run('G.paused')).toBe(true);
});

test('one pad short: player 1 takes the keyboard, the pad plays player 2', async ({ game }) => {
  const a = await game.addPad(); await game.press(a, B.A);
  await game.run("(VS.names = null, startVersus('duel'), true)");
  await game.until("G.phase === 'fight'", 40_000);
  await game.setAxes(a, [-1, 0]); await game.frames(4);
  expect(Math.abs(await game.run('VS.vins[1].mx')) + Math.abs(await game.run('VS.vins[1].mz'))).toBeGreaterThan(0.5);
  await game.setAxes(a, [0, 0]);
});

test('a page that blocks the Gamepad API keeps running', async ({ game, page }) => {
  await page.evaluate(() => { window.__padsThrow = true; });
  await game.frames(10);
  expect(await game.run('PADS.blocked')).toBe(true);
  await game.run("(quickFight(1, 'wardens'), beginFight(), true)");
  await game.frames(10);
});

test('normal pad: RT swings, LT guards, RB grabs; right stick aim is not snapped back', async ({ game }) => {
  const p = await game.addPad();
  await game.press(p, B.A);
  await game.run("(quickFight(1, 'wardens'), beginFight(), true)");
  await game.until("G.phase === 'fight'");
  await game.setButton(p, B.LB, 1); await game.frames(4);
  expect(await game.run('PIN.guard')).toBe(false);
  await game.setButton(p, B.LB, 0); await game.frames(2);
  await game.setAxes(p, [null, null, 0, -1]); await game.frames(8);
  await game.setAxes(p, [null, null, 0, 0]);
  const pitch = await game.run('FP.pitch');
  await game.frames(10);
  expect(await game.run('FP.pitch')).toBeGreaterThan(pitch - 0.05);
  expect(pitch).toBeGreaterThan(0.1);
});

test('EasySMX D10 in Switch mode (Pro Controller id): ZR swings, ZL guards; Xbox letters option keeps A as confirm', async ({ game, page }) => {
  const p = await game.addPad({ id: 'Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)' });
  await game.press(p, B.DOWN);
  expect(await game.run('NIN.on')).toBe(true);
  await page.evaluate(() => document.querySelector('#lettersSeg button[data-l="xbox"]').click()); await game.frames(2); // Settings > Button letters > Xbox
  expect(await game.run('NIN.on')).toBe(false);
  await page.evaluate(() => document.getElementById('btnFight').focus());
  await game.press(p, 0); // bottom button, labelled A on an Xbox-style pad
  await game.until("TOWN.on");
  await game.run("(quickFight(1, 'wardens'), beginFight(), true)");
  await game.until("G.phase === 'fight'");
  await game.setButton(p, B.LT, 1); await game.frames(4);
  expect(await game.run('PIN.guard')).toBe(true);
  await game.setButton(p, B.LT, 0);
  await game.setButton(p, B.RT, 1); await game.frames(4);
  await game.until("G.player.action && G.player.action.kind === 'swing'");
});

test('EasySMX D10 in Xbox mode on Android (shifted buttons, no triggers or right stick)', async ({ game }) => {
  // exactly what the phone's browser reported: standard layout, 16 buttons, X=3 Y=4 LB=8 RB=9, triggers and right stick never arrive
  const p = await game.addPad({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02e0)', buttons: 16 });
  await game.press(p, 0);
  await game.run("(quickFight(1, 'wardens'), beginFight(), true)");
  await game.until("G.phase === 'fight'");
  await game.setButton(p, 8, 1); await game.frames(4); // their LB
  expect(await game.run('PIN.guard')).toBe(true);
  expect(await game.run('G.paused')).toBe(false);
  await game.setButton(p, 8, 0); await game.frames(2);
  const view = await game.run('G.settings.view');
  await game.setButton(p, 9, 1); await game.frames(4); // their RB swings (it used to pause)
  expect(await game.run('G.paused')).toBe(false);
  await game.until("G.player.action && G.player.action.kind === 'swing'");
  await game.setButton(p, 9, 0); await game.frames(4);
  expect(await game.run('G.settings.view')).toBe(view);
  await game.setButton(p, 12, 1); await game.frames(10); await game.setButton(p, 12, 0); // d-pad up aims high
  expect(await game.run('FP.pitch')).toBeGreaterThan(0.05);
});
