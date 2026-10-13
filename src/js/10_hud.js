// ---------- HUD ----------
const HUD = { callT: 0, statusT: 0, flashT: 0, overlays: null, toastT: 0, toastPr: 0, hmT: 0 };
// what your last move did, in big letters under the crosshair
function toast(text, kind = 'good', sub = '') {
  if ((G.attract && !TOWN.on) || G.autopilot) return;
  if (CUTE.on) { text = CUTE_WORDS[text] || text; if (kind === 'big') text = '♥ ' + text + ' ♥'; }
  const pr = { big: 3, good: 2, bad: 1, info: 1 }[kind] || 1;
  if (HUD.toastPr === 3 && HUD.toastT > 0.7 && pr < 3) return; // only a fresh takedown / big moment holds the spot
  const el = $('#toast'); el.innerHTML = ''; el.append(h('b', null, text)); if (sub) el.append(h('small', null, sub));
  el.style.setProperty('--c', kind === 'big' ? 'var(--marshal)' : kind === 'bad' ? '#aab4b8' : kind === 'info' ? '#7fb6ff' : 'var(--chalk)');
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('on', 'pop');
  HUD.toastT = kind === 'big' ? 1.3 : sub ? 1.5 : 0.8; HUD.toastPr = pr;
}
function hitMark(c) { if (G.attract || G.autopilot) return; HUD.hmT = 0.22; rumble(0.1, 0.45, 55); const el = $('#hitmark'); el.style.setProperty('--c', c); el.style.opacity = '1'; }

function feed(html, cite, color) {
  if (G.attract) return;
  const box = $('#feed');
  const e = h('div', { class: 'fe', style: `--c:${color || 'var(--dim)'}`, html: html + (cite ? ` <span class="rr">${cite}</span>` : '') });
  box.prepend(e);
  while (box.children.length > 4) box.lastChild.remove();
  setTimeout(() => { e.style.opacity = '0'; setTimeout(() => e.remove(), 700); }, 6500);
  G.feedLog.push({ t: G.simTime, text: html.replace(/<[^>]+>/g, ''), cite });
}
function showCall(big, small) {
  if (G.attract) return;
  const c = $('#call'); c.innerHTML = ''; c.append(big); if (small) c.append(h('small', null, small));
  c.classList.add('on'); HUD.callT = small ? 2.6 : 1.6;
}
function setStatus(text, color, sec = 2.5) {
  const s = $('#status'); s.textContent = text; s.style.setProperty('--c', color || 'var(--marshal)'); s.hidden = false; HUD.statusT = sec;
}
function flashHit() { HUD.flashT = G.settings.flash === false ? 0 : 0.25; FP.jolt = Math.max(FP.jolt, 0.9); rumble(0.75, 0.45, 170); }

function buildPips() {
  for (const t of [0, 1]) {
    const box = $(t === 0 ? '#pipsA' : '#pipsB'); box.innerHTML = '';
    G.fighters.filter(f => f.team === t).forEach(f => { const p = h('i', { class: 'pip', style: `--c:${t === 0 ? 'var(--flag)' : 'var(--rival)'}` }); f.pip = p; box.append(p); });
  }
}

function updateHud(dt) {
  const m = G.match;
  if (m) {
    $('#clock').textContent = m.training ? 'YARD' : fmtClock(m.clock);
    if (m.duel) { $('#rwA').textContent = m.pts[0]; $('#rwB').textContent = m.pts[1]; if (G.phase === 'fight') $('#rnd').textContent = `${m.overtime ? 'OT' : 'Rd ' + m.round} · ${m.wins[0]}–${m.wins[1]}`; }
    else { $('#rwA').textContent = m.wins[0]; $('#rwB').textContent = m.wins[1]; }
    $('#pips').hidden = !!m.duel || !!m.ffa || G.fighters.length > 24;
    for (const f of G.fighters) if (f.pip) f.pip.className = 'pip' + (f.out ? ' out' : isDown(f) ? ' down' : '');
  }
  HUD.callT -= dt; if (HUD.callT <= 0) $('#call').classList.remove('on');
  $('#touch').classList.toggle('down', !!(G.player && !isUp(G.player)));
  HUD.statusT -= dt;
  const p = G.player;
  let st = null, sc = null;
  if (p && G.phase === 'fight' && !G.autopilot) {
    if (p.state === 'grounded' && HUD.statusT <= 0) { st = p.returnAt > 0 ? 'The Knight Marshal is returning you to the fight.' : 'Grounded. Stay down until "All rise" (BR 5.2).'; sc = 'var(--dim)'; }
    else if (isUp(p) && !p.weapon && HUD.statusT <= 0) { st = p.sidearmT > 0 ? 'Drawing your sidearm…' : G.reserves[sideOf(p)] > 0 ? 'Disarmed. Get to your weapon zone (the taped box by your rail) for a reserve.' : 'Disarmed and no reserves left. Defend, grapple or yield.'; sc = 'var(--marshal)'; }
    else if (isUp(p) && p.pinned && HUD.statusT <= 0) { st = 'Pinned to the rail. Gripping it is legal (BR 3.4).'; sc = 'var(--dim)'; }
  }
  if (HUD.statusT > 0) { $('#status').hidden = false; }
  else if (st) { const s = $('#status'); s.textContent = st; s.style.setProperty('--c', sc); s.hidden = false; }
  else $('#status').hidden = true;
  // clinch meter (BR 4.10)
  const cb = $('#clinchbar');
  if (p && p.clinch && G.phase === 'fight') { cb.hidden = false; cb.firstChild.style.width = clamp(p.clinch.idle / BREAK_AFTER * 100, 0, 100) + '%'; } else cb.hidden = true;
  // bell rung and hits
  // the edges of your view close in as you run out of breath, pulsing with every gasp
  const gasp = BREATH.e > 0.05 ? BREATH.e * (0.22 + 0.16 * (0.5 + 0.5 * Math.sin(BREATH.ph))) : 0;
  $('#vig').style.opacity = p && !CAM.cine ? String(clamp(p.bell * 0.9 + (isUp(p) ? gasp + (1 - p.gas) * 0.12 : 0), 0, 0.92)) : '0';
  HUD.flashT -= dt; $('#hitflash').style.opacity = String(clamp(HUD.flashT * 3, 0, 0.8));
  HUD.toastT -= dt; if (HUD.toastT <= 0) $('#toast').classList.remove('on');
  if (HUD.hmT > 0) { HUD.hmT -= dt; $('#hitmark').style.opacity = String(clamp(HUD.hmT * 6, 0, 1)); }
  // trip window: the target is stumbling, so the Trip button lights up
  const tg = p && isUp(p) && G.phase === 'fight' && !G.autopilot ? p.softTarget : null;
  const vul = !!(tg && isUp(tg) && dist2(tg.pos, p.pos) < 2.7 && (vlen(tg.lean) / FALL_L > 0.38 || tg.stepRem > 0 || G.simTime < (tg.tripWin || 0)));
  $('#bTrip').classList.toggle('hot', vul);
  const salute = p && G.simTime < (G.saluteUntil || 0) && isUp(p) && G.phase === 'fight' && !G.autopilot;
  const pe = $('#prompt'); const wantP = (vul || salute) && IN.mode !== 'touch' && !(p && p.clinch);
  if (wantP) pe.textContent = salute && !vul ? (IN.mode === 'pad' ? 'R3 · salute the crowd' : 'G · salute the crowd') : IN.mode === 'pad' ? 'B · trip!' : 'E · trip!';
  const bs = $('#bSalute'); if (bs) bs.hidden = !(salute && IN.mode === 'touch');
  pe.hidden = !wantP;
  AU.setBell(p && !G.attract ? p.bell : 0, p && isFP() ? p.helm.muffle * 0.45 : 0); // a light muffle only: you still hear the steel
  updateLegend();
  const portrait = IN.mode === 'touch' && window.innerHeight > window.innerWidth;
  $('#rotate').hidden = !(portrait && G.phase === 'fight' && m && m.clock > ROUND_TIME - 8);
}

// ---------- how tired you are: wind meter, panting, heartbeat, heaving view ----------
// gas is the breath you have right now; fatigue builds over the whole fight and caps how much of it comes back
const BREATH = { ph: 0, e: 0, heartT: 0, breathT: 0 };
function exertion(f) { return clamp(Math.max((1 - f.gas) * 1.15 - 0.2, (f.fatigue || 0) * 1.25 - 0.18), 0, 1); }
function updateWind(dt) {
  const p = G.player, el = $('#wind');
  const live = !!(p && G.match && !G.match.training && (G.phase === 'fight' || G.phase === 'prefight' || G.phase === 'stopping') && !G.attract && !G.autopilot && !CAM.cine);
  el.hidden = !live;
  if (!p || G.paused) return;
  const e = isUp(p) ? exertion(p) : BREATH.e * 0.98;
  BREATH.e = damp(BREATH.e, e, 2.5, dt);
  const rate = lerp(0.3, 1.0, BREATH.e); BREATH.ph += dt * rate * TAU;
  if (!live) return;
  const fat = p.fatigue || 0, cap = 1 - 0.5 * fat;
  el.style.setProperty('--g', (clamp(p.gas, 0, 1) * 100).toFixed(1) + '%'); el.style.setProperty('--cap', (cap * 100).toFixed(1) + '%');
  el.classList.toggle('low', p.gas < 0.35); el.classList.toggle('empty', p.gas < 0.15);
  { const gd = $('#guardDir'); if (gd) { const on = p.guard && isUp(p); gd.hidden = !on; if (on) { const t = { L: '◀ GUARD LEFT', R: 'GUARD RIGHT ▶', H: '▲ HIGH GUARD', mid: 'GUARD (flick for a side)' }[p.gdir || 'mid']; if (gd.textContent !== t) gd.textContent = t; gd.classList.toggle('mid', !p.gdir || p.gdir === 'mid'); } } }
  { const b = isUp(p) ? 1 - leanRatio(p) : 0; el.style.setProperty('--b', (b * 100).toFixed(1) + '%'); el.classList.toggle('wobbly', b < 0.4); }
  const word = fat > 0.75 ? 'Spent' : fat > 0.5 ? 'Heavy legs' : fat > 0.25 ? 'Tiring' : 'Fresh';
  const wt = $('#windTxt'); if (wt.textContent !== word) wt.textContent = word;
  el.dataset.fat = fat > 0.75 ? '3' : fat > 0.5 ? '2' : fat > 0.25 ? '1' : '0';
  if (G.phase !== 'fight') return;
  // say it once when you cross a line, so you know why everything got slower
  const lvl = fat > 0.75 ? 2 : fat > 0.5 ? 1 : 0;
  if (lvl > (p.tiredWarn || 0)) { p.tiredWarn = lvl; if (lvl === 1) toast('Your legs are getting heavy', 'info', 'slower swings, slower feet'); else toast('Running on empty', 'bad', 'easier to knock down · rest behind a shield'); rumble(0.3, 0.1, 160); comm('tired', {}, 1); }
  // panting inside the helm, and your heart once you're spent
  if (BREATH.e > 0.08 && isUp(p)) { BREATH.breathT -= dt; if (BREATH.breathT <= 0) { BREATH.breathT = 1 / rate; AU.breath(BREATH.e); } }
  if (fat > 0.5 || p.gas < 0.15) { BREATH.heartT -= dt; if (BREATH.heartT <= 0) { BREATH.heartT = 60 / (100 + 70 * Math.max(fat, 1 - p.gas)); AU.heart(Math.max(fat - 0.4, 0.35 - p.gas) * 1.6); } }
}

function refreshTouchUI() {
  const show = IN.mode === 'touch' && ((G.phase === 'fight' || G.phase === 'prefight') && !G.attract && !G.autopilot || (G.phase === 'town' && !G.screen));
  $('#touch').hidden = !show;
  $('#lookzone').hidden = false;
}

// ---------- 3D overlays: balance ring, target marker, weapon-zone glow ----------
function buildOverlays() {
  const o = HUD.overlays = {};
  const pink = new THREE.MeshBasicMaterial({ color: '#ff3d8b', transparent: true, opacity: 0.85, depthWrite: false });
  o.ring = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.62, 48), pink); o.ring.rotation.x = -Math.PI / 2; o.ring.position.y = 0.02;
  o.safe = new THREE.Mesh(new THREE.RingGeometry(0.0, 0.17 / FALL_L * 0.56, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.08, depthWrite: false })); o.safe.rotation.x = -Math.PI / 2; o.safe.position.y = 0.015;
  o.dot = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), new THREE.MeshBasicMaterial({ color: '#ffffff', depthWrite: false })); o.dot.rotation.x = -Math.PI / 2; o.dot.position.y = 0.03;
  o.gas = []; const gm = new THREE.MeshBasicMaterial({ color: '#ece8de', transparent: true, opacity: 0.55, depthWrite: false });
  for (let i = 0; i < 20; i++) { const s = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.74, 3, 1, i / 20 * TAU + 0.02, TAU / 20 - 0.04), gm); s.rotation.x = -Math.PI / 2; s.position.y = 0.02; o.gas.push(s); }
  o.group = new THREE.Group(); o.group.add(o.ring, o.safe, o.dot, ...o.gas); W3.scene.add(o.group);
  o.target = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 4), new THREE.MeshBasicMaterial({ color: '#ff3d8b', depthTest: false, transparent: true })); o.target.rotation.x = Math.PI; o.target.renderOrder = 9; W3.scene.add(o.target);
  o.lockRing = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 40), new THREE.MeshBasicMaterial({ color: '#f2c40f', transparent: true, opacity: 0.8, depthWrite: false })); o.lockRing.rotation.x = -Math.PI / 2; o.lockRing.position.y = 0.025; W3.scene.add(o.lockRing);
  o.zone = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 40), new THREE.MeshBasicMaterial({ color: '#f2c40f', transparent: true, opacity: 0.6, depthWrite: false })); o.zone.rotation.x = -Math.PI / 2; o.zone.position.y = 0.02; W3.scene.add(o.zone);
}
function updateOverlays(t) {
  const o = HUD.overlays, p = G.player; if (!o) return;
  const show = p && !G.attract && (G.phase === 'fight' || G.phase === 'prefight') && !CAM.cine;
  o.group.visible = !!(show && isUp(p) && !isFP());
  if (o.group.visible) {
    o.group.position.set(p.pos.x, 0, p.pos.z);
    const ringOn = G.settings.ring; o.dot.visible = o.safe.visible = ringOn; o.gas.forEach((s, i) => s.visible = ringOn && i < Math.round(p.gas * 20));
    o.ring.material.opacity = ringOn ? 0.85 : 0.45;
    const sc = 0.56 / FALL_L; o.dot.position.x = clamp(p.lean.x * sc, -0.6, 0.6); o.dot.position.z = clamp(p.lean.z * sc, -0.6, 0.6);
    o.dot.material.color.set(vlen(p.lean) > 0.26 ? '#f2c40f' : '#ffffff');
  }
  const lk = show && isUp(p) && IN.lock && isUp(IN.lock) ? IN.lock : null;
  const tg = lk || (show && isUp(p) && p.softTarget && isUp(p.softTarget) ? p.softTarget : null);
  o.target.visible = !!tg;
  if (tg) { o.target.position.set(tg.pos.x, tg.body.h * 1.17 + 0.4 + Math.sin(t * 5) * 0.06, tg.pos.z); o.target.material.color.set(lk ? '#f2c40f' : '#ff3d8b'); o.target.scale.setScalar(lk ? 1.35 : 1); o.target.rotation.y = t * 2.5; }
  o.lockRing.visible = !!lk; if (lk) { o.lockRing.position.x = lk.pos.x; o.lockRing.position.z = lk.pos.z; o.lockRing.material.opacity = 0.55 + 0.3 * Math.sin(t * 7); }
  o.zone.visible = !!(show && isUp(p) && !p.weapon && p.sidearmT <= 0 && G.reserves[sideOf(p)] > 0);
  if (o.zone.visible) { const zn = W3.zones[sideOf(p)]; o.zone.position.x = zn.x; o.zone.position.z = zn.z; o.zone.material.opacity = 0.35 + 0.3 * Math.sin(t * 6); }
}

