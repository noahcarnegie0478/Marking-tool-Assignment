# Reflection

**What I wrote vs delegated.**
I own the thinking, the agent owns the typing. I did the analysis and wrote the three files that hold the project's context (CLAUDE.md, the spec, the tickets) and the test process. I treat the agent like a strong engineer with no direction: in Specification to Execution to Verification, I take the first and last, it takes the middle.

**Where I corrected the agent, and what caught it.**
A student answer with a literal `</student_response>` tag could close the data block early, the exact injection the design should stop, and the first version had no test for it. My test process plus a blind review (a fresh agent that sees only the ticket and the diff) caught it; I escaped the brackets and added a test. "Tests pass" was never enough on its own.

**How I knew the prompt was working.**
I built it the way I learn any AI: find the traps a student could use to break it, ask what-if questions, then make sure the prompt blocks each one. On the arguable marks (Ben Q1, Chen Q2, Q4, Q6) I don't test for an exact number, only that it stays in a defensible range and flags needs_review. Before production I'd test on a larger set and run each answer more than once.

**Tricky or ambiguous responses.**
Answer-only, contradiction, and truncated cases I handled by patching the rubric's silent cases in the prompt and flagging needs_review instead of guessing. The hardest one broke the system first (the tag-breakout above), but the review fenced it before the ticket was done.

**Handling the text before the model.**
Two untrusted inputs, two gates. Before: validate the payload, skip blank answers, wrap the student text as data with its brackets escaped. After: validate the model's output with zod and clamp the mark in code, so any failure returns a safe "0, needs review", never a crash or a confident fake mark.

**Biggest gap if it went live tomorrow.**
The rubric is an input too, and a weak one quietly produces wrong marks a tutor might trust. The real fix is writing rubrics the AI reads the same way every time; until then a tutor should treat every mark as a first draft. (Also: these are minors' answers sent to a third party, with nothing saved or anonymised yet.)

**What's next.**
Handle submissions properly, add per-question AI re-marking so a tutor can redo or adjust one answer, and polish the UI.
