import time, sys
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
with sync_playwright() as p:
    for (w,h,touch,tag) in [(844,390,True,'phone'),(1280,720,False,'desk')]:
        b, pg, logs = launch(p, w, h, touch)
        pg.goto(URL); time.sleep(3)
        pg.evaluate("__ST.quickFight(5,'wardens')"); time.sleep(1.5)
        if tag=='desk': pg.screenshot(path=str(OUT/f'q-{tag}-tactics.png'))
        pg.evaluate("__ST.beginFight(); __ST.G.autopilot=true;")
        pg.evaluate("(()=>{const G=__ST.G; const t=G.simTime+6; G.fast=true; const iv=setInterval(()=>{ if(G.simTime>=t){G.fast=false; clearInterval(iv);} },50);})()")
        time.sleep(5); pg.screenshot(path=str(OUT/f'q-{tag}-fp.png'))
        if tag=='desk':
            pg.evaluate("__ST.G.player.spec.helm='greathelm'"); time.sleep(2.5); pg.screenshot(path=str(OUT/f'q-{tag}-gh.png'))
            pg.evaluate("__ST.G.autoflow=true; __ST.G.autoNext=()=>{window.__done=(window.__done||0)+1; if(window.__done<3){__ST.quickFight(5,'rabble'); __ST.G.autoflow=true;}}; __ST.G.fast=true;")
            t0=time.time()
            while time.time()-t0<150 and not pg.evaluate("(window.__done||0)>=3"): time.sleep(3)
            print('matches done', pg.evaluate("window.__done||0"), pg.evaluate("JSON.stringify({rt:__ST.G.stats.roundTimes, falls:__ST.G.stats.falls, err:__ST.G.stats.errors.slice(0,3)})"))
        print(tag, '\n'.join(l for l in logs if 'GPU stall' not in l and 'ERR_FAILED' not in l)[-1500:])
        b.close()
