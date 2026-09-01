"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateGoal, updateStartWeight } from "@/lib/actions";

type Modal = null | "weight" | "goal";

export default function AccountMenu({
  startWeight,
  goalKg,
}: {
  startWeight: number;
  goalKg: number | null;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [weightVal, setWeightVal] = useState(String(startWeight));
  // Goals are stored signed; the modal splits that into a direction + a size.
  const [goalVal, setGoalVal] = useState(goalKg != null ? String(Math.abs(goalKg)) : "");
  const [goalDir, setGoalDir] = useState<"lose" | "gain">(
    goalKg != null && goalKg < 0 ? "gain" : "lose",
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function openModal(which: Modal) {
    setMenuOpen(false);
    setError("");
    if (which === "weight") setWeightVal(String(startWeight));
    if (which === "goal") {
      setGoalVal(goalKg != null ? String(Math.abs(goalKg)) : "");
      setGoalDir(goalKg != null && goalKg < 0 ? "gain" : "lose");
    }
    setModal(which);
  }

  /** The stored goal: positive to lose, negative to gain. */
  function signedGoal(): number {
    const size = Math.abs(Number(goalVal));
    return goalDir === "gain" ? -size : size;
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setModal(null);
        router.refresh(); // rare action — reflect across stats/standings
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="kebab-wrap">
      <button
        className="iconbtn"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Account options"
        title="Options"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {menuOpen ? (
        <>
          <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="menu">
            <button onClick={() => openModal("weight")}>Change starting weight</button>
            <button onClick={() => openModal("goal")}>Edit goal</button>
          </div>
        </>
      ) : null}

      {/* starting weight modal */}
      <div className={`modal-bg${modal === "weight" ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
        <div className="modal">
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>Starting weight</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
            Re-baseline your starting point — e.g. after a break. Progress is measured from this number.
          </p>
          {error ? <p style={{ color: "var(--rust)", fontSize: 14, marginBottom: 12 }}>{error}</p> : null}
          <span className="mlabel">Starting weight (kg)</span>
          <input
            inputMode="decimal"
            value={weightVal}
            onChange={(e) => setWeightVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && weightVal.trim() && run(() => updateStartWeight(Number(weightVal)))}
            autoFocus
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button className="btn ghost" onClick={() => setModal(null)} disabled={pending}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={() => run(() => updateStartWeight(Number(weightVal)))}
              disabled={pending || !weightVal.trim()}
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* goal modal */}
      <div className={`modal-bg${modal === "goal" ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
        <div className="modal">
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>Your goal</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
            Which way are you headed, and by how much? Bulking counts as progress too. Leave
            it off to just track without a goal.
          </p>
          {error ? <p style={{ color: "var(--rust)", fontSize: 14, marginBottom: 12 }}>{error}</p> : null}
          <span className="mlabel">Direction</span>
          <div className="tags" style={{ marginBottom: 16 }}>
            {(["lose", "gain"] as const).map((dir) => (
              <span
                key={dir}
                className={`tag${goalDir === dir ? " on" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => setGoalDir(dir)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setGoalDir(dir);
                  }
                }}
              >
                {dir === "lose" ? "Lose weight" : "Gain weight"}
              </span>
            ))}
          </div>
          <span className="mlabel">Goal (kg)</span>
          <input
            inputMode="decimal"
            value={goalVal}
            onChange={(e) => setGoalVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goalVal.trim() && run(() => updateGoal(signedGoal()))}
            placeholder="e.g. 5"
            autoFocus
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
            <button className="btn ghost" onClick={() => run(() => updateGoal(null))} disabled={pending}>
              No goal — just track
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn ghost" onClick={() => setModal(null)} disabled={pending}>
              Cancel
            </button>
            <button className="btn" onClick={() => run(() => updateGoal(signedGoal()))} disabled={pending || !goalVal.trim()}>
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
