/* Content assets and learner-state data remain intentionally separate. */
const BANK = window.QUESTION_BANK;
const RULES = window.EVALUATION_RULES;
const LOCAL_EVALUATOR = window.OpenTextEvaluator;
const STORAGE_KEY = 'fragment-lab-state';
const DATA_VERSION = 'v11-practice-assignment-dashboard';
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

const MISCONCEPTION_GUIDANCE = {
  A1_NO_COMPLETE_THOUGHT: { label: 'Complete thoughts', lesson: 'A sentence must express a thought that can stand on its own. If the words leave the reader waiting for the main point, the thought is incomplete.', tip: 'Read the words aloud and ask what the writer is actually saying happened or is true.' },
  A2_VERB_CONFUSION: { label: 'Recognizing the main verb', lesson: 'A complete sentence needs a main verb that shows what the subject does or is. Verb-like words do not always complete the action by themselves.', tip: 'Find the subject, then identify the verb that makes the main statement about it.' },
  A3_LENGTH_HEURISTIC: { label: 'Length is not the test', lesson: 'Sentence length does not determine completeness. A two-word sentence can be complete, and a long word group can still be a fragment.', tip: 'Ignore length. Look for a subject, a main verb, and a thought that stands alone.' },
  A4_PUNCTUATION_HEURISTIC: { label: 'Punctuation is not the test', lesson: 'A capital letter and end punctuation make words look finished, but they cannot supply a missing subject, main verb, or complete thought.', tip: 'Temporarily ignore the capital and period while checking the sentence structure.' },
  B1_MISSING_SUBJECT: { label: 'Missing subject', lesson: 'Some fragments name an action without identifying who or what performs it. Add a grammatical subject that clearly belongs with the original action.', tip: 'Ask: Who or what performed this action?' },
  B2_MISSING_PREDICATE: { label: 'Missing main action', lesson: 'Some fragments name or describe a subject without making a complete statement about it. The sentence needs a main verb that tells what the subject does or is.', tip: 'After finding the subject, ask: What does it do, or what is true about it?' },
  B3_VERBAL_AS_PREDICATE: { label: 'Verb-like words and main verbs', lesson: 'An -ing or -ed word can describe a subject without serving as the sentence’s complete main verb. Look for the verb that makes the main statement.', tip: 'Try placing “is,” “was,” or another complete verb with the subject and see which action is the main one.' },
  C1_SUBJECT_VERB_EQUALS_SENTENCE: { label: 'A clause may still depend on another thought', lesson: 'A word group can contain a subject and verb and still be incomplete when a connecting word makes it depend on another thought.', tip: 'After finding the subject and verb, check whether the opening word leaves you waiting for more.' },
  C2_SUBORDINATOR_UNRECOGNIZED: { label: 'Words that create dependence', lesson: 'Words such as because, although, when, while, if, and unless can make one thought depend on another thought.', tip: 'Find the connecting word, then locate the complete thought it is attached to.' },
  C3_DELETE_SUBORDINATOR_ONLY: { label: 'Preserving the relationship', lesson: 'Deleting the connecting word may erase the relationship between ideas. A stronger repair often keeps that word and adds or attaches a complete thought.', tip: 'Keep the connecting word and ask what complete thought belongs with it.' },
  C4_RELATIVE_CLAUSE_COMPLETE: { label: 'Who, which, and that clauses', lesson: 'A clause beginning with who, which, or that usually describes a nearby noun and does not stand alone as the sentence’s main thought.', tip: 'Find the noun being described, then look for the sentence’s main statement about that noun.' },
  D1_ING_EQUALS_VERB: { label: '-ing phrase fragments', lesson: 'An -ing word can name an action while the word group still lacks a complete main statement. Attach the phrase to a subject and main verb.', tip: 'Ask who is performing the -ing action and what complete statement is made about that person or thing.' },
  D2_INFINITIVE_EQUALS_PREDICATE: { label: 'To + verb phrase fragments', lesson: 'A to + verb phrase usually explains a purpose or goal. By itself, it does not make a complete statement.', tip: 'Ask who has the purpose or goal, and what that person or thing does.' },
  D3_DESCRIPTIVE_DETAIL_COMPLETE: { label: 'Descriptive phrase fragments', lesson: 'Descriptive words can add useful detail without making a complete statement. Attach the detail to a sentence with a subject and main verb.', tip: 'Ask what the description belongs to and what complete statement is made about it.' },
  E1_OVEREDITING: { label: 'Editing only what needs repair', lesson: 'A paragraph repair should change the fragments while preserving sentences that are already complete.', tip: 'Check each sentence before editing it. Leave complete thoughts unchanged.' },
  E2_CONTEXT_DEPENDENCE: { label: 'Finding fragments in paragraphs', lesson: 'Fragments can be harder to notice in connected prose. Check each sentence boundary instead of relying on the paragraph’s overall flow.', tip: 'Pause at every period and test whether that word group can stand alone.' },
  E3_MEANING_DAMAGE: { label: 'Preserving the writer’s meaning', lesson: 'A repair must be grammatical and preserve the writer’s intended relationship and details.', tip: 'Compare the repair with the original paragraph and check whether any action, time, cause, or contrast changed.' }
};

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

function reasonChoiceClassification(item) {
  const prompt = String(item.prompt || '').toLowerCase();
  const rubric = String(item.rubric || '').toLowerCase();
  if (/not a complete sentence|why this is (?:still )?a fragment|if not, identify what is missing/.test(prompt)) return 1;
  if (/why this is (?:a )?complete|complete sentence even though|too short to be a sentence/.test(prompt)) return 0;
  if (/^\s*fragment\b/.test(rubric)) return 1;
  if (/complete independent clause|stands independently|is an independent clause/.test(rubric)) return 0;
  return classificationAnswer(item.rubric);
}

function misconceptionTags(item) {
  return String(item.misconceptions || '').split(/\s*;\s*/).map((tag) => tag.trim()).filter(Boolean);
}

function primaryMisconception(item) {
  if (item.evaluation?.targetTag) return item.evaluation.targetTag;
  const tags = misconceptionTags(item);
  const evidence = `${item.rubric || ''} ${item.family || ''}`.toLowerCase();
  const prompt = String(item.prompt || '').toLowerCase();
  const preferred = [];
  if (/missing subject|lacks? (a )?subject|who or what performs/.test(evidence)) preferred.push('B1_MISSING_SUBJECT');
  if (/missing predicate|main verb|complete predicate/.test(evidence)) preferred.push('B2_MISSING_PREDICATE');
  if (/\bwhich\b|\bwho\b|relative clause/.test(prompt + evidence)) preferred.push('C4_RELATIVE_CLAUSE_COMPLETE');
  if (/\b(to\s+\w+)|infinitive/.test(prompt + evidence)) preferred.push('D2_INFINITIVE_EQUALS_PREDICATE');
  if (/\b\w+ing\b|particip|verbal/.test(prompt + evidence)) preferred.push('D1_ING_EQUALS_VERB', 'B3_VERBAL_AS_PREDICATE');
  return preferred.find((tag) => tags.includes(tag)) || tags[0] || '';
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
  const stimulus = String(item.prompt || '').split(/\n\s*\n/).at(-1).trim().toLowerCase();
  if (complete) {
    if (item.domain === 'b') return 'It includes a subject and a separate main verb that completes the thought.';
    if (item.domain === 'c') return 'The dependent words are attached to a complete thought that can stand alone.';
    if (item.domain === 'd') return 'The opening phrase adds detail, and the rest of the sentence expresses a complete thought.';
    return 'It has a subject, a main verb, and a complete thought.';
  }
  if (item.domain === 'b' && /missing subject|lacks? (a )?subject|no grammatical subject/.test(evidence)) {
    return 'It does not say who or what performs the action.';
  }
  if (item.domain === 'b') return 'It names who or what the words are about, but it does not include a main verb that completes the thought.';
  if (item.domain === 'c' && /^(who|which|that)\b/.test(stimulus)) {
    return 'It begins with who, which, or that and only describes another word; it does not make a complete statement by itself.';
  }
  if (item.domain === 'c') return 'A word such as because, although, when, or if makes the thought depend on another complete thought.';
  if (item.domain === 'd' && /^to\s+\w+/.test(stimulus)) {
    return 'The to + verb words explain a purpose but do not make a complete statement by themselves.';
  }
  if (item.domain === 'd' && /^(\w+ing|confused|relieved|after|before)\b/.test(stimulus)) {
    return 'The opening words add an action or detail but do not include a subject and main verb that complete the thought.';
  }
  if (item.domain === 'd') return 'The words add detail but do not form a complete thought with a subject and main verb.';
  return 'It does not express a complete thought that can stand alone.';
}

function reasonDistractors(item, complete) {
  if (complete) {
    const byDomain = {
      a: [
        { text: 'It is complete because it begins with a capital letter and ends with punctuation.', tag: 'A4_PUNCTUATION_HEURISTIC' },
        { text: 'It is complete because it is long enough to count as a sentence.', tag: 'A3_LENGTH_HEURISTIC' }
      ],
      b: [
        { text: 'Any word ending in -ing automatically serves as the sentence’s main verb.', tag: 'B3_VERBAL_AS_PREDICATE' },
        { text: 'It names who or what the words are about, so no main verb is needed.', tag: 'B2_MISSING_PREDICATE' }
      ],
      c: [
        { text: 'Any word group with a subject and verb can stand alone, even when a connecting word leaves the thought unfinished.', tag: 'C1_SUBJECT_VERB_EQUALS_SENTENCE' },
        { text: 'A word such as because or although automatically makes the word group complete.', tag: 'C2_SUBORDINATOR_UNRECOGNIZED' }
      ],
      d: [
        { text: 'Any word ending in -ing automatically supplies the main verb needed for a sentence.', tag: 'D1_ING_EQUALS_VERB' },
        { text: 'A to + verb phrase can stand alone as a complete sentence.', tag: 'D2_INFINITIVE_EQUALS_PREDICATE' }
      ]
    };
    return byDomain[item.domain] || byDomain.a;
  }
  const evidence = `${item.rubric} ${item.family}`.toLowerCase();
  const stimulus = String(item.prompt || '').split(/\n\s*\n/).at(-1).trim().toLowerCase();
  if (item.domain === 'b') {
    const missingSubject = /missing subject|lacks? (a )?subject|no grammatical subject/.test(evidence);
    return missingSubject ? [
      { text: 'It names who or what the words are about but does not include a main verb.', tag: 'B2_MISSING_PREDICATE' },
      { text: 'It is a fragment because it does not end with the correct punctuation.', tag: 'A4_PUNCTUATION_HEURISTIC' }
    ] : [
      { text: 'It includes an action but does not identify who or what performs it.', tag: 'B1_MISSING_SUBJECT' },
      { text: 'It is a fragment because it is too short to be a sentence.', tag: 'A3_LENGTH_HEURISTIC' }
    ];
  }
  if (item.domain === 'c') return [
    { text: 'It includes an action but does not identify who or what performs it.', tag: 'B1_MISSING_SUBJECT' },
    { text: 'It names who or what the words are about but does not include a verb.', tag: 'B2_MISSING_PREDICATE' }
  ];
  if (item.domain === 'd' && /^to\s+\w+/.test(stimulus)) return [
    { text: 'It is a fragment because an -ing word cannot serve as a complete main verb.', tag: 'D1_ING_EQUALS_VERB' },
    { text: 'It is a fragment because a word such as because or although leaves the thought unfinished.', tag: 'C2_SUBORDINATOR_UNRECOGNIZED' }
  ];
  if (item.domain === 'd') return [
    { text: 'It is a fragment because a to + verb phrase cannot stand alone.', tag: 'D2_INFINITIVE_EQUALS_PREDICATE' },
    { text: 'It is a fragment because a word such as because or although leaves the thought unfinished.', tag: 'C2_SUBORDINATOR_UNRECOGNIZED' }
  ];
  return [
    { text: 'It is a fragment because it is too short to be a sentence.', tag: 'A3_LENGTH_HEURISTIC' },
    { text: 'It is a fragment because it does not end with the correct punctuation.', tag: 'A4_PUNCTUATION_HEURISTIC' }
  ];
}

function buildReasonTask(item, classification) {
  const complete = Number(classification) === 0;
  const correct = reasonText(item, complete);
  const entries = [{ text: correct, tag: '', correct: true }, ...reasonDistractors(item, complete)];
  const seed = `${item.id || ''}-${complete ? 'complete' : 'fragment'}`;
  const offset = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0) % entries.length;
  const rotated = entries.map((_, index) => entries[(index + offset) % entries.length]);
  return {
    choices: rotated.map((entry) => entry.text),
    answer: rotated.findIndex((entry) => entry.correct),
    evidenceTags: rotated.map((entry) => entry.tag)
  };
}

function reasonTaskFor(item, classification) {
  if (item.responseMode === 'classifyReason') return item.reasonTasks?.[Number(classification)] || null;
  return item.reasonTask || null;
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
  } else if (/short explanation/i.test(type)
    || (/short response/i.test(type) && /identify what is missing/i.test(source.Prompt || ''))) responseMode = 'reasonChoice';
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
  if (responseMode === 'reasonChoice') item.reasonTask = buildReasonTask(item, reasonChoiceClassification(item));
  if (responseMode === 'classifyReason') {
    item.reasonTasks = { 0: buildReasonTask(item, 0), 1: buildReasonTask(item, 1) };
    item.reasonTask = item.reasonTasks[item.answer];
  }
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

const DEFAULT_DIAGNOSTIC_IDS = [
  ...selectInitialItems('Diagnostic', { a: 2, b: 2, c: 2, d: 2, e: 1 }),
  'SFD-029'
];
const LEGACY_MASTERY_IDS = selectInitialItems('Mastery assessment', 2);

function defaultState() {
  return {
    dataVersion: DATA_VERSION,
    bankVersion: BANK.version,
    evaluatorVersion: LOCAL_EVALUATOR.version,
    view: 'overview',
    diagnosticItemIds: [...DEFAULT_DIAGNOSTIC_IDS],
    diagnosticAnswers: {}, diagnosticLocked: {}, diagnosticResults: {}, diagnosticComplete: false,
    interventions: {},
    masteryItemIds: [], masteryAnswers: {}, masteryLocked: {}, masteryResults: {}, masteryAttempts: [], masteryEvidence: {},
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
      const classification = Number(value);
      return [id, { classification, reason: reasonTaskFor(item, classification)?.answer, migrated: true }];
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
    diagnosticLocked: saved.diagnosticComplete
      ? Object.fromEntries(diagnosticIds.map((id) => [id, true])) : (saved.diagnosticLocked || {}),
    masteryItemIds: oldMasteryIds,
    masteryAnswers: mapLegacyAnswers(saved.masteryAnswers, oldMasteryIds || LEGACY_MASTERY_IDS),
    masteryLocked: saved.masteryComplete
      ? Object.fromEntries(oldMasteryIds.map((id) => [id, true])) : (saved.masteryLocked || {}),
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
function structuredEvidence(item, correct, selectedTag = '', strength = 'moderate') {
  const tag = selectedTag || primaryMisconception(item);
  if (!tag) return [];
  return [{
    tag,
    outcome: correct ? 'counterevidence' : 'supports',
    strength,
    reason: correct
      ? 'The response matched the targeted sentence evidence.'
      : 'The response indicates that this misconception may need instruction.'
  }];
}

function result(status, feedback, checks = {}, reasons = [], details = {}) {
  return {
    status,
    score: status === 'correct' ? 1 : 0,
    confidence: details.confidence || 'high',
    evaluatorVersion: LOCAL_EVALUATOR.version,
    checks,
    reasons,
    feedback,
    target: details.target || null,
    quality: details.quality || null,
    misconceptionEvidence: details.misconceptionEvidence || [],
    responseIssues: details.responseIssues || [],
    advisories: details.advisories || []
  };
}

function evaluateAnswer(item, answer) {
  if (item.responseMode === 'choice') {
    const correct = Number(answer) === item.answer;
    return result(correct ? 'correct' : 'incorrect', correct ? 'That answer matches the sentence evidence.' : domain(item.domain).feedback,
      { selectedCorrectOption: correct }, correct ? [] : [domain(item.domain).feedback],
      { misconceptionEvidence: structuredEvidence(item, correct) });
  }
  if (item.responseMode === 'reasonChoice') {
    const correct = Number(answer) === item.reasonTask.answer;
    const selectedTag = item.reasonTask.evidenceTags?.[Number(answer)] || '';
    return result(correct ? 'correct' : 'incorrect', correct ? item.reasonTask.choices[item.reasonTask.answer] : domain(item.domain).feedback,
      { selectedBestExplanation: correct }, correct ? [] : ['Choose the explanation based on sentence structure, not length or punctuation alone.'],
      { misconceptionEvidence: structuredEvidence(item, correct, selectedTag, selectedTag ? 'strong' : 'moderate') });
  }
  if (item.responseMode === 'classifyReason') {
    const reasonTask = reasonTaskFor(item, answer?.classification);
    const classificationCorrect = Number(answer?.classification) === item.answer;
    const reasonCorrect = Boolean(reasonTask) && Number(answer?.reason) === reasonTask.answer;
    const correct = classificationCorrect && reasonCorrect;
    const selectedTag = reasonTask?.evidenceTags?.[Number(answer?.reason)] || '';
    return result(correct ? 'correct' : 'incorrect', correct ? 'Your decision and supporting reason both match the sentence evidence.' : domain(item.domain).feedback,
      { classificationCorrect, reasonCorrect }, correct ? [] : [
        !classificationCorrect ? 'Reconsider whether the words express a complete thought.' : '',
        !reasonCorrect ? 'Choose a reason based on the subject, main verb, and complete thought.' : ''
      ].filter(Boolean), { misconceptionEvidence: structuredEvidence(item, correct, selectedTag, selectedTag ? 'strong' : 'moderate') });
  }
  if (item.responseMode === 'classifyRepair') {
    const classificationCorrect = Number(answer?.classification) === item.answer;
    const writing = LOCAL_EVALUATOR.evaluateOpenText(item, answer?.text || '');
    if (!classificationCorrect) return result('incorrect', domain(item.domain).feedback,
      { classificationCorrect: false, ...writing.checks }, ['Reconsider whether the original word group is complete or a fragment.', ...writing.reasons],
      { misconceptionEvidence: structuredEvidence(item, false) });
    return { ...writing, checks: { classificationCorrect, ...writing.checks } };
  }
  if (item.responseMode === 'paragraphRepair') {
    const selectedCorrectly = sameNumbers(answer?.selected, targetSentenceIndices(item));
    const writing = LOCAL_EVALUATOR.evaluateOpenText(item, answer?.text || '');
    if (!selectedCorrectly) return {
      ...writing,
      status: 'incorrect', taskCorrect: false, score: 0,
      checks: { ...writing.checks, selectedCorrectly },
      feedback: `Review which sentences are fragments. ${writing.feedback || ''}`.trim(),
      reasons: ['One or more sentence selections need another look.', ...(writing.reasons || [])],
      misconceptionEvidence: [
        ...structuredEvidence(item, false, 'E2_CONTEXT_DEPENDENCE', 'strong'),
        ...(writing.misconceptionEvidence || [])
      ]
    };
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
function focusTagsFromRows(rows, domainId) {
  const totals = new Map();
  rows.filter((row) => row.item.domain === domainId).forEach((row) => {
    (row.evaluation.misconceptionEvidence || []).forEach((entry) => {
      if (!entry.tag || entry.outcome === 'none') return;
      const magnitude = entry.strength === 'strong' ? 2 : entry.strength === 'moderate' ? 1 : 0.5;
      const direction = entry.outcome === 'supports' ? 1 : -1;
      totals.set(entry.tag, (totals.get(entry.tag) || 0) + (magnitude * direction));
    });
  });
  const ranked = [...totals.entries()].filter(([, value]) => value > 0).sort((left, right) => right[1] - left[1]);
  if (ranked.length) return ranked.map(([tag]) => tag);
  return rows.filter((row) => row.item.domain === domainId && row.evaluation.status !== 'correct')
    .map((row) => primaryMisconception(row.item)).filter((tag, index, all) => tag && all.indexOf(tag) === index);
}
function focusTagsForDomain(domainId) {
  const latestAttempt = state.masteryAttempts.at(-1);
  if (latestAttempt?.weakDomainIds?.includes(domainId) && latestAttempt.rows) {
    const masteryTags = focusTagsFromRows(latestAttempt.rows, domainId);
    if (masteryTags.length) return masteryTags;
  }
  return focusTagsFromRows(diagnosticRows(), domainId);
}
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
function nextUnseenItem(domainId, stage, extraExcluded = [], focusTags = []) {
  const excluded = usedItemIds(); extraExcluded.forEach((id) => excluded.add(id));
  const available = itemsFor(stage, domainId).filter((item) => !excluded.has(item.id));
  const targeted = focusTags.length ? available.find((item) => (
    misconceptionTags(item).some((tag) => focusTags.includes(tag))
  )) : null;
  return targeted || available[0]
    || (stage === 'Guided practice' || stage === 'Independent practice' ? itemsFor(stage, domainId)[0] : null);
}
function ensureIntervention(domainId) {
  const round = currentRound();
  const existing = state.interventions[domainId];
  if (existing?.round === round) return existing;
  const selected = [];
  const focusTags = focusTagsForDomain(domainId);
  const steps = ['Guided practice', 'Independent practice', 'Verification'].map((stage) => {
    const item = nextUnseenItem(domainId, stage, selected, focusTags); if (item) selected.push(item.id);
    return { stage, itemId: item?.id || null, answer: null, result: null, attempts: 0, reviewCount: 0,
      fallback: false, fallbackAnswer: null, feedback: '' };
  }).filter((step) => step.itemId);
  state.interventions[domainId] = { round, focusTags, stepIndex: 0, complete: false, unsuccessfulAttempts: 0, steps };
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
  state.masteryItemIds = selected; state.masteryAnswers = {}; state.masteryLocked = {}; state.masteryResults = {}; saveState();
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
  return `${journey()}<div class="hero"><div class="hero-copy"><p class="eyebrow">Sentence Fragment Lab</p><h1>Make every sentence<br/>complete.</h1><p class="subhead">Spot, repair, and prevent sentence fragments through a learning path that responds to your work.</p></div><div class="hero-note"><strong>Your work stays on this device.</strong> No account is required. Progress and report data are stored only in this browser.</div></div><div class="grid-3"><div class="card metric-card"><span class="metric-label">Diagnostic</span><div class="metric-value">${diagnosticScore}</div><div class="metric-detail">${state.diagnosticComplete ? 'Starting point recorded' : 'Not started'}</div></div><div class="card metric-card accent"><span class="metric-label">Targeted skills completed</span><div class="metric-value">${completed}<small> / ${required.length}</small></div><div class="metric-detail">Guided → independent → verification</div></div><div class="card metric-card dark"><span class="metric-label">Mastery</span><div class="metric-value">${masteryScore}</div><div class="metric-detail">${state.masteryComplete ? 'All five skills mastered' : 'Protected final evidence'}</div></div></div><div class="section-head"><div><h2>What happens next?</h2><p>Your next step is based on your saved progress.</p></div></div><div class="overview-grid"><div class="focus-card"><div><p class="eyebrow">${next[0]}</p><h3>${next[1]}</h3><p>${next[2]}</p><button class="button accent" data-action="overview-next" data-view="${next[4]}">${next[3]} <span>→</span></button></div><div class="focus-icon">${state.masteryComplete ? '✓' : '◎'}</div></div><div class="card activity-card"><h3>Recent activity</h3>${recentActivity()}</div></div>`;
}

function choiceControl(choices, selected, field = 'choice', disabled = false) {
  const hasSelection = selected !== null && selected !== undefined && selected !== '';
  return `<div class="choice-list">${choices.map((choice, index) => `<label class="choice ${hasSelection && Number(selected) === index ? 'selected' : ''} ${disabled ? 'locked' : ''}"><input type="radio" name="${field}" data-answer-field="${field}" value="${index}" ${hasSelection && Number(selected) === index ? 'checked' : ''} ${disabled ? 'disabled' : ''}/><span>${esc(choice)}</span></label>`).join('')}</div>`;
}
function questionPrompt(item, override = '') {
  const raw = String(override || item.displayPrompt || '').trim();
  const parts = raw.split(/\n\s*\n/);
  const instruction = parts.shift() || '';
  const stimulus = parts.join('\n\n').trim();
  return `<div class="question-prompt">${esc(instruction)}</div>${stimulus ? `<div class="question-stimulus">${esc(stimulus)}</div>` : ''}`;
}
function responseControl(item, answer, locked = false) {
  if (item.responseMode === 'choice') return choiceControl(item.choices, answer, 'choice', locked);
  if (item.responseMode === 'reasonChoice') return `<fieldset class="response-group" ${locked ? 'disabled' : ''}><legend>Choose the best explanation.</legend>${choiceControl(item.reasonTask.choices, answer, 'reason', locked)}</fieldset>`;
  if (item.responseMode === 'classifyReason') {
    const classificationSelected = answer?.classification !== undefined && answer?.classification !== null;
    const reasonTask = classificationSelected ? reasonTaskFor(item, answer.classification) : null;
    const reasonStep = reasonTask
      ? `<fieldset class="response-group" ${locked ? 'disabled' : ''}><legend>2. Why is it a ${Number(answer.classification) === 0 ? 'complete sentence' : 'fragment'}?</legend>${choiceControl(reasonTask.choices, answer?.reason, 'reason', locked)}</fieldset>`
      : '<div class="reason-gate" role="status">Select “Complete sentence” or “Fragment” to see the explanation choices.</div>';
    return `<fieldset class="response-group" ${locked ? 'disabled' : ''}><legend>1. Is this a complete sentence or a fragment?</legend>${choiceControl(item.choices, answer?.classification, 'classification', locked)}</fieldset>${reasonStep}`;
  }
  if (item.responseMode === 'classifyRepair') return `<fieldset class="response-group" ${locked ? 'disabled' : ''}><legend>1. Decide whether the words form a complete sentence.</legend>${choiceControl(item.choices, answer?.classification, 'classification', locked)}</fieldset><label class="response-label" for="repair-response">2. If it is a fragment, revise it into a complete sentence.</label><textarea id="repair-response" class="constructed-response" data-answer-field="text" placeholder="Type your revision…" ${locked ? 'disabled' : ''}>${esc(answer?.text || '')}</textarea>`;
  if (item.responseMode === 'paragraphRepair') {
    const selected = answer?.selected || [];
    return `<div class="context-copy">${esc(item.paragraph)}</div><fieldset class="response-group fragment-picker" ${locked ? 'disabled' : ''}><legend>1. Select every sentence fragment.</legend>${paragraphSentences(item).map((sentence, index) => `<button type="button" class="sentence-option ${selected.includes(index) ? 'selected' : ''}" data-action="toggle-sentence" data-sentence-index="${index}" aria-pressed="${selected.includes(index)}" ${locked ? 'disabled' : ''}><span>${selected.includes(index) ? '✓' : index + 1}</span>${esc(sentence)}</button>`).join('')}</fieldset><label class="response-label" for="paragraph-response">2. Revise the paragraph so each sentence is complete. Keep the original meaning.</label><textarea id="paragraph-response" class="constructed-response paragraph-response" data-answer-field="text" placeholder="Type your revised paragraph…" ${locked ? 'disabled' : ''}>${esc(answer?.text || '')}</textarea>`;
  }
  return `<p class="response-hint">Write a complete revision. Keep the original action and key details.</p><textarea class="constructed-response" data-answer-field="text" placeholder="Type your response…" ${locked ? 'disabled' : ''}>${esc(answer || '')}</textarea>`;
}

function assessmentView(kind) {
  const isMastery = kind === 'mastery';
  const reviewMode = kind === 'diagnostic' && state.diagnosticComplete;
  if (isMastery && !state.masteryItemIds.length) {
    const weakIds = state.masteryLoops.length ? state.masteryLoops[state.masteryLoops.length - 1].weakDomainIds : DOMAINS.map((skill) => skill.id);
    prepareMasterySet(weakIds);
  }
  const items = assessmentItems(kind);
  if (!items.length) return `${journey()}<div class="empty-state"><h2>No unseen mastery items remain.</h2><p>The protected item pool for the skills needing reassessment has been exhausted. Ask the instructor to review prerequisite skills or provide a new assessment form.</p><button class="button secondary" data-view="practice">Return to learning studio</button></div>`;
  currentQuestion = Math.min(currentQuestion, items.length - 1);
  const answers = answersFor(kind); const item = items[currentQuestion];
  const lockedAnswers = state[`${kind}Locked`] || {};
  const locked = reviewMode || Boolean(lockedAnswers[item.id]);
  const currentComplete = answerComplete(item, answers[item.id]);
  const answered = items.filter((question) => answerComplete(question, answers[question.id])).length;
  const label = reviewMode ? 'Diagnostic review' : isMastery && state.masteryLoops.length ? 'Mastery reassessment' : isMastery ? 'Mastery assessment' : 'Diagnostic assessment';
  const intro = reviewMode ? 'Review your saved responses and feedback. Your completed diagnostic answers cannot be changed.'
    : isMastery ? `This protected check measures the skills that still need mastery evidence. A skill is mastered at ${MASTERY_THRESHOLD}% or higher.`
      : 'Use your best judgment. The diagnostic chooses your learning path and does not count as mastery.';
  const savedEvaluation = kind === 'diagnostic' && locked
    ? (state.diagnosticResults[item.id] || compactEvaluation(evaluateAnswer(item, answers[item.id]))) : null;
  const savedMessage = locked
    ? (kind === 'diagnostic' ? diagnosticFeedbackBox(item, savedEvaluation)
      : '<div class="saved-answer-note" role="status"><strong>Answer saved.</strong> You may review this response, but it cannot be changed.</div>')
    : '';
  const nextLabel = locked ? 'Next' : (kind === 'diagnostic' ? 'Save & review' : 'Save & next');
  const finalLabel = isMastery ? 'Finish mastery check' : (locked ? 'See my learning path' : 'Save & review');
  const finalControl = reviewMode
    ? `<button class="button" data-view="${activePhase()}">Return to learning path →</button>`
    : `<button class="button accent" data-action="finish-assessment" data-kind="${kind}" ${currentComplete ? '' : 'disabled'}>${finalLabel} →</button>`;
  return `${journey()}<div class="view-header"><div><p class="eyebrow">${label}</p><h1>${reviewMode ? 'Review your starting point.' : isMastery ? 'Show what you know.' : 'Find your starting point.'}</h1><p class="subhead">${intro}</p></div><span class="pill ${isMastery ? 'accent' : ''}">${reviewMode ? 'Completed · ' : ''}${items.length} tasks${reviewMode ? '' : ' · untimed'}</span></div><div class="assessment-layout"><aside class="question-list"><h3>${reviewMode ? 'Your responses' : 'Your progress'}</h3>${items.map((question, index) => {
    const complete = answerComplete(question, answers[question.id]);
    const saved = reviewMode || Boolean(lockedAnswers[question.id]);
    return `<button class="q-nav ${index === currentQuestion ? 'active' : ''} ${complete ? 'answered' : ''}" data-q="${index}"><b>${complete ? '✓' : String(index + 1).padStart(2, '0')}</b><span>${esc(domain(question.domain).name)}<small>${saved ? 'Saved · locked' : complete ? 'Answered · not saved' : 'Not answered'}</small></span></button>`;
  }).join('')}</aside><section class="question-card">${questionPrompt(item)}${responseControl(item, answers[item.id], locked)}${savedMessage}<div class="question-footer"><small>${answered} of ${items.length} answered</small><div class="button-row no-margin"><button class="button secondary" data-action="previous" ${currentQuestion === 0 ? 'disabled' : ''}>← Back</button>${currentQuestion < items.length - 1 ? `<button class="button" data-action="next" ${currentComplete ? '' : 'disabled'}>${nextLabel} →</button>` : finalControl}</div></div></section></div>`;
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

function assignmentEvidence(ids) {
  const latestAttempt = state.masteryAttempts.at(-1);
  const useMastery = currentRound() > 1 && latestAttempt?.rows?.length;
  const rows = useMastery ? latestAttempt.rows : diagnosticRows();
  return {
    source: useMastery ? 'latest mastery check' : 'diagnostic',
    rows: rows.filter((row) => ids.includes(row.item.domain) && row.evaluation.status !== 'correct')
  };
}

function assignmentReviewPrompt(item) {
  if (item.responseMode === 'paragraphRepair') {
    return `<p class="assignment-instruction">Find and repair the fragments in this paragraph.</p><div class="assignment-stimulus paragraph">${esc(item.paragraph)}</div>`;
  }
  const parts = String(item.displayPrompt || item.prompt || '').trim().split(/\n\s*\n/);
  const instruction = parts.shift() || '';
  const stimulus = parts.join('\n\n').trim();
  return `<p class="assignment-instruction">${esc(instruction)}</p>${stimulus ? `<div class="assignment-stimulus">${esc(stimulus)}</div>` : ''}`;
}

function assignmentDashboard(ids) {
  const evidence = assignmentEvidence(ids);
  if (!evidence.rows.length) return '';
  const skillCount = new Set(evidence.rows.map((row) => row.item.domain)).size;
  const cards = evidence.rows.map((row, index) => {
    const { item, answer, evaluation } = row;
    const expected = diagnosticExpectedEvidence(item) || item.evaluation?.sampleRepair || item.repair || '';
    const details = [...new Set([...(evaluation.reasons || []),
      ...(evaluation.responseIssues || []).map((entry) => entry?.message || entry),
      ...(evaluation.advisories || []).map((entry) => entry?.message || entry)]
      .map((entry) => String(entry || '').trim()).filter(Boolean))];
    const supportedTags = [...new Set((evaluation.misconceptionEvidence || [])
      .filter((entry) => entry.outcome === 'supports').map((entry) => entry.tag).filter(Boolean))];
    if (!supportedTags.length) supportedTags.push(primaryMisconception(item));
    const guidance = supportedTags.map((tag) => MISCONCEPTION_GUIDANCE[tag]).filter(Boolean);
    const stimulus = item.responseMode === 'paragraphRepair' ? item.paragraph
      : String(item.displayPrompt || item.prompt || '').split(/\n\s*\n/).slice(1).join(' ').trim();
    const summary = stimulus || domain(item.domain).name;
    return `<details class="assignment-review-card" ${index === 0 ? 'open' : ''}><summary><span><b>Skill ${item.domain.toUpperCase()} · ${esc(domain(item.domain).name)}</b><small>${esc(summary)}</small></span><em>${evaluation.status === 'needsReview' ? 'Needs review' : 'Incorrect'}</em></summary><div class="assignment-review-body">${assignmentReviewPrompt(item)}<div class="assignment-answer-grid"><div><strong>Your saved response</strong><p>${esc(reportAnswer(item, answer))}</p></div>${expected ? `<div><strong>Evidence to compare</strong><p>${esc(expected)}</p></div>` : ''}</div><div class="assignment-feedback"><strong>Why this needs practice</strong><p>${esc(evaluation.feedback || domain(item.domain).feedback)}</p>${details.length ? `<ul>${details.map((detail) => `<li>${esc(detail)}</li>`).join('')}</ul>` : ''}</div>${guidance.map((entry) => `<div class="assignment-study-focus"><strong>${esc(entry.label)}</strong><p>${esc(entry.lesson)}</p><span>Try this: ${esc(entry.tip)}</span></div>`).join('')}</div></details>`;
  }).join('');
  return `<section class="assignment-dashboard"><div class="assignment-dashboard-head"><div><p class="eyebrow">Your saved evidence</p><h2>Why this practice was assigned</h2><p>These ${esc(evidence.source)} responses identified the skills to review before the mastery assessment. Open each item to compare your response with the sentence evidence and study guidance.</p></div><div class="assignment-dashboard-stats"><span><b>${evidence.rows.length}</b> response${evidence.rows.length === 1 ? '' : 's'} to review</span><span><b>${skillCount}</b> skill${skillCount === 1 ? '' : 's'} identified</span></div></div><div class="assignment-review-list">${cards}</div></section>`;
}

function practiceView() {
  const ids = requiredPracticeIds();
  if (!ids.length) return `${journey()}<div class="view-header"><div><p class="eyebrow">Targeted learning</p><h1>No required practice right now.</h1><p class="subhead">Your diagnostic evidence did not identify a skill below the practice threshold. Diagnostic success does not count as mastery, so your protected mastery check is next.</p></div></div><div class="focus-card"><div><p class="eyebrow">Ready for mastery</p><h3>Continue to the protected assessment.</h3><p>The mastery items have not appeared in diagnostic or practice.</p><button class="button accent" data-action="start-mastery">Begin mastery check →</button></div><div class="focus-icon">✓</div></div>`;
  const selectedId = ids.includes(practiceDomain) ? practiceDomain : ids[0]; practiceDomain = selectedId;
  const selected = domain(selectedId); const intervention = ensureIntervention(selectedId);
  const focusTag = intervention.focusTags?.[0] || '';
  const guidance = MISCONCEPTION_GUIDANCE[focusTag] || { label: selected.name, lesson: selected.lesson, tip: selected.tip };
  const completeCount = ids.filter((id) => state.interventions[id]?.complete && state.interventions[id]?.round === currentRound()).length;
  const dashboard = assignmentDashboard(ids);
  if (intervention.complete) {
    const allComplete = practiceComplete();
    return `${journey()}<div class="view-header"><div><p class="eyebrow">Targeted learning · Round ${currentRound()}</p><h1>Your learning studio.</h1><p class="subhead">Complete each assigned skill through guided practice, independent practice, and verification.</p></div><span class="pill">${completeCount} of ${ids.length} skills complete</span></div>${dashboard}${practiceDomainList(ids, selectedId)}<div class="focus-card learning-complete"><div><p class="eyebrow">Skill ${selectedId.toUpperCase()} complete</p><h3>${esc(selected.name)} verified.</h3><p>Your fresh verification response met the skill requirement.</p>${allComplete ? '<button class="button accent" data-action="start-mastery">Begin mastery check →</button>' : '<p>Choose the next assigned skill above.</p>'}</div><div class="focus-icon">✓</div></div>`;
  }
  const step = intervention.steps[intervention.stepIndex];
  if (!step) return `${journey()}<div class="empty-state"><h2>This skill needs instructor review.</h2><p>No unused item is available for the next learning stage.</p></div>`;
  const item = BANK_BY_ID[step.itemId]; const fallback = step.fallback ? fallbackRepair(item) : null;
  return `${journey()}<div class="view-header"><div><p class="eyebrow">Targeted learning · Round ${currentRound()}</p><h1>Your learning studio.</h1><p class="subhead">Practice is organized by the same five course skills. Only skills identified by your diagnostic or latest mastery check are assigned.</p></div><span class="pill">${completeCount} of ${ids.length} skills complete</span></div>${dashboard}${practiceDomainList(ids, selectedId)}<div class="stage-progress">${intervention.steps.map((practiceStep, index) => `<span class="${index < intervention.stepIndex ? 'complete' : index === intervention.stepIndex ? 'current' : ''}">${index < intervention.stepIndex ? '✓' : index + 1} ${stageName(practiceStep.stage)}</span>`).join('')}</div><div class="practice-grid"><article class="lesson-card"><p class="eyebrow">Mini lesson · Skill ${selectedId.toUpperCase()}</p><h2>${esc(guidance.label)}</h2><p>${esc(guidance.lesson)}</p><div class="plain-language-tip"><strong>Try this check</strong>${esc(guidance.tip)}</div><ul><li>Read the entire word group.</li><li>Find who or what it is about.</li><li>Find the main verb and decide whether the thought can stand alone.</li></ul></article><article class="practice-question"><p class="eyebrow">${esc(stageName(step.stage))} task</p>${questionPrompt(item, step.fallback ? 'Choose the revision that best completes the thought.' : '')}${step.fallback ? choiceControl(fallback.choices, step.fallbackAnswer, 'fallback') : responseControl(item, step.answer)}<div id="practice-feedback">${step.feedback ? feedbackBox(step.result, step.feedback) : ''}</div><div class="button-row"><button class="button accent" data-action="check-practice">Check my work →</button></div></article></div>`;
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

function diagnosticExpectedEvidence(item) {
  if (item.responseMode === 'choice') return item.choices[item.answer] || '';
  if (item.responseMode === 'reasonChoice') return item.reasonTask?.choices[item.reasonTask.answer] || '';
  if (item.responseMode === 'classifyReason') {
    const reasonTask = reasonTaskFor(item, item.answer);
    return `${item.choices[item.answer]}. ${reasonTask?.choices[reasonTask.answer] || ''}`.trim();
  }
  return '';
}

function diagnosticFeedbackBox(item, evaluation) {
  if (!evaluation) return '';
  const status = evaluation.status || 'incorrect';
  const heading = status === 'correct' ? 'Your response is correct'
    : status === 'needsReview' ? 'Review this before continuing' : 'Use this feedback before continuing';
  const rawDetails = [
    ...(evaluation.reasons || []),
    ...(evaluation.responseIssues || []).map((entry) => entry?.message || entry),
    ...(evaluation.advisories || []).map((entry) => entry?.message || entry)
  ].map((entry) => String(entry || '').trim()).filter(Boolean);
  const details = [...new Set(rawDetails)].filter((entry) => entry !== evaluation.feedback);
  const expected = status === 'correct' ? '' : diagnosticExpectedEvidence(item);
  const focusTags = [...new Set((evaluation.misconceptionEvidence || [])
    .filter((entry) => entry.outcome === 'supports').map((entry) => entry.tag).filter(Boolean))];
  const learningFocus = focusTags.map((tag) => MISCONCEPTION_GUIDANCE[tag]).filter(Boolean)
    .map((guidance) => `<div class="diagnostic-learning-focus"><strong>${esc(guidance.label)}</strong><p>${esc(guidance.lesson)}</p><span>Try this: ${esc(guidance.tip)}</span></div>`).join('');
  let paragraphReview = '';
  if (item.responseMode === 'paragraphRepair') {
    const targets = targetSentenceIndices(item).map((index) => `${index + 1}. ${paragraphSentences(item)[index]}`);
    const selectionMessage = evaluation.checks?.selectedCorrectly
      ? 'You identified all of the sentence fragments.'
      : `The sentence fragments were: ${targets.join(' ')}`;
    paragraphReview = `<p><strong>Fragment selection</strong>${esc(selectionMessage)}</p>${status === 'correct' || !item.repair ? '' : `<details><summary>View one acceptable paragraph repair</summary><p>${esc(item.repair)}</p></details>`}`;
  }
  return `<section class="diagnostic-feedback ${status}" role="status" aria-live="polite"><h3>${heading}</h3><p>${esc(evaluation.feedback || domain(item.domain).feedback)}</p>${paragraphReview}${expected ? `<p><strong>Correct response</strong>${esc(expected)}</p>` : ''}${learningFocus}${details.length ? `<div class="feedback-details"><strong>Details to review</strong><ul>${details.map((detail) => `<li>${esc(detail)}</li>`).join('')}</ul></div>` : ''}<small>Your answer is saved and cannot be changed. Use this feedback in the learning studio.</small></section>`;
}
function compactEvaluation(evaluation) {
  return { status: evaluation.status, taskCorrect: Boolean(evaluation.taskCorrect), score: evaluation.score,
    evaluatorVersion: evaluation.evaluatorVersion,
    confidence: evaluation.confidence || 'high', family: evaluation.family || null,
    repairStrategy: evaluation.repairStrategy || null,
    sentenceComplete: Boolean(evaluation.sentenceComplete),
    meaningPreserved: Boolean(evaluation.meaningPreserved),
    target: evaluation.target || null, quality: evaluation.quality || null,
    checks: evaluation.checks, misconceptionEvidence: evaluation.misconceptionEvidence || [],
    responseIssues: evaluation.responseIssues || [], advisories: evaluation.advisories || [],
    reasons: evaluation.reasons, feedback: evaluation.feedback };
}

function reportAnswer(item, answer) {
  if (answer === undefined || answer === null || answer === '') return 'Not answered';
  if (item.responseMode === 'choice') return item.choices[Number(answer)] || `Option ${Number(answer) + 1}`;
  if (item.responseMode === 'reasonChoice') return item.reasonTask.choices[Number(answer)] || 'Explanation selected';
  if (item.responseMode === 'classifyReason') {
    const reasonTask = reasonTaskFor(item, answer.classification);
    return `${item.choices[Number(answer.classification)] || 'No decision'} — ${reasonTask?.choices[Number(answer.reason)] || 'No reason'}`;
  }
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
    return { item, kind, get locked() { return (kind === 'diagnostic' && state.diagnosticComplete) || Boolean(state[`${kind}Locked`]?.[item.id]); },
      get answer() { return state[`${kind}Answers`][item.id]; }, set answer(value) { state[`${kind}Answers`][item.id] = value; } };
  }
  if (state.view === 'practice') {
    const intervention = ensureIntervention(practiceDomain); const step = intervention.steps[intervention.stepIndex];
    return { item: BANK_BY_ID[step.itemId], get answer() { return step.answer; }, set answer(value) { step.answer = value; }, step };
  }
  return null;
}
function updateResponse(field, value) {
  const context = currentResponseContext(); if (!context) return; const mode = context.item.responseMode;
  if (context.locked) return showToast('This assessment answer has already been saved and cannot be changed.');
  if (mode === 'choice' || mode === 'reasonChoice' || mode === 'text') context.answer = value;
  else if (mode === 'classifyReason' && field === 'classification') {
    const previous = context.answer || {};
    context.answer = Number(previous.classification) === Number(value) ? previous : { classification: value };
  } else context.answer = { ...(context.answer || {}), [field]: value };
  saveState();
}

function saveCurrentAssessmentAnswer() {
  if (state.view !== 'diagnostic' && state.view !== 'mastery') return true;
  const kind = state.view; const item = assessmentItems(kind)[currentQuestion]; const answer = answersFor(kind)[item.id];
  if (!answerComplete(item, answer)) {
    showToast(item.responseMode === 'classifyReason'
      ? 'Complete both steps before saving this answer.' : 'Complete this task before saving your answer.');
    return false;
  }
  if (state[`${kind}Locked`]?.[item.id]) return true;
  state[`${kind}Locked`] = { ...(state[`${kind}Locked`] || {}), [item.id]: true };
  if (kind === 'diagnostic') {
    state.diagnosticResults = {
      ...(state.diagnosticResults || {}),
      [item.id]: compactEvaluation(evaluateAnswer(item, answer))
    };
  }
  saveState(); return true;
}

function finishAssessment(event) {
  const kind = event.currentTarget.dataset.kind; const items = assessmentItems(kind); const answers = answersFor(kind);
  if (kind === 'diagnostic') {
    const item = items[currentQuestion];
    if (!state.diagnosticLocked?.[item.id]) {
      if (saveCurrentAssessmentAnswer()) render();
      return;
    }
    const unsavedIndex = items.findIndex((candidate) => !state.diagnosticLocked?.[candidate.id]);
    if (unsavedIndex !== -1) {
      currentQuestion = unsavedIndex; render();
      showToast('Save and review each diagnostic response before continuing.'); return;
    }
  }
  if (items.some((item) => !answerComplete(item, answers[item.id]))) return showToast(`Complete all ${items.length} tasks before finishing.`);
  state[`${kind}Locked`] = Object.fromEntries(items.map((item) => [item.id, true]));
  saveState();
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
      delete state.masteryLocked[replacement.oldId];
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
  state.masteryItemIds = []; state.masteryAnswers = {}; state.masteryLocked = {};
  record('reassessment', `Mastery attempt ${attemptNumber} → targeted relearning`, { attempt: attemptNumber, loop, score, weakDomainIds });
  state.view = 'practice'; currentQuestion = 0; practiceDomain = weakDomainIds[0]; render();
  showToast('A new learning round is ready for the skills needing attention.');
}

function completePracticeStep(intervention, step, item, evaluation, viaFallback = false) {
  step.result = compactEvaluation(evaluation); step.feedback = evaluation.feedback;
  record('intervention', `${stageName(step.stage)} completed: ${item.id}`, { round: intervention.round, domainId: item.domain,
    domain: domain(item.domain).name, focusTags: intervention.focusTags || [], stage: step.stage, pool: item.pool, itemId: item.id,
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
      { structuredFallbackCorrect: correct }, correct ? [] : [domain(item.domain).feedback],
      { misconceptionEvidence: structuredEvidence(item, correct, intervention.focusTags?.[0] || '', 'strong') });
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
      const alternate = nextUnseenItem(item.domain, 'Verification', intervention.steps.map((entry) => entry.itemId), intervention.focusTags || []);
      if (alternate) {
        const oldId = step.itemId; step.itemId = alternate.id; step.answer = null; step.result = null; step.feedback = '';
        record('alternate', `Verification item ${oldId} replaced with unseen item ${alternate.id}`, { domainId: item.domain, oldId, newId: alternate.id });
        render(); showToast('An unseen verification task is ready.'); return;
      }
      step.fallback = true; step.fallbackAnswer = null;
      step.feedback = 'Choose the best revision so the skill can be confirmed without relying on the open-text checker.';
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
    const context = currentResponseContext(); if (context.locked) return showToast('This assessment answer has already been saved and cannot be changed.');
    const index = Number(button.dataset.sentenceIndex); const selected = new Set(context.answer?.selected || []);
    if (selected.has(index)) selected.delete(index); else selected.add(index);
    context.answer = { ...(context.answer || {}), selected: [...selected].sort((a, b) => a - b) }; saveState(); render();
  }));
  document.querySelector('[data-action="next"]')?.addEventListener('click', () => {
    const context = currentResponseContext(); const wasLocked = Boolean(context?.locked);
    if (!saveCurrentAssessmentAnswer()) return;
    if (state.view === 'diagnostic' && !wasLocked) { render(); return; }
    currentQuestion = Math.min(currentQuestion + 1, assessmentItems(state.view).length - 1); render();
  });
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
  reasonTaskFor, responseControl, getState: () => structuredClone(state), bank: BANK_ALL, domains: DOMAINS,
  masteryThreshold: MASTERY_THRESHOLD };
render();
