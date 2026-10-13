const { test, expect } = require('./fixtures');

test('human combat profiles survive serialization and apply equal benefits @touch', async ({ game }) => {
  await game.noRender();
  const result = await game.run(`(() => {
    CAREER.skills = {'steel.heavy': 3, 'iron.rooted': 2}; CAREER.upgrades.harness = 10; CAREER.upgrades.boots = 7;
    quickFight(1); G.paused = true;
    const a = G.player, b = G.fighters.find(f => f.team !== a.team);
    const lo = myLoadout(); applyLo(a, lo, 'men'); applyLo(b, JSON.parse(JSON.stringify(lo)), 'men');
    a.isPlayer = true; b.isPlayer = false; b.netUid = 'guest';
    recalcBody(a); recalcBody(b);
    return [a.spdF, b.spdF, a.stabF, b.stabF, perk(a,'steel.heavy'), perk(b,'steel.heavy'), a.up.harness, b.up.harness];
  })()`);
  expect(result[0]).toBeCloseTo(result[1], 8);
  expect(result[2]).toBeCloseTo(result[3], 8);
  expect(result.slice(4)).toEqual([3, 3, 6.5, 6.5]);
});

test('invalid, duplicate, and expired remote inputs are neutralized @touch', async ({ game }) => {
  await game.noRender();
  expect(await game.run(`(() => {
    const base = {mx: 9,mz: 9,sw: 0,cancel: 0,e: {trip:0,shove:0,grab:0,tackle:0},arc:'auto',gd:0};
    const valid = validatedVin(base);
    return [Math.hypot(valid.mx,valid.mz), validatedVin({...base,mx:NaN}) === null, validatedVin({...base,e:{...base.e,trip:100}},base) === null];
  })()`)).toEqual([1, true, true]);
  expect(await game.run(`(() => {
    quickFight(1); G.paused = true; NET.on = true; NET.role = 'host'; NET.room = {presence:()=>{}};
    ONL.vins = {guest:{mx:1,mz:0,sp:true,gd:1,br:true,sh:true,sw:0,cancel:0,e:{trip:0,shove:0,grab:0,tackle:0},arc:'auto'}};
    ONL.remote = {}; netTick(0.01); const v = ONL.vins.guest;
    NET.on = false; NET.room = null;
    return [v.mx,v.mz,v.gd,v.br,v.sh];
  })()`)).toEqual([0,0,0,false,false]);
});

test('AI observations exclude hidden stamina and expire behind the fighter @touch', async ({ game }) => {
  await game.noRender();
  const r = await game.run(`(() => {
    quickFight(1); G.paused = true; const f = G.fighters.find(x=>!x.isPlayer), e = G.player;
    f.pos={x:0,z:0}; f.facing=0; e.pos={x:0,z:2}; e.gas=0.01;
    aiObserveThreats(f,0.02); const gas1=f.ai.observations.get(e).gas;
    e.gas=0.99; aiObserveThreats(f,0); const gas2=f.ai.observations.get(e).gas;
    e.pos={x:0,z:-2}; aiObserveThreats(f,0.2); const remembers=f.ai.observations.has(e);
    aiObserveThreats(f,1.01);
    return [gas1,gas2,remembers,f.ai.observations.has(e),aiCanSee(f,e)];
  })()`);
  expect(r[0]).toBe(r[1]); expect(r.slice(2)).toEqual([true,false,false]);
});

test('map directory respects discovery and produces valid descriptions @touch', async ({ game, page }) => {
  await game.noRender(); await page.locator('#btnFight').click(); await game.until('TOWN.on');
  expect(await game.run(`(() => {
    CAREER.found={}; const S={hiddenTunnel:'test',V:{},mine:false};
    const hidden=mapStallVisible(S); CAREER.found['tunnel:test']=1;
    return [hidden,mapStallVisible(S)];
  })()`)).toEqual([false,true]);
  await game.run('(openTownMap(),true)');
  await expect(page.locator('.places-directory')).not.toContainText('undefined');
  await page.getByRole('searchbox', {name:'Search places & services'}).fill('no-such-place');
  await expect(page.locator('.places-directory')).toContainText('No matching places');
});

test('competitive pause stays live and coop requires every human @touch', async ({ game }) => {
  await game.noRender();
  expect(await game.run(`(() => {
    quickFight(1); NET.on=true; NET.role='host'; NET.room={presence:()=>{}};
    G.match.netSpec={H:[{uid:ONL.me,t:0},{uid:'guest',t:1}]};
    togglePause(true); const competitive=G.paused;
    G.match.netSpec.H[1].t=0; ONL.remote={}; ONL.vins={}; netTick(0);
    const one=G.paused; ONL.remote.guest={pause:true,at:performance.now()}; netTick(0); const both=G.paused;
    NET.on=false; NET.room=null; G.paused=true;
    return [competitive,one,both];
  })()`)).toEqual([false,false,true]);
});
