"use client";

import { useState } from "react";

/**
 * Stepper + type-exact number entry, matching the weigh-in card's widget.
 * 44px targets and `inputMode="decimal"` — these users are on phones, and
 * `<input type="number">` spinners are miserable there.
 */
export default function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");

  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)));

  function commit() {
    const n = Number(draft);
    if (Number.isFinite(n) && draft.trim() !== "") onChange(clamp(n));
    setTyping(false);
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="weigh">
        <button
          type="button"
          className="stepper"
          onClick={() => onChange(clamp(value - step))}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        {typing ? (
          <input
            className="weigh-input"
            inputMode="decimal"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setTyping(false);
            }}
          />
        ) : (
          <div
            className="val num"
            role="button"
            tabIndex={0}
            title="Tap to type an exact number"
            onClick={() => {
              setDraft(String(value));
              setTyping(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setDraft(String(value));
                setTyping(true);
              }
            }}
          >
            {value}
          </div>
        )}
        <button
          type="button"
          className="stepper"
          onClick={() => onChange(clamp(value + step))}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
