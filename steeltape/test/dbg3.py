import time, sys
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
with sync_playwright() as p:
    b, pg, logs = launch(p, 1280, 720, False)
    pg.goto(URL); time.sleep(3)
    pg.evaluate("__ST.quickFight(5,'wardens'); __ST.G.loadout.wset='fantasy'; __ST.G.loadout.weapon='f_claymore'; __ST.applyLoadout(); __ST.renderKitPicker(); document.querySelector('#wsetSeg').scrollIntoView(); document.querySelector('#weapCards').scrollLeft=500"); time.sleep(1.5)
    pg.screenshot(path=str(OUT/'v5-fantasy.png'), clip={'x':240,'y':0,'width':800,'height':260})
    pg.evaluate("__ST.G.loadout.wset='hist'; __ST.G.loadout.weapon='polearm'; __ST.applyLoadout(); __ST.renderKitPicker(); document.querySelector('#wsetSeg').scrollIntoView();"); time.sleep(0.8)
    pg.screenshot(path=str(OUT/'v5-hist.png'), clip={'x':240,'y':0,'width':800,'height':260})
    b.close()
