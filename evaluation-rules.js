/*
 * Machine-readable contracts for locally scored writing tasks.
 *
 * The item bank remains the authoring source. These contracts make the
 * requested repair, protected meaning, and misconception evidence explicit
 * enough for a cautious browser-only evaluator.
 */
(function buildEvaluationRules() {
  const bank = window.QUESTION_BANK;
  const connectorWords = [
    'even though', 'although', 'because', 'unless', 'whenever', 'whereas',
    'while', 'when', 'if', 'since', 'though', 'until', 'after', 'before',
    'once', 'as', 'which', 'who', 'whose', 'that'
  ];

  // These are deliberately small, classroom-appropriate synonym groups. They
  // are copied onto each applicable item below so acceptance stays explicit,
  // deterministic, and reviewable by an instructor.
  const synonymGroups = [
    { canonical: 'change', category: 'verb', words: ['change', 'changed', 'changing', 'changes', 'alter', 'altered', 'altering', 'modify', 'modified', 'modifying', 'revise', 'revised', 'revising', 'adjust', 'adjusted', 'adjusting'] },
    { canonical: 'begin', category: 'verb', words: ['begin', 'began', 'begun', 'start', 'started', 'starting'] },
    { canonical: 'end', category: 'verb', words: ['end', 'ended', 'finish', 'finished', 'complete', 'completed'] },
    { canonical: 'help', category: 'verb', words: ['help', 'helped', 'assist', 'assisted', 'support', 'supported'] },
    { canonical: 'show', category: 'verb', words: ['show', 'showed', 'shown', 'display', 'displayed', 'demonstrate', 'demonstrated'] },
    { canonical: 'use', category: 'verb', words: ['use', 'used', 'using', 'apply', 'applied', 'employ', 'employed'] },
    { canonical: 'make', category: 'verb', words: ['make', 'made', 'create', 'created', 'produce', 'produced'] },
    { canonical: 'keep', category: 'verb', words: ['keep', 'kept', 'retain', 'retained', 'preserve', 'preserved'] },
    { canonical: 'look', category: 'verb', words: ['look', 'looked', 'examine', 'examined', 'inspect', 'inspected'] },
    { canonical: 'move', category: 'verb', words: ['move', 'moved', 'moving', 'shift', 'shifted', 'transfer', 'transferred'] },
    { canonical: 'need', category: 'verb', words: ['need', 'needed', 'require', 'required'] },
    { canonical: 'say', category: 'verb', words: ['say', 'said', 'state', 'stated', 'mention', 'mentioned'] },
    { canonical: 'ask', category: 'verb', words: ['ask', 'asked', 'question', 'questioned', 'request', 'requested'] },
    { canonical: 'write', category: 'verb', words: ['write', 'wrote', 'written', 'compose', 'composed', 'draft', 'drafted'] },
    { canonical: 'teacher', category: 'person', words: ['teacher', 'instructor', 'professor', 'lecturer'] },
    { canonical: 'student', category: 'person', words: ['student', 'students', 'learner', 'learners', 'classmate', 'classmates'] },
    { canonical: 'group', category: 'person', words: ['group', 'team', 'class', 'committee'] },
    { canonical: 'friend', category: 'person', words: ['friend', 'partner', 'roommate', 'peer'] },
    { canonical: 'schedule', category: 'noun', words: ['schedule', 'timetable', 'calendar', 'plan'] },
    { canonical: 'assignment', category: 'noun', words: ['assignment', 'project', 'task', 'paper'] },
    { canonical: 'answer', category: 'noun', words: ['answer', 'response', 'reply'] },
    { canonical: 'idea', category: 'noun', words: ['idea', 'point', 'thought', 'claim'] },
    { canonical: 'problem', category: 'noun', words: ['problem', 'issue', 'difficulty', 'challenge'] },
    { canonical: 'important', category: 'adjective', words: ['important', 'significant', 'essential', 'valuable'] },
    { canonical: 'clear', category: 'adjective', words: ['clear', 'understandable', 'obvious', 'plain'] },
    { canonical: 'quick', category: 'adjective', words: ['quick', 'fast', 'rapid', 'prompt'] },
    { canonical: 'small', category: 'adjective', words: ['small', 'little', 'minor', 'limited'] },
    { canonical: 'large', category: 'adjective', words: ['large', 'big', 'major', 'substantial'] },
    { canonical: 'often', category: 'adverb', words: ['often', 'frequently', 'regularly'] },
    { canonical: 'quickly', category: 'adverb', words: ['quickly', 'rapidly', 'promptly', 'swiftly'] },
    { canonical: 'finally', category: 'adverb', words: ['finally', 'eventually', 'ultimately'] }
  ];
  const personTerms = new Set([
    'person', 'people', 'student', 'students', 'teacher', 'instructor', 'professor',
    'lecturer', 'classmate', 'classmates', 'partner', 'roommate', 'friend',
    'group', 'team', 'class', 'committee', 'instructor'
  ]);
  const animalTerms = new Set(['animal', 'dog', 'cat', 'bird', 'horse', 'puppy', 'kitten', 'pet']);
  const commonNames = new Set([
    'alex', 'avery', 'ben', 'caleb', 'darius', 'evan', 'jordan', 'keisha', 'leah',
    'lena', 'maya', 'mina', 'noah', 'nora', 'owen', 'priya', 'sofia', 'tyler'
  ]);

  const familyDefaults = {
    repairMissingSubject: {
      targetTag: 'B1_MISSING_SUBJECT',
      requiredChecks: [
        'nonEmpty', 'onTask', 'sourceMeaningPreserved', 'targetMet',
        'hasIndependentClause', 'grammarAcceptable', 'responseContractMet'
      ]
    },
    repairMissingPredicate: {
      targetTag: 'B2_MISSING_PREDICATE',
      requiredChecks: [
        'nonEmpty', 'onTask', 'sourceMeaningPreserved', 'targetMet',
        'hasIndependentClause', 'grammarAcceptable', 'responseContractMet'
      ]
    },
    attachDependentClause: {
      targetTag: 'C2_SUBORDINATOR_UNRECOGNIZED',
      requiredChecks: [
        'nonEmpty', 'onTask', 'sourceMeaningPreserved', 'targetMet',
        'dependentWordsAttached', 'hasIndependentClause',
        'grammarAcceptable', 'responseContractMet'
      ]
    },
    integratePhraseFragment: {
      targetTag: 'D3_DESCRIPTIVE_DETAIL_COMPLETE',
      requiredChecks: [
        'nonEmpty', 'onTask', 'sourceMeaningPreserved', 'targetMet',
        'phraseAttached', 'hasIndependentClause',
        'grammarAcceptable', 'responseContractMet'
      ]
    },
    writeWithConnector: {
      targetTag: 'C3_DELETE_SUBORDINATOR_ONLY',
      requiredChecks: [
        'nonEmpty', 'onTask', 'usesRequestedWord', 'targetMet',
        'dependentWordsAttached', 'hasIndependentClause',
        'grammarAcceptable', 'responseContractMet'
      ]
    },
    paragraphRepair: {
      targetTag: 'E2_CONTEXT_DEPENDENCE',
      requiredChecks: [
        'nonEmpty', 'onTask', 'sourceMeaningPreserved', 'allTargetsAddressed',
        'targetMet', 'allSentencesComplete', 'grammarAcceptable',
        'responseContractMet'
      ]
    },
    genericRepair: {
      targetTag: '',
      requiredChecks: ['nonEmpty', 'onTask', 'sourceMeaningPreserved']
    }
  };

  function rowsToObjects(columns, rows) {
    return rows.map((row) => Object.fromEntries(
      columns.map((column, index) => [column, row[index] || ''])
    ));
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sourceFromPrompt(prompt) {
    const value = String(prompt || '').trim();
    const blocks = value.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    if (blocks.length > 1) return blocks[blocks.length - 1];

    const quoted = [...value.matchAll(/[“"]([^”"]{4,})[”"]/g)];
    if (quoted.length) return quoted[quoted.length - 1][1];

    const colonIndex = value.lastIndexOf(':');
    if (colonIndex >= 0 && colonIndex < value.length - 3) {
      return value.slice(colonIndex + 1).trim();
    }

    if (/^(repair|revise|complete|add|combine|attach|integrate|use)/i.test(value)) {
      return value.replace(/^[^:]+:\s*/i, '').trim();
    }

    return value;
  }

  function requestedConnector(prompt) {
    const lower = normalize(prompt).toLowerCase();
    return connectorWords.find((word) => (
      new RegExp(`\\b${word.replace(' ', '\\s+')}\\b`).test(lower)
    )) || '';
  }

  function parseTags(value) {
    return String(value || '').split(/\s*;\s*/).map((tag) => tag.trim()).filter(Boolean);
  }

  function simpleWord(value) {
    return String(value || '').toLowerCase().replace(/[^a-z'-]/g, '');
  }

  function groupFor(word) {
    const value = simpleWord(word);
    return synonymGroups.find((group) => group.words.includes(value)) || null;
  }

  function sourcePreservationMetadata(sourceText) {
    const words = String(sourceText || '').match(/[A-Za-z']+/g) || [];
    const seen = new Set();
    const preserveAlternatives = [];
    const preservePronouns = [];
    words.forEach((word) => {
      const lower = simpleWord(word);
      const group = groupFor(lower);
      if (group && !seen.has(group.canonical)) {
        seen.add(group.canonical);
        preserveAlternatives.push({
          source: group.canonical,
          sourceWord: lower,
          category: group.category,
          alternatives: group.words.filter((candidate) => candidate !== lower
            && !candidate.startsWith(`${group.canonical}s`)
            && !candidate.startsWith(`${group.canonical}e`)
            && !candidate.startsWith(`${group.canonical}ing`)).slice(0, 3)
        });
      }
      const isName = commonNames.has(lower);
      if ((personTerms.has(lower) || animalTerms.has(lower) || isName) && !preservePronouns.some((entry) => entry.source === lower)) {
        const plural = /s$/.test(lower) && !/ss$/.test(lower);
        preservePronouns.push({
          source: lower,
          category: animalTerms.has(lower) ? 'animal' : 'person',
          alternatives: plural
            ? ['they', 'them', 'their']
            : animalTerms.has(lower)
              ? ['he', 'she', 'they', 'it', 'him', 'her', 'their', 'its']
              : ['he', 'she', 'they', 'him', 'her', 'their']
        });
      }
    });
    return { preserveAlternatives, preservePronouns };
  }

  function familyStarts(familyName, letter) {
    return new RegExp(`^${letter}(?:\\d|\\b)`, 'i').test(String(familyName || '').trim());
  }

  function ruleKind(item) {
    const rubric = String(item['Answer / Rubric'] || '').toLowerCase();
    const familyName = String(item.Family || '').toLowerCase();
    const evidence = `${familyName} ${item['Misconception Tags'] || ''}`.toLowerCase();
    const prompt = String(item.Prompt || '').toLowerCase();
    const skill = String(item.Skill || '').toLowerCase();

    if (/write (one |a )?complete sentence|write a sentence|use (the word|one of)|beginning with/.test(prompt)) {
      return familyStarts(familyName, 'c') || /^c\s*-/.test(skill)
        ? 'writeWithConnector'
        : 'integratePhraseFragment';
    }
    if (/missing subject|add(?:ing)? (an appropriate |a )?(grammatical )?subject|supply an appropriate subject/.test(rubric)) {
      return 'repairMissingSubject';
    }
    if (/missing predicate|add(?:ing)? (a )?(complete |finite |main )?(verb|predicate)|supply a complete predicate/.test(rubric)) {
      return 'repairMissingPredicate';
    }
    if (/smallest reasonable change/.test(prompt) && /subject/.test(rubric)) return 'repairMissingSubject';
    if (/smallest reasonable change/.test(prompt) && /(predicate|main verb)/.test(rubric)) return 'repairMissingPredicate';
    if (/b1_/.test(evidence) && !/b2_/.test(evidence)) return 'repairMissingSubject';
    if (/b2_/.test(evidence) && !/b1_/.test(evidence)) return 'repairMissingPredicate';
    if (familyStarts(familyName, 'c') || /^c\s*-/.test(skill)) return 'attachDependentClause';
    if (familyStarts(familyName, 'd') || /^d\s*-/.test(skill)) return 'integratePhraseFragment';
    return 'genericRepair';
  }

  function quotedExample(rubric) {
    const matches = [...String(rubric || '').matchAll(/[“"]([^”"]{8,})[”"]/g)];
    return matches.length ? matches[matches.length - 1][1] : '';
  }

  function targetTagFor(kind, tags) {
    const preferred = {
      repairMissingSubject: ['B1_MISSING_SUBJECT'],
      repairMissingPredicate: ['B2_MISSING_PREDICATE', 'B3_VERBAL_AS_PREDICATE'],
      attachDependentClause: ['C3_DELETE_SUBORDINATOR_ONLY', 'C2_SUBORDINATOR_UNRECOGNIZED', 'C4_RELATIVE_CLAUSE_COMPLETE', 'C1_SUBJECT_VERB_EQUALS_SENTENCE'],
      writeWithConnector: ['C3_DELETE_SUBORDINATOR_ONLY', 'C2_SUBORDINATOR_UNRECOGNIZED'],
      integratePhraseFragment: ['D1_ING_EQUALS_VERB', 'D2_INFINITIVE_EQUALS_PREDICATE', 'D3_DESCRIPTIVE_DETAIL_COMPLETE'],
      paragraphRepair: ['E2_CONTEXT_DEPENDENCE', 'E1_OVEREDITING', 'E3_MEANING_DAMAGE']
    }[kind] || [];
    return preferred.find((tag) => tags.includes(tag)) || tags[0] || familyDefaults[kind]?.targetTag || '';
  }

  function responseContract(item, kind, sourceText) {
    const prompt = String(item.Prompt || '').toLowerCase();
    const rubric = String(item['Answer / Rubric'] || '').toLowerCase();
    const hasBlank = /_{3,}/.test(sourceText);
    const connectorMustRemain = /without deleting|keep(?:ing)? the opening|keeping .*word|preserv/.test(prompt)
      || /without deleting|preserv/.test(rubric);
    return {
      responseScope: hasBlank ? 'blankOrFullSentence' : 'fullSentence',
      oneSentence: kind !== 'paragraphRepair',
      sentenceForm: /statement/.test(prompt) ? 'statement' : 'sentence',
      preserveSourceMeaning: kind !== 'writeWithConnector',
      preservePrimaryAction: ['repairMissingSubject', 'attachDependentClause', 'integratePhraseFragment'].includes(kind),
      preservePrimaryTense: kind === 'repairMissingSubject',
      preservePrimaryPolarity: kind === 'repairMissingSubject',
      preservePrimaryModality: kind === 'repairMissingSubject',
      keepRequestedConnector: kind === 'writeWithConnector' || connectorMustRemain,
      minimalChangeRequested: /only what is needed|smallest reasonable change|adding what is missing/.test(prompt),
      prohibitRepeatedWords: true,
      prohibitClearlyOffTaskContent: true
    };
  }

  function buildSentenceRule(item) {
    const kind = ruleKind(item);
    const sourceText = sourceFromPrompt(item.Prompt);
    const tags = parseTags(item['Misconception Tags']);
    const preservation = sourcePreservationMetadata(sourceText);
    return {
      id: item.ID,
      kind,
      skill: String(item.Skill || '').slice(0, 1).toUpperCase(),
      stage: item.Stage || '',
      sourceText,
      requestedWord: kind === 'writeWithConnector' ? requestedConnector(item.Prompt) : '',
      sampleRepair: quotedExample(item['Answer / Rubric']),
      misconceptionTags: tags,
      ...preservation,
      targetTag: targetTagFor(kind, tags),
      requiredChecks: familyDefaults[kind].requiredChecks,
      contract: responseContract(item, kind, sourceText)
    };
  }

  function buildParagraphRule(item) {
    const tags = parseTags(item['Misconception Tags']);
    const preservation = sourcePreservationMetadata(item.Paragraph);
    return {
      id: item.ID,
      kind: 'paragraphRepair',
      skill: 'E',
      stage: item.Stage || '',
      sourceText: item.Paragraph,
      targetFragments: String(item['Target Fragments'] || '')
        .split(/\s*\|\s*/)
        .map((part) => part.trim())
        .filter(Boolean),
      sampleRepair: item['Sample Repair'] || '',
      misconceptionTags: tags,
      ...preservation,
      targetTag: targetTagFor('paragraphRepair', tags),
      requiredChecks: familyDefaults.paragraphRepair.requiredChecks,
      contract: responseContract(item, 'paragraphRepair', item.Paragraph)
    };
  }

  const items = {};
  if (bank) {
    const sentences = rowsToObjects(bank.sentenceColumns, bank.sentences);
    const paragraphs = rowsToObjects(bank.paragraphColumns, bank.paragraphs);

    sentences.forEach((item) => {
      const type = String(item.Type || '');
      if (/constructed response|classification \+ repair/i.test(type)) {
        items[item.ID] = buildSentenceRule(item);
      }
    });

    paragraphs.forEach((item) => {
      items[item.ID] = buildParagraphRule(item);
    });
  }

  window.EVALUATION_RULES = {
    version: '2026.09.08-3',
    connectorWords,
    familyDefaults,
    items
  };
})();
