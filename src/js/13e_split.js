// ---------- split screen for local versus (one TV, two players), and Nintendo controller layout ----------
const SPLIT = { on: true, cams: [], pos: [], look: [], init: [false, false, false, false] };
function splitActive() { return VS.on && SPLIT.on && G.match && G.match.versus && ['prefight', 'fight', 'stopping', 'between'].includes(G.phase) && !G.photo && !CAM.cine; }
function splitCams() {
  if (!SPLIT.cams.length) for (let i = 0; i < 2; i++) SPLIT.cams.push(new THREE.PerspectiveCamera(60, 1, 0.2, 400));
  return SPLIT.cams;
}
// each player's camera rides behind their fighter, looking past them at the nearest opponent
function splitLayout(i, n, W, H) {
  if (n <= 2) { const side = W >= H; return side ? [i ? W / 2 : 0, 0, W / 2, H] : [0, i ? 0 : H / 2, W, H / 2]; }
  return [(i % 2) * W / 2, i < 2 ? H / 2 : 0, W / 2, H / 2]; // quadrants: P1 top-left, P2 top-right, P3 bottom-left, P4 bottom-right
}
function updateSplitCams(dt) {
  const hum = VS.humans || [], n = hum.length, W = window.innerWidth, H = window.innerHeight;
  while (SPLIT.cams.length < n) SPLIT.cams.push(new THREE.PerspectiveCamera(60, 1, 0.2, 400));
  while (SPLIT.pos.length < n) { SPLIT.pos.push(new THREE.Vector3()); SPLIT.look.push(new THREE.Vector3()); }
  hum.forEach((f, i) => {
    if (!f) return; let o = null, bd = 1e9; for (const e of G.fighters) if (e.team !== f.team && !e.out) { const d = dist2(e.pos, f.pos) + (isUp(e) ? 0 : 6); if (d < bd) { bd = d; o = e; } }
    const base = isDown(f) ? f.groundPos : f.pos, ob = o ? (isDown(o) ? o.groundPos : o.pos) : { x: 0, z: 0 };
    const ang = o ? angTo(base, ob) : f.facing, hs = f.body.h / 1.8;
    const tp = new THREE.Vector3(base.x - Math.sin(ang) * 4.4, 2.3 * hs, base.z - Math.cos(ang) * 4.4);
    tp.x = clamp(tp.x, -LIST.W / 2 + 0.6, LIST.W / 2 - 0.6); tp.z = clamp(tp.z, -LIST.L / 2 + 0.6, LIST.L / 2 - 0.6); // stay inside the rails
    const tl = new THREE.Vector3((base.x * 2 + ob.x) / 3, 1.1 * hs, (base.z * 2 + ob.z) / 3);
    if (!SPLIT.init[i]) { SPLIT.pos[i].copy(tp); SPLIT.look[i].copy(tl); SPLIT.init[i] = true; }
    SPLIT.pos[i].lerp(tp, 1 - Math.exp(-6 * dt)); SPLIT.look[i].lerp(tl, 1 - Math.exp(-8 * dt));
    const c = SPLIT.cams[i], L = splitLayout(i, n, W, H), aspect = L[2] / L[3], fov = aspect > 1.2 ? 60 : 52;
    c.position.copy(SPLIT.pos[i]); c.lookAt(SPLIT.look[i]);
    if (Math.abs(c.aspect - aspect) > 0.001 || c.fov !== fov) { c.aspect = aspect; c.fov = fov; c.updateProjectionMatrix(); }
  });
}
function renderSplit(R) {
  const n = (VS.humans || []).length, W = window.innerWidth, H = window.innerHeight;
  R.setScissorTest(true);
  for (let i = 0; i < n; i++) { const [x, y, w, h2] = splitLayout(i, n, W, H); R.setViewport(x, y, w, h2); R.setScissor(x, y, w, h2); R.render(W3.scene, SPLIT.cams[i]); }
  R.setScissorTest(false); R.setViewport(0, 0, W, H);
  updateLocalFeedback();
}
function updateLocalFeedback() {
  const lab = $('#splitLabels'); if (!lab) return;
  const hum = VS.humans || [], n = hum.length, W = innerWidth, H = innerHeight;
  document.body.classList.toggle('couch', !!VS.on);
  lab.hidden = !VS.on || !!G.screen || !!G.photo;
  if (!VS.on) return;
  const layout = `${n}:${W}:${H}:${SPLIT.on}`;
  if (lab.childElementCount !== n || lab.dataset.layout !== layout) {
    lab.dataset.layout = layout; lab.replaceChildren();
    for (let i = 0; i < n; i++) {
      const [x,y,w,h2] = SPLIT.on ? splitLayout(i,n,W,H) : [i * W / n,0,W/n,H];
      lab.append(h('span', {class:'plabel',style:`left:${x+6}px;bottom:${y+h2-64}px;max-width:${w-12}px;font-size:.8rem;white-space:normal`},''));
    }
  }
  [...lab.children].forEach((el,i) => {
    const f=hum[i]; if (!f) return;
    el.textContent = `P${i+1} · Stamina ${Math.round(f.gas*100)}% · Balance ${Math.round((1-leanRatio(f))*100)}% · ${isDown(f)?'Down':f.guard?'Guard':f.action?f.action.kind:'Ready'}`;
  });
}
// movement for a player is relative to their own half of the screen
function vsCam(slot) { return splitActive() && SPLIT.cams[slot] ? SPLIT.cams[slot] : W3.camera; }

// ---- Switch Pro Controller and Joy-Cons: Nintendo letters by position, and the right-hand button confirms ----
const NIN = { on: false };
const NIN_MAP = { A: 'B', B: 'A', X: 'Y', Y: 'X', RT: 'ZR', LT: 'ZL', RB: 'R', LB: 'L', R3: 'RS', L3: 'LS', View: '−', Start: '+', Menu: '+' };
function isNintendo(gp) { return !!gp && /nintendo|pro controller|joy-?con|057e/i.test(gp.id || ''); }
function gpName(k) { return NIN.on ? (NIN_MAP[k] || k) : k; }
function checkNintendo() {
  const pref = G.settings.padLetters || 'auto';
  const on = pref === 'nin' ? true : pref === 'xbox' ? false : isNintendo(PADS.last); if (on === NIN.on) return;
  NIN.on = on; document.body.classList.toggle('nin', on);
  $$('.gp[data-k]').forEach(el => { el.textContent = gpName(el.dataset.k); });
  if (on && pref === 'auto' && typeof toastMenu === 'function') toastMenu('Switch controller: right button confirms. Xbox letters on yours? Settings, Button letters.');
}
