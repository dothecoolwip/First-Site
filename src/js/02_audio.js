// ---------- procedural audio + marshal voice ----------
const AU = {
  ctx: null, master: null, lp: null, crowd: null, crowdTarget: 0.05, noiseBuf: null, muted: false, breathT: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8;
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 18000;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    this.master.connect(this.lp); this.lp.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // crowd bed: low murmur under everything
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 380; bp.Q.value = 0.5;
    const g = ctx.createGain(); g.gain.value = 0.0;
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start();
    this.crowd = g;
    this.loadSamples();
  },
  buf: {}, counts: {}, loaded: 0, total: 0, failed: 0,
  // every recording ships inside the page (base64), so nothing depends on fetching side files
  loadSamples() {
    if (typeof SFX_FILES === 'undefined') return;
    const emb = typeof SFX_B64 !== 'undefined' ? SFX_B64 : {};
    const fromB64 = s => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
    this.total = SFX_FILES.length;
    // the sounds you hear in a fight decode first; music and crowd beds last
    const order = SFX_FILES.slice().sort((a, b) => (/^comm_|^vo/.test(b) ? 1 : 0) - (/^comm_|^vo/.test(a) ? 1 : 0) || (/music|crowd|cheer/.test(a) ? 1 : 0) - (/music|crowd|cheer/.test(b) ? 1 : 0));
    for (const k of order) {
      const pre = k.replace(/\d+$/, ''); if (pre !== k) this.counts[pre] = (this.counts[pre] || 0) + 1;
      const src = emb[k] ? Promise.resolve(fromB64(emb[k])) : fetch('audio/' + k + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error('missing')));
      src.then(ab => new Promise((res, rej) => { const p = this.ctx.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); }))
        .then(b => { this.buf[k] = b; this.loaded++; if (emb[k]) delete emb[k]; if (k === 'crowdBed') this.startBed(); if (k === 'music_battle' && this.wantMusic) this.music(true); if (k === 'music_market' && this.wantMarket) this.market(true); if (/^amb_/.test(k) && this.wantAmb) this.amb(this.wantAmb); })
        .catch(() => { this.failed++; });
    }
  },
  play(name, vol = 1, rate = 1, when = 0, out) {
    const b = this.buf[name]; if (!b || !this.ctx) return null;
    const s = this.ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(out || this.master); s.start(this.ctx.currentTime + when); return s;
  },
  any(prefix, vol, rate, when) {
    const n = this.counts[prefix] || 0; if (!n) return null;
    let i = (Math.random() * n) | 0; if (n > 1 && i === this['last_' + prefix]) i = (i + 1) % n; this['last_' + prefix] = i;
    return this.play(prefix + i, vol, rate, when);
  },
  // crowd bed (Gregor Quendel, CC BY 4.0) looping under everything
  startBed() {
    if (this.bed || !this.buf.crowdBed) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.buf.crowdBed; s.loop = true;
    this.bedGain = this.ctx.createGain(); this.bedGain.gain.value = this.crowdTarget * 4; s.connect(this.bedGain); this.bedGain.connect(this.master); s.start(); this.bed = s;
    if (this.crowd) this.crowd.gain.value = 0;
  },
  wantMusic: false,
  music(on) {
    this.wantMusic = on; if (!this.ctx) return;
    if (on) this.market(false);
    if (!this.musicGain) { this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0; this.musicGain.connect(this.master); }
    const t = this.ctx.currentTime;
    if (on && this.buf.music_battle && !this.musicSrc) { const s = this.ctx.createBufferSource(); s.buffer = this.buf.music_battle; s.loop = true; s.connect(this.musicGain); s.start(); this.musicSrc = s; }
    this.musicGain.gain.cancelScheduledValues(t); this.musicGain.gain.setTargetAtTime(on ? 0.32 : 0, t, on ? 0.8 : 0.4);
    if (!on && this.musicSrc) { const s = this.musicSrc; this.musicSrc = null; setTimeout(() => { try { s.stop(); } catch (e) { } }, 2500); }
  },
  market(on) {
    this.wantMarket = on; if (!this.ctx) return;
    if (on && !this.marketSrc && this.buf.music_market) { const s = this.ctx.createBufferSource(); s.buffer = this.buf.music_market; s.loop = true; this.marketGain = this.ctx.createGain(); this.marketGain.gain.value = 0; s.connect(this.marketGain); this.marketGain.connect(this.master); s.start(); this.marketSrc = s; }
    if (this.marketGain) this.marketGain.gain.setTargetAtTime(on ? 0.14 : 0, this.ctx.currentTime, on ? 1.2 : 0.4);
    if (!on && this.marketSrc) { const s = this.marketSrc; this.marketSrc = null; setTimeout(() => { try { s.stop(); } catch (e) { } }, 2500); }
  },
  // recorded steel (Still North Media): a weapon landing on plate, with a little blade ring on top
  // youth division: foam and rubber make bonks, boings and squishes
  bonk(v = 1) { if (!this.ctx) return; const f0 = rand(360, 520); this.tone(f0, 0.17, 0.2 * v, 'sine', 0, 0.45); this.tone(f0 * 2.03, 0.08, 0.05 * v, 'triangle', 0, 0.55); this.noise(0.07, 800, 0.8, 0.14 * v, 'lowpass'); },
  squish(v = 1) { if (!this.ctx) return; this.noise(0.14, 520, 0.7, 0.26 * v, 'lowpass'); this.tone(rand(170, 230), 0.13, 0.12 * v, 'sine', 0, 0.6); },
  boing(v = 1) {
    if (!this.ctx) return; const c = this.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(130, t0); o.frequency.exponentialRampToValueAtTime(430, t0 + 0.08); o.frequency.exponentialRampToValueAtTime(170, t0 + 0.4);
    lfo.frequency.value = 17; lg.gain.value = 28; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.22 * v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.48);
    o.connect(g); g.connect(this.master); o.start(t0); lfo.start(t0); o.stop(t0 + 0.52); lfo.stop(t0 + 0.52);
  },
  armourHit(intensity, vol) { const v = clamp(intensity, 0.2, 1.6) * vol; if (this.cute) { this.bonk(v); if (v > 1) this.any('punch', 0.25 * v, 1.4); return; } if (!this.any('heavy', 0.9 * v, rand(0.92, 1.08))) return this.clang(intensity, vol); this.any('clash', 0.22 * v, rand(0.95, 1.1), 0.004); },
  block(kind, intensity, vol) {
    const v = clamp(intensity, 0.2, 1.6) * vol; if (this.cute) { this.squish(v); if (kind !== 'heater') this.bonk(v * 0.4); return; }
    if (kind === 'heater') { if (!this.any('wood', 0.6 * v, rand(0.85, 1.05))) return this.shieldHit(intensity, vol); this.any('heavy', 0.45 * v, rand(0.9, 1.1), 0.004); }
    else if (kind === 'haft') { if (!this.any('haft', 0.85 * v, rand(0.9, 1.1))) this.shieldHit(intensity, vol); this.any('clash', 0.18 * v, rand(0.95, 1.1), 0.003); }
    else if (!this.any(Math.random() < 0.4 && this.counts.snclash ? 'snclash' : 'clash', 0.9 * v, rand(0.94, 1.06))) this.clang(intensity, vol);
  },
  swing(heavy, vol) { if (!this.any(heavy ? 'swingH' : 'swingL', 0.45 * vol * (this.cute ? 0.6 : 1), rand(0.9, 1.15) * (this.cute ? 1.35 : 1))) this.whoosh(vol); },
  grunt(vol) { const fem = G.match && G.match.category === 'women'; this.any('grunt', 0.5 * vol * (this.cute ? 0.7 : fem ? 0.8 : 1), rand(0.9, 1.08) * (this.cute ? 1.55 : fem ? 1.32 : 1)); }, // kids: same voices, way higher
  yell(vol) { const fem = G.match && G.match.category === 'women'; this.any('yell', 0.5 * vol * (this.cute ? 0.7 : fem ? 0.8 : 1), rand(0.92, 1.05) * (this.cute ? 1.5 : fem ? 1.3 : 1)); },
  step(vol) { if (!this.ctx) return; if (this.cute) { this.any('step', 0.35 * vol, rand(1.25, 1.45)); return; } if (!this.any('mstep', 0.55 * vol, rand(0.9, 1.1))) this.any('step', 0.5 * vol, rand(0.9, 1.1)); },
  vo(name) { const fem = G.match && G.match.category === 'women' && this.buf['vof_' + name]; return this.play((fem ? 'vof_' : 'vo_') + name, 0.9); }, // women's division gets the female announcer
  gong(v = 1) { if (!this.play('gong', 0.55 * v, rand(0.97, 1.03))) this.bong(v * 0.6); },
  // venue ambience under the crowd: wind and birds on the summer field, crickets and fire at the castle
  amb(key) {
    this.wantAmb = key; if (!this.ctx) return;
    const name = key === 'field' || key === 'fair' || key === 'peasant' || key === 'forest' || key === 'beach' ? 'amb_field' : key === 'castle' || key === 'rink' || key === 'hall' ? 'amb_night' : null;
    if (this.ambName === name && (this.ambSrc || !name)) return;
    if (this.ambSrc) { const s = this.ambSrc, g = this.ambGain; g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4); setTimeout(() => { try { s.stop(); } catch (e) { } }, 1500); this.ambSrc = null; }
    this.ambName = name; if (!name || !this.buf[name]) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.buf[name]; s.loop = true; const g = this.ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.42, this.ctx.currentTime, 1); s.connect(g); g.connect(this.master); s.start(); this.ambSrc = s; this.ambGain = g;
  },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05); if (m) { if (window.speechSynthesis) speechSynthesis.cancel(); if (typeof COMM_AUDIO !== 'undefined') COMM_AUDIO.stop(); } },
  t() { return this.ctx ? this.ctx.currentTime : 0; },
  noise(dur, freq, q, gain, type = 'bandpass', when = 0, attack = 0.002) {
    if (!this.ctx) return; const ctx = this.ctx, t0 = ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = rand(0.8, 1.2);
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t0, rand(0, 1.5)); s.stop(t0 + dur + 0.05);
  },
  tone(freq, dur, gain, type = 'sine', when = 0, slide = 0) {
    if (!this.ctx) return; const ctx = this.ctx, t0 = ctx.currentTime + when;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0006, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05);
  },
  // steel on steel: inharmonic partials + a short bright burst
  clang(intensity = 1, vol = 1) {
    if (!this.ctx) return; const v = clamp(intensity, 0.2, 1.6) * vol;
    if (this.any('clash', 0.6 * v, rand(0.9, 1.1))) return;
    if (this.any('metal', 0.55 * v, rand(0.88, 1.12))) { this.any('plate', 0.35 * v, rand(0.85, 1.1), 0.01); return; }
    const f0 = rand(330, 620);
    [1, 2.31, 3.87, 5.43, 7.1].forEach((r, i) => this.tone(f0 * r, rand(0.25, 0.7) / (1 + i * 0.35), 0.11 * v / (1 + i * 0.6), 'sine'));
    this.noise(0.09, rand(2500, 4200), 1.2, 0.35 * v, 'bandpass');
    this.noise(0.18, 900, 0.8, 0.18 * v, 'bandpass');
  },
  shieldHit(intensity = 1, vol = 1) {
    if (!this.ctx) return; const v = clamp(intensity, 0.2, 1.6) * vol; if (this.cute) return this.squish(v);
    if (this.any('wood', 0.7 * v, rand(0.85, 1.05))) { this.any('metalm', 0.25 * v, rand(0.9, 1.1), 0.005); return; }
    this.tone(rand(95, 140), 0.22, 0.32 * v, 'sine', 0, 0.6);
    this.noise(0.16, 700, 0.9, 0.38 * v, 'lowpass');
    this.tone(rand(700, 900), 0.12, 0.05 * v, 'triangle');
  },
  thud(intensity = 1, vol = 1) { if (!this.ctx) return; const v = clamp(intensity, 0.2, 1.5) * vol; if (this.cute) return this.squish(v); if (this.any('punch', 0.6 * v, rand(0.85, 1.05))) return; this.tone(rand(60, 85), 0.3, 0.4 * v, 'sine', 0, 0.5); this.noise(0.22, 320, 0.7, 0.3 * v, 'lowpass'); },
  crash(vol = 1) { // body in harness hitting concrete
    if (!this.ctx) return; if (typeof boutEar === 'function') { vol *= boutEar(0, 0); if (vol < 0.05) return; } if (this.cute) { this.boing(vol); this.squish(vol * 0.8); return; }
    if (this.any('soft', 0.8 * vol, rand(0.8, 0.95))) { this.any('platel', 0.5 * vol, rand(0.9, 1.1), 0.05); this.any('platel', 0.35 * vol, rand(0.9, 1.1), 0.16); this.any('metalm', 0.25 * vol, rand(0.8, 1), 0.1); return; }
    this.thud(1.3, vol);
    for (let i = 0; i < 4; i++) { const f0 = rand(500, 1100); this.tone(f0, 0.18, 0.05 * vol, 'triangle', 0.04 + i * rand(0.04, 0.09)); this.noise(0.06, rand(2000, 3500), 1.5, 0.12 * vol, 'bandpass', 0.04 + i * 0.07); }
  },
  whoosh(vol = 1) { this.noise(0.2, 700, 0.9, 0.06 * vol, 'bandpass', 0, 0.07); },
  rip(q = 1) { // tape tearing
    if (!this.ctx) return; if (this.play('taperip', 0.6 + 0.3 * q, rand(0.92, 1.08))) return; for (let i = 0; i < 9; i++) this.noise(0.03, rand(1800, 5200), 2, rand(0.08, 0.2) * q, 'bandpass', i * rand(0.012, 0.025));
  },
  wrap() { if (!this.any('cloth', 0.5, rand(1.1, 1.4))) this.noise(0.12, rand(1200, 2000), 1.5, 0.06, 'bandpass', 0, 0.04); },
  click() { if (!this.play('click', 0.5)) this.tone(1400, 0.05, 0.05, 'square'); },
  cheer(amount = 1) {
    if (!this.ctx) return; if (typeof boutEar === 'function') { amount *= boutEar(0, 0); if (amount < 0.05) return; }
    if (this.buf.cheerSoft) { const big = amount >= 1.2; this.play(big ? 'cheerBig' : 'cheerSoft', (big ? 0.5 : 0.32) * Math.min(1.4, amount), rand(0.95, 1.05)); return; }
    if (!this.crowd) return; const t = this.ctx.currentTime;
    this.crowd.gain.cancelScheduledValues(t); this.crowd.gain.setTargetAtTime(this.crowdTarget + 0.12 * amount, t, 0.1); this.crowd.gain.setTargetAtTime(this.crowdTarget, t + 0.8, 0.7);
  },
  setCrowd(level) { this.crowdTarget = level; if (!this.ctx) return; if (this.bedGain) this.bedGain.gain.setTargetAtTime(level * 4, this.ctx.currentTime, 0.5); else if (this.crowd) this.crowd.gain.setTargetAtTime(level, this.ctx.currentTime, 0.5); },
  // breathing inside the helm: a sucked-in breath through the visor, then a hard push out. Louder and quicker as you tire
  breath(k) {
    if (!this.ctx) return; const v = 0.035 + 0.11 * k, gap = 0.5 - 0.22 * k;
    this.noise(gap * 0.9, 1500 + 400 * k, 1.1, v * 0.6, 'bandpass', 0, gap * 0.6);
    this.noise(0.42 - 0.1 * k, 620, 0.8, v, 'bandpass', gap, 0.05);
    if (k > 0.6) this.noise(0.2, 260, 0.7, v * 0.5, 'lowpass', gap + 0.02, 0.03);
  },
  // heartbeat in your ears when you're spent
  heart(k) { if (!this.ctx) return; const v = clamp(k, 0, 1); this.tone(62, 0.14, 0.22 * v, 'sine', 0, 0.6); this.tone(55, 0.16, 0.16 * v, 'sine', 0.2, 0.6); },
  // Special rack noises (synthesised)
  squeak(vol = 1) { if (!this.ctx) return; this.tone(rand(880, 1000), 0.16, 0.12 * vol, 'square', 0, 1.6); this.tone(rand(1300, 1500), 0.1, 0.08 * vol, 'square', 0.13, 0.7); },
  bong(vol = 1) { if (!this.ctx) return; const f0 = rand(300, 340); [1, 2.76, 5.4, 8.9].forEach((r, i) => this.tone(f0 * r, 1.4 / (1 + i * 0.5), 0.2 * vol / (1 + i * 0.7), 'sine')); this.any('clash', 0.35 * vol, 0.8); },
  crackle(vol = 1) { if (!this.ctx) return; for (let i = 0; i < 7; i++) this.noise(0.03, rand(3000, 7000), 3, rand(0.1, 0.25) * vol, 'bandpass', i * rand(0.02, 0.05)); },
  test(kind) {
    this.init(); if (!this.ctx) return;
    if (kind === 'steel') this.block('clash', 1.1, 1);
    else if (kind === 'armour') this.armourHit(1.1, 1);
    else if (kind === 'shield') this.block('heater', 1.1, 1);
    else if (kind === 'crowd') this.cheer(1.3);
  },
  status() {
    if (!this.ctx) return 'Tap a sound to start audio.';
    if (this.loaded < this.total && !this.failed) return `Loading recorded sounds: ${this.loaded} of ${this.total}…`;
    return `Recorded sounds ready: ${this.loaded} of ${this.total}` + (this.failed ? ` (${this.failed} could not decode, using synth for those)` : '') + (this.muted ? '. Sound is muted in the fight HUD.' : '.');
  },
  setBell(b, muffle = 0) { if (!this.lp) return; const f = Math.min(b > 0.05 ? lerp(18000, 900, b) : 18000, lerp(18000, 2400, muffle)); if (Math.abs(f - (this._lpF || 0)) > 50) { this._lpF = f; this.lp.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05); } }
};

// The announcer and the marshal speak through the device's speech engine. The best voice the device has is picked
// (the natural / premium / Google ones first, deep male ones for the ring), the music ducks while they talk, and the
// lines are delivered with a ring announcer's cadence. Settings lets you pick any English voice instead.
const VOICE = {
  q: [], busy: false, voice: null, co: null, enabled: true,
  score(v) {
    const n = v.name || '', l = v.lang || ''; let s = 0;
    if (!/^en/i.test(l)) return -1;
    if (/natural|premium|enhanced|neural/i.test(n)) s += 40;
    if (/google/i.test(n)) s += 18;
    if (/\b(daniel|oliver|arthur|george|ryan|guy|christopher|eric|roger|brian|james|aaron|alex|fred|david|mark|rishi|thomas|liam|andrew)\b/i.test(n)) s += 14;
    if (/male/i.test(n) && !/female/i.test(n)) s += 10;
    if (/female|zira|susan|hazel|aria|jenny|michelle|libby|sonia|emma|ana|samantha|karen|moira|tessa|fiona|victoria|zoe|catherine|hayley|clara|siri/i.test(n)) s -= 12;
    if (/en-(GB|CA|AU|IE)/i.test(l)) s += 6; else if (/en-US/i.test(l)) s += 4;
    if (/compact|eloquence|novelty|whisper|bad news|bells|boing|bubbles|cellos|zarvox|trinoids|organ|jester|wobble|superstar|grandma|grandpa|rocko|shelley|junior|kathy|ralph|albert|flo/i.test(n)) s -= 40;
    if (v.localService) s += 2;
    return s;
  },
  list() { if (!window.speechSynthesis) return []; return speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang || '')).sort((a, b) => this.score(b) - this.score(a)); },
  pickVoice() {
    const vs = this.list(); if (!vs.length) return;
    const want = (typeof G !== 'undefined' && G.settings && G.settings.voiceName) || '';
    this.voice = (want && vs.find(v => v.name === want)) || vs[0];
    this.co = vs.find(v => v !== this.voice && /female|zira|susan|hazel|aria|jenny|libby|sonia|emma|samantha|karen|moira|fiona|victoria|zoe|catherine|clara|natural|google/i.test(v.name)) || vs.find(v => v !== this.voice) || this.voice;
  },
  // a ring announcer's cadence: the big word first, a beat, then the rest
  shape(text) { return String(text).replace(/\s+/g, ' ').replace(/^([A-Z][A-Z ]{2,}!?)\s/, '$1. ').replace(/\.\s/g, '. ').trim(); },
  duck(on) { try { if (AU.musicGain && AU.ctx) { AU.musicGain.gain.cancelScheduledValues(AU.ctx.currentTime); AU.musicGain.gain.setTargetAtTime(on ? 0.08 : (AU.wantMusic ? 0.32 : 0), AU.ctx.currentTime, on ? 0.08 : 0.6); } } catch (e) { } },
  speak(text, who, priority) {
    if (!window.speechSynthesis) return;
    if (priority >= 3) speechSynthesis.cancel(); else if (speechSynthesis.speaking && priority < 2) return;
    if (!this.voice) this.pickVoice();
    const u = new SpeechSynthesisUtterance(this.shape(text));
    const v = who === 'co' ? this.co : this.voice; if (v) u.voice = v;
    if (who === 'co') { u.rate = 1.06; u.pitch = 1.0; u.volume = 0.85; } else if (who === 'marshal') { u.rate = 1.04; u.pitch = 0.9; u.volume = 1; } else { u.rate = 0.96; u.pitch = 0.78; u.volume = 1; }
    u.onstart = () => this.duck(true); u.onend = u.onerror = () => { if (!speechSynthesis.speaking) this.duck(false); };
    speechSynthesis.speak(u);
  },
  say(text, priority = 1) {
    if (!this.enabled || AU.muted) return;
    try { this.speak(text, 'marshal', priority); } catch (e) { /* no speech engine */ }
  },
  // Settings: a dropdown of the device's English voices, best first, with a Test button
  fillPicker(sel) {
    if (!sel) return; const vs = this.list(); sel.innerHTML = '';
    sel.append(h('option', { value: '' }, vs.length ? `Best available (${vs[0].name})` : 'No voices on this device'));
    for (const v of vs) sel.append(h('option', { value: v.name, selected: G.settings.voiceName === v.name ? '' : null }, `${v.name} (${v.lang})`));
    sel.onchange = () => { G.settings.voiceName = sel.value; store.set('settings3', G.settings); this.voice = null; this.pickVoice(); this.test(); };
  },
  test() { try { AU.init(); const was = this.enabled; this.enabled = true; this.speak('Ladies and gentlemen. The Reavers take the list. Fighters, to your marks!', 'pa', 3); this.enabled = was; } catch (e) { } }
};
if (window.speechSynthesis) { try { speechSynthesis.onvoiceschanged = () => VOICE.pickVoice(); } catch (e) { } }
// Android browsers keep Web Audio running after the app is minimized unless we suspend it.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (AU.ctx && AU.ctx.state === 'running') AU.ctx.suspend().catch(() => {});
    if (window.speechSynthesis) speechSynthesis.cancel();
  } else if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => {});
});

