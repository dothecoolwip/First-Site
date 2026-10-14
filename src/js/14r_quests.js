// The Open Lists: authored quest chains and replayable regional work.
const Q = (kind, key, need = 1) => ({ kind, key, need });
const QUEST_ACTS = [
  { id: 'draw', name: 'Crooked Draw', hours: 4, cash: 600, xp: 1600, badge: 'First Bell', giver: 'Marshal Brenna',
    chapters: [
      ['The wrong name', 'Brenna finds a replacement name entered after the draw was sealed.', [Q('talk', 'marshal'), Q('talk', 'crier')]],
      ['A second ledger', 'Millbrook received a different list of opponents. Compare the records.', [Q('visit', 'village'), Q('talk', 'peasant:giant')]],
      ['Proof in the mud', 'Fight the disputed pairing and see who was expected to win.', [Q('win', 'peasant'), Q('combat', 'hit', 5)]],
      ['First bell', 'Wilf will publish the discrepancy, but asks whose account to trust.', [Q('talk', 'crier'), Q('visit', 'fair')], ['Believe Brenna', 'Protect Wilf']]
    ] },
  { id: 'straps', name: 'Straps and Scapegoats', hours: 5, cash: 800, xp: 2400, badge: 'Ironwood Witness', giver: 'Hilda of Millbrook',
    chapters: [
      ['Broken ties', 'Several fighters blame a Millbrook apprentice for failed straps.', [Q('talk', 'peasant:marshal'), Q('combat', 'repair', 2)]],
      ['The ore route', 'Follow the repair order west to Ashmarket.', [Q('visit', 'woods'), Q('visit', 'ashmarket')]],
      ['At the forge', 'Mara Flint identifies a forged inspection stamp.', [Q('talk', 'asmith'), Q('combat', 'block', 5)]],
      ['Scapegoat bout', 'Win in the Foundry Pit to make the testimony impossible to ignore.', [Q('win', 'foundry')], ['Stand with workers', 'Stand with inspectors']]
    ] },
  { id: 'ledger', name: 'River Ledger', hours: 5, cash: 1200, xp: 3200, badge: 'River Witness', giver: 'Tessa Quay',
    chapters: [
      ['Across the bridge', 'The armour invoices point downriver.', [Q('visit', 'stoneford'), Q('talk', 'sarmour')]],
      ['Wrong measurements', 'Aldric shows you armour ordered for fighters who never existed.', [Q('combat', 'repair', 2), Q('talk', 'sarmour')]],
      ['Dockside contest', 'A visiting team carries the missing ledger page.', [Q('win', 'bridge'), Q('combat', 'takedown', 2)]],
      ['The river account', 'Take the evidence to the citadel clerk.', [Q('visit', 'stoneford'), Q('talk', 'bridge:giant')], ['Trust the dockers', 'Trust the clerk']]
    ] },
  { id: 'vote', name: 'Bailey Vote', hours: 5, cash: 2000, xp: 4800, badge: 'Bailey Delegate', giver: 'Captain Lysa Vale',
    chapters: [
      ['A travelling vote', 'Southmere clubs were promised a say in the next list.', [Q('visit', 'southmere'), Q('talk', 'southmere:riding')]],
      ['The orchard lists', 'Earn the local fighters’ support in their arena.', [Q('win', 'orchard'), Q('combat', 'block', 5)]],
      ['The bailey record', 'Compare the local vote with the castle copy.', [Q('visit', 'bailey'), Q('talk', 'castle:marshal')]],
      ['Who speaks', 'Present the contradiction before the delegates.', [Q('talk', 'castle:giant')], ['Back the riders', 'Back the garrison']]
    ] },
  { id: 'north', name: 'Northwatch Trail', hours: 5, cash: 2800, xp: 6400, badge: 'Northwatch Ally', giver: 'Drillmaster Kael',
    chapters: [
      ['Northern orders', 'Kael has the training roster Voss altered.', [Q('visit', 'northwatch'), Q('talk', 'ntrainer')]],
      ['Show your work', 'The garrison will share it after you hold your own in practice.', [Q('combat', 'hit', 10), Q('combat', 'block', 8)]],
      ['The company bout', 'Fight the garrison’s chosen side in Northwatch Yard.', [Q('win', 'northwatch'), Q('combat', 'takedown', 2)]],
      ['Trail of signatures', 'Kael names the registrar and asks who should testify.', [Q('talk', 'ntrainer')], ['Let Kael testify', 'Let the fighters testify']]
    ] },
  { id: 'open', name: 'Open Lists', hours: 6, cash: 4000, xp: 8000, badge: 'Open Lists Champion', giver: 'Dame Ysabel Crown',
    chapters: [
      ['All witnesses', 'Bring the evidence to the Court; the live crowns are a separate challenge.', [Q('visit', 'ward'), Q('talk', 'hall:marshal')]],
      ['Voss answers', 'The registrar must face the people whose fights he changed.', [Q('talk', 'hall:giant'), Q('combat', 'perfect', 3)]],
      ['The final lists', 'Win the NPC championship before the assembled clubs.', [Q('win', 'hall'), Q('combat', 'takedown', 3)]],
      ['An open record', 'Have the result entered in the Great Hall.', [Q('talk', 'hall:giant')], ['Publish every ledger', 'Publish the verdict']]
    ] }
];
const QUEST_SIDES = [
  { id: 'reavers', name: 'Reavers Five', hours: 4, cash: 1200, xp: 3600, badge: 'Reavers Rival', giver: 'Reavers Captain', unlock: 'draw', stages: [
    ['The challenge', 'A rival captain calls you out.', [Q('talk', 'marshal')]], ['First exchange', 'Meet the Reavers in the Dome.', [Q('win', 'dome'), Q('combat', 'hit', 5)]],
    ['Read their style', 'Defend, counter and fight again.', [Q('combat', 'block', 8), Q('win', 'dome')]], ['Settled in the lists', 'Finish the rivalry publicly.', [Q('combat', 'takedown', 4), Q('talk', 'crier')]] ] },
  { id: 'millbrook', name: 'Millbrook and Woods', hours: 4, cash: 800, xp: 2800, badge: 'Millbrook Friend', giver: 'Hilda of Millbrook', unlock: 'draw', stages: [
    ['Harvest road', 'Visit the farms and the woodcutters.', [Q('visit', 'village'), Q('visit', 'woods')]], ['Missing timber', 'Ask both list crews about the carts.', [Q('talk', 'peasant:marshal'), Q('talk', 'forest:marshal')]],
    ['Forest trial', 'Earn the charcoal burners’ trust.', [Q('win', 'forest')]], ['A fair price', 'Report the true count to Hilda.', [Q('talk', 'peasant:marshal')]] ] },
  { id: 'lake', name: 'Mirror Lake Oath', hours: 3, cash: 900, xp: 2400, badge: 'Lake Oathkeeper', giver: 'Captain Irena Shore', unlock: 'straps', stages: [
    ['Shore promise', 'Irena explains a broken wager.', [Q('visit', 'lake'), Q('talk', 'beach:marshal')]], ['A witness', 'Question the shore herald.', [Q('talk', 'beach:giant')]],
    ['Strand fight', 'Settle the disputed bout.', [Q('win', 'beach'), Q('combat', 'block', 5)]], ['Keep the oath', 'Return to Irena.', [Q('talk', 'beach:marshal')]] ] },
  { id: 'workers', name: 'Ashmarket Workers', hours: 4.5, cash: 1500, xp: 4000, badge: 'Forge Companion', giver: 'Mara Flint', unlock: 'straps', stages: [
    ['The fuel line', 'Follow the ore road to the foundries.', [Q('visit', 'ashmarket'), Q('talk', 'asmith')]], ['Measured steel', 'Make a weapon or tool at the forge.', [Q('craft', 'smithing')]],
    ['Workers’ match', 'Fight for the smiths in the Foundry Pit.', [Q('win', 'foundry'), Q('combat', 'hit', 8)]], ['A master’s mark', 'Mara records the result.', [Q('talk', 'asmith')]] ] },
  { id: 'union', name: 'Stoneford Union', hours: 4.5, cash: 1500, xp: 4000, badge: 'Stoneford Ally', giver: 'Aldric Platewright', unlock: 'ledger', stages: [
    ['Armour lane', 'See how the fitters work.', [Q('visit', 'stoneford'), Q('talk', 'sarmour')]], ['A bad batch', 'Repair damaged kit.', [Q('combat', 'repair', 3)]],
    ['Dock claim', 'Win the waterfront bout.', [Q('win', 'bridge'), Q('combat', 'block', 8)]], ['The fitting book', 'Return the corrected order.', [Q('talk', 'sarmour')]] ] },
  { id: 'circuit', name: 'Southmere Circuit', hours: 4, cash: 1200, xp: 3400, badge: 'Southmere Rider', giver: 'Edda of Southmere', unlock: 'vote', stages: [
    ['Stable lesson', 'Meet the school and rent or bring a horse.', [Q('visit', 'southmere'), Q('talk', 'southmere:riding')]], ['On the course', 'Finish your first riding lesson.', [Q('riding', '1')]],
    ['Orchard bout', 'Join the local foot tournament.', [Q('win', 'orchard')]], ['Return the horse', 'Report to Edda.', [Q('talk', 'southmere:riding')]] ] },
  { id: 'company', name: 'Northwatch Company', hours: 4, cash: 1600, xp: 4000, badge: 'Company Fighter', giver: 'Drillmaster Kael', unlock: 'north', stages: [
    ['Company orders', 'Join Kael in the yard.', [Q('visit', 'northwatch'), Q('talk', 'ntrainer')]], ['The lesson', 'Earn a training rank through practice.', [Q('training', 'any')]],
    ['Company fight', 'Win at Northwatch.', [Q('win', 'northwatch'), Q('combat', 'perfect', 3)]], ['Report back', 'Kael adds you to the company book.', [Q('talk', 'ntrainer')]] ] },
  { id: 'archive', name: 'Crown Archive', hours: 2, cash: 900, xp: 1400, badge: 'Archive Witness', giver: 'Herald Celestine', unlock: 'open', stages: [
    ['The old law', 'Read the title record in the Great Hall.', [Q('visit', 'ward'), Q('talk', 'hall:giant')]], ['The holders', 'Check the current crown display.', [Q('talk', 'hall:marshal')]],
    ['Historical bout', 'Prove that a title is won in the lists.', [Q('win', 'hall')]], ['True succession', 'Celestine records the rule: defeat the holder.', [Q('talk', 'hall:giant')]] ] }
  ,{ id: 'cinder', name: 'Cinder Street', hours: 5, cash: 1500, xp: 3600, badge: 'Cinder Street Witness', giver: 'Foundry clerk', unlock: 'straps', stages: [
    ['A cold furnace', 'The night shift says someone cut the coal allotment after the roster was signed.', [Q('visit', 'ashmarket'), Q('talk', 'quest:ashmarket')]],
    ['Charcoal trail', 'Ask the woods crew who collected the fuel and test their account in the clearing.', [Q('visit', 'woods'), Q('talk', 'forest:marshal'), Q('win', 'forest')]],
    ['Cinders in the lists', 'The missing fuel paid a fighter to throw a Foundry Pit match. Win twice under the same rules.', [Q('win', 'foundry', 2), Q('combat', 'block', 8)]],
    ['A public tally', 'Put the corrected allotment on the clerk’s board where both shifts can read it.', [Q('talk', 'quest:ashmarket'), Q('talk', 'asmith')]] ] }
  ,{ id: 'hammer', name: 'Hammer Guild', hours: 5, cash: 1700, xp: 3800, badge: 'Hammer Guild Ally', giver: 'Mara Flint', unlock: 'cinder', stages: [
    ['Apprentice mark', 'Mara will not endorse a blade she has not watched you finish.', [Q('talk', 'asmith'), Q('craft', 'smithing', 2)]],
    ['Anvil measure', 'The smiths want proof that a balanced weapon can survive repeated bouts.', [Q('win', 'foundry', 2), Q('combat', 'hit', 12)]],
    ['The rival forge', 'A Stoneford order bears a false Ashmarket mark. Ask Aldric to compare the fittings.', [Q('visit', 'stoneford'), Q('talk', 'sarmour')]],
    ['Guild seal', 'Return the evidence and let Mara enter the true maker in the guild book.', [Q('talk', 'asmith'), Q('talk', 'quest:ashmarket')]] ] }
  ,{ id: 'riverward', name: 'River Ward', hours: 5, cash: 1500, xp: 3600, badge: 'River Ward Ally', giver: 'Tessa Quay', unlock: 'ledger', stages: [
    ['The late barge', 'Tessa has a delivery docket with no recipient and a bridge toll with no boat.', [Q('visit', 'stoneford'), Q('talk', 'quest:stoneford')]],
    ['Dock witnesses', 'The bridge crew saw the cargo moved during a tournament. Earn their account.', [Q('talk', 'bridge:marshal'), Q('win', 'bridge', 2)]],
    ['The empty crate', 'Aldric can identify the armour fasteners found where the shipment should have been.', [Q('talk', 'sarmour'), Q('combat', 'repair', 3)]],
    ['Ward record', 'Take the revised manifest to Tessa before another fighter is charged for the loss.', [Q('talk', 'quest:stoneford')]] ] }
  ,{ id: 'harness', name: 'Harness Trials', hours: 5, cash: 1800, xp: 4000, badge: 'Platewright Tested', giver: 'Aldric Platewright', unlock: 'riverward', stages: [
    ['Measure twice', 'Aldric fits armour by observing how you move and defend.', [Q('talk', 'sarmour'), Q('combat', 'block', 12)]],
    ['Hard use', 'Take the fitted harness through two Bridge Lists bouts.', [Q('win', 'bridge', 2), Q('combat', 'takedown', 3)]],
    ['Field repair', 'Return with the damaged parts and mend them under the platewright’s eye.', [Q('combat', 'repair', 4), Q('talk', 'sarmour')]],
    ['Fitter’s book', 'Aldric records the dimensions so future repairs match the original harness.', [Q('talk', 'quest:stoneford')]] ] }
  ,{ id: 'orchardoath', name: 'Orchard Oath', hours: 5, cash: 1400, xp: 3400, badge: 'Orchard Oathkeeper', giver: 'Captain Lysa Vale', unlock: 'vote', stages: [
    ['The old boundary', 'Lysa shows you where the orchard was promised to the riding school.', [Q('visit', 'southmere'), Q('talk', 'quest:southmere-captain')]],
    ['A rider’s account', 'Edda knows why the boundary moved. Train with her before you ask.', [Q('talk', 'southmere:riding'), Q('riding', '1')]],
    ['Orchard witnesses', 'The local fighters will testify after you join their lists twice.', [Q('win', 'orchard', 2), Q('combat', 'block', 8)]],
    ['Restore the line', 'Bring both accounts to Lysa for the public register.', [Q('talk', 'quest:southmere-captain'), Q('talk', 'quest:southmere')]] ] }
  ,{ id: 'longride', name: 'Long Ride', hours: 5, cash: 1500, xp: 3600, badge: 'Long Ride Finisher', giver: 'Edda of Southmere', unlock: 'orchardoath', stages: [
    ['Saddle check', 'Edda asks you to check the horse before the long circuit.', [Q('talk', 'southmere:riding'), Q('riding', '1')]],
    ['Across the realm', 'Carry the school’s messages to the woods and river without abandoning the route.', [Q('visit', 'woods'), Q('visit', 'stoneford')]],
    ['The return leg', 'Finish at the orchard, then prove you can still fight after travel.', [Q('visit', 'southmere'), Q('win', 'orchard', 2)]],
    ['Rider’s ledger', 'Edda records the distance and who completed the circuit.', [Q('talk', 'southmere:riding')]] ] }
  ,{ id: 'winterwatch', name: 'Winter Watch', hours: 5, cash: 1700, xp: 4200, badge: 'Watch Veteran', giver: 'Company scribe', unlock: 'north', stages: [
    ['The night roster', 'The company scribe finds a missing patrol between two signed watches.', [Q('visit', 'northwatch'), Q('talk', 'quest:northwatch')]],
    ['Patrol route', 'Trace the road back toward the old castle and question its marshal.', [Q('visit', 'bailey'), Q('talk', 'castle:marshal')]],
    ['Yard assessment', 'Kael tests whether the absent patrol was replaced by fighters ready for duty.', [Q('talk', 'ntrainer'), Q('win', 'northwatch', 2), Q('combat', 'perfect', 4)]],
    ['Name the watch', 'Restore the missing patrol to the scribe’s roll.', [Q('talk', 'quest:northwatch')]] ] }
  ,{ id: 'cadets', name: 'Cadet Trials', hours: 5, cash: 1800, xp: 4400, badge: 'Cadet Mentor', giver: 'Drillmaster Kael', unlock: 'winterwatch', stages: [
    ['First discipline', 'Kael asks you to learn a drill and show its value under pressure.', [Q('talk', 'ntrainer'), Q('training', 'any')]],
    ['Hold the line', 'Defend the company standard through repeated yard bouts.', [Q('win', 'northwatch', 2), Q('combat', 'block', 12)]],
    ['Carry the lesson', 'Visit the Foundry Pit, then bring its fighters’ techniques back north.', [Q('visit', 'ashmarket'), Q('win', 'foundry'), Q('visit', 'northwatch')]],
    ['The cadet roll', 'Report what should be taught next to Kael and the scribe.', [Q('talk', 'ntrainer'), Q('talk', 'quest:northwatch')]] ] }
];
const QUEST_REPEAT = [
  { id: 'regional', name: 'Regional Circuit', targets: ['peasant', 'forest', 'beach', 'foundry', 'bridge', 'orchard', 'northwatch'], steps: 3, cash: 300, xp: 300, badge: 'Circuit Regular' },
  { id: 'guild', name: 'Guild Contracts', targets: ['dome', 'peasant', 'bridge', 'castle'], steps: 2, cash: 240, xp: 240, badge: 'Guild Regular' },
  { id: 'masterwork', name: 'Masterwork Commissions', targets: ['smithing', 'forging', 'artificing'], steps: 3, cash: 300, xp: 300, badge: 'Masterwork Regular' },
  { id: 'grudge', name: 'Rival Grudge Series', targets: ['dome', 'foundry', 'orchard', 'northwatch'], steps: 3, cash: 450, xp: 450, badge: 'Rival Regular' }
];
const QUESTS = [];
const QUEST_PLANNED_HOURS = QUEST_ACTS.reduce((n, a) => n + a.hours, 0) + QUEST_SIDES.reduce((n, s) => n + s.hours, 0);
for (const act of QUEST_ACTS) act.chapters.forEach(([name, story, objectives, choices], i) => QUESTS.push({ id: `main:${act.id}:${i + 1}`, line: act.id, kind: 'main', index: i, name, story, objectives, choices, giver: act.giver, cash: Math.floor(act.cash / 4), xp: Math.floor(act.xp / 4), badge: i === 3 ? act.badge : '' }));
for (const side of QUEST_SIDES) side.stages.forEach(([name, story, objectives], i) => QUESTS.push({ id: `side:${side.id}:${i + 1}`, line: side.id, kind: 'side', index: i, name, story, objectives, giver: side.giver, cash: Math.floor(side.cash / 4), xp: Math.floor(side.xp / 4), badge: i === 3 ? side.badge : '', unlock: side.unlock }));
const QUEST_BY_ID = Object.fromEntries(QUESTS.map(q => [q.id, q]));
function questState() {
  const c = CAREER.quests || (CAREER.quests = {});
  if (c.version !== 1) { c.version = 1; c.entries = c.entries || {}; c.relations = c.relations || {}; c.badges = c.badges || {}; c.repeat = c.repeat || {}; c.ledger = c.ledger || []; c.pin = c.pin || ''; }
  c.ledger = c.ledger || [];
  return c;
}
function questAvailable(q) {
  if (q.kind === 'main') {
    const ai = QUEST_ACTS.findIndex(a => a.id === q.line);
    const prev = q.index ? `main:${q.line}:${q.index}` : ai ? `main:${QUEST_ACTS[ai - 1].id}:4` : '';
    return !prev || questState().entries[prev]?.status === 'claimed';
  }
  const prev = q.index ? `side:${q.line}:${q.index}` : `${QUEST_SIDES.some(s => s.id === q.unlock) ? 'side' : 'main'}:${q.unlock}:4`;
  return questState().entries[prev]?.status === 'claimed';
}
function questEntry(id) { return questState().entries[id] || null; }
function questAccept(id) {
  const q = QUEST_BY_ID[id], c = questState(); if (!q || !questAvailable(q) || c.entries[id]) return;
  c.entries[id] = { status: 'active', counts: q.objectives.map(() => 0), choice: '' };
  c.pin = id; saveCareer();
  if (TOWN.pos) questEvent('visit', { district: districtAt(TOWN.pos.x, TOWN.pos.z).key });
}
function questObjectiveText(o) {
  if (o.kind === 'visit') return `Go to ${DISTRICTS.find(d => d.key === o.key)?.name || o.key}`;
  if (o.kind === 'talk') return `Speak to ${STATIONS.find(s => s.key === o.key)?.name || VENDOR_BY[o.key]?.name || o.key}`;
  if (o.kind === 'win') return `Win at ${ARENAS.find(a => a.key === o.key)?.name || o.key}`;
  if (o.kind === 'combat') return `${{ hit: 'Land clean hits', block: 'Block attacks', repair: 'Repair kit', takedown: 'Score takedowns', perfect: 'Perfectly defend' }[o.key] || o.key}`;
  if (o.kind === 'craft') return `Craft using ${o.key}`;
  if (o.kind === 'training') return 'Earn a drill rank through practice';
  if (o.kind === 'riding') return 'Complete a Southmere riding lesson';
  return o.key;
}
function questMatches(o, type, d) {
  if (o.kind === 'visit') return type === 'visit' && d.district === o.key;
  if (o.kind === 'talk') return type === 'talk' && d.key === o.key;
  if (o.kind === 'win') return type === 'match' && d.won && d.arena === o.key;
  if (o.kind === 'combat') return type === 'combat' && d.action === o.key && (o.key !== 'hit' || !d.blocked);
  if (o.kind === 'craft') return type === 'craft' && d.skill === o.key;
  if (o.kind === 'training') return type === 'training' && (o.key === 'any' || d.discipline === o.key);
  if (o.kind === 'riding') return type === 'riding' && d.rank >= Number(o.key);
  return false;
}
function questEvent(type, data = {}) {
  if (G.autopilot || (G.attract && !TOWN.on)) return;
  const c = questState(); let changed = false;
  for (const q of QUESTS) {
    const e = c.entries[q.id]; if (!e || e.status !== 'active') continue;
    q.objectives.forEach((o, i) => { if (e.counts[i] >= o.need || !questMatches(o, type, data)) return; e.counts[i]++; changed = true; });
    if (q.objectives.every((o, i) => e.counts[i] >= o.need)) { e.status = 'ready'; changed = true; toastMenu(`Quest ready: ${q.name}. Open the journal to collect your reward.`); }
  }
  for (const r of QUEST_REPEAT) {
    const e = c.repeat[r.id]; if (!e || e.status !== 'active') continue;
    const target = r.targets[(e.index + (e.progress || 0)) % r.targets.length];
    if ((r.id === 'masterwork' && type === 'craft' && data.skill === target) || (r.id !== 'masterwork' && type === 'match' && data.won && data.arena === target)) {
      e.progress = (e.progress || 0) + 1; changed = true;
      if (e.progress >= r.steps) { e.status = 'ready'; toastMenu(`${r.name} contract complete. Claim it in the journal.`); }
    }
  }
  if (changed) saveCareer();
}
EV_LISTENERS.push((action, data) => questEvent('combat', { action, ...data }));
function questClaim(id, choice) {
  const q = QUEST_BY_ID[id], c = questState(), e = c.entries[id];
  if (!q || !e || e.status !== 'ready' || q.choices && !q.choices.includes(choice)) return;
  e.status = 'claimed'; e.choice = choice || ''; e.claimedAt = Date.now();
  if (choice) c.relations[q.line] = choice;
  if (q.badge) c.badges[q.badge + (choice ? ` · ${choice}` : '')] = true;
  c.ledger.push({ id, cash: q.cash, xp: q.xp, choice: choice || '', at: e.claimedAt });
  pay(q.cash, q.name); gainXP(q.xp, q.name); saveCareer();
  toastMenu(`${q.name} complete: ${fmtMoney(q.cash)}, ${q.xp} XP${q.badge ? `, ${q.badge}` : ''}.`);
}
function questRepeatAccept(id) {
  const r = QUEST_REPEAT.find(x => x.id === id), c = questState(); if (!r) return;
  const e = c.repeat[id] || (c.repeat[id] = { index: 0, completed: 0, progress: 0, status: 'available' });
  if (e.status === 'available') { e.status = 'active'; e.progress = 0; saveCareer(); }
}
function questRepeatClaim(id) {
  const r = QUEST_REPEAT.find(x => x.id === id), e = questState().repeat[id]; if (!r || !e || e.status !== 'ready') return;
  e.status = 'available'; e.completed++; e.index++; e.progress = 0; e.lastClaimed = Date.now();
  if (e.completed === 10) questState().badges[r.badge] = true;
  questState().ledger.push({ id: `repeat:${id}:${e.completed}`, cash: r.cash, xp: r.xp, at: e.lastClaimed });
  pay(r.cash, r.name); gainXP(r.xp, r.name); saveCareer();
}
function questWaypoint(q) {
  const o = q.objectives.find((x, i) => (questEntry(q.id)?.counts[i] || 0) < x.need);
  if (!o) return;
  const at = o.kind === 'visit' ? DISTRICTS.find(x => x.key === o.key) : o.kind === 'win' ? ARENAS.find(x => x.key === o.key) : o.kind === 'talk' ? STATIONS.find(x => x.key === o.key) || VENDOR_BY[o.key] : null;
  const p = at?.at || (at ? [at.x, at.z] : null);
  if (p) { questState().pin = q.id; setWaypoint(p[0], p[1], q.name); saveCareer(); }
}
function openQuestJournal() {
  townPanel('Quest journal', box => {
    const c = questState();
    box.append(h('p', { class: 'muted' }, `The Open Lists · ${QUESTS.filter(q => q.kind === 'main').length} main quests, ${QUESTS.filter(q => q.kind === 'side').length} side quests and four rotating contract lines. Pinning a route is optional. Rewards are collected once.`));
    const claimed = QUESTS.filter(q => c.entries[q.id]?.status === 'claimed').length;
    const paid = c.ledger.reduce((sum, item) => sum + (item.cash || 0), 0);
    const earnedXP = c.ledger.reduce((sum, item) => sum + (item.xp || 0), 0);
    box.append(h('p', { class: 'muted' }, `${claimed}/${QUESTS.length} chapters completed · ${QUEST_PLANNED_HOURS} estimated hours across the story lines · ${fmtMoney(paid)} and ${earnedXP} XP earned from quests.`));
    for (const [label, kind] of [['Main story', 'main'], ['Side stories', 'side']]) {
      box.append(h('h3', null, label));
      const visible = QUESTS.filter(q => q.kind === kind && (questAvailable(q) || c.entries[q.id]));
      for (const q of visible) {
      const e = c.entries[q.id], status = e?.status || 'available', card = h('div', { class: 'up' });
        const previousChoice = q.kind === 'main' ? c.relations[QUEST_ACTS[Math.max(0, QUEST_ACTS.findIndex(a => a.id === q.line) - 1)]?.id] : '';
        const detail = h('div', null, h('div', { class: 'uph' }, h('b', null, q.name), h('small', null, status)), h('div', { class: 'muted' }, `${q.giver}: ${q.story}${previousChoice ? ` Your earlier choice: ${previousChoice}.` : ''}`));
        if (e) for (let i = 0; i < q.objectives.length; i++) detail.append(h('div', { class: 'small' }, `${e.counts[i] >= q.objectives[i].need ? '✓' : '○'} ${questObjectiveText(q.objectives[i])} · ${Math.min(e.counts[i], q.objectives[i].need)}/${q.objectives[i].need}`));
        detail.append(h('small', { class: 'muted' }, `${fmtMoney(q.cash)} · ${q.xp} XP${q.badge ? ' · ' + q.badge : ''}`));
        const buttons = h('div', { class: 'row' });
        if (!e) buttons.append(h('button', { class: 'btn primary small', onclick: () => { questAccept(q.id); openQuestJournal(); } }, 'Accept'));
        if (status === 'active') buttons.append(h('button', { class: 'btn tape small', onclick: () => { questWaypoint(q); closeVendor(); } }, 'Mark route'));
        if (status === 'ready') {
          for (const choice of q.choices || ['Claim']) buttons.append(h('button', { class: 'btn primary small', onclick: () => { questClaim(q.id, q.choices ? choice : ''); openQuestJournal(); } }, choice));
        }
        card.append(detail, buttons); box.append(card);
      }
    }
    box.append(h('h3', null, 'Repeatable contracts'));
    for (const r of QUEST_REPEAT) {
      const e = c.repeat[r.id] || { index: 0, completed: 0, progress: 0, status: 'available' }, target = r.targets[(e.index + (e.progress || 0)) % r.targets.length];
      const place = ARENAS.find(a => a.key === target)?.name || target;
      box.append(h('div', { class: 'up' }, h('div', null, h('div', { class: 'uph' }, h('b', null, r.name), h('small', null, `${e.completed} completed`)),
        h('div', { class: 'muted' }, `${r.id === 'masterwork' ? 'Craft with' : 'Win at'} ${place}. ${e.progress || 0}/${r.steps} tasks · ${fmtMoney(r.cash)} and ${r.xp} XP per contract.`)),
        h('button', { class: 'btn primary small', onclick: () => { if (e.status === 'ready') questRepeatClaim(r.id); else questRepeatAccept(r.id); openQuestJournal(); } }, e.status === 'ready' ? 'Claim' : e.status === 'active' ? 'Active' : 'Accept')));
    }
    const badges = Object.keys(c.badges).filter(k => c.badges[k]);
    if (badges.length) box.append(h('p', { class: 'muted' }, `Earned honours: ${badges.join(', ')}`));
    if (c.ledger.length) {
      box.append(h('h3', null, 'Recent rewards'));
      for (const entry of c.ledger.slice(-6).reverse()) box.append(h('div', { class: 'small muted' }, `${QUEST_BY_ID[entry.id]?.name || entry.id} · ${fmtMoney(entry.cash)} · ${entry.xp} XP`));
    }
  });
}
STATIONS.push(
  { key: 'quest:fair', name: 'Campaign herald', role: 'Quest journal', icon: '📜', at: [-8, 79] },
  { key: 'quest:reavers', name: 'Reavers Captain', role: 'Rival quest giver', icon: '⚔️', at: [34, 73] },
  { key: 'quest:ashmarket', name: 'Foundry clerk', role: 'Quest journal', icon: '📜', at: [-833, -210] },
  { key: 'quest:stoneford', name: 'Tessa Quay', role: 'Stoneford dock clerk', icon: '📜', at: [886, 181] },
  { key: 'quest:southmere', name: 'Circuit steward', role: 'Quest journal', icon: '📜', at: [-86, 946] },
  { key: 'quest:southmere-captain', name: 'Captain Lysa Vale', role: 'Southmere riding captain', icon: '🐴', at: [-75, 925] },
  { key: 'quest:northwatch', name: 'Company scribe', role: 'Quest journal', icon: '📜', at: [7, -989] }
);
