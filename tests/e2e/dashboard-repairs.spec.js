const { test, expect } = require('playwright/test');
const path = require('path');

test('rejected dashboard account can sign out and retry a failure', async ({ page }) => {
  await page.addInitScript(() => {
    window.__session = { access_token: 'mock' };
    window.__failSignout = false;
  });
  await page.route('**/supabase.min.js', r => r.fulfill({ contentType:'application/javascript', body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:window.__session}}),onAuthStateChange:()=>{},signOut:async()=>{if(window.__failSignout)return {error:new Error('mock')};window.__session=null;return {error:null}}}})}` }));
  await page.route('**/functions/v1/steeltape-admin', r => r.fulfill({ status:403, contentType:'application/json', body:JSON.stringify({error:'not an admin'}) }));
  await page.goto('file://' + path.resolve(__dirname, '../../pwa/admin.html'));
  await expect(page.locator('#err')).toContainText('isn’t the owner');
  await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
  await page.evaluate(()=>window.__failSignout=true);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page.locator('#err')).toContainText('Please retry');
  await page.evaluate(()=>window.__failSignout=false);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page.locator('#accountActions')).toBeHidden();
  await expect(page.locator('#login')).toBeVisible();
});

test('dashboard labels distinguish non-wins and rolling activity', async ({ page }) => {
  await page.route('**/supabase.min.js', r => r.fulfill({contentType:'application/javascript', body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}}})}`}));
  await page.goto('file://' + path.resolve(__dirname, '../../pwa/admin.html'));
  await expect(page.locator('#players thead')).toContainText('Non-wins');
  expect(await page.locator('#playerFilter option[value=today]').textContent()).toBe('Active in last 24 hours');
  expect(await page.locator('#playerFilter option[value=week]').textContent()).toBe('Active in last 7 days');
});
