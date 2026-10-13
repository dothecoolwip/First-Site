// ---------- photo mode: freeze the fight, fly the camera, add a filter or a poster frame, save a PNG ----------
const PHOTO = { on: false, yaw: 0, pitch: 0.35, dist: 4.5, target: new THREE.Vector3(), filter: 'none', frame: false, drag: null };
const PHOTO_FILTERS = { none: 'none', warm: 'sepia(.35) saturate(1.25) contrast(1.05)', mono: 'grayscale(1) contrast(1.2)', vivid: 'saturate(1.6) contrast(1.1)', film: 'sepia(.2) contrast(1.25) brightness(.95) saturate(.85)' };
function openPhoto() {
  if (!G.match) return;
  PHOTO.on = true; G.photo = true; if (NET.on) { onlinePauseRequest(true); resetTransientInput(); } else G.paused = true; hideAll(); setHud(false); $('#touch').hidden = true;
  const f = G.lastDown && !G.lastDown.out ? G.lastDown : G.player || G.fighters[0];
  PHOTO.target.set(f.pos.x, (f.body ? f.body.h : 1.8) * 0.6, f.pos.z); PHOTO.yaw = (G.player ? G.player.facing : 0) + Math.PI + 0.6; PHOTO.pitch = 0.3; PHOTO.dist = 4.5;
  $('#photo').hidden = false; renderPhotoUI();
}
function closePhoto() { if (RP.on) stopReplay(); PHOTO.on = false; G.photo = false; $('#photo').hidden = true; $('#gl').style.filter = ''; $('#photoFrame').hidden = true; togglePause(true); }
function renderPhotoUI() {
  const fs = $('#photoFilters'); fs.innerHTML = '';
  for (const [k, n] of [['none', 'Plain'], ['warm', 'Warm'], ['mono', 'B&W'], ['vivid', 'Vivid'], ['film', 'Film']]) fs.append(h('button', { 'aria-pressed': String(PHOTO.filter === k), onclick: () => { PHOTO.filter = k; renderPhotoUI(); AU.click(); } }, n));
  $('#gl').style.filter = PHOTO_FILTERS[PHOTO.filter] === 'none' ? '' : PHOTO_FILTERS[PHOTO.filter];
  $('#photoFrameBtn').setAttribute('aria-pressed', String(PHOTO.frame)); $('#photoFrame').hidden = !PHOTO.frame;
  $('#photoFrame .pfsub').textContent = G.match ? `${CLUBS.reavers.name} vs ${CLUBS[G.match.opp] ? CLUBS[G.match.opp].name : ''} · ${G.match.stage || ''}` : '';
}
function updatePhotoCam(dt) {
  const cam = W3.camera; const gp = currentPad && currentPad();
  if (gp) { const ax = gp.axes; const dz = v => Math.abs(v) > 0.18 ? v : 0; PHOTO.yaw -= dz(ax[2] || 0) * dt * 2; PHOTO.pitch = clamp(PHOTO.pitch + dz(ax[3] || 0) * dt * 1.5, -0.1, 1.4); PHOTO.target.x += (dz(ax[0]) * Math.cos(PHOTO.yaw) + dz(ax[1]) * Math.sin(PHOTO.yaw)) * dt * 3; PHOTO.target.z += (-dz(ax[0]) * Math.sin(PHOTO.yaw) + dz(ax[1]) * Math.cos(PHOTO.yaw)) * dt * 3; }
  const t = PHOTO.target, d = PHOTO.dist;
  cam.position.set(t.x + Math.sin(PHOTO.yaw) * Math.cos(PHOTO.pitch) * d, Math.max(0.15, t.y + Math.sin(PHOTO.pitch) * d), t.z + Math.cos(PHOTO.yaw) * Math.cos(PHOTO.pitch) * d);
  if (cam.near !== 0.1 || Math.abs(cam.fov - 45) > 0.1) { cam.near = 0.1; cam.fov = 45; cam.updateProjectionMatrix(); }
  cam.lookAt(t);
}
async function savePhoto() {
  const R = W3.renderer; R.autoClear = false; R.clear(); R.render(W3.scene, W3.camera);
  const src = R.domElement, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d');
  x.filter = PHOTO_FILTERS[PHOTO.filter]; x.drawImage(src, 0, 0); x.filter = 'none';
  if (PHOTO.frame) { // poster frame: tape strip title and the match line
    const W = c.width, H = c.height, u = Math.min(W, H);
    x.strokeStyle = '#ece8de'; x.lineWidth = u * 0.025; x.strokeRect(u * 0.03, u * 0.03, W - u * 0.06, H - u * 0.06);
    x.fillStyle = '#141516'; x.save(); x.translate(W * 0.06, H * 0.82); x.rotate(-0.03); x.fillRect(0, 0, W * 0.5, u * 0.11);
    x.fillStyle = '#ece8de'; x.font = `900 ${u * 0.075}px "Big Shoulders Display", Impact, sans-serif`; x.fillText('RED DEER RUMBLE 2026', u * 0.03, u * 0.085); x.restore();
    x.fillStyle = 'rgba(10,13,15,.75)'; x.fillRect(W * 0.06, H * 0.82 + u * 0.12, W * 0.6, u * 0.05); x.fillStyle = '#aab4b8'; x.font = `600 ${u * 0.032}px "Barlow Semi Condensed", sans-serif`; x.fillText($('#photoFrame .pfsub').textContent, W * 0.07, H * 0.82 + u * 0.157);
  }
  const blob = await new Promise(r => c.toBlob(r, 'image/png')); if (!blob) { toastMenu('Could not capture the photo.'); return; }
  const name = `buhurt-${Date.now()}.png`;
  try { const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; if (dl) { await dl.save({ filename: name, data: blob }); toastMenu('Photo saved.'); return; } } catch (e) { if (e && e.code === 'declined') return; }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toastMenu('Photo saved.'); } catch (e) { toastMenu('Saving isn’t allowed here. Take a screenshot instead.'); }
}
function initPhoto() {
  const el = $('#photo');
  el.addEventListener('pointerdown', e => { if (e.target.closest('button,input')) return; PHOTO.drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { const d = PHOTO.drag; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY;
    if (d.pan) { PHOTO.target.x -= (dx * Math.cos(PHOTO.yaw)) * 0.01; PHOTO.target.z += (dx * Math.sin(PHOTO.yaw)) * 0.01; PHOTO.target.y = clamp(PHOTO.target.y + dy * 0.01, 0.2, 3); }
    else { PHOTO.yaw -= dx * 0.008; PHOTO.pitch = clamp(PHOTO.pitch + dy * 0.006, -0.1, 1.4); } });
  el.addEventListener('pointerup', () => PHOTO.drag = null);
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('wheel', e => { PHOTO.dist = clamp(PHOTO.dist * (1 + Math.sign(e.deltaY) * 0.1), 1.2, 14); e.preventDefault(); }, { passive: false });
  $('#photoIn').onclick = () => PHOTO.dist = clamp(PHOTO.dist * 0.82, 1.2, 14);
  $('#photoOut').onclick = () => PHOTO.dist = clamp(PHOTO.dist * 1.22, 1.2, 14);
  $('#photoSave').onclick = () => { AU.click(); savePhoto(); };
  $('#photoExit').onclick = () => { AU.click(); closePhoto(); };
  $('#photoFrameBtn').onclick = () => { PHOTO.frame = !PHOTO.frame; renderPhotoUI(); AU.click(); };
  $('#btnPhoto').onclick = () => { AU.click(); openPhoto(); };
  $('#btnReplay').onclick = () => { AU.click(); openPhoto(); if (startReplay() && G.lastDown) { PHOTO.target.set(G.lastDown.groundPos.x, 0.9, G.lastDown.groundPos.z); PHOTO.dist = 4; } };
  $('#replayBtn').onclick = () => { AU.click(); RP.on ? stopReplay() : startReplay(); };
  $('#replayScrub').oninput = e => { if (!RP.on && !startReplay()) return; if (!RP.frames.length) return; const a = RP.frames[0].t, b = RP.frames[RP.frames.length - 1].t; RP.t = a + (b - a) * +e.target.value; RP.start = a; RP.end = b; };
}

