# FIX-01 · Robust JSON parse + reasoning field (stop false "Could not grade")

> Small, surgical bug fix. Four tiny edits across four files. No change to the
> client contract, the UI, or the overall architecture. Built from the base
> template, PR ceremony dropped. Pairs with `CLAUDE.md`.
>
> **Read these files first before editing:** `lib/server/anthropic.ts`,
> `lib/server/gradeResponse.ts`, `lib/prompt/marking-prompt.ts`,
> `lib/validation/schemas.ts`. Apply the changes against the real code, not from memory.

---

## 1. The problem (with evidence)

The live test suite (`npm run test:live`, file `tests/live-grading.test.ts`) fails
intermittently. Across two runs, 2 to 5 of 38 cases failed. **Every failure is the
same thing**, not the AI marking wrong:

```
gradeResponse: safe fallback for Q3 (model reply was not JSON)
gradeResponse: safe fallback for Q5 (model reply was not JSON)
```

The mark the model produced was actually correct; it just got thrown away.

The mocked unit tests never caught this, because the mocks always return clean JSON.

## 2. Root cause (confirmed by dumping raw replies)

On harder questions, the model writes its reasoning as **prose first**, then puts the
JSON object at the **end** of the reply. Example (real):

```
The student gives x = 1, y = 9 with no working. Checking the equations...
...so the method mark can't be awarded.

{"mark": 0, "feedback": "...", "needsReview": true}
```

`gradeResponse` runs `JSON.parse` on the **whole string**. The prose at the front is
not valid JSON, so `JSON.parse` throws, and the code drops to the safe fallback
(`mark: 0`, feedback "Could not grade this response automatically.").

Note: the original design (GRADE-01) had a `reasoning` field inside the JSON. The built
`GradeOutputSchema` dropped it, so the model now reasons **outside** the JSON. Two
things are needed: give the model a sanctioned place to reason (inside the JSON), and
make the parser tolerant of prose around the JSON.

Invariant I3 was never broken: a failed parse becomes a safe result, never a crash or a
guessed mark. The bug is that it fails far too often on good answers.

---

## 3. The fix (four small edits)

### Edit A: `lib/validation/schemas.ts` (add one schema, keep the old one)
The client-facing `GradeOutputSchema` (`{ mark, feedback, needsReview }`) **stays exactly
as is**. Add a separate schema for the model's raw reply, which now also carries an
optional reasoning field:

```typescript
// What the MODEL returns. Same as GradeOutput plus an optional, short
// reasoning field that we log for debugging and never send to the client.
export const ModelReplySchema = GradeOutputSchema.extend({
  reasoning: z.string().optional(),
});
export type ModelReply = z.infer<typeof ModelReplySchema>;
```

> **Do NOT put a max length on `reasoning` in the schema.** A hard cap would reject a
> long reasoning and send us straight back to the fallback. Keep brevity as a prompt
> request (Edit C), not a schema rule.

### Edit B: `lib/server/gradeResponse.ts` (the real fix)
Two small changes, both inside the existing function. Keep the existing safe-fallback
path untouched as the last line of defence.

1. Before parsing, pull the JSON object out of the reply. Add this helper:

```typescript
// The model sometimes writes reasoning prose before the JSON object.
// Parsing the whole reply then fails, so slice out the object: from the
// first "{" to the last "}". If there is none, the caller falls back.
function extractJsonObject(reply: string): string | null {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    return null;
  }
  return reply.slice(start, end + 1);
}
```

2. In the function, parse the extracted slice with `ModelReplySchema`, log the reasoning
   for visibility, and return the **same client shape as before** (reasoning stripped):

```typescript
const jsonText = extractJsonObject(reply);
if (jsonText === null) {
  return safeFallback(questionId); // unchanged existing path
}

let parsed;
try {
  parsed = ModelReplySchema.parse(JSON.parse(jsonText));
} catch {
  return safeFallback(questionId); // unchanged existing path
}

// Log the model's thinking for debugging only. Never return it to the
// client, and only log it outside production, because reasoning can
// quote the student's response (CLAUDE.md: no response content in logs).
if (parsed.reasoning && process.env.NODE_ENV !== "production") {
  console.log(`gradeResponse: ${questionId} reasoning: ${parsed.reasoning}`);
}

const mark = clampMark(parsed.mark, maxMarks); // unchanged (invariant I1)
return { mark, feedback: parsed.feedback, needsReview: parsed.needsReview };
```

> Adapt variable names to the real file. The shape returned to the caller does not
> change, so the API and UI are untouched.

### Edit C: `lib/prompt/marking-prompt.ts` (give it a place to think)
Change the required output so the model reasons **inside** the JSON, briefly, and
emits nothing outside it. Keep the rest of the prompt as is. The JSON block becomes:

```
Reply with a single JSON object and NOTHING before or after it:
{
  "reasoning": "<your marking thinking, at most 2 short sentences>",
  "mark": <whole number 0 to max>,
  "feedback": "<one or two sentences for the student>",
  "needsReview": <true or false>
}
```

Add one line of instruction: "Do not write anything before or after the JSON object."

### Edit D: `lib/server/anthropic.ts` (two lines)
Reasoning makes replies a little longer, and we want stable marking. Change:

```typescript
const MAX_REPLY_TOKENS = 1024; // was 500: room for a short reasoning field
```

and in the `messages.create` call add one line:

```typescript
  const message = await getClient().messages.create({
    model,
    max_tokens: MAX_REPLY_TOKENS,
    temperature: 0,            // deterministic marking, steadier results
    messages: [{ role: "user", content: prompt }],
  });
```

Nothing else in `anthropic.ts` changes. It stays a dumb wrapper: call the API, return
text. It must not know about JSON or marking.

---

## 4. What must NOT change
- The client-facing output stays `{ mark, feedback, needsReview }`. The API route and the UI are untouched.
- `reasoning` is logged server-side only (dev only), never returned to the client.
- The existing safe-fallback path stays. Bad or missing JSON still becomes a safe `needs_review` result (invariant I3).
- `clampMark` and invariant I1 stay. Do not remove the clamp.
- Do not weaken, skip, or delete any existing test to make it pass.
- `anthropic.ts` stays a thin wrapper with no parsing logic.

---

## 5. Tests

### Add (this is the gap the old mocks missed)
In the normal (mocked, fast) suite, add unit tests on `gradeResponse` that feed replies
with prose around the JSON. These would have caught the bug:

| Type | Mocked model reply | Expected |
|---|---|---|
| Edge | prose, then a valid JSON object at the end | parsed correctly, real mark, **not** the fallback |
| Edge | prose before AND after the JSON | parsed correctly |
| Edge | a reply with a `reasoning` field present | mark/feedback/needsReview returned; reasoning NOT in the returned object |
| Failure | a reply with no `{...}` at all | safe fallback, needsReview true (I3) |
| Failure | a `{...}` that is not valid JSON | safe fallback (I3) |

Mock `callMarkingModel` to return each string. These run in `npm test`, fast, no API cost.

### Keep
- All live tests stay. Do not loosen their mark ranges.
- `temperature: 0` should make the `needsReview`-exact assertions steadier. If a
  `needsReview` check is still occasionally flaky, that is the model's inherent
  nondeterminism, not this fix; note it, do not widen a mark range to hide it.

---

## 6. Definition of Done
- [ ] The four edits applied; diffs are small and local
- [ ] New mocked tests for prose-around-JSON pass (real output pasted)
- [ ] `npm test` green; `npm run test:live` run twice, and the "model reply was not JSON" fallbacks are gone on good answers (paste both runs)
- [ ] Lint + typecheck + build green
- [ ] Client output shape unchanged; UI still works
- [ ] No reasoning in production logs, none returned to the client
- [ ] Journal entry: the bug, the root cause, the fix, and the new prose-around-JSON test as the guard

**Review log**
| Round | Findings | Fixed? |
|---|---|---|
| 1 | | |
