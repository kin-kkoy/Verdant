"use client";

import { useState, useTransition } from "react";
import { setTracksWorkouts } from "@/lib/actions";

/**
 * What counts toward your day. Shown on your own profile only.
 *
 * The point of this control: a day's brightest square is measured against YOUR
 * target, so someone who never intends to work out shouldn't be carrying two
 * workout points they'll never earn. Turning workouts off lowers the bar rather
 * than penalising anything.
 */
export default function TrackingPrefs({ tracksWorkouts }: { tracksWorkouts: boolean }) {
  const [on, setOn] = useState(tracksWorkouts);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function choose(next: boolean) {
    if (next === on) return;
    const prev = on;
    setOn(next);
    setError("");
    startTransition(async () => {
      const res = await setTracksWorkouts(next);
      if (!res.ok) {
        setOn(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="card">
      <div className="section-head" style={{ marginBottom: 16 }}>
        <div className="eyebrow">What counts toward your day</div>
        <p style={{ fontSize: 14.5 }}>
          A full square means you did <em>your</em> day, not the most possible. Turn off what you
          don&apos;t track and the bar comes down with it.
        </p>
      </div>

      {error ? (
        <p style={{ color: "var(--rust)", fontSize: 14, marginBottom: 12 }}>{error}</p>
      ) : null}

      <span className="mlabel">Workouts</span>
      <div className="tags">
        {([true, false] as const).map((v) => (
          <span
            key={String(v)}
            className={`tag${on === v ? " on" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => choose(v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                choose(v);
              }
            }}
          >
            {v ? "I track workouts" : "I don't work out"}
          </span>
        ))}
      </div>
      <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 12 }}>
        {on
          ? "Two different exercise cards in a day counts as a full workout day."
          : "Workouts are excluded, so a weigh-in plus a check-in already fills your square."}
      </p>
    </div>
  );
}
