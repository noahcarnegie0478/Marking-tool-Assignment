"use client";

import { useState } from "react";
import type { GradingDispatch, QuestionResult } from "@/lib/state/GradingContext";
import { getEffectiveMark, getNeedsReview } from "@/lib/state/selectors";
import { redoQuestion } from "@/lib/state/redoQuestion";
import { AdjustControl } from "@/lib/ui/AdjustControl";

// One question's whole card: badges, mark box, rubric, response, feedback,
// and (ADJ-02) the tutor's override controls. Statuses that can show the
// controls: ai_graded, confirmed, adjusted (together "graded" per the spec).
// pending, grading, and no_submission never show them.
const GRADED_STATUSES = new Set(["ai_graded", "confirmed", "adjusted"]);

export function QuestionCard({
  student,
  question,
  dispatch,
}: {
  student: string;
  question: QuestionResult;
  dispatch: GradingDispatch;
}) {
  const [isAdjusting, setIsAdjusting] = useState(false);

  const isNoSubmission = question.status === "no_submission";
  const needsReview = getNeedsReview(question);
  const showControls = GRADED_STATUSES.has(question.status);
  const effectiveMark = getEffectiveMark(question);
  const hasMark = showControls;

  function handleConfirm() {
    dispatch({ type: "CONFIRM", student, questionId: question.questionId });
  }

  function handleAdjustSubmit(mark: number) {
    dispatch({ type: "ADJUST", student, questionId: question.questionId, rawValue: String(mark) });
    setIsAdjusting(false);
  }

  function handleRedo() {
    redoQuestion(student, question.questionId, question, dispatch);
  }

  return (
    <li
      style={{
        background: isNoSubmission ? "#F6EEE0" : "var(--card)",
        border: needsReview ? `1px solid ${"var(--warning-border)"}` : "1px solid var(--border)",
        borderRadius: "10px",
        padding: "22px",
        marginBottom: "14px",
        boxShadow: "0 1px 2px rgba(78,52,30,0.04), 0 6px 18px rgba(78,52,30,0.045)",
        opacity: isNoSubmission ? 0.72 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: "var(--accent)",
                background: "#FCE4E3",
                padding: "3px 9px",
                borderRadius: "4px",
              }}
            >
              {question.questionId}
            </span>
            {needsReview && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--warning-fg)",
                  background: "var(--warning-bg)",
                  padding: "3px 10px",
                  borderRadius: "4px",
                }}
              >
                ⚠ Needs review
              </span>
            )}
            {isNoSubmission && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  background: "#ECE4D8",
                  padding: "3px 10px",
                  borderRadius: "4px",
                }}
              >
                No submission
              </span>
            )}
            {question.status === "confirmed" && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--marked-fg)",
                  background: "var(--marked-bg)",
                  padding: "3px 10px",
                  borderRadius: "4px",
                }}
              >
                ✓ Confirmed
              </span>
            )}
            {question.status === "adjusted" && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--foreground)",
                  background: "var(--card-strong)",
                  padding: "3px 10px",
                  borderRadius: "4px",
                }}
              >
                Adjusted by tutor
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "16.5px",
              fontWeight: 700,
              lineHeight: 1.4,
              color: isNoSubmission ? "#8E8172" : "var(--foreground)",
            }}
          >
            {question.question}
          </div>
        </div>

        <MarkBox
          noSub={isNoSubmission}
          hasMark={hasMark}
          mark={effectiveMark}
          maxMarks={question.maxMarks}
        />
      </div>

      <div style={{ marginTop: "14px" }}>
        <SectionLabel>Rubric</SectionLabel>
        <div style={{ fontSize: "13.5px", lineHeight: 1.5, color: "var(--rubric-text)" }}>
          {question.rubric}
        </div>
      </div>

      <div style={{ marginTop: "14px" }}>
        <SectionLabel>Response</SectionLabel>
        <div
          style={{
            fontSize: "15px",
            lineHeight: 1.55,
            color: isNoSubmission ? "#B4A590" : "var(--response-text)",
            background: isNoSubmission ? "transparent" : "#FFFAF3",
            border: "1px solid rgba(42,35,32,0.06)",
            borderRadius: "8px",
            padding: "13px 16px",
            fontStyle: isNoSubmission ? "italic" : "normal",
            whiteSpace: "pre-wrap",
          }}
        >
          {isNoSubmission ? "No response was submitted for this question." : question.response}
        </div>
      </div>

      {showControls && question.aiFeedback && (
        <div style={{ marginTop: "14px" }}>
          <SectionLabel>Feedback</SectionLabel>
          <div
            style={{
              fontSize: "14.5px",
              lineHeight: 1.55,
              color: "var(--response-text)",
              background: "#FFF7EA",
              border: "1px solid rgba(42,35,32,0.06)",
              borderRadius: "8px",
              padding: "13px 16px",
            }}
          >
            {question.aiFeedback}
          </div>
        </div>
      )}

      {showControls && (
        <div style={{ marginTop: "14px" }}>
          {isAdjusting ? (
            <AdjustControl
              currentMark={effectiveMark}
              maxMarks={question.maxMarks}
              onSubmit={handleAdjustSubmit}
              onCancel={() => setIsAdjusting(false)}
            />
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              {/* Always shown on a graded card per the ticket's AC. Clicking
                  Confirm when already confirmed/adjusted is a safe no-op:
                  the CONFIRM reducer action only acts on "ai_graded". */}
              <ControlButton onClick={handleConfirm}>Confirm</ControlButton>
              <ControlButton onClick={() => setIsAdjusting(true)}>Adjust</ControlButton>
              <ControlButton onClick={handleRedo}>Re-do</ControlButton>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function ControlButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer hover:bg-[var(--hover-bg)]"
      style={{
        background: "var(--card)",
        color: "var(--foreground)",
        border: "1px solid rgba(42,35,32,0.12)",
        fontSize: "13px",
        fontWeight: 700,
        padding: "6px 12px",
        borderRadius: "6px",
        transition: "background 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

// The mark box: a dash before grading, the effective mark (tutor's, else
// the AI's) once it lands. Keyed by whether a mark is showing so React
// mounts a fresh node the moment a mark first appears, which is what makes
// the `mark-in` CSS animation (defined in globals.css) actually play
// instead of silently updating an existing node's text.
function MarkBox({
  noSub,
  hasMark,
  mark,
  maxMarks,
}: {
  noSub: boolean;
  hasMark: boolean;
  mark: number | null;
  maxMarks: number;
}) {
  const showMark = noSub || hasMark;
  const markText = noSub ? "0" : hasMark ? String(mark) : "–";
  const markColor = noSub ? "var(--dash)" : hasMark ? "var(--accent)" : "var(--dash)";

  return (
    <div
      key={showMark ? "mark" : "dash"}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1px",
        minWidth: "74px",
        padding: "10px 6px",
        background: noSub ? "#EFE7D9" : "#FFFAF3",
        border: "1px solid rgba(42,35,32,0.07)",
        borderRadius: "8px",
        flexShrink: 0,
        animation: showMark && !noSub ? "mark-in 0.4s ease" : undefined,
      }}
    >
      <span style={{ fontSize: "23px", fontWeight: 800, color: markColor, fontVariantNumeric: "tabular-nums" }}>
        {markText}
      </span>
      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--max-text)" }}>/ {maxMarks}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: "var(--muted-strong)",
        textTransform: "uppercase",
        marginBottom: "6px",
      }}
    >
      {children}
    </div>
  );
}
