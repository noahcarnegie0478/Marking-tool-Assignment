"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useGradingDispatch, useGradingState } from "@/lib/state/GradingContext";
import { getStatus, getTotal } from "@/lib/state/selectors";
import { gradeStudent } from "@/lib/state/gradeStudent";
import type { StudentSubmission } from "@/lib/exam/loadExam";
import { studentAvatarColors, studentInitial } from "@/lib/ui/studentAvatar";
import { QuestionCard } from "@/lib/ui/QuestionCard";

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

  function handleConfirmAll() {
    dispatch({ type: "CONFIRM_ALL", student: name });
  }

  const hasAiGradedQuestion = Boolean(
    questionResults && Object.values(questionResults).some((question) => question.status === "ai_graded")
  );

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
              {Object.values(questionResults).map((question) => (
                <QuestionCard
                  key={question.questionId}
                  student={name}
                  question={question}
                  dispatch={dispatch}
                />
              ))}
            </ul>

            <div
              className="fixed inset-x-0 bottom-0 px-4 sm:px-6"
              style={{
                background: "rgba(247,248,250,0.92)",
                backdropFilter: "blur(8px)",
                borderTop: "1px solid rgba(16,24,40,0.07)",
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
                    <div style={{ height: "9px", background: "#E5E7EB", borderRadius: "4px", overflow: "hidden" }}>
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
                        border: "1px solid rgba(16,24,40,0.12)",
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
                    {hasAiGradedQuestion && (
                      <button
                        type="button"
                        onClick={handleConfirmAll}
                        className="cursor-pointer border-none hover:brightness-95"
                        style={{
                          background: "var(--marked-bg)",
                          color: "var(--marked-fg)",
                          fontSize: "15px",
                          fontWeight: 700,
                          padding: "12px 22px",
                          borderRadius: "8px",
                          transition: "filter 0.15s ease",
                        }}
                      >
                        Confirm all
                      </button>
                    )}
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
