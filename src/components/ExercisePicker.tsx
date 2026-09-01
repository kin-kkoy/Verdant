"use client";

import { useMemo, useState } from "react";
import { CATALOG, MUSCLES, type CatalogExercise } from "@/lib/exercises/catalog";
import ExerciseFigure from "./ExerciseFigure";

/**
 * Search/browse the 302 bundled exercises. Picking one hands back its name,
 * figure and unit — so a Plank card knows it counts seconds, not reps.
 */
export default function ExercisePicker({
  selected,
  onPick,
}: {
  selected: string | null;
  onPick: (e: CatalogExercise) => void;
}) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return CATALOG.filter((e) => {
      if (muscle && e.muscle !== muscle) return false;
      if (!needle) return true;
      return (
        e.name.toLowerCase().includes(needle) ||
        e.muscle.toLowerCase().includes(needle) ||
        e.equipment.toLowerCase().includes(needle)
      );
    }).slice(0, 120);
  }, [q, muscle]);

  return (
    <>
      <input
        className="exsearch"
        placeholder="Search 302 exercises…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <div className="filterrow">
        <span
          className={`tag${muscle == null ? " on" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => setMuscle(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMuscle(null);
            }
          }}
        >
          All
        </span>
        {MUSCLES.map((m) => (
          <span
            key={m}
            className={`tag${muscle === m ? " on" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => setMuscle(m)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setMuscle(m);
              }
            }}
          >
            {m}
          </span>
        ))}
      </div>

      {results.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--faint)", padding: "18px 0" }}>
          Nothing matches. Try the Custom tab to add it yourself.
        </p>
      ) : (
        <div className="expick">
          {results.map((e) => (
            <button
              key={e.slug}
              type="button"
              className={selected === e.slug ? "on" : ""}
              onClick={() => onPick(e)}
            >
              <ExerciseFigure slug={e.slug} name={e.name} />
              <div className="pn">{e.name}</div>
              <div className="pm">
                {e.muscle} · {e.unit === "seconds" ? "timed" : "reps"}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
