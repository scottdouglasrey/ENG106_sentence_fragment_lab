/* Content assets and learner-state data remain intentionally separate. */
const BANK = window.QUESTION_BANK;
const RULES = window.EVALUATION_RULES;
const LOCAL_EVALUATOR = window.OpenTextEvaluator;
const STORAGE_KEY = 'fragment-lab-state';
const DATA_VERSION = 'v4-structured-local-evaluation';
const MASTERY_THRESHOLD = 75;
const INITIAL_MASTERY_ITEMS_PER_SKILL = 4;

const DOMAINS = [
  {
    id: 'a',
    name: 'Sentence completeness',
    short: 'Skill A · Complete thoughts',
    lesson: 'A complete sentence names who or what it is about, includes a main verb, and expresses a complete thought.',
    tip: 'Ask: “Can this group of words stand alone and make sense?”',
    feedback: 'Look for who or what the sentence is about, what happens, and whether the thought can stand alone.'
  },
  {
    id: 'b',
    name: 'Missing essential parts',
    short: 'Skill B · Subject or main verb',
    lesson: 'A sentence fragment may be missing its subject—who or what performs the action—or its main verb—what the subject does or is.',
    tip: 'Find who or what the sentence is about. Then find what that subject does or is.',
    feedback: 'Check whether the word group names who or what it is about and tells what that subject does or is.'
  },
  {
    id: 'c',
    name: 'Dependent-clause fragments',
    short: 'Skill C · Because, although, when…',
    lesson: 'Words such as because, although, when, and if can make a word group depend on another thought. Attach that group to a complete thought.',
    tip: 'If the words leave you waiting for more information, connect them to a complete thought.',
    feedback: 'A word such as because, although, when, or if may leave the thought unfinished. Attach it to a complete thought.'
  },
  {
    id: 'd',
    name: 'Phrase fragments',
    short: 'Skill D · Detail without a full sentence',
    lesson: 'A phrase can add useful detail but cannot stand alone. A complete sentence still needs someone or something and a main verb.',
    tip: 'Words ending in -ing or beginning with to, after, or before may add detail without completing the sentence.',
    feedback: 'The phrase adds detail, but it needs to be attached to a complete sentence.'
  },
  {
    id: 'e',
    name: 'Paragraph tasks',
    short: 'Skill E · Editing in context',
    lesson: 'In a paragraph, use the surrounding sentences to locate fragments and repair them without changing the writer’s main meaning.',
    tip: 'Read each word group in context. Select only the fragments, then connect each one to a complete thought.',
    feedback: 'Use the surrounding sentences to decide which word groups cannot stand alone and how to connect them.'
  }
];

function rowsToObjects(columns, rows) {
  return rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] || ''])));
}

function parseOptions(raw) {
  return String(raw || '').split(/\n+/).map((line) => line.trim()).filter(Boolean)
    .map((line) => line.replace(/^[A-Z][.)]\s*/, '').trim());
}

function rotateOptions(options, correctIndex, seed) {
  const offset = [...String(seed || '')].reduce((total, char) => total + char.charCodeAt(0), 0) % options.length;
  const rotated = options.map((_, index) => options[(index + offset) % options.length]);
  return { choices: rotated, answer: rotated.indexOf(options[correctIndex]) };
}

function classificationAnswer(rubric) {
  return /^\s*complete sentence/i.test(String(rubric || '')) ? 0 : 1;
}

function answerFromOptions(rubric, choices) {
  const text = String(rubric || '').trim();
  const letter = text.match(/^(?:answer\s*:\s*)?([A-Z])(?:[.)]|\b)/i);
  if (letter) return letter[1].toUpperCase().charCodeAt(0) - 65;
  const exact = choices.findIndex((choice) => text.toLowerCase().startsWith(choice.toLowerCase()));
  return exact >= 0 ? exact : 0;
}

function reasonText(item, complete) {
  const evidence = `${item.rubric} ${item.family} ${item.misconceptions}`.toLowerCase();
  if (item.domain === 'd') {
    return complete
      ? 'The phrase adds detail, and the rest of the sentence expresses a complete thought.'
      : 'The words add detail but do not form a complete thought with a subject and main verb.';
  }
  if (item.domain === 'c') {
    return complete
      ? 'Any dependent words are connected to a complete thought that can stand alone.'
      : 'A word such as because, although, when, which, or if leaves the thought unfinished.';
  }
  if (item.domain === 'b' && /missing subject|lacks? (a )?subject/.test(evidence)) {
    return 'It does not say who or what performs the action.';
  }
  if (item.domain === 'b' || /predicate|main finite verb|missing verb|lacks? (a )?(main )?verb/.test(evidence)) {
    return complete
      ? 'It has a subject and a main verb that completes the thought.'
      : 'It has a subject, but it does not tell what that subject does or is.';
  }
  return complete
    ? 'It has a subject, a main verb, and a complete thought.'
    : 'It does not express a complete thought that can stand alone.';
}

function buildReasonTask(item) {
  const complete = classificationAnswer(item.rubric) === 0;
  const correct = reasonText(item, complete);
  const distractors = [
    'It is correct because it begins with a capital letter and ends with punctuation.',
    'Its length alone determines whether it is a complete sentence.',
    'Any word ending in -ing automatically serves as the sentence’s main verb.',
    'A sentence is complete whenever it includes a person, place, or thing.',
    'A word such as because automatically makes any word group complete.'
  ].filter((choice) => choice !== correct);
  return rotateOptions([correct, ...distractors.slice(0, 3)], 0, item.id);
}

function cleanPrompt(item) {
  if (item.responseMode === 'paragraphRepair') return 'Find and repair the fragments in this paragraph.';
  if (item.responseMode === 'classifyReason') return item.prompt.replace(/\s*Explain briefly\.?/gi, '').trim();
  if (item.responseMode === 'reasonChoice') {
    return item.prompt.replace(/^Explain why/i, 'Choose the best explanation for why')
      .replace(/Explain whether the student is correct\.?/i, 'Choose the best evaluation of the student’s claim.').trim();
  }
  return item.prompt;
}

function normalizeBankItem(source, isParagraph = false) {
  const options = parseOptions(source.Options);
  const rubric = String(source['Answer / Rubric'] || '');
  const type = String(source.Type || (isParagraph ? 'Paragraph repair' : 'Constructed response'));
  const classification = /classification/i.test(type) || /^complete sentence or fragment/i.test(source.Prompt || '');
  let choices = options;
  let answer = -1;
  let responseMode = 'text';

  if (isParagraph) responseMode = 'paragraphRepair';
  else if (/classification \+ explanation/i.test(type)) {
    responseMode = 'classifyReason'; choices = ['Complete sentence', 'Fragment']; answer = classificationAnswer(rubric);
  } else if (/short explanation/i.test(type)) responseMode = 'reasonChoice';
  else if (/classification \+ repair/i.test(type)) {
    responseMode = 'classifyRepair'; choices = ['Complete sentence', 'Fragment']; answer = classificationAnswer(rubric);
  } else if (options.length) {
    responseMode = 'choice'; answer = answerFromOptions(rubric, options);
  } else if (classification) {
    responseMode = 'choice'; choices = ['Complete sentence', 'Fragment']; answer = classificationAnswer(rubric);
  }

  const item = {
    id: source.ID,
    domain: String(source.Skill || '').slice(0, 1).toLowerCase(),
    skill: source.Skill || '',
    stage: source.Stage || '',
    pool: source.Pool || '',
    family: source.Family || '',
    difficulty: source.Difficulty || '',
    type,
    prompt: source.Prompt || source.Paragraph || '',
    paragraph: source.Paragraph || '',
    targets: String(source['Target Fragments'] || '').split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean),
    repair: source['Sample Repair'] || '',
    choices,
    answer,
    responseMode,
    rubric,
    misconceptions: source['Misconception Tags'] || '',
    notes: source['Instructor Notes'] || '',
    evaluation: RULES?.items?.[source.ID] || null
  };
  if (responseMode === 'reasonChoice' || responseMode === 'classifyReason') item.reasonTask = buildReasonTask(item);
  item.displayPrompt = cleanPrompt(item);
  return item;
}

const SENTENCE_ROWS = rowsToObjects(BANK.sentenceColumns, BANK.sentences);
const PARAGRAPH_ROWS = rowsToObjects(BANK.paragraphColumns, BANK.paragraphs);
const BANK_ALL = [...SENTENCE_ROWS.map((row) => normalizeBankItem(row)), ...PARAGRAPH_ROWS.map((row) => normalizeBankItem(row, true))];
const BANK_BY_ID = Object.fromEntries(BANK_ALL.map((item) => [item.id, item]));

function domain(id) { return DOMAINS.find((item) => item.id === id); }
function itemsFor(stage, domainId) { return BANK_ALL.filter((item) => item.stage === stage && (!domainId || item.domain === domainId)); }
function selectInitialItems(stage, perSkill) {
  return DOMAINS.flatMap((skill) => {
    const count = typeof perSkill === 'number' ? perSkill : (perSkill[skill.id] || 0);
    return itemsFor(stage, skill.id).slice(0, count).map((item) => item.id);
  });
}

const DEFAULT_DIAGNOSTIC_IDS = selectInitialItems('Diagnostic', { a: 2, b: 2, c: 2, d: 2, e: 1 });
const LEGACY_MASTERY_IDS = selectInitialItems('Mastery assessment', 2);

function defaultState() {
  return {
    dataVersion: DATA_VERSION,
    bankVersion: BANK.version,
    evaluatorVersion: LOCAL_EVALUATOR.version,
    view: 'overview',
    diagnosticItemIds: [...DEFAULT_DIAGNOSTIC_IDS],
    diagnosticAnswers: {}, diagnosticResults: {}, diagnosticComplete: false,
    interventions: {},
    masteryItemIds: [], masteryAnswers: {}, masteryResults: {}, masteryAttempts: [], masteryEvidence: {},
    masteryLoops: [], masteryReviewHistory: [], masteryComplete: false,
    events: [], startedAt: new Date().toISOString()
  };
}

function mapLegacyAnswers(answers, ids) {
  const source = answers || {};
  const entries = Object.entries(source);
  return Object.fromEntries(entries.map(([key, value]) => {
    const id = /^\d+$/.test(key) ? (ids[Number(key)] || key) : key;
    const item = BANK_BY_ID[id];
    if (!item) return [id, value];
    if (item.responseMode === 'classifyReason' && typeof value !== 'object') {
      return [id, { classification: Number(value), reason: item.reasonTask.answer, migrated: true }];
    }
    if (item.responseMode === 'reasonChoice' && typeof value !== 'number') {
      return [id, item.reasonTask.answer];
    }
    if (item.responseMode === 'paragraphRepair' && typeof value === 'string') {
      return [id, { selected: targetSentenceIndices(item), text: value, migrated: true }];
    }
    return [id, value];
  }));
}

function migrateState(saved) {
  const fresh = defaultState();
  if (!saved || typeof saved !== 'object') return fresh;
  const diagnosticIds = Array.isArray(saved.diagnosticItemIds) ? saved.diagnosticItemIds.filter((id) => BANK_BY_ID[id]) : [...DEFAULT_DIAGNOSTIC_IDS];
  const oldMasteryIds = Array.isArray(saved.masteryItemIds) && saved.masteryItemIds.length
    ? saved.masteryItemIds.filter((id) => BANK_BY_ID[id]) : (saved.masteryComplete ? [...LEGACY_MASTERY_IDS] : []);
  const migrated = {
    ...fresh, ...saved,
    dataVersion: DATA_VERSION, bankVersion: BANK.version, evaluatorVersion: LOCAL_EVALUATOR.version,
    diagnosticItemIds: diagnosticIds,
    diagnosticAnswers: mapLegacyAnswers(saved.diagnosticAnswers, diagnosticIds),
    masteryItemIds: oldMasteryIds,
    masteryAnswers: mapLegacyAnswers(saved.masteryAnswers, oldMasteryIds || LEGACY_MASTERY_IDS),
    diagnosticResults: saved.diagnosticResults || {}, masteryResults: saved.masteryResults || {},
    masteryAttempts: Array.isArray(saved.masteryAttempts) ? saved.masteryAttempts : [],
    masteryEvidence: saved.masteryEvidence || {}, masteryLoops: Array.isArray(saved.masteryLoops) ? saved.masteryLoops : [],
    masteryReviewHistory: Array.isArray(saved.masteryReviewHistory) ? saved.masteryReviewHistory : [],
    events: Array.isArray(saved.events) ? saved.events : [], interventions: saved.interventions || {}
  };
  if (!Object.keys(migrated.interventions).length && saved.practice) {
    Object.entries(saved.practice).forEach(([id, complete]) => {
      if (complete) migrated.interventions[id] = { round: 1, stepIndex: 3, complete: true, legacy: true, steps: [] };
    });
  }
  if (migrated.masteryComplete && !Object.keys(migrated.masteryEvidence).length) {
    const finalEvent = [...migrated.events].reverse().find((event) => event.type === 'assessment' && /mastery/i.test(event.detail || ''));
    const recordedDomains = finalEvent?.payload?.domains || migrated.masteryAttempts.at(-1)?.domains || [];
    DOMAINS.forEach((skill) => {
      const recorded = recordedDomains.find((entry) => entry.id === skill.id || entry.domain === skill.name);
      const percent = Number(recorded?.score ?? finalEvent?.payload?.score ?? 75);
      const total = Number(recorded?.total || 2);
      migrated.masteryEvidence[skill.id] = {
        correct: Number(recorded?.correct ?? Math.ceil((percent / 100) * total)),
        total,
        percent,
        mastered: true,
        itemIds: [],
        rows: [],
        attempt: migrated.masteryAttempts.length || 1,
        at: finalEvent?.at || new Date().toISOString(),
        legacy: true
      };
    });
  }
  return migrated;
}

function loadState() {
  try { return migrateState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
  catch { return defaultState(); }
}

let state = loadState();
let currentQuestion = 0;
let practiceDomain = null;
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function record(type, detail, payload = {}) { state.events.push({ type, detail, payload, at: new Date().toISOString() }); saveState(); }
function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}
function formatDate(iso) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso)); }
function formatTime(iso) { return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)); }
function showToast(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3000);
}
function resetLocalProgress() {
  if (!window.confirm('Reset all Sentence Fragment Lab progress saved in this browser? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  window.location.hash = 'top';
  window.location.reload();
}

function sameNumbers(left, right) {
  const a = [...(left || [])].map(Number).sort((x, y) => x - y);
  const b = [...(right || [])].map(Number).sort((x, y) => x - y);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
function paragraphSentences(item) { return LOCAL_EVALUATOR.helpers.sentenceParts(item.paragraph); }
function targetSentenceIndices(item) {
  const targets = item.targets.map((target) => LOCAL_EVALUATOR.normalizeText(target).replace(/[.!?]+$/, '').toLowerCase());
  return paragraphSentences(item).map((sentence, index) => ({ index, text: LOCAL_EVALUATOR.normalizeText(sentence).replace(/[.!?]+$/, '').toLowerCase() }))
    .filter((entry) => targets.includes(entry.text)).map((entry) => entry.index);
}
function result(status, feedback, checks = {}, reasons = []) {
  return { status, score: status === 'correct' ? 1 : 0, evaluatorVersion: LOCAL_EVALUATOR.version, checks, reasons, feedback };
}

function evaluateAnswer(item, answer) {
  if (item.responseMode === 'choice') {
    const correct = Number(answer) === item.answer;
    return result(correct ? 'correct' : 'incorrect', correct ? 'That answer matches the sentence evidence.' : domain(item.domain).feedback,
      { selectedCorrectOption: correct }, correct ? [] : [domain(item.domain).feedback]);
  }
  if (item.responseMode === 'reasonChoice') {
    const correct = Number(answer) === item.reasonTask.answer;
    return result(correct ? 'correct' : 'incorrect', correct ? item.reasonTask.choices[item.reasonTask.answer] : domain(item.domain).feedback,
      { selectedBestExplanation: correct }, correct ? [] : ['Choose the explanation based on sentence structure, not length or punctuation alone.']);
  }
  if (item.responseMode === 'classifyReason') {
    const classificationCorrect = Number(answer?.classification) === item.answer;
    const reasonCorrect = Number(answer?.reason) === item.reasonTask.answer;
    const correct = classificationCorrect && reasonCorrect;
    return result(correct ? 'correct' : 'incorrect', correct ? 'Your decision and supporting reason both match the sentence evidence.' : domain(item.domain).feedback,
      { classificationCorrect, reasonCorrect }, correct ? [] : [
        !classificationCorrect ? 'Reconsider whether the words express a complete thought.' : '',
        !reasonCorrect ? 'Choose a reason based on the subject, main verb, and complete thought.' : ''
      ].filter(Boolean));
  }
  if (item.responseMode === 'classifyRepair') {
    const classificationCorrect = Number(answer?.classification) === item.answer;
    const writing = LOCAL_EVALUATOR.evaluateOpenText(item, answer?.text || '');
    if (!classificationCorrect) return result('incorrect', domain(item.domain).feedback,
      { classificationCorrect: false, ...writing.checks }, ['Reconsider whether the original word group is complete or a fragment.', ...writing.reasons]);
    return { ...writing, checks: { classificationCorrect, ...writing.checks } };
  }
  if (item.responseMode === 'paragraphRepair') {
    const selectedCorrectly = sameNumbers(answer?.selected, targetSentenceIndices(item));
    const writing = LOCAL_EVALUATOR.evaluateOpenText(item, answer?.text || '');
    if (!selectedCorrectly) return result('incorrect', 'Select every fragment in the paragraph before revising it.',
      { selectedCorrectly, ...writing.checks }, ['One or more sentence selections need another look.']);
    return { ...writing, checks: { selectedCorrectly, ...writing.checks } };
  }
  return LOCAL_EVALUATOR.evaluateOpenText(item, answer || '');
}

function answerComplete(item, answer) {
  if (item.responseMode === 'choice' || item.responseMode === 'reasonChoice') return answer !== undefined && answer !== null && answer !== '';
  if (item.responseMode === 'classifyReason') return answer?.classification !== undefined && answer?.reason !== undefined;
  if (item.responseMode === 'classifyRepair') return answer?.classification !== undefined && Boolean(String(answer?.text || '').trim());
  if (item.responseMode === 'paragraphRepair') return Array.isArray(answer?.selected) && Boolean(String(answer?.text || '').trim());
  return Boolean(String(answer || '').trim());
}

function assessmentItems(kind) {
  const ids = kind === 'diagnostic' ? state.diagnosticItemIds : state.masteryItemIds;
  return ids.map((id) => BANK_BY_ID[id]).filter(Boolean);
}
function answersFor(kind) { return state[`${kind}Answers`] || {}; }
function assessmentRows(kind, items = assessmentItems(kind), answers = answersFor(kind)) {
  return items.map((item) => {
    const answer = answers[item.id];
    return { item, answer, answered: answerComplete(item, answer), evaluation: answerComplete(item, answer)
      ? evaluateAnswer(item, answer) : result('incorrect', 'Not answered.', { nonEmpty: false }, ['Not answered.']) };
  });
}
function domainScoresFromRows(rows) {
  return DOMAINS.map((skill) => {
    const skillRows = rows.filter((row) => row.item.domain === skill.id);
    const correct = skillRows.filter((row) => row.evaluation.status === 'correct').length;
    return { ...skill, correct, total: skillRows.length, percent: skillRows.length ? Math.round((correct / skillRows.length) * 100) : 0,
      needsReview: skillRows.filter((row) => row.evaluation.status === 'needsReview').length };
  });
}
function overallFromRows(rows) { return rows.length ? Math.round((rows.filter((row) => row.evaluation.status === 'correct').length / rows.length) * 100) : 0; }
function diagnosticRows() { return assessmentRows('diagnostic'); }
function diagnosticScores() { return domainScoresFromRows(diagnosticRows()); }
function diagnosticOverall() { return overallFromRows(diagnosticRows()); }
function currentRound() { return state.masteryLoops.length + 1; }
function requiredPracticeIds() {
  if (!state.diagnosticComplete) return [];
  const latestLoop = state.masteryLoops[state.masteryLoops.length - 1];
  if (latestLoop && !state.masteryComplete) return latestLoop.weakDomainIds || [];
  return diagnosticScores().filter((score) => score.percent < MASTERY_THRESHOLD).map((score) => score.id);
}
function practiceComplete() {
  return requiredPracticeIds().every((id) => state.interventions[id]?.complete && state.interventions[id]?.round === currentRound());
}
function usedItemIds() {
  const ids = new Set([...state.diagnosticItemIds, ...state.masteryReviewHistory.map((entry) => entry.itemId)]);
  state.masteryAttempts.forEach((attempt) => (attempt.itemIds || []).forEach((id) => ids.add(id)));
  state.events.forEach((event) => { if (event.payload?.itemId) ids.add(event.payload.itemId); });
  Object.values(state.interventions).forEach((intervention) => (intervention?.steps || []).forEach((step) => { if (step.itemId) ids.add(step.itemId); }));
  return ids;
}
function nextUnseenItem(domainId, stage, extraExcluded = []) {
  const excluded = usedItemIds(); extraExcluded.forEach((id) => excluded.add(id));
  return itemsFor(stage, domainId).find((item) => !excluded.has(item.id))
    || (stage === 'Guided practice' || stage === 'Independent practice' ? itemsFor(stage, domainId)[0] : null);
}
function ensureIntervention(domainId) {
  const round = currentRound();
  const existing = state.interventions[domainId];
  if (existing?.round === round) return existing;
  const selected = [];
  const steps = ['Guided practice', 'Independent practice', 'Verification'].map((stage) => {
    const item = nextUnseenItem(domainId, stage, selected); if (item) selected.push(item.id);
    return { stage, itemId: item?.id || null, answer: null, result: null, attempts: 0, reviewCount: 0,
      fallback: false, fallbackAnswer: null, feedback: '' };
  }).filter((step) => step.itemId);
  state.interventions[domainId] = { round, stepIndex: 0, complete: false, unsuccessfulAttempts: 0, steps };
  saveState(); return state.interventions[domainId];
}
function masteryUsedIds() {
  return new Set([...state.masteryAttempts.flatMap((attempt) => attempt.itemIds || []), ...state.masteryReviewHistory.map((entry) => entry.itemId)]);
}
function prepareMasterySet(domainIds = DOMAINS.map((skill) => skill.id)) {
  if (state.masteryItemIds.length) return true;
  const excluded = masteryUsedIds(); const selected = [];
  domainIds.forEach((domainId) => {
    const available = itemsFor('Mastery assessment', domainId).filter((item) => !excluded.has(item.id));
    selected.push(...available.slice(0, INITIAL_MASTERY_ITEMS_PER_SKILL).map((item) => item.id));
  });
  state.masteryItemIds = selected; state.masteryAnswers = {}; state.masteryResults = {}; saveState();
  return selected.length > 0;
}
function finalMasteryScores() {
  return DOMAINS.map((skill) => {
    const evidence = state.masteryEvidence[skill.id];
    return { ...skill, correct: evidence?.correct || 0, total: evidence?.total || 0, percent: evidence?.percent || 0,
      mastered: Boolean(evidence?.mastered), at: evidence?.at || null, itemIds: evidence?.itemIds || [] };
  });
}
function finalMasteryOverall() {
  const scores = finalMasteryScores();
  const correct = scores.reduce((total, score) => total + score.correct, 0);
  const items = scores.reduce((total, score) => total + score.total, 0);
  return items ? Math.round((correct / items) * 100) : 0;
}
function activePhase() {
  if (!state.diagnosticComplete) return 'diagnostic';
  if (!practiceComplete()) return 'practice';
  if (!state.masteryComplete) return 'mastery';
  return 'report';
}
function setView(view) { state.view = view; currentQuestion = 0; saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function journey() {
  return '';
}
function recentActivity() {
  if (!state.events.length) return '<div class="empty-state compact">Your learning history will appear here.</div>';
  return state.events.slice(-3).reverse().map((event, index) => `<div class="activity-row"><span class="activity-icon ${index === 1 ? 'accent' : ''}">${event.type.includes('assessment') ? '✓' : '✦'}</span><span><b>${esc(event.detail)}</b><small>${formatDate(event.at)} · ${formatTime(event.at)}</small></span></div>`).join('');
}
function bankSummary() {
  const stages = [['Diagnostic', BANK_ALL.filter((item) => item.pool === 'Diagnostic reserve').length],
    ['Practice', BANK_ALL.filter((item) => item.pool === 'Practice').length], ['Verification', BANK_ALL.filter((item) => item.pool === 'Verification').length],
    ['Mastery', BANK_ALL.filter((item) => item.pool === 'Mastery reserve').length]];
  return `<section class="bank-panel"><div class="bank-panel-head"><div><p class="eyebrow">Content foundation</p><h2>233-task question bank</h2><p>Every task remains organized under the five course skills. Separate pools protect diagnostic, verification, and mastery evidence from instructional reuse.</p></div><span class="pill">Item bank v3</span></div><div class="bank-pool-row">${stages.map(([label, count]) => `<div><b>${count}</b><small>${label}</small></div>`).join('')}</div><div class="bank-skill-grid">${DOMAINS.map((skill) => `<div class="bank-skill"><span class="bank-skill-key">${skill.id.toUpperCase()}</span><span><b>${esc(skill.name)}</b><small>${BANK_ALL.filter((item) => item.domain === skill.id).length} tasks</small></span></div>`).join('')}</div></section>`;
}

function overviewView() {
  const diagnosticScore = state.diagnosticComplete ? `${diagnosticOverall()}%` : '—';
  const masteryScore = state.masteryComplete ? `${finalMasteryOverall()}%` : '—';
  const required = requiredPracticeIds();
  const completed = required.filter((id) => state.interventions[id]?.complete && state.interventions[id]?.round === currentRound()).length;
  const next = !state.diagnosticComplete
    ? ['Start here', 'Find your sentence-fragment starting point.', 'Your answers help the lab choose the skills you need. This is not a course grade.', 'Begin diagnostic', 'diagnostic']
    : !practiceComplete()
      ? ['Up next', 'Complete your targeted learning path.', 'Each assigned skill includes guided practice, independent practice, and a fresh verification item.', 'Open learning studio', 'practice']
      : !state.masteryComplete
        ? ['Up next', 'Show what you know.', 'The mastery check uses protected items that have not appeared during practice.', 'Begin mastery check', 'mastery']
        : ['Complete', 'Download your mastery report.', 'Your report includes diagnostic results, completed interventions, mastery attempts, and final evidence.', 'View report', 'report'];
  return `${journey()}<div class="hero"><div class="hero-copy"><p class="eyebrow">Sentence Fragment Lab</p><h1>Make every sentence<br/>complete.</h1><p class="subhead">Spot, repair, and prevent sentence fragments through a learning path that responds to your work.</p></div><div class="hero-note"><strong>Your work stays on this device.</strong> No account is required. Progress and report data are stored only in this browser.</div></div><div class="grid-3"><div class="card metric-card"><span class="metric-label">Diagnostic</span><div class="metric-value">${diagnosticScore}</div><div class="metric-detail">${state.diagnosticComplete ? 'Starting point recorded' : 'Not started'}</div></div><div class="card metric-card accent"><span class="metric-label">Targeted skills completed</span><div class="metric-value">${completed}<small> / ${required.length}</small></div><div class="metric-detail">Guided → independent → verification</div></div><div class="card metric-card dark"><span class="metric-label">Mastery</span><div class="metric-value">${masteryScore}</div><div class="metric-detail">${state.masteryComplete ? 'All five skills mastered' : 'Protected final evidence'}</div></div></div><div class="section-head"><div><h2>What happens next?</h2><p>Your next step is based on your saved progress.</p></div></div><div class="overview-grid"><div class="focus-card"><div><p class="eyebrow">${next[0]}</p><h3>${next[1]}</h3><p>${next[2]}</p><button class="button accent" data-action="overview-next" data-view="${next[4]}">${next[3]} <span>→</span></button></div><div class="focus-icon">${state.masteryComplete ? '✓' : '◎'}</div></div><div class="card activity-card"><h3>Recent activity</h3>${recentActivity()}</div></div>${bankSummary()}`;
}

function choiceControl(choices, selected, field = 'choice') {
  const hasSelection = selected !== null && selected !== undefined && selected !== '';
  return `<div class="choice-list">${choices.map((choice, index) => `<label class="choice ${hasSelection && Number(selected) === index ? 'selected' : ''}"><input type="radio" name="${field}" data-answer-field="${field}" value="${index}" ${hasSelection && Number(selected) === index ? 'checked' : ''}/><span>${esc(choice)}</span></label>`).join('')}</div>`;
}
function questionPrompt(item, override = '') {
  const raw = String(override || item.displayPrompt || '').trim();
  const parts = raw.split(/\n\s*\n/);
  const instruction = parts.shift() || '';
  const stimulus = parts.join('\n\n').trim();
  return `<div class="question-prompt">${esc(instruction)}</div>${stimulus ? `<div class="question-stimulus">${esc(stimulus)}</div>` : ''}`;
}
function responseControl(item, answer) {
  if (item.responseMode === 'choice') return choiceControl(item.choices, answer);
  if (item.responseMode === 'reasonChoice') return `<fieldset class="response-group"><legend>Choose the best explanation.</legend>${choiceControl(item.reasonTask.choices, answer, 'reason')}</fieldset>`;
  if (item.responseMode === 'classifyReason') return `<fieldset class="response-group"><legend>1. Decide whether the words form a complete sentence.</legend>${choiceControl(item.choices, answer?.classification, 'classification')}</fieldset><fieldset class="response-group"><legend>2. Choose the best reason.</legend>${choiceControl(item.reasonTask.choices, answer?.reason, 'reason')}</fieldset>`;
  if (item.responseMode === 'classifyRepair') return `<fieldset class="response-group"><legend>1. Decide whether the words form a complete sentence.</legend>${choiceControl(item.choices, answer?.classification, 'classification')}</fieldset><label class="response-label" for="repair-response">2. If it is a fragment, revise it into a complete sentence.</label><textarea id="repair-response" class="constructed-response" data-answer-field="text" placeholder="Type your revision…">${esc(answer?.text || '')}</textarea>`;
  if (item.responseMode === 'paragraphRepair') {
    const selected = answer?.selected || [];
    return `<div class="context-copy">${esc(item.paragraph)}</div><fieldset class="response-group fragment-picker"><legend>1. Select every sentence fragment.</legend>${paragraphSentences(item).map((sentence, index) => `<button type="button" class="sentence-option ${selected.includes(index) ? 'selected' : ''}" data-action="toggle-sentence" data-sentence-index="${index}" aria-pressed="${selected.includes(index)}"><span>${selected.includes(index) ? '✓' : index + 1}</span>${esc(sentence)}</button>`).join('')}</fieldset><label class="response-label" for="paragraph-response">2. Revise the paragraph so each sentence is complete. Keep the original meaning.</label><textarea id="paragraph-response" class="constructed-response paragraph-response" data-answer-field="text" placeholder="Type your revised paragraph…">${esc(answer?.text || '')}</textarea>`;
  }
  return `<p class="response-hint">Write a complete revision. Keep the original action and key details.</p><textarea class="constructed-response" data-answer-field="text" placeholder="Type your response…">${esc(answer || '')}</textarea>`;
}

function assessmentView(kind) {
  const isMastery = kind === 'mastery';
  if (isMastery && !state.masteryItemIds.length) {
    const weakIds = state.masteryLoops.length ? state.masteryLoops[state.masteryLoops.length - 1].weakDomainIds : DOMAINS.map((skill) => skill.id);
    prepareMasterySet(weakIds);
  }
  const items = assessmentItems(kind);
  if (!items.length) return `${journey()}<div class="empty-state"><h2>No unseen mastery items remain.</h2><p>The protected item pool for the skills needing reassessment has been exhausted. Ask the instructor to review prerequisite skills or provide a new assessment form.</p><button class="button secondary" data-view="practice">Return to learning studio</button></div>`;
  currentQuestion = Math.min(currentQuestion, items.length - 1);
  const answers = answersFor(kind); const item = items[currentQuestion];
  const answered = items.filter((question) => answerComplete(question, answers[question.id])).length;
  const label = isMastery && state.masteryLoops.length ? 'Mastery reassessment' : isMastery ? 'Mastery assessment' : 'Diagnostic assessment';
  const intro = isMastery ? `This protected check measures the skills that still need mastery evidence. A skill is mastered at ${MASTERY_THRESHOLD}% or higher.`
    : 'Use your best judgment. The diagnostic chooses your learning path and does not count as mastery.';
  return `${journey()}<div class="view-header"><div><p class="eyebrow">${label}</p><h1>${isMastery ? 'Show what you know.' : 'Find your starting point.'}</h1><p class="subhead">${intro}</p></div><span class="pill ${isMastery ? 'accent' : ''}">${items.length} tasks · untimed</span></div><div class="assessment-layout"><aside class="question-list"><h3>Your progress</h3>${items.map((question, index) => {
    const complete = answerComplete(question, answers[question.id]);
    return `<button class="q-nav ${index === currentQuestion ? 'active' : ''} ${complete ? 'answered' : ''}" data-q="${index}"><b>${complete ? '✓' : String(index + 1).padStart(2, '0')}</b><span>${esc(domain(question.domain).name)}<small>${complete ? 'Answered' : 'Not answered'}</small></span></button>`;
  }).join('')}</aside><section class="question-card"><div class="question-meta"><span class="pill gray">Skill ${item.domain.toUpperCase()} · ${esc(domain(item.domain).name)}</span></div>${questionPrompt(item)}${responseControl(item, answers[item.id])}<div class="question-footer"><small>${answered} of ${items.length} answered</small><div class="button-row no-margin"><button class="button secondary" data-action="previous" ${currentQuestion === 0 ? 'disabled' : ''}>← Back</button>${currentQuestion < items.length - 1 ? '<button class="button" data-action="next">Save & next →</button>' : `<button class="button accent" data-action="finish-assessment" data-kind="${kind}">${isMastery ? 'Finish mastery check' : 'See my learning path'} →</button>`}</div></div></section></div>`;
}

function stageName(stage) { return { 'Guided practice': 'Guided', 'Independent practice': 'Independent', Verification: 'Verification' }[stage] || stage; }
function fallbackRepair(item) {
  const rule = item.evaluation || {}; const source = String(rule.sourceText || item.prompt || '').replace(/[.!?]+$/, '').trim();
  let correct = rule.sampleRepair || item.repair || '';
  if (!correct && rule.kind === 'repairMissingSubject') correct = `They ${source.charAt(0).toLowerCase()}${source.slice(1)}.`;
  if (!correct && rule.kind === 'repairMissingPredicate') correct = `${source} provided useful information.`;
  if (!correct && rule.kind === 'attachDependentClause') correct = `${source}, the situation changed.`;
  if (!correct && rule.kind === 'integratePhraseFragment') correct = `${source}, the student continued working.`;
  if (!correct) correct = `${source}, and the thought was completed.`;
  return rotateOptions([correct, `${source}.`, `${source}. Because it was important.`, 'This sentence is complete because it has punctuation.'], 0, `${item.id}-fallback`);
}

function practiceView() {
  const ids = requiredPracticeIds();
  if (!ids.length) return `${journey()}<div class="view-header"><div><p class="eyebrow">Targeted learning</p><h1>No required practice right now.</h1><p class="subhead">Your diagnostic evidence did not identify a skill below the practice threshold. Diagnostic success does not count as mastery, so your protected mastery check is next.</p></div></div><div class="focus-card"><div><p class="eyebrow">Ready for mastery</p><h3>Continue to the protected assessment.</h3><p>The mastery items have not appeared in diagnostic or practice.</p><button class="button accent" data-action="start-mastery">Begin mastery check →</button></div><div class="focus-icon">✓</div></div>`;
  const selectedId = ids.includes(practiceDomain) ? practiceDomain : ids[0]; practiceDomain = selectedId;
  const selected = domain(selectedId); const intervention = ensureIntervention(selectedId);
  const completeCount = ids.filter((id) => state.interventions[id]?.complete && state.interventions[id]?.round === currentRound()).length;
  if (intervention.complete) {
    const allComplete = practiceComplete();
    return `${journey()}<div class="view-header"><div><p class="eyebrow">Targeted learning · Round ${currentRound()}</p><h1>Your learning studio.</h1><p class="subhead">Complete each assigned skill through guided practice, independent practice, and verification.</p></div><span class="pill">${completeCount} of ${ids.length} skills complete</span></div>${practiceDomainList(ids, selectedId)}<div class="focus-card learning-complete"><div><p class="eyebrow">Skill ${selectedId.toUpperCase()} complete</p><h3>${esc(selected.name)} verified.</h3><p>Your fresh verification response met the skill requirement.</p>${allComplete ? '<button class="button accent" data-action="start-mastery">Begin mastery check →</button>' : '<p>Choose the next assigned skill above.</p>'}</div><div class="focus-icon">✓</div></div>`;
  }
  const step = intervention.steps[intervention.stepIndex];
  if (!step) return `${journey()}<div class="empty-state"><h2>This skill needs instructor review.</h2><p>No unused item is available for the next learning stage.</p></div>`;
  const item = BANK_BY_ID[step.itemId]; const fallback = step.fallback ? fallbackRepair(item) : null;
  return `${journey()}<div class="view-header"><div><p class="eyebrow">Targeted learning · Round ${currentRound()}</p><h1>Your learning studio.</h1><p class="subhead">Practice is organized by the same five course skills. Only skills identified by your diagnostic or latest mastery check are assigned.</p></div><span class="pill">${completeCount} of ${ids.length} skills complete</span></div>${practiceDomainList(ids, selectedId)}<div class="stage-progress">${intervention.steps.map((practiceStep, index) => `<span class="${index < intervention.stepIndex ? 'complete' : index === intervention.stepIndex ? 'current' : ''}">${index < intervention.stepIndex ? '✓' : index + 1} ${stageName(practiceStep.stage)}</span>`).join('')}</div><div class="practice-grid"><article class="lesson-card"><p class="eyebrow">Mini lesson · Skill ${selectedId.toUpperCase()}</p><h2>${esc(selected.name)}</h2><p>${esc(selected.lesson)}</p><div class="plain-language-tip"><strong>Try this check</strong>${esc(selected.tip)}</div><ul><li>Read the entire word group.</li><li>Find who or what it is about.</li><li>Find the main verb and decide whether the thought can stand alone.</li></ul></article><article class="practice-question"><p class="eyebrow">${esc(stageName(step.stage))} task</p>${questionPrompt(item, step.fallback ? 'Choose the revision that best completes the thought.' : '')}${step.fallback ? choiceControl(fallback.choices, step.fallbackAnswer, 'fallback') : responseControl(item, step.answer)}<div id="practice-feedback">${step.feedback ? feedbackBox(step.result, step.feedback) : ''}</div><div class="button-row"><button class="button accent" data-action="check-practice">Check my work →</button></div></article></div>`;
}
function practiceDomainList(ids, selectedId) {
  const diagnosticById = Object.fromEntries(diagnosticScores().map((score) => [score.id, score]));
  return `<div class="domain-list">${ids.map((id) => {
    const skill = domain(id); const intervention = state.interventions[id];
    const complete = intervention?.complete && intervention?.round === currentRound();
    const progress = complete ? 100 : Math.round(((intervention?.stepIndex || 0) / 3) * 100);
    return `<button class="domain-row ${id === selectedId ? 'selected' : ''}" data-domain="${id}"><span class="domain-name">Skill ${id.toUpperCase()} · ${esc(skill.name)}<small>${esc(skill.short.replace(/^Skill [A-E] · /, ''))}</small></span><span class="bar"><span style="width:${Math.max(progress, 5)}%"></span></span><span class="domain-score">${complete ? 'Verified ✓' : `${diagnosticById[id]?.percent || 0}% start`}</span></button>`;
  }).join('')}</div>`;
}
function feedbackBox(evaluation, message) {
  const status = evaluation?.status || 'info';
  const heading = status === 'correct' ? 'Correct' : status === 'needsReview' ? 'Let’s check another way' : 'Try again';
  return `<div class="feedback ${status}"><strong>${heading}</strong>${esc(message)}</div>`;
}
function compactEvaluation(evaluation) {
  return { status: evaluation.status, score: evaluation.score, evaluatorVersion: evaluation.evaluatorVersion,
    family: evaluation.family || null, checks: evaluation.checks, reasons: evaluation.reasons, feedback: evaluation.feedback };
}

function reportAnswer(item, answer) {
  if (answer === undefined || answer === null || answer === '') return 'Not answered';
  if (item.responseMode === 'choice') return item.choices[Number(answer)] || `Option ${Number(answer) + 1}`;
  if (item.responseMode === 'reasonChoice') return item.reasonTask.choices[Number(answer)] || 'Explanation selected';
  if (item.responseMode === 'classifyReason') return `${item.choices[Number(answer.classification)] || 'No decision'} — ${item.reasonTask.choices[Number(answer.reason)] || 'No reason'}`;
  if (item.responseMode === 'classifyRepair') return `${item.choices[Number(answer.classification)] || 'No decision'} — ${answer.text || 'No repair'}`;
  if (item.responseMode === 'paragraphRepair') return `Selected sentences: ${(answer.selected || []).map((index) => index + 1).join(', ') || 'none'} — ${answer.text || 'No revision'}`;
  return String(answer);
}
function expectedAnswer(item) {
  if (item.responseMode === 'choice') return item.choices[item.answer] || 'Correct option';
  if (item.responseMode === 'reasonChoice') return item.reasonTask.choices[item.reasonTask.answer];
  if (item.responseMode === 'classifyReason') return `${item.choices[item.answer]} with the structure-based explanation`;
  if (item.responseMode === 'paragraphRepair') return 'All fragments selected and repaired while the original meaning is preserved';
  return 'A complete revision that follows the task and preserves the original idea';
}
function statusLabel(evaluation) {
  if (!evaluation) return 'Not scored';
  if (evaluation.status === 'correct') return 'Correct';
  if (evaluation.status === 'needsReview') return 'Needs review';
  return 'Incorrect';
}
function reportItemRows(rows) {
  return rows.map((row) => `<tr><td>${esc(row.item.id)}</td><td>${esc(domain(row.item.domain).name)}</td><td>${esc(reportAnswer(row.item, row.answer))}</td><td>${esc(expectedAnswer(row.item))}</td><td class="report-status ${row.evaluation.status}">${statusLabel(row.evaluation)}${row.evaluation.reasons?.length ? `<small>${esc(row.evaluation.reasons.join(' '))}</small>` : ''}</td></tr>`).join('');
}
function reportDomainTable(scores) {
  return `<table class="report-table"><thead><tr><th>Skill</th><th>Correct</th><th>Tasks</th><th>Score</th><th>Status</th></tr></thead><tbody>${scores.map((score) => `<tr><td>Skill ${score.id.toUpperCase()} · ${esc(score.name)}</td><td>${score.correct}</td><td>${score.total}</td><td>${score.percent}%</td><td>${score.mastered === undefined ? (score.percent < MASTERY_THRESHOLD ? 'Learning assigned' : 'Ready') : (score.mastered ? 'Mastered' : 'Not yet mastered')}</td></tr>`).join('')}</tbody></table>`;
}
function completedInterventions() { return state.events.filter((event) => event.type === 'intervention'); }
function interventionTableRows() {
  return completedInterventions().map((event) => `<tr><td>${esc(formatDate(event.at))}</td><td>${event.payload.round}</td><td>Skill ${String(event.payload.domainId || '').toUpperCase()} · ${esc(event.payload.domain)}</td><td>${esc(event.payload.stage)}</td><td>${esc(event.payload.itemId)}</td><td>${esc(statusLabel(event.payload.evaluation))}</td></tr>`).join('');
}
function masteryAttemptTable() {
  if (!state.masteryAttempts.length) return '<p class="report-empty">No mastery attempts have been completed.</p>';
  return `<table class="report-table"><thead><tr><th>Attempt</th><th>Skills assessed</th><th>Score</th><th>Skills needing relearning</th><th>Date</th></tr></thead><tbody>${state.masteryAttempts.map((attempt, index) => {
    const domainIds = attempt.domainIds || (attempt.domains || []).map((entry) => entry.id || DOMAINS.find((skill) => skill.name === entry.domain)?.id).filter(Boolean);
    const weak = attempt.weakDomainIds || (attempt.weakDomains || []).map((name) => DOMAINS.find((skill) => skill.name === name)?.id).filter(Boolean);
    return `<tr><td>${attempt.attempt || index + 1}</td><td>${esc(domainIds.map((id) => id.toUpperCase()).join(', ') || 'Legacy assessment')}</td><td>${attempt.score}%</td><td>${esc(weak.map((id) => `Skill ${id.toUpperCase()}`).join(', ') || 'None')}</td><td>${esc(formatDate(attempt.at))}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function eventDescription(event) {
  const payload = event.payload || {};
  if (event.type === 'assessment') return `${payload.assessment === 'diagnostic' ? 'Diagnostic' : 'Mastery'} evidence recorded at ${payload.score}%.`;
  if (event.type === 'intervention') return `${payload.stage} completed for Skill ${String(payload.domainId || '').toUpperCase()} using item ${payload.itemId}.`;
  if (event.type === 'reassessment') return `Targeted relearning assigned for ${(payload.weakDomainIds || []).map((id) => `Skill ${id.toUpperCase()}`).join(', ')}.`;
  if (event.type === 'alternate') return 'An unseen alternate item replaced a response the local checker could not score confidently.';
  return 'Learning path updated.';
}

function reportView() {
  const diagnostic = diagnosticRows(); const interventions = completedInterventions(); const finalScores = finalMasteryScores();
  const finalRows = Object.values(state.masteryEvidence).flatMap((evidence) => evidence.rows || []); const events = state.events.slice().reverse();
  return `${journey()}<div class="view-header"><div><p class="eyebrow">Learning record</p><h1>Your mastery report.</h1><p class="subhead">This report records the complete route through the lab: diagnostic evidence, completed learning interventions, reassessment loops, and final mastery evidence.</p></div><button class="button" data-action="download-report">⇩ Download report</button></div><div class="report-card"><div><p class="eyebrow">${state.masteryComplete ? 'Mastery achieved' : 'In progress'}</p><h2>${state.masteryComplete ? 'All five sentence-fragment skills are mastered.' : 'Complete the path to finish this report.'}</h2><p>Your progress is stored only in this browser. Download the report before clearing browser data or moving to another device.</p></div><div class="report-art">${state.masteryComplete ? '✓' : '◌'}</div></div><div class="report-stats"><div class="report-stat"><b>${state.diagnosticComplete ? `${diagnosticOverall()}%` : '—'}</b><small>Diagnostic starting point</small></div><div class="report-stat"><b>${interventions.length}</b><small>Completed interventions</small></div><div class="report-stat"><b>${state.masteryComplete ? `${finalMasteryOverall()}%` : '—'}</b><small>Final mastery evidence</small></div></div><section class="report-section"><h3>1. Diagnostic assessment results</h3><p>The diagnostic identifies which of the five skills receive targeted learning. “Needs review” responses receive no automatic credit but are routed to instruction rather than labeled wrong.</p>${state.diagnosticComplete ? `${reportDomainTable(diagnosticScores())}<details class="report-detail"><summary>View diagnostic task details</summary><table class="report-table"><thead><tr><th>Task</th><th>Skill</th><th>Learner response</th><th>Expected evidence</th><th>Result</th></tr></thead><tbody>${reportItemRows(diagnostic)}</tbody></table></details>` : '<p class="report-empty">Diagnostic results will appear after completion.</p>'}</section><section class="report-section"><h3>2. Completed learning interventions</h3><p>Each assigned skill moves through guided practice, independent practice, and an unseen verification task.</p>${interventions.length ? `<table class="report-table"><thead><tr><th>Date</th><th>Round</th><th>Skill</th><th>Stage</th><th>Task</th><th>Result</th></tr></thead><tbody>${interventionTableRows()}</tbody></table>` : '<p class="report-empty">No completed interventions were required or recorded.</p>'}</section><section class="report-section"><h3>3. Mastery assessment results</h3><p>Initial mastery uses four protected tasks per skill. Reassessments use the remaining unseen items for skills that need additional evidence.</p>${masteryAttemptTable()}${state.masteryComplete ? `${reportDomainTable(finalScores)}<details class="report-detail"><summary>View final mastery task details</summary><table class="report-table"><thead><tr><th>Task</th><th>Skill</th><th>Learner response</th><th>Expected evidence</th><th>Result</th></tr></thead><tbody>${reportItemRows(finalRows)}</tbody></table></details>` : ''}</section><section class="report-section"><h3>Learning history</h3><p>These saved events show the sequence that produced the final result.</p><div class="timeline">${events.length ? events.map((event) => `<div class="timeline-item"><div class="timeline-date">${formatDate(event.at)}<br/>${formatTime(event.at)}</div><div class="timeline-line"></div><div class="timeline-content"><b>${esc(event.detail)}</b><p>${esc(eventDescription(event))}</p></div></div>`).join('') : '<div class="empty-state">Complete your diagnostic to begin your learning history.</div>'}</div></section><p class="privacy-note">Local evaluator ${esc(LOCAL_EVALUATOR.version)} · No AI or external scoring service was used.</p>`;
}

function render() {
  document.querySelectorAll('.phase-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === state.view);
    const order = ['overview', 'diagnostic', 'practice', 'mastery', 'report'];
    button.classList.toggle('done', order.indexOf(button.dataset.view) < order.indexOf(activePhase()) && button.dataset.view !== 'overview');
  });
  const views = { overview: overviewView, diagnostic: () => assessmentView('diagnostic'), practice: practiceView,
    mastery: () => assessmentView('mastery'), report: reportView };
  document.querySelector('#app').innerHTML = (views[state.view] || overviewView)(); bindEvents();
}

function currentResponseContext() {
  if (state.view === 'diagnostic' || state.view === 'mastery') {
    const kind = state.view; const item = assessmentItems(kind)[currentQuestion];
    return { item, get answer() { return state[`${kind}Answers`][item.id]; }, set answer(value) { state[`${kind}Answers`][item.id] = value; } };
  }
  if (state.view === 'practice') {
    const intervention = ensureIntervention(practiceDomain); const step = intervention.steps[intervention.stepIndex];
    return { item: BANK_BY_ID[step.itemId], get answer() { return step.answer; }, set answer(value) { step.answer = value; }, step };
  }
  return null;
}
function updateResponse(field, value) {
  const context = currentResponseContext(); if (!context) return; const mode = context.item.responseMode;
  if (mode === 'choice' || mode === 'reasonChoice' || mode === 'text') context.answer = value;
  else context.answer = { ...(context.answer || {}), [field]: value };
  saveState();
}

function finishAssessment(event) {
  const kind = event.currentTarget.dataset.kind; const items = assessmentItems(kind); const answers = answersFor(kind);
  if (items.some((item) => !answerComplete(item, answers[item.id]))) return showToast(`Complete all ${items.length} tasks before finishing.`);
  const rows = assessmentRows(kind, items, answers); const score = overallFromRows(rows); const scores = domainScoresFromRows(rows);
  if (kind === 'diagnostic') {
    state.diagnosticResults = Object.fromEntries(rows.map((row) => [row.item.id, compactEvaluation(row.evaluation)])); state.diagnosticComplete = true;
    record('assessment', `Diagnostic assessment complete · ${score}%`, { assessment: 'diagnostic', score,
      domains: scores.map((skill) => ({ id: skill.id, score: skill.percent, correct: skill.correct, total: skill.total })),
      itemIds: items.map((item) => item.id), evaluatorVersion: LOCAL_EVALUATOR.version });
    state.view = requiredPracticeIds().length ? 'practice' : 'mastery'; currentQuestion = 0; render();
    showToast(requiredPracticeIds().length ? 'Your targeted learning path is ready.' : 'Your mastery check is ready.'); return;
  }
  const replacements = [];
  rows.filter((row) => row.evaluation.status === 'needsReview').forEach((row) => {
    const replacement = itemsFor('Mastery assessment', row.item.domain).find((candidate) => !masteryUsedIds().has(candidate.id)
      && !state.masteryItemIds.includes(candidate.id) && !replacements.some((entry) => entry.newId === candidate.id));
    if (replacement) replacements.push({ oldId: row.item.id, newId: replacement.id, evaluation: row.evaluation });
  });
  if (replacements.length) {
    replacements.forEach((replacement) => {
      state.masteryReviewHistory.push({ itemId: replacement.oldId, answer: state.masteryAnswers[replacement.oldId],
        evaluation: compactEvaluation(replacement.evaluation), at: new Date().toISOString() });
      state.masteryItemIds = state.masteryItemIds.map((id) => id === replacement.oldId ? replacement.newId : id);
      delete state.masteryAnswers[replacement.oldId];
    });
    record('alternate', `${replacements.length} mastery response${replacements.length === 1 ? '' : 's'} received unseen alternate tasks`,
      { replacements: replacements.map(({ oldId, newId }) => ({ oldId, newId })) });
    currentQuestion = Math.max(0, state.masteryItemIds.findIndex((id) => replacements.some((entry) => entry.newId === id)));
    render(); showToast('An unseen alternate task is ready for each response needing review.'); return;
  }
  const attemptNumber = state.masteryAttempts.length + 1; const assessedScores = scores.filter((skill) => skill.total > 0); const at = new Date().toISOString();
  const storedRows = rows.map((row) => ({ item: row.item, answer: row.answer, answered: row.answered, evaluation: compactEvaluation(row.evaluation) }));
  assessedScores.forEach((skill) => {
    const skillRows = storedRows.filter((row) => row.item.domain === skill.id);
    const mastered = skill.percent >= MASTERY_THRESHOLD && !skillRows.some((row) => row.evaluation.status === 'needsReview');
    state.masteryEvidence[skill.id] = { correct: skill.correct, total: skill.total, percent: skill.percent, mastered,
      itemIds: skillRows.map((row) => row.item.id), rows: skillRows, attempt: attemptNumber, at };
  });
  const weakDomainIds = finalMasteryScores().filter((skill) => !skill.mastered).map((skill) => skill.id);
  const attempt = { attempt: attemptNumber, at, score, domainIds: assessedScores.map((skill) => skill.id),
    domains: assessedScores.map((skill) => ({ id: skill.id, score: skill.percent, correct: skill.correct, total: skill.total })), weakDomainIds,
    itemIds: items.map((item) => item.id), rows: storedRows, evaluatorVersion: LOCAL_EVALUATOR.version, final: weakDomainIds.length === 0 };
  state.masteryAttempts.push(attempt); state.masteryResults = Object.fromEntries(storedRows.map((row) => [row.item.id, row.evaluation]));
  if (!weakDomainIds.length) {
    state.masteryComplete = true;
    record('assessment', `Final mastery assessment complete · ${finalMasteryOverall()}%`, { assessment: 'mastery', attempt: attemptNumber,
      score: finalMasteryOverall(), domainIds: DOMAINS.map((skill) => skill.id), itemIds: items.map((item) => item.id), evaluatorVersion: LOCAL_EVALUATOR.version });
    state.view = 'report'; currentQuestion = 0; render(); showToast('Mastery achieved. Your report is ready.'); return;
  }
  const loop = state.masteryLoops.length + 1;
  state.masteryLoops.push({ loop, attempt: attemptNumber, score, at, weakDomainIds, itemIds: items.map((item) => item.id) });
  weakDomainIds.forEach((id) => { delete state.interventions[id]; });
  state.masteryItemIds = []; state.masteryAnswers = {};
  record('reassessment', `Mastery attempt ${attemptNumber} → targeted relearning`, { attempt: attemptNumber, loop, score, weakDomainIds });
  state.view = 'practice'; currentQuestion = 0; practiceDomain = weakDomainIds[0]; render();
  showToast('A new learning round is ready for the skills needing attention.');
}

function completePracticeStep(intervention, step, item, evaluation, viaFallback = false) {
  step.result = compactEvaluation(evaluation); step.feedback = evaluation.feedback;
  record('intervention', `${stageName(step.stage)} completed: ${item.id}`, { round: intervention.round, domainId: item.domain,
    domain: domain(item.domain).name, stage: step.stage, pool: item.pool, itemId: item.id,
    response: viaFallback ? step.fallbackAnswer : step.answer, viaStructuredFallback: viaFallback, evaluation: compactEvaluation(evaluation) });
  if (intervention.stepIndex < intervention.steps.length - 1) {
    intervention.stepIndex += 1; intervention.steps[intervention.stepIndex].feedback = '';
  } else intervention.complete = true;
  saveState(); render(); showToast(intervention.complete ? `${domain(item.domain).name} verified.` : 'Next learning stage unlocked.');
}
function checkPractice() {
  const intervention = ensureIntervention(practiceDomain); const step = intervention.steps[intervention.stepIndex]; const item = BANK_BY_ID[step.itemId];
  if (step.fallback) {
    const fallback = fallbackRepair(item);
    if (step.fallbackAnswer === null || step.fallbackAnswer === undefined) {
      step.feedback = 'Choose a revision before checking your work.'; step.result = result('incorrect', step.feedback); saveState(); render(); return;
    }
    const correct = Number(step.fallbackAnswer) === fallback.answer;
    const evaluation = result(correct ? 'correct' : 'incorrect', correct ? 'You selected a revision that completes the thought and preserves the original idea.' : domain(item.domain).feedback,
      { structuredFallbackCorrect: correct }, correct ? [] : [domain(item.domain).feedback]);
    if (correct) completePracticeStep(intervention, step, item, evaluation, true);
    else { step.attempts += 1; intervention.unsuccessfulAttempts += 1; step.result = compactEvaluation(evaluation); step.feedback = evaluation.feedback; saveState(); render(); }
    return;
  }
  if (!answerComplete(item, step.answer)) {
    step.feedback = 'Complete the task before checking your work.'; step.result = result('incorrect', step.feedback); saveState(); render(); return;
  }
  const evaluation = evaluateAnswer(item, step.answer); step.result = compactEvaluation(evaluation); step.attempts += 1; step.feedback = evaluation.feedback;
  if (evaluation.status === 'correct') { completePracticeStep(intervention, step, item, evaluation); return; }
  intervention.unsuccessfulAttempts += 1;
  if (evaluation.status === 'needsReview') {
    step.reviewCount += 1;
    if (step.stage === 'Verification') {
      const alternate = nextUnseenItem(item.domain, 'Verification', intervention.steps.map((entry) => entry.itemId));
      if (alternate) {
        const oldId = step.itemId; step.itemId = alternate.id; step.answer = null; step.result = null; step.feedback = '';
        record('alternate', `Verification item ${oldId} replaced with unseen item ${alternate.id}`, { domainId: item.domain, oldId, newId: alternate.id });
        render(); showToast('An unseen verification task is ready.'); return;
      }
      step.feedback = 'The local checker cannot score this response confidently, and no unseen verification item remains. Ask your instructor to review this skill.';
    } else if (step.reviewCount >= 2) {
      step.fallback = true; step.fallbackAnswer = null;
      step.feedback = 'Choose the best revision so the skill can be checked without open-text uncertainty.';
    } else step.feedback = `${evaluation.feedback} Revise once more, or use the structured task if the checker remains unsure.`;
  } else step.feedback = evaluation.feedback || domain(item.domain).feedback;
  if (intervention.unsuccessfulAttempts >= 6) step.feedback += ' You have made several attempts on this skill. Pause and ask your instructor for help with the underlying sentence parts before continuing.';
  saveState(); render();
}

function startMastery() {
  if (!practiceComplete()) return showToast('Complete each assigned verification task first.');
  const weakIds = state.masteryLoops.length ? state.masteryLoops[state.masteryLoops.length - 1].weakDomainIds : DOMAINS.map((skill) => skill.id);
  prepareMasterySet(weakIds); setView('mastery');
}
function openGlossary() {
  const entries = [['Complete sentence', 'A group of words that names who or what it is about, includes a main verb, and expresses a complete thought.'],
    ['Sentence fragment', 'A group of words punctuated like a sentence that is missing an essential part or leaves the thought unfinished.'],
    ['Subject', 'Who or what the sentence is about.'], ['Main verb', 'The word or words that tell what the subject does or is.'],
    ['Complete thought', 'An idea that can stand alone without leaving the reader waiting for more information.'],
    ['Dependent clause', 'A group of words with a subject and verb that begins with a word such as because, although, when, or if and needs another thought attached.'],
    ['Phrase', 'A group of words that adds detail but does not express a complete thought by itself.']];
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="glossary-title"><div class="modal-head"><div><p class="eyebrow">Quick reference</p><h2 id="glossary-title">Plain-language glossary</h2></div><button class="icon-button" data-action="close-modal" aria-label="Close">×</button></div><div class="glossary-list">${entries.map(([term, definition]) => `<div><b>${esc(term)}</b><p>${esc(definition)}</p></div>`).join('')}</div><div class="button-row"><button class="button secondary" data-action="close-modal">Close glossary</button></div></div></div>`;
  document.querySelectorAll('[data-action="close-modal"]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#modal-root').innerHTML = ''; }));
}

function reportHtml() {
  const diagnostic = diagnosticRows(); const finalScores = finalMasteryScores();
  const finalRows = Object.values(state.masteryEvidence).flatMap((evidence) => evidence.rows || []); const interventions = completedInterventions();
  const css = `body{font:14px Arial,sans-serif;color:#000;max-width:1050px;margin:42px auto;line-height:1.5;padding:0 20px}h1,h2,h3{font-family:Georgia,serif}h1{font-size:32px;border-bottom:4px solid #006EB6;padding-bottom:16px}h2{margin-top:34px;color:#214491}.meta{color:#646568}.stat{display:inline-block;width:28%;padding:14px;background:#e8f4fb;margin:4px}.stat b{font-size:25px;display:block;color:#006EB6}table{width:100%;border-collapse:collapse;margin:12px 0 20px;font-size:12px}td,th{text-align:left;border-bottom:1px solid #d5d6d8;padding:9px;vertical-align:top}th{font-size:10px;text-transform:uppercase;color:#646568}td small{display:block;color:#646568;margin-top:3px}.correct{color:#006EB6;font-weight:bold}.incorrect{color:#000;font-weight:bold}.needsReview{color:#646568;font-weight:bold}.notice{padding:12px;background:#eef8fc;border-left:4px solid #006EB6}`;
  const domainTable = (scores) => `<table><tr><th>Skill</th><th>Correct</th><th>Tasks</th><th>Score</th><th>Status</th></tr>${scores.map((score) => `<tr><td>Skill ${score.id.toUpperCase()} · ${esc(score.name)}</td><td>${score.correct}</td><td>${score.total}</td><td>${score.percent}%</td><td>${score.mastered === undefined ? (score.percent < MASTERY_THRESHOLD ? 'Learning assigned' : 'Ready') : (score.mastered ? 'Mastered' : 'Not yet mastered')}</td></tr>`).join('')}</table>`;
  const itemTable = (rows) => `<table><tr><th>Task</th><th>Skill</th><th>Learner response</th><th>Expected evidence</th><th>Result</th></tr>${reportItemRows(rows)}</table>`;
  const interventionTable = interventions.length ? `<table><tr><th>Date</th><th>Round</th><th>Skill</th><th>Stage</th><th>Task</th><th>Result</th></tr>${interventionTableRows()}</table>` : '<p>No completed interventions were required or recorded.</p>';
  const history = state.events.map((event) => `<li>${formatDate(event.at)} — ${esc(event.detail)}<br/><span class="meta">${esc(eventDescription(event))}</span></li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sentence Fragment Lab · Mastery performance report</title><style>${css}</style></head><body><p class="meta">BYU–Idaho · ENG 106 · Sentence Fragment Lab</p><h1>Mastery performance report</h1><p class="meta">Generated ${formatDate(new Date().toISOString())} · Saved from this browser’s local learner history.</p><div class="stat"><b>${diagnosticOverall()}%</b>Diagnostic</div><div class="stat"><b>${interventions.length}</b>Interventions</div><div class="stat"><b>${state.masteryComplete ? `${finalMasteryOverall()}%` : 'In progress'}</b>Final mastery</div><h2>1. Diagnostic assessment results</h2>${domainTable(diagnosticScores())}${itemTable(diagnostic)}<h2>2. Completed learning interventions</h2>${interventionTable}<h2>3. Mastery assessment results</h2>${masteryAttemptTable()}${state.masteryComplete ? `${domainTable(finalScores)}${itemTable(finalRows)}` : '<p>Final mastery has not been completed.</p>'}<h2>Learning history</h2><ol>${history || '<li>No events recorded.</li>'}</ol><p class="notice">Local evaluator ${esc(LOCAL_EVALUATOR.version)}. No AI or external scoring service was used.</p></body></html>`;
}
function downloadReport() {
  if (!state.masteryComplete) return showToast('Complete mastery before downloading the final report.');
  const blob = new Blob([reportHtml()], { type: 'text/html' }); const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = 'sentence-fragment-mastery-report.html'; link.click(); URL.revokeObjectURL(url); showToast('Mastery report downloaded.');
}

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    const target = button.dataset.view;
    if (target === 'practice' && !state.diagnosticComplete) return showToast('Complete the diagnostic first.');
    if (target === 'mastery') {
      if (state.masteryComplete) return showToast('Mastery is complete. Your report is ready.');
      if (!state.diagnosticComplete) return showToast('Complete the diagnostic first.');
      if (!practiceComplete()) return showToast('Complete each assigned verification task first.');
      const weakIds = state.masteryLoops.length ? state.masteryLoops[state.masteryLoops.length - 1].weakDomainIds : DOMAINS.map((skill) => skill.id);
      prepareMasterySet(weakIds);
    }
    if (target === 'report' && !state.masteryComplete) return showToast('Complete mastery to unlock the final report.');
    setView(target);
  }));
  document.querySelectorAll('[data-q]').forEach((button) => button.addEventListener('click', () => { currentQuestion = Number(button.dataset.q); render(); }));
  document.querySelectorAll('[data-answer-field]').forEach((input) => {
    input.addEventListener(input.tagName === 'TEXTAREA' ? 'input' : 'change', () => {
      const field = input.dataset.answerField; const value = input.type === 'radio' ? Number(input.value) : input.value;
      if (field === 'fallback') {
        const intervention = ensureIntervention(practiceDomain); intervention.steps[intervention.stepIndex].fallbackAnswer = value;
        saveState(); render(); return;
      }
      updateResponse(field, value); if (input.type === 'radio') render();
    });
  });
  document.querySelectorAll('[data-action="toggle-sentence"]').forEach((button) => button.addEventListener('click', () => {
    const context = currentResponseContext(); const index = Number(button.dataset.sentenceIndex); const selected = new Set(context.answer?.selected || []);
    if (selected.has(index)) selected.delete(index); else selected.add(index);
    context.answer = { ...(context.answer || {}), selected: [...selected].sort((a, b) => a - b) }; saveState(); render();
  }));
  document.querySelector('[data-action="next"]')?.addEventListener('click', () => { currentQuestion = Math.min(currentQuestion + 1, assessmentItems(state.view).length - 1); render(); });
  document.querySelector('[data-action="previous"]')?.addEventListener('click', () => { currentQuestion = Math.max(currentQuestion - 1, 0); render(); });
  document.querySelector('[data-action="finish-assessment"]')?.addEventListener('click', finishAssessment);
  document.querySelectorAll('[data-domain]').forEach((button) => button.addEventListener('click', () => { practiceDomain = button.dataset.domain; render(); }));
  document.querySelector('[data-action="check-practice"]')?.addEventListener('click', checkPractice);
  document.querySelector('[data-action="start-mastery"]')?.addEventListener('click', startMastery);
  document.querySelector('[data-action="overview-next"]')?.addEventListener('click', (event) => {
    const target = event.currentTarget.dataset.view; if (target === 'mastery') startMastery(); else setView(target);
  });
  document.querySelector('[data-action="download-report"]')?.addEventListener('click', downloadReport);
  document.querySelector('[data-action="glossary"]')?.addEventListener('click', openGlossary);
  document.querySelector('[data-action="reset-state"]')?.addEventListener('click', resetLocalProgress);
}

window.FragmentLab = { evaluateAnswer, answerComplete, normalizeBankItem, targetSentenceIndices,
  getState: () => structuredClone(state), bank: BANK_ALL, domains: DOMAINS, masteryThreshold: MASTERY_THRESHOLD };
render();
