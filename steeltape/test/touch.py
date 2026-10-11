import time, sys
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
with sync_playwright() as p:
    for (w,h,tag) in [(390,844,'port'),(844,390,'land')]:
        b, pg, logs = launch(p, w, h, True)
        pg.goto(URL); time.sleep(3); pg.evaluate("__ST.G.renderEvery=3")
        pg.screenshot(path=str(OUT/f't-{tag}-title.png'))
        pg.evaluate("__ST.quickFight(5,'wardens'); __ST.beginFight();"); time.sleep(6)
        pg.screenshot(path=str(OUT/f't-{tag}-fight.png'))
        print(tag, '\n'.join(l for l in logs if 'GPU stall' not in l and 'ERR_FAILED' not in l)[-800:])
        b.close()
