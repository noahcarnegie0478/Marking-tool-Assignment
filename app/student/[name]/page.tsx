"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useGradingDispatch, useGradingState } from "@/lib/state/GradingContext";
import { getNeedsReview, getStatus, getTotal } from "@/lib/state/selectors";
import { gradeStudent } from "@/lib/state/gradeStudent";
import type { StudentSubmission } from "@/lib/exam/loadExam";
import { studentAvatarColors, studentInitial } from "@/lib/ui/studentAvatar";

// Screen 2: one student's 8 question cards. Loads the submission once and
// drops it into the grading store (INIT_EXAM), then reads everything back
// from the store so this screen and Screen 1 always agree on the state.
// Wrapped in Suspense because useParams()'s value is only known at request
// time, which Next.js requires a Suspense boundary for.
export default function StudentPage() {
  return (
    <Suspense>
      <StudentPageContent />
    </Suspense>
  );
}

function StudentPageContent() {
  const { name } = useParams<{ name: string }>();
  const { results, gradingProgress } = useGradingState();
  const dispatch = useGradingDispatch();
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const alreadyInitialised = Boolean(results[name]);
  const isGradingThisStudent = gradingProgress?.student === name;

  useEffect(() => {
    if (alreadyInitialised) {
      return;
    }
    fetch(`/api/submissions/${encodeURIComponent(name)}`)
      .then(async (response) => {
        if (!response.ok) {
          setNotFound(true);
          return;
        }
        const submission: StudentSubmission = await response.json();
        dispatch({ type: "INIT_EXAM", submission });
      })
      .catch((error) => {
        console.error("Failed to load submission", error);
        setLoadError(true);
      });
  }, [name, alreadyInitialised, dispatch]);

  if (notFound) {
    return <EmptyScreen message="Student not found." />;
  }

  if (loadError) {
    return <EmptyScreen message="Could not load this student. Try refreshing." />;
  }

  const questionResults = results[name];
  const total = getTotal(results, name);
  const alreadyMarked =
    !isGradingThisStudent && Boolean(questionResults) && getStatus(results, name) === "Marked";

  // Kicks off the grading loop for this student. gradeStudent dispatches
  // START_GRADING, one QUESTION_GRADED per answered question, then
  // FINISH_GRADING, so the progress bar and marks update live.
  function handleGradeWithAi() {
    if (!questionResults) {
      return;
    }
    gradeStudent(name, Object.values(questionResults), dispatch);
  }

  const avatar = studentAvatarColors(name);

  return (
    <main
      className="px-4 sm:px-6"
      style={{ minHeight: "100vh", width: "100%", background: "var(--background)", paddingTop: "40px" }}
    >
      <div style={{ maxWidth: "820px", margin: "0 auto", paddingBottom: "96px" }}>
        <Link
          href="/"
          className="hover:text-[var(--foreground)]"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            color: "var(--muted)",
            fontSize: "14px",
            fontWeight: 600,
            padding: "6px 0",
            marginBottom: "16px",
          }}
        >
          ← All submissions
        </Link>

        {!questionResults && <LoadingCard message="Loading…" />}

        {questionResults && (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "26px" }}>
              <div
                style={{
                  width: "54px",
                  height: "54px",
                  borderRadius: "50%",
                  background: avatar.bg,
                  color: avatar.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                {studentInitial(name)}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: "27px", fontWeight: 800, letterSpacing: "-0.015em", margin: "0 0 4px" }}>
                  {name}
                </h1>
                <div style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>
                  Year 12 Mathematics · Response Marking
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: "var(--muted-strong)",
                    textTransform: "uppercase",
                    marginBottom: "3px",
                  }}
                >
                  Total
                </div>
                <div
                  style={{
                    fontSize: "30px",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                    color: alreadyMarked ? "var(--accent)" : "var(--dash)",
                  }}
                >
                  {total ? `${total.awarded} / ${total.max}` : "– / –"}
                </div>
              </div>
            </div>

            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {Object.values(questionResults).map((question) => {
                const isNoSubmission = question.status === "no_submission";
                const hasMark = question.aiMark !== null;
                const needsReview = getNeedsReview(question);

                return (
                  <li
                    key={question.questionId}
                    style={{
                      background: isNoSubmission ? "#F6EEE0" : "var(--card)",
                      border: needsReview
                        ? `1px solid ${"var(--warning-border)"}`
                        : "1px solid var(--border)",
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
                        mark={question.aiMark}
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

                    {question.aiFeedback && (
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
                  </li>
                );
              })}
            </ul>

            <div
              className="fixed inset-x-0 bottom-0 px-4 sm:px-6"
              style={{
                background: "rgba(255,250,243,0.92)",
                backdropFilter: "blur(8px)",
                borderTop: "1px solid rgba(42,35,32,0.07)",
                padding: "14px 24px",
              }}
            >
              <div style={{ maxWidth: "820px", margin: "0 auto" }}>
                {isGradingThisStudent && gradingProgress ? (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "9px",
                      }}
                    >
                      <span style={{ fontSize: "14.5px", fontWeight: 700 }}>
                        Grading {Math.min(gradingProgress.done + 1, gradingProgress.total)} of{" "}
                        {gradingProgress.total}…
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>
                        {Math.round((gradingProgress.done / gradingProgress.total) * 100)}%
                      </span>
                    </div>
                    <div style={{ height: "9px", background: "#E4E1DB", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${(gradingProgress.done / gradingProgress.total) * 100}%`,
                          background: "var(--accent)",
                          borderRadius: "4px",
                          backgroundImage:
                            "linear-gradient(45deg, rgba(255,255,255,0.18) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.18) 75%, transparent 75%)",
                          backgroundSize: "28px 28px",
                          animation: "bar-stripe 0.7s linear infinite",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", alignItems: "center" }}>
                    <Link
                      href="/"
                      className="hover:bg-[var(--hover-bg)]"
                      style={{
                        background: "var(--card)",
                        border: "1px solid rgba(42,35,32,0.12)",
                        color: "var(--foreground)",
                        fontSize: "15px",
                        fontWeight: 700,
                        padding: "12px 22px",
                        borderRadius: "8px",
                        transition: "background 0.15s ease",
                      }}
                    >
                      Return
                    </Link>
                    <button
                      type="button"
                      onClick={handleGradeWithAi}
                      className="cursor-pointer border-none hover:bg-[var(--accent-hover)] active:translate-y-px"
                      style={{
                        background: "var(--accent)",
                        color: "#fff",
                        fontSize: "15px",
                        fontWeight: 700,
                        padding: "12px 24px",
                        borderRadius: "8px",
                        boxShadow: "0 4px 14px rgba(209,26,51,0.3)",
                        transition: "background 0.15s ease, transform 0.1s ease",
                      }}
                    >
                      {alreadyMarked ? "Re-grade with AI" : "Grade with AI"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// The mark box: a dash before grading, the real mark once it lands. Keyed
// by whether a mark is showing so React mounts a fresh node the moment a
// mark first appears, which is what makes the `mark-in` CSS animation
// (translateY + fade, defined in globals.css) actually play instead of
// silently updating an existing node's text.
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

function LoadingCard({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "32px 22px",
        textAlign: "center",
        fontSize: "15px",
        fontWeight: 500,
        color: "var(--muted)",
      }}
    >
      {message}
    </div>
  );
}

function EmptyScreen({ message }: { message: string }) {
  return (
    <main
      className="px-4 sm:px-6"
      style={{ minHeight: "100vh", width: "100%", background: "var(--background)", paddingTop: "40px" }}
    >
      <div style={{ maxWidth: "820px", margin: "0 auto" }}>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "40px 22px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>
            {message}
          </p>
          <Link
            href="/"
            className="hover:bg-[var(--accent-hover)]"
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              padding: "10px 20px",
              borderRadius: "8px",
            }}
          >
            Return
          </Link>
        </div>
      </div>
    </main>
  );
}
