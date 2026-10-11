// ===================================================================
// Inventory: one bag with slots (materials stack to 99) and an equipment panel showing everything you wear and carry.
// Opens from Your fighter → Inventory and the bag button in the town HUD. A full bag stops gathering with a message.
// Materials still live in tradeState().inv (so trades and recipes are unchanged); the bag just counts their slots.
// ===================================================================
const BAG_STACK = 99, BAG_MAX = 50;
function bagState() { const b = CAREER.bag || (CAREER.bag = { size: 30, items: {} }); if (!b.items) b.items = {}; return b; }
// loot that isn't a material: documents and keepsakes from hidden places and tourneys
const BAG_ITEMS = {
  map_scrap: { name: 'Torn map scrap', icon: '🗺️', desc: 'Smudged ink: a mill, a wall, and a line between them.', stack: 1 },
  royal_seal: { name: 'Royal seal', icon: '🔏', desc: 'Wax and gold. Proof you’ve been somewhere you shouldn’t.', stack: 1 },
  old_coin: { name: 'Old coins', icon: '🪙', desc: 'From the bottom of a chest. Worth a little to the Land agent.', stack: 99 }
};
function bagSlots() {
  const t = tradeState(), b = bagState(); let n = 0;
  for (const m in t.inv) if (t.inv[m] > 0) n += Math.ceil(t.inv[m] / BAG_STACK);
  for (const k in b.items) if (b.items[k] > 0) n += Math.ceil(b.items[k] / ((BAG_ITEMS[k] && BAG_ITEMS[k].stack) || 1));
  return n;
}
// how many more of this material fit
function bagRoom(mat) { const have0 = tradeState().inv[mat] || 0, part = have0 % BAG_STACK ? BAG_STACK - have0 % BAG_STACK : 0; return part + Math.max(0, bagState().size - bagSlots()) * BAG_STACK; }
function bagAdd(key, n) { const b = bagState(); b.items[key] = (b.items[key] || 0) + n; saveCareer(); }
function bagDrop(mat, n) { const t = tradeState(); t.inv[mat] = Math.max(0, (t.inv[mat] || 0) - n); saveCareer(); }
// everything you wear and carry, slot by slot
function equipRows() {
  const L = lookState(), s = shopState(), t = tradeState(), lo = G.loadout || {};
  const nm = (slot, key) => { const it = LOOKS[slot] && LOOKS[slot].find(x => x[0] === key); return it ? it[1] : '—'; };
  const wk = lo.weapon || 'sword', fam = typeof wskinFamOf === 'function' ? wskinFamOf(wk) : wk, sk = s.wskin && s.wskin[fam];
  return [
    ['⚔️', 'Weapon', `${(WEAPONS[wk] || {}).name || wk}${s.wq && s.wq[wk] ? ', ' + QUAL_NAMES[s.wq[wk]] : ''}`],
    ['✨', 'Weapon look', sk && typeof wskinName === 'function' ? wskinName(sk) : 'Plain steel'],
    ['🛡️', 'Shield', lo.shield ? (SHIELDS[lo.shield] || {}).name || lo.shield : 'None'],
    ['⛑️', 'Helmet', lo.helm ? (HELMS[lo.helm] || {}).name || lo.helm : '—'],
    ['👕', 'Outfit', L.outfit && L.outfit !== 'none' ? nm('outfit', L.outfit) : 'Club tunic'],
    ['🎩', 'Hat', nm('hat', L.hat)], ['🧥', 'Cape', nm('cape', L.cape)], ['✋', 'In hand', nm('hand', L.hand)], ['🐾', 'Pet', nm('pet', L.pet)],
    ['⛏️', 'Pickaxe', TOOL_TIERS[t.tools.pick || 0]], ['🪓', 'Axe', TOOL_TIERS[t.tools.axe || 0]], ['🌾', 'Sickle', TOOL_TIERS[t.tools.sickle || 0]],
    ['🐴', 'Horse', s.owned.horse ? (s.owned.horse === 'white' ? 'White destrier' : 'Bay horse') : TOWN.horseRent ? 'Hired for today' : 'None'],
    ['📜', 'Writs', [CAREER.writs && CAREER.writs.bailey ? 'Bailey' : null, CAREER.writs && CAREER.writs.royal ? 'Royal' : null].filter(Boolean).join(', ') || 'None yet']
  ];
}
function renderInventory(box) {
  const t = tradeState(), b = bagState(), used = bagSlots();
  box.append(h('div', { class: 'invhead' }, h('b', null, 'Your bag'), h('span', { class: 'invbar' }, h('i', { style: `width:${Math.min(100, used / b.size * 100)}%` })), h('span', { class: 'num muted' }, `${used} / ${b.size} slots`)));
  if (used >= b.size) box.append(h('p', { class: 'small vtiernote' }, 'Your bag is full: gathering stops until you make room. Use materials at the furnace and anvil, or drop some. The Land agent sells a bigger bag.'));
  const grid = h('div', { class: 'invgrid' }), info = h('div', { class: 'invinfo muted small' }, 'Tap a slot to see what it is.');
  const tile = (icon, n, name, col, onPick) => { const el = h('button', { class: 'invslot', style: col ? `--c:${col}` : '', title: name, onclick: () => { grid.querySelectorAll('.invslot').forEach(x => x.classList.remove('on')); el.classList.add('on'); onPick(); } }, h('span', { class: 'si' }, icon), n > 1 ? h('b', { class: 'num' }, String(n)) : null); grid.append(el); };
  for (const m of Object.keys(MATS)) {
    let left = t.inv[m] || 0;
    while (left > 0) {
      const n = Math.min(BAG_STACK, left); left -= n;
      tile(MATS[m].icon, n, MATS[m].name, MATS[m].col, () => {
        info.innerHTML = ''; info.append(h('b', null, `${MATS[m].name} × ${t.inv[m] || 0}`), h('span', null, ` ${MATS[m].kind === 'ore' ? 'Smelt it at the furnace.' : MATS[m].kind === 'bar' ? 'Forge with it at the anvil.' : 'Used in recipes at the vendors.'}`),
          h('button', { class: 'btn tape small', onclick: () => { bagDrop(m, Math.min(BAG_STACK, t.inv[m] || 0)); box.innerHTML = ''; renderInventory(box); } }, 'Drop a stack'));
      });
    }
  }
  for (const k in b.items) if (b.items[k] > 0 && BAG_ITEMS[k]) { const I = BAG_ITEMS[k]; tile(I.icon, b.items[k], I.name, '#c9b48a', () => { info.innerHTML = ''; info.append(h('b', null, I.name), h('span', null, ' ' + I.desc)); }); }
  const s = shopState();
  for (const B of BOOSTS) { const left = s.boost[B.key] || 0; if (left) tile('🧪', left, B.name, '#7fc46a', () => { info.innerHTML = ''; info.append(h('b', null, B.name), h('span', null, ` ${left} match${left === 1 ? '' : 'es'} left. ${B.desc}`)); }); }
  for (let i = used; i < b.size; i++) grid.append(h('span', { class: 'invslot empty' }));
  box.append(grid, info);
  box.append(h('h4', null, 'Equipment'));
  const eq = h('div', { class: 'inveq' });
  for (const [icon, slot, val] of equipRows()) eq.append(h('div', { class: 'inveqrow' }, h('span', { class: 'si' }, icon), h('small', null, slot), h('b', null, val)));
  box.append(eq, h('p', { class: 'muted small' }, 'Change what you wear at Madame Velour’s wardrobe, weapon looks at the Artificer, tools at the furnace.'));
  if (typeof renderSecrets === 'function') renderSecrets(box);
}
