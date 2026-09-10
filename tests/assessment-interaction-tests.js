(function runAssessmentInteractionTests() {
  const lab = window.FragmentLab;
  const twoPartItems = lab.bank.filter((item) => item.responseMode === 'classifyReason');
  const explanationItems = lab.bank.filter((item) => item.responseMode === 'reasonChoice');
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };

  check(twoPartItems.length === 42, `Expected 42 two-part items; found ${twoPartItems.length}.`);
  twoPartItems.forEach((item) => {
    const completeTask = lab.reasonTaskFor(item, 0);
    const fragmentTask = lab.reasonTaskFor(item, 1);
    [completeTask, fragmentTask].forEach((task, classification) => {
      check(task?.choices.length === 3, `${item.id} branch ${classification} does not have three reasons.`);
      check(new Set(task?.choices || []).size === 3, `${item.id} branch ${classification} repeats a reason.`);
      check(task?.answer >= 0 && task?.answer < 3, `${item.id} branch ${classification} lacks one keyed answer.`);
    });
    check(JSON.stringify(completeTask.choices) !== JSON.stringify(fragmentTask.choices), `${item.id} uses the same reasons for both decisions.`);
    check(!lab.answerComplete(item, { classification: item.answer }), `${item.id} is complete before the reason is selected.`);
    check(lab.answerComplete(item, { classification: item.answer, reason: lab.reasonTaskFor(item, item.answer).answer }), `${item.id} is incomplete after both steps.`);

    const correct = lab.evaluateAnswer(item, { classification: item.answer, reason: lab.reasonTaskFor(item, item.answer).answer });
    check(correct.status === 'correct', `${item.id} does not accept its correct decision and reason.`);
    const wrongClassification = item.answer === 0 ? 1 : 0;
    const wrongBranch = lab.reasonTaskFor(item, wrongClassification);
    const incorrect = lab.evaluateAnswer(item, { classification: wrongClassification, reason: wrongBranch.answer });
    check(incorrect.status === 'incorrect' && incorrect.checks.classificationCorrect === false,
      `${item.id} accepts the wrong classification.`);

    const hiddenHtml = lab.responseControl(item, {});
    check(hiddenHtml.includes('reason-gate') && !hiddenHtml.includes('data-answer-field="reason"'), `${item.id} reveals reasons before step 1.`);
    const completeHtml = lab.responseControl(item, { classification: 0 });
    const fragmentHtml = lab.responseControl(item, { classification: 1 });
    check((completeHtml.match(/data-answer-field="reason"/g) || []).length === 3, `${item.id} does not render three complete-sentence reasons.`);
    check((fragmentHtml.match(/data-answer-field="reason"/g) || []).length === 3, `${item.id} does not render three fragment reasons.`);
    check(completeHtml.includes('Why is it a complete sentence?'), `${item.id} lacks the complete-sentence branch label.`);
    check(fragmentHtml.includes('Why is it a fragment?'), `${item.id} lacks the fragment branch label.`);
  });

  explanationItems.forEach((item) => {
    check(item.reasonTask.choices.length === 3, `${item.id} does not have three explanation options.`);
  });
  const sf018 = lab.bank.find((item) => item.id === 'SF-018');
  check(sf018.reasonTask.choices[sf018.reasonTask.answer] === 'It has a subject, a main verb, and a complete thought.',
    'SF-018 does not key the structure-based explanation.');

  const sfd008 = lab.bank.find((item) => item.id === 'SFD-008');
  const sfd029 = lab.bank.find((item) => item.id === 'SFD-029');
  const expectedMissingPartsChoices = [
    'This is a complete sentence.',
    'This is a fragment because it is missing a subject.',
    'This is a fragment because it has a subject but no complete predicate.'
  ];
  check(sfd008?.responseMode === 'choice', 'SFD-008 is not a direct three-choice diagnostic item.');
  check(JSON.stringify(sfd008?.choices) === JSON.stringify(expectedMissingPartsChoices), 'SFD-008 does not use the balanced missing-parts choices.');
  check(sfd008?.answer === 2, 'SFD-008 does not key the missing-predicate answer.');
  check(sfd029?.responseMode === 'choice', 'SFD-029 complete-sentence control is missing.');
  check(JSON.stringify(sfd029?.choices) === JSON.stringify(expectedMissingPartsChoices), 'SFD-029 does not use the matched choices.');
  check(sfd029?.answer === 0, 'SFD-029 does not key “This is a complete sentence.”');
  check(lab.getState().diagnosticItemIds.includes('SFD-029'), 'The matched complete-sentence control is not in the initial diagnostic.');
  check(lab.bank.length === 234, `Expected 234 total items; found ${lab.bank.length}.`);

  if (failures.length) throw new Error(`Assessment interaction tests failed:\n- ${failures.join('\n- ')}`);
  window.ASSESSMENT_INTERACTION_TEST_RESULTS = {
    passed: true,
    twoPartItems: twoPartItems.length,
    explanationItems: explanationItems.length
  };
  if (typeof console !== 'undefined') console.log(JSON.stringify(window.ASSESSMENT_INTERACTION_TEST_RESULTS));
})();
