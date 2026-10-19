"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGradingState } from "@/lib/state/GradingContext";
import { getStatus, getTotal } from "@/lib/state/selectors";

type Submission = { name: string };

// Screen 1: the exam landing page. Lists one row per student with their
// marking status and total, read from the grading store (not yet touched
// until a tutor opens that student's page).
export default function Home() {
  const { results } = useGradingState();
  const [students, setStudents] = useState<Submission[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/submissions")
      .then((response) => response.json())
      .then((body) => setStudents(body.students))
      .catch((error) => {
        console.error("Failed to load submissions list", error);
        setLoadError(true);
      });
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center p-16">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold mb-6">Maths Exam</h1>

        {loadError && <p>Could not load submissions. Try refreshing.</p>}

        {!loadError && students === null && <p>Loading submissions...</p>}

        {!loadError && students !== null && (
          <ul className="flex flex-col gap-2">
            {students.map(({ name }) => {
              const status = getStatus(results, name);
              const total = getTotal(results, name);
              return (
                <li key={name}>
                  <Link
                    href={`/student/${encodeURIComponent(name)}`}
                    className="flex justify-between items-center border rounded px-4 py-3 hover:bg-black/[.03]"
                  >
                    <span>{name}</span>
                    <span>{status}</span>
                    <span>{total ? `${total.awarded}/${total.max}` : "–"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
