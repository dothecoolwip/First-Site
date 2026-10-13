// Shared fixture: `game` is a loaded page with helpers. Every test fails if the page threw,
// or if the game loop caught an error (frame() stores those in G.stats.errors instead of throwing).
const path = require('path');
const fs = require('fs');
const base = require('playwright/test');

const ROOT = path.join(__dirname, '..');
const THREE_JS = fs.readFileSync(path.join(ROOT, 'three.min.js'));
const URL = process.env.STEELTAPE_TEST_URL || 'file://' + path.join(ROOT, 'index.html');
const FONT_DIR = '/home/claude/fonts/gf';

async function route(page) {
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.endsWith('three.min.js')) return r.fulfill({ body: THREE_JS, contentType: 'application/javascript' });
    if (u.includes('fonts.googleapis.com')) return r.fulfill({ body: '', contentType: 'text/css' });
    if (u.startsWith('http')) return r.abort();
    return r.continue();
  });
}

class Game {
  constructor(page) { this.page = page; this.errors = []; }
  ev(fn, arg) { return this.page.evaluate(fn, arg); }
  // run a snippet with the game's exports in scope: game.run('quickFight(1)')
  run(code) { return this.page.evaluate(`(() => { with (window.__ST) { return (${code}); } })()`); }
  async until(code, timeout = 30_000) {
    await this.page.waitForFunction(`(() => { try { with (window.__ST) { return !!(${code}); } } catch (e) { return false; } })()`, null, { timeout, polling: 100 });
  }
  // fast-forward: the loop runs 90 sim steps per frame and renders rarely
  fast(on = true) { return this.run(`(G.fast = ${on}, G.settings.voice = false, true)`); }
  loopErrors() { return this.run('G.stats.errors.slice()'); }
  screen() { return this.run('G.screen'); }
  phase() { return this.run('G.phase'); }
  // skip WebGL draws (slow in headless) so the loop runs at full rate; the sim and DOM still update every frame
  noRender() { return this.run('(G.renderEvery = 1e9, true)'); }
  frames(n = 4) { return this.page.evaluate(n => new Promise(r => { let i = 0; const f = () => (++i >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n); }
  // controllers: addPad({ id, mapping, buttons: 17, axes: 4 }) -> slot index
  addPad(o = {}) {
    return this.page.evaluate(o => {
      const n = o.buttons || 17, gp = { id: o.id || 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: window.__pads.length, connected: true, mapping: o.mapping == null ? 'standard' : o.mapping, timestamp: performance.now(),
        axes: (o.axes || [0, 0, 0, 0]).slice(), buttons: Array.from({ length: n }, (_, i) => ({ pressed: !!(o.held || []).includes(i), value: (o.held || []).includes(i) ? 1 : 0, touched: false })) };
      window.__pads.push(gp); return gp.index;
    }, o);
  }
  setButton(pad, i, v) { return this.page.evaluate(([p, i, v]) => { const b = window.__pads[p].buttons[i]; b.value = v; b.pressed = v > 0.5; window.__pads[p].timestamp = performance.now(); }, [pad, i, v]); }
  setAxes(pad, axes) { return this.page.evaluate(([p, a]) => { a.forEach((v, i) => { if (v != null) window.__pads[p].axes[i] = v; }); }, [pad, axes]); }
  async press(pad, i, hold = 4) { await this.setButton(pad, i, 1); await this.frames(hold); await this.setButton(pad, i, 0); await this.frames(3); }
}

const test = base.test.extend({
  game: async ({ page }, use) => {
    const g = new Game(page);
    page.on('pageerror', e => g.errors.push(String(e && e.stack || e)));
    page.on('console', m => { if (m.type() === 'error' && !/GPU stall|WebGL|404|net::/.test(m.text())) g.errors.push('[console] ' + m.text()); });
    await route(page);
    await page.addInitScript(() => {
      window.__steeltapeTest = true; // file:// only, never bypasses hosted sign-in
      try { localStorage.clear(); if (!window.__onboard) localStorage.setItem('st-career', JSON.stringify({ onboard: 'done' })); } catch (e) {}
      // virtual controllers: tests put pads in window.__pads; getGamepads hands them to the game like a browser would
      window.__pads = [];
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => { if (window.__padsThrow) throw new DOMException('blocked', 'SecurityError'); return window.__pads; } });
    });
    await page.goto(URL);
    await page.waitForFunction(() => window.__ST && window.__ST.G && window.__ST.G.screen === 'title', null, { timeout: 60_000 });
    await use(g);
    const loop = await page.evaluate(() => window.__ST ? window.__ST.G.stats.errors.slice() : ['no __ST']).catch(() => []);
    base.expect([...g.errors, ...loop], 'page and game-loop errors').toEqual([]);
  },
});

module.exports = { test, expect: base.expect, route };
