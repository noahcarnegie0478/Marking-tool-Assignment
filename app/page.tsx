"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGradingDispatch, useGradingState } from "@/lib/state/GradingContext";
import { getStatus, getTotal } from "@/lib/state/selectors";
import { studentAvatarColors, studentInitial } from "@/lib/ui/studentAvatar";
import type { StudentSubmission } from "@/lib/exam/loadExam";

type Submission = { name: string };

// Screen 1: the exam landing page. Lists one row per student with their
// marking status and total, read from the grading store. Loads every
// student's full submission up front (not just names) so the "X of 8
// answered" meta line and each student's max total can be shown before
// the tutor opens anyone's page — both existing read APIs, no new ones.
export default function Home() {
  const { results } = useGradingState();
  const dispatch = useGradingDispatch();
  const [students, setStudents] = useState<Submission[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/submissions")
      .then(async (response) => {
        const body = await response.json();
        const list: Submission[] = body.students;
        setStudents(list);

        for (const { name } of list) {
          if (results[name]) continue;
          const detail = await fetch(`/api/submissions/${encodeURIComponent(name)}`);
          if (!detail.ok) continue;
          const submission: StudentSubmission = await detail.json();
          dispatch({ type: "INIT_EXAM", submission });
        }
      })
      .catch((error) => {
        console.error("Failed to load submissions list", error);
        setLoadError(true);
      });
    // Runs once on mount; `results` is read only to skip students already
    // in the store, not to re-trigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markedCount = students
    ? students.filter(({ name }) => getStatus(results, name) === "Marked").length
    : 0;
  const questionsPerStudent = students
    ? Object.values(results[students[0]?.name] ?? {}).length || 8
    : 8;

  return (
    <main
      className="px-4 sm:px-6"
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "var(--background)",
        paddingTop: "40px",
        paddingBottom: "64px",
      }}
    >
      <div style={{ maxWidth: "820px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--eyebrow)",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Year 12 · 2026 · Paper 1
          </div>
          <h1
            style={{
              fontSize: "34px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: "0 0 6px",
            }}
          >
            Year 12 Mathematics
          </h1>
          <p style={{ fontSize: "17px", color: "var(--muted)", margin: 0 }}>Response Marking</p>
        </div>

        {loadError && <ErrorCard message="Could not load submissions. Try refreshing." />}

        {!loadError && students === null && <LoadingCard message="Loading submissions…" />}

        {!loadError && students !== null && (
          <>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <StatTile value={students.length} label="Submissions" />
              <StatTile value={markedCount} label="Marked" />
              <StatTile value={questionsPerStudent} label="Questions each" />
            </div>

            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                boxShadow: "0 1px 2px rgba(78,52,30,0.05), 0 10px 26px rgba(78,52,30,0.05)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 22px",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--muted-strong)",
                  textTransform: "uppercase",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ flex: 1 }}>Student</div>
                <div className="hidden sm:block" style={{ width: "130px" }}>
                  Status
                </div>
                <div style={{ width: "86px", textAlign: "right" }}>Score</div>
                <div style={{ width: "22px" }} />
              </div>

              {students.map(({ name }) => {
                const status = getStatus(results, name);
                const total = getTotal(results, name);
                const isMarked = status === "Marked";
                const avatar = studentAvatarColors(name);
                const studentQuestions = Object.values(results[name] ?? {});
                const answered = studentQuestions.filter((q) => q.status !== "no_submission").length;
                const meta = studentQuestions.length
                  ? `${answered} of ${studentQuestions.length} answered`
                  : " ";

                return (
                  <Link
                    key={name}
                    href={`/student/${encodeURIComponent(name)}`}
                    className="hover:bg-[var(--hover-bg)]"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "18px 22px",
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(42,35,32,0.05)",
                      color: "var(--foreground)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        background: avatar.bg,
                        color: avatar.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {studentInitial(name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "16.5px", fontWeight: 700 }}>{name}</div>
                      <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>{meta}</div>
                    </div>
                    <div className="hidden sm:block" style={{ width: "130px" }}>
                      <StatusPill marked={isMarked} />
                    </div>
                    <div
                      style={{
                        width: "86px",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      <span
                        style={{
                          fontSize: isMarked ? "17px" : "16px",
                          fontWeight: isMarked ? 800 : 700,
                          color: isMarked ? "var(--accent)" : "var(--dash)",
                        }}
                      >
                        {total ? (isMarked ? `${total.awarded} / ${total.max}` : `– / ${total.max}`) : "– / –"}
                      </span>
                    </div>
                    <div style={{ width: "22px", color: "var(--dash)", fontSize: "20px", textAlign: "right" }}>›</div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "14px 18px",
      }}
    >
      <div style={{ fontSize: "24px", fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function StatusPill({ marked }: { marked: boolean }) {
  if (marked) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12.5px",
          fontWeight: 700,
          color: "#4E7048",
          background: "#E6EFE2",
          padding: "5px 11px",
          borderRadius: "6px",
        }}
      >
        ✓ Marked
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "12.5px",
        fontWeight: 700,
        color: "var(--rubric-text)",
        background: "transparent",
        border: "1px solid rgba(42,35,32,0.14)",
        padding: "4px 11px",
        borderRadius: "6px",
      }}
    >
      Not marked
    </span>
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

function ErrorCard({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "var(--warning-bg)",
        border: `1px solid ${"var(--warning-border)"}`,
        borderRadius: "10px",
        padding: "32px 22px",
        textAlign: "center",
        fontSize: "15px",
        fontWeight: 600,
        color: "var(--warning-fg)",
      }}
    >
      {message}
    </div>
  );
}
