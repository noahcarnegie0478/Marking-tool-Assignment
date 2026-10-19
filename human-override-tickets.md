# Human Override: Confirm / Adjust / Re-do Tickets

> Adds the tutor-in-the-loop layer: after the AI grades, the tutor can confirm a
> mark, adjust it, or re-do a single question. Built from the base ticket template,
> PR ceremony dropped, strict tests kept. Pairs with `CLAUDE.md`, `technical-spec.md`,
> `tickets.md`.

---

## 0. The one decision to confirm first

When the tutor has **confirmed or adjusted** a question, and then clicks the whole-student
**"Grade with AI"** again, what happens to that human mark?

| Option | Behaviour | Trade-off |
|---|---|---|
| **A. Lock (recommended)** | Bulk re-grade skips confirmed/adjusted questions. To overwrite a human mark, the tutor uses the per-question **Re-do**. | Human work is never lost by accident. One extra click to force a re-grade. |
| B. Warn | Bulk re-grade asks before overwriting human marks. | Safer than overwrite, but adds a modal and more state. |
| C. Overwrite | Bulk re-grade replaces everything. | Simplest, but silently destroys the tutor's review. Bad for trust. |

**These tickets assume Option A.** If you want B or C, say so and I will adjust the
acceptance criteria and the lock test.

---

## 1. State model change (shared by both tickets)

Extend `QuestionResult`. Keep the AI's original output; add the human layer on top.

```typescript
type QuestionResult = {
  // status now has three graded sub-states
  status: "pending" | "grading" | "ai_graded" | "confirmed" | "adjusted" | "no_submission";

  // the AI's original output, always kept (so Re-do and "was X, now Y" work)
  aiMark: number | null;
  aiFeedback: string | null;
  aiNeedsReview: boolean;

  // set ONLY when the tutor adjusts the mark
  humanMark: number | null;
};
```

Two derived values (pure selectors, never stored):
- **effectiveMark** = `humanMark ?? aiMark ?? 0`. This is what totals and the mark box use.
- **needsReview** = `aiNeedsReview && status === "ai_graded"`. A human confirm or adjust clears the flag, because a human has now looked.

Status transitions:
- `ai_graded` to `confirmed` (Confirm)
- `ai_graded` or `confirmed` to `adjusted` (Adjust)
- any graded state to `grading` to `ai_graded` (Re-do, which also clears `humanMark`)

---

## 2. Invariants (what must NEVER be false)

| # | Invariant | Enforced by |
|---|---|---|
| I1 (extended) | A mark is always a whole number from 0 to `max_marks`. **This now covers human input too.** | `clampMark` + input validation reused on the Adjust value. Test with 5 on a 3-max. |
| I5 | A student's total is derived from the **effective** marks, never stored. | `getTotal` uses `effectiveMark`. |
| I6 (new) | A human-confirmed or adjusted mark is never silently overwritten by a bulk AI re-grade. | Bulk loop skips `confirmed`/`adjusted` (Option A). Tested. |

> If any breaks, the tutor loses trust: either an impossible mark appears, the total is wrong, or their careful review gets wiped by one button. That is the whole risk of this feature.

---

## ADJ-01 · Human override logic (confirm / adjust / re-do) ⭐
**Priority:** P1 · **Est:** 1h · **Status:** todo · **Depends on:** GRADE-01, UI-01
**Spec:** state model (section 1), invariants I1 I5 I6

**User story**
> As a tutor, I want to confirm, adjust, or re-do each AI mark, so I stay in control
> and feel comfortable trusting the result.

**Scope**
- In: the reducer actions `CONFIRM`, `ADJUST`, `REDO`; the extended state model; the `effectiveMark` and `needsReview` selectors; reusing `clampMark` and integer validation on the Adjust value; making the bulk grade loop skip locked questions (Option A); `getTotal` using effective marks.
- Out: any UI. That is ADJ-02. No persistence (still in-memory).

**Acceptance criteria**
- Given an `ai_graded` question, when the tutor confirms it, then status becomes `confirmed`, the mark is unchanged, and `needsReview` becomes false.
- Given an `ai_graded` question, when the tutor adjusts the mark to a valid value, then status becomes `adjusted`, `humanMark` is set, `effectiveMark` is the new value, and `needsReview` becomes false.
- Given an adjust value above `max_marks`, when applied, then it is clamped to `max_marks` (I1), never stored higher.
- Given an adjust value below 0, when applied, then it is clamped to 0.
- Given an adjust value that is not a whole number (empty, letters, 2.5), when applied, then it is rejected with no state change and no crash.
- Given a graded question, when the tutor re-does it, then a fresh AI call runs, `aiMark`/`aiFeedback`/`aiNeedsReview` are replaced, `humanMark` is cleared, and status returns to `ai_graded`.
- Given a `confirmed` or `adjusted` question, when the tutor runs bulk "Grade with AI" for the student, then that question is skipped and its human mark is preserved (I6).
- Given a mix of ai_graded, confirmed, and adjusted questions, when the total is read, then it sums the effective marks (I5).

**Test cases (full table)**
| Type | Case | Expected |
|---|---|---|
| Happy | Confirm an ai_graded Q | status confirmed, mark same, needsReview false |
| Happy | Adjust 2/3 to 3/3 | humanMark 3, status adjusted, effectiveMark 3 |
| Happy | Re-do a single Q | fresh AI result, humanMark cleared, status ai_graded |
| Edge | Adjust to 5 on a 3-max | clamped to 3 (I1) |
| Edge | Adjust to -1 | clamped to 0 |
| Edge | Adjust to "abc" / empty / 2.5 | rejected, no state change |
| Edge | Confirm a needs_review Q | needsReview clears |
| Edge | Adjust then bulk re-grade the student | adjusted Q skipped, mark preserved (I6) |
| Edge | Re-do after an adjust | humanMark cleared, back to AI value |
| Happy | getTotal on mixed ai/confirmed/adjusted | sums effective marks (I5) |
| Failure | Re-do when the AI call fails | safe fallback, status returns usable, no crash |
| Security | Adjust a no-submission Q | not allowed, stays 0 (scope: no response to mark) |

**Invariants touched:** I1, I5, I6
**Files likely touched:** `lib/state/GradingContext.tsx`, `lib/state/selectors.ts`, `lib/domain/clampMark.ts` (reuse), `lib/server/gradeResponse.ts` (re-do reuses the same pipeline)
**Risks / open questions:**
- Option A is assumed (section 0). B or C changes the bulk-loop test.
- No-submission questions are not adjustable in this version. If a tutor needs to mark paper evidence, that is a later change.

**Definition of Done**
- [ ] All acceptance criteria met (checked by you, not just tests)
- [ ] Tests for every row in the table, passing, real output pasted
- [ ] Lint + typecheck + build green
- [ ] Blind reviewer returned "No findings"
- [ ] No secrets, no PII in logs, no new dependency
- [ ] Journal entry written

**Review log**
| Round | Findings | Fixed? |
|---|---|---|
| 1 | | |

---

## ADJ-02 · Human override UI (controls on each card)
**Priority:** P1 · **Est:** 0.75h · **Status:** todo · **Depends on:** ADJ-01, UI-02
**Spec:** design tokens in `UI-02-final-ui.md`

**User story**
> As a tutor, I want clear confirm / adjust / re-do controls on each graded card,
> so I can review a mark without leaving the page.

**Scope**
- In: a control row on each **graded** card with three actions: **Confirm**, **Adjust** (opens a small integer input or a +/- stepper bounded to 0..max), and **Re-do**; a status indicator ("✓ Confirmed" / "Adjusted by tutor") styled with the existing tokens; the Re-do showing the per-card grading state; the "⚠ Needs review" chip disappearing once the tutor confirms or adjusts.
- Out: controls on pending, grading, or no-submission cards. No new colours or fonts.

**Acceptance criteria**
- Given a graded card, when I view it, then I see Confirm, Adjust, and Re-do controls.
- Given a pending, grading, or no-submission card, when I view it, then those controls are hidden.
- Given the Adjust input, when I try a value outside 0..max, then the UI prevents it or shows a clear inline error (the value never reaches the state out of range).
- Given I confirm a card, when it updates, then it shows a "✓ Confirmed" indicator and the "⚠ Needs review" chip is gone.
- Given I adjust a card, when it updates, then it shows "Adjusted by tutor" and the new mark in the mark box.
- Given I re-do a card, when it runs, then that card shows the grading state, then the fresh AI mark and feedback.

**Test cases (thin, as agreed for UI)**
| Type | Case | Expected |
|---|---|---|
| Happy | Controls render on a graded card | Confirm / Adjust / Re-do visible |
| Happy | Controls hidden on no-submission card | not rendered |
| Edge | Type 9 into Adjust on a 3-max | blocked or inline error, state stays valid |
| Happy | Confirm then view the card | "Confirmed" shown, review chip gone |

**Invariants touched:** I1 (UI side of the bound), presentation only otherwise
**Files likely touched:** the question-card component, a small Adjust control component
**Risks / open questions:** keep the Adjust control inside the existing card style; do not introduce a modal unless Option B is chosen in section 0.

**Definition of Done**
- [ ] All acceptance criteria met
- [ ] Tests for every row in the table, passing, real output pasted
- [ ] Lint + typecheck + build green
- [ ] Blind reviewer returned "No findings"
- [ ] No secrets, no new dependency
- [ ] Journal entry written

**Review log**
| Round | Findings | Fixed? |
|---|---|---|
| 1 | | |

---

## 3. Capacity
| Ticket | Est |
|---|---|
| ADJ-01 | 1.0h |
| ADJ-02 | 0.75h |
| **Total** | **1.75h** |

## 4. Cut list (if time runs out)
| Cut | Consequence | Fallback |
|---|---|---|
| Re-do (keep only Confirm + Adjust) | Tutor cannot re-run one question, only override by hand | Adjust covers the correction; note Re-do as next step |
| "Adjusted by tutor" / "Confirmed" indicators | Less visible provenance | The mark still updates; mention in the reflection |

> **Never cut:** the I1 clamp on human input and the I6 lock test. Those are the two things that keep the tutor's trust.
