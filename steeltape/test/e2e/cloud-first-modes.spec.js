const {test,expect}=require('./fixtures');

test('home screen shows Adult and Kids only while accepting an old saved women category',async({game,page})=>{
 await page.addInitScript(()=>{
   localStorage.setItem('st-category',JSON.stringify('women'));
   localStorage.setItem('st-career',JSON.stringify({onboard:'done',purse:897,stats:{matches:1}}));
 });
 await page.reload();
 await game.until("G.screen === 'title'");
 const choices=page.locator('#catSeg button');
 await expect(choices).toHaveCount(2);
 await expect(choices.nth(0)).toHaveText('Adult');
 await expect(choices.nth(1)).toHaveText('Kids');
 await expect(choices.nth(0)).toHaveAttribute('aria-pressed','true');
 expect(await game.run("G.category")).toBe('women');
 await choices.nth(1).click();
 expect(await game.run("G.category")).toBe('youth');
 await expect(choices.nth(1)).toHaveAttribute('aria-pressed','true');
 await choices.nth(0).click();
 expect(await game.run("G.category")).toBe('men');
 await expect(choices.nth(0)).toHaveAttribute('aria-pressed','true');
});

test('offline returning player can reach the game without BuhurtOS sign-in',async({game,page})=>{
 await page.addInitScript(()=>{
   window.__onboard=true;
   Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});
   localStorage.setItem('st-career',JSON.stringify({onboard:'done',purse:1042,stats:{matches:14}}));
 });
 await page.reload();
 await game.until("G.screen === 'title'");
 await expect(page.locator('#bosEmail')).toHaveCount(0);
 expect(await game.run("CAREER.purse === 1042 && CAREER.stats.matches === 14")).toBe(true);
 await game.noRender();
 await page.locator('#btnFight').click();
 await game.until('TOWN.on',60000);
 expect(await game.run('TOWN.on && G.hub')).toBe(true);
});
