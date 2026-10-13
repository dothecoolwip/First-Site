// ---------- flipbook effects: impact flashes, dust clouds on takedowns, star bursts for the kids ----------
const FLIP = { base: {}, pool: [] };
function flipBase(key) {
  if (FLIP.base[key] || typeof VFX_IMG === 'undefined' || !VFX_IMG[key]) return FLIP.base[key];
  const [uri, cols, rows] = VFX_IMG[key]; const img = new Image(); img.src = uri;
  return FLIP.base[key] = { img, cols, rows };
}
function flipFx(key, pos, size = 1, dur = 0.4, color = '#ffffff', additive = false) {
  const B = flipBase(key); if (!B || !W3.scene) return;
  let p = FLIP.pool.find(q => q.life <= 0);
  if (!p) { if (FLIP.pool.length >= 10) return; const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); s.renderOrder = 4; (W3.matchRoot || W3.scene).add(s); p = { s, life: 0, tex: {} }; FLIP.pool.push(p); }
  if (!p.tex[key]) { const t = new THREE.Texture(B.img); t.encoding = THREE.sRGBEncoding; t.repeat.set(1 / B.cols, 1 / B.rows); if (B.img.complete) t.needsUpdate = true; else B.img.addEventListener('load', () => t.needsUpdate = true, { once: true }); p.tex[key] = t; }
  const m = p.s.material; m.map = p.tex[key]; m.color.set(color); m.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending; m.opacity = 1; m.rotation = rand(0, TAU); m.needsUpdate = true;
  p.key = key; p.B = B; p.life = p.dur = dur; p.s.position.copy(pos); p.s.scale.setScalar(size); p.s.visible = true;
}
function updateFlip(dt) {
  for (const p of FLIP.pool) {
    if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; }
    const n = p.B.cols * p.B.rows, f = Math.min(n - 1, Math.floor((1 - p.life / p.dur) * n)), t = p.tex[p.key];
    t.offset.set((f % p.B.cols) / p.B.cols, 1 - (Math.floor(f / p.B.cols) + 1) / p.B.rows);
    if (p.key === 'cloud') { p.s.position.y += dt * 0.25; p.s.material.opacity = Math.min(1, p.life / p.dur * 2) * 0.8; }
  }
}

