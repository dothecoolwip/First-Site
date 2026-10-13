// ---------- canvas textures ----------
function cvs(w, hgt) { const c = document.createElement('canvas'); c.width = w; c.height = hgt; return c; }
function texFrom(c, repeat) {
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function speckle(ctx, w, hh, n, cols, rmin, rmax) {
  for (let i = 0; i < n; i++) { ctx.fillStyle = pick(cols); ctx.globalAlpha = rand(0.04, 0.22); const r = rand(rmin, rmax); ctx.beginPath(); ctx.arc(rand(0, w), rand(0, hh), r, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
}

const TEX = {};
function buildTextures() {
  // concrete pad of a summer hockey arena (ice out)
  {
    const c = cvs(1024, 1024), x = c.getContext('2d');
    x.fillStyle = '#7b7f7e'; x.fillRect(0, 0, 1024, 1024);
    speckle(x, 1024, 1024, 9000, ['#5f6362', '#8e9291', '#6d716f', '#9a9c98'], 0.6, 2.2);
    speckle(x, 1024, 1024, 60, ['#5a5e5c', '#666a68'], 30, 120);
    x.strokeStyle = 'rgba(30,32,32,.55)'; x.lineWidth = 3; // expansion joints
    for (const p of [256, 768]) { x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 1024); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(1024, p); x.stroke(); }
    x.strokeStyle = 'rgba(25,25,25,.25)'; x.lineWidth = 1.2; // hairline cracks and scuffs
    for (let i = 0; i < 26; i++) { x.beginPath(); let px = rand(0, 1024), py = rand(0, 1024); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += rand(-40, 40); py += rand(-40, 40); x.lineTo(px, py); } x.stroke(); }
    for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(20,20,20,' + rand(0.05, 0.15) + ')'; x.lineWidth = rand(2, 6); x.beginPath(); const px = rand(0, 1024), py = rand(0, 1024); x.moveTo(px, py); x.quadraticCurveTo(px + rand(-60, 60), py + rand(-60, 60), px + rand(-90, 90), py + rand(-90, 90)); x.stroke(); }
    TEX.concrete = texFrom(c, [9, 13]);
  }
  // rough lumber for the rails
  {
    const c = cvs(512, 64), x = c.getContext('2d');
    x.fillStyle = '#8a6a48'; x.fillRect(0, 0, 512, 64);
    for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(${rand(60, 90) | 0},${rand(40, 60) | 0},${rand(25, 40) | 0},${rand(0.2, 0.5)})`; x.lineWidth = rand(0.5, 2); x.beginPath(); const y = rand(0, 64); x.moveTo(0, y); for (let px = 0; px <= 512; px += 32) x.lineTo(px, y + Math.sin(px * 0.02 + i) * rand(1, 4)); x.stroke(); }
    for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(60,40,24,.55)'; x.beginPath(); x.ellipse(rand(20, 490), rand(10, 54), rand(4, 8), rand(2, 4), 0, 0, TAU); x.fill(); }
    TEX.wood = texFrom(c, [1, 1]);
  }
  // arena banner
  {
    const c = cvs(1024, 256), x = c.getContext('2d');
    x.fillStyle = '#121619'; x.fillRect(0, 0, 1024, 256);
    x.fillStyle = '#ff3d8b'; x.fillRect(0, 0, 1024, 14); x.fillRect(0, 242, 1024, 14);
    x.fillStyle = '#ece8de'; x.textAlign = 'center';
    x.font = '900 118px "Big Shoulders Display", Impact, "Arial Narrow", sans-serif'; x.fillText('RED DEER RUMBLE', 512, 140);
    x.font = '700 34px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; x.fillStyle = '#aab4b8'; x.fillText('SUMMER STEEL  ·  5v5 BUHURT  ·  BI RULES', 512, 200);
    TEX.banner = texFrom(c);
  }
  // spark sprite
  {
    const c = cvs(64, 64), x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.25, 'rgba(255,200,90,.9)'); g.addColorStop(1, 'rgba(255,120,20,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); TEX.spark = new THREE.CanvasTexture(c);
  }
  {
    const c = cvs(64, 64), x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(200,195,185,.55)'); g.addColorStop(1, 'rgba(200,195,185,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); TEX.dust = new THREE.CanvasTexture(c);
  }
  // soft blob shadow for marshals and crowd
  {
    const c = cvs(64, 64), x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); TEX.blob = new THREE.CanvasTexture(c);
  }
}

function drawCharge(x, club, cx, cy, w, hh) {
  x.fillStyle = club.trim;
  if (club.charge === 'chevron') {
    x.beginPath(); x.moveTo(cx - w * 0.5, cy + hh * 0.35); x.lineTo(cx, cy - hh * 0.2); x.lineTo(cx + w * 0.5, cy + hh * 0.35); x.lineTo(cx + w * 0.5, cy + hh * 0.08); x.lineTo(cx, cy - hh * 0.47); x.lineTo(cx - w * 0.5, cy + hh * 0.08); x.closePath(); x.fill();
  } else if (club.charge === 'pale') {
    x.fillRect(cx - w * 0.16, cy - hh * 0.5, w * 0.32, hh);
  } else if (club.charge === 'cross') {
    x.fillRect(cx - w * 0.12, cy - hh * 0.5, w * 0.24, hh); x.fillRect(cx - w * 0.5, cy - hh * 0.2, w, hh * 0.24);
  } else if (club.charge === 'saltire') {
    x.save(); x.translate(cx, cy); for (const r of [-0.75, 0.75]) { x.save(); x.rotate(r); x.fillRect(-w, -hh * 0.1, w * 2, hh * 0.2); x.restore(); } x.restore();
  } else if (club.charge === 'chief') {
    x.fillRect(cx - w, cy - hh * 0.5, w * 2, hh * 0.3);
  } else if (club.charge === 'quarterly') {
    x.fillRect(cx - w * 0.5, cy - hh * 0.5, w * 0.5, hh * 0.5); x.fillRect(cx, cy, w * 0.5, hh * 0.5);
  } else {
    x.save(); x.translate(cx, cy); x.rotate(-0.75); x.fillRect(-w, -hh * 0.11, w * 2, hh * 0.22); x.restore();
  }
}
const _tabardCache = {}, _shieldCache = {};
function tabardTex(club) {
  if (_tabardCache[club.key]) return _tabardCache[club.key];
  const c = cvs(512, 256), x = c.getContext('2d');
  x.fillStyle = club.tabard; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 2600; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.035)'; x.fillRect(rand(0, 512), rand(0, 256), rand(1, 3), 1); }
  x.save(); x.beginPath(); x.rect(0, 0, 512, 256); x.clip();
  drawCharge(x, club, 256, 110, 150, 150); // front (centre after offset)
  drawCharge(x, club, 0, 110, 150, 150); drawCharge(x, club, 512, 110, 150, 150); // back
  x.restore();
  x.fillStyle = club.trim; x.globalAlpha = 0.8; x.fillRect(0, 238, 512, 6); x.globalAlpha = 1;
  x.fillStyle = 'rgba(40,30,20,.25)'; for (let i = 0; i < 30; i++) { x.beginPath(); x.arc(rand(0, 512), rand(150, 256), rand(4, 18), 0, TAU); x.fill(); }
  const t = texFrom(c); t.wrapS = THREE.RepeatWrapping; t.offset.x = 0.5; _tabardCache[club.key] = t; return t;
}
function shieldTex(club) {
  if (_shieldCache[club.key]) return _shieldCache[club.key];
  const c = cvs(256, 256), x = c.getContext('2d');
  x.fillStyle = club.tabard; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(rand(0, 256), rand(0, 256), rand(1, 4), 1); }
  drawCharge(x, club, 128, 120, 170, 170);
  for (let i = 0; i < 26; i++) { x.strokeStyle = 'rgba(210,205,195,' + rand(0.15, 0.4) + ')'; x.lineWidth = rand(1, 2.5); x.beginPath(); const px = rand(20, 236), py = rand(20, 236); x.moveTo(px, py); x.lineTo(px + rand(-30, 30), py + rand(-12, 12)); x.stroke(); }
  const t = texFrom(c); _shieldCache[club.key] = t; return t;
}

// number written in marker on a strip of black hockey tape, with the side's flagging tape behind it
function tagTexture(num, flag, isPlayer) {
  const c = cvs(160, 80), x = c.getContext('2d');
  x.fillStyle = flag; x.fillRect(8, 30, 144, 20);
  x.fillStyle = '#141516';
  x.beginPath(); x.moveTo(30, 12); for (let i = 0; i <= 6; i++) x.lineTo(30 + (i % 2) * 5, 12 + i * 9.3); x.lineTo(130, 68); for (let i = 6; i >= 0; i--) x.lineTo(130 - (i % 2) * 5, 12 + i * 9.3); x.closePath(); x.fill();
  x.fillStyle = isPlayer ? flag : '#ece8de'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '40px "Permanent Marker", "Marker Felt", "Comic Sans MS", cursive'; x.fillText(String(num), 80, 42);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}

