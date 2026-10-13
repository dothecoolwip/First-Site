const {test,expect}=require('playwright/test');
const fs=require('fs'),path=require('path');
const url=process.env.STEELTAPE_TEST_URL||'file:///'+path.resolve(__dirname,'../index.html').replaceAll('\\','/');
async function start(page,stage='create',error=false){
 await page.route('**/*',r=>{const u=r.request().url();if(u.endsWith('three.min.js'))return r.fulfill({body:fs.readFileSync(path.resolve(__dirname,'../three.min.js')),contentType:'application/javascript'});if(u.startsWith('http'))return r.abort();return r.continue();});
 await page.addInitScript(({stage})=>{
 window.__steeltapeTest=true;window.__onboard=true; const renderGuard=setInterval(()=>{if(window.__ST?.G){window.__ST.G.renderEvery=1e9;clearInterval(renderGuard);}},10);
 if(!sessionStorage.getItem('qa-seeded')){localStorage.clear();sessionStorage.setItem('qa-seeded','1');localStorage.setItem('st-career',JSON.stringify({onboard:stage,teamPicked:stage==='done',name:'Preserved fighter',level:9,purse:1234,club:{bos:'saved-team',name:'My saved club'},look:{hair:'long'},bag:{iron:8}}));}
 const user={id:'oauth-qa-user',email:'fighter@example.test'};let cb;
 const login=()=>{const session={user,access_token:'test-token',refresh_token:'test-refresh'};sessionStorage.setItem('buhurt-game-buhurtos',JSON.stringify(session));cb?.('SIGNED_IN',session);return{data:{user,session},error:null};};
 const q={select(){return this;},eq(){return this;},limit(){return this;},maybeSingle:async()=>({data:null,error:null})};
 window.supabase={createClient:(_u,_k,options)=>{
 window.__authOptions=options.auth;
 return {from:()=>q,rpc:async(name)=>({data:name==='steeltape_cloud_read'?null:{ok:true,revision:1},error:null}),auth:{
 onAuthStateChange:f=>{cb=f;return{};},getUser:async()=>({data:{user},error:null}),getSession:async()=>({data:{session:JSON.parse(sessionStorage.getItem('buhurt-game-buhurtos')||'null')},error:null}),
 setSession:async()=>{sessionStorage.setItem('qa-callbacks',String(Number(sessionStorage.getItem('qa-callbacks')||0)+1));return login();},
 signInWithOAuth:async({provider})=>{sessionStorage.setItem('qa-provider',provider);location.hash='access_token=fake&refresh_token=fake';location.reload();return{error:null};},
 signInWithPassword:async()=>login(),signInWithOtp:async()=>({error:null}),verifyOtp:async()=>login(),signOut:async()=>({error:null})}};}};
 },{stage});
 await page.goto(url+(error?'#error=access_denied&error_description=Google%20sign-in%20cancelled':''));
 await page.waitForFunction(()=>window.__ST?.G,null,{timeout:60000});
 await page.evaluate(()=>window.__ST.G.renderEvery=1e9);
}
test('mocked Google return resumes team then fighter across phone rotation and refresh @touch',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 await expect(page.locator('#bosGoogle')).toBeVisible();await page.setViewportSize({width:390,height:844});
 await page.locator('#bosGoogle').click();await expect(page.locator('#creatorTitle')).toHaveText('Your team',{timeout:60000});await expect(page.locator('#startup')).toBeHidden();
 await page.getByRole('button',{name:'Carry on',exact:true}).click();await expect(page.locator('#creatorTitle')).toHaveText('Make your fighter');
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:info.outputPath('creator-landscape.png')});
 expect(await page.evaluate(()=>sessionStorage.getItem('qa-callbacks'))).toBe('1');expect(new URL(page.url()).hash).toBe('');
 await page.reload();await expect(page.locator('#creatorTitle')).toHaveText('Make your fighter',{timeout:60000});
 expect(await page.evaluate(()=>sessionStorage.getItem('qa-callbacks'))).toBe('1');expect(errors).toEqual([]);
});
test('mocked existing Google return enters town preserving progress appearance inventory and team @touch',async({page})=>{
 await start(page,'done');await page.locator('#bosGoogle').click();await page.waitForFunction(()=>window.__ST?.TOWN.on&&window.__ST?.TOWN.me,null,{timeout:60000});
 const saved=await page.evaluate(()=>{const c=__ST.CAREER;return{purse:c.purse,level:c.level,team:c.club.bos,name:c.club.name,iron:c.bag.iron,hair:c.look.hair,stage:c.onboard};});
 expect(saved).toEqual({purse:1234,level:9,team:'saved-team',name:'My saved club',iron:8,hair:'long',stage:'done'});
 await expect(page.locator('#startup')).toBeHidden();expect(await page.evaluate(()=>sessionStorage.getItem('qa-callbacks'))).toBe('1');
});
test('cancelled callback has recovery; email-code sign-in still resumes creator @touch',async({page},info)=>{
 await start(page,'create',true);await expect(page.locator('#msgPanel')).toContainText('Google sign-in cancelled');await expect(page.locator('#startup')).toBeHidden();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:info.outputPath('recovery-portrait.png')});
 await page.getByRole('button',{name:'Back to sign-in',exact:true}).click();await page.locator('#bosEmail').fill('fighter@example.test');await page.locator('#bosCode').click();await page.locator('#bosOtp').fill('123456');await page.locator('#msgPanel .pfoot .primary').click();
 await expect(page.locator('#creatorTitle')).toHaveText('Your team',{timeout:60000});
});




