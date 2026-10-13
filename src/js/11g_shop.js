// ---------- the market: ten vendors in town and everything they sell ----------
// Prize money buys weapon and armour quality, kit upgrades, tape, squires, runes and potions from the wizard, drills from the coach,
// a club hall, sponsors, a house with furniture and a statue, colours and titles. All of it is saved in CAREER.shop.
// The fight code reads the total effect of what you own through shopFx(key); everything is capped so it never gets silly.
const QUAL_NAMES = ['Club issue', 'Rebalanced', 'Smith-made', 'Tempered', 'Master-forged', 'Legendary'];
const ARM_NAMES = ['Starter', 'Fitted', 'Custom-made', 'Tempered', 'Master-made', 'Legendary'];
const WQ_COST = [300, 800, 2000, 5000, 13000];
const WEAPON_VARIANTS = [
  { id: 'light_mace', base: 'mace', name: 'Light flanged mace', cost: 1250, mass: 0.9, len: 0.57, desc: 'Shorter and lighter: quicker recovery, less reach and impact.' },
  { id: 'long_axe', base: 'axe', name: 'Long-haft axe', cost: 2200, mass: 1.3, len: 0.88, desc: 'A little more reach and weight, with a slower recovery.' },
  { id: 'light_sword', base: 'sword', name: 'Light arming sword', cost: 2600, mass: 1.2, len: 0.85, desc: 'Quicker handling, traded for a shorter striking distance.' },
];
function playerWeaponDef(key) {
  const base = WEAPONS[key]; if (!base) return WEAPONS.mace;
  const s = shopState(), id = s.variant && s.variant[key];
  const variant = WEAPON_VARIANTS.find(v => v.id === id && v.base === key);
  return variant && s.owned['variant:' + id] ? { ...base, mass: variant.mass, len: variant.len, name: variant.name } : base;
}
const AQ_COST = [350, 900, 2200, 5500, 14000];
const AQ_GROUPS = [
  { key: 'helmet', name: 'Helmet', desc: 'Strap wear −10% and getting your bell rung −6% per tier.' },
  { key: 'arms', name: 'Elbow cops', desc: 'Elbow strap wear −10% per tier.' },
  { key: 'legs', name: 'Knee cops', desc: 'Knee strap wear −10% per tier.' },
  { key: 'body', name: 'Breastplate', desc: 'Hits on you push 3% less per tier.' }
];
const PIECE_GROUP = { helmet: 'helmet', armL: 'arms', armR: 'arms', legs: 'legs' };
// tape rolls: legal rolls run out and get refilled; duct tape and zip ties never run out (and never pass the kit check)
const TAPE_STOCK = {
  black: { full: 20, refill: 40, pack: 20 },
  white: { full: 20, refill: 40, pack: 20 },
  grey: { full: 20, refill: 40, pack: 20 },
  pro: { full: 0, refill: 150, pack: 10 },
  kevlar: { full: 0, refill: 400, pack: 10 },
  gold: { full: 0, refill: 900, pack: 10 }
};
Object.assign(TAPES, {
  pro: { key: 'pro', name: 'Pro hockey tape', color: '#22355e', legal: true, haft: 'ok', wear: 1.35, note: 'Thick pro-grade cloth tape. Legal, and lasts longer than the club rolls.' },
  kevlar: { key: 'kevlar', name: 'Kevlar cloth tape', color: '#b8952f', legal: true, haft: 'ok', wear: 1.2, note: 'Aramid-weave cloth tape. Legal, and very hard to wear through.' },
  gold: { key: 'gold', name: 'Gold-thread tape', color: '#e3b341', legal: true, haft: 'ok', wear: 1.1, note: 'Cloth tape woven with gold thread. Legal, toughest of all, and it shines.' }
});
const SQUIRE_COST = [600, 1500, 4000];
const HALL_COST = lv => Math.round(1000 * Math.pow(1.6, lv) / 50) * 50;
const YARD_COST = lv => Math.round(800 * Math.pow(1.6, lv) / 50) * 50;
// boosts last a number of matches; fx is what they add while they last
const BOOSTS = [
  { key: 'drink', v: 'tavern', name: 'Electrolyte drinks', desc: 'Your lungs refill 20% faster for the next 3 matches.', cost: 90, n: 3, fx: { gasRec: 0.2 } },
  { key: 'feast', v: 'tavern', name: 'Hearty feast', desc: 'You tire 10% slower for the next 3 matches.', cost: 140, n: 3, fx: { gasDrain: 0.1 } },
  { key: 'room', v: 'tavern', name: 'A room for the night', desc: 'Well rested: +25% XP for the next 5 matches.', cost: 220, n: 5, fx: { xp: 0.25 } },
  { key: 'agent', v: 'tavern', name: 'Fight agent', desc: '+25% prize money for the next 5 matches.', cost: 450, n: 5, fx: { prize: 0.25 } },
  { key: 'coach', v: 'trainer', name: 'Coaching session', desc: '+50% XP for the next 3 matches.', cost: 300, n: 3, fx: { xp: 0.5 } },
  { key: 'fury', v: 'wizard', name: 'Draught of fury', desc: 'Strikes push 8% harder for the next 3 matches.', cost: 350, n: 3, fx: { imp: 0.08 } },
  { key: 'stone', v: 'wizard', name: 'Elixir of stone', desc: '10% steadier on your feet for the next 3 matches.', cost: 350, n: 3, fx: { stab: 0.1 } },
  { key: 'swift', v: 'wizard', name: 'Swiftfoot tonic', desc: '6% quicker for the next 3 matches.', cost: 350, n: 3, fx: { spd: 0.06 } },
  { key: 'brew', v: 'wizard', name: 'Philosopher’s brew', desc: 'Double XP for your next match.', cost: 500, n: 1, fx: { xp: 1 } }
];
// levelled upgrades: cost grows by g each level; fx is per level
const ITEMS = [
  { v: 'smith', id: 'pommel', name: 'Steel pommel', desc: 'Weight in the right place: strikes push 1.5% harder per level.', max: 5, cost: 400, g: 1.7, fx: { imp: 0.015 } },
  { v: 'smith', id: 'grip', name: 'Leather grip', desc: 'Harder to knock out of your hand: 8% fewer disarms per level.', max: 5, cost: 350, g: 1.7, fx: { disarm: 0.08 } },
  { v: 'smith', id: 'haft', name: 'Ash haft, reinforced', desc: 'Haft wraps wear 8% slower per level.', max: 5, cost: 300, g: 1.6, fx: { haft: 0.08 } },
  { v: 'smith', id: 'balance', name: 'Balance tuning', desc: 'A blade that wants to move: 1% quicker on your feet per level.', max: 5, cost: 500, g: 1.75, fx: { spd: 0.01 } },
  { v: 'armour', id: 'straps', name: 'Spare straps', desc: 'Start every match with straps 3% fresher per level.', max: 5, cost: 300, g: 1.6, fx: { kitStart: 0.03 } },
  { v: 'armour', id: 'oil', name: 'Oiled leather', desc: 'All straps wear 4% slower per level.', max: 5, cost: 450, g: 1.7, fx: { wear: 0.04 } },
  { v: 'armour', id: 'gorget', name: 'Riveted gorget', desc: 'Your bell rings 5% less per level.', max: 5, cost: 500, g: 1.7, fx: { bell: 0.05 } },
  { v: 'quarter', id: 'scissors', name: 'Good tape scissors', desc: '5 more seconds at every repair break per level.', max: 3, cost: 250, g: 2, fx: { repairSec: 5 } },
  { v: 'quarter', id: 'manual', name: 'Taping manual', desc: 'Your hand wraps hold 5% better per level.', max: 3, cost: 400, g: 2, fx: { tapeQ: 0.05 } },
  { v: 'wizard', id: 'r_ox', name: 'Rune of the ox', desc: '3% steadier on your feet per level.', max: 5, cost: 600, g: 1.8, fx: { stab: 0.03 } },
  { v: 'wizard', id: 'r_hare', name: 'Rune of the hare', desc: '2% quicker per level.', max: 5, cost: 600, g: 1.8, fx: { spd: 0.02 } },
  { v: 'wizard', id: 'r_bear', name: 'Rune of the bear', desc: 'Strikes push 2% harder per level.', max: 5, cost: 700, g: 1.8, fx: { imp: 0.02 } },
  { v: 'wizard', id: 'r_breath', name: 'Rune of breath', desc: 'Your lungs refill 5% faster per level.', max: 5, cost: 600, g: 1.8, fx: { gasRec: 0.05 } },
  { v: 'wizard', id: 'r_iron', name: 'Rune of iron skin', desc: 'Hits on you push 3% less per level.', max: 5, cost: 700, g: 1.8, fx: { push: 0.03 } },
  { v: 'wizard', id: 'r_owl', name: 'Rune of the owl', desc: '+5% XP per level.', max: 5, cost: 800, g: 1.8, fx: { xp: 0.05 } },
  { v: 'wizard', id: 'r_gold', name: 'Rune of gold', desc: '+4% prize money per level.', max: 5, cost: 900, g: 1.8, fx: { prize: 0.04 } },
  { v: 'wizard', id: 'r_bell', name: 'Ward against bells', desc: 'Your bell rings 6% less per level.', max: 5, cost: 600, g: 1.8, fx: { bell: 0.06 } },
  { v: 'trainer', id: 'd_feet', name: 'Footwork drills', desc: '2% steadier per level.', max: 10, cost: 300, g: 1.45, fx: { stab: 0.02 } },
  { v: 'trainer', id: 'd_strike', name: 'Striking drills', desc: 'Strikes push 1% harder per level.', max: 10, cost: 300, g: 1.45, fx: { imp: 0.01 } },
  { v: 'trainer', id: 'd_sprint', name: 'Sprints', desc: '1% quicker per level.', max: 10, cost: 300, g: 1.45, fx: { spd: 0.01 } },
  { v: 'trainer', id: 'd_lungs', name: 'Conditioning', desc: 'You tire 2% slower per level.', max: 10, cost: 300, g: 1.45, fx: { gasDrain: 0.02 } },
  { v: 'trainer', id: 'd_clinch', name: 'Clinch work', desc: 'Throws and trips from the clinch land 1.5% more per level.', max: 10, cost: 300, g: 1.45, fx: { grip: 0.015 } },
  { v: 'guild', id: 'squad', name: 'Squad training camp', desc: 'Your teammates are 2% quicker and steadier per level.', max: 10, cost: 600, g: 1.5, fx: { squad: 0.02 } },
  { v: 'bard', id: 'ballad', name: 'A ballad about you', desc: 'The crowd knows your name: +2% prize money per verse.', max: 5, cost: 500, g: 1.9, fx: { prize: 0.02 } }
];
// sponsors pay back a little every match
const SPONSORS = [
  { id: 'sp_brew', name: 'Red Deer Brewing', desc: 'Pays $40 every match.', cost: 3000, income: 40 },
  { id: 'sp_tape', name: 'Prairie Tape Co.', desc: 'Pays $90 every match.', cost: 8000, income: 90 },
  { id: 'sp_steel', name: 'Northern Steelworks', desc: 'Pays $220 every match.', cost: 22000, income: 220 }
];
// your house: each step up is bigger in town and gives XP and prize money
const HOMES = [
  { name: 'No house yet', cost: 0 }, { name: 'Tent', cost: 1000, xp: 0.02 }, { name: 'Cottage', cost: 5000, xp: 0.04, prize: 0.02 },
  { name: 'Longhouse', cost: 15000, xp: 0.06, prize: 0.04 }, { name: 'Manor', cost: 40000, xp: 0.08, prize: 0.06 }, { name: 'Keep', cost: 120000, xp: 0.12, prize: 0.1 }
];
const FURNISH = [
  { id: 'f_hearth', name: 'Hearth', desc: 'Warm and dry. +1% XP.', cost: 800, need: 1, fx: { xp: 0.01 } },
  { id: 'f_dummy', name: 'Training dummy', desc: 'Practice at home. +1% XP.', cost: 1000, need: 1, fx: { xp: 0.01 } },
  { id: 'f_rack', name: 'Weapon rack', desc: 'Your weapons, on display. +1% prize money.', cost: 1500, need: 2, fx: { prize: 0.01 } },
  { id: 'f_banner', name: 'Banner wall', desc: 'Your club colours. +1% prize money.', cost: 1200, need: 2, fx: { prize: 0.01 } },
  { id: 'f_cabinet', name: 'Trophy cabinet', desc: 'For the medals. +2% XP.', cost: 2500, need: 2, fx: { xp: 0.02 } },
  { id: 'f_forge', name: 'Home forge', desc: 'Fix your own kit: straps wear 3% slower.', cost: 6000, need: 3, fx: { wear: 0.03 } },
  { id: 'f_sauna', name: 'Sauna', desc: 'Lungs refill 5% faster.', cost: 8000, need: 3, fx: { gasRec: 0.05 } },
  { id: 'f_library', name: 'Library of fight footage', desc: '+3% XP.', cost: 12000, need: 4, fx: { xp: 0.03 } },
  { id: 'f_hall', name: 'Great hall', desc: 'Throw feasts for the club: +3% prize money.', cost: 30000, need: 5, fx: { prize: 0.03 } }
];
const SHOP_TABARDS = [['#5b2a86', 'Royal purple', 400], ['#4f8fbf', 'Ice blue', 400], ['#e0601b', 'Blaze orange', 600], ['#0b1020', 'Midnight', 600], ['#0f7a4a', 'Emerald', 800], ['#b76e79', 'Rose gold', 1200], ['#f2f0e6', 'Bone white', 1500], ['#7a0f1e', 'Oxblood', 1500], ['#2e5e4e', 'Forest', 1500], ['#c9a227', 'Cloth of gold', 5000], ['#1b1b1b', 'Black velvet', 8000], ['#6ad1ff', 'Glacier', 12000]];
const SHOP_TRIMS = [['#e6c35c', 'Gold leaf', 800], ['#7cff4f', 'Neon green', 600], ['#3d6bff', 'Royal blue', 600], ['#c1121f', 'Blood red', 1000], ['#9b5de5', 'Violet', 1000], ['#ff9f1c', 'Amber', 1200], ['#00e5ff', 'Electric cyan', 2500], ['#fafafa', 'Pearl', 4000]];
const SHOP_TITLES = [['the Taped', 500], ['Strap Fixer', 1000], ['the Bonker', 1500], ['Iron Duke', 2500], ['Shield Wall', 3500], ['Steel Baron', 5000], ['Hockey-Tape Hero', 7500], ['Tape Lord', 10000], ['Red Deer Raider', 15000], ['the Unbreakable', 25000], ['Champion of the Prairie', 40000], ['Prairie Legend', 50000], ['King of the List', 100000], ['Grand Champion', 175000], ['Buhurt Immortal', 250000]];
const STATUE_COST = 25000, GOLD_STATUE_COST = 150000;
const UP_MAX = 10;
// effect caps: what everything together can add at most
const FX_CAP = { imp: 0.4, spd: 0.25, stab: 0.45, gasRec: 0.8, gasDrain: 0.45, push: 0.35, bell: 0.6, wear: 0.5, haft: 0.6, disarm: 0.7, grip: 0.25, kitStart: 0.15, xp: 3, prize: 2, squad: 0.2, repairSec: 30, tapeQ: 0.2 };

function shopState() {
  const d = { wq: {}, aq: {}, tape: {}, sponsor: false, squires: 0, hall: 0, yard: 0, boost: {}, owned: {}, variant: {}, title: '', spent: 0, lv: {}, home: 0, spBought: 0 };
  const s = CAREER.shop || (CAREER.shop = {}); for (const k in d) if (s[k] == null) s[k] = d[k]; // fill in place, so references stay live
  for (const k in TAPE_STOCK) if (s.tape[k] == null) s.tape[k] = TAPE_STOCK[k].full;
  return s;
}
function spend(cost, what) {
  if (CAREER.purse < cost) { toastMenu(`Not enough in the purse: ${what || 'that'} costs ${fmtMoney(cost)}.`); return false; }
  CAREER.purse -= cost; const s = shopState(); s.spent += cost; const t2 = S2(); t2.spent = (t2.spent || 0) + cost; unlock('shopper', true); progressSoon();
  if (typeof playtestAction === 'function') playtestAction('purchase', { item: what || '', cost });
  saveCareer(); updateTitlePurse(); try { AU.cheer(0.4); } catch (e) { }
  return true;
}
function itemLv(id) { return shopState().lv[id] || 0; }
function itemCost(it, lv) { return Math.round(it.cost * Math.pow(it.g, lv) / 10) * 10; }
// the sum of everything you own and every boost running, capped
function shopFx(k) {
  if (typeof CAREER === 'undefined') return 0;
  const s = shopState(); let v = 0;
  for (const it of ITEMS) if (it.fx[k]) v += it.fx[k] * (s.lv[it.id] || 0);
  for (const b of BOOSTS) if (b.fx[k] && (s.boost[b.key] || 0) > 0) v += b.fx[k];
  for (const f of FURNISH) if (f.fx[k] && s.owned[f.id]) v += f.fx[k];
  const H = HOMES[s.home] || {}; if (H[k]) v += H[k];
  if (k === 'xp') v += 0.04 * s.yard; if (k === 'prize') v += 0.03 * s.hall;
  return Math.min(v, FX_CAP[k] != null ? FX_CAP[k] : v);
}
function sponsorIncome() { const s = shopState(); return SPONSORS.reduce((n, S) => n + (s.owned[S.id] ? S.income : 0), 0); }
// ---- effects read by the fight code (player only)
// kit upgrades past level 3 count half, so level 10 is strong but not silly
function upEff(lv) { return Math.min(lv, 3) + 0.5 * Math.max(0, lv - 3); }
function shopUp() { const out = {}; for (const k in CAREER.upgrades) out[k] = upEff(CAREER.upgrades[k] || 0); return out; }
function humanFighter(f) { return !!(f && (f.isPlayer || f.netUid || f.vin || f.combatProfile)); }
function validateCombatProfile(raw = {}) {
  const rank = (v, max) => Number.isFinite(v) ? clamp(Math.floor(v), 0, max) : 0;
  const out = { skills: {}, upgrades: {}, wq: {}, aq: {}, fx: {}, variants: {} };
  for (const key in SKILL_BY_ID) out.skills[key] = rank(raw.skills && raw.skills[key], SKILL_BY_ID[key].max);
  for (const key in CAREER_DEFAULT().upgrades) out.upgrades[key] = rank(raw.upgrades && raw.upgrades[key], 10);
  for (const key in WEAPONS) out.wq[key] = rank(raw.wq && raw.wq[key], 5);
  for (const group of AQ_GROUPS) out.aq[group.key] = rank(raw.aq && raw.aq[group.key], 5);
  for (const key in FX_CAP) out.fx[key] = Number.isFinite(raw.fx && raw.fx[key]) ? clamp(raw.fx[key], 0, FX_CAP[key]) : 0;
  for (const key in WEAPONS) { const variant = WEAPON_VARIANTS.find(v => v.base === key && v.id === raw.variants?.[key]); if (variant) out.variants[key] = variant.id; }
  return out;
}
function careerCombatProfile() {
  const s = shopState(), fx = {}; for (const key in FX_CAP) fx[key] = shopFx(key);
  const variants = {}; for (const key in s.variant) if (s.owned['variant:' + s.variant[key]]) variants[key] = s.variant[key];
  return validateCombatProfile({ skills: CAREER.skills || {}, upgrades: CAREER.upgrades, wq: s.wq, aq: s.aq, fx, variants });
}
function combatProfile(f) {
  if (!humanFighter(f) || G.autopilot) return null;
  if (!f.combatProfile) f.combatProfile = careerCombatProfile();
  return f.combatProfile;
}
function profileWeapon(key, profile) {
  const base = WEAPONS[key], variant = profile && WEAPON_VARIANTS.find(v => v.id === profile.variants[key] && v.base === key);
  return variant ? { ...base, mass: variant.mass, len: variant.len, name: variant.name } : base;
}
function weaponTier(f) { const p = combatProfile(f); return p && f.weapon && f.weapon.key === f.spec.weapon ? p.wq[f.weapon.key] || 0 : 0; }
function armourTier(f, group) { return combatProfile(f)?.aq[group] || 0; }
function pfx(f, k) { return combatProfile(f)?.fx[k] || 0; }
function pieceWearMult(f, piece) {
  if (!humanFighter(f)) return 1;
  if (piece === 'haft') return Math.pow(0.88, weaponTier(f)) * (1 - pfx(f, 'haft'));
  const g = PIECE_GROUP[piece]; return (g ? 1 - 0.1 * armourTier(f, g) : 1) * (1 - pfx(f, 'wear'));
}
function shopPrizeMult() { return 1 + shopFx('prize'); }
function shopXpMult() { return 1 + shopFx('xp'); }
// your teammates in your own matches get the squad camp bonus
function squadFx(f) { return f && !f.isPlayer && f.team === 0 && f.club && f.club.key === 'reavers' && !(typeof NET !== 'undefined' && NET.on) && !(typeof VS !== 'undefined' && VS.on) && !G.attract ? shopFx('squad') : 0; }
function boostKit(kit) { const b = shopFx('kitStart'); if (!b || !kit) return kit; for (const k in kit) kit[k].cond = Math.min(0.97, kit[k].cond + b); return kit; }
// ---- tape stock, used by the repair bench
function tapeLeft(k) { if (!TAPE_STOCK[k]) return Infinity; return shopState().tape[k] || 0; }
function useTape(k) { if (!TAPE_STOCK[k] || (typeof CUTE !== 'undefined' && CUTE.on) || G.autopilot || G.attract) return; const s = shopState(); s.tape[k] = Math.max(0, (s.tape[k] || 0) - 1); saveCareer(); }
function refillTape(k) {
  const T = TAPE_STOCK[k]; if (!T) return false;
  if (!spend(T.refill, TAPES[k].name)) return false;
  const s = shopState(); s.tape[k] = (s.tape[k] || 0) + T.pack; saveCareer(); return true;
}
// after every career match: tick down boosts; a sponsor tops the club rolls back up for free
function shopMatchEnd() {
  const s = shopState();
  for (const b of BOOSTS) if (s.boost[b.key] > 0) s.boost[b.key]--;
  if (s.sponsor) for (const k of ['black', 'white', 'grey']) s.tape[k] = Math.max(s.tape[k] || 0, TAPE_STOCK[k].full);
  saveCareer();
}
function shopApplyOwned() {
  const s = shopState();
  for (const [c] of SHOP_TABARDS) if (s.owned['tab' + c] && !TABARDS.includes(c)) TABARDS.push(c);
  for (const [c] of SHOP_TRIMS) if (s.owned['trim' + c] && !TRIMS.includes(c)) TRIMS.push(c);
}
function carriedKits() {
  const out = []; const S = store.get('season', null), R = store.get('run', null);
  if (S && S.kit && S.stop < 6) out.push(['season', S]); if (R && R.kit) out.push(['run', R]);
  return out;
}
function kitDamage(kit) { let d = 0; for (const k in kit) { const p = kit[k]; d += p.failed ? 1 : Math.max(0, 0.92 - p.cond); } return d; }
function armourerCost() { let d = 0; for (const [, X] of carriedKits()) d += kitDamage(X.kit); return Math.max(0, Math.round(d * 220 / 10) * 10); }
function armourerFix() {
  const cost = armourerCost(); if (!cost) { toastMenu('Your kit is already in good shape.'); return; }
  if (!spend(cost, 'The armourer')) return;
  for (const [key, X] of carriedKits()) { for (const k in X.kit) { const p = X.kit[k]; p.cond = Math.max(p.cond, 0.92); p.failed = false; p.covered = false; p.tape = p.tape || 'black'; } store.set(key, X); }
  toastMenu('The armourer fixed everything. Good as new.');
}
// skill points for sale, but only as many as the trees can still use
function skillRoom() { let cap = 0; SKILL_TREES.forEach(T => T.nodes.forEach(n => cap += n.max)); return Math.max(0, cap - totalSpent() - (CAREER.sp || 0)); }
function spCost() { return Math.round(1500 * Math.pow(1.35, shopState().spBought) / 50) * 50; }

// ---- the vendors
const VENDORS = [
  { key: 'smith', name: 'Gunnar Ironhand', role: 'Blacksmith', col: '#5a3b24', awn: '#7a2b1c', hi: 'Steel, sweat and a hammer. What are we making better today?', icon: '⚒️' },
  { key: 'armour', name: 'Hilda Strapwell', role: 'Armourer', col: '#46505a', awn: '#3d4a57', hi: 'Show me those straps. Oh dear. Oh no. Sit down.', icon: '🛡️' },
  { key: 'quarter', name: 'Old Tess', role: 'Quartermaster', col: '#4a5a3a', awn: '#35502e', hi: 'Tape, tape and more tape. Never be caught short at a break.', icon: '🧻' },
  { key: 'wizard', name: 'Mordecai the Odd', role: 'Wizard', col: '#3b2a6b', awn: '#4b2d86', hi: 'Ahh, a fighter. Runes, potions, a little extra… talent?', icon: '🔮' },
  { key: 'tavern', name: 'Bram Barrelbelly', role: 'Innkeeper', col: '#7a4a22', awn: '#8a5a1c', hi: 'Sit, eat, drink! And I know a squire or two looking for work.', icon: '🍺' },
  { key: 'trainer', name: 'Coach Ingrid', role: 'Training master', col: '#1f4a6b', awn: '#1c5a7a', hi: 'Money won’t make you fit. Drills will. Money pays for drills.', icon: '🏋️' },
  { key: 'herald', name: 'Sigrun', role: 'Herald and tailor', col: '#6b1f3a', awn: '#9b2350', hi: 'A fighter should be seen. New colours? Something bold?', icon: '🎨' },
  { key: 'bard', name: 'Pip Lightfingers', role: 'Bard', col: '#2f6b4f', awn: '#2a7a55', hi: 'For a coin I sing your name across the prairie. For more, I make it a title.', icon: '🎵' },
  { key: 'guild', name: 'Guildmaster Osric', role: 'Club guild', col: '#2a2d33', awn: '#6d1b28', hi: 'Build the club and the club builds you. Sponsors are waiting.', icon: '🏰' },
  { key: 'estate', name: 'Wendell Deeds', role: 'Land agent', col: '#5a4a2a', awn: '#6b5a2a', hi: 'Every champion needs a home. Location, location, location!', icon: '🏠' },
  { key: 'wardrobe', name: 'Madame Velour', role: 'Wardrobe', col: '#8c1f4f', awn: '#b0306a', hi: 'Darling! You cannot walk around town looking like THAT. Let me dress you.', icon: '👗', custom: true },
  { key: 'barber', name: 'Marta the Barber', role: 'Barber', col: '#7b5540', awn: '#ad734d', hi: 'Take a seat. New hair, a beard, or a whole new look? The mirror is yours.', icon: '✂️', custom: true },
  { key: 'artificer', name: 'Ysolde Gleamwright', role: 'Artificer', col: '#4b2a5a', awn: '#2a2340', hi: 'Your steel fights exactly the same. It just looks like it ate a dragon. Looks only, mind: the marshals still weigh the real thing.', icon: '🗡️' },
  { key: 'ghost', name: 'Sir Reginald the Restless', role: 'Ghost (spooky goods)', col: '#cfe3f7', awn: '#3a5a7a', hi: 'Ooooo… a living customer. I sell things from beyond. Pumpkin heads, shrouds, pets that are not quite alive.', icon: '👻', custom: true }
];
const VENDOR_BY = Object.fromEntries(VENDORS.map(V => [V.key, V]));
function bar(lv, max) { const p = h('span', { class: 'pipsN', 'aria-label': `${lv} of ${max}` }); for (let i = 0; i < Math.min(max, 10); i++) p.append(h('i', { class: i < lv ? 'on' : '' })); return p; }
// fill one vendor's counter into box; again() redraws after a purchase
function renderVendor(box, key, again) {
  const s = shopState(), V = VENDOR_BY[key], vtier = V.tier || 1; key = V.as || key;
  box.innerHTML = ''; box.style.setProperty('--vc', V.awn || V.col);
  box.classList.toggle('barber-layout', key === 'barber');
  const purse = h('span', { class: 'vpurse num' }, fmtMoney(CAREER.purse));
  box.append(h('div', { class: 'vhead' }, h('span', { class: 'vmedal' }, V.icon), h('div', { class: 'vwho' }, h('b', null, V.name), h('small', null, V.role)), h('div', { class: 'vpursebox' }, h('small', null, 'Your purse'), purse)),
    h('p', { class: 'vhi' }, V.hi));
  // goods are grouped into sections; each section is a tab, and only this vendor's goods are here
  const secs = []; let cur = null;
  const newSec = t => { cur = { t, el: h('div', { class: 'vgrid' }), n: 0 }; secs.push(cur); };
  const list = { querySelectorAll: selector => secs.flatMap(section => [...section.el.querySelectorAll(selector)]), append: (...nodes) => { for (const n of nodes) { if (!n) continue; if (n.tagName === 'H4') { newSec(n.textContent); continue; } if (!cur) newSec('Goods'); if (n.classList && n.classList.contains('up')) cur.n++; cur.el.append(n); } } };
  // a card. make = { skill, R: { lvl, cost, xp }, apply, label } adds the trade route: the same thing for materials and skill instead of gold
  const row = (name, tierTxt, desc, btnTxt, can, buy, extra, thumb, make) => {
    const m = /\$([\d,]+)/.exec(btnTxt || ''), cost = m ? +m[1].replace(/,/g, '') : 0, short = !can && cost > CAREER.purse ? cost - CAREER.purse : 0;
    const done = /^(Maxed|Owned|Signed|Built|Gilded|Done|Full|All hired|Wearing|Golden|Equipped)$/.test(btnTxt || '');
    const b = btnTxt == null ? null : h('button', { class: 'btn ' + (done ? 'ghost' : can ? 'primary flagtape' : 'tape') + ' small vbuy', disabled: can ? null : true, onclick: () => { if (!can) return; const ok = buy(); if (ok === false) return; AU.click(); TOWN.vjust = name; again(); } }, btnTxt);
    const r = h('div', { class: 'up vcard' + (extra || '') + (done ? ' done' : '') + (TOWN.vjust === name ? ' just' : '') },
      h('div', { class: 'vtop' }, thumb ? h('div', { class: 'vthumb' }, thumb) : null, h('div', { class: 'vtxt' }, h('div', { class: 'uph' }, h('b', null, name), tierTxt ? h('span', { class: 'tier' }, tierTxt) : null), h('div', { class: 'muted' }, desc))),
      b ? h('div', { class: 'vfoot' }, short ? h('span', { class: 'vshort' }, `Need ${fmtMoney(short)} more`) : h('span'), b) : null);
    if (make && !done) {
      const info = craftInfo(make.skill, make.R), S = TRADE_SKILLS[make.skill];
      const mb = h('button', { class: 'btn ' + (info.can ? 'primary' : 'tape') + ' small vmk', disabled: info.can ? null : true, onclick: () => { if (craft(make.skill, make.R, name, make.apply)) { TOWN.vjust = name; again(); } } }, make.label || 'Make it');
      r.append(h('div', { class: 'vmake' }, h('div', { class: 'vmrow' }, h('small', null, `${S.icon} ${S.name} ${make.R.lvl}${info.lvOk ? '' : ` (you're ${tradeLevel(make.skill)})`} · +${make.R.xp} xp`), mb), costHtml(make.R.cost)));
    }
    list.append(r); return r;
  };
  const finish = () => {
    TOWN.vjust = null; TOWN.vtab = TOWN.vtab || {};
    let ai = Math.min(TOWN.vtab[key] || 0, Math.max(0, secs.length - 1));
    if (secs.length > 1) {
      const tabs = h('div', { class: 'vtabs', role: 'tablist' });
      secs.forEach((S, i) => tabs.append(h('button', { 'data-i': String(i), role: 'tab', 'aria-pressed': String(i === ai), onclick: () => { AU.click(); TOWN.vtab[key] = i; tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === tabs.children[i]))); secs.forEach((T, j) => { T.el.hidden = j !== i; }); box.scrollTop = 0; } }, S.t, S.n ? h('small', null, String(S.n)) : null)));
      box.append(tabs);
    }
    secs.forEach((S, i) => {
      S.el.dataset.i = String(i); S.el.classList.add('vsec');
      if (key === 'barber') {
        S.el.classList.add('barber-section');
        const controls = h('div', { class: 'barber-controls' });
        for (const child of [...S.el.children]) if (!child.classList.contains('barber-mirror')) controls.append(child);
        S.el.prepend(controls);
      }
      S.el.hidden = secs.length > 1 && i !== ai; box.append(S.el);
    });
    if (typeof applyVendorTier === 'function') applyVendorTier(box, vtier);
  };
  const head = t => newSec(t);
  const items = () => { for (const it of ITEMS.filter(x => x.v === key)) { const lv = s.lv[it.id] || 0, c = itemCost(it, lv); row(it.name, `Level ${lv}`, it.desc, lv >= it.max ? 'Maxed' : `Buy ${fmtMoney(c)}`, lv < it.max && CAREER.purse >= c, () => { if (!spend(c, it.name)) return false; s.lv[it.id] = lv + 1; saveCareer(); }).querySelector('.uph').append(bar(lv, it.max)); } };
  const boosts = () => { for (const B of BOOSTS.filter(x => x.v === key)) { const left = s.boost[B.key] || 0; row(B.name, left ? `${left} match${left === 1 ? '' : 'es'} left` : null, B.desc, `Buy ${fmtMoney(B.cost)}`, CAREER.purse >= B.cost, () => { if (!spend(B.cost, B.name)) return false; s.boost[B.key] = left + B.n; saveCareer(); }); } };
  if (key === 'smith') {
    head('Weapon quality');
    list.append(h('p', { class: 'muted small' }, 'Each tier hits 3% harder, swings 2.5% faster and the haft wrap wears slower. Only the weapon you carry in gets it.'));
    for (const k of PICK_WEAPONS.filter(k => WEAPONS[k])) {
      const W = WEAPONS[k], lv = s.wq[k] || 0, cost = WQ_COST[lv], cur = G.loadout && G.loadout.weapon === k;
      row(`${W.name}${cur ? ' (yours)' : ''}`, QUAL_NAMES[lv], lv >= 5 ? 'Legendary. As good as steel gets.' : `Next: ${QUAL_NAMES[lv + 1]}.`, lv >= 5 ? 'Maxed' : `Upgrade ${fmtMoney(cost)}`, lv < 5 && CAREER.purse >= cost,
        () => { if (!spend(cost, W.name)) return false; s.wq[k] = lv + 1; saveCareer(); toastMenu(`${W.name}: now ${QUAL_NAMES[lv + 1]}.`); }, cur ? ' cur' : '', weaponIcon(k, 120, 36),
        lv < 5 ? { skill: 'smithing', R: WQ_MATS[lv], apply: () => { s.wq[k] = lv + 1; toastMenu(`${W.name}: now ${QUAL_NAMES[lv + 1]}, by your own hand.`); }, label: 'Forge it' } : null).querySelector('.uph').append(bar(lv, 5));
    }
    head('Fitted weapons');
    list.append(h('p', { class: 'muted small' }, 'These variants keep the original weapon class and legal kit limits. Buy once, then choose the fit you prefer.'));
    for (const v of WEAPON_VARIANTS) {
      const own = !!s.owned['variant:' + v.id], on = s.variant[v.base] === v.id;
      row(v.name, on ? 'Equipped' : own ? 'Owned' : WEAPONS[v.base].cls, v.desc,
        on ? 'Use standard' : own ? 'Equip' : `Buy ${fmtMoney(v.cost)}`, on || own || CAREER.purse >= v.cost,
        () => { if (on) delete s.variant[v.base]; else { if (!own && !spend(v.cost, v.name)) return false; s.owned['variant:' + v.id] = 1; s.variant[v.base] = v.id; } saveCareer(); toastMenu(on ? 'Standard weapon fitted.' : `${v.name} fitted for your next fight.`); }, on ? ' cur' : '', weaponIcon(v.base, 120, 36));
    }
    head('Fittings'); items();
    head('Furnace'); renderFurnace(list, row);
    head('Custom forging');
    { const fw = h('div', { class: 'vwide' }); renderSmith(fw); list.append(fw); }
  } else if (key === 'armour') {
    head('Armour quality');
    for (const A of AQ_GROUPS) { const lv = s.aq[A.key] || 0, cost = AQ_COST[lv]; row(A.name, ARM_NAMES[lv], A.desc, lv >= 5 ? 'Maxed' : `Upgrade ${fmtMoney(cost)}`, lv < 5 && CAREER.purse >= cost, () => { if (!spend(cost, A.name)) return false; s.aq[A.key] = lv + 1; saveCareer(); }, '', null,
      lv < 5 ? { skill: 'smithing', R: AQ_MATS[lv], apply: () => { s.aq[A.key] = lv + 1; toastMenu(`${A.name}: now ${ARM_NAMES[lv + 1]}.`); }, label: 'Make it' } : null).querySelector('.uph').append(bar(lv, 5)); }
    head('Kit upgrades (to level 10)');
    for (const U of UPGRADES) { const lv = CAREER.upgrades[U.key] || 0, cost = UP_COST[lv]; row(U.name, `Level ${lv}`, U.desc + (lv >= 3 ? ' Levels past 3 give half as much.' : ''), lv >= UP_MAX ? 'Maxed' : `Buy ${fmtMoney(cost)}`, lv < UP_MAX && CAREER.purse >= cost, () => { if (!spend(cost, U.name)) return false; CAREER.upgrades[U.key] = lv + 1; saveCareer(); }, '', null,
      lv < UP_MAX && KIT_MATS[U.key] ? { skill: 'smithing', R: { lvl: kitMatLvl(lv), cost: KIT_MATS[U.key](lv), xp: 30 + lv * 12 }, apply: () => { CAREER.upgrades[U.key] = lv + 1; }, label: 'Make it' } : null).querySelector('.uph').append(bar(lv, UP_MAX)); }
    head('Straps and fittings'); items();
    head('Repairs');
    const ac = armourerCost();
    row('Fix my carried kit', null, carriedKits().length ? 'Fixes all the damage your kit carries in the summer season or a Gauntlet run.' : 'Nothing carried over right now. Come back mid-season or mid-run.', ac ? `Fix it all ${fmtMoney(ac)}` : 'Nothing to fix', ac > 0 && CAREER.purse >= ac, () => { armourerFix(); });
  } else if (key === 'quarter') {
    head('Tape');
    list.append(h('p', { class: 'muted small' }, 'Every wrap at the repair bench uses one from the roll. Fancier tape lasts longer on the strap.'));
    for (const k of Object.keys(TAPE_STOCK)) { const T = TAPE_STOCK[k], left = s.tape[k] || 0; row(TAPES[k].name, `${left} wrap${left === 1 ? '' : 's'} left`, TAPES[k].note, `+${T.pack} wraps ${fmtMoney(T.refill)}`, CAREER.purse >= T.refill, () => refillTape(k), left === 0 ? ' empty' : '').querySelector('.uph').prepend(h('span', { class: 'roll', style: `--c:${TAPES[k].color}` })); }
    row('Tape sponsor', s.sponsor ? 'Signed' : null, 'Your black, white and grey rolls refill free after every match. Forever.', s.sponsor ? 'Signed' : `Sign ${fmtMoney(5000)}`, !s.sponsor && CAREER.purse >= 5000,
      () => { if (!spend(5000, 'A tape sponsor')) return false; s.sponsor = true; for (const k of ['black', 'white', 'grey']) s.tape[k] = Math.max(s.tape[k] || 0, TAPE_STOCK[k].full); saveCareer(); });
    head('Bench gear'); items();
  } else if (key === 'wizard') {
    head('Talent, bottled');
    const room = skillRoom(), c = spCost();
    row('A skill point', `${s.spBought} bought`, room ? 'One more point to spend in your skill trees. Each costs more than the last.' : 'Your skill trees are full. Nothing left to learn!', room ? `Buy ${fmtMoney(c)}` : 'Full', room > 0 && CAREER.purse >= c,
      () => { if (!spend(c, 'A skill point')) return false; s.spBought++; skillsState(); saveCareer(); updateTitlePurse(); toastMenu('+1 skill point. Spend it in Your fighter → Skills.'); });
    head('Runes (permanent)'); items();
    head('Potions (a few matches)'); boosts();
  } else if (key === 'tavern') {
    head('Food, drink and rest'); boosts();
    head('Squires');
    const sq = s.squires;
    row('Hire a squire', `${1 + sq} at the bench`, 'Each squire patches one strap for you per repair break.', sq >= 3 ? 'All hired' : `Hire ${fmtMoney(SQUIRE_COST[sq])}`, sq < 3 && CAREER.purse >= SQUIRE_COST[sq], () => { if (!spend(SQUIRE_COST[sq], 'A squire')) return false; s.squires = sq + 1; saveCareer(); }).querySelector('.uph').append(bar(sq, 3));
  } else if (key === 'trainer') {
    head('The training yard');
    const yc = YARD_COST(s.yard);
    row('Training yard', `Level ${s.yard}`, `Pells, sandbags and a ring: +4% XP per level (now +${4 * s.yard}%).`, s.yard >= 10 ? 'Maxed' : `Build ${fmtMoney(yc)}`, s.yard < 10 && CAREER.purse >= yc, () => { if (!spend(yc, 'The training yard')) return false; s.yard++; saveCareer(); }).querySelector('.uph').append(bar(s.yard, 10));
    head('Drills (permanent)'); items();
    head('Sessions'); boosts();
  } else if (key === 'herald') {
    head('Tabards');
    list.append(h('p', { class: 'muted small' }, 'New colours go straight on. Change them any time in Your fighter → Profile.'));
    for (const [c, nm, cost] of SHOP_TABARDS) { const have = s.owned['tab' + c]; row(nm, have ? 'Owned' : null, 'A new tabard colour.', have ? 'Wear it' : `Buy ${fmtMoney(cost)}`, have || CAREER.purse >= cost, () => { if (!have && !spend(cost, nm)) return false; s.owned['tab' + c] = 1; shopApplyOwned(); CAREER.club.tabard = c; saveCareer(); applyProfile(); toastMenu(`${nm} tabard on.`); }).querySelector('.uph').prepend(h('span', { class: 'sw mini', style: `--c:${c}` })); }
    head('Trims');
    for (const [c, nm, cost] of SHOP_TRIMS) { const have = s.owned['trim' + c]; row(nm, have ? 'Owned' : null, 'A new trim colour.', have ? 'Wear it' : `Buy ${fmtMoney(cost)}`, have || CAREER.purse >= cost, () => { if (!have && !spend(cost, nm)) return false; s.owned['trim' + c] = 1; shopApplyOwned(); CAREER.club.trim = c; saveCareer(); applyProfile(); toastMenu(`${nm} trim on.`); }).querySelector('.uph').prepend(h('span', { class: 'sw mini', style: `--c:${c}` })); }
  } else if (key === 'bard') {
    head('Songs'); items();
    head('Titles');
    list.append(h('p', { class: 'muted small' }, 'A title shows after your name on your fighter card.'));
    for (const [t, cost] of SHOP_TITLES) {
      const have = s.owned['title:' + t], on = s.title === t;
      row(`“${t}”`, on ? 'Wearing' : have ? 'Owned' : null, on ? 'Shows after your name.' : 'Have the bard spread it around.', on ? 'Take off' : have ? 'Wear it' : `Buy ${fmtMoney(cost)}`, on || have || CAREER.purse >= cost,
        () => { if (on) s.title = ''; else if (have) s.title = t; else { if (!spend(cost, 'That title')) return false; s.owned['title:' + t] = 1; s.title = t; } saveCareer(); updateTitlePurse(); });
    }
  } else if (key === 'wardrobe') { renderWardrobe(list, again, false, row);
  } else if (key === 'barber') { renderBarber(list, again);
  } else if (key === 'ghost') { renderWardrobe(list, again, true, row);
  } else if (key === 'artificer') { renderArtificer(list, row, head);
  } else if (key === 'guild') {
    renderGuildSection(list, again);
    head('The club hall');
    const hc = HALL_COST(s.hall);
    row('Club hall', `Level ${s.hall}`, `Bigger hall, bigger crowds: +3% prize money per level (now +${3 * s.hall}%).`, s.hall >= 10 ? 'Maxed' : `Build ${fmtMoney(hc)}`, s.hall < 10 && CAREER.purse >= hc, () => { if (!spend(hc, 'The club hall')) return false; s.hall++; saveCareer(); }).querySelector('.uph').append(bar(s.hall, 10));
    head('Your squad'); items();
    head('Sponsors');
    list.append(h('p', { class: 'muted small' }, `Sponsors pay you after every match. Right now: ${fmtMoney(sponsorIncome())} a match.`));
    for (const S of SPONSORS) { const have = s.owned[S.id]; row(S.name, have ? 'Signed' : null, S.desc, have ? 'Signed' : `Sign ${fmtMoney(S.cost)}`, !have && CAREER.purse >= S.cost, () => { if (!spend(S.cost, S.name)) return false; s.owned[S.id] = 1; saveCareer(); }); }
  } else if (key === 'estate') {
    head('Your bag');
    { const B = bagState(), c = 600 + (B.size - 30) * 220; row('A bigger bag', `${B.size} slots`, 'Five more slots in your bag, up to 50. Materials stack to 99 a slot.', B.size >= BAG_MAX ? 'Maxed' : `Buy ${fmtMoney(c)}`, B.size < BAG_MAX && CAREER.purse >= c, () => { if (!spend(c, 'A bigger bag')) return false; B.size = Math.min(BAG_MAX, B.size + 5); saveCareer(); }); }
    head('Your house');
    const H = HOMES[s.home], N = HOMES[s.home + 1];
    row(H.name, s.home ? `+${Math.round((H.xp || 0) * 100)}% XP${H.prize ? `, +${Math.round(H.prize * 100)}% prize` : ''}` : null, N ? `Next: ${N.name}. +${Math.round((N.xp || 0) * 100)}% XP${N.prize ? ` and +${Math.round(N.prize * 100)}% prize money` : ''}. You'll see it in town.` : 'The finest keep on the prairie. It’s yours.', N ? `Buy ${fmtMoney(N.cost)}` : 'Done', !!N && CAREER.purse >= (N ? N.cost : 0),
      () => { if (!spend(N.cost, N.name)) return false; s.home++; saveCareer(); toastMenu(`You own a ${N.name.toLowerCase()} now. It’s at the south end of town.`); if (typeof townRefresh === 'function') townRefresh(); }).querySelector('.uph').append(bar(s.home, 5));
    head('Furniture');
    for (const F of FURNISH) { const have = s.owned[F.id], ok = s.home >= F.need; row(F.name, have ? 'Owned' : null, ok ? F.desc : `${F.desc} Needs a ${HOMES[F.need].name.toLowerCase()}.`, have ? 'Owned' : `Buy ${fmtMoney(F.cost)}`, !have && ok && CAREER.purse >= F.cost, () => { if (!spend(F.cost, F.name)) return false; s.owned[F.id] = 1; saveCareer(); }); }
    head('Monuments');
    row('A statue of you', s.owned.statue ? 'Standing' : null, 'Stone, life-size, in the middle of town. Everyone will see it.', s.owned.statue ? 'Built' : `Build ${fmtMoney(STATUE_COST)}`, !s.owned.statue && CAREER.purse >= STATUE_COST, () => { if (!spend(STATUE_COST, 'A statue')) return false; s.owned.statue = 1; saveCareer(); if (typeof townRefresh === 'function') townRefresh(); });
    row('Gild the statue', s.owned.gold ? 'Golden' : null, 'Cover it in gold leaf. Completely unnecessary.', s.owned.gold ? 'Gilded' : `Gild ${fmtMoney(GOLD_STATUE_COST)}`, !!s.owned.statue && !s.owned.gold && CAREER.purse >= GOLD_STATUE_COST, () => { if (!spend(GOLD_STATUE_COST, 'Gold leaf')) return false; s.owned.gold = 1; saveCareer(); if (typeof townRefresh === 'function') townRefresh(); });
  }
  finish();
}
// the Town tab in Your fighter: who sells what, and a way to walk there
function renderShop(box) {
  box.append(h('p', { class: 'muted' }, 'Find a service and follow its route through the realm.'));
  box.append(h('button', { class: 'btn primary flagtape', onclick: () => enterTown() }, 'Go to town'));
  if (TOWN.on) box.append(placesDirectory(r => { setWaypoint(r.x, r.z, r.name); showScreen(null); refreshTouchUI(); }));
  else box.append(h('p', { class: 'muted' }, 'Enter town to search its places and services.'));
}
function vendorBlurb(k) { const VV = VENDOR_BY[k]; if (VV && VV.as) return (VV.tier === 3 ? 'The King’s own work: ' : 'Garrison work, further up the bar: ') + vendorBlurb(VV.as); return { smith: 'Weapon quality, pommels, grips, hafts, custom forging.', armour: 'Armour quality, kit upgrades to 10, straps, repairs.', quarter: 'Tape rolls, gold-thread tape, the tape sponsor, bench gear.', wizard: 'Skill points, 8 runes, potions.', tavern: 'Food and drink boosts, a room, a fight agent, squires.', trainer: 'Training yard, 5 kinds of drills, coaching.', herald: '12 tabard colours, 8 trims.', bard: 'Ballads and 15 titles.', guild: 'Club hall, squad training camp, sponsors that pay every match.', estate: 'Your house, furniture, a statue (and gold leaf).', wardrobe: 'Outfits, colours, hats, capes, things to carry, pets.', barber: 'Hair, beard, eyes, skin tone and body style. Changes are free.', artificer: 'Cosmetic weapon skins: orc and fantasy looks, stats unchanged.', ghost: 'Spooky wardrobe: pumpkin head, ghostly shroud, scythe, undead pets.' }[k]; }
shopState(); shopApplyOwned();

