## 2026-10-19 · SMOKE-01 · AI connection smoke test (throwaway)

- What the agent did: Wrote `scripts/smoke-test.mjs`. It reads `ANTHROPIC_API_KEY` and `MARKING_MODEL` from env, prints a clear "not set" error and exits 1 if either is missing, otherwise sends one hardcoded prompt to the model and prints the reply. The key's value is never logged, only the reply text or static error strings.
- Where it went wrong / what I corrected, and how I caught it: I could not run the script myself — the user's Bash policy blocks any command that references `.env`, including `node --env-file=.env ...`. I offered an `npm run smoke` workaround (so the Bash command text itself never contains `.env`), but the user chose to run the two checks (valid key, missing key) themselves instead. They report both passed: a real reply printed with the key set, and a clear error with it unset.
- Reviewer rounds: 0 — the blind review step (fresh context, ticket + diff + CLAUDE.md) has not run yet.
- Decision made (and why): Used `node --env-file=.env` instead of adding a `dotenv` dependency, since the project's Node version (22) supports it natively. No new dependency needed.
- Rule added: none yet.

**Not done yet:** the throwaway file (`scripts/smoke-test.mjs`) is still present and already committed (`15260ab`). The ticket's extra Definition of Done says it must be deleted and absent from the final diff. Blind review also still needs to run before this ticket can be marked `done`.

---

## 2026-10-19 · DATA-01 · Exam data loader and read APIs

- What the agent did: Built `lib/validation/schemas.ts` (zod shapes for `exam_data.json`), `lib/exam/loadExam.ts` (loads and validates the file once, builds the full 8-question grid from the question list and attaches each student's response, marking a question `no_submission` if the response is missing or blank), and the two read APIs (`GET /api/submissions`, `GET /api/submissions/[name]`). Added 7 tests covering the list count, Diego's 6/8 split, Aisha's blank Q7, and the 404 for an unknown name. Verified by hand against the running dev server with `curl`.
- Where it went wrong / what I corrected, and how I caught it: Found that an earlier ticket (SETUP-01) never actually installed Vitest or added a `test` script, even though it was supposed to. I couldn't ship DATA-01's tests without it, so I asked the human first, then installed `vitest` and added `vitest.config.ts` (needed to resolve the `@/*` path alias, which Vitest doesn't pick up from `tsconfig.json` automatically). The blind reviewer (round 1) also caught that I'd written the `QuestionStatus` type with two extra values (`"grading"`, `"graded"`) that this ticket never produces, reaching ahead into a future ticket's scope. I narrowed the type back to just what this ticket produces. Round 2 review came back clean.
- Reviewer rounds: 2 · round 1 findings: premature `QuestionStatus` values (fixed), no separate validation on the `[name]` route param (justified with a comment instead), `getStudentNames()` recomputed on every call (justified with a comment, no caching added) · round 2: no findings.
- Decision made (and why): A question counts as "no submission" if its response is missing OR an empty string, not just missing — Aisha's Q7 is present in the data as `""`, and both cases must produce the same `no_submission` marker so invariant I4 holds for both.
- Rule added: none yet, but the SUGGESTED CHANGE below should be applied to the human-owned files so future tickets don't hit the same Vitest gap.

SUGGESTED CHANGE
File: tickets.md
Section: SETUP-01 Acceptance criteria / Test cases
Problem: SETUP-01 says "set up Vitest" in scope, but its acceptance criteria and test cases never actually check that `npm test` runs. The ticket passed review without Vitest being installed, which blocked DATA-01 until it was added there instead.
Proposed text:
Add to SETUP-01's acceptance criteria: "Given the project, when I run `npm test`, then Vitest runs (even with zero test files) and exits 0."
Why: Catches a missing test runner at the ticket that's supposed to set it up, instead of at the next ticket that needs it.

---

## 2026-10-19 · UI-01 · State store and both pages (no grading)

- What the agent did: Built `lib/state/GradingContext.tsx` (Context + reducer holding `results` and `gradingProgress`, one `INIT_EXAM` action) and `lib/state/selectors.ts` (`getStatus`, `getTotal`, both pure). Wired `GradingProvider` into `app/layout.tsx`. Replaced the default scaffold `app/page.tsx` with Screen 1 (fetches the submission list, shows name/status/total per row, links to each student). Added `app/student/[name]/page.tsx` for Screen 2 (fetches the student's grid once, dispatches `INIT_EXAM`, shows 8 cards, greys out no-submission ones, Return link). Added 3 tests in `tests/grading-state.test.ts` matching the ticket's table.
- Where it went wrong / what I corrected, and how I caught it: `npm run build` failed — Next.js 16's Partial Prerendering blocks `useParams()` in a client component unless it's inside a `<Suspense>` boundary. Fixed by splitting Screen 2 into a thin wrapper that renders the real page inside `<Suspense>`. Caught by running the build, not by lint or typecheck (both were already green).
- Reviewer rounds: 1 · round 1 findings: no `.catch` on the two `fetch` calls, so a network failure on either screen would hang silently on "Loading..." forever (fixed — both screens now show a "could not load, try refreshing" message and log the error); student name used unencoded in a URL (`/student/${name}`) (fixed — wrapped in `encodeURIComponent` on both the `Link` href and the fetch URL); default `create-next-app` page `<title>`/description left unchanged (reported, not fixed — it's the browser tab title, not the Screen 1 "exam title" the ticket asks for, so left for UI-02's polish pass).
- Decision made (and why): `QuestionResult` extends the existing `QuestionWithResponse` type from `loadExam.ts` instead of a separate parallel shape, so there is one definition of a question's data instead of two that could drift. Kept `status` narrowed to `"no_submission" | "pending"` for this ticket (matching the precedent set in DATA-01's review), since `"grading"`/`"graded"` are not produced until GRADE-FAKE-01.
- Rule added: none yet.

**Not done yet:** manual click-through in a real browser was not done by the agent (no browser tool available this session) — verified instead via `curl` against the running dev server (API shapes correct, all three routes return 200) and by reading the build/dev-server logs for errors, both before and after the review fixes. The human should do one manual click-through before marking this done.

CodeOwner: I have test everything myself, should be good!
