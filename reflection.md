# Reflection

This tool lets a tutor open one Year 12 maths exam, grade all four students with AI, and read the marks and feedback. It is not meant to be trusted blindly. Every mark the AI is not confident about gets a **Needs review** badge, so the tutor's eye goes straight to the response they still need to check by hand. A mark is always a whole number between 0 and the question's max — the code clamps it, so a bad model reply can never show up as a wild or negative number.

The biggest risk with a tool like this is a confident, wrong mark. That is why `needs_review` exists everywhere a result could be shaky: bad or missing model output, a model call that fails outright, and genuinely ambiguous responses (answer-only on a multi-mark question, for example). All three land in the same visible badge, so the tutor never has to guess which marks are solid.

What I would build next, if I had more time: a per-question **redo / adjust** button, so a tutor who disagrees with a mark can nudge it without re-grading the whole student. I left this out on purpose — it is named as a stretch goal in the ticket, and a plain, complete, working UI beats a half-built adjust feature. The grading engine and the `needs_review` flag — the parts that stop a wrong mark from being trusted — were never cut.
