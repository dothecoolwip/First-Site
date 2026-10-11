import sys, time, json, pathlib
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).parent
THREE = (HERE / 'three.min.js').read_bytes()
URL = 'file://' + str(HERE / 'index.html')
mode = sys.argv[1] if len(sys.argv) > 1 else 'auto'
OUT = pathlib.Path('/tmp/claude-0/-home-claude/1234ae9d-de46-57db-8558-bff5ce6e09b2/scratchpad/shots'); OUT.mkdir(parents=True, exist_ok=True)

FD = pathlib.Path('/home/claude/fonts/gf')
FONT_CSS = '''@font-face{font-family:"Big Shoulders Display";font-weight:100 900;src:url(https://fonts.local/bsd.ttf)}
@font-face{font-family:"Barlow Semi Condensed";font-weight:400;src:url(https://fonts.local/b400.ttf)}
@font-face{font-family:"Barlow Semi Condensed";font-weight:500;src:url(https://fonts.local/b500.ttf)}
@font-face{font-family:"Barlow Semi Condensed";font-weight:600;src:url(https://fonts.local/b600.ttf)}
@font-face{font-family:"Barlow Semi Condensed";font-weight:700;src:url(https://fonts.local/b700.ttf)}
@font-face{font-family:"Permanent Marker";src:url(https://fonts.local/pm.ttf)}'''
FONT_FILES = {'bsd.ttf': 'ofl/bigshouldersdisplay/BigShouldersDisplay[wght].ttf', 'b400.ttf': 'ofl/barlowsemicondensed/BarlowSemiCondensed-Regular.ttf', 'b500.ttf': 'ofl/barlowsemicondensed/BarlowSemiCondensed-Medium.ttf', 'b600.ttf': 'ofl/barlowsemicondensed/BarlowSemiCondensed-SemiBold.ttf', 'b700.ttf': 'ofl/barlowsemicondensed/BarlowSemiCondensed-Bold.ttf', 'pm.ttf': 'apache/permanentmarker/PermanentMarker-Regular.ttf'}
def route(r):
    u = r.request.url
    if 'three' in u and u.endswith('three.min.js'):
        return r.fulfill(body=THREE, content_type='application/javascript')
    if 'fonts.googleapis.com/css2' in u:
        return r.fulfill(body=FONT_CSS, content_type='text/css', headers={'Access-Control-Allow-Origin': '*'})
    if u.startswith('https://fonts.local/'):
        f = FONT_FILES.get(u.rsplit('/', 1)[1])
        if f: return r.fulfill(body=(FD / f).read_bytes(), content_type='font/ttf', headers={'Access-Control-Allow-Origin': '*'})
    if u.startswith('http'):
        return r.abort()
    return r.continue_()

def launch(p, w, h, touch=False):
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch, device_scale_factor=1)
    pg = ctx.new_page(); pg.route('**/*', route)
    logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    return b, pg, logs

with sync_playwright() as p:
    if mode == 'auto':
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 4
        b, pg, logs = launch(p, 960, 540)
        pg.add_init_script(f'window.__autoN={n}')
        pg.goto(URL + '#autotest')
        t0 = time.time()
        while time.time() - t0 < float(sys.argv[3]) if len(sys.argv) > 3 else 400:
            time.sleep(3)
            if pg.evaluate('!!window.__autoDone'): break
        st = pg.evaluate('window.__ST ? JSON.stringify({phase:__ST.G.phase, round: __ST.G.match && __ST.G.match.round, clock: __ST.G.match && __ST.G.match.clock, up:[__ST.G.fighters.filter(f=>f.team===0&&f.state==="standing").length, __ST.G.fighters.filter(f=>f.team===1&&f.state==="standing").length], errors: __ST.G.stats.errors.slice(0,3)}) : "no ST"')
        pg.screenshot(path=str(OUT / 'auto.png'))
        print('\n'.join(l for l in logs if 'GPU stall' not in l)[-6000:])
        print('STATE', st, 'elapsed', round(time.time() - t0))
        b.close()
    elif mode == 'shots':
        for (w, h, touch, tag) in [(1280, 720, False, 'desk'), (844, 390, True, 'phone-land'), (390, 844, True, 'phone-port')]:
            b, pg, logs = launch(p, w, h, touch)
            pg.goto(URL); time.sleep(4)
            pg.screenshot(path=str(OUT / f'{tag}-title.png'))
            pg.evaluate("__ST.quickFight(5,'wardens')"); time.sleep(1.2)
            pg.screenshot(path=str(OUT / f'{tag}-tactics.png'))
            pg.evaluate("__ST.beginFight()"); time.sleep(7)
            pg.screenshot(path=str(OUT / f'{tag}-fight.png'))
            if tag == 'desk':
                pg.evaluate("__ST.G.autopilot=true; __ST.G.timeScale=3"); time.sleep(10)
                pg.screenshot(path=str(OUT / f'{tag}-fight2.png'))
                pg.evaluate("__ST.G.autopilot=false; __ST.G.timeScale=1; __ST.openRepair(45, ()=>{})"); time.sleep(1)
                pg.screenshot(path=str(OUT / f'{tag}-repair.png'))
            print(tag, '\n'.join(l for l in logs if 'GPU stall' not in l)[-2500:])
            b.close()
    elif mode == 'action':
        w, h = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1280, 720)
        b, pg, logs = launch(p, w, h, w < h or h < 500)
        pg.goto(URL); time.sleep(3)
        pg.evaluate("__ST.quickFight(5,'rabble'); __ST.beginFight(); __ST.G.autopilot=true;")
        for i, secs in enumerate([4, 3, 4, 6]):
            pg.evaluate(f"(()=>{{const G=__ST.G; const t=G.simTime+{secs}; G.fast=true; const iv=setInterval(()=>{{ if(G.simTime>=t){{G.fast=false; clearInterval(iv);}} }}, 50);}})()")
            time.sleep(4)
            pg.screenshot(path=str(OUT / f'action{i}.png'))
            print(i, pg.evaluate("JSON.stringify({t:__ST.G.simTime.toFixed(1), phase:__ST.G.phase, up:[0,1].map(t=>__ST.G.fighters.filter(f=>f.team===t&&f.state==='standing').length)})"))
        print('\n'.join(l for l in logs if 'GPU stall' not in l and 'ERR_FAILED' not in l)[-2000:])
        b.close()
    elif mode == 'flow':
        b, pg, logs = launch(p, 1000, 600)
        pg.goto(URL); time.sleep(3); pg.evaluate('__ST.G.renderEvery=12')
        pg.click('#btnRumble'); time.sleep(1.5)
        pg.screenshot(path=str(OUT / 'flow-tactics.png'))
        pg.click('#btnReady'); pg.evaluate('__ST.G.autopilot=true; __ST.G.fast=true')
        seen = set(); t0 = time.time(); repaired = 0
        while time.time() - t0 < 300:
            time.sleep(1.5)
            scr = pg.evaluate('__ST.G.screen + "|" + __ST.G.phase')
            print("SCR", scr, round(time.time()-t0), flush=True)
            if scr.startswith('sheetScr'):
                if 'sheet' not in seen: pg.screenshot(path=str(OUT / 'flow-sheet.png')); seen.add('sheet')
                pg.click('#btnSheetNext')
            elif scr.startswith('repair'):
                pg.evaluate('__ST.G.fast=false')
                rows = pg.query_selector_all('.kitrow'); rows[1].click(); time.sleep(0.2)
                pg.query_selector_all('.tapechip')[0 if repaired == 0 else 3].click(); time.sleep(0.6)
                bb = pg.query_selector('#bench').bounding_box()
                X = lambda f: bb['x'] + bb['width'] * f; Y = lambda f: bb['y'] + bb['height'] * f
                pg.mouse.click(X(0.5), Y(0.5)); time.sleep(0.3)
                pg.mouse.move(X(0.33), Y(0.25)); pg.mouse.down()
                xs = [0.34 + i * 0.03 for i in range(11)]
                for i, xx in enumerate(xs):
                    pg.mouse.move(X(xx), Y(0.8 if i % 2 == 0 else 0.2), steps=4)
                pg.mouse.up(); time.sleep(0.3)
                if repaired == 0: pg.screenshot(path=str(OUT / 'flow-repair-wrap.png'))
                pg.mouse.move(X(0.3), Y(0.51)); pg.mouse.down(); pg.mouse.move(X(0.7), Y(0.51), steps=30); pg.mouse.move(X(0.3), Y(0.48), steps=30); pg.mouse.up(); time.sleep(0.4)
                print('BENCH:', pg.inner_text('#benchMsg'))
                if repaired == 0: pg.screenshot(path=str(OUT / 'flow-repair-done.png'))
                repaired += 1
                pg.click('#btnRepairDone')
            elif scr.startswith('tactics'):
                pg.click('#btnReady'); pg.evaluate('__ST.G.autopilot=true; __ST.G.fast=true')
            elif scr.startswith('msgScr'):
                title = pg.inner_text('#msgPanel h2'); print('MSG:', title)
                pg.screenshot(path=str(OUT / f'flow-msg-{title.replace(" ","_")}.png'), full_page=False)
                if title in ('Champions', 'Runners-up', 'Out in the semi'): break
                pg.evaluate('__ST.G.fast=false'); pg.query_selector('#msgPanel .btn.primary').click(); time.sleep(0.5)
            elif scr.startswith('pause'):
                pg.click('#btnResume')
        print('ERR', pg.evaluate('JSON.stringify(__ST.G.stats.errors.slice(0,3))'))
        print('\n'.join(l for l in logs if 'GPU stall' not in l and 'ERR_FAILED' not in l)[-2500:])
        b.close()
    elif mode == 'eval':
        b, pg, logs = launch(p, 1280, 720)
        pg.goto(URL); time.sleep(3)
        for expr in sys.argv[2:]:
            if expr.startswith('sleep:'): time.sleep(float(expr[6:])); continue
            if expr.startswith('shot:'): pg.screenshot(path=str(OUT / expr[5:])); continue
            print('>', expr[:80], '=>', pg.evaluate(expr))
        print('\n'.join(l for l in logs if 'GPU stall' not in l)[-3000:])
        b.close()
