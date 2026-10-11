import time, sys
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
with sync_playwright() as p:
    b, pg, logs = launch(p, 844, 390, True)
    pg.goto(URL); time.sleep(3); pg.evaluate("__ST.G.renderEvery=3")
    pg.evaluate("__ST.quickFight(1,'wardens'); __ST.beginFight();"); time.sleep(3)
    box = pg.evaluate("JSON.stringify(document.querySelector('#viewBtn').getBoundingClientRect())")
    import json; r = json.loads(box)
    x, y = r['x'] + r['width'] * 0.75, r['y'] + r['height'] / 2
    print('top element at button:', pg.evaluate(f"document.elementFromPoint({x},{y}).closest('button') ? document.elementFromPoint({x},{y}).closest('button').id : document.elementFromPoint({x},{y}).id"))
    v0 = pg.evaluate("__ST.G.settings.view"); pg.touchscreen.tap(x, y); time.sleep(0.5); v1 = pg.evaluate("__ST.G.settings.view")
    pg.touchscreen.tap(r['x'] + r['width'] * 0.25, y); time.sleep(0.5); v2 = pg.evaluate("__ST.G.settings.view")
    print('view', v0, '->', v1, '->', v2)
    b.close()
