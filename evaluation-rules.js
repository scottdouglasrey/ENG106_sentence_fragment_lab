/*
 * Machine-readable rules for locally scored writing tasks.
 *
 * The source question bank remains unchanged. This file translates its
 * author-facing fields into a small set of transparent evaluation families.
 */
(function buildEvaluationRules() {
  const bank = window.QUESTION_BANK;
  const connectorWords = [
    'after', 'although', 'as', 'because', 'before', 'even though', 'if',
    'once', 'since', 'though', 'unless', 'until', 'when', 'whenever',
    'whereas', 'while', 'which', 'who', 'whose', 'that'
  ];

  const familyDefaults = {
    repairMissingSubject: {
      requiredChecks: [
        'nonEmpty',
        'preservesSourceContent',
        'addsMissingPart',
        'hasSubject',
        'hasMainVerb',
        'hasCompleteThought'
      ]
    },
    repairMissingPredicate: {
      requiredChecks: [
        'nonEmpty',
        'preservesSourceContent',
        'addsMissingPart',
        'hasMainVerb',
        'hasCompleteThought'
      ]
    },
    attachDependentClause: {
      requiredChecks: [
        'nonEmpty',
        'preservesSourceContent',
        'addsMissingPart',
        'dependentWordsAttached',
        'hasCompleteThought'
      ]
    },
    integratePhraseFragment: {
      requiredChecks: [
        'nonEmpty',
        'preservesSourceContent',
        'addsMissingPart',
        'phraseAttached',
        'hasCompleteThought'
      ]
    },
    writeWithConnector: {
      requiredChecks: [
        'nonEmpty',
        'usesRequestedWord',
        'dependentWordsAttached',
        'hasCompleteThought'
      ]
    },
    paragraphRepair: {
      requiredChecks: [
        'nonEmpty',
        'preservesSourceContent',
        'allTargetsAddressed',
        'hasCompleteThought'
      ]
    },
    genericRepair: {
      requiredChecks: ['nonEmpty', 'preservesSourceContent', 'addsMissingPart']
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

    if (/^(repair|revise|complete|add|combine|attach)/i.test(value)) {
      return value.replace(/^[^:]+:\s*/i, '').trim();
    }

    return value;
  }

  function requestedConnector(prompt) {
    const lower = normalize(prompt).toLowerCase();
    return connectorWords.find((word) => new RegExp(`\\b${word.replace(' ', '\\s+')}\\b`).test(lower)) || '';
  }

  function ruleKind(item) {
    const rubric = String(item['Answer / Rubric'] || '').toLowerCase();
    const familyName = String(item.Family || '').toLowerCase();
    const evidence = `${familyName} ${item['Misconception Tags'] || ''}`.toLowerCase();
    const prompt = String(item.Prompt || '').toLowerCase();

    if (/write (one |a )?complete sentence|write a sentence|use (the word|one of)|beginning with/.test(prompt)) {
      return /^c\b/.test(familyName) ? 'writeWithConnector' : 'integratePhraseFragment';
    }
    if (/missing subject|add(?:ing)? (an appropriate |a )?(grammatical )?subject/.test(rubric)) return 'repairMissingSubject';
    if (/missing predicate|add(?:ing)? (a )?(complete |finite |main )?(verb|predicate)/.test(rubric)) return 'repairMissingPredicate';
    if (/^b1\b/.test(familyName) || (/b1_/.test(evidence) && !/b2_/.test(evidence))) return 'repairMissingSubject';
    if (/^b2\b/.test(familyName) || (/b2_/.test(evidence) && !/b1_/.test(evidence))) return 'repairMissingPredicate';
    if (/^c\b|dependent|subordinator|relative clause/.test(evidence)) return 'attachDependentClause';
    if (/^d\b|phrase|infinitive|particip|gerund|appositive|prepositional/.test(evidence)) return 'integratePhraseFragment';
    return 'genericRepair';
  }

  function quotedExample(rubric) {
    const matches = [...String(rubric || '').matchAll(/[“"]([^”"]{8,})[”"]/g)];
    return matches.length ? matches[matches.length - 1][1] : '';
  }

  function buildSentenceRule(item) {
    const kind = ruleKind(item);
    const sourceText = sourceFromPrompt(item.Prompt);
    return {
      id: item.ID,
      kind,
      sourceText,
      requestedWord: kind === 'writeWithConnector' ? requestedConnector(item.Prompt) : '',
      sampleRepair: quotedExample(item['Answer / Rubric']),
      requiredChecks: familyDefaults[kind].requiredChecks,
      allowed: {
        inflection: true,
        wordOrderChange: true,
        activePassiveChange: true,
        addedRelevantContent: true
      }
    };
  }

  function buildParagraphRule(item) {
    return {
      id: item.ID,
      kind: 'paragraphRepair',
      sourceText: item.Paragraph,
      targetFragments: String(item['Target Fragments'] || '')
        .split(/\s*\|\s*/)
        .map((part) => part.trim())
        .filter(Boolean),
      sampleRepair: item['Sample Repair'] || '',
      requiredChecks: familyDefaults.paragraphRepair.requiredChecks,
      allowed: {
        punctuationChange: true,
        sentenceCombination: true,
        sentenceDivision: true,
        addedRelevantContent: true
      }
    };
  }

  const items = {};
  if (bank) {
    const sentences = rowsToObjects(bank.sentenceColumns, bank.sentences);
    const paragraphs = rowsToObjects(bank.paragraphColumns, bank.paragraphs);

    sentences.forEach((item) => {
      const type = String(item.Type || '');
      if (/constructed response|classification \+ repair|short response/i.test(type)) {
        items[item.ID] = buildSentenceRule(item);
      }
    });

    paragraphs.forEach((item) => {
      items[item.ID] = buildParagraphRule(item);
    });
  }

  window.EVALUATION_RULES = {
    version: '2026.09.05-1',
    familyDefaults,
    items
  };
})();
