"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useGradingDispatch, useGradingState } from "@/lib/state/GradingContext";
import type { StudentSubmission } from "@/lib/exam/loadExam";

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
  const { results } = useGradingState();
  const dispatch = useGradingDispatch();
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const alreadyInitialised = Boolean(results[name]);

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
    return (
      <main className="flex flex-1 flex-col items-center p-16">
        <p>Student not found.</p>
        <Link href="/" className="underline mt-4">
          Return
        </Link>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex flex-1 flex-col items-center p-16">
        <p>Could not load this student. Try refreshing.</p>
        <Link href="/" className="underline mt-4">
          Return
        </Link>
      </main>
    );
  }

  const questionResults = results[name];

  return (
    <main className="flex flex-1 flex-col items-center p-16">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">{name}</h1>
          <Link href="/" className="underline">
            Return
          </Link>
        </div>

        {!questionResults && <p>Loading...</p>}

        {questionResults && (
          <ul className="flex flex-col gap-4">
            {Object.values(questionResults).map((question) => {
              const isNoSubmission = question.status === "no_submission";
              return (
                <li
                  key={question.questionId}
                  className={`border rounded p-4 ${isNoSubmission ? "opacity-50" : ""}`}
                >
                  <p className="font-medium">{question.question}</p>
                  <p className="text-sm mt-1">Rubric: {question.rubric}</p>
                  <p className="text-sm mt-1">
                    Response:{" "}
                    {isNoSubmission ? "No submission" : question.response}
                  </p>
                  <p className="text-sm mt-1">
                    Mark: {isNoSubmission ? "0" : "–"} / {question.maxMarks}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
