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
    return {
      id: item.ID,
      kind,
      skill: String(item.Skill || '').slice(0, 1).toUpperCase(),
      stage: item.Stage || '',
      sourceText,
      requestedWord: kind === 'writeWithConnector' ? requestedConnector(item.Prompt) : '',
      sampleRepair: quotedExample(item['Answer / Rubric']),
      misconceptionTags: tags,
      targetTag: targetTagFor(kind, tags),
      requiredChecks: familyDefaults[kind].requiredChecks,
      contract: responseContract(item, kind, sourceText)
    };
  }

  function buildParagraphRule(item) {
    const tags = parseTags(item['Misconception Tags']);
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
