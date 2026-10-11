import time, sys
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
with sync_playwright() as p:
    b, pg, logs = launch(p, 390, 844, True)
    pg.goto(URL); time.sleep(3); pg.evaluate("__ST.G.renderEvery=3; __ST.G.settings.ring=true; __ST.G.player=null")
    pg.evaluate("__ST.quickFight(5,'wardens'); __ST.beginFight();"); time.sleep(5)
    pg.screenshot(path=str(OUT/'t2-up.png'))
    pg.evaluate("const f=__ST.G.player; f.state='grounded'; f.groundStyle='sit'; f.groundPos={...f.pos}; f.touched=true;"); time.sleep(3)
    pg.screenshot(path=str(OUT/'t2-down.png'))
    print('\n'.join(l for l in logs if 'GPU stall' not in l and 'ERR_FAILED' not in l)[-800:])
    b.close()
