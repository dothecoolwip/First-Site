import time, sys, json
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
def clean(logs): return '\n'.join(l for l in logs if 'GPU stall' not in l and 'ERR_FAILED' not in l and 'Failed to load resource' not in l)[-1500:]
def wait_sim(pg, sec, cap=40):
    t = pg.evaluate("__ST.G.simTime"); t0=time.time()
    while pg.evaluate("__ST.G.simTime") < t + sec and time.time()-t0 < cap: time.sleep(0.05)
with sync_playwright() as p:
    b, pg, logs = launch(p, 960, 540, False)
    pg.goto(URL); time.sleep(3)
    pg.evaluate("__ST.quickFight(1,'wardens'); __ST.G.loadout.wset='hist'; __ST.G.loadout.weapon='mace'; __ST.applyLoadout(); __ST.beginFight(); __ST.G.renderEvery=1000; __ST.G.fast=true")
    t0=time.time()
    while pg.evaluate("__ST.G.phase")!='fight' and time.time()-t0<20: time.sleep(0.05)
    pg.evaluate("__ST.G.fast=false")
    reset = """(()=>{const G=__ST.G, p=G.player, o=G.fighters.find(f=>f.team===1); window.__o=o; if(p.clinch){G.clinches.length=0; p.clinch=null; o.clinch=null;}
      p.state='standing'; o.state='standing'; o.touched=false; p.pos={x:0,z:3}; o.pos={x:0.6,z:1.1}; o.vel={x:0,z:0}; p.vel={x:0,z:0}; o.lean={x:0,z:0}; o.leanV={x:0,z:0}; p.lean={x:0,z:0}; p.leanV={x:0,z:0}; p.action=null; p.cd=0; o.action=null; p.gas=1; o.gas=1; o.ai.next=999; o.move={x:0,z:0}; o.brace=false; o.guard=false; o.tripWin=0;})()"""
    freeze = "(()=>{__o.ai.next=999; __o.move={x:0,z:0};})()"
    pg.evaluate(reset); pg.evaluate("__ST.FP.yaw=Math.PI+0.5; __ST.G.player.facing=Math.PI+0.5")
    wait_sim(pg, 0.8)
    print('lock', pg.evaluate("JSON.stringify({lock: __ST.IN.lock && __ST.IN.lock.name, yaw:__ST.FP.yaw.toFixed(2), want: Math.atan2(__o.pos.x-__ST.G.player.pos.x, __o.pos.z-__ST.G.player.pos.z).toFixed(2)})"))
    res=[]
    for seq in [['shove'], ['shove','trip'], ['grab'], ['trip'], ['tackle']]:
        pg.evaluate(reset); wait_sim(pg, 0.3)
        out=[]
        for act in seq:
            d0 = pg.evaluate("Math.hypot(__o.pos.x-__ST.G.player.pos.x, __o.pos.z-__ST.G.player.pos.z).toFixed(2)")
            pg.evaluate(f"__ST.IN.edges.add('{act}')"); 
            for _ in range(8): pg.evaluate(freeze); wait_sim(pg, 0.06)
            out.append([act, d0, pg.evaluate("document.querySelector('#toast').innerText.replace(/\\n/g,' | ')"), pg.evaluate("__o.state"), pg.evaluate("Math.hypot(__o.pos.x-__ST.G.player.pos.x, __o.pos.z-__ST.G.player.pos.z).toFixed(2)")])
        res.append(out)
    for r in res: print(r)
    pg.keyboard.press('v'); wait_sim(pg, 0.2); print('view after V', pg.evaluate("__ST.G.settings.view"))
    pg.keyboard.press('Tab'); wait_sim(pg, 0.2)
    print('errors', pg.evaluate("JSON.stringify(__ST.G.stats.errors.slice(0,3))"))
    print('desk', clean(logs)); b.close()
