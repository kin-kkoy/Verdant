"use client";

import { useState, useTransition } from "react";
import { ACTIVITY_TAGS } from "@/lib/tags";
import { checkInToday } from "@/lib/actions";

export default function CheckinCard({
  mode,
  initialTags,
  initialNote,
  checkedInToday,
}: {
  mode: "official" | "visitor";
  initialTags: string[];
  initialNote: string;
  checkedInToday: boolean;
}) {
  const [tags, setTags] = useState<Set<string>>(new Set(initialTags));
  const [note, setNote] = useState(initialNote);
  const [done, setDone] = useState(checkedInToday);
  const [pending, startTransition] = useTransition();

  function toggleTag(t: string) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function submit() {
    if (mode === "visitor") {
      // Visitor teaser — nothing persists; just reflect the action in-memory.
      setDone(true);
      return;
    }
    setDone(true); // optimistic; the action persists in the background
    startTransition(async () => {
      await checkInToday([...tags], note);
    });
  }

  return (
    <div className="card checkin">
      <div className="field">
        <label>Activity</label>
        <div className="tags">
          {ACTIVITY_TAGS.map((t) => (
            <span
              key={t}
              className={`tag${tags.has(t) ? " on" : ""}`}
              onClick={() => toggleTag(t)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleTag(t);
                }
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="field">
        <label>A note (optional)</label>
        <textarea
          rows={2}
          placeholder="How did it feel?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <button
        className="btn lg"
        style={{
          width: "100%",
          justifyContent: "center",
          background: done ? "var(--accent-ink)" : undefined,
        }}
        onClick={submit}
        disabled={pending}
      >
        {done ? "✓ Checked in for today" : pending ? "Saving…" : "Check in for today"}
      </button>
      {mode === "visitor" ? (
        <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 10, textAlign: "center" }}>
          Guest mode — nothing is saved. Sign in to keep your streak.
        </p>
      ) : null}
    </div>
  );
}
