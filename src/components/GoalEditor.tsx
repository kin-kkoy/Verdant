"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateGoal } from "@/lib/actions";

export default function GoalEditor({ goalKg }: { goalKg: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(goalKg != null ? String(goalKg) : "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function openModal() {
    setValue(goalKg != null ? String(goalKg) : "");
    setError("");
    setOpen(true);
  }

  function save(goal: number | null) {
    setError("");
    startTransition(async () => {
      const res = await updateGoal(goal);
      if (res.ok) {
        setOpen(false);
        router.refresh(); // rare action — reflect the new goal across stats/standings
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button className="btn ghost" onClick={openModal} style={{ marginTop: 14 }}>
        {goalKg != null ? "Edit goal" : "Set a goal"}
      </button>

      <div className={`modal-bg${open ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <div className="modal">
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>Your goal</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
            How many kilograms are you aiming to lose? Leave it off to just track without a goal.
          </p>
          {error ? <p style={{ color: "var(--rust)", fontSize: 14, marginBottom: 12 }}>{error}</p> : null}
          <span className="mlabel">Goal (kg)</span>
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && value.trim() && save(Number(value))}
            placeholder="e.g. 5"
            autoFocus
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
            <button className="btn ghost" onClick={() => save(null)} disabled={pending}>
              No goal — just track
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
            <button className="btn" onClick={() => save(Number(value))} disabled={pending || !value.trim()}>
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
