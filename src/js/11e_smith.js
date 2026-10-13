// ---------- weapon smith: build your own weapon; the Technical Marshal checks it against the weapon rules ----------
const SMITH = {
  sword1: { base: 'sword', name: 'Arming sword', cls: 'Type 1 bladed', m: [1.1, 1.7], l: [0.72, 1.0], hands: 1 },
  sword2: { base: 'longsword', name: 'Longsword', cls: 'Type 2 bladed', m: [1.7, 2.3], l: [1.0, 1.4], hands: 2 },
  axe1: { base: 'axe', name: 'Axe', cls: 'Type 2 hafted', m: [0.7, 1.3], l: [0.5, 0.9], hands: 1 },
  axe2: { base: 'longaxe', name: 'Longaxe', cls: 'Type 3 hafted', m: [1.3, 2.5], l: [0.9, 1.3], hands: 2 },
  mace1: { base: 'mace', name: 'Mace', cls: 'Type 1 hafted', m: [0.7, 1.3], l: [0.5, 0.7], hands: 1 },
  hammer2: { base: 'polearm', name: 'War hammer', cls: 'Type 4 hafted', m: [2.2, 3.2], l: [1.3, 2.2], hands: 2 },
};
function smithState() { return CAREER.smith || (CAREER.smith = { type: 'sword1', mass: 1.4, len: 0.92, name: '', forged: null }); }
function smithLegal(s) { const T = SMITH[s.type]; return s.mass >= T.m[0] - 1e-6 && s.mass <= T.m[1] + 1e-6 && s.len >= T.l[0] - 1e-6 && s.len <= T.l[1] + 1e-6; }
function installForged() {
  const F = smithState().forged; if (!F) { delete WEAPONS.custom; return; }
  const T = SMITH[F.type], B = WEAPONS[T.base], legal = smithLegal(F);
  WEAPONS.custom = { ...B, key: 'custom', name: F.name || `Your ${T.name.toLowerCase()}`, mass: F.mass, len: F.len, cls: T.cls, spec: `${T.m[0]}–${T.m[1]} kg, ${Math.round(T.l[0] * 100)}–${Math.round(T.l[1] * 100)} cm`, base: T.base, fantasy: !legal, forged: true, feel: legal ? 'Your own forging. Passed the weapon check.' : 'Out of spec: exhibition only.' };
  if (!PICK_WEAPONS.includes('custom') && legal) PICK_WEAPONS.push('custom');
  if (PICK_WEAPONS.includes('custom') && !legal) PICK_WEAPONS.splice(PICK_WEAPONS.indexOf('custom'), 1);
  if (!legal && !FANTASY_WEAPONS.includes('custom')) FANTASY_WEAPONS.push('custom');
  if (legal && FANTASY_WEAPONS.includes('custom')) FANTASY_WEAPONS.splice(FANTASY_WEAPONS.indexOf('custom'), 1);
}
function renderSmith(box) {
  const S = smithState(), T = SMITH[S.type], legal = smithLegal(S);
  const wrap = h('div', { class: 'smith' });
  wrap.append(h('h3', null, 'Weapon smith'), h('p', { class: 'muted small' }, 'Pick a head and grip, set the weight and length, then forge it. Inside the rules it joins your Historical rack; outside them it’s exhibition only.'));
  const seg = h('div', { class: 'seg small' }); for (const [k, X] of Object.entries(SMITH)) seg.append(h('button', { 'aria-pressed': String(S.type === k), onclick: () => { S.type = k; S.mass = +((X.m[0] + X.m[1]) / 2).toFixed(2); S.len = +((X.l[0] + X.l[1]) / 2).toFixed(2); saveCareer(); renderCareer(); AU.click(); } }, `${X.name}${X.hands === 2 ? ' (2H)' : ''}`)); wrap.append(seg);
  const slider = (lab, key, lo, hi, step, fmt) => { const v = h('b', { class: 'num' }, fmt(S[key])); const r = h('input', { type: 'range', min: lo, max: hi, step, value: S[key] }); r.oninput = () => { S[key] = +r.value; v.textContent = fmt(S[key]); chk.textContent = smithLegal(S) ? `Within ${T.cls} (${T.m[0]}–${T.m[1]} kg, ${Math.round(T.l[0] * 100)}–${Math.round(T.l[1] * 100)} cm): passes` : `Outside ${T.cls}: exhibition only`; chk.className = 'smithchk ' + (smithLegal(S) ? 'ok' : 'no'); }; r.onchange = () => saveCareer(); return h('label', { class: 'toggle range' }, h('span', null, lab, v), r); };
  wrap.append(slider('Weight ', 'mass', +(T.m[0] - 0.4).toFixed(1), +(T.m[1] + 0.5).toFixed(1), 0.05, x => x.toFixed(2) + ' kg'), slider('Length ', 'len', +(T.l[0] - 0.15).toFixed(2), +(T.l[1] + 0.2).toFixed(2), 0.01, x => Math.round(x * 100) + ' cm'));
  const nm = h('input', { class: 'smithname', maxlength: 20, placeholder: `Name it (e.g. "Old Faithful")`, value: S.name || '' }); nm.oninput = () => { S.name = nm.value.trim(); };
  const chk = h('p', { class: 'smithchk ' + (legal ? 'ok' : 'no') }, legal ? `Within ${T.cls} (${T.m[0]}–${T.m[1]} kg, ${Math.round(T.l[0] * 100)}–${Math.round(T.l[1] * 100)} cm): passes` : `Outside ${T.cls}: exhibition only`);
  const cost = 80;
  const btn = h('button', { class: 'btn primary flagtape small', onclick: () => { if (CAREER.purse < cost) { toastMenu(`Forging costs ${fmtMoney(cost)}.`); return; } CAREER.purse -= cost; S.forged = { type: S.type, mass: S.mass, len: S.len, name: S.name }; saveCareer(); installForged(); G.loadout.weapon = 'custom'; G.loadout.wset = smithLegal(S) ? 'hist' : 'fantasy'; store.set('loadout', G.loadout); updateTitlePurse(); toastMenu(`${WEAPONS.custom.name} forged and equipped.`); renderCareer(); } }, `Forge it · ${fmtMoney(cost)}`);
  wrap.append(nm, chk, h('div', { class: 'row' }, btn, S.forged ? h('span', { class: 'muted small' }, `Current: ${WEAPONS.custom ? WEAPONS.custom.name : ''}, ${S.forged.mass.toFixed(2)} kg, ${Math.round(S.forged.len * 100)} cm`) : null));
  box.append(wrap);
}

