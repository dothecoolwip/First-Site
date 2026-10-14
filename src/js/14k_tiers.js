// ===================================================================
// Tiers: where you may go and what you may buy.
//   Tier 1  the fairground and the open country: the festival's own smiths and armourers, good but not the best
//   Tier 2  the Outer Bailey (level 15 + the Bailey writ, won in a duel with Sergeant Brask at the gate)
//   Tier 3  the King's Court (level 40 + the Royal writ, won against the King's Guard in the Castle arena)
// Each tier's vendors sell upgrades further up the bar; the rest of the bar is greyed out with where to go.
// ===================================================================
// the bailey and court vendors: the same trades as the fairground's, further up the bar
VENDORS.push(
  { key: 'msmith', as: 'smith', tier: 2, name: 'Brunhild Anvilborn', role: 'Master smith', col: '#5a3b24', awn: '#8a3a1c', hi: 'The fairground lads are fine for a start. This is where steel gets serious.', icon: '⚒️' },
  { key: 'marmour', as: 'armour', tier: 2, name: 'Sir Aldric Platewright', role: 'Master armourer', col: '#46505a', awn: '#2f3d4c', hi: 'Garrison plate, fitted properly. Stand still.', icon: '🛡️' },
  { key: 'mtrainer', as: 'trainer', tier: 2, name: 'Drillmaster Kael', role: 'Barracks drillmaster', col: '#1f4a6b', awn: '#173f5c', hi: 'The garrison trains twice a day. You can join for a fee.', icon: '🏋️' },
  { key: 'rsmith', as: 'smith', tier: 2, name: 'Odo the King’s Smith', role: 'Royal smith', col: '#5a4a2a', awn: '#8a6a12', hi: 'I keep the court armed. Mara Flint in Ashmarket handles the highest grades of weapon work.', icon: '👑' },
  { key: 'rarmour', as: 'armour', tier: 2, name: 'Dame Ottilie', role: 'Royal armourer', col: '#3a3f5a', awn: '#5b2a86', hi: 'I maintain the Guard’s harness. The finest new fittings come from Stoneford.', icon: '👑' },
  { key: 'rtailor', as: 'herald', tier: 3, name: 'Master Fennick', role: 'Royal tailor', col: '#5b2a86', awn: '#7a3aa6', hi: 'Silk, velvet, cloth of gold. One does not dress for court; one dresses AT it.', icon: '🧵' }
);
for (const V of VENDORS) VENDOR_BY[V.key] = V;
Object.assign(STALL_AT, { msmith: [-40, -216], marmour: [71, -200], mtrainer: [-75, -244], rsmith: [21, -253], rarmour: [28, -253], rtailor: [-25, -253] });
Object.assign(STALL_FACE, { msmith: 2.21, marmour: -Math.PI / 2, mtrainer: Math.PI / 2, rsmith: 0, rarmour: 0, rtailor: 0 });
Object.assign(VENDOR_FIT, { msmith: 'Female_Peasant', marmour: 'Male_Ranger', mtrainer: 'Male_Ranger', rsmith: 'Male_Peasant', rarmour: 'Female_Ranger', rtailor: 'Male_Ranger' });
// how far up a bar of `max` a vendor of this tier will take you
function tierCap(max, tier) { return tier >= 3 ? max : tier === 2 ? Math.max(1, Math.round(max * 0.8)) : Math.max(1, Math.round(max * 0.6)); }
function vendorTierNote(tier, key) { return tier === 1 ? 'Better work is done in the Outer Bailey (level 15 and the Bailey writ).' : key === 'rsmith' || key === 'msmith' ? 'The final weapon grade is forged in Ashmarket.' : key === 'rarmour' || key === 'marmour' ? 'The final armour grade is fitted in Stoneford.' : 'Advanced training is taught at Northwatch.'; }
// grey out goods past this vendor's tier (every upgrade card carries a pips bar saying "lv of max")
function applyVendorTier(box, tier, key) {
  if (tier >= 3) return;
  for (const card of box.querySelectorAll('.vcard')) {
    const p = card.querySelector('.pipsN'); if (!p) continue;
    const m = /(\d+) of (\d+)/.exec(p.getAttribute('aria-label') || ''); if (!m) continue;
    const lv = +m[1], max = +m[2]; if (lv >= max || lv < tierCap(max, tier)) continue;
    card.classList.add('vlocked');
    for (const b of card.querySelectorAll('.vbuy, .vmk')) { b.disabled = true; b.classList.remove('primary', 'flagtape'); b.classList.add('tape'); }
    const vb = card.querySelector('.vbuy'); if (vb) vb.textContent = tier === 1 ? 'Bailey only' : key === 'rsmith' || key === 'msmith' ? 'Ashmarket only' : key === 'rarmour' || key === 'marmour' ? 'Stoneford only' : 'Northwatch only';
    const sh = card.querySelector('.vshort'); if (sh) sh.textContent = '';
    card.querySelector('.vtxt').append(h('div', { class: 'vtiernote' }, vendorTierNote(tier, key)));
  }
}
// ---- the gatekeepers: Sergeant Brask outside the bailey gate, the Captain of the King's Guard by the Castle arena
STATIONS.push(
  { key: 'sergeant', name: 'Sergeant Brask', role: 'Bailey gate', icon: '🛡️', at: [6.5, -132], knight: true },
  { key: 'captain', name: 'Captain Isolde', role: 'The King’s Guard', icon: '👑', at: [-12, -199], knight: true }
);
CLUBS.sergeant = { key: 'sergeant', name: 'Bailey Garrison', full: 'The Bailey Garrison', short: 'GAR', tabard: '#26344d', trim: '#c9b48a', charge: 'chief', flag: '#3b93ff',
  roster: [{ num: 15, name: 'Sgt. Brask', arch: 'heavy', weapon: 'mace', shield: 'heater', helm: 'greathelm', prof: { react: 0.28, aggr: 1.0, guard: 0.6, cancel: 0.9 }, stab: 1.1, keep: true }] };
CLUBS.kingsguard = { key: 'kingsguard', name: 'King’s Guard', full: 'The King’s Guard', short: 'KGD', tabard: '#1c2a5a', trim: '#e3b341', charge: 'quarterly', flag: '#e3b341',
  roster: [
    { num: 1, name: 'Sir Edric', arch: 'heavy', weapon: 'longaxe', shield: null, helm: 'greathelm', prof: { react: 0.2, aggr: 1.15, guard: 0.72, cancel: 0.86 }, stab: 1.16, keep: true },
    { num: 2, name: 'Dame Maud', arch: 'striker', weapon: 'longsword', shield: null, helm: 'sallet', prof: { react: 0.2, aggr: 1.15, guard: 0.7, cancel: 0.86 }, stab: 1.1, keep: true },
    { num: 3, name: 'Sir Gawen', arch: 'polearm', weapon: 'polearm', shield: null, helm: 'cross', prof: { react: 0.22, aggr: 1.1, guard: 0.7, cancel: 0.87 }, stab: 1.1, keep: true },
    { num: 4, name: 'Sir Bors', arch: 'grappler', weapon: 'axe', shield: 'buckler', helm: 'pigface', prof: { react: 0.22, aggr: 1.1, guard: 0.68, cancel: 0.87 }, stab: 1.14, keep: true },
    { num: 5, name: 'Dame Elin', arch: 'runner', weapon: 'falchion', shield: 'buckler', helm: 'kettle', prof: { react: 0.2, aggr: 1.2, guard: 0.66, cancel: 0.86 }, stab: 1.06, keep: true }
  ] };
const TRIALS = {
  bailey: { station: 'sergeant', club: 'sergeant', mode: 1, venue: 'field', stage: 'The Bailey writ: a duel with Sergeant Brask', title: 'Bailey writ won', prize: 600 },
  royal: { station: 'captain', club: 'kingsguard', mode: 5, venue: 'castle', stage: 'The Royal writ: 5 v 5 against the King’s Guard', title: 'Royal writ won', prize: 2500 }
};
function stationTrial(key) {
  if (typeof BOS !== 'undefined' && BOS.testAdmin) testAdminApply();
  const T = TRIALS[key], R = REALM_TIERS[key], lv = CAREER.level || 1, has = realmHasWrit(key);
  const intro = key === 'bailey'
    ? (has ? '“You’ve got your writ. In you go, and wipe your feet.”' : lv < R.level ? `“The bailey’s for proven fighters. Come back at level ${R.level}. You’re level ${lv}.”` : '“Level enough, are you? Then show me. Best of three, here and now. Beat me and the gate’s yours.”')
    : (has ? '“The court knows your name. The inner gate is open to you.”' : lv < R.level ? `“The King’s Guard fight only those of level ${R.level}. You’re level ${lv}. Train, and come back.”` : '“Bring four of your own. We fight five a side in the Castle arena. Win, and the King will see you.”');
  townPanel(R.name, box => {
    const list = stationRows(box, intro, []);
    const can = !has && lv >= R.level;
    list.append(h('div', { class: 'up' }, h('div', null, h('div', { class: 'uph' }, h('b', null, has ? 'Writ held' : key === 'bailey' ? 'Duel Sergeant Brask' : 'Fight the King’s Guard')), h('div', { class: 'muted' }, has ? 'The gate opens for you. Walk on through.' : lv < R.level ? R.need : `Level met. Win this fight to earn the ${R.name}.`)),
      h('button', { class: 'btn small ' + (can ? 'primary flagtape' : 'tape'), disabled: can ? null : true, onclick: () => { if (!can) return; AU.click(); TOWN.returnTo = T.station; leaveTown(() => startTrial(key)); } }, has ? 'Done' : lv < R.level ? `Level ${R.level} needed` : 'Fight')));
  });
}
function startTrial(key) {
  const T = TRIALS[key]; G.attract = false; G.tourney = null; REP.log = []; endTraining();
  setupMatch({ mode: T.mode, opp: T.club, stage: T.stage, trial: key, venue: T.venue }); toTactics();
}
// called from matchEnd for a trial
function trialEnd(m, won, withPurse) {
  const key = m.trial, T = TRIALS[key], R = REALM_TIERS[key];
  if (won && !realmHasWrit(key)) { CAREER.writs = CAREER.writs || {}; CAREER.writs[key] = Date.now(); pay(T.prize); unlock(key === 'bailey' ? 'writ1' : 'writ2', true); saveCareer(); updateTitlePurse(); }
  const body = won ? `<p>You hold the ${R.name}. ${key === 'bailey' ? 'The bailey gate opens for you: the master smith, the master armourer and the barracks are inside.' : 'The inner gate opens: the royal smith, the royal armourer and the tailor are in the King’s Court.'} Bonus ${fmtMoney(T.prize)}.</p>` : `<p>Not this time. ${key === 'bailey' ? 'Sergeant Brask' : 'The King’s Guard'} will be waiting when you’re ready.</p>`;
  msg(key === 'bailey' ? 'the bailey gate' : 'the king’s guard', won ? T.title : 'Not yet', withPurse(body), won ? [['Back to the realm', toTitle, true]] : [['Try again', () => startTrial(key)], ['Back to the realm', toTitle, true]]);
}
