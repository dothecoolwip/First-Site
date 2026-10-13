const { test, expect } = require('./fixtures');

test('test tools stay hidden for ordinary players and work only with the verified game grant @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on');
  await expect(page.locator('#townAdmin')).toBeHidden();
  const ordinary = await game.run('(CAREER.level = 3, CAREER.purse = 25, testAdminApply(), [CAREER.level, CAREER.purse])');
  expect(ordinary).toEqual([3, 25]);
  await game.run('(BOS.testAdmin = true, testAdminApply(), testAdminRefresh(), true)');
  await expect(page.locator('#townAdmin')).toBeVisible();
  expect(await game.run('CAREER.level')).toBe(100);
  expect(await game.run('CAREER.purse')).toBeGreaterThanOrEqual(100000000);
  expect(await game.run('CAREER.sp')).toBeGreaterThanOrEqual(99);
  await page.locator('#townAdmin').click();
  await expect(page.locator('#townShopBody')).toContainText('Teleport');
  await page.getByRole('button', { name: '3× speed' }).click();
  expect(await game.run('TOWN.testRunSpeed')).toBe(3);
  const destination = await game.run("TOWN.stalls.find(s => s.V.key === 'smith').V.name");
  await page.locator('#townShopBody .up', { hasText: destination }).getByRole('button', { name: 'Teleport' }).click();
  expect(await game.run("Math.hypot(TOWN.pos.x - TOWN.stalls.find(s => s.V.key === 'smith').ax, TOWN.pos.z - TOWN.stalls.find(s => s.V.key === 'smith').az) < 6")).toBe(true);
  await game.run('(TOWN.stam = 0.1, TOWN.speed = 5.4, true)');
  await game.frames(2);
  expect(await game.run('TOWN.stam')).toBe(1);
  await game.run('(BOS.testAdmin = false, testAdminRefresh(), true)');
  await expect(page.locator('#townAdmin')).toBeHidden();
  expect(await game.run('TOWN.testRunSpeed')).toBe(1);
});

test('editable profile data never grants test powers; verified Auth metadata does', async ({ game }) => {
  await game.ev(async () => {
    location.hash = '#autotest'; // Skip cloud network calls in this isolated auth test.
    const st = window.__ST;
    const chain = { select() { return this; }, eq() { return this; }, limit() { return this; }, async maybeSingle() { return { data: null }; } };
    st.BOS.user = { id: 'test-user', email: 'garrettrobson95@gmail.com', user_metadata: { steel_tape_test_admin: true } };
    st.BOS.sb = { auth: { async getUser() { return { data: { user: { id: 'test-user', app_metadata: {} } } }; } }, from() { return chain; } };
    await st.bosLoadInfo();
  });
  expect(await game.run('BOS.testAdmin')).toBe(false);
  await game.ev(async () => {
    const st = window.__ST;
    st.BOS.sb.auth.getUser = async () => ({ data: { user: { id: 'test-user', app_metadata: { steel_tape_test_admin: true } } } });
    await st.bosLoadInfo();
  });
  expect(await game.run('BOS.testAdmin')).toBe(true);
  expect(await game.run('CAREER.level')).toBe(100);
});

test('verified test admin can use level gates before cloud save finishes @touch', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on');
  await game.ev(() => {
    const st = window.__ST;
    const chain = { select() { return this; }, eq() { return this; }, limit() { return this; }, async maybeSingle() { return { data: null }; } };
    st.CAREER.level = 1;
    st.CAREER.xp = 10;
    st.BOS.user = { id: 'verified-admin', email: 'garrettrobson95@gmail.com' };
    st.BOS.sb = {
      auth: { async getUser() { return { data: { user: { id: 'verified-admin', app_metadata: { steel_tape_test_admin: true } } } }; } },
      rpc() { return new Promise(() => {}); }, // Deliberately leave cloud loading.
      from() { return chain; }
    };
    st.bosLoadInfo();
  });
  await game.until('BOS.testAdmin');
  expect(await game.run('CAREER.level')).toBe(100);
  expect(await game.run('CAREER.xp')).toBe(0);
  expect(await game.run('!CLOUD.ready')).toBe(true);
  await game.run('stationTrial("bailey")');
  await expect(page.locator('#townShopBody')).toContainText('Level met');
  await expect(page.locator('#townShopBody').getByRole('button', { name: 'Fight' })).toBeEnabled();
  await game.run('gateRefused({ key: "bailey", label: "Bailey gate" })');
  await expect(page.locator('#achPop')).toContainText('level met (100)');
  await expect(page.locator('#achPop')).toContainText('Bailey writ');
});

test('playtest recorder saves resolved coordinates and action details for verified admin', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on');
  const result = await game.ev(async () => {
    const st = window.__ST, rows = [];
    st.BOS.user = { id: 'recording-test-user' };
    st.BOS.testAdmin = true;
    st.BOS.sb = { from(table) { return {
      insert(payload) {
        if (table === 'steeltape_playtest_entries') rows.push(...payload);
        return { error: null, select() { return { async single() { return { data: { id: 'session-test' }, error: null }; } }; } };
      },
      update() { return { async eq() { return { error: null }; } }; }
    }; } };
    await st.playtestStart();
    st.TOWN.pos = { x: 12.34567, z: -4.56789 };
    st.TOWN.face = 1.23456;
    st.playtestAction('vendor', { vendor: 'smith' });
    while (st.PLAYTEST.saving) await new Promise(resolve => setTimeout(resolve, 0));
    await st.playtestFlush();
    const answer = { session: st.PLAYTEST.id, vendor: rows.find(r => r.kind === 'vendor'), count: rows.length };
    st.BOS.testAdmin = false;
    return answer;
  });
  expect(result.session).toBe('session-test');
  expect(result.vendor).toMatchObject({ x: 12.346, z: -4.568, facing: 1.235, detail: { vendor: 'smith' } });
  expect(result.count).toBeGreaterThanOrEqual(2);
});

test('test admin can capture a screenshot note in the game panel', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on');
  await game.ev(() => {
    const st = window.__ST;
    window.__savedPlaytestNote = null;
    HTMLCanvasElement.prototype.toBlob = callback => callback(new Blob(['test image'], { type: 'image/jpeg' }));
    st.BOS.user = { id: 'recording-test-user' };
    st.BOS.testAdmin = true;
    st.BOS.sb = {
      from(table) { return {
        insert(payload) {
          if (table === 'steeltape_playtest_notes') window.__savedPlaytestNote = payload;
          return { error: null, select() { return { async single() { return { data: { id: 'session-note-test' }, error: null }; } }; } };
        }
      }; },
      storage: { from() { return { async upload() { return { error: null }; } }; } }
    };
    st.testAdminRefresh();
  });
  await page.locator('#townAdmin').click();
  await page.getByRole('button', { name: 'Take screenshot & note' }).click();
  await expect(page.locator('#townShopHead')).toContainText('Screenshot note');
  await page.locator('#townShopBody textarea').fill('Road floats above the terrain here.');
  await page.getByRole('button', { name: 'Save screenshot & note' }).click();
  await expect.poll(() => page.evaluate(() => window.__savedPlaytestNote?.body)).toBe('Road floats above the terrain here.');
  expect(await page.evaluate(() => window.__savedPlaytestNote?.screenshot_path)).toContain('session-note-test');
});

test('a failed note insert retries without uploading a second screenshot', async ({ game, page }) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on');
  await game.ev(() => {
    const st = window.__ST;
    window.__noteRetry = { uploads: [], inserts: [] };
    HTMLCanvasElement.prototype.toBlob = callback => callback(new Blob(['test image'], { type: 'image/jpeg' }));
    st.BOS.user = { id: 'recording-test-user' };
    st.BOS.testAdmin = true;
    st.BOS.sb = {
      from(table) { return {
        insert(payload) {
          if (table === 'steeltape_playtest_notes') {
            window.__noteRetry.inserts.push(payload);
            return { error: window.__noteRetry.inserts.length === 1 ? { message: 'temporary insert failure' } : null };
          }
          return { error: null, select() { return { async single() { return { data: { id: 'session-note-retry' }, error: null }; } }; } };
        }
      }; },
      storage: { from() { return { async upload(path) { window.__noteRetry.uploads.push(path); return { error: null }; } }; } }
    };
    st.testAdminRefresh();
  });
  await page.locator('#townAdmin').click();
  await page.getByRole('button', { name: 'Take screenshot & note' }).click();
  await page.locator('#townShopBody textarea').fill('The Bailey grass forms a giant wedge.');
  const save = page.getByRole('button', { name: 'Save screenshot & note' });
  await save.click();
  await expect(page.locator('#townShopBody')).toContainText('temporary insert failure');
  await save.click();
  await expect.poll(() => page.evaluate(() => window.__noteRetry.inserts.length)).toBe(2);
  const result = await page.evaluate(() => window.__noteRetry);
  expect(result.uploads).toHaveLength(1);
  expect(result.inserts[0].id).toBe(result.inserts[1].id);
  expect(result.inserts[0].screenshot_path).toBe(result.uploads[0]);
});
