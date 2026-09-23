# Question selection overview

Source: `question-bank.js` version `v3.1` and the selection logic in `app.js`.

## Bank size

| Source area | Count |
| --- | ---: |
| Sentence items | 209 |
| Paragraph tasks | 25 |
| Total item bank | 234 |
| Diagnostic-stage source items | 34 |
| Practice Studio candidates | 167 |
| Mastery Check reserve | 33 |

The bank has five instructional skills: A sentence completeness, B missing essential parts, C dependent-clause fragments, D phrase fragments, and E contextual transfer through paragraph tasks.

## Diagnostic Evaluation

The default diagnostic is a fixed 10-item set created in `defaultState()` from `DEFAULT_DIAGNOSTIC_IDS`:

- Skill A: first two items from the Diagnostic stage.
- Skill B: first two items from the Diagnostic stage.
- Skill C: first two items from the Diagnostic stage.
- Skill D: first two items from the Diagnostic stage.
- Skill E: first paragraph task from the Diagnostic stage.
- One additional explicit item: `SFD-029`, a verification-stage Skill B item used as fresh diagnostic evidence.

The current default IDs are:

`SFD-001`, `SFD-002`, `SFD-007`, `SFD-008`, `SFD-013`, `SFD-014`, `SFD-021`, `SFD-022`, `SFP-D01`, and `SFD-029`.

Selection is deterministic and follows source-bank order. It is not randomized in the current implementation. The diagnostic evaluates each response immediately when it is saved, but feedback is held until the learner completes the diagnostic. Diagnostic results do not count as mastery; they determine which skills need targeted practice.

## Practice Studio

Practice begins only after the diagnostic is complete. `requiredPracticeIds()` assigns every skill below the 75% mastery threshold. If a later mastery attempt creates a relearning loop, the weak skills from that attempt replace the initial diagnostic-based assignment.

For each assigned skill, `ensureIntervention()` creates a three-step intervention:

1. **Guided practice** — one item from the skill’s Guided practice pool.
2. **Independent practice** — one item from the skill’s Independent practice pool.
3. **Verification** — one unseen item from the skill’s Verification pool.

The candidate pool contains 65 guided items, 87 independent items, and 15 verification items. The per-skill pool counts are:

| Skill | Guided | Independent | Verification |
| --- | ---: | ---: | ---: |
| A — Sentence completeness | 12 | 15 | 2 |
| B — Missing essential parts | 14 | 18 | 2 |
| C — Dependent-clause fragments | 18 | 25 | 4 |
| D — Phrase fragments | 16 | 22 | 4 |
| E — Contextual transfer | 5 | 7 | 3 |

Within a stage, the selector first avoids items already used in the diagnostic, previous practice, mastery attempts, or alternate-task history. It then prefers an item whose misconception tags match the learner’s evidence-derived focus tags. If no targeted item is available, it takes the first available item in source order.

If a verification response is marked `needsReview`, the studio tries to replace it with another unseen verification item. If an open-text response remains uncertain after repeated attempts, the experience can offer a structured fallback revision task rather than silently awarding credit.

## Mastery Check

The mastery reserve contains 33 protected items:

| Skill | Protected reserve |
| --- | ---: |
| A — Sentence completeness | 6 |
| B — Missing essential parts | 6 |
| C — Dependent-clause fragments | 8 |
| D — Phrase fragments | 8 |
| E — Contextual transfer | 5 |

The initial mastery set selects up to four unseen items per skill, for a normal initial total of 20 items when all five skills are being assessed. It selects from the mastery reserve only and excludes items already used in a mastery attempt or mastery alternate history.

After a mastery attempt, skills below the 75% threshold enter a relearning loop. The next mastery set is prepared only for those weak skills and again selects up to four unseen reserve items per weak skill. A response marked `needsReview` can be replaced by another unseen mastery item from the same skill. Mastery is complete only when every assessed skill reaches at least 75% and has no unresolved `needsReview` response.

## State and repeatability notes

- The browser stores item IDs, answers, locked responses, evaluations, intervention steps, mastery attempts, and alternate-item history in local state.
- Because used items are excluded, later rounds can produce a different item set even though the selection rule remains deterministic.
- The current code does not randomize the bank or shuffle options as a general selection step.
- The complete pool-level inventory is available in [question-inventory.html](question-inventory.html).

