# Overview page UX implementation plan

## Goal

Make the first visit immediately answer three questions for a student:

1. What is this tool for?
2. What should I do first?
3. What will happen after I finish that step?

The primary recommendation is to make the diagnostic the clear first action, move the progress metrics below that action, remove the device-storage note from the hero, and explain the full path in plain language.

## Proposed first-visit hierarchy

1. **Hero / purpose**
   - Keep “Make every sentence complete.”
   - Replace the abstract supporting line with a direct student-facing explanation: “You’ll identify sentence fragments, practice the skills you need, and complete a final mastery check.”
   - Remove the “Your work stays on this device” note from the hero. The information is useful only when a student asks about saving or reporting and is not part of the first decision.

2. **Start here / first action**
   - Move this section directly below the hero.
   - Change the eyebrow to `STEP 1 OF 4`.
   - Use a direct heading: “Complete the diagnostic first.”
   - Explain the sequence: “Your answers show which sentence skills to practice. This is a starting point, not a course grade.”
   - Make the primary button the strongest action on the page: `Begin diagnostic`.
   - Add a compact path cue: `Diagnostic → Targeted practice → Mastery check → Report`.

3. **What happens after you start**
   - Add a short four-step path below the primary action so students can see what comes next without reading the whole page.
   - Keep the wording action-oriented and avoid exposing assessment mechanics too early.

4. **Progress snapshot**
   - Move Diagnostic, Targeted skills, and Mastery cards below the start section.
   - Keep the cards, but treat them as status information rather than the page’s first decision.
   - On a first visit, show a subtle `Not started` state instead of leading with em dashes alone.

5. **Recent activity**
   - Keep Recent activity after the progress snapshot.
   - On an empty state, explain when it becomes useful: “Your completed diagnostic, practice, and mastery steps will appear here.”

## Copy proposal

### Hero

- Eyebrow: `Sentence Fragment Lab`
- Heading: `Make every sentence complete.`
- Supporting copy: `Identify sentence fragments, practice the skills you need, and complete a final mastery check.`

### First-visit callout

- Eyebrow: `STEP 1 OF 4`
- Heading: `Complete the diagnostic first.`
- Body: `Answer a short set of questions so the lab can find your starting point. Your results choose the practice you see next.`
- Reassurance: `This is a starting point—not a course grade.`
- Button: `Begin diagnostic →`

### Path labels

- `1 Diagnostic` — Find your starting point
- `2 Targeted practice` — Build the skills you need
- `3 Mastery check` — Show what you know
- `4 My report` — Review your journey

## Implementation steps

### Phase 1 — Render the new information hierarchy

- Update `overviewView()` in `app.js` so the first-visit state renders hero → start section → path explanation → metrics → recent activity.
- Keep the existing `next` state logic so returning students see the correct next action.
- Add a `firstVisit` or equivalent presentation branch only if the returning-state copy needs to differ materially from the first-visit copy.

### Phase 2 — Style the onboarding emphasis

- Add a prominent but brand-consistent first-step wrapper in `styles.css`.
- Reuse the existing blue, black, light-blue, and BYU-Idaho typography system.
- Make the primary diagnostic button visually dominant and keep one primary action in the section.
- Add responsive stacking so the first-step content remains first on narrow screens.

### Phase 3 — Remove or relocate low-priority privacy copy

- Remove `.hero-note` from the overview hero.
- Preserve the privacy/storage explanation in a lower-priority location such as the report view, glossary/help modal, or a small footer note if it remains necessary.
- Keep the existing local-storage behavior unchanged.

### Phase 4 — Verify state transitions and accessibility

- Verify first visit, after diagnostic completion, during practice, before mastery, and after mastery completion.
- Confirm the primary button still routes through the existing `overview-next` action.
- Confirm keyboard focus order follows the visual order.
- Confirm headings and button labels remain meaningful when read without visual styling.
- Test the layout at desktop width and at the existing mobile breakpoint.

## Acceptance criteria

- A first-time student can identify the first required action within a few seconds.
- The diagnostic call-to-action appears before the score, targeted-skill, and mastery cards.
- The page explicitly explains that diagnostic results determine what practice comes next.
- The full learning sequence is visible without requiring students to infer it from the sidebar.
- The privacy/storage note no longer competes with the first action in the hero.
- Returning-state actions still change appropriately based on saved progress.
- No assessment scoring, local-storage, or report behavior changes.

## Suggested test cases

- Empty local state: shows `Complete the diagnostic first` and routes to Diagnostic.
- Diagnostic complete with incomplete practice: shows targeted practice as the next action.
- Practice complete with incomplete mastery: shows mastery check as the next action.
- Mastery complete: shows report as the next action.
- Mobile viewport: first-step callout and path stack without horizontal overflow.

## Follow-up diagnostic annotation

The diagnostic sidebar labeled “Your progress” repeats information already communicated by the numbered items and the `x of y answered` footer. Remove it from the assessment layout to preserve screen space for the question itself.

- Keep the visible task count in the top-right status pill.
- Keep the answered count in the question footer.
- Let the question card expand to a single-column layout with a comfortable maximum width.
- Remove the unused `data-q` navigation binding so the sequence is controlled only by Back, Save & next, and final submission.
- Verify the diagnostic review state still exposes saved feedback and the same sequential navigation.
