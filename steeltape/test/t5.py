import time, sys
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
def clean(logs): return '\n'.join(l for l in logs if 'GPU stall' not in l and 'ERR_FAILED' not in l and 'Failed to load resource' not in l)[-2000:]
with sync_playwright() as p:
    b, pg, logs = launch(p, 1100, 620, False)
    pg.goto(URL); time.sleep(3)
    pg.screenshot(path=str(OUT/'v6-title.png'))
    print('icons', pg.evaluate("(()=>{const out=[]; for(const k of ['x_pan','x_hockey','x_broom','x_ember','x_storm','x_glacier','x_crystal','x_wrench','x_stop','x_chicken']){try{__ST.weaponIcon(k)}catch(e){out.push(k+': '+e.message)}} return JSON.stringify(out)})()"))
    pg.evaluate("__ST.openCareer()"); time.sleep(0.8); pg.screenshot(path=str(OUT/'v6-career.png'), full_page=False)
    pg.evaluate("__ST.openLadder()"); time.sleep(0.5); pg.screenshot(path=str(OUT/'v6-ladder.png'))
    pg.evaluate("__ST.openModes()"); time.sleep(0.5); pg.screenshot(path=str(OUT/'v6-modes.png'))
    pg.evaluate("__ST.quickFight(5,'wardens'); __ST.G.loadout.wset='special'; __ST.G.loadout.weapon='x_ember'; __ST.applyLoadout(); __ST.renderKitPicker(); document.querySelector('#wsetSeg').scrollIntoView();"); time.sleep(1.2)
    pg.screenshot(path=str(OUT/'v6-special.png'))
    pg.evaluate("__ST.G.renderEvery=3; __ST.startTraining()"); time.sleep(6)
    pg.screenshot(path=str(OUT/'v6-train.png'))
    for i in [3,5,9]:
        pg.evaluate(f"__ST.setLesson({i})"); time.sleep(2.5)
    pg.screenshot(path=str(OUT/'v6-train-lock.png'))
    print('train', pg.evaluate("JSON.stringify({phase:__ST.G.phase, lesson:__ST.TR.i, err:__ST.G.stats.errors.slice(0,3)})"))
    pg.evaluate("__ST.quickFight(12,'rabble'); __ST.beginFight();"); time.sleep(6)
    pg.screenshot(path=str(OUT/'v6-massacre.png'))
    print('massacre', pg.evaluate("JSON.stringify({n:__ST.G.fighters.length, names:new Set(__ST.G.fighters.map(f=>f.name)).size, err:__ST.G.stats.errors.slice(0,3)})"))
    pg.evaluate("__ST.startLadder(2)"); time.sleep(1.5); pg.screenshot(path=str(OUT/'v6-ladder-tac.png'))
    print('ladder', pg.evaluate("JSON.stringify({opp:__ST.G.fighters.filter(f=>f.team===1).map(f=>[f.name,!!f.prof,f.stabMul]), strict:__ST.G.strict, pw:__ST.G.player.weapon.key, err:__ST.G.stats.errors.slice(0,3)})"))
    print(clean(logs)); b.close()
