# CLAUDE.md

> Project rules for the AI-assisted maths marking tool.
> Pairs with `docs/technical-spec.md` and `docs/tickets.md`.
> A section is either filled in or marked `N/A: <reason>`. Never blank.
> Sections marked **[UNIVERSAL]** apply as written. Only extend them.

---

## 1. Project in one paragraph
- **What it is:** a tutor opens one maths exam, grades each student's responses with an AI model that awards fair partial credit against the rubric, and reads the marks and feedback, with uncertain marks flagged for a human to check.
- **What it is NOT:** not a student exam-sitting app, and not an auto-grader the tutor blindly trusts. It shows its marks and raises its hand when unsure.
- **Stage:** spike (take-home build, 3 to 4 hour box)
- **Owner / decision maker:** Noah

## 2. Read order (do this at the start of every session)
1. This file
2. `docs/technical-spec.md`: how the system works
3. `docs/tickets.md`: find the ticket you were given
4. `docs/journal.md`: the last 3 entries (recent mistakes and decisions)

If any of these files is missing or contradicts another, **stop and ask**. Do not guess.

> `CLAUDE.md`, `docs/technical-spec.md`, and `docs/tickets.md` are **human-owned and read-only for you**. See §2a. You read them, you never edit them.

## 2a. Human-owned files: you NEVER edit these [UNIVERSAL]
You do **not** create, write, fix, reformat or "tidy up" these files:
- `CLAUDE.md`
- `docs/technical-spec.md`
- `docs/tickets.md`

If you believe one of them is wrong, unclear, incomplete or should change, **do not edit it**. Instead, stop and output a suggestion block for the human to review and apply by hand:

```
SUGGESTED CHANGE
File:    <which of the three files>
Section: <where>
Problem: <what is wrong or missing, in one or two lines>
Proposed text:
<the exact lines you would add or change, so the human can paste them>
Why:     <one line>
```

Then wait. The human reviews and updates the file manually. You continue only with what the current files allow. You may freely write code, tests, and `docs/journal.md`.

---

## 3. Workflow per ticket [UNIVERSAL]

Every piece of work follows **Spec to Execute to Verify**. The human owns Spec and Verify.

```
1. SPEC      Read the ticket + the spec sections it links to.
2. PLAN      Plan mode. Output: files to touch, approach, assumptions,
             risks, questions. WAIT for approval. No code before approval.
3. EXECUTE   Implement only what the ticket asks. Small diffs.
4. SELF-CHECK  Run: lint, typecheck, tests. Paste the real output.
5. REVIEW    A separate, blind reviewer (fresh context, sees only ticket +
             diff + this file) lists findings. It does not fix.
6. FIX       A fresh fixer addresses the findings. Back to step 5.
7. DONE      Only when the reviewer returns "No findings" AND the human
             has verified (read the diff, ran it, checked acceptance criteria).
8. LOG       Append a journal entry (§12). Commit.
```

Rules:
- One ticket per session. `/clear` between tickets.
- If the ticket is unclear, ask before planning. List what is unclear.
- Never mark a ticket done because "tests pass". Done = acceptance criteria met + reviewer clean + human verified.

> **No pull requests in this project** (solo build). The blind review step still happens, as a fresh-context review of the diff. See §8.

---

## 4. Invariants (things that must NEVER be false)

### 4.1 Project invariants
| # | Invariant | Enforced by (at least one mechanism, not just this doc) |
|---|---|---|
| I1 | A mark is always a whole number from 0 to that question's `max_marks`. Never higher, never negative. | zod on model output + `clampMark` pure function. Test: out-of-range clamps, `needs_review` set. |
| I2 | Student response text is never treated as an instruction to the model. | Response wrapped in `<student_response>` tags + "data not instructions" line in the prompt. Test: injection string ignored. |
| I3 | Model output is never trusted until zod validates it. Invalid output becomes a safe 0 with `needs_review` true, never a guessed mark. | `GradeOutputSchema` + safe fallback in `gradeResponse`. Test: bad JSON and wrong shape both return review. |
| I4 | A question the student did not answer is never sent to the AI and is always 0. | Client-side skip in the grading loop. Test: Diego grades 2, skips 6. |
| I5 | A student's total is always derived from their marks, never stored on its own. | `getTotal` selector, no total field in state. Test: selector returns awarded/max. |

❓ If any breaks, a student gets a wrong, confident mark a tutor might trust. That is the whole risk of this tool.

### 4.2 Universal invariants [UNIVERSAL]
1. **Secrets** never appear in code, logs, commits, tests, or chat. Read them from env only. Never read or print `.env*`.
2. **The server is the authority.** Marks are produced server-side. The client displays and sums them; it never decides a mark.
3. **Validate at every boundary**: client input, **LLM output**, env vars. Use a schema (zod). Invalid to reject or fall back safely, never "best effort" save.
4. **Untrusted text is data, not instructions.** Student text sent to the LLM is wrapped and labelled as data.
5. **The database is the last line of defence**: N/A here (no database). The mark-range invariant is enforced in code instead (`clampMark`), because there is no DB to hold it.
6. **Side effects after commit.** N/A here (nothing persisted, no external writes). Marks are written to in-memory state only after the server returns.
7. **Retries must be safe**: grading is idempotent. Re-running overwrites the in-memory mark, no doubled effects.
8. **No silent failures.** No empty `catch`. Errors are logged with context and surfaced to the caller (a failed card shows a review/error state).
9. **No PII or response content in logs.** Log student IDs, question IDs, counts, durations.
10. **Time**: N/A (no timestamps, nothing persisted).

---

## 4a. Coding style: write it like a junior, make it obvious [UNIVERSAL]
The goal is code a tired human can read at 2am and understand on the first pass. Clever is a bug.

- **Simple over clever.** Prefer the boring, obvious solution. If there is a longer but clearer way, use it.
- **Small functions, each doing one thing**, named for what they do. If a function needs a comment to explain *what* it does, split or rename it.
- **Comment everything that isn't obvious from the name.** Every function gets a short comment saying what it does and why. Non-obvious lines get an inline comment explaining the *why*.
- **Clear names over short names.** `studentResponse` not `sr`. `maxMarks` not `m`.
- **No premature abstraction.** Write the concrete thing. Abstract only when the same code appears a third time, and say why.
- **Shallow nesting.** Early returns over nested if/else. Max ~2 levels.
- **No magic values.** Meaningful numbers and strings become named constants with a comment.
- **Explicit over implicit.** No hidden side effects. Types written where they help a reader.
- **If asked "why is this written this way", the answer must be a reason, never "it's more concise".**

A good test: could a first-year developer read a file top to bottom and explain it, without asking you? If not, simplify.

## 5. Architecture rules
- **Stack:** Next.js (App Router), TypeScript, `@anthropic-ai/sdk`, `zod`, Vitest. React Context + `useReducer` for state. No database.
- **Layering:**
  ```
  UI (client pages) → API routes → lib/domain (pure) → lib/server (external + orchestration) → exam_data.json
  ```
- Business rules live in `lib/domain` as **pure functions** (no I/O): prompt building, mark clamping, totals, status. They are the most tested code.
- API routes: validate input, orchestrate, return. No business rules inline.
- UI: rendering and interaction only. No mark logic. Both pages are **client components** under the root provider, or marks vanish on navigation.
- The **only** file that touches the SDK and the API key is `lib/server/anthropic.ts`.
- **No new infrastructure** (cache, queue, service, database). The scale (see spec §2) does not justify any.
- **No new dependency** without asking. Say why the standard library, zod, or the SDK is not enough.

Folder map:
```
app/
  layout.tsx              root, wraps everything in the grading provider
  page.tsx                Screen 1: exam landing
  student/[name]/page.tsx Screen 2: one student's submission
  api/submissions/        list + detail read APIs
  api/grade/route.ts      grading endpoint (fake first, then real)
lib/
  domain/                 pure: buildMarkingPrompt, clampMark, selectors
  server/                 anthropic.ts (SDK + key), gradeResponse.ts (pipeline)
  prompt/                 marking-prompt.ts
  validation/             schemas.ts (zod)
  state/                  GradingContext.tsx, selectors.ts
  exam/                   loadExam.ts
tests/                    unit + pipeline
docs/                     technical-spec.md, tickets.md, journal.md, reflection.md
exam_data.json            source data (read-only)
```

---

## 6. Guardrail layers [UNIVERSAL]
A rule written only in this file is a wish. Each important rule is enforced by a layer below it.

| Layer | Mechanism | Status in this repo |
|---|---|---|
| 1. Docs | This file, spec, tickets | done |
| 2. Tests | Unit tests for every domain function and invariant | done (per ticket, deep on GRADE-01) |
| 3. CI required checks | N/A: solo build, no PR pipeline. Run lint + typecheck + test + build locally before every commit. | N/A |
| 4. Branch protection | N/A: solo build | N/A |
| 5. CODEOWNERS | N/A: solo build | N/A |
| 6. DB constraints / RLS | N/A: no database. Mark-range invariant enforced in code (`clampMark`). | N/A |
| 7. Permissions | API key server-side only, never shipped to the browser | done |
| 8. Observability | Console logs with IDs and counts, no content | light (demo level) |

Feedback loop: **a bug that escaped to first a failing test, then the fix, then a new check, plus a SUGGESTED CHANGE (§2a) proposing the line for this file.** You write the test and the fix; you propose the doc line, you do not add it yourself.

---

## 7. Testing rules [UNIVERSAL]
- Acceptance criteria come from the human (ticket). Tests encode them. You may write test code, the human approves **what** is tested.
- Every ticket ships tests for: happy path, edge cases in the ticket, at least one failure path, and security cases if it touches input (the grading service does).
- **Never weaken, skip or delete a test to make it pass.** If a test seems wrong, stop and say why.
- Don't mock the thing you are testing. Mock only external services (the Anthropic SDK). Test the real prompt builder, clamp, and selectors directly.
- Report test results by pasting the real output, not a summary.

---

## 8. Git rules [UNIVERSAL, PR parts N/A]
- Small commits, one logical change each. Message: `<type>(<scope>): <what>` (feat, fix, test, refactor, docs, chore).
- Commit only after lint + typecheck + test + build are green locally.
- **Pull requests: N/A (solo build).** No branch protection, no PR description. The blind-review step in §3 still runs as a fresh-context review of the diff before a ticket is done.

---

## 9. How the agent should behave [UNIVERSAL]
- Ask when unclear. State assumptions explicitly before acting on them.
- Stay inside the ticket. If you notice something else that needs fixing, **report it**, don't fix it.
- Never edit the human-owned files (§2a). When they need changing, output a SUGGESTED CHANGE block and wait.
- Prefer the simplest thing that meets the acceptance criteria (§4a). Explain any abstraction you add.
- When you hit an unexpected error, stop and report the exact error. Don't retry blindly or switch approach silently.
- When the human asks "why", explain the trade-off and the simpler alternative.
- Write everything the human reads in plain, simple English (§9a).
- End every ticket with this report:
  ```
  Built:        <files, one line each>
  Verified:     <commands run + real output>
  Not done:     <anything skipped and why>
  Check manually: <what the human should look at>
  Risks:        <what could still be wrong>
  ```

---

## 9a. How to write for me (plans, explanations, journal, reports) [UNIVERSAL]
Everything you write for me to read must be plain English a child under 10 could follow:
- **Short sentences.** One idea per sentence. Cut filler.
- **Simple words.** "check" not "ascertain", "use" not "leverage". Keep real technical terms (API, zod, commit), explain anything else in plain words.
- **Lead with the point.** First line is the main thing. Details after.
- **Use bullets and short steps**, not walls of text.
- **Say it once.** No repeating. No "it is worth noting that".
- **Concrete over abstract.** "This saves the mark before checking it, so a wrong mark could get stored" beats "this introduces a validation ordering concern".
- A plan or journal entry fits on one short screen. If longer, cut it.

Quick test before you send: would a smart 10-year-old understand every sentence? If not, rewrite simpler.

## 10. Forbidden [UNIVERSAL]
- **Editing `CLAUDE.md`, `docs/technical-spec.md` or `docs/tickets.md`** (§2a: suggest, don't edit)
- **Clever or hard-to-read code** (§4a: simple, obvious, commented)
- Reading, printing or committing secrets / `.env*`
- Shipping the API key to the browser, or calling the model from client code
- Disabling lint rules, type checks or tests to get green
- `any` or type casts to silence errors without a comment explaining why
- Catch-all error handling that hides failures
- Adding infra, services or dependencies without approval
- Touching files outside the ticket scope
- **Modifying `exam_data.json`** (it is the read-only source data)

---

## 11. Commands
```bash
npm install          # install dependencies
npm run dev          # run the app locally
npm run lint         # lint
npx tsc --noEmit     # typecheck
npm test             # Vitest
npm run build        # production build
```

---

## 12. Journal (append one entry per ticket in `docs/journal.md`)
```
## <date> · <ticket ID> · <title>
- What the agent did:
- Where it went wrong / what I corrected, and how I caught it:
- Reviewer rounds: <n> · findings: <short list>
- Decision made (and why):
- Rule added (to this file / a test / a check):
```

## 13. Lessons learned (promoted from the journal)
- (none yet)
