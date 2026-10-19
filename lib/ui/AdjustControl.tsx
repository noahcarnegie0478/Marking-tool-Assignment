"use client";

import { useState } from "react";
import { parseAdjustMark } from "@/lib/domain/parseAdjustMark";

// The small inline control opened by the "Adjust" button on a graded card.
// Reuses parseAdjustMark (built in ADJ-01) to validate the tutor's typed
// value before it ever reaches the reducer, so a bad value (out of range,
// not a whole number) shows a clear error here instead of silently doing
// nothing when ADJUST is dispatched.
export function AdjustControl({
  currentMark,
  maxMarks,
  onSubmit,
  onCancel,
}: {
  currentMark: number;
  maxMarks: number;
  onSubmit: (mark: number) => void;
  onCancel: () => void;
}) {
  const [rawValue, setRawValue] = useState(String(currentMark));
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const parsed = parseAdjustMark(rawValue, maxMarks);
    if ("rejected" in parsed) {
      setError(`Enter a whole number from 0 to ${maxMarks}.`);
      return;
    }
    onSubmit(parsed.mark);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="number"
          min={0}
          max={maxMarks}
          value={rawValue}
          onChange={(event) => {
            setRawValue(event.target.value);
            setError(null);
          }}
          aria-label="New mark"
          style={{
            width: "56px",
            padding: "6px 8px",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--foreground)",
            background: "var(--background)",
            border: "1px solid rgba(16,24,40,0.12)",
            borderRadius: "6px",
          }}
        />
        <button
          type="button"
          onClick={handleSave}
          className="cursor-pointer border-none hover:bg-[var(--accent-hover)]"
          style={{
            background: "var(--accent)",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            padding: "6px 12px",
            borderRadius: "6px",
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer hover:bg-[var(--hover-bg)]"
          style={{
            background: "var(--card)",
            color: "var(--foreground)",
            border: "1px solid rgba(16,24,40,0.12)",
            fontSize: "13px",
            fontWeight: 700,
            padding: "6px 12px",
            borderRadius: "6px",
          }}
        >
          Cancel
        </button>
      </div>
      {error && (
        <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--accent)" }}>{error}</span>
      )}
    </div>
  );
}
