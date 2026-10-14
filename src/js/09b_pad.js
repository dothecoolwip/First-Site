// ---------- controller: menus you can drive with a pad (and arrow keys), button glyphs, rumble ----------
const PAD = { navT: 0, navKey: '', cursor: { x: 0.5, y: 0.5 }, legendT: 0 };

function onInputMode(m) {
  document.body.classList.toggle('pad', m === 'pad');
  updateLegend();
  if (m === 'pad' && G.screen) { PAD.navKey = ''; PAD.navT = 0; focusFirst(); }
}
function activeLayer() { return $('#steeltapeCloudOverlay') || (G.photo ? $('#photo') : G.screen ? $('#' + G.screen) : typeof TOWN !== 'undefined' && TOWN.spec ? $('#townSpec') : null); }
function navItems(root) {
  return [...root.querySelectorAll('button, input, select, textarea, summary, a[href]')].filter(el => {
    if (el.disabled || el.closest('[hidden]')) return false;
    if (root.id === 'title' && !el.closest('nav[aria-label="Main menu"]')) return false;
    const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  });
}
function focusEl(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { } el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
function focusFirst() {
  const root = activeLayer(); if (!root) return;
  const items = navItems(root); if (!items.length) return;
  if (items.includes(document.activeElement)) return;
  const pref = ['.kcard[aria-pressed="true"]', '.rung.next', '.mode', '.pfoot .btn.primary', '.pbody .btn.primary', '.menu .btn.primary', '.kitrow'].map(q => root.querySelector(q)).find(e => e && items.includes(e));
  focusEl(pref || items.find(e => !e.matches('.back')) || items[0]);
}
// spatial navigation: the nearest control in the pushed direction, favouring the same row or column
function navMove(dx, dy) {
  const root = activeLayer(); if (!root) return;
  const items = navItems(root); if (!items.length) return;
  const cur = document.activeElement;
  if (!items.includes(cur)) { focusFirst(); return; }
  if (cur.tagName === 'SELECT' && dx) { cur.selectedIndex = clamp(cur.selectedIndex + dx, 0, cur.options.length - 1); cur.dispatchEvent(new Event('change', { bubbles: true })); return; }
  if (cur.type === 'range' && dx) { const st = +cur.step || 0.1; cur.value = String(clamp(+cur.value + dx * st, +cur.min, +cur.max)); cur.dispatchEvent(new Event('input')); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bs = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const vx = cx - ax, vy = cy - ay, along = vx * dx + vy * dy; if (along <= 2) continue;
    const perp = Math.abs(vx * dy - vy * dx);
    const overlap = dx ? Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top) : Math.min(a.right, r.right) - Math.max(a.left, r.left);
    const s = along + perp * (overlap > 0 ? 0.4 : 2.6);
    if (s < bs) { bs = s; best = el; }
  }
  if (best) { focusEl(best); AU.tone(1800, 0.025, 0.02, 'square'); }
}
function navBack() {
  const root = activeLayer(); if (!root) return;
  if (root.id === 'steeltapeCloudOverlay') return;
  if (G.photo) { closePhoto(); return; }
  if (root && root.id === 'townSpec') { stopSpectating(); return; }
  if (G.screen === 'pause') { togglePause(false); return; }
  if (G.screen === 'townShop' && typeof TOWN !== 'undefined' && TOWN.vendor) { closeVendor(); return; }
  const b = root.querySelector('[data-back], [data-leave]'); if (b && b.getBoundingClientRect().width) { b.click(); return; }
}
function navStart() {
  const layer = activeLayer(); if (layer && layer.id === 'steeltapeCloudOverlay') { focusFirst(); return; }
  if (G.photo) { closePhoto(); return; }
  if (G.screen === 'tactics') return $('#btnReady').click();
  if (G.screen === 'repair') return $('#btnRepairDone').click();
  if (G.screen === 'pause') return togglePause(false);
  const root = activeLayer(); const p = root && root.querySelector('.pfoot .btn.primary'); if (p) p.click();
}
function navTab(dir) {
  const root = activeLayer(); const bar = root && root.querySelector('.tabs'); if (!bar || !bar.getBoundingClientRect().width) return;
  const tabs = [...bar.querySelectorAll('[data-tab]')].filter(b => !b.hidden); if (tabs.length < 2) return;
  let i = tabs.findIndex(b => b.getAttribute('aria-pressed') === 'true'); i = (i + dir + tabs.length) % tabs.length;
  tabs[i].click(); setTimeout(() => { const pane = root.querySelector('.tabpane:not([hidden])') || root.querySelector('.pbody'); const it = pane && navItems(pane); focusEl(it && (it.find(e => e.getAttribute('aria-pressed') === 'true' && e.matches('.kcard')) || it[0])); }, 0);
}
function navActivate() { const el = document.activeElement; if (el && el !== document.body && activeLayer() && activeLayer().contains(el)) { if (el.tagName === 'INPUT' && el.type !== 'checkbox') return; el.click(); } else focusFirst(); }

// called every frame from readInput when a menu is up
function padMenu(gp, b, pressed, dt) {
  // A held direction can reveal the pad before the menu has finished laying out.
  // Retry focus on the next frame without disturbing a valid menu selection.
  if (activeLayer() && !activeLayer().contains(document.activeElement)) focusFirst();
  const ax = gp.axes, lx = ax[0] || 0, ly = ax[1] || 0;
  // the repair bench: the left stick drives a cursor, A presses
  if (G.screen === 'repair' && REP.step) {
    const m = Math.hypot(lx, ly); if (m > 0.18) { PAD.cursor.x = clamp(PAD.cursor.x + lx * dt * 1.25, 0.02, 0.98); PAD.cursor.y = clamp(PAD.cursor.y + ly * dt * 1.6, 0.05, 0.95); benchMove({ ...PAD.cursor }, true); }
    if (pressed(NIN.on ? 1 : 0)) { if (REP.step === 'task' && squireBook().assisted) repairTaskInput(REP.task.targets[REP.task.index], true); else benchDown({ ...PAD.cursor }); }
    if (pressed(9)) navStart();
    return;
  }
  let dir = '';
  if (b[12] || ly < -0.6) dir = 'u'; else if (b[13] || ly > 0.6) dir = 'd'; else if (b[14] || lx < -0.6) dir = 'l'; else if (b[15] || lx > 0.6) dir = 'r';
  if (dir) {
    if (dir !== PAD.navKey) { PAD.navKey = dir; PAD.navT = 0.38; navDir(dir); }
    else { PAD.navT -= dt; if (PAD.navT <= 0) { PAD.navT = 0.12; navDir(dir); } }
  } else PAD.navKey = '';
  // right stick scrolls long lists
  const ry = ax[3] || 0; if (Math.abs(ry) > 0.25) { const body = activeLayer() && activeLayer().querySelector('.pbody'); if (body) body.scrollTop += ry * dt * 700; }
  if (pressed(NIN.on ? 1 : 0)) navActivate();
  if (pressed(NIN.on ? 0 : 1)) navBack();
  if (pressed(9)) navStart();
  if (pressed(4)) navTab(-1); if (pressed(5)) navTab(1);
}
function navDir(d) { navMove(d === 'l' ? -1 : d === 'r' ? 1 : 0, d === 'u' ? -1 : d === 'd' ? 1 : 0); }
// keyboard: arrows move, Enter/Space press, Escape goes back
window.addEventListener('keydown', e => {
  if (!activeLayer() || e.isComposing || (e.target && (e.target.isContentEditable || e.target.closest('textarea, select') || (e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'range')))) return;
  const map = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r' };
  if (map[e.key]) { e.preventDefault(); if (!activeLayer().contains(document.activeElement)) focusFirst(); else navDir(map[e.key]); }
  else if (e.key === 'Escape' && G.screen !== 'pause') { e.preventDefault(); navBack(); }
});

// ---- rumble: controller motors, or the phone's vibration motor ----
function rumble(strong, weak, ms) {
  if (!G.settings.rumble || G.attract || G.autopilot) return;
  try {
    if (IN.mode === 'pad') { const gp = currentPad(), va = gp && gp.vibrationActuator; if (va && va.playEffect) { const r = va.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: strong, weakMagnitude: weak }); if (r && r.catch) r.catch(() => { }); } }
    else if (IN.mode === 'touch' && navigator.vibrate) navigator.vibrate(Math.round(ms * (0.4 + 0.6 * Math.max(strong, weak))));
  } catch (e) { }
}

// ---- the button guide along the bottom of the screen in fights ----
const LEGEND = [['RT', 'swing'], ['LT', 'guard'], ['X', 'shove'], ['B', 'trip'], ['Y', 'tackle'], ['RB', 'grab'], ['A', 'brace'], ['R3', 'target'], ['View', 'camera']];
function updateLegend() {
  const el = $('#legend'); if (!el) return;
  if (!el.childElementCount) for (const [k, t] of LEGEND) el.append(h('span', null, h('i', { class: 'gp', 'data-k': k }, gpName(k)), t));
  const fight = G.phase === 'fight' || G.phase === 'prefight';
  el.hidden = !(IN.mode === 'pad' && G.settings.legend !== false && fight && !G.screen && !G.attract && G.player && !G.player.out);
}
window.addEventListener('gamepadconnected', () => { toastMenu('Controller connected'); });
window.addEventListener('gamepaddisconnected', () => { toastMenu('Controller disconnected'); if (G.phase === 'fight' && !G.paused && IN.mode === 'pad') togglePause(true); });

function rumbleFor(f, strong, weak, ms) {
  if (!f || !G.settings.rumble || G.attract || G.autopilot) return;
  if (!VS.on || f.pslot == null) { if (f.isPlayer) rumble(strong, weak, ms); return; }
  const pads = seatPads(), useKeyboard = pads.length < VS.humans.length;
  const gp = pads[useKeyboard ? f.pslot - 1 : f.pslot];
  try { const result = gp?.vibrationActuator?.playEffect('dual-rumble', {startDelay:0,duration:ms,strongMagnitude:strong,weakMagnitude:weak}); if (result?.catch) result.catch(()=>{}); } catch (e) { }
}
