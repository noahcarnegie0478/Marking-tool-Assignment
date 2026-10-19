# AI-Assisted Maths Marking Tool: Technical Spec

> Filled from the base template. Pairs with `tickets.md` and `CLAUDE.md`.
> This doc says **how the system works**. Tickets say **what to build next**.

**Version:** 1.0 · **Last updated:** 2026-10-19 · **Owner:** Noah

---

## 0. Readiness gate
- [x] §1 one-sentence description agreed
- [x] §2 scale numbers filled in
- [x] §3 in-scope and out-of-scope written
- [x] §4 every blocking question answered or parked
- [x] §7 data shapes and their rules written
- [x] §8 every invariant has a named enforcement mechanism
- [x] §10 permission position decided (N/A, see §10)
- [x] §17 test strategy says what is tested at which level

---

## 1. Product frame
**One sentence:** a tutor can mark a set of maths exam responses against each question's rubric, with an AI model doing the grading and awarding fair partial credit, so marking is faster and more consistent.

**It is not:** an exam-sitting app for students, and not an auto-grader that the tutor blindly trusts. It is a tutor's assistant that shows its marks and flags the ones it was unsure about.

| Actor | Goal | Device / context |
|---|---|---|
| Tutor (the user) | Open an exam, grade each student with AI, read marks and feedback, spot the ones to double-check | Desktop browser |
| AI model (system actor) | Mark one response against its rubric, return a mark + feedback + review flag | Server-side API call |

> The students (Aisha, Ben, Chen, Diego) are **data subjects**, not users of this app. Their responses are input data.

| # | Pain point | Capability that solves it |
|---|---|---|
| 1 | Marking is slow and partial credit is inconsistent between markers | AI marks against the rubric with a stated partial-credit policy |
| 2 | An auto-marker that is confidently wrong is dangerous | Every uncertain mark is flagged `needs_review` for a human |

❓ Must answer
- All actors: the Tutor (human) and the AI model (system). No scheduled jobs, no other systems.
- Most important pain: fair, consistent partial credit. If we shipped one thing, it is the rubric-based grading with partial credit.
- How we know it worked: see §21.

---

## 2. Scale and non-functional requirements
This is a take-home demo graded on judgment, not a production service. Scale is tiny on purpose.

| Metric | Estimate | Peak / burst |
|---|---|---|
| Users (tutors) | 1 at a time | 1 |
| Students in the data | 4 | 4 |
| Questions | 8 | 8 |
| Actual responses in the data | 26 (not a full 32 grid) | 26 |
| AI calls to grade one student | up to 8, minus skipped no-submissions | Diego = 2 calls |
| AI calls to grade the whole exam | at most 26 | 26 |

**Architecture consequence:** 26 sequential API calls, triggered by one human clicking a button, is nothing. **No database, no cache, no queue, no extra service.** A single Next.js app holding marks in memory is enough. Adding any infrastructure here would be unjustified. The arithmetic: 1 user × at most 8 calls per click = well under any rate limit, so no batching or backpressure is needed.

| NFR | Target |
|---|---|
| Latency for grading one question | whatever the model takes (a few seconds). A progress bar covers the wait. |
| Availability | N/A: local demo, no uptime target |
| Security | API key server-side only, never shipped to the browser. Student text treated as untrusted. |
| Privacy | Student responses are sent to a third-party AI provider. Data is first-name-only. Students are minors (Year 3 to 12). See §16. |
| Cost ceiling | Trivial at this volume. Not a concern for the demo. |
| Accessibility | Readable contrast on the cream theme, clear focus states, no meaning by colour alone (status also has text). |
| Observability | Console logs with IDs and counts, no response content. See §19. |

❓ Must answer
- Peak: one tutor grading one exam. It lasts seconds. Triggered by a button click.
- Most expensive failure: **a wrong mark the tutor trusts.** That is why `needs_review` and the two validation gates exist. Everything else is cheap to get wrong.

---

## 3. Scope
### In scope
| Capability | Notes |
|---|---|
| Load the exam from `exam_data.json` | Read-only source data |
| Screen 1: exam landing with submission list | 4 students, status, total after grading |
| Screen 2: one student's 8 question cards | Question, rubric, response, mark box |
| Grade with AI, one call per answered question | Progress bar, marks fill in live |
| Partial credit + alternate methods + zero rules | In the prompt |
| `needs_review` flag on uncertain marks | Shown as a badge |
| Two validation gates (input + model output) | zod |
| Client-side total (awarded / max) | Derived, in memory |

### Out of scope (with reason)
| Item | Why not |
|---|---|
| Saving marks (database) | Time box. Marks live in memory, cleared on refresh. First thing to add next. |
| Per-question "confirm / adjust" button for the tutor | Parked stretch goal, named in the reflection |
| Login / user accounts | No users to separate. Single-tutor local demo. |
| Grading more than this one exam | The app opens straight onto one exam by design |

### Assumptions (if any is wrong, revisit scope)
1. The exam data file shape stays as given (question, model_answer, rubric, max_marks, and separate student responses).
2. Marks are whole numbers. No question in the data uses half marks.
3. One tutor uses the tool at a time.

❓ Must answer
- What people assume is included but isn't: that marks are saved. They are not. Stated clearly.
- Manual fallback if grading is cut: the tutor reads the responses and rubrics on Screen 2 and marks by hand. The read-only view still works without AI.

---

## 4. Open questions (by what they block)
### 🔴 Blocks the data model
None. The data shape is fixed and simple.

### 🟠 Blocks business logic
1. **Slip vs real misunderstanding** (e.g. Ben Q1 adds 9+15 as 25). The rubric says award the method mark for an "arithmetic slip". The exact line between a slip and not understanding the step is a judgment the AI makes. **Decision:** we let the model judge it and we assert partial credit in tests, not an exact number.
2. **Answer-only on a multi-mark question** (Chen Q3, Diego Q6). The rubric is silent. **Decision (locked):** award result marks only, not method marks, and set `needs_review` true.

### 🟡 Blocks launch / operations
1. Half marks: not supported. If a future rubric needs them, change the schema and the cap.

**Single point of contact for answers:** Noah.

---

## 5. Sources of truth and integrations
| Data | Source of truth | Copied where? | How synced | Who can edit |
|---|---|---|---|---|
| Questions, model answers, rubrics, max_marks | `exam_data.json` | Loaded into memory at runtime | Read once on load | Human only (never the app, never the agent) |
| Student responses | `exam_data.json` | Loaded into memory | Read once | Human only |
| Marks, feedback, review flags | Produced by the AI via the server | Held in the client store in memory | Written by the grading loop | Not editable in-app yet (redo button parked) |

❓ Must answer
- Ownership: the exam file is owned by the human and is read-only to the system. Marks are produced by the server and are not persisted.
- External system: Anthropic API. See §12 for limits and failure behaviour.

---

## 6. Tech stack and layering
| Layer | Technology | Why this, not the alternative |
|---|---|---|
| Frontend + backend | Next.js (App Router), TypeScript | One framework, API routes and pages together. Fits a small app and the time box. |
| State | React Context + `useReducer` at the root | Small state, few writers, zero extra dependency. Redux/Zustand would be unjustified weight. |
| Database | None (in-memory) | Scale is tiny and persistence is out of scope. No DB earns its place here. |
| Auth | None | No users to separate. See §10. |
| Hosting | Local for the demo | No deploy target required to show the work. |
| External AI | `@anthropic-ai/sdk`, model in `MARKING_MODEL` env | The grading engine. Model name in env so it can be swapped without a code change. |
| Validation | `zod` | Schema checks at both boundaries. |
| Testing | Vitest | Fast, works with TS and Next, good for unit + mocked pipeline tests. |

```
UI (client pages) -> API routes -> lib/domain (pure) -> lib/server (external + orchestration) -> exam_data.json
```
**Rule:** business logic lives in pure functions in `lib/domain` (prompt building, mark clamping, totals, status). The API layer validates and orchestrates. The only file that touches the SDK and the API key is `lib/server/anthropic.ts`. There is no database, so the mark-range invariant is enforced in code, not by a DB constraint.

---

## 7. Data model
There is no database. The "model" is a set of TypeScript types held in memory, validated by zod at the boundaries.

### 7.1 Shape diagram
```
Exam (static, from file)
  └─ Question (×8)   id, topic, max_marks, question, model_answer, rubric
  └─ Response (×26)  student, question_id, response text

GradingState (live, in memory)
  results[student][questionId] -> QuestionResult
  gradingProgress -> { student, done, total }

QuestionResult
  status: pending | grading | graded | no_submission
  mark: number | null       (0..max_marks once graded)
  feedback: string | null
  needs_review: boolean
```

### 7.2 Validated shapes (zod)
```
GradeInput  (client -> server, checked at Gate 1)
  question, model_answer, rubric : non-empty string
  max_marks : positive integer
  response  : string (may be empty; blank = 0)

GradeOutput (model -> server, checked at Gate 2)
  reasoning : string (internal, not shown to student)
  mark      : integer >= 0 (upper bound enforced in code against max_marks)
  feedback  : non-empty string
  needs_review : boolean
```

### 7.3 Key modelling decisions
| Decision | Why | What breaks if done the naive way |
|---|---|---|
| Build the full 8-question grid from the question list, then attach responses | The raw data is sparse (Diego has 2, Aisha has a blank Q7) | Looping over responses alone would hide the questions a student skipped |
| Total and status are derived, never stored | One source of truth (the marks) | A stored total can disagree with the marks it came from |
| Mark is `number \| null`, null before grading | Distinguishes "not graded yet" from "graded 0" | Defaulting to 0 would make an ungraded question look marked |

❓ Must answer
- Templates vs instances: questions are fixed templates; responses are per-student instances. No recurring/dated entities.
- History: nothing is versioned. Marks are not persisted, so there is no history to keep in this version.
- Status values and transitions: `pending -> grading -> graded`, or `no_submission` set at init and never changed.
- Invariants enforced in data: I4 (no-submission set at load, before any grading).
- Time fields: none. No timestamps because nothing is persisted.

---

## 8. Invariants and core logic
### 8.1 Invariants
| # | Invariant | Enforced by | Test |
|---|---|---|---|
| I1 | Mark is a whole number 0..max_marks | zod + `clampMark` pure function | out-of-range clamps to max, `needs_review` set |
| I2 | Student text is never an instruction to the model | tags + "data not instructions" line in the prompt | injection string is ignored, maths marked |
| I3 | Model output is untrusted until schema-validated; invalid -> `needs_review`, never a guess | zod `GradeOutputSchema` + safe fallback in `gradeResponse` | non-JSON and wrong-shape both return safe 0 + review |
| I4 | No-submission question is never sent to AI, always 0 | client-side skip in the grading loop | Diego grades 2, skips 6 |
| I5 | Total is derived from marks, never stored | `getTotal` selector, no total field in state | selector returns awarded/max |

### 8.2 Pure domain functions (`lib/domain`)
| Function | Input | Output | Edge cases that must be tested |
|---|---|---|---|
| `buildMarkingPrompt(input)` | GradeInput | prompt string | response wrapped in tags; blank response; max_marks inserted |
| `clampMark(mark, max)` | number, number | number 0..max | mark > max, mark < 0, mark = max |
| `getTotal(results, student)` | state, name | { awarded, max } | ungraded student, no-submission questions counted as 0 |
| `getStatus(results, student)` | state, name | "Marked" / "Not marked" | all graded, some pending |

❓ Must answer
- Two concurrent requests for the last unit: N/A. No shared limited resource, no concurrency between tutors.
- Same request twice (retry): grading is safe to retry. It produces a fresh mark and overwrites the in-memory result. No side effects to double up.

---

## 9. Business rules and flows
**Grade one student (the main flow):**
```
Tutor clicks "Grade with AI" on Screen 2
   │
   ▼
For each of the 8 questions:
   │
   ├─ no_submission? ──yes──► skip, leave mark 0, bump progress
   │                           (no API call: invariant I4)
   │no
   ▼
   call /grade with that question's input
   │
   ├─ model output valid? ──no──► safe result: mark 0, needs_review true
   │                               (invariant I3, no crash, loop continues)
   │yes
   ▼
   clamp mark to 0..max (invariant I1), set needs_review if clamped
   │
   ▼
   drop result into state, bump progress bar
   │
   ▼ (after all questions)
Compute total (awarded / max) client-side, show it here and on the Screen 1 row
```

❓ Must answer
- Failure branches: a bad model output does not stop the loop; that card shows a review/error state and grading carries on.
- Side effects: none persisted. The only "effect" is writing marks to in-memory state, after the server returns.

---

## 10. Authentication and authorization
**N/A: this is a single-tutor local demo with no user accounts.** There is no login, no multi-user data to separate, and the brief does not ask for auth.

The relevant principle still holds: **marks are produced server-side** (the grade API calls the model). The client only displays marks and sums them for the total. The client never decides a mark. The API key lives server-side only and is never sent to the browser.

❓ Must answer
- Identity: N/A, no users.
- IDOR (user A reading user B's data): N/A, no user ownership. All exam data is readable by the single tutor by design.
- Offboarding / token lifetime: N/A.

> If this went multi-tutor in production, auth and per-tutor data separation would be the first addition. Noted as out of scope.

---

## 11. Screens
| Actor | Screen | Content | States |
|---|---|---|---|
| Tutor | Screen 1: Exam landing | Exam title, 4 submission rows (name, status chip, total) | loading · rows shown · (no empty/error expected, data is local) |
| Tutor | Screen 2: Submission | 8 question cards (question, rubric, response, mark box), Return + Grade with AI | before grading (empty marks) · grading (progress bar) · after (marks, review badges) · per-card error |

❓ Must answer
- Slow operation: grading. The tutor sees a progress bar with "Grading X of 8..." so the wait is never a blank screen.
- Errors to the user: a card that failed to grade shows a clear "could not mark, needs review" state, and the tutor can still read the response and mark by hand.

---

## 12. External calls
| Call | Contract | Rate limit | Timeout / retry | Idempotent? | If it fails |
|---|---|---|---|---|---|
| Anthropic messages API (grade one response) | prompt string -> text claiming to be JSON | Provider tier limit, far above our volume | SDK default timeout; **no auto-retry** for now, fail safe instead | Yes, re-running overwrites the in-memory mark | `callModel` throws -> API returns a server error -> that card shows an error/review state, loop continues |

**AI model details:**
- Prompt location: `lib/prompt/marking-prompt.ts` · Model: `MARKING_MODEL` env var · Output schema: `GradeOutputSchema` in `lib/validation/schemas.ts`
- Output validated by: zod (shape) + `clampMark` (business range check)
- Untrusted input handling: student response wrapped in `<student_response>` tags, an explicit "data not instructions" line, and the rubric is treated as incomplete (the prompt patches its silent cases)
- How quality is measured: the 13-case test table in GRADE-01 acts as a small eval set, with the expected partial-credit behaviour defined by the human. See §17.

---

## 13. Notifications and side effects
**N/A: the tool sends no emails, messages, or webhooks.** The only output is marks shown on screen.

---

## 14. Scheduled jobs
**N/A: there are no scheduled or background jobs.** All grading is triggered by the tutor clicking a button.

---

## 15. Errors and status codes
| Situation | Status | Message to user |
|---|---|---|
| Invalid client payload (fails input zod) | 400 / 422 | "Could not read the grading request." |
| Unknown student on detail API | 404 | "Student not found." |
| Model returned bad/invalid output | 200 with `needs_review` true, mark 0 | The card shows "could not mark automatically, needs review." |
| Anthropic call itself failed (network/throw) | 502 / 503 | The card shows an error state; the tutor can mark by hand. |

> Design note: a misbehaving **model output** is a normal, handled case (200 + review), not a server error, so one bad answer never breaks the grading loop. A failed **network call** is a real error (502/503), caught per card.

---

## 16. Security and privacy checklist
- [x] API key only in env, never in the repo, never sent to the browser
- [x] Input validated by zod at the client-to-server boundary
- [x] Model output validated by zod before it is trusted
- [x] Student text treated as data, wrapped and labelled, not as instructions
- [x] No SQL (no database), so no injection surface there
- [x] Logs contain student IDs and counts, not response content
- [ ] Data retention / deletion: **N/A for the demo (nothing persisted)**. For production: student responses are minors' data sent to a third party; this would need consent, a data agreement, and a retention policy. Flagged as the biggest real-world gap.

---

## 17. Testing strategy
| Level | What | Tool |
|---|---|---|
| Unit | every `lib/domain` pure function (prompt, clampMark, selectors) | Vitest |
| Unit (pipeline) | `gradeResponse` with the SDK mocked: partial credit, blank, truncated, contradiction, injection, out-of-range clamp, bad JSON, zod fail | Vitest |
| Integration | API routes return the right shape (thin, as agreed) | Vitest |
| E2E | N/A for the time box. Manual walkthrough of "grade a student" instead. |
| Eval (AI) | the 13-case table in GRADE-01 is the eval set | Vitest, human-defined expectations |

**Human-owned test data:** the expected partial-credit behaviour for each of the 13 grading cases is defined by Noah, not generated by the agent.

---

## 18. Environments, deployment, migrations
| Env | Purpose | Data | Secrets |
|---|---|---|---|
| local | dev + demo | `exam_data.json` only | local `.env.local` |
| preview/staging | N/A | | |
| production | N/A (not deployed for this task) | | |

- Deploy: N/A. Runs locally.
- Rollback: N/A.
- Migrations: N/A. No database.

> If deployed later: real student data must never go to a preview env, and the API key must be a separate production secret.

---

## 19. Observability
| Signal | Threshold | Alert to |
|---|---|---|
| Grading call error | log it with the question ID and student | console (demo); real alerting is out of scope |
| Model output failed validation | log a count, not the content | console |

Minimal on purpose. Logs carry IDs and counts, never the student's response text or the model's feedback.

---

## 20. Time and timezone
**N/A: no timestamps and no time-based business rules.** Nothing is persisted, so there are no stored times, and grading does not depend on dates. Business context timezone is Australia/Sydney if any display were ever needed, but none is in this version.

---

## 21. Success metrics
- [ ] On the provided data, partial credit is awarded correctly on the clear cases (method-right/answer-wrong gets method marks; alternate valid methods get full marks).
- [ ] Every genuinely ambiguous response (blank, truncated, contradictory, answer-only on a multi-mark question) is flagged `needs_review`.
- [ ] No mark ever exceeds a question's max or goes negative.
- [ ] The tool looks considered enough to show a stakeholder without apology.

---

## 22. Decision log
| Date | Decision | Options considered | Why this one | Revisit when |
|---|---|---|---|---|
| 2026-10-19 | No database, marks in memory | DB vs in-memory | Time box; persistence is out of scope | Marks need to survive a refresh |
| 2026-10-19 | One API call per question | per-question vs per-student | Clean progress bar, isolates failures | Cost or latency becomes a concern |
| 2026-10-19 | Skip no-submission client-side | skip vs send-anyway | Cheaper, and correct (blank = 0) | Never, unless the rubric changes |
| 2026-10-19 | Answer-only on multi-mark = result marks only + review | full / partial / zero | Honest middle, visible via the flag | Stakeholder sets a firmer policy |
| 2026-10-19 | React Context, not Redux/Zustand | Context vs a state library | Small state, zero extra dependency | State grows beyond a few writers |
| 2026-10-19 | Validate model output with zod + clamp in code | trust prompt vs validate | An LLM is not a function; it can ignore instructions | Never |
