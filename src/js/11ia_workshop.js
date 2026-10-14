// Persistent career equipment and the shared fault-driven workshop.
const REPAIR_FAULTS = {
  handoff: { name: 'Safe corner handoff', steps: ['Collect the reserve', 'Keep outside the rail', 'Present the handle', 'Check the fighter has it'] },
  strap: { name: 'Torn strap', part: 'straps', steps: ['Thread the first loop', 'Thread the second loop', 'Set strap tension', 'Secure the end'] },
  buckle: { name: 'Loose buckle', steps: ['Seat the strap', 'Tighten into the gold range', 'Secure the buckle'] },
  fitting: { name: 'Loose fitting', part: 'fittings', steps: ['Align the fitting', 'Fasten the first mount', 'Fasten the second mount', 'Check stability'] },
  wrap: { name: 'Damaged grip wrap', steps: ['Rip', 'Wrap', 'Smooth'] },
  dent: { name: 'Dented armour', steps: ['Straighten the first dent', 'Straighten the second dent', 'Check the plate'] },
  clean: { name: 'Dirty equipment', steps: ['Brush the first area', 'Wipe the second area', 'Finish cleaning'] },
  haft: { name: 'Snapped haft', part: 'hafts', steps: ['Remove the broken haft', 'Fit the spare haft', 'Secure the attachment', 'Check stability'] }
};
function careerMatch(m = G.match) { return !!m && !m.training && !m.online && !m.versus && !m.kids && !m.attract && !m.townBout && !m.test && !G.attract && !G.autoflow; }
function normalizeRepairPiece(p, key) {
  p.cond = clamp(Number.isFinite(p.cond) ? p.cond : 1, 0, 1);
  p.failed = !!p.failed; p.covered = !!p.covered; p.temporary = !!p.temporary;
  if (!REPAIR_FAULTS[p.fault]) p.fault = p.failed ? key === 'haft' ? 'wrap' : 'strap' : p.cond < 0.75 ? key === 'haft' ? 'wrap' : 'buckle' : null;
  if (!p.work || !REPAIR_FAULTS[p.work.fault] || !Number.isInteger(p.work.index)) p.work = null;
  return p;
}
function equipmentState() {
  if (!CAREER.equipment) {
    const tourney = store.get('tourney', null), old = store.get('run', null) || store.get('season', null) || (tourney?.kits?.[4] ? { kit: tourney.kits[4], weapon: G.loadout.weapon } : null), kit = old?.kit;
    CAREER.equipment = { version: 1, armour: {}, weapons: {} };
    if (kit) { for (const k of ['helmet', 'armL', 'armR', 'legs']) if (kit[k]) CAREER.equipment.armour[k] = JSON.parse(JSON.stringify(kit[k])); if (kit.haft) CAREER.equipment.weapons[old.weapon || G.loadout.weapon] = JSON.parse(JSON.stringify(kit.haft)); }
  }
  const E = CAREER.equipment;
  E.version = 1; E.armour = E.armour || {}; E.weapons = E.weapons || {};
  for (const k of ['helmet', 'armL', 'armR', 'legs']) E.armour[k] = normalizeRepairPiece(E.armour[k] || { cond: 1 }, k);
  return E;
}
function careerKit(spec) {
  const E = equipmentState(), weapon = spec.weapon;
  E.weapons[weapon] = normalizeRepairPiece(E.weapons[weapon] || { cond: 1 }, 'haft');
  return JSON.parse(JSON.stringify({ ...E.armour, haft: E.weapons[weapon] }));
}
function storeCareerKit(kit, weapon) {
  if (!kit || !weapon) return;
  const E = equipmentState();
  for (const k of ['helmet', 'armL', 'armR', 'legs']) if (kit[k]) E.armour[k] = normalizeRepairPiece(JSON.parse(JSON.stringify(kit[k])), k);
  if (kit.haft) E.weapons[weapon] = normalizeRepairPiece(JSON.parse(JSON.stringify(kit.haft)), 'haft');
  saveCareer();
}
function persistPlayerKit() {
  const m = G.match, p = G.player; if (!p || !careerMatch(m) || REP.workshop) return;
  storeCareerKit(p.kit, m.careerWeapon || p.spec.weapon);
  if (G.run && m.run && !m.season && G.run.code === m.run) { G.run.kit = JSON.parse(JSON.stringify(p.kit)); G.run.weapon = p.spec.weapon; store.set('run', G.run); }
  if (m.season) { const S = store.get('season', null); if (S) { S.kit = JSON.parse(JSON.stringify(p.kit)); store.set('season', S); } }
  if (G.tourney) saveTourney();
}
function repairRecordFault(f, piece, fault) {
  const p = f.kit[piece]; normalizeRepairPiece(p, piece);
  if (p.fault !== fault) p.work = null;
  p.fault = fault; p.temporary = false; p.cleaned = false;
  if (f.isPlayer) persistPlayerKit();
}
function repairFinish(q, tape) {
  const p = REP.player.kit[REP.piece], fault = REP.task?.fault || p.fault || (REP.piece === 'haft' ? 'wrap' : 'strap');
  const definition = REPAIR_FAULTS[fault];
  // Consume a replacement once it is actually fitted, not at task selection.
  const work = p.work;
  if (definition.part && !work?.installed && !repairInstallPart(p, fault)) return false;
  q = clamp(q * (CAREER.skills?.['show.tape'] ? 1.15 : 1) * (1 + shopFx('tapeQ')) * (squireGoodCare() ? 1.05 : 1), 0, 1);
  if (fault === 'clean') { p.cleaned = true; }
  else {
    p.cond = Math.max(p.cond, REP.proper ? 0.85 + 0.15 * q : Math.min(0.7, p.cond + 0.35 + 0.35 * q));
    p.failed = false; p.covered = false; p.temporary = !REP.proper;
    p.fault = REP.proper ? null : fault;
    if (tape) p.tape = tape;
  }
  p.work = null;
  if (fault === 'wrap' && tape && !REP.training) useTape(tape);
  if (!REP.training) logTape(REP.piece, tape || 'black', q);
  if (REP.training) { const S = teamSquire(); S.training[fault] = true; saveCareer(); }
  else if (REP.workshop) { storeCareerKit(REP.player.kit, REP.player.spec.weapon); syncServicedKit(REP.player.kit, REP.player.spec.weapon); }
  else persistPlayerKit();
  repPop(REP.proper ? 'SERVICED' : fault === 'clean' ? 'CLEAN' : 'SAFE · TEMPORARY', '#62c462');
  $('#benchMsg').textContent = `${PIECE_SHORT[REP.piece][0]}: ${Math.round(p.cond * 100)}%. ${p.temporary ? 'Proper servicing still needed in town.' : 'Workshop task complete.'}`;
  REP.task = null; finishPiece(); renderDrawer(); return true;
}
function repairInstallPart(p, fault) {
  const kind = REPAIR_FAULTS[fault].part; if (!kind || REP.training || p.work?.installed) return true;
  const B = squireBook();
  if (!REP.proper && kind === 'straps' && REP.fieldSpares > 0) REP.fieldSpares--;
  else if (B.stock[kind] > 0) B.stock[kind]--;
  else if (kind !== 'hafts' && !REP.proper && p.failed) { /* Free essential armour safety materials. */ }
  else { $('#benchMsg').textContent = `You need a spare ${kind === 'hafts' ? 'haft' : kind === 'straps' ? 'strap' : 'fitting kit'}. Buy supplies at the quartermaster. Basic armour safety repairs remain free in field breaks.`; return false; }
  if (p.work) p.work.installed = true; saveCareer(); return true;
}
function startRepairTask(fault) {
  const p = REP.player.kit[REP.piece], D = REPAIR_FAULTS[fault];
  if (!D) return;
  if (D.part && !REP.training && !p.work?.installed && !squireBook().stock[D.part] && !(D.part === 'straps' && !REP.proper && REP.fieldSpares > 0) && !(!REP.proper && p.failed && D.part !== 'hafts')) { $('#benchMsg').textContent = `Needs one spare ${D.part}. Buy supplies at the quartermaster or workshop before starting. Free manual essential armour safety fixes are still available.`; return; }
  const old = p.work, resume = old && old.fault === fault && old.proper === !!REP.proper;
  const offset = ((REP.lastLayout || 0) + 1 + Math.floor(Math.random() * 4)) % 8; REP.lastLayout = offset;
  const targets = resume ? old.targets : D.steps.map((_, i) => ({ x: 0.22 + ((i * 3 + offset) % 7) * 0.09, y: i % 2 ? 0.65 : 0.36 }));
  p.work = resume ? old : { fault, proper: !!REP.proper, index: 0, score: 0, targets, installed: !!old?.installed };
  REP.task = { fault, targets, index: p.work.index, score: p.work.score };
  REP.step = 'task'; REP.ripT = 0; setSteps('task'); renderRepairActions(); repairTaskMessage(); drawBench();
}
function repairTaskMessage() {
  const T = REP.task; if (!T) return;
  const gesture = T.fault === 'clean' ? 'Brush back and forth over the marked area.' : ['strap', 'haft'].includes(T.fault) ? 'Drag along the guide, then secure the highlighted fastening.' : T.fault === 'buckle' ? 'Drag to tighten; finish when the marker is in the gold.' : T.fault === 'dent' ? 'Tap the marked dent when the marker is in the gold.' : 'Align the part, then tap its fasteners.';
  $('#benchMsg').textContent = REPAIR_FAULTS[T.fault].name + ': ' + REPAIR_FAULTS[T.fault].steps[T.index] + '. ' + (squireBook().assisted ? 'Press Next guided action.' : gesture);
  $('#steps').replaceChildren(...REPAIR_FAULTS[T.fault].steps.map((s, i) => h('span', { class: i < T.index ? 'done' : i === T.index ? 'on' : '' }, `${i + 1} ${s}`)));
}
function saveWrapWork() {
  if (!['rip', 'wrap', 'smooth'].includes(REP.step) || REP.training) return;
  const p = REP.player.kit[REP.piece]; p.work = { fault: 'wrap', index: 0, proper: !!REP.proper, step: REP.step, wraps: REP.wraps, wrinkles: REP.wrinkles, q: REP.q, side: REP.side, sloppy: REP.sloppy, tape: REP.tape };
  const signature = REP.piece + REP.step + REP.wraps.length + ':' + REP.wrinkles.filter(w => w.gone).length;
  if (REP.wrapSaved === signature) return; REP.wrapSaved = signature;
  if (REP.workshop) storeCareerKit(REP.player.kit, REP.player.spec.weapon); else persistPlayerKit();
}
function repairTaskInput(p, assisted = false) {
  const T = REP.task; if (!T || REP.step !== 'task') return;
  const point = T.targets[T.index], d = Math.hypot(p.x - point.x, p.y - point.y);
  if (!assisted && d > 0.14) { $('#benchMsg').textContent = 'Aim for the large highlighted guide. No materials lost.'; return; }
  const timed = ['buckle', 'dent'].includes(T.fault), q = assisted ? 1 : clamp(1 - d * 1.2 - (timed ? Math.abs(ripNeedle() - 0.5) * 0.3 : 0), 0.6, 1);
  const pc = REP.player.kit[REP.piece];
  if (REPAIR_FAULTS[T.fault].part && T.index === 1 && !repairInstallPart(pc, T.fault)) return;
  T.score += q; T.index++; pc.work.index = T.index; pc.work.score = T.score;
  AU.wrap(); if (REP.workshop && !REP.training) storeCareerKit(REP.player.kit, REP.player.spec.weapon); else if (!REP.training) persistPlayerKit();
  if (T.index >= T.targets.length) { repairFinish(T.score / T.targets.length); renderRepairActions(); }
  else repairTaskMessage();
}
function repairTaskPointer(p, moving) {
  const T = REP.task; if (!T) return;
  const target = T.targets[T.index], d = Math.hypot(p.x - target.x, p.y - target.y);
  const drag = T.fault === 'clean' || (['strap','haft'].includes(T.fault) && T.index < 2) || (T.fault === 'buckle' && T.index === 1);
  if (!moving) { REP.taskDrag = { last: p, distance: 0 }; if (!drag) repairTaskInput(p); return; }
  if (!REP.taskDrag || !REP.ptr) return;
  REP.taskDrag.distance += Math.hypot(p.x - REP.taskDrag.last.x, p.y - REP.taskDrag.last.y); REP.taskDrag.last = p;
  if (drag && d < 0.14 && REP.taskDrag.distance >= (T.fault === 'clean' ? 0.3 : 0.12)) { REP.taskDrag.distance = 0; repairTaskInput(p); }
}
function renderRepairActions() {
  let box = $('#repairActions'); if (!box) { box = h('div', { id: 'repairActions', class: 'repair-actions' }); $('#bench').parentElement.after(box); }
  box.replaceChildren();
  const assisted = h('input', { type: 'checkbox', checked: !!squireBook().assisted, onchange: e => { squireBook().assisted = e.target.checked; saveCareer(); renderRepairActions(); } });
  box.append(h('label', null, assisted, ' Guided repair actions'));
  if (REP.task) { const part = REPAIR_FAULTS[REP.task.fault].part; if (part) box.append(h('span', { class: 'muted' }, `Materials: ${squireBook().stock[part]} ${part} stored${!REP.proper && part !== 'hafts' && REP.player.kit[REP.piece].failed ? ' · free essential safety materials available' : ''}`)); }
  if (REP.step === 'task' && REP.task) box.append(h('button', { class: 'btn primary', onclick: () => { const T = REP.task; if (T) repairTaskInput(T.targets[T.index], true); } }, squireBook().assisted ? 'Next guided action' : 'Complete highlighted action (keyboard/controller)'));
  if (REP.step === 'rip') box.append(h('button', { class: 'btn', onclick: () => benchDown({ x: 0.5, y: 0.5 }) }, 'Rip tape'));
  if (REP.step === 'wrap') box.append(h('button', { class: 'btn', onclick: () => { const x = ZONE.a + Math.min(REP.wraps.length, 4) * (ZONE.b - ZONE.a) / 4; benchMove({ x, y: 0.2 }); benchMove({ x, y: 0.8 }); } }, 'Lay next wrap'));
  if (REP.step === 'smooth') box.append(h('button', { class: 'btn', onclick: () => { const w = REP.wrinkles.find(w => !w.gone); if (w) benchMove({ x: w.x, y: w.y }); } }, 'Smooth next bubble'));
  if (!REP.step && REP.proper && REP.piece) box.append(h('button', { class: 'btn', onclick: () => startRepairTask('clean') }, 'Clean this item (optional)'));
}
function drawRepairTask(ctx, W, H) {
  const T = REP.task, D = REPAIR_FAULTS[T.fault];
  ctx.fillStyle = T.fault === 'haft' || REP.piece === 'haft' ? '#8d653b' : '#8f999e';
  ctx.beginPath(); ctx.roundRect(W * 0.12, H * 0.22, W * 0.76, H * 0.55, H * 0.1); ctx.fill();
  if (['strap','buckle'].includes(T.fault)) { ctx.fillStyle = '#694629'; ctx.fillRect(W * 0.12, H * 0.42, W * 0.76, H * 0.17); ctx.strokeStyle = '#d0a45b'; ctx.lineWidth = 6; ctx.strokeRect(W * 0.72, H * 0.36, W * 0.08, H * 0.29); }
  if (T.fault === 'haft') { ctx.fillStyle = '#392311'; ctx.fillRect(W * 0.48, H * 0.24, W * 0.04, H * 0.5); ctx.strokeStyle = '#dbc49a'; ctx.beginPath(); ctx.moveTo(W * 0.45,H * 0.52);ctx.lineTo(W * 0.55,H * 0.46);ctx.stroke(); }
  if (T.fault === 'fitting') { ctx.fillStyle = '#d6dce0'; ctx.fillRect(W * 0.35,H * 0.31,W * 0.3,H * 0.38); }
  if (['dent','clean'].includes(T.fault)) for (let i=T.index;i<T.targets.length;i++) { const p=T.targets[i]; ctx.fillStyle = T.fault === 'clean' ? '#4e4029' : '#566066';ctx.beginPath();ctx.ellipse(p.x*W,p.y*H,W*.09,H*.1,.2,0,TAU);ctx.fill(); }
  ctx.strokeStyle = '#d4b44a'; ctx.lineWidth = 6; ctx.beginPath();
  T.targets.forEach((p, i) => { if (!i) ctx.moveTo(p.x * W, p.y * H); else ctx.lineTo(p.x * W, p.y * H); }); ctx.stroke();
  T.targets.forEach((p, i) => { ctx.fillStyle = i < T.index ? '#62c462' : i === T.index ? '#f2c40f' : '#43494b'; ctx.beginPath(); ctx.arc(p.x * W, p.y * H, Math.max(22, H * 0.085), 0, TAU); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = `${Math.max(18, H * 0.075)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), p.x * W, p.y * H + 7); });
  ctx.fillStyle = '#fff'; ctx.font = `${Math.max(15, H * 0.065)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(D.name + ' · ' + PIECE_SHORT[REP.piece][0], W / 2, H * 0.12);
  if (['buckle', 'dent'].includes(T.fault)) { ctx.fillStyle = '#f2c40f'; ctx.fillRect(W * 0.43, H * 0.86, W * 0.14, 12); ctx.fillStyle = '#ff3d8b'; ctx.fillRect(W * (0.15 + ripNeedle() * 0.7), H * 0.83, 5, 28); }
}
function syncServicedKit(kit, weapon) {
  for (const key of ['season', 'run']) { const X = store.get(key, null); if (X?.kit) { for (const k of ['helmet', 'armL', 'armR', 'legs']) X.kit[k] = JSON.parse(JSON.stringify(kit[k])); if ((X.weapon || G.loadout.weapon) === weapon) X.kit.haft = JSON.parse(JSON.stringify(kit.haft)); store.set(key, X); } }
  const T = store.get('tourney', null); if (T?.kits?.[4]) { T.kits[4] = JSON.parse(JSON.stringify(kit)); store.set('tourney', T); }
  if (G.run?.kit) { for (const k of ['helmet', 'armL', 'armR', 'legs']) G.run.kit[k] = JSON.parse(JSON.stringify(kit[k])); if ((G.run.weapon || G.loadout.weapon) === weapon) G.run.kit.haft = JSON.parse(JSON.stringify(kit.haft)); }
  if (G.tourney?.kits?.[4]) G.tourney.kits[4] = JSON.parse(JSON.stringify(kit));
  if (!REP.workshop && G.player && careerMatch()) { for (const k of ['helmet', 'armL', 'armR', 'legs']) G.player.kit[k] = JSON.parse(JSON.stringify(kit[k])); if (G.player.spec.weapon === weapon) G.player.kit.haft = JSON.parse(JSON.stringify(kit.haft)); }
}
function openTownRepair(weapon, trainingFault, safety = false) {
  const previous = { player: G.player, match: G.match, phase: G.phase, busy: TOWN.busy }, spec = playerSpec(CLUBS.reavers.roster[0]); spec.weapon = weapon || spec.weapon;
  const kit = careerKit(spec); if (trainingFault) { kit[trainingFault === 'wrap' ? 'haft' : 'armL'] = { cond: 0.25, fault: trainingFault, failed: true }; }
  G.player = { ...previous.player, spec, kit, pos: { x: TOWN.pos.x, z: TOWN.pos.z }, model: null }; G.match = null; G.phase = 'workshop';
  TOWN.busy = true; $('#townHud').hidden = true; $('#townPrompt').hidden = true;
  openRepair(0, () => { if (!trainingFault && previous.player && careerMatch(previous.match)) previous.player.kit = careerKit(previous.player.spec); G.player = previous.player; G.match = previous.match; G.phase = previous.phase; TOWN.busy = previous.busy; if (TOWN.on) $('#townHud').hidden = false; openWorkshop(); }, { proper: !safety, untimed: true, workshop: true, training: !!trainingFault });
  if (trainingFault) { REP.piece = trainingFault === 'wrap' ? 'haft' : 'armL'; if (trainingFault === 'wrap') startTaping(REP.roll); else startRepairTask(trainingFault); }
}
function workshopQuote(kit, keys) {
  const B = squireBook(), parts = {}; let wear = 0;
  for (const k of keys) { const p = kit[k]; normalizeRepairPiece(p, k); wear += p.failed ? 1 : Math.max(0, 1 - p.cond); const part = REPAIR_FAULTS[p.fault]?.part; if (part && !p.work?.installed) parts[part] = (parts[part] || 0) + 1; }
  const missing = Object.fromEntries(Object.entries(parts).map(([k, n]) => [k, Math.max(0, n - B.stock[k])]));
  const price = { straps: 25, fittings: 20, hafts: 40 }, entitlement = B.serviceCredits > 0;
  const labour = entitlement ? 0 : Math.round(wear * 220 * (1 - 0.1 * (squireActive() ? Math.min(3, shopState().squires || 0) : 0)) / 10) * 10;
  const supplies = Object.entries(missing).reduce((sum, [k, n]) => sum + price[k] * n, 0);
  return { labour, supplies, parts, missing, total: labour + supplies, entitlement };
}
function paidWorkshopRepair(weapon, keys, personal) {
  if (personal && !squireActive()) return false;
  const kit = careerKit({ weapon }), q = workshopQuote(kit, keys); if (!keys.length || !spend(q.total, personal ? 'Your squire' : 'The armourer')) return false;
  const B = squireBook(); for (const [part, count] of Object.entries(q.parts)) B.stock[part] = Math.max(0, B.stock[part] - count);
  if (q.entitlement) B.serviceCredits--;
  for (const k of keys) { Object.assign(kit[k], { cond: 1, failed: false, covered: false, temporary: false, fault: null, work: null }); }
  storeCareerKit(kit, weapon); syncServicedKit(kit, weapon); return true;
}
function openWorkshop() {
  townPanel('Repair workshop', box => {
    const S = teamSquire(), E = equipmentState(), weapon = G.loadout.weapon;
    box.append(h('p', null, 'Field fixes are temporary (up to 70%). Proper servicing is untimed and can restore 100%. Manual safety work always has basic armour materials.'));
    const choices = h('select', { id: 'workshopWeapon', 'aria-label': 'Weapon to service' });
    for (const key of new Set([weapon, ...Object.keys(E.weapons)])) if (WEAPONS[key]) choices.append(h('option', { value: key, selected: key === weapon }, WEAPONS[key].name)); box.append(choices);
    const rows = h('div', { class: 'ups' }); box.append(rows);
    const draw = () => {
      rows.replaceChildren(); const wk = choices.value, kit = careerKit({ weapon: wk }), all = [];
      for (const k of ['helmet', 'armL', 'armR', 'legs', ...(WEAPONS[wk].haft ? ['haft'] : [])]) {
        const p = kit[k], need = p.cond < 1 || p.fault || p.temporary || p.failed;
        rows.append(h('p', null, `${PIECE_SHORT[k][0]}: ${Math.round(p.cond * 100)}% · ${p.failed ? 'UNSAFE' : p.temporary ? 'Safe · temporary repair' : 'Safe'} · ${p.fault ? REPAIR_FAULTS[p.fault].name : 'General wear'}`));
        if (need) { all.push(k); const q = workshopQuote(kit, [k]); rows.append(h('button', { class: 'btn', onclick: () => { paidWorkshopRepair(wk, [k], squireActive()); draw(); } }, `${squireActive() ? S.name : 'Armourer'}: ${PIECE_SHORT[k][0]} · labour ${q.labour}, parts ${q.supplies} · total ${q.total}`)); }
      }
      rows.append(h('button', { class: 'btn primary', onclick: () => openTownRepair(wk) }, 'Use the manual bench · untimed'));
      rows.append(h('button', { class: 'btn', onclick: () => openTownRepair(wk, null, true) }, 'Basic manual safety fixes · free armour materials · temporary'));
      if (all.length) { const q = workshopQuote(kit, all); rows.append(h('button', { class: 'btn', onclick: () => { paidWorkshopRepair(wk, all, squireActive()); draw(); } }, `Repair all · labour ${q.labour}, missing parts ${q.supplies} · total ${q.total}`)); }
    };
    choices.onchange = draw; draw();
    if (S.stage === 5) {
      for (const fault of ['strap', 'wrap']) box.append(h('button', { class: 'btn', onclick: () => openTownRepair('longaxe', fault) }, `Practise ${fault} repair · free training materials`));
      box.append(h('button', { class: 'btn', onclick: () => openTownRepair('longaxe', 'handoff') }, 'Practise a safe reserve handoff · training only'));
      box.append(h('button', { class: 'btn primary', disabled: !(S.training.strap && S.training.wrap && S.training.handoff), onclick: () => { squireStage(S, 5); openSquire(); } }, 'Finish corner training'));
    }
    const stock = squireBook().stock; box.append(h('p', null, `Supplies: ${stock.straps} straps · ${stock.fittings} fittings · ${stock.hafts} hafts · ${stock.meals} meals`));
    for (const [part, cost] of [['straps', 25], ['fittings', 20], ['hafts', 40]]) box.append(h('button', { class: 'btn', onclick: () => { squireBuy(part); openWorkshop(); } }, `Buy spare ${part} · ${cost}`));
  });
}
