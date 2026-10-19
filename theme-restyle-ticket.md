# THEME-01 · Re-theme to light grey (from beige)

> A pure re-theme on top of the finished UI-02. Swap the beige/cream palette for a
> clean light-grey look (grey page, white cards) and fix the low-contrast rubric.
> **Only colour tokens change. Layout, fonts, sizes, spacing, radii, shadow shape,
> animations, states, data, and logic all stay the same.**
> Built from the base template, PR ceremony dropped. Pairs with `UI-02-final-ui.md`.

---

## 1. The goal in one line
Beige to light grey, more modern, and the rubric must be clearly readable. The
visual hierarchy stays: question text is darkest, rubric is mid, response is clear.

Kept on purpose (they carry meaning, so do not touch their tone):
- Accent red `#D11A33` (buttons, marks, emphasis).
- Status chips: green "Marked", amber "Needs review".
- Avatar colour pairs per student.
- The red Q badge.

---

## 2. Token mapping (old beige to new grey)

Replace every old value with the new one, everywhere it appears.

### Core surfaces and text
| Use | Old (beige) | New (grey) |
|---|---|---|
| Page background | `#FFFAF3` | `#F7F8FA` |
| Card / surface | `#FFF2DB` | `#FFFFFF` |
| Stat cards | `#FFF2DB` | `#FFFFFF` |
| Row and button hover | `#ECEAE6` | `#F0F2F5` |
| Default border | `rgba(42,35,32,0.06)` | `#E7E9EE` |
| Text, primary | `#2A2320` | `#1A1D24` |
| Text, muted | `#9A8C7C` | `#6B7280` |
| **Rubric text (contrast fix)** | `#A3917D` | `#4B5563` |
| Response text | `#3A322C` | `#374151` |
| Eyebrow label (landing) | `#B07A4A` | `#6B7280` |
| Section labels (uppercase) | `#B49A80` | `#8A93A3` |
| List header labels | `#B49A80` | `#8A93A3` |
| Empty / dashed mark | `#C9B59C` | `#AEB4BF` |
| "/ max" and chevron | `#BCAE9C` | `#9CA3AF` |

### Blocks and boxes (inside the white cards)
| Use | Old | New |
|---|---|---|
| Response block bg | `#FFFAF3` | `#F3F4F6` |
| Feedback block bg | `#FFF7EA` | `#EEF2F7` (a hair cooler than response, to separate the two) |
| Mark box bg (normal) | `#FFFAF3` | `#F7F8FA` |
| Progress bar track | `#E4E1DB` | `#E5E7EB` |
| Bottom bar backdrop | `rgba(255,250,243,0.92)` | `rgba(247,248,250,0.92)` |

### No-submission state (stays greyed, just neutral grey now)
| Use | Old | New |
|---|---|---|
| No-submission card bg | `#F6EEE0` | `#F0F2F5` |
| No-sub mark box bg | `#EFE7D9` | `#ECEEF2` |
| No-sub chip bg | `#ECE4D8` | `#E7E9EE` |
| No-sub chip text | `#9A8C7C` | `#6B7280` |

### Shadows (retune from brown to neutral)
| Use | Old | New |
|---|---|---|
| Card shadow (landing list) | `0 1px 2px rgba(78,52,30,0.05), 0 10px 26px rgba(78,52,30,0.05)` | `0 1px 2px rgba(16,24,40,0.04), 0 10px 26px rgba(16,24,40,0.06)` |
| Card shadow (question cards) | `0 1px 2px rgba(78,52,30,0.04), 0 6px 18px rgba(78,52,30,0.045)` | `0 1px 2px rgba(16,24,40,0.03), 0 6px 18px rgba(16,24,40,0.05)` |
| Primary button shadow | `0 4px 14px rgba(209,26,51,0.3)` | keep |

### Unchanged (carry meaning, keep exactly)
- Accent red `#D11A33`, button hover `#B8142C`, link hover `#A8142A`.
- Q badge: text `#D11A33` on `#FCE4E3`.
- Marked chip: `#4E7048` on `#E6EFE2`.
- Needs review chip: `#8A6400` on `#FBECCB`; needs-review card border `rgba(138,100,0,0.28)`.
- All four avatar colour pairs.

---

## 3. The rubric contrast fix (why, so it is not undone)
The old rubric colour was a pale brown on a cream card, so it nearly blended in.
The new `#4B5563` on a white card is a clear step up in contrast (readable at body size),
while still sitting lighter than the response text. Keep the three levels distinct:
- Question text `#1A1D24`, weight 700 (darkest).
- Response text `#374151`.
- Rubric text `#4B5563` (lightest of the three, but now clearly legible).

Do not push rubric darker than `#4B5563`; past that it reads as dark as the response and the hierarchy is lost.

---

## 4. Scope
- In: replace the colour tokens per section 2, across every screen, card, chip, box, bar, and shadow.
- Out: no change to layout, font family, font sizes, weights, spacing, radii, animations, the five card states' behaviour, the data, or any logic.

## 5. Acceptance criteria
- Given any screen, when I view it, then there is no beige or cream anywhere; the page is light grey and the cards are white.
- Given a question card, when I read the rubric, then it is clearly legible (noticeably higher contrast than before) and still lighter than the question and response text.
- Given a graded card, when I view it, then the accent red still appears on the mark, and the needs-review and marked chips keep their green/amber meaning.
- Given a no-submission card, when I view it, then it is a neutral grey (not beige), still greyed back at 0.72 opacity.
- Given the whole app, when I compare it to before, then layout, spacing, fonts, and animations are unchanged; only colours differ.

## 6. Test cases (thin, as agreed for a re-theme)
| Type | Case | Expected |
|---|---|---|
| Happy | Grep the codebase for the old beige hexes (`#FFFAF3`, `#FFF2DB`, `#ECEAE6`, `#FFF7EA`, `#A3917D`, `#B07A4A`, `#B49A80`, `#3A322C`, `#F6EEE0`, `#EFE7D9`, `#ECE4D8`, the brown rgba shadows) | **zero matches** (every old token replaced, none missed) |
| Happy | Rubric text colour on a white card | contrast meets WCAG AA for body text (about 4.5:1 or better); `#4B5563` on white passes |
| Happy | Accent red still present on a graded mark | `#D11A33` rendered |
| Edge | No-submission card | neutral grey bg, 0.72 opacity |

> The grep test is the important one: it is how you prove the beige was replaced everywhere and nothing was left behind. Paste the real grep output.

## 7. Definition of Done
- [ ] All acceptance criteria met (checked by you, not just tests)
- [ ] Grep for old beige tokens returns zero matches (real output pasted)
- [ ] Rubric contrast checked and passing
- [ ] Lint + typecheck + build green
- [ ] Blind reviewer returned "No findings"
- [ ] No new dependency
- [ ] Journal entry written

## 8. Do NOT
- Do not change layout, spacing, fonts, sizes, radii, or animations. Colours only.
- Do not restyle the status chips, avatars, or the red Q badge. They carry meaning.
- Do not drop the accent red to grey. Red stays the primary accent.
- Do not leave any beige token behind. The grep must be clean.

**Review log**
| Round | Findings | Fixed? |
|---|---|---|
| 1 | | |
