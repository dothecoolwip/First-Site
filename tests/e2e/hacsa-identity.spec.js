const { test, expect } = require('./fixtures');

test('HACSA scope removes old identities and independent players keep their progress @touch', async ({ game }) => {
  await game.noRender();
  const result = await game.run(`(() => {
    CAREER.level=9; CAREER.purse=1234; CAREER.club.bos='old-test'; CAREER.club.name='Old Test Team';
    const rejected=rosterAccept({teams:[{slug:'old-test',name:'Old Test Team'}],fighters:[]});
    rosterAccept({version:2,scope:'hacsa',teams:[{slug:'reavers',name:'Red Deer Reavers',colors:[]}],fighters:[{id:'real',name:'Eligible Fighter',team:'reavers',g:'m'},{id:'bad',name:'Test Fighter',team:'old-test'}]});
    return {rejected,ids:ROSTER.fighters.map(f=>f.id),bos:CAREER.club.bos,level:CAREER.level,purse:CAREER.purse};
  })()`);
  expect(result).toEqual({ rejected:false,ids:['real'],bos:'old-test',level:9,purse:1234 });
  expect(await game.run("(CAREER.club.bos='removed-cloud-team',CAREER.club.name='Old Test Team',applyProfile(),[CAREER.club.bos,CAREER.club.name,CAREER.level,CAREER.purse])")).toEqual(['removed-cloud-team','Old Test Team',9,1234]);
});

test('verified Creator glow survives outfit changes and clears on sign-out @touch', async ({ game, page }, info) => {
  test.setTimeout(300000);
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.me && TOWN.me.costume');
  await game.ev(async () => {
    location.hash='#autotest';
    const s=window.__ST, chain={select(){return this;},eq(){return this;},limit(){return this;},async maybeSingle(){return {data:null};}};
    s.BOS.user={id:'owner',email:'garrettrobson95@gmail.com',user_metadata:{role:'Creator'}};
    s.BOS.sb={from(){return chain;},auth:{async getUser(){return {data:{user:{id:'owner',email:'other@example.com',email_confirmed_at:'2026-01-01'}}};},async getSession(){return {data:{session:null}};}}};
    await s.bosLoadInfo();
  });
  expect(await game.run('!!BOS.creator')).toBe(false);
  await game.ev(async () => {
    const s=window.__ST;
    s.BOS.sb.auth.getUser=async()=>({data:{user:{id:'owner',email:'garrettrobson95@gmail.com',email_confirmed_at:'2026-01-01'}}});
    await s.bosLoadInfo();
  });
  expect(await game.run('TOWN.me.banner?.userData.label')).toBe('Creator');
  expect(await game.run('BOS.testAdmin')).toBe(false);
  await game.run('(townDressMe(), true)');
  expect(await game.run('TOWN.me.banner?.userData.label')).toBe('Creator');
  if (process.env.CREATOR_VISUAL) {
    await game.run('(TOWN.dist=5,TOWN.pitch=0.12,TOWN.cam=null,G.renderEvery=1,true)');
    await game.frames(3);
    await page.screenshot({path:info.outputPath('creator-town.png')});
  }
  await game.noRender();
  await game.run('(quickFight(1),true)');
  expect(await game.run('G.player.model.banner?.userData.label')).toBe('Creator');
  if (process.env.CREATOR_VISUAL) {
    await game.run('(G.renderEvery=1,true)');
    await game.frames(3);
    await page.screenshot({path:info.outputPath('creator-combat.png')});
    await game.noRender();
  }
  await game.run('(BOS.user=null,creatorReset(),true)');
  expect(await game.run('!!TOWN.me?.banner')).toBe(false);
  expect(await game.run('!!G.player.model.banner')).toBe(false);
  expect(await game.run('myProfile().creatorProof')).toBe(null);
});

test('remote Creator label requires verification and is removed when peer drops proof @touch', async ({ game, page }, info) => {
  await game.noRender();
  await page.locator('#btnFight').click();
  await game.until('TOWN.on && TOWN.me && TOWN.me.costume');
  await page.route('**/functions/v1/steeltape-identity',r=>{
    const d=r.request().postDataJSON();
    return r.fulfill({json:d.proof==='signed-proof' && d.subject==='remote-peer' ? {role:'Creator',exp:Date.now()+60000} : {role:null}});
  });
  await game.run(`(LOBBY.peers=[{peer:'remote-peer',presence:{name:'Garrett Robson',pr:{role:'Creator'},tw:{x:TOWN.pos.x+2,z:TOWN.pos.z,l:{}}}}],true)`);
  await game.until("WORLD.others['remote-peer']");
  expect(await game.run("!!WORLD.others['remote-peer'].J.banner")).toBe(false);
  await game.run("(LOBBY.peers[0].presence.pr.creatorProof='signed-proof',creatorRefreshCharacters(),true)");
  await game.until("WORLD.others['remote-peer'].J.banner?.userData.label === 'Creator'");
  if (process.env.CREATOR_VISUAL) {
    await game.run('(G.renderEvery=1,true)');
    await game.frames(3);
    await page.screenshot({path:info.outputPath('creator-remote-town.png')});
    await game.noRender();
  }
  await game.noRender();
  await game.run("(LOBBY.peers[0].presence.pr.creatorProof=null,creatorRefreshCharacters(),true)");
  expect(await game.run("!!WORLD.others['remote-peer'].J.banner")).toBe(false);
  await game.run(`(LOBBY.peers=[],quickFight(1),ONL.peers=[{peer:'remote-peer',presence:{uid:'remote-user',lo:{creatorProof:'signed-proof'}}}],G.fighters[1].netUid='remote-user',creatorRefreshCharacters(),true)`);
  await game.until("G.fighters[1].model.banner?.userData.label === 'Creator'");
  if (process.env.CREATOR_VISUAL) {
    await game.run('(G.renderEvery=1,true)');
    await game.frames(3);
    await page.screenshot({path:info.outputPath('creator-remote-combat.png')});
    await game.noRender();
  }
  await game.run("(ONL.peers[0].peer='impersonator',creatorRefreshCharacters(),true)");
  expect(await game.run('!!G.fighters[1].model.banner')).toBe(false);
  await game.run('(ONL.peers=[],true)');
});
