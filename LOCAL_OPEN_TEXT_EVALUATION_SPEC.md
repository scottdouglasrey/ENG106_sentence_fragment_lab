# Local Open-Text Evaluation Specification

## Purpose

Replace the current open-text scoring heuristic with a local, deterministic evaluator that can assess sentence-fragment responses without making external API calls to an LLM.

The evaluator must allow legitimate variation in student wording. It must not compare a response to one sample repair or require a single “correct” sentence.

## Current behavior

The application currently treats every non-choice response longer than 15 characters as correct:

```js
typeof answer === 'string' && answer.trim().length > 15
```

This logic is used by the general assessment scorer and by the practice checker in `app.js`. It does not inspect grammar, preservation of the original sentence, compliance with the prompt, or meaning.

Relevant integration points:

- `app.js`: `isItemCorrect(item, answer)` — general assessment scoring.
- `app.js`: `checkPractice()` — practice activity scoring.
- `app.js`: `assessmentResponse()` — renders text-entry fields.
- `app.js`: `reportExpected()` and report functions — display expected results and statuses.
- `question-bank.js`: normalized question-bank data and source item content.

## Required behavior

The evaluator must:

1. Work entirely in the browser with local JavaScript.
2. Accept multiple valid repairs and explanations.
3. Preserve original content where the prompt requires preservation.
4. Verify that the prompt-required change was made.
5. Verify that the submitted result is grammatically complete enough for the targeted skill.
6. Permit normal variation in word order, punctuation, capitalization, inflection, voice, and added details when those variations do not violate the prompt.
7. Reject responses that are merely long, repeat the fragment, omit the required correction, contradict the source, or introduce unrelated text.
8. Return diagnostic reasons, not only a Boolean.
9. Support a cautious `needsReview` state for responses the local rules cannot judge confidently.
10. Preserve existing learner-state and report behavior unless the change explicitly improves the status/reason feedback.

## What “correct” means

The evaluator should use a flexible acceptance contract rather than an answer key.

```text
Correct when:

- the response addresses the requested task;
- required source meaning or constituents are retained;
- the required repair or addition is present;
- the resulting text satisfies the targeted grammatical structure;
- no major contradiction, deletion, or unrelated replacement is detected.
```

The sample repair in the bank is an example for instructors and feedback. It is not the only acceptable answer.

For example, for the fragment:

> Forgot to submit the final page.

The following should be eligible for acceptance:

- `I forgot to submit the final page.`
- `My partner forgot to submit the final page.`
- `The final page was forgotten and never submitted.`

The evaluator should not require the exact subject, exact word order, or exact punctuation from the sample repair. It should verify that the response supplies a grammatical subject, retains the original action/content, and forms an appropriate complete clause.

## Evaluation result

Use a structured result internally:

```js
{
  status: 'correct', // 'correct' | 'incorrect' | 'needsReview'
  score: 0.92,       // optional diagnostic score from 0 to 1
  checks: {
    nonEmpty: true,
    preservesSourceContent: true,
    satisfiesPrompt: true,
    hasRequiredStructure: true,
    grammaticallyComplete: true,
    introducesMajorConflict: false
  },
  reasons: [],
  feedback: 'Your repair adds a subject and preserves the original action.'
}
```

The public Boolean used by existing scoring code should be derived from the result:

```js
const result = evaluateOpenText(item, answer);
const correct = result.status === 'correct';
```

Do not treat `needsReview` as correct for formal mastery scoring. It may be displayed as “Needs review” and excluded from automatic mastery credit, or routed to a later review workflow.

## Evaluation pipeline

Implement the evaluator as a pipeline with reusable checks.

### 1. Normalize the response

Normalization should remove superficial differences without removing useful evidence.

```js
function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
```

Use a lowercase token form for comparison, but retain the original normalized text for grammar and feedback:

```js
function tokenize(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
```

Do not judge correctness by character count. Length may be used only as an empty/very-short-response diagnostic.

### 2. Extract source evidence

Each open-text item needs a source text and structured evaluation metadata. Do not attempt to infer every rule from the human-readable rubric at runtime.

Source evidence can include:

- required lexical concepts or anchor phrases;
- subject, predicate, complement, modifier, or dependent-clause information;
- whether the source is already a complete sentence or is a fragment;
- the missing grammatical feature;
- the requested transformation;
- allowed transformations;
- disallowed changes.

The evaluator should compare concepts and grammatical roles, not exact strings only.

### 3. Extract response evidence

Use lightweight local parsing suitable for this curriculum:

- sentence segmentation;
- tokenization;
- subordinating-conjunction recognition;
- common finite-verb recognition;
- noun/pronoun subject detection;
- infinitive and participial phrase recognition;
- independent/dependent clause heuristics;
- punctuation and capitalization checks.

This does not need to be a general-purpose English parser. It should be explicit about uncertainty and return `needsReview` when a rule cannot confidently classify the response.

### 4. Compare preservation

For each source constituent or concept, determine whether it survives in the response.

Preservation should allow:

- inflection: `submit` / `submitted`;
- punctuation changes;
- capitalization changes;
- common function-word changes;
- permitted word-order changes;
- permitted active/passive voice changes;
- inserted subjects, connectors, or modifiers required by the prompt;
- additional relevant details.

Preservation should reject or flag:

- deletion of the source’s main action or key noun phrase;
- replacement with an unrelated sentence;
- meaning reversal;
- a response that merely copies the fragment without repairing it.

A simple first implementation can represent preserved concepts as weighted anchors rather than exact required strings:

```js
{
  concepts: [
    { terms: ['forget', 'forgot', 'forgotten'], weight: 2 },
    { terms: ['submit', 'submitted', 'submitting'], weight: 2 },
    { terms: ['final', 'page'], weight: 2 }
  ]
}
```

Anchor checks are evidence, not a complete semantic model. Use item-specific exceptions when an acceptable paraphrase would otherwise be rejected.

### 5. Apply prompt-specific constraints

The prompt determines what must change. Examples:

```text
“Repair by adding what is missing”
    require a subject or predicate identified by the item;
    preserve the original clause content.

“Explain why this is a fragment”
    require fragment classification;
    require evidence about the missing subject, finite predicate, or independent clause.

“Write one complete sentence using ‘although’”
    require the requested word or an explicitly allowed inflection;
    require a complete independent clause and a dependent clause;
    reject a standalone although-clause.

“Identify and repair the fragments in this paragraph”
    require each target fragment to be addressed;
    allow different valid repairs;
    check paragraph-level sentence completeness and meaning continuity.
```

### 6. Check grammatical structure

Use separate predicates rather than one vague `isGrammatical` function:

```js
const checks = {
  hasFiniteVerb: detectFiniteVerb(response),
  hasSubject: detectSubject(response),
  hasIndependentClause: detectIndependentClause(response),
  dependentClausesAttached: dependentClausesAreAttached(response),
  phraseIsIntegrated: phraseFragmentIsIntegrated(response),
  punctuationIsPlausible: punctuationIsPlausible(response)
};
```

The exact predicates should be selected by the item’s evaluation kind. For example, a response to an explanation prompt does not need to contain the source sentence’s subject as its own subject, but it does need to contain an adequate explanation.

### 7. Determine status

Separate essential checks from supporting checks.

```js
function finalizeEvaluation(checks, rules) {
  const failedRequired = rules.requiredChecks.filter(name => !checks[name]);
  const failedProhibited = rules.prohibitedChecks.filter(name => checks[name]);

  if (failedRequired.length || failedProhibited.length) {
    return { status: 'incorrect', failedRequired, failedProhibited };
  }

  if (checks.uncertain || checks.lowConfidence) {
    return { status: 'needsReview' };
  }

  return { status: 'correct' };
}
```

Do not require every soft check to pass. For example, a minor punctuation issue should not automatically make a structurally correct repair incorrect unless punctuation is the target skill.

## Item metadata contract

Add executable metadata without replacing the existing human-readable item fields. Prefer a separate `evaluation-rules.js` keyed by item ID so the generated `question-bank.js` remains source-data-driven.

Example:

```js
window.EVALUATION_RULES = {
  'SF-036': {
    kind: 'repairMissingSubject',
    sourceText: 'Forgot to submit the final page.',
    preserveConcepts: [
      { terms: ['forget', 'forgot', 'forgotten'], weight: 2 },
      { terms: ['submit', 'submitted', 'submitting'], weight: 2 },
      { terms: ['final page'], weight: 2 }
    ],
    requiredChecks: [
      'nonEmpty',
      'preservesSourceContent',
      'hasSubject',
      'hasFiniteVerb',
      'hasIndependentClause'
    ],
    allowed: {
      inflection: true,
      wordOrderChange: true,
      activePassiveChange: true,
      addedRelevantContent: true
    }
  }
};
```

The normalized item should receive the matching rule:

```js
const evaluation = window.EVALUATION_RULES?.[item.ID] || defaultEvaluationFor(item);
return { ...normalizedItem, evaluation };
```

Use family-level defaults where possible, but allow item-level overrides. The existing `Family`, `Type`, `Prompt`, `Answer / Rubric`, and `Sample Repair` fields are useful for authoring and display but should not be the only runtime specification.

## Recommended evaluator families

### `repairMissingSubject`

Required:

- source predicate/action preserved;
- a grammatical subject is supplied;
- a finite predicate is present;
- the response forms an independent clause.

Allow:

- any reasonable subject;
- active/passive variation where meaning is retained;
- relevant modifiers and details.

### `repairMissingPredicate`

Required:

- source subject or noun phrase preserved;
- a finite predicate is added;
- the result makes a complete assertion.

Do not require the sample repair’s particular predicate if another predicate completes the original intended thought appropriately.

### `attachDependentClause`

Required:

- dependent clause content preserved;
- an independent clause is added or joined;
- the dependent clause is grammatically attached;
- the combined sentence is complete.

Reject:

- a dependent clause followed by a period with no independent clause;
- a response that drops the subordinating relationship without fulfilling the prompt.

### `integratePhraseFragment`

Required:

- phrase content preserved;
- phrase is attached to a complete clause;
- grammatical relationship is plausible;
- meaning is not substantially changed.

### `explainCompleteSentence`

Required evidence:

- identifies the response/source as complete;
- identifies a subject and finite verb/predicate, or equivalent language such as “can stand alone”;
- explanation is relevant to the prompt.

Accept equivalent vocabulary such as `main verb`, `complete predicate`, `independent clause`, or `can stand alone`.

### `explainFragment`

Required evidence:

- identifies the word group as a fragment;
- identifies the relevant missing feature;
- distinguishes a phrase or dependent clause from a complete independent clause where appropriate.

### `writeWithSubordinator`

Required:

- requested subordinator appears;
- response contains a dependent clause using it;
- response also contains an independent clause;
- the sentence is complete and reasonably coherent.

### `paragraphRepair`

Required:

- each listed target fragment is addressed;
- repaired paragraph contains complete sentences or intentionally valid sentence structures;
- original paragraph meaning and major constituents are retained;
- no major unrelated rewriting is introduced.

This family should support multiple repairs and should be more conservative about automatic correctness. Borderline cases should return `needsReview`.

## Scoring model

Use required checks for correctness and optional checks for confidence. A weighted score can support feedback, but it must not override failed required checks.

```js
function scoreEvidence(checks, weights) {
  let earned = 0;
  let possible = 0;

  for (const [name, weight] of Object.entries(weights)) {
    possible += weight;
    if (checks[name]) earned += weight;
  }

  return possible ? earned / possible : 0;
}
```

Recommended interpretation:

```text
Required failure       → incorrect
Required checks pass and confidence high → correct
Required checks appear to pass but parser confidence is low → needsReview
```

Avoid a single numeric threshold that can allow a response to compensate for a failed essential criterion with extra length or unrelated content.

## Feedback

Feedback should be generated from failed checks, not from the sample answer alone.

Examples:

```js
if (!checks.hasSubject) {
  reasons.push('Your revision still needs a grammatical subject.');
}

if (!checks.hasIndependentClause) {
  reasons.push('The dependent clause needs to be connected to a complete main clause.');
}

if (!checks.preservesSourceContent) {
  reasons.push('Keep the original action or key idea while making the repair.');
}
```

Do not reveal the full answer key during diagnostic assessment. Feedback can explain the failed grammatical requirement while preserving the assessment’s role.

## Integration plan

1. Add `evaluation-rules.js` and load it after `question-bank.js` and before `app.js`.
2. Add `evaluation` to normalized bank items.
3. Implement `evaluateOpenText(item, answer)` in a dedicated evaluator module or in a clearly separated section of `app.js`.
4. Replace the text branch of `isItemCorrect()` with `evaluateOpenText(item, answer).status === 'correct'`.
5. Replace the text branch of `checkPractice()` with the same evaluator.
6. Store the evaluator result or its compact checks in attempt/event data when useful for reporting.
7. Update report rendering so `needsReview` is distinguishable from incorrect.
8. Keep choice questions on their existing exact-answer path.
9. Keep the existing response text in learner state and reports.
10. Make the evaluator fail safely: an unknown item rule should return `needsReview`, not automatic credit.

Avoid duplicating evaluation logic between assessment and practice. Both paths should call the same function.

## Authoring and maintenance

The most important content change is adding machine-readable evaluation metadata to the open-text items. The human rubric should remain readable to instructors, while the evaluator rule should explicitly define:

- source text or source constituents;
- target evaluation family;
- required checks;
- preserved concepts;
- allowed variations;
- disallowed changes;
- acceptable explanation concepts where applicable.

Begin with the highest-use diagnostic, practice, verification, and mastery items. Then expand coverage to the remaining open-text items.

Each new item should have at least three hand-tested valid responses and three invalid responses. Include variation in:

- subject choice;
- word order;
- punctuation;
- inflection;
- added relevant details;
- concise versus verbose explanations.

## Testing requirements

Test the evaluator independently of the UI.

For every evaluator family, test:

- the bank’s sample repair;
- at least two alternative valid responses;
- a response that only copies the fragment;
- a long but irrelevant response;
- a response with the right length but the wrong grammar;
- a response that removes required source content;
- an empty or whitespace-only response;
- a response with minor punctuation variation;
- a borderline response that should produce `needsReview`.

Example test shape:

```js
const cases = [
  {
    itemId: 'SF-036',
    response: 'I forgot to submit the final page.',
    expected: 'correct'
  },
  {
    itemId: 'SF-036',
    response: 'Forgot to submit the final page.',
    expected: 'incorrect'
  },
  {
    itemId: 'SF-036',
    response: 'The weather was pleasant today.',
    expected: 'incorrect'
  }
];
```

Also verify that:

- diagnostic and mastery scores use the new evaluator;
- practice completion uses the new evaluator;
- reports show the student response and evaluator status;
- no external network request is made;
- choice scoring remains unchanged;
- local storage remains backward-compatible;
- the app still works when an item has no rule yet.

## Limitations and design boundary

A local rule engine can be effective for this focused sentence-fragment curriculum, but it cannot guarantee perfect grammatical or semantic judgment for arbitrary English prose. The system should therefore be strongest on constrained tasks and explicit about uncertainty.

Do not attempt to build a universal grammar judge. Build a transparent, item-aware evaluator with:

- constituent preservation;
- prompt compliance;
- structural grammar checks;
- flexible lexical matching;
- explicit uncertainty handling;
- a review path for ambiguous responses.

This satisfies the instructional goal without requiring an external LLM and without reducing assessment to a single sample answer.
