import time, sys
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
with sync_playwright() as p:
    b, pg, logs = launch(p, 960, 540, False)
    pg.goto(URL); time.sleep(3); pg.evaluate("__ST.G.renderEvery=3; __ST.startTraining()"); time.sleep(3)
    print(pg.evaluate("JSON.stringify({vis: __ST.TR.ring && __ST.TR.ring.visible, pos: __ST.TR.ring && __ST.TR.ring.position, tgt: __ST.TR.target, p: __ST.G.player.pos, phase: __ST.G.phase, lesson: __ST.TR.i, done: __ST.TR.doneT})"))
    b.close()
