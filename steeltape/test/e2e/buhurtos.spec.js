// Sign in with BuhurtOS (a fake Supabase client stands in for BuhurtOS here): name, tick and real record carry over.
const { test, expect } = require('./fixtures');

function installFakeSupabase() {
  const rows = {
    profiles: { display_name: 'Garrett' },
    fighter_accounts: { fighter_id: 'f-1' },
    fighter_directory: { display_name: 'Garrett R.', team_name: 'Reavers' },
    fighter_career_stats: { matches: 31, wins: 22, losses: 9, golds: 3, podiums: 7, tournament_victories: 2 },
  };
  let listener = null, session = null;
  const q = t => { const o = { select: () => o, eq: () => o, limit: () => o, maybeSingle: async () => ({ data: rows[t] || null, error: null }) }; return o; };
  window.supabase = { createClient: () => ({
    from: q,
    auth: {
      onAuthStateChange: fn => { listener = fn; return { data: { subscription: { unsubscribe() {} } } }; },
      getSession: async () => ({ data: { session } }),
      signInWithPassword: async ({ email, password }) => { if (password !== 'steel') return { data: {}, error: { message: 'Invalid login credentials' } }; session = { user: { id: 'u-1', email } }; listener && listener('SIGNED_IN', session); return { data: { user: session.user }, error: null }; },
      signOut: async () => { session = null; listener && listener('SIGNED_OUT', null); return { error: null }; },
      signInWithOtp: async () => ({ error: null }), verifyOtp: async () => ({ error: { message: 'bad' } }), signInWithOAuth: async () => ({ error: null }),
    },
  }) };
}

test('sign in with BuhurtOS: wrong password explained, right one names your fighter and shows your record', async ({ game, page }) => {
  await page.addInitScript(installFakeSupabase); await page.reload();
  await page.waitForFunction(() => window.__ST && __ST.G.screen === 'title', null, { timeout: 60_000 });
  await game.noRender();
  await page.evaluate(() => __ST.openOnlineHub());
  await page.locator('#bosBox .bosbtn').click();
  await page.fill('#bosEmail', 'garrett@example.com'); await page.fill('#bosPass', 'wrong');
  await page.locator('#msgPanel .pfoot .btn.primary').click();
  await expect(page.locator('#bosMsg')).toContainText('Wrong email or password');
  await page.fill('#bosPass', 'steel');
  await page.locator('#msgPanel .pfoot .btn.primary').click();
  await expect(page.locator('#bosBox')).toContainText('Garrett R.', { timeout: 10_000 });
  await expect(page.locator('#bosBox')).toContainText('31 matches, 22 wins, 3 gold');
  expect(await game.run('CAREER.name')).toBe('Garrett R.');
  expect(await game.run('myProfile().bos.w')).toBe(22);
  // your own profile shows the BuhurtOS record
  await page.evaluate(() => __ST.openProfile({ presence: { name: __ST.CAREER.name, pr: __ST.myProfile() } }));
  await expect(page.locator('#msgPanel')).toContainText('BuhurtOS: Garrett R.');
  await expect(page.locator('#msgPanel')).toContainText('Reavers · 31 real matches, 22 wins');
  await page.evaluate(() => __ST.openOnlineHub());
  await page.locator('#bosBox button', { hasText: 'Sign out' }).click();
  await expect(page.locator('#bosBox .bosbtn')).toBeVisible();
});
