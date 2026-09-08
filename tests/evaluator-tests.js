(function runEvaluatorTests() {
  const evaluator = window.OpenTextEvaluator;
  const defaults = window.EVALUATION_RULES.familyDefaults;

  function item(id, kind, sourceText, extra = {}) {
    return {
      id,
      evaluation: {
        id,
        kind,
        sourceText,
        targetTag: defaults[kind].targetTag,
        misconceptionTags: [defaults[kind].targetTag].filter(Boolean),
        requiredChecks: defaults[kind].requiredChecks,
        contract: {
          responseScope: 'fullSentence',
          oneSentence: kind !== 'paragraphRepair',
          sentenceForm: 'sentence',
          preserveSourceMeaning: kind !== 'writeWithConnector',
          preservePrimaryAction: ['repairMissingSubject', 'attachDependentClause', 'integratePhraseFragment'].includes(kind),
          preservePrimaryTense: kind === 'repairMissingSubject',
          preservePrimaryPolarity: kind === 'repairMissingSubject',
          preservePrimaryModality: kind === 'repairMissingSubject',
          keepRequestedConnector: kind === 'writeWithConnector' || kind === 'attachDependentClause',
          prohibitRepeatedWords: true,
          prohibitClearlyOffTaskContent: true
        },
        ...extra
      }
    };
  }

  const missingSubject = item('T-SUBJECT', 'repairMissingSubject', 'Forgot to submit the final page.');
  const missingPredicate = item('T-VERB', 'repairMissingPredicate', 'The announcements posted near the main entrance.');
  const dependent = item('T-DEPENDENT', 'attachDependentClause', 'Because the office closed before I arrived.');
  const phrase = item('T-PHRASE', 'integratePhraseFragment', 'Walking across campus in the rain.');
  const connector = item('T-CONNECTOR', 'writeWithConnector', '', { requestedWord: 'although' });
  const blankCompletion = item('T-BLANK', 'attachDependentClause', 'Unless the weather improves before morning, __________.', {
    contract: {
      responseScope: 'blankOrFullSentence', oneSentence: true, sentenceForm: 'sentence',
      preserveSourceMeaning: true, preservePrimaryAction: true,
      keepRequestedConnector: true, prohibitRepeatedWords: true,
      prohibitClearlyOffTaskContent: true
    }
  });
  const paragraphSource = 'Priya planned to study at the library after lunch. Because her apartment had become too noisy. She packed her laptop, notes, and headphones.';
  const paragraphSample = 'Priya planned to study at the library after lunch because her apartment had become too noisy. She packed her laptop, notes, and headphones.';
  const paragraph = item('T-PARAGRAPH', 'paragraphRepair', paragraphSource, {
    targetFragments: ['Because her apartment had become too noisy.'],
    sampleRepair: paragraphSample
  });
  const generic = item('T-GENERIC', 'genericRepair', 'A possible fragment.');

  const cases = [
    // Missing-subject repairs and the stakeholder test set.
    [missingSubject, 'I forgot to submit the final page.', 'correct'],
    [missingSubject, 'My partner forgot to submit the final page.', 'correct'],
    [missingSubject, 'The final page was forgotten and never submitted.', 'correct'],
    [missingSubject, 'When I played basketball I forgot to submit the final page.', 'correct'],
    [missingSubject, 'Once upon a time there was a lazy student who forgot to submit the final page.', 'correct'],
    [missingSubject, 'Trevor forgot to submitted the final page.', 'incorrect'],
    [missingSubject, 'I did submit the final page.', 'incorrect'],
    [missingSubject, 'IDK', 'incorrect'],
    [missingSubject, "You can't forget to submit the final page on Friday.", 'incorrect'],
    [missingSubject, 'Forgot to submit the final page Yoda did.', 'incorrect'],
    [missingSubject, 'You are a worthless street rat because you forgot to to submit it.', 'incorrect'],
    [missingSubject, 'Chad is well pleased when the final page he forgets to submit.', 'incorrect'],
    [missingSubject, 'Forgot to submit the final page.', 'incorrect'],
    [missingSubject, 'The weather was pleasant throughout the afternoon.', 'incorrect'],
    [missingSubject, 'Forgot the final page at home.', 'incorrect'],
    [missingSubject, 'She forget to submit the final page.', 'incorrect'],
    [missingSubject, 'They forgets to submit the final page.', 'incorrect'],
    [missingSubject, 'She forgotten to submit the final page.', 'incorrect'],
    [missingSubject, 'She had forgot to submit the final page.', 'incorrect'],
    [missingSubject, 'She had forgotten to submit the final page.', 'correct'],
    [missingSubject, 'Did Trevor forget to submit the final page?', 'correct'],
    [missingSubject, 'Trevor forgot submit the final page.', 'incorrect'],
    [missingSubject, 'Trevor forgot submitting the final page.', 'incorrect'],
    [missingSubject, 'She did not forget to submit the final page.', 'incorrect'],
    [missingSubject, 'She will forget to submit the final page.', 'incorrect'],
    [missingSubject, 'Her forgot to submit the final page.', 'incorrect'],
    [missingSubject, 'She forgot to submit the final page. She went home.', 'incorrect'],
    [missingSubject, 'She forgot to submit the final page and went home.', 'correct'],

    // Missing-predicate repairs.
    [missingPredicate, 'The announcements posted near the main entrance informed students about registration.', 'correct'],
    [missingPredicate, 'The announcements were posted near the main entrance.', 'correct'],
    [missingPredicate, 'The announcements posted near the main entrance included several updates.', 'correct'],
    [missingPredicate, 'Yoda read the announcements posted near the main entrance.', 'correct'],
    [missingPredicate, 'Read the announcements posted near the main entrance, Yoda did.', 'correct'],
    [missingPredicate, 'The announcements posted near the main entrance, Yoda read.', 'correct'],
    [missingPredicate, 'The announcements posted near the main entrance.', 'incorrect'],
    [missingPredicate, 'The weather changed before class began.', 'incorrect'],
    [missingPredicate, 'The announcements near the main entrance.', 'incorrect'],

    // Dependent-clause repairs and blank completion.
    [dependent, 'Because the office closed before I arrived, I returned the next morning.', 'correct'],
    [dependent, 'I returned the next morning because the office closed before I arrived.', 'correct'],
    [dependent, 'Because the office closed before I arrived, the receptionist left a note.', 'correct'],
    [dependent, 'Because the office closed before I arrived.', 'incorrect'],
    [dependent, 'The library was quiet and comfortable all day.', 'incorrect'],
    [dependent, 'Because the office closed before I arrived. The next morning.', 'incorrect'],
    [blankCompletion, 'the trip will be postponed.', 'correct'],
    [blankCompletion, 'Unless the weather improves before morning, the trip will be postponed.', 'correct'],
    [blankCompletion, 'the weather before morning.', 'incorrect'],

    // Phrase integration.
    [phrase, 'Walking across campus in the rain, Maya opened her umbrella.', 'correct'],
    [phrase, 'Maya crossed the quad while walking across campus in the rain.', 'correct'],
    [phrase, 'I was walking across campus in the rain.', 'correct'],
    [phrase, 'Walking across campus in the rain.', 'incorrect'],
    [phrase, 'The rain stopped before sunset.', 'incorrect'],
    [phrase, 'Walking across campus in the heavy rain nearby.', 'incorrect'],

    // Connector production.
    [connector, 'Although it was raining, we walked to class.', 'correct'],
    [connector, 'We walked to class although it was raining.', 'correct'],
    [connector, 'Although the task was difficult, the group finished it.', 'correct'],
    [connector, 'Although it was raining.', 'incorrect'],
    [connector, 'We walked to class in the rain.', 'incorrect'],
    [connector, 'Although. The group worked.', 'incorrect'],

    // Paragraph and fallback behavior.
    [paragraph, paragraphSample, 'correct'],
    [paragraph, 'Because her apartment had become too noisy, Priya planned to study at the library after lunch. She packed her laptop, notes, and headphones.', 'correct'],
    [paragraph, paragraphSource, 'incorrect'],
    [paragraph, 'The weather was pleasant, and everyone went outside for lunch.', 'incorrect'],
    [paragraph, 'Priya planned to study at the library. Her apartment was noisy. She packed headphones.', 'incorrect'],
    [generic, 'A possible fragment that might be repaired.', 'needsReview'],
    [generic, '', 'incorrect']
  ];

  const results = cases.map(([testItem, response, expected], index) => {
    const actualResult = evaluator.evaluateOpenText(testItem, response);
    return {
      index: index + 1,
      id: testItem.id,
      response,
      expected,
      actual: actualResult.status,
      pass: actualResult.status === expected,
      targetMet: actualResult.target?.met,
      strategy: actualResult.repairStrategy?.id || '',
      evidence: `${actualResult.misconceptionEvidence[0]?.directness || ''}/${actualResult.misconceptionEvidence[0]?.strength || ''}`,
      issues: (actualResult.responseIssues || []).map((entry) => entry.code).join(', '),
      feedback: actualResult.feedback
    };
  });
  const passed = results.filter((entry) => entry.pass).length;
  const rulesCount = Object.keys(window.EVALUATION_RULES.items).length;
  const bankRules = Object.values(window.EVALUATION_RULES.items);
  const genericRuleCount = bankRules.filter((rule) => rule.kind === 'genericRepair').length;
  const contractCoveragePassed = bankRules.every((rule) => rule.contract && rule.targetTag && rule.requiredChecks?.length);
  const ruleMappingPassed = window.EVALUATION_RULES.items['SF-066']?.kind === 'repairMissingPredicate'
    && window.EVALUATION_RULES.items['SF-067']?.kind === 'repairMissingSubject'
    && window.EVALUATION_RULES.items['SF-072']?.kind === 'repairMissingSubject'
    && window.EVALUATION_RULES.items['SF-073']?.kind === 'repairMissingPredicate'
    && window.EVALUATION_RULES.items['SF-109']?.kind === 'writeWithConnector'
    && window.EVALUATION_RULES.items['SF-147']?.kind === 'integratePhraseFragment'
    && window.EVALUATION_RULES.items['SF-156']?.kind === 'integratePhraseFragment'
    && window.EVALUATION_RULES.items['SFD-018']?.kind === 'attachDependentClause'
    && window.EVALUATION_RULES.items['SFP-16']?.kind === 'paragraphRepair'
    && !window.EVALUATION_RULES.items['SFD-008'];
  const stakeholderResults = [
    evaluator.evaluateOpenText(missingSubject, 'Trevor forgot to submitted the final page.'),
    evaluator.evaluateOpenText(missingSubject, 'Forgot to submit the final page.'),
    evaluator.evaluateOpenText(missingSubject, 'IDK')
  ];
  const evidencePassed = stakeholderResults[0].target?.met === true
    && stakeholderResults[0].responseIssues.some((entry) => entry.code === 'INFINITIVE_FORM')
    && stakeholderResults[0].misconceptionEvidence[0]?.outcome === 'counterevidence'
    && stakeholderResults[1].misconceptionEvidence[0]?.outcome === 'supports'
    && stakeholderResults[2].misconceptionEvidence[0]?.outcome === 'none';
  const strategyResults = {
    predicate: evaluator.evaluateOpenText(missingPredicate, 'The announcements posted near the main entrance informed students about registration.'),
    helping: evaluator.evaluateOpenText(missingPredicate, 'The announcements were posted near the main entrance.'),
    embedded: evaluator.evaluateOpenText(missingPredicate, 'Yoda read the announcements posted near the main entrance.'),
    inverted: evaluator.evaluateOpenText(missingPredicate, 'Read the announcements posted near the main entrance, Yoda did.'),
    fronted: evaluator.evaluateOpenText(missingPredicate, 'The announcements posted near the main entrance, Yoda read.'),
    changedMeaning: evaluator.evaluateOpenText(missingPredicate, 'The weather changed before class began.'),
    paragraph: evaluator.evaluateOpenText(paragraph, 'Because her apartment had become too noisy, Priya planned to study at the library after lunch. She packed her laptop, notes, and headphones.')
  };
  const strategyPassed = strategyResults.predicate.repairStrategy?.id === 'predicate_added_to_original_subject'
    && strategyResults.predicate.misconceptionEvidence[0]?.directness === 'direct'
    && strategyResults.predicate.misconceptionEvidence[0]?.strength === 'strong'
    && strategyResults.helping.repairStrategy?.id === 'helping_verb_added'
    && /helping verb/i.test(strategyResults.helping.feedback)
    && strategyResults.embedded.repairStrategy?.id === 'embedded_word_group'
    && strategyResults.embedded.misconceptionEvidence[0]?.directness === 'indirect'
    && strategyResults.embedded.misconceptionEvidence[0]?.strength === 'limited'
    && strategyResults.inverted.repairStrategy?.id === 'embedded_with_inversion'
    && strategyResults.inverted.misconceptionEvidence[0]?.directness === 'indirect'
    && /unusual word order/i.test(strategyResults.inverted.feedback)
    && !/original subject/i.test(strategyResults.inverted.feedback)
    && strategyResults.fronted.repairStrategy?.id === 'embedded_with_fronting'
    && strategyResults.fronted.misconceptionEvidence[0]?.directness === 'indirect'
    && strategyResults.changedMeaning.repairStrategy?.id === 'meaning_not_preserved'
    && /^You formed a complete sentence\./.test(strategyResults.changedMeaning.feedback)
    && !/incorporates? the original/i.test(strategyResults.changedMeaning.feedback)
    && strategyResults.paragraph.repairStrategy?.id === 'paragraph_fragments_repaired';
  const allPassed = passed === results.length && rulesCount === 86 && genericRuleCount === 0
    && contractCoveragePassed && ruleMappingPassed && evidencePassed && strategyPassed;

  document.querySelector('#results').innerHTML = `<div class="summary"><strong class="${allPassed ? 'pass' : 'fail'}">${passed}/${results.length} cases passed</strong><br>${rulesCount} bank writing tasks have local evaluation contracts; ${genericRuleCount} use the generic fallback. Item-family mapping: ${ruleMappingPassed ? 'passed' : 'failed'}. Contract coverage: ${contractCoveragePassed ? 'passed' : 'failed'}. Misconception evidence: ${evidencePassed ? 'passed' : 'failed'}. Strategy-aware feedback: ${strategyPassed ? 'passed' : 'failed'}. Evaluator version: ${evaluator.version}.</div><table><thead><tr><th>#</th><th>Family</th><th>Response</th><th>Expected</th><th>Actual</th><th>Target met</th><th>Strategy</th><th>Evidence</th><th>Issues</th><th>Feedback</th></tr></thead><tbody>${results.map((entry) => `<tr><td>${entry.index}</td><td>${entry.id}</td><td><code>${entry.response}</code></td><td>${entry.expected}</td><td class="${entry.pass ? 'pass' : 'fail'}">${entry.actual}</td><td>${entry.targetMet}</td><td><code>${entry.strategy}</code></td><td><code>${entry.evidence}</code></td><td><code>${entry.issues}</code></td><td>${entry.feedback}</td></tr>`).join('')}</tbody></table>`;
  document.title = `${allPassed ? 'PASS' : 'FAIL'} · Local evaluator tests`;
  window.EVALUATOR_TEST_RESULTS = { passed, total: results.length, rulesCount, genericRuleCount,
    contractCoveragePassed, ruleMappingPassed, evidencePassed, strategyPassed, allPassed, results };
})();
