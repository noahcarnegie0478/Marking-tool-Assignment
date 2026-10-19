# UI-02 · Final UI, locked to the design mockup

> Pure visual spec. The data, APIs, and grading are already built; this ticket is
> a restyle of the existing working screens so they match the design exactly.
> The mockup file `Maths Exam Marking Tool.html` is the **visual source of truth**.
> This ticket distills every token so nothing is missed. If the file and this
> ticket ever disagree, follow the file's look.

> One carry-over from the data work: the mockup shows mark + rubric + response but
> **no feedback**. The app must render the AI feedback per response. See section 5.3.

---

## 1. Global design tokens

Pull these exactly. They come straight from the mockup.

### Colours
| Use | Hex |
|---|---|
| Page background | `#FFFAF3` |
| Card / surface | `#FFF2DB` |
| Row and button hover | `#ECEAE6` |
| Text, primary | `#2A2320` |
| Text, muted | `#9A8C7C` |
| Rubric text | `#A3917D` |
| Response text | `#3A322C` |
| Eyebrow label (landing) | `#B07A4A` |
| Section labels (uppercase) | `#B49A80` |
| Accent red (buttons, marks, emphasis) | `#D11A33` |
| Accent red, button hover | `#B8142C` |
| Link hover | `#A8142A` |
| Empty / dashed mark | `#C9B59C` |
| "/ max" and chevron | `#BCAE9C` |
| Default border | `rgba(42,35,32,0.06)` |

### State colours
| State | Text | Background | Border |
|---|---|---|---|
| Q badge ("Q1") | `#D11A33` | `#FCE4E3` | none |
| Marked chip | `#4E7048` | `#E6EFE2` | none |
| Not-marked chip | `#A3917D` | transparent | `rgba(42,35,32,0.14)` |
| Needs review chip | `#8A6400` | `#FBECCB` | none |
| Needs review card | - | - | `rgba(138,100,0,0.28)` |
| No-submission chip | `#9A8C7C` | `#ECE4D8` | none |
| No-submission card | - | `#F6EEE0` | default |
| No-sub mark box | - | `#EFE7D9` | default |

### Avatar colours (by student, 4 fixed pairs)
| Student | Circle bg | Initial colour |
|---|---|---|
| Aisha | `#FCE4E3` | `#C0263A` |
| Ben | `#F3E6D4` | `#A06A38` |
| Chen | `#E3EAF2` | `#486585` |
| Diego | `#E6EFE2` | `#4E7048` |

### Type
- Font: **Hanken Grotesk** from Google Fonts, weights 400 to 800. Fallback `system-ui, sans-serif`.
- Turn on `-webkit-font-smoothing: antialiased`.

### Shape and layout
- Content column: **max-width 820px, centred**.
- Page padding: `40px 24px 64px`. Keep a 16px side gutter on phones, no horizontal scroll.
- Radius: cards `10px`, stat cards / buttons / boxes `8px`, chips `6px`, Q badge `4px`.
- Card shadow (landing list): `0 1px 2px rgba(78,52,30,0.05), 0 10px 26px rgba(78,52,30,0.05)`.
- Card shadow (question cards): `0 1px 2px rgba(78,52,30,0.04), 0 6px 18px rgba(78,52,30,0.045)`.
- Primary button shadow: `0 4px 14px rgba(209,26,51,0.3)`.

### Animations (from the mockup)
- `barStripe`: moving diagonal stripes on the progress fill, `0.7s linear infinite`.
- `markIn`: a mark fades up (`opacity 0 to 1`, `translateY(4px) to 0`) over `0.4s ease` when it first appears after grading.

---

## 2. Screen 1: Exam landing

### 2.1 Header
- Eyebrow line: small uppercase label, `12px / weight 700 / letter-spacing 0.14em`, colour `#B07A4A`. Mockup text: "Year 12 · 2026 · Paper 1". Keep the exact visual treatment; the words may match the real exam if you prefer.
- H1: `34px / weight 800 / letter-spacing -0.02em`, colour `#2A2320`.
- Subtitle: `17px`, colour `#9A8C7C`.

### 2.2 Three stat cards (in a row)
- Each: bg `#FFF2DB`, default border, radius `8px`, padding `14px 18px`, equal width.
- Big number `24px / weight 800`, label below `13px / weight 500 / #9A8C7C`.
- The three stats: **Submissions** (4), **Marked** (count of fully graded students, derived), **Questions each** (8).

### 2.3 Submission list
- One card: bg `#FFF2DB`, default border, radius `10px`, landing shadow, clipped corners.
- Header strip: labels **Student · Status · Score** plus a narrow chevron column. Labels `12px / weight 700 / letter-spacing 0.08em / uppercase / #B49A80`. Bottom border.
- Column widths: Status `130px`, Score `86px` (right-aligned), chevron `22px`, Student fills the rest.
- One row per student. Each row:
  - **Avatar**: 42px circle, the student's colour pair, initial in `weight 700 / 16px`.
  - **Name + meta**: name `16.5px / weight 700`; meta line `13px / weight 500 / #9A8C7C` (the submitted count, e.g. "2 of 8 answered").
  - **Status chip**: "✓ Marked" (green pair) when fully graded, else "Not marked" (outlined).
  - **Score**: "X / Y" in red `17px / weight 800` when marked; "– / Y" in `#C9B59C` when not. Tabular numbers. Y is the max total.
  - **Chevron** "›" in `#C9B59C`, 20px, right-aligned.
  - Whole row clickable, cursor pointer, hover background `#ECEAE6`, bottom border between rows.
- Click a row goes to Screen 2 for that student.

---

## 3. Screen 2: One student's submission

### 3.1 Back control
- A text button "← All submissions", `14px / weight 600 / #9A8C7C`, hover colour `#2A2320`. Goes to Screen 1.

### 3.2 Header
- Avatar: 54px circle, the student's colour pair, initial `20px / weight 700`.
- Name: `27px / weight 800 / letter-spacing -0.015em`.
- Sub-line under the name: `14px / weight 500 / #9A8C7C` (e.g. "Response Marking").
- **Total** on the right: small uppercase label "Total" (`11px / weight 700 / 0.1em / #B49A80`), value below `30px / weight 800`, tabular numbers. Red `#D11A33` when marked, `#C9B59C` when not.

### 3.3 Question cards (8, always all 8)
Each card in order Q1 to Q8. See section 5 for the states.

Base card: bg `#FFF2DB`, default border, radius `10px`, padding `22px`, bottom margin `14px`, question-card shadow.

Top row of the card (flex, aligned to top):
- **Left**: a chip row, then the question text.
  - Chip row: the Q badge (always), then a "⚠ Needs review" chip (only if flagged), then a "No submission" chip (only if not answered).
  - Q badge "Q1": `12px / weight 800 / 0.06em`, red text on `#FCE4E3`, radius 4px, padding `3px 9px`.
  - Question text: `16.5px / weight 700 / line-height 1.4`.
- **Right**: the mark box.
  - Box: column, centred, min-width `74px`, padding `10px 6px`, bg `#FFFAF3` (or `#EFE7D9` when no submission), default border, radius `8px`.
  - Mark value `23px / weight 800`, red when shown, `#C9B59C` when still a dash. "/ max" below in `14px / weight 600 / #BCAE9C`.
  - When a mark first appears after grading, play the `markIn` animation.

Below the top row, the stacked blocks (section 5.3 covers Feedback):
- **Rubric**: uppercase label "Rubric" (`11px / 700 / 0.08em / #B49A80`), text `13.5px / line-height 1.5 / #A3917D`.
- **Response**: uppercase label "Response", then the response in a block: `15px / line-height 1.55 / #3A322C`, bg `#FFFAF3`, default border, radius `8px`, padding `13px 16px`, `white-space: pre-wrap`.

---

## 4. Bottom bar and grading

### 4.1 Fixed bar
- Fixed to the bottom, full width. Background `rgba(255,250,243,0.92)` with `backdrop-filter: blur(8px)`, top border, padding `14px 24px`. Inner content capped at 820px, centred. Leave bottom padding on the page so cards never hide behind it.

### 4.2 Idle state (not grading)
- Two buttons, right-aligned.
  - **Return**: bg `#FFF2DB`, border `rgba(42,35,32,0.12)`, text `#2A2320`, `15px / weight 700`, padding `12px 22px`, radius 8px, hover bg `#ECEAE6`. Goes to Screen 1.
  - **Grade with AI**: bg `#D11A33`, white text, `15px / weight 700`, padding `12px 24px`, radius 8px, button shadow, hover bg `#B8142C`, slight press on active. Label becomes "Re-grade with AI" once the student is already marked.

### 4.3 Grading state (progress)
- While grading runs, replace the buttons with the progress block.
  - Top line: left label "Grading X of 8…" (`14.5px / weight 700`), right percentage (`13px / weight 600 / #9A8C7C`).
  - Bar: track `9px` tall, bg `#E4E1DB`, radius 4px. Fill red `#D11A33`, same radius, striped with the `barStripe` animation, width eases to the percentage.
- The count and percentage advance as each real result lands; each mark drops into its box as it arrives.

---

## 5. The five card states (get these exactly right)

### 5.1 Not graded yet
- Mark box shows a dash "–" in `#C9B59C`. No feedback block. Card at full opacity.

### 5.2 Grading in progress (this card not done yet)
- Same as not-graded until its result lands, then it flips to graded with the `markIn` animation.

### 5.3 Graded
- Mark box shows the mark in red, "/ max" below.
- **Feedback block (not in the mockup, required here):** below the Response block, a third section in the same style. Uppercase label "Feedback" (`11px / 700 / 0.08em / #B49A80`), then the feedback text, `14.5px / line-height 1.55`, in a block like the Response block but tinted slightly warmer (bg `#FFF7EA`, or reuse `#FFFAF3`), default border, radius 8px, padding `13px 16px`. Show it only once the question is graded.

### 5.4 Needs review
- Same as graded, plus:
  - The "⚠ Needs review" chip in the chip row (amber pair).
  - The card border becomes `rgba(138,100,0,0.28)`.

### 5.5 No submission
- Card bg `#F6EEE0`, opacity `0.72`.
- Chip row shows the "No submission" chip (grey pair).
- Mark box bg `#EFE7D9`, shows "0".
- Response block shows italic placeholder "No response was submitted for this question."
- No feedback block.

---

## 6. Acceptance criteria (visual-match checks)

- Given the app opens, when it loads, then the landing header, three stat cards, and the submission list match the mockup's layout, colours, fonts, and spacing.
- Given the landing page, when no student is marked, then the "Marked" stat shows 0 and every row shows "Not marked" with a dashed score.
- Given I click a student, when Screen 2 opens, then I see all 8 question cards styled per section 3.
- Given a question with no submission, when I view that card, then it is greyed, labelled "No submission", and shows 0, per section 5.5.
- Given I click "Grade with AI", when grading runs, then the bottom bar shows the striped progress bar with "Grading X of 8…" and a percentage, and marks fill in one by one with the `markIn` animation.
- Given grading finishes, when it is done, then each graded card shows the mark **and the feedback** (section 5.3), uncertain cards show the "⚠ Needs review" chip and amber border, and the student total and the Screen 1 row update.
- Given any screen on a phone-width window, when I view it, then there is a 16px side gutter and no horizontal scroll.

---

## 7. Do NOT

- Do not invent new colours or fonts. Every value you need is in section 1.
- Do not skip the Feedback block. The mockup omits it; the app needs it.
- Do not change the data flow or grading wiring. This ticket restyles existing screens only.
