// Tuition teaches a discipline; successful practice earns the existing capped drill ranks.
const TRAIN_LESSONS = [
  ['d_feet', 'Footwork', 'Block or perfectly defend in a fight.', ['block', 'perfect']],
  ['d_strike', 'Striking', 'Land clean hits in a fight.', ['hit']],
  ['d_sprint', 'Sprints', 'Run laps in the Northwatch drill yard.', []],
  ['d_lungs', 'Conditioning', 'Cover distance on foot in the Northwatch drill yard.', []],
  ['d_clinch', 'Clinch work', 'Land throws, trips or takedowns.', ['throw', 'trip', 'takedown']]
];
const TRAIN_FEES = [300, 1200, 4000];
function trainingState() {
  const s = shopState(), t = s.training || (s.training = { tuition: {}, progress: {}, active: '' });
  for (const [id] of TRAIN_LESSONS) {
    const lv = s.lv[id] || 0;
    if (lv && !t.tuition[id]) t.tuition[id] = lv <= 3 ? 1 : lv <= 7 ? 2 : 3; // grandfather ranks bought under the old system
  }
  return t;
}
function trainingTier(rank) { return rank < 3 ? 1 : rank < 7 ? 2 : 3; }
function trainingTarget(id, rank) { return id === 'd_sprint' ? 55 + rank * 20 : id === 'd_lungs' ? 80 + rank * 25 : 4 + rank * 2; }
function trainingCredit(id, amount) {
  const s = shopState(), t = trainingState(), rank = s.lv[id] || 0;
  if (t.active !== id || rank >= 10 || (t.tuition[id] || 0) < trainingTier(rank)) return;
  const before = t.progress[id] || 0;
  t.progress[id] = before + amount;
  const need = trainingTarget(id, rank);
  if (t.progress[id] >= need) {
    t.progress[id] = 0; s.lv[id] = rank + 1; saveCareer();
    if (typeof questEvent === 'function') questEvent('training', { discipline: id, rank: rank + 1 });
    toastMenu(`${TRAIN_LESSONS.find(x => x[0] === id)[1]} rank ${rank + 1} earned through practice.`);
  } else if (Math.floor(t.progress[id] / Math.max(1, Math.ceil(need / 4))) > Math.floor(before / Math.max(1, Math.ceil(need / 4)))) saveCareer();
}
function trainerLessonRows(vendorKey, row, s) {
  const t = trainingState(), master = vendorKey === 'ntrainer', atFestival = vendorKey === 'trainer';
  for (const [id, name, desc] of TRAIN_LESSONS) {
    const rank = s.lv[id] || 0, tier = trainingTier(rank), taught = t.tuition[id] || 0;
    const canTeach = rank < 10 && taught < tier && ((tier === 1 && atFestival) || (tier > 1 && master));
    const fee = TRAIN_FEES[tier - 1], progress = Math.floor(t.progress[id] || 0), need = trainingTarget(id, rank);
    const action = rank >= 10 ? 'Mastered' : taught < tier ? canTeach ? `Tuition ${fmtMoney(fee)}` : tier === 1 ? 'Festival coach' : 'Northwatch only' : t.active === id ? 'Practising' : 'Practise';
    const detail = rank >= 10 ? 'Mastered.' : taught < tier ? `${desc} Pay the teacher to open ranks ${tier === 1 ? '1–3' : tier === 2 ? '4–7' : '8–10'}.` : `${desc} ${progress}/${need} practice ${id === 'd_sprint' || id === 'd_lungs' ? 'metres' : 'actions'} toward the next rank.`;
    row(name, `Rank ${rank}/10`, detail, action, canTeach ? CAREER.purse >= fee : taught >= tier && rank < 10 && t.active !== id,
      () => {
        if (taught < tier) { if (!canTeach || !spend(fee, `${name} tuition`)) return false; t.tuition[id] = tier; }
        t.active = id; saveCareer(); toastMenu(`${name} lesson active. ${desc}`);
      });
  }
}
EV_LISTENERS.push((type, data) => {
  const t = trainingState(), lesson = TRAIN_LESSONS.find(x => x[0] === t.active);
  if (!lesson || !lesson[3].includes(type)) return;
  if (type === 'hit' && data.blocked || type === 'trip' && !data.ok) return;
  trainingCredit(lesson[0], 1);
});
function trainingTownTick(before, walking, sprint) {
  if (!walking || !before || G.autopilot || (G.attract && !TOWN.on)) return;
  const dx = TOWN.pos.x - before.x, dz = TOWN.pos.z - before.z, distance = Math.min(0.5, Math.hypot(dx, dz));
  if (distance < 0.005) return;
  const t = trainingState();
  const rank = shopState().lv[t.active] || 0;
  const fairYard = rank < 3 && Math.hypot(TOWN.pos.x + 58, TOWN.pos.z + 56) < 36;
  const northYard = Math.hypot(TOWN.pos.x, TOWN.pos.z + 1030) < 92;
  if (!TOWN.mounted && (fairYard || northYard)) {
    if (t.active === 'd_sprint' && sprint) trainingCredit('d_sprint', distance);
    if (t.active === 'd_lungs') trainingCredit('d_lungs', distance);
  }
  const riding = CAREER.riding;
  if (TOWN.mounted && riding && riding.paid > riding.rank && Math.hypot(TOWN.pos.x + 90, TOWN.pos.z - 850) < 100) {
    riding.distance = (riding.distance || 0) + distance;
    if (riding.distance >= 200 + riding.rank * 150) {
      riding.distance = 0; riding.rank++; saveCareer(); toastMenu(`Riding lesson ${riding.rank} complete. Your horse responds more quickly to turns.`);
      if (typeof questEvent === 'function') questEvent('riding', { rank: riding.rank });
    }
  }
}
function renderRidingSchool(box) {
  const r = CAREER.riding || (CAREER.riding = { paid: 0, rank: 0, distance: 0 });
  const fees = [500, 1200, 2500], target = 200 + r.rank * 150;
  box.append(h('p', { class: 'muted' }, 'Hire or own a horse, pay for a lesson, then ride the marked paddock circuit. Practice improves mounted handling; foot combat stays the same.'));
  box.append(h('div', { class: 'up' }, h('div', null, h('div', { class: 'uph' }, h('b', null, `Riding lesson ${r.rank}/3`)),
    h('div', { class: 'muted' }, r.rank >= 3 ? 'You have mastered the course.' : r.paid > r.rank ? `${Math.floor(r.distance)} / ${target} m ridden near the Southmere paddocks.` : `Lesson ${r.rank + 1} is ready to learn.`)),
    h('button', { class: 'btn small primary', disabled: r.rank >= 3 || r.paid > r.rank || CAREER.purse < fees[r.rank] ? true : null, onclick: () => {
      if (!spend(fees[r.rank], `Riding lesson ${r.rank + 1}`)) return;
      r.paid++; saveCareer(); townPanel('Southmere riding school', renderRidingSchool);
    } }, r.rank >= 3 ? 'Mastered' : r.paid > r.rank ? 'Practise on horseback' : `Tuition ${fmtMoney(fees[r.rank])}`)));
}
