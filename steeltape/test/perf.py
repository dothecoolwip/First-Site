import time, sys
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
with sync_playwright() as p:
    b, pg, logs = launch(p, 1280, 720, False)
    pg.goto(URL); time.sleep(3)
    for label, js in [('title', ''), ('fight-fp', "__ST.quickFight(1,'wardens'); __ST.beginFight();"), ('fight-tp', "__ST.setView('tp')")]:
        if js: pg.evaluate(js); time.sleep(1)
        print(label, pg.evaluate("new Promise(r=>{const n=__ST.G.frameN; const t=performance.now(); setTimeout(()=>r(((__ST.G.frameN-n)/((performance.now()-t)/1000)).toFixed(1)+' fps'),3000)})"))
    pg.evaluate("__ST.G.renderEvery=1000")
    print('norender', pg.evaluate("new Promise(r=>{const n=__ST.G.frameN; const t=performance.now(); setTimeout(()=>r(((__ST.G.frameN-n)/((performance.now()-t)/1000)).toFixed(1)+' fps'),3000)})"))
    b.close()
