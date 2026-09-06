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
        requiredChecks: defaults[kind].requiredChecks,
        ...extra
      }
    };
  }

  const missingSubject = item('T-SUBJECT', 'repairMissingSubject', 'Forgot to submit the final page.');
  const missingPredicate = item('T-VERB', 'repairMissingPredicate', 'The announcements posted near the main entrance.');
  const dependent = item('T-DEPENDENT', 'attachDependentClause', 'Because the office closed before I arrived.');
  const phrase = item('T-PHRASE', 'integratePhraseFragment', 'Walking across campus in the rain.');
  const connector = item('T-CONNECTOR', 'writeWithConnector', '', { requestedWord: 'although' });
  const paragraphSource = 'Priya planned to study at the library after lunch. Because her apartment had become too noisy. She packed her laptop, notes, and headphones.';
  const paragraphSample = 'Priya planned to study at the library after lunch because her apartment had become too noisy. She packed her laptop, notes, and headphones.';
  const paragraph = item('T-PARAGRAPH', 'paragraphRepair', paragraphSource, {
    targetFragments: ['Because her apartment had become too noisy.'],
    sampleRepair: paragraphSample
  });
  const generic = item('T-GENERIC', 'genericRepair', 'A possible fragment.');

  const cases = [
    [missingSubject, 'I forgot to submit the final page.', 'correct'],
    [missingSubject, 'My partner forgot to submit the final page.', 'correct'],
    [missingSubject, 'The final page was forgotten and never submitted.', 'correct'],
    [missingSubject, 'Forgot to submit the final page.', 'incorrect'],
    [missingSubject, 'The weather was pleasant throughout the afternoon.', 'incorrect'],
    [missingSubject, 'Forgot the final page at home.', 'incorrect'],

    [missingPredicate, 'The announcements posted near the main entrance informed students about registration.', 'correct'],
    [missingPredicate, 'The announcements were posted near the main entrance.', 'correct'],
    [missingPredicate, 'The announcements posted near the main entrance included several updates.', 'correct'],
    [missingPredicate, 'The announcements posted near the main entrance.', 'incorrect'],
    [missingPredicate, 'The weather changed before class began.', 'incorrect'],
    [missingPredicate, 'The announcements near the main entrance.', 'incorrect'],

    [dependent, 'Because the office closed before I arrived, I returned the next morning.', 'correct'],
    [dependent, 'I returned the next morning because the office closed before I arrived.', 'correct'],
    [dependent, 'Because the office closed before I arrived, the receptionist left a note.', 'correct'],
    [dependent, 'Because the office closed before I arrived.', 'incorrect'],
    [dependent, 'The library was quiet and comfortable all day.', 'incorrect'],
    [dependent, 'Because the office closed before I arrived. The next morning.', 'incorrect'],

    [phrase, 'Walking across campus in the rain, Maya opened her umbrella.', 'correct'],
    [phrase, 'Maya crossed the quad while walking across campus in the rain.', 'correct'],
    [phrase, 'I was walking across campus in the rain.', 'correct'],
    [phrase, 'Walking across campus in the rain.', 'incorrect'],
    [phrase, 'The rain stopped before sunset.', 'incorrect'],
    [phrase, 'Walking across campus in the heavy rain nearby.', 'incorrect'],

    [connector, 'Although it was raining, we walked to class.', 'correct'],
    [connector, 'We walked to class although it was raining.', 'correct'],
    [connector, 'Although the task was difficult, the group finished it.', 'correct'],
    [connector, 'Although it was raining.', 'incorrect'],
    [connector, 'We walked to class in the rain.', 'incorrect'],
    [connector, 'Although. The group worked.', 'incorrect'],

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
    return { index: index + 1, id: testItem.id, response, expected, actual: actualResult.status, pass: actualResult.status === expected,
      feedback: actualResult.feedback };
  });
  const passed = results.filter((entry) => entry.pass).length;
  const rulesCount = Object.keys(window.EVALUATION_RULES.items).length;
  const ruleMappingPassed = window.EVALUATION_RULES.items['SF-072']?.kind === 'repairMissingSubject'
    && window.EVALUATION_RULES.items['SF-073']?.kind === 'repairMissingPredicate'
    && window.EVALUATION_RULES.items['SFP-16']?.kind === 'paragraphRepair';
  const allPassed = passed === results.length && rulesCount === 87 && ruleMappingPassed;

  document.querySelector('#results').innerHTML = `<div class="summary"><strong class="${allPassed ? 'pass' : 'fail'}">${passed}/${results.length} cases passed</strong><br>${rulesCount} bank writing tasks have local evaluation rules. Item-family mapping: ${ruleMappingPassed ? 'passed' : 'failed'}. Evaluator version: ${evaluator.version}.</div><table><thead><tr><th>#</th><th>Family</th><th>Response</th><th>Expected</th><th>Actual</th><th>Feedback</th></tr></thead><tbody>${results.map((entry) => `<tr><td>${entry.index}</td><td>${entry.id}</td><td><code>${entry.response}</code></td><td>${entry.expected}</td><td class="${entry.pass ? 'pass' : 'fail'}">${entry.actual}</td><td>${entry.feedback}</td></tr>`).join('')}</tbody></table>`;
  document.title = `${allPassed ? 'PASS' : 'FAIL'} · Local evaluator tests`;
  window.EVALUATOR_TEST_RESULTS = { passed, total: results.length, rulesCount, ruleMappingPassed, allPassed, results };
})();
