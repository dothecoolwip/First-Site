// ===================================================================
// Trades: skills you get better at by doing them. Gather round the festival (mining, woodcutting, foraging), then
// work the materials (forging, smithing, artificing) into the same upgrades and cosmetics the vendors sell for gold.
// Everything lives in CAREER.trades: xp per skill, the satchel, and which tools you've made.
// ===================================================================
const TRADE_SKILLS = {
  mining: { name: 'Mining', icon: '⛏️', desc: 'Ore, coal and crystal from the quarry in the Old Woods, the lake cliffs and the castle mine.', tool: 'pick' },
  woodcut: { name: 'Woodcutting', icon: '🪓', desc: 'Haft wood from the marked trees in the woods.', tool: 'axe' },
  forage: { name: 'Foraging', icon: '🌿', desc: 'Herbs, berries, flax, hides and bone from the fields, farm and graveyard.', tool: 'sickle' },
  forging: { name: 'Forging', icon: '🔥', desc: 'Ore to ingots at the furnace, and better tools.' },
  smithing: { name: 'Smithing', icon: '⚒️', desc: 'Weapon and armour quality and kit upgrades at the anvil, no gold needed.' },
  artificing: { name: 'Artificing', icon: '✨', desc: 'Weapon skins and outfits from bone, crystal, cloth and dye.' }
};
const TRADE_CAP = 50;
// materials: what they are, what they look like in the satchel
const MATS = {
  copper_ore: { name: 'Copper ore', icon: '🟤', col: '#b87333', kind: 'ore' }, iron_ore: { name: 'Iron ore', icon: '⚫', col: '#6e6a66', kind: 'ore' }, coal: { name: 'Coal', icon: '🪨', col: '#2a2a2a', kind: 'ore' },
  silver_ore: { name: 'Silver ore', icon: '⚪', col: '#c0c6cc', kind: 'ore' }, gold_ore: { name: 'Gold ore', icon: '🟡', col: '#e3b341', kind: 'ore' }, crystal: { name: 'Crystal', icon: '💎', col: '#9fe3ff', kind: 'ore' },
  ash: { name: 'Ash wood', icon: '🪵', col: '#c9b48a', kind: 'wood' }, oak: { name: 'Oak wood', icon: '🪵', col: '#8a5a2a', kind: 'wood' }, hickory: { name: 'Hickory wood', icon: '🪵', col: '#5a3a1a', kind: 'wood' },
  herb: { name: 'Herbs', icon: '🌿', col: '#4caf50', kind: 'forage' }, berry: { name: 'Berries', icon: '🫐', col: '#7b2d8e', kind: 'forage' }, flax: { name: 'Flax', icon: '🌾', col: '#d9c47a', kind: 'forage' },
  hide: { name: 'Hide', icon: '🟫', col: '#7a4a22', kind: 'forage' }, bone: { name: 'Bone', icon: '🦴', col: '#e8e0cc', kind: 'forage' },
  copper_ingot: { name: 'Copper ingot', icon: '🟧', col: '#c8763a', kind: 'ingot' }, iron_ingot: { name: 'Iron ingot', icon: '⬛', col: '#8a8f94', kind: 'ingot' }, steel_ingot: { name: 'Steel ingot', icon: '◼️', col: '#c9d2d6', kind: 'ingot' },
  silver_ingot: { name: 'Silver ingot', icon: '⬜', col: '#e6ebf0', kind: 'ingot' }, gold_ingot: { name: 'Gold ingot', icon: '🟨', col: '#ffd24d', kind: 'ingot' }
};
// the three gathering tools and their tiers (made at the furnace)
const TOOL_TIERS = ['Loaner', 'Copper', 'Iron', 'Steel'];
const TOOLS = { pick: { name: 'Pickaxe', icon: '⛏️' }, axe: { name: 'Felling axe', icon: '🪓' }, sickle: { name: 'Sickle', icon: '🔪' } };
// what you can gather: level needed, tool tier needed, what and how much it gives
const NODES = {
  copper: { skill: 'mining', name: 'Copper vein', lvl: 1, tool: 0, mat: 'copper_ore', n: [1, 2], xp: 12, respawn: 70, col: '#b87333' },
  iron: { skill: 'mining', name: 'Iron vein', lvl: 5, tool: 1, mat: 'iron_ore', n: [1, 2], xp: 20, respawn: 90, col: '#6e6a66' },
  coal: { skill: 'mining', name: 'Coal seam', lvl: 8, tool: 1, mat: 'coal', n: [1, 3], xp: 18, respawn: 80, col: '#222' },
  crystal: { skill: 'mining', name: 'Crystal cluster', lvl: 15, tool: 2, mat: 'crystal', n: [1, 1], xp: 40, respawn: 160, col: '#9fe3ff' },
  silver: { skill: 'mining', name: 'Silver vein', lvl: 22, tool: 2, mat: 'silver_ore', n: [1, 2], xp: 55, respawn: 150, col: '#c0c6cc' },
  gold: { skill: 'mining', name: 'Gold vein', lvl: 34, tool: 3, mat: 'gold_ore', n: [1, 1], xp: 90, respawn: 220, col: '#e3b341' },
  ash: { skill: 'woodcut', name: 'Ash tree', lvl: 1, tool: 0, mat: 'ash', n: [1, 2], xp: 12, respawn: 80, col: '#c9b48a' },
  oak: { skill: 'woodcut', name: 'Oak tree', lvl: 8, tool: 1, mat: 'oak', n: [1, 2], xp: 24, respawn: 110, col: '#8a5a2a' },
  hickory: { skill: 'woodcut', name: 'Hickory tree', lvl: 18, tool: 2, mat: 'hickory', n: [1, 1], xp: 48, respawn: 150, col: '#5a3a1a' },
  herb: { skill: 'forage', name: 'Herb patch', lvl: 1, tool: 0, mat: 'herb', n: [1, 3], xp: 10, respawn: 60, col: '#4caf50' },
  berry: { skill: 'forage', name: 'Berry bush', lvl: 3, tool: 0, mat: 'berry', n: [1, 3], xp: 12, respawn: 70, col: '#7b2d8e' },
  flax: { skill: 'forage', name: 'Flax', lvl: 6, tool: 1, mat: 'flax', n: [1, 2], xp: 18, respawn: 90, col: '#d9c47a' },
  hide: { skill: 'forage', name: 'Hides on the rack', lvl: 10, tool: 1, mat: 'hide', n: [1, 1], xp: 30, respawn: 120, col: '#7a4a22' },
  bone: { skill: 'forage', name: 'Bone pile', lvl: 14, tool: 2, mat: 'bone', n: [1, 2], xp: 36, respawn: 130, col: '#e8e0cc' }
};
// xp to go from level L to L+1, and the level a total gives
function tradeXpFor(L) { return Math.round(40 * Math.pow(L, 1.55) + 60); }
function tradeState() {
  const d = { xp: {}, inv: {}, tools: { pick: 0, axe: 0, sickle: 0 }, made: 0, gathered: 0 };
  const t = CAREER.trades || (CAREER.trades = {}); for (const k in d) if (t[k] == null) t[k] = d[k];
  for (const k in TRADE_SKILLS) if (t.xp[k] == null) t.xp[k] = 0;
  for (const k in TOOLS) if (t.tools[k] == null) t.tools[k] = 0;
  return t;
}
function tradeLevel(skill) { let xp = tradeState().xp[skill] || 0, L = 1; while (L < TRADE_CAP && xp >= tradeXpFor(L)) { xp -= tradeXpFor(L); L++; } return L; }
function tradeProgress(skill) { let xp = tradeState().xp[skill] || 0, L = 1; while (L < TRADE_CAP && xp >= tradeXpFor(L)) { xp -= tradeXpFor(L); L++; } return L >= TRADE_CAP ? { L, xp: 0, need: 0, f: 1 } : { L, xp, need: tradeXpFor(L), f: xp / tradeXpFor(L) }; }
function tradeGain(skill, xp) {
  if (G.autopilot || (G.attract && !TOWN.on) || xp <= 0) return;
  const t = tradeState(), before = tradeLevel(skill); t.xp[skill] = (t.xp[skill] || 0) + Math.round(xp); const after = tradeLevel(skill); saveCareer();
  const S = TRADE_SKILLS[skill];
  if (after > before) { toast(`${S.name} level ${after}!`, 'big', after % 5 === 0 ? 'New things to gather and make.' : `+${Math.round(xp)} xp`); try { AU.cheer(0.9); } catch (e) { } }
  else toast(`+${Math.round(xp)} ${S.name} xp`, 'info', `Level ${after} · ${Math.round(tradeProgress(skill).f * 100)}% to ${after + 1}`);
  if (typeof progressSoon === 'function') progressSoon();
}
function have(mat) { return tradeState().inv[mat] || 0; }
function give(mat, n) { const t = tradeState(); if (n > 0 && typeof bagRoom === 'function') n = Math.min(n, bagRoom(mat)); t.inv[mat] = (t.inv[mat] || 0) + n; t.gathered += Math.max(0, n); saveCareer(); return n; }
function tradeCanPay(cost) { for (const m in cost) if (have(m) < cost[m]) return false; return true; }
function tradePay(cost) { if (!tradeCanPay(cost)) return false; const t = tradeState(); for (const m in cost) t.inv[m] -= cost[m]; saveCareer(); return true; }
function costText(cost) { return Object.keys(cost).map(m => `${cost[m]} ${MATS[m].name.toLowerCase()}${have(m) < cost[m] ? ` (have ${have(m)})` : ''}`).join(', '); }
function costHtml(cost) {
  const w = h('span', { class: 'matlist' });
  for (const m in cost) { const ok = have(m) >= cost[m]; w.append(h('span', { class: 'mat' + (ok ? ' ok' : ' no'), title: MATS[m].name }, h('i', null, MATS[m].icon), `${have(m)}/${cost[m]}`)); }
  return w;
}
// ---- recipes
// Forging (furnace): ingots and tools
const SMELT = [
  { id: 'copper_ingot', lvl: 1, cost: { copper_ore: 2, ash: 1 }, xp: 14 }, { id: 'iron_ingot', lvl: 5, cost: { iron_ore: 2, coal: 1 }, xp: 22 },
  { id: 'steel_ingot', lvl: 12, cost: { iron_ore: 2, coal: 2 }, xp: 34 }, { id: 'silver_ingot', lvl: 22, cost: { silver_ore: 2, coal: 1 }, xp: 50 }, { id: 'gold_ingot', lvl: 34, cost: { gold_ore: 2, coal: 2 }, xp: 80 }
];
const TOOL_RECIPES = [ // tier -> cost, forging level
  null, { lvl: 2, cost: { copper_ingot: 2, ash: 1 }, xp: 30 }, { lvl: 10, cost: { iron_ingot: 3, oak: 1 }, xp: 60 }, { lvl: 20, cost: { steel_ingot: 3, hickory: 1 }, xp: 110 }
];
// Smithing (anvil): the same tiers the vendors sell, paid in materials
const WQ_MATS = [{ lvl: 1, cost: { copper_ingot: 2, ash: 1 }, xp: 40 }, { lvl: 8, cost: { iron_ingot: 3, oak: 1 }, xp: 70 }, { lvl: 16, cost: { steel_ingot: 3, oak: 1 }, xp: 110 }, { lvl: 26, cost: { steel_ingot: 5, silver_ingot: 1, hickory: 1 }, xp: 170 }, { lvl: 38, cost: { steel_ingot: 6, silver_ingot: 3, gold_ingot: 1, hickory: 1 }, xp: 260 }];
const AQ_MATS = [{ lvl: 2, cost: { copper_ingot: 2, hide: 1 }, xp: 40 }, { lvl: 9, cost: { iron_ingot: 3, hide: 1 }, xp: 70 }, { lvl: 17, cost: { steel_ingot: 3, hide: 2 }, xp: 110 }, { lvl: 27, cost: { steel_ingot: 5, silver_ingot: 1, hide: 2 }, xp: 170 }, { lvl: 39, cost: { steel_ingot: 6, silver_ingot: 3, gold_ingot: 1, hide: 3 }, xp: 260 }];
// kit upgrades: cost grows with the level you're buying; cardio is training, not smithing
const KIT_MATS = { harness: lv => ({ iron_ingot: 1 + Math.ceil(lv / 2), hide: 1 }), boots: lv => ({ hide: 1 + Math.ceil(lv / 3), ash: 1 }), padding: lv => ({ flax: 2 + Math.ceil(lv / 2), herb: 1 }), gauntlets: lv => ({ iron_ingot: 1 + Math.ceil(lv / 3), hide: 1 }) };
const kitMatLvl = lv => 1 + lv * 3;
// Artificing: skins by rarity (orc looks want bone, fantasy looks want crystal), outfits by price
const SKIN_MATS = [{ lvl: 1, cost: { bone: 3, iron_ingot: 1, hide: 1 }, xp: 50 }, { lvl: 10, cost: { bone: 4, steel_ingot: 2, berry: 2 }, xp: 90 }, { lvl: 20, cost: { crystal: 2, silver_ingot: 2, herb: 3 }, xp: 150 }, { lvl: 32, cost: { crystal: 5, gold_ingot: 1, silver_ingot: 2, berry: 3 }, xp: 240 }];
function skinMats(k) { const R = WSKIN_RARE[k] || 0, c = { ...SKIN_MATS[R].cost }; if (k.startsWith('fw_') && c.bone) { c.crystal = (c.crystal || 0) + Math.ceil(c.bone / 2); delete c.bone; } if (k.startsWith('orc_') && c.crystal) { c.bone = (c.bone || 0) + c.crystal * 2; delete c.crystal; } return { lvl: SKIN_MATS[R].lvl, cost: c, xp: SKIN_MATS[R].xp }; }
function outfitMats(cost) { return cost >= 6000 ? { lvl: 14, cost: { hide: 4, flax: 3, herb: 3, berry: 1 }, xp: 120 } : cost >= 4500 ? { lvl: 9, cost: { hide: 3, flax: 2, herb: 2 }, xp: 90 } : cost >= 1800 ? { lvl: 4, cost: { flax: 3, hide: 1, berry: 2 }, xp: 50 } : { lvl: 1, cost: { flax: 3, hide: 1, herb: 1 }, xp: 35 }; }
// try a craft: checks level and materials, pays, gives xp. Returns true if it happened.
function craft(skill, R, what, apply) {
  const L = tradeLevel(skill);
  if (L < R.lvl) { toastMenu(`Needs ${TRADE_SKILLS[skill].name} ${R.lvl} (you're ${L}).`); return false; }
  if (!tradeCanPay(R.cost)) { toastMenu(`Short of materials: ${costText(R.cost)}.`); return false; }
  tradePay(R.cost); const t = tradeState(); t.made++; apply(); saveCareer(); try { AU.clang && AU.clang(0.6, 0.8); } catch (e) { }
  tradeGain(skill, R.xp);
  return true;
}
// a card's "make it" side: label, whether you can, and a tooltip of what's missing
function craftInfo(skill, R) {
  const L = tradeLevel(skill), lvOk = L >= R.lvl, matOk = tradeCanPay(R.cost);
  return { can: lvOk && matOk, why: !lvOk ? `${TRADE_SKILLS[skill].name} ${R.lvl} needed (you're ${L})` : matOk ? '' : 'Short of materials', lvOk };
}
// the Trades tab: six skills with bars, then the satchel
function renderTrades(box) {
  const t = tradeState();
  box.append(h('p', { class: 'muted small' }, 'Skills you get better at by doing them. Gather round the festival, then work the furnace, the anvil and the Artificer’s bench. Everything the vendors sell for gold can be made here instead.'));
  const grid = h('div', { class: 'tradegrid' });
  for (const k in TRADE_SKILLS) {
    const S = TRADE_SKILLS[k], P = tradeProgress(k), tool = S.tool ? `${TOOL_TIERS[t.tools[S.tool]]} ${TOOLS[S.tool].name.toLowerCase()}` : null;
    const next = Object.values(NODES).filter(n => n.skill === k && n.lvl > P.L).sort((a, b) => a.lvl - b.lvl)[0];
    grid.append(h('div', { class: 'tradecard' }, h('div', { class: 'th' }, h('span', { class: 'ticon' }, S.icon), h('div', null, h('b', null, S.name), h('small', null, `Level ${P.L}${P.L >= TRADE_CAP ? ' (max)' : ''}`)), h('span', { class: 'tlv num' }, P.L)),
      h('div', { class: 'tbar' }, h('i', { style: `width:${Math.round(P.f * 100)}%` })),
      h('div', { class: 'muted small' }, P.L >= TRADE_CAP ? 'Mastered.' : `${P.xp} / ${P.need} xp to level ${P.L + 1}`),
      h('div', { class: 'muted small' }, S.desc), tool ? h('div', { class: 'small' }, `Tool: ${tool}`) : null, next ? h('div', { class: 'small muted' }, `Next: ${next.name} at level ${next.lvl}`) : null));
  }
  box.append(grid);
  box.append(h('h3', null, 'Satchel'));
  const inv = Object.keys(MATS).filter(m => have(m) > 0);
  if (!inv.length) box.append(h('p', { class: 'muted small' }, 'Empty. Go and gather something: copper, ash and herbs grow round the fairground; the quarry and the best timber are out in the Old Woods (follow the west road).'));
  const sat = h('div', { class: 'satchel' });
  for (const m of inv) sat.append(h('div', { class: 'satitem', style: `--c:${MATS[m].col}` }, h('span', { class: 'si' }, MATS[m].icon), h('b', { class: 'num' }, have(m)), h('span', null, MATS[m].name)));
  box.append(sat, h('p', { class: 'muted small' }, `${t.gathered} things gathered, ${t.made} things made.`));
}
// the blacksmith's furnace: ore into ingots, and the gathering tools, all paid in materials
function renderFurnace(list, row) {
  const t = tradeState();
  list.append(h('p', { class: 'muted small' }, 'Forging. Ore and fuel from the quarry go in, ingots come out. The anvil cards above take ingots instead of gold. Tools here make gathering faster and open harder veins.'));
  for (const R of SMELT) {
    const M = MATS[R.id];
    row(`Smelt ${M.name.toLowerCase()}`, `Have ${have(R.id)}`, `One ${M.name.toLowerCase()} for the anvil.`, null, false, null, '', h('span', { class: 'bigicon', style: `--c:${M.col}` }, M.icon), { skill: 'forging', R, apply: () => { give(R.id, 1); }, label: 'Smelt' });
  }
  for (const k in TOOLS) {
    const tier = t.tools[k] || 0, R = TOOL_RECIPES[tier + 1];
    row(`${TOOL_TIERS[tier]} ${TOOLS[k].name.toLowerCase()}`, tier >= 3 ? 'Best' : `Tier ${tier}`, R ? `Next: ${TOOL_TIERS[tier + 1].toLowerCase()} ${TOOLS[k].name.toLowerCase()}. Wider sweet spot, better yield, opens tier ${tier + 1} nodes.` : 'As good as a tool gets.', tier >= 3 ? 'Best' : null, false, null, '', h('span', { class: 'bigicon' }, TOOLS[k].icon), R ? { skill: 'forging', R, apply: () => { t.tools[k] = tier + 1; toastMenu(`${TOOL_TIERS[tier + 1]} ${TOOLS[k].name.toLowerCase()} made.`); }, label: 'Forge it' } : null);
  }
}
