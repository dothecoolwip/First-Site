// ===================================================================
// Cosmetic weapon skins (CC0 orc and fantasy weapon packs). Looks only: the weapon underneath keeps its class,
// weight, reach and every stat. A skin fits one family of weapon (one-hand blades, longswords, axes, longaxes, maces, polearms).
// ===================================================================
const WSKIN_FAM = { mace: 'mace', axe: 'axe', sword: 'sword', falchion: 'sword', short: 'sword', longsword: 'longsword', longaxe: 'longaxe', polearm: 'polearm' };
const WSKIN_FAM_NAME = { sword: 'One-hand blades', longsword: 'Longswords', axe: 'Axes', longaxe: 'Longaxes and mauls', mace: 'Maces, hammers and clubs', polearm: 'Polearms' };
const WSKIN_BUTT = { mace: -0.1, axe: -0.1, longaxe: -0.32, polearm: -0.45 };
const WSKIN_BLADE = { sword: 0.9, falchion: 0.82, short: 0.74, longsword: 1.2 }; // pommel to tip
const WSKIN_GRIP = { sword: 0.15, falchion: 0.15, short: 0.15, longsword: 0.3 }; // how far the pommel sits below the hand
// rarity sets the price; the fanciest pieces cost the most
const WSKIN_RARE = { orc_flintaxe: 0, orc_boneshort: 0, orc_skullclub: 0, orc_hidespear: 0, orc_tuskaxe: 0, fw_rootcudgel: 0, orc_chopper: 1, orc_warclub: 1, orc_bonemace: 1, orc_jawbone: 1, orc_warpick: 1, orc_hookspear: 1, orc_maul: 1, fw_khopesh: 1, fw_frostbite: 1, orc_skullsplitter: 2, orc_greataxe: 2, orc_sawtooth: 2, orc_halberd: 2, orc_warhammer: 2, fw_scimitar: 2, fw_sunsteel: 2, fw_serpent: 2, fw_amber: 2, fw_moonstone: 2, fw_bardiche: 2, orc_warboss: 3, fw_flamberge: 3, fw_dragonfang: 3, fw_void: 3, fw_dragonclaw: 3, fw_crystal: 3, fw_glaive: 3 };
const PACK_SKINS = {
  pack_bronze_sword: { n: 'Bronze festival sword', f: 'sword', model: 'Sword_Bronze' },
  pack_bronze_axe: { n: 'Bronze festival axe', f: 'axe', model: 'Axe_Bronze' },
};
Object.assign(WSKIN_RARE, { pack_bronze_sword: 1, pack_bronze_axe: 1 });
const RARITY = [{ name: 'Common', cost: 2500, col: '#b9b4a8' }, { name: 'Rare', cost: 7500, col: '#4fa3ff' }, { name: 'Epic', cost: 20000, col: '#b26bff' }, { name: 'Legendary', cost: 45000, col: '#ffb02e' }];
const WSKIN_GEOS = {};
function wskinList(fam) { return [...(typeof WSKIN_GEO === 'undefined' ? [] : Object.keys(WSKIN_GEO)), ...Object.keys(PACK_SKINS)].filter(k => !fam || (WSKIN_GEO[k] || PACK_SKINS[k]).f === fam); }
function wskinCost(k) { return RARITY[WSKIN_RARE[k] || 0].cost; }
function wskinGeo(k) {
  if (WSKIN_GEOS[k]) return WSKIN_GEOS[k];
  const S = WSKIN_GEO[k], u8 = s => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  const p = new Int16Array(u8(S.p).buffer), c = u8(S.c), ix = new Uint16Array(u8(S.i).buffer);
  const pos = new Float32Array(p.length), col = new Float32Array(c.length);
  for (let i = 0; i < p.length; i++) pos[i] = p[i] / 16000;
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  for (let i = 0; i < c.length; i++) col[i] = lin(c[i]);
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(new THREE.BufferAttribute(ix, 1));
  g = g.toNonIndexed(); g.computeVertexNormals(); g.computeBoundingSphere();
  return WSKIN_GEOS[k] = g;
}
const WSKIN_MAT = () => MAT.wskin || (MAT.wskin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.2, flatShading: true, side: THREE.DoubleSide }));
// the skin model sized to stand in for weapon `wkey` (same grip point, same reach)
function buildSkinWeapon(skin, wkey) {
  if (PACK_SKINS[skin]) { const g = libraryWeapon(PACK_SKINS[skin].model, wkey); g.userData.skin = skin; return g; }
  if (typeof WSKIN_GEO === 'undefined' || !WSKIN_GEO[skin]) return null;
  const W = WEAPONS[wkey]; if (!W) return null;
  const g = new THREE.Group(), m = new THREE.Mesh(wskinGeo(skin), WSKIN_MAT()); g.add(m);
  if (W.haft) { m.scale.setScalar(W.len); m.position.y = WSKIN_BUTT[wkey] != null ? WSKIN_BUTT[wkey] : -0.1; }
  else { m.scale.setScalar(WSKIN_BLADE[wkey] || W.len); m.position.y = -(WSKIN_GRIP[wkey] || 0.15); }
  const wrap = new THREE.Mesh(geo('grip', () => new THREE.CylinderGeometry(0.021, 0.021, 0.14, 8)), MAT.tape.black); wrap.visible = false; wrap.userData.keep = true; g.add(wrap); g.userData.wrap = wrap;
  g.userData.skin = skin;
  return g;
}
// which skin you've put on a weapon (null = plain steel)
function skinFor(wkey) {
  const s = shopState(); s.wskin = s.wskin || {};
  const base = wkey === 'custom' && WEAPONS.custom ? WEAPONS.custom.base : wkey, fam = WSKIN_FAM[base];
  const k = fam && s.wskin[fam], def = k && (WSKIN_GEO[k] || PACK_SKINS[k]); return def && def.f === fam && s.owned['ws:' + k] ? k : null;
}
// your weapon as everyone sees it: the skin if you've equipped one
function buildMyWeapon(wkey, club) {
  const sk = !CUTE.on && skinFor(wkey);
  if (sk) { const base = wkey === 'custom' && WEAPONS.custom ? WEAPONS.custom.base : wkey; const g = buildSkinWeapon(sk, base); if (g) { if (wkey === 'custom' && WEAPONS.custom) g.scale.set(1, WEAPONS.custom.len / WEAPONS[base].len, 1); return g; } }
  const g = buildWeapon(wkey, club), v = shopState().variant && shopState().variant[wkey];
  const def = WEAPON_VARIANTS.find(x => x.id === v && x.base === wkey);
  if (def && shopState().owned['variant:' + v]) g.scale.y *= def.len / WEAPONS[wkey].len;
  return g;
}
// a picture of a skin for the shop card
const WSKIN_ICONS = {};
function skinIcon(k, W = 160, H = 160) {
  if (PACK_SKINS[k]) return libraryThumb(PACK_SKINS[k].model, W, H);
  if (WSKIN_ICONS[k]) { const c = cvs(W, H); c.getContext('2d').drawImage(WSKIN_ICONS[k], 0, 0, W, H); return c; }
  const c = cvs(W, H), x = c.getContext('2d'), g = wskinGeo(k), pa = g.attributes.position, ca = g.attributes.color;
  // lay it diagonally, flat side to the viewer
  const a = -Math.PI / 4, ca0 = Math.cos(a), sa = Math.sin(a), tris = [];
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const P = i => { const px = pa.getX(i), py = pa.getY(i), pz = pa.getZ(i); return [px * ca0 - py * sa, px * sa + py * ca0, pz]; };
  for (let i = 0; i < pa.count; i++) { const [u, v] = P(i); x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
  const s = Math.min((W - 16) / (x1 - x0), (H - 16) / (y1 - y0)), ox = W / 2 - (x0 + x1) / 2 * s, oy = H / 2 + (y0 + y1) / 2 * s;
  const L = new THREE.Vector3(0.4, 0.5, 0.75).normalize(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
  const toS = v => Math.round(Math.pow(Math.min(1, v), 1 / 2.2) * 255);
  for (let i = 0; i < pa.count; i += 3) {
    const A = P(i), B = P(i + 1), C = P(i + 2);
    e1.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]); e2.set(C[0] - A[0], C[1] - A[1], C[2] - A[2]); n.crossVectors(e1, e2).normalize();
    const lit = 0.45 + 0.75 * Math.abs(n.dot(L));
    const r = (ca.getX(i) + ca.getX(i + 1) + ca.getX(i + 2)) / 3 * lit, gg = (ca.getY(i) + ca.getY(i + 1) + ca.getY(i + 2)) / 3 * lit, b = (ca.getZ(i) + ca.getZ(i + 1) + ca.getZ(i + 2)) / 3 * lit;
    tris.push({ z: A[2] + B[2] + C[2], pts: [A, B, C], col: `rgb(${toS(r)},${toS(gg)},${toS(b)})` });
  }
  tris.sort((p, q) => p.z - q.z);
  for (const t of tris) { x.fillStyle = t.col; x.strokeStyle = t.col; x.lineWidth = 0.6; x.beginPath(); t.pts.forEach(([u, v], j) => { const X = ox + u * s, Y = oy - v * s; if (j) x.lineTo(X, Y); else x.moveTo(X, Y); }); x.closePath(); x.fill(); x.stroke(); }
  WSKIN_ICONS[k] = c; const out = cvs(W, H); out.getContext('2d').drawImage(c, 0, 0); return out;
}
function wskinFamOf(k) { const def = (typeof WSKIN_GEO !== 'undefined' && WSKIN_GEO[k]) || PACK_SKINS[k]; return def ? def.f : null; }
function wskinName(k) { const def = (typeof WSKIN_GEO !== 'undefined' && WSKIN_GEO[k]) || PACK_SKINS[k]; return def ? def.n : k; }
// the artificer's counter: one tab per kind of weapon, your own weapon's kind first
function renderArtificer(list, row, head) {
  const s = shopState(); s.wskin = s.wskin || {};
  const mine = WSKIN_FAM[(G.loadout && G.loadout.weapon) || 'mace'] || 'mace';
  const fams = ['sword', 'longsword', 'axe', 'longaxe', 'mace', 'polearm'].sort((a, b) => (b === mine) - (a === mine));
  for (const fam of fams) {
    const ks = wskinList(fam); if (!ks.length) continue;
    head(WSKIN_FAM_NAME[fam] + (fam === mine ? ' (yours)' : ''));
    const fits = PICK_WEAPONS.filter(w => WSKIN_FAM[w] === fam).map(w => WEAPONS[w].name).join(', ');
    list.append(h('p', { class: 'muted small' }, `Fits: ${fits}. Looks only: same weight, reach and speed. The real weapon still passes the kit check.`));
    const on0 = !s.wskin[fam];
    row('Plain steel', on0 ? 'Equipped' : null, 'The weapon as the smith made it.', on0 ? 'Equipped' : 'Equip', !on0, () => { delete s.wskin[fam]; saveCareer(); toastMenu('Back to plain steel.'); }, on0 ? ' cur' : '', weaponIcon(PICK_WEAPONS.find(w => WSKIN_FAM[w] === fam), 120, 36));
    ks.sort((a, b) => (WSKIN_RARE[a] || 0) - (WSKIN_RARE[b] || 0));
    for (const k of ks) {
      const R = RARITY[WSKIN_RARE[k] || 0], own = !!s.owned['ws:' + k], on = s.wskin[fam] === k, cost = wskinCost(k);
      const r = row(wskinName(k), on ? 'Equipped' : own ? 'Owned' : R.name, own ? 'Yours. Equip it any time.' : `${R.name} look for your ${WSKIN_FAM_NAME[fam].toLowerCase().replace(/s$/, '').replace(/s,/, ',')}.`, on ? 'Equipped' : own ? 'Equip' : `Buy ${fmtMoney(cost)}`, !on && (own || CAREER.purse >= cost),
        () => { if (!own) { if (!spend(cost, wskinName(k))) return false; s.owned['ws:' + k] = 1; } s.wskin[fam] = k; saveCareer(); toastMenu(`${wskinName(k)} equipped. You'll see it in your next fight.`); if (typeof townDressMe === 'function') townDressMe(); }, (on ? ' cur' : '') + ' r' + (WSKIN_RARE[k] || 0), skinIcon(k, 96, 96),
        own ? null : { skill: 'artificing', R: skinMats(k), apply: () => { s.owned['ws:' + k] = 1; s.wskin[fam] = k; toastMenu(`${wskinName(k)} made and equipped.`); if (typeof townDressMe === 'function') townDressMe(); }, label: 'Craft it' });
      r.style.setProperty('--rc', R.col);
    }
  }
}

