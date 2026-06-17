"use client";

import { useRef, useState, useTransition } from "react";
import { saveWeighIn } from "@/lib/actions";

const round1 = (n: number) => Math.round(n * 10) / 10;
const clampW = (n: number) => Math.max(30, Math.min(400, round1(n)));

export default function WeighInCard({
  mode,
  latestWeight,
  prevWeight,
}: {
  mode: "official" | "visitor";
  latestWeight: number | null;
  prevWeight: number | null;
}) {
  const start = latestWeight ?? 80.0;
  const [weight, setWeight] = useState(start);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dirty = round1(weight) !== round1(start);

  function step(d: number) {
    setWeight((w) => clampW(w + d * 0.1));
    setSaved(false);
  }

  function beginEdit() {
    setDraft(weight.toFixed(1));
    setEditing(true);
    // focus + select after render
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function commitEdit() {
    const n = Number(draft);
    if (Number.isFinite(n)) {
      setWeight(clampW(n));
      setSaved(false);
    }
    setEditing(false);
  }

  function save() {
    if (mode === "visitor") {
      setSaved(true);
      return;
    }
    setSaved(true); // optimistic; stats refresh on next navigation / Refresh
    startTransition(async () => {
      const res = await saveWeighIn(weight);
      if (res.ok) {
        setSaved(true);
      }
    });
  }

  // Caption: compare the working value to the previous saved entry.
  const compareTo = latestWeight ?? prevWeight;
  const delta = compareTo != null ? round1(compareTo - weight) : null;

  return (
    <div className="card checkin">
      <div className="field">
        <label style={{ textAlign: "center" }}>Today&apos;s weigh-in</label>
        <div className="weigh" style={{ justifyContent: "center" }}>
          <button className="stepper" onClick={() => step(-1)} aria-label="Decrease">
            −
          </button>
          {editing ? (
            <input
              ref={inputRef}
              className="weigh-input num"
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <div
              className="val num"
              onDoubleClick={beginEdit}
              title="Double-click to type an exact value"
              style={{ cursor: "text" }}
            >
              {weight.toFixed(1)}
              <small> kg</small>
            </div>
          )}
          <button className="stepper" onClick={() => step(1)} aria-label="Increase">
            +
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--faint)", textAlign: "center", marginTop: 8 }}>
          Double-click the number to type it exactly.
        </p>
      </div>
      <button
        className="btn"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={save}
        disabled={pending || (!dirty && saved) || (mode === "official" && !dirty)}
      >
        {saved ? "✓ Saved" : pending ? "Saving…" : "Save weigh-in"}
      </button>
      <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 10 }}>
        {delta != null && delta > 0
          ? `Down ${delta.toFixed(1)} kg since your last entry. Keep the line drifting down 🍂`
          : delta != null && delta < 0
            ? `Up ${Math.abs(delta).toFixed(1)} kg since last time — tomorrow's a fresh page.`
            : "Log today's number to keep the trend honest."}
        {mode === "visitor" ? " (Guest mode — not saved.)" : ""}
      </p>
    </div>
  );
}
