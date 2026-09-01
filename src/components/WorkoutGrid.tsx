"use client";

import { useEffect, useState, useTransition } from "react";
import type { ExerciseCard, ExerciseCompletion, RoutineView, WorkoutsView } from "@/lib/data";
import type { ExerciseUnit } from "@/lib/db/schema";
import type { CatalogExercise } from "@/lib/exercises/catalog";
import { describeCard } from "@/lib/workouts";
import { todaySG } from "@/lib/date";
import { fileToDownscaledDataUrl } from "@/lib/photo";
import {
  createExercise,
  createRoutine,
  deleteExercise,
  deleteExerciseLog,
  deleteRoutine,
  logExercise,
  logRoutine,
  updateExercise,
  updateRoutine,
} from "@/lib/actions";
import ExerciseFigure from "./ExerciseFigure";
import ExercisePicker from "./ExercisePicker";
import NumberField from "./NumberField";
import PaperModal from "./PaperModal";

// Optimistic rows get negative ids counting DOWN, swapped for the real id when the
// action returns. Visitor demo rows are negative too, and the `id < 0` guard below
// covers both — a not-yet-persisted row must never fire a delete.
let tempId = -1000;

type Draft = {
  name: string;
  slug: string | null;
  unit: ExerciseUnit;
  sets: number;
  amount: number;
  image: string | null;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  slug: null,
  unit: "reps",
  sets: 3,
  amount: 10,
  image: null,
};

export default function WorkoutGrid({ initial }: { initial: WorkoutsView }) {
  const visitor = initial.mode === "visitor";
  const [cards, setCards] = useState<ExerciseCard[]>(initial.cards);
  const [completions, setCompletions] = useState<ExerciseCompletion[]>(initial.completions);
  const [routines, setRoutines] = useState<RoutineView[]>(initial.routines);
  const [, startTransition] = useTransition();

  // Re-seed when the server sends fresh props (e.g. after a Refresh).
  useEffect(() => setCards(initial.cards), [initial.cards]);
  useEffect(() => setCompletions(initial.completions), [initial.completions]);
  useEffect(() => setRoutines(initial.routines), [initial.routines]);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseCard | null>(null);
  const [logging, setLogging] = useState<ExerciseCard | null>(null);
  const [viewing, setViewing] = useState<ExerciseCard | null>(null);
  const [routineOpen, setRoutineOpen] = useState<RoutineView | "new" | null>(null);
  const [error, setError] = useState("");

  function note(msg: string) {
    setError(msg);
    setTimeout(() => setError(""), 4000);
  }

  // ---- card create / edit ----------------------------------------------------

  function saveCard(draft: Draft, existing: ExerciseCard | null) {
    if (!draft.name.trim()) return note("Give the exercise a name.");

    if (existing) {
      const patch = { ...existing, ...draft };
      setCards((prev) => prev.map((c) => (c.id === existing.id ? patch : c)));
      setEditing(null);
      if (visitor || existing.id < 0) return;
      startTransition(async () => {
        const res = await updateExercise(existing.id, draft);
        if (!res.ok) {
          setCards((prev) => prev.map((c) => (c.id === existing.id ? existing : c)));
          note(res.error);
        }
      });
      return;
    }

    const tid = tempId--;
    const optimistic: ExerciseCard = {
      id: tid,
      ...draft,
      muscle: "",
      frames: draft.slug ? 3 : draft.image ? 1 : 0,
      doneCount: 0,
      lastDay: null,
      doneToday: false,
    };
    setCards((prev) => [...prev, optimistic]);
    setAddOpen(false);
    if (visitor) return;
    startTransition(async () => {
      const res = await createExercise(draft);
      if (res.ok) {
        setCards((prev) => prev.map((c) => (c.id === tid ? { ...c, id: res.id } : c)));
      } else {
        setCards((prev) => prev.filter((c) => c.id !== tid));
        note(res.error);
      }
    });
  }

  function removeCard(card: ExerciseCard) {
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setCompletions((prev) => prev.filter((l) => l.exerciseId !== card.id));
    setViewing(null);
    setEditing(null);
    if (visitor || card.id < 0) return;
    startTransition(async () => {
      const res = await deleteExercise(card.id);
      if (!res.ok) note(res.error);
    });
  }

  // ---- logging ---------------------------------------------------------------

  function commitLog(card: ExerciseCard, sets: number, amount: number) {
    const tid = tempId--;
    const today = todaySG();
    setCompletions((prev) => [
      { id: tid, exerciseId: card.id, day: today, sets, amount, unit: card.unit,
        when: "just now", ts: Date.now() },
      ...prev,
    ]);
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id ? { ...c, doneCount: c.doneCount + 1, doneToday: true, lastDay: today } : c,
      ),
    );
    setLogging(null);
    if (visitor || card.id < 0) return;
    startTransition(async () => {
      const res = await logExercise(card.id, sets, amount);
      if (res.ok) {
        setCompletions((prev) => prev.map((l) => (l.id === tid ? { ...l, id: res.id } : l)));
      } else {
        setCompletions((prev) => prev.filter((l) => l.id !== tid));
        setCards((prev) =>
          prev.map((c) => (c.id === card.id ? { ...c, doneCount: Math.max(0, c.doneCount - 1) } : c)),
        );
        note(res.error);
      }
    });
  }

  function removeLog(log: ExerciseCompletion) {
    setCompletions((prev) => prev.filter((l) => l.id !== log.id));
    setCards((prev) =>
      prev.map((c) =>
        c.id === log.exerciseId ? { ...c, doneCount: Math.max(0, c.doneCount - 1) } : c,
      ),
    );
    if (visitor || log.id < 0) return;
    startTransition(async () => {
      const res = await deleteExerciseLog(log.id);
      if (!res.ok) note(res.error);
    });
  }

  // ---- routines --------------------------------------------------------------

  function saveRoutine(name: string, ids: number[], existing: RoutineView | null) {
    if (!name.trim()) return note("Give the routine a name.");
    if (existing) {
      const patch = { ...existing, name, exerciseIds: ids };
      setRoutines((prev) => prev.map((r) => (r.id === existing.id ? patch : r)));
      setRoutineOpen(null);
      if (visitor || existing.id < 0) return;
      startTransition(async () => {
        const res = await updateRoutine(existing.id, name, ids);
        if (!res.ok) note(res.error);
      });
      return;
    }
    const tid = tempId--;
    setRoutines((prev) => [...prev, { id: tid, name, exerciseIds: ids }]);
    setRoutineOpen(null);
    if (visitor) return;
    startTransition(async () => {
      const res = await createRoutine(name, ids);
      if (res.ok) setRoutines((prev) => prev.map((r) => (r.id === tid ? { ...r, id: res.id } : r)));
      else {
        setRoutines((prev) => prev.filter((r) => r.id !== tid));
        note(res.error);
      }
    });
  }

  function removeRoutine(r: RoutineView) {
    setRoutines((prev) => prev.filter((x) => x.id !== r.id));
    setRoutineOpen(null);
    if (visitor || r.id < 0) return;
    startTransition(async () => {
      const res = await deleteRoutine(r.id);
      if (!res.ok) note(res.error);
    });
  }

  function runRoutine(r: RoutineView) {
    const members = cards.filter((c) => r.exerciseIds.includes(c.id));
    if (members.length === 0) return note("That routine has no cards yet.");
    const today = todaySG();
    setCards((prev) =>
      prev.map((c) =>
        r.exerciseIds.includes(c.id)
          ? { ...c, doneCount: c.doneCount + 1, doneToday: true, lastDay: today }
          : c,
      ),
    );
    setCompletions((prev) => [
      ...members.map((c) => ({
        id: tempId--,
        exerciseId: c.id,
        day: today,
        sets: c.sets,
        amount: c.amount,
        unit: c.unit,
        when: "just now",
        ts: Date.now(),
      })),
      ...prev,
    ]);
    setRoutineOpen(null);
    if (visitor || r.id < 0) return;
    startTransition(async () => {
      const res = await logRoutine(r.id);
      if (!res.ok) note(res.error);
    });
  }

  const viewingLogs = viewing
    ? completions.filter((l) => l.exerciseId === viewing.id).sort((a, b) => b.ts - a.ts)
    : [];

  return (
    <>
      {error ? (
        <p className="card" style={{ color: "var(--rust)", marginBottom: 16, padding: 14 }}>
          {error}
        </p>
      ) : null}

      <RoutineBar
        routines={routines}
        cards={cards}
        onOpen={setRoutineOpen}
        onRun={runRoutine}
      />

      <div className="jmasonry">
        <div
          className="jentry add"
          role="button"
          tabIndex={0}
          onClick={() => setAddOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setAddOpen(true);
            }
          }}
        >
          <div className="add-inner">
            <div className="plus">+</div>
            <div className="add-label">Add an exercise</div>
            <div className="add-sub">Pick from 302, or make your own</div>
          </div>
        </div>

        {cards.map((c) => (
          <div key={c.id} className={`jentry excard${c.doneToday ? " today" : ""}`}>
            <div
              className="ph"
              role="button"
              tabIndex={0}
              onClick={() => setViewing(c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setViewing(c);
                }
              }}
            >
              <ExerciseFigure slug={c.slug} image={c.image} name={c.name} />
            </div>
            <div className="b">
              <h4>{c.name}</h4>
              <div className="exmeta">
                <span className="meta">{describeCard(c.sets, c.amount, c.unit)}</span>
                <span className="excount">
                  {c.doneCount === 0 ? "not yet" : `done ${c.doneCount}×`}
                </span>
              </div>
              <button
                className={`btn exlog${c.doneToday ? " exdone" : ""}`}
                onClick={() => setLogging(c)}
              >
                {c.doneToday ? "✓ Done today · log again" : "Log it"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {visitor ? (
        <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 18 }}>
          Guest mode — nothing is saved. Sign in to build your own library.
        </p>
      ) : null}

      {addOpen ? (
        <CardModal
          title="Add an exercise"
          initial={EMPTY_DRAFT}
          onClose={() => setAddOpen(false)}
          onSave={(d) => saveCard(d, null)}
        />
      ) : null}

      {editing ? (
        <CardModal
          title="Edit card"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(d) => saveCard(d, editing)}
        />
      ) : null}

      {logging ? (
        <LogModal card={logging} onClose={() => setLogging(null)} onSave={commitLog} />
      ) : null}

      {viewing ? (
        <PaperModal onClose={() => setViewing(null)} onDelete={() => removeCard(viewing)}>
          <div style={{ maxWidth: 200, margin: "0 auto 14px" }}>
            <ExerciseFigure
              slug={viewing.slug}
              image={viewing.image}
              name={viewing.name}
              frames={viewing.frames}
              animate
            />
          </div>
          <h3>{viewing.name}</h3>
          <div className="pmeta">
            {describeCard(viewing.sets, viewing.amount, viewing.unit)}
            {viewing.muscle ? ` · ${viewing.muscle}` : null} · done {viewing.doneCount}×
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => { setViewing(null); setEditing(viewing); }}>
              Edit card
            </button>
            <button className="btn" onClick={() => { setViewing(null); setLogging(viewing); }}>
              Log it
            </button>
          </div>
          {viewingLogs.length === 0 ? (
            <p className="ptext" style={{ color: "var(--faint)" }}>
              No completions logged yet.
            </p>
          ) : (
            viewingLogs.map((l, i) => (
              <div className="logitem" key={l.id}>
                <div className="n">{viewingLogs.length - i}</div>
                <div className="lbody" style={{ flex: 1 }}>
                  <div className="lmeta">
                    {l.day} · {l.when}
                  </div>
                  <p>{describeCard(l.sets, l.amount, l.unit)}</p>
                </div>
                <button className="jdel" title="Remove" onClick={() => removeLog(l)}>
                  ×
                </button>
              </div>
            ))
          )}
        </PaperModal>
      ) : null}

      {routineOpen ? (
        <RoutineModal
          routine={routineOpen === "new" ? null : routineOpen}
          cards={cards}
          onClose={() => setRoutineOpen(null)}
          onSave={saveRoutine}
          onDelete={routineOpen === "new" ? undefined : () => removeRoutine(routineOpen)}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------

function RoutineBar({
  routines,
  cards,
  onOpen,
  onRun,
}: {
  routines: RoutineView[];
  cards: ExerciseCard[];
  onOpen: (r: RoutineView | "new") => void;
  onRun: (r: RoutineView) => void;
}) {
  return (
    <div className="routinebar">
      <span className="eyebrow" style={{ marginRight: 4 }}>
        Routines
      </span>
      {routines.map((r) => {
        const n = cards.filter((c) => r.exerciseIds.includes(c.id)).length;
        return (
          <span key={r.id} className="tag on" style={{ display: "inline-flex", gap: 8 }}>
            <span
              className="rname"
              role="button"
              tabIndex={0}
              onClick={() => onOpen(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(r);
                }
              }}
            >
              {r.name} · {n}
            </span>
            <span
              role="button"
              tabIndex={0}
              title="Log every card in this routine"
              onClick={() => onRun(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRun(r);
                }
              }}
            >
              ▶
            </span>
          </span>
        );
      })}
      <span
        className="tag"
        role="button"
        tabIndex={0}
        onClick={() => onOpen("new")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen("new");
          }
        }}
      >
        + New routine
      </span>
    </div>
  );
}

function CardModal({
  title,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  initial: Draft | ExerciseCard;
  onClose: () => void;
  onSave: (d: Draft) => void;
}) {
  const [tab, setTab] = useState<"catalog" | "custom">(initial.slug ? "catalog" : "custom");
  const [draft, setDraft] = useState<Draft>({
    name: initial.name,
    slug: initial.slug,
    unit: initial.unit,
    sets: initial.sets,
    amount: initial.amount,
    image: initial.image ?? null,
  });
  const [busy, setBusy] = useState(false);

  function pick(e: CatalogExercise) {
    setDraft((d) => ({
      ...d,
      name: e.name,
      slug: e.slug,
      unit: e.unit,
      // Timed moves start at a sensible 30s rather than 10 "reps".
      amount: e.unit === "seconds" && d.unit !== "seconds" ? 30 : d.amount,
      image: null,
    }));
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      setDraft((d) => ({ ...d, slug: null }));
      const url = await fileToDownscaledDataUrl(file, 600, 0.8);
      setDraft((d) => ({ ...d, image: url }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-bg open"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ width: "min(560px,100%)" }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>{title}</h3>

        <div className="tags" style={{ marginBottom: 16 }}>
          {(["catalog", "custom"] as const).map((t) => (
            <span
              key={t}
              className={`tag${tab === t ? " on" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => setTab(t)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setTab(t);
                }
              }}
            >
              {t === "catalog" ? "Pick an exercise" : "Custom"}
            </span>
          ))}
        </div>

        {tab === "catalog" ? (
          <ExercisePicker selected={draft.slug} onPick={pick} />
        ) : (
          <>
            <span className="mlabel">Name</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value, slug: null }))}
              placeholder="e.g. Hindu push-up"
            />
            <span className="mlabel">Counted in</span>
            <div className="tags" style={{ marginBottom: 14 }}>
              {(["reps", "seconds"] as const).map((u) => (
                <span
                  key={u}
                  className={`tag${draft.unit === u ? " on" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDraft((d) => ({ ...d, unit: u }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDraft((d) => ({ ...d, unit: u }));
                    }
                  }}
                >
                  {u === "reps" ? "Reps" : "Seconds"}
                </span>
              ))}
            </div>
            <span className="mlabel">Picture (optional)</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              {draft.image ? (
                <div className="imgprev">
                  <div className="it">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draft.image} alt="" />
                    <button onClick={() => setDraft((d) => ({ ...d, image: null }))}>×</button>
                  </div>
                </div>
              ) : null}
              <label className="btn ghost" style={{ cursor: "pointer" }}>
                {busy ? "Loading…" : draft.image ? "Replace" : "Add a picture"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => pickPhoto(e.target.files?.[0])}
                />
              </label>
            </div>
          </>
        )}

        {draft.name ? (
          <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
            <NumberField
              label="Sets"
              value={draft.sets}
              max={99}
              onChange={(n) => setDraft((d) => ({ ...d, sets: n }))}
            />
            <NumberField
              label={draft.unit === "seconds" ? "Seconds" : "Reps"}
              value={draft.amount}
              step={draft.unit === "seconds" ? 5 : 1}
              onChange={(n) => setDraft((d) => ({ ...d, amount: n }))}
            />
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={!draft.name.trim() || busy} onClick={() => onSave(draft)}>
            Save card
          </button>
        </div>
      </div>
    </div>
  );
}

function LogModal({
  card,
  onClose,
  onSave,
}: {
  card: ExerciseCard;
  onClose: () => void;
  onSave: (card: ExerciseCard, sets: number, amount: number) => void;
}) {
  const [sets, setSets] = useState(card.sets);
  const [amount, setAmount] = useState(card.amount);

  return (
    <div className="modal-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>{card.name}</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
          Logging for today. Adjust if it went differently.
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          <NumberField label="Sets" value={sets} max={99} onChange={setSets} />
          <NumberField
            label={card.unit === "seconds" ? "Seconds" : "Reps"}
            value={amount}
            step={card.unit === "seconds" ? 5 : 1}
            onChange={setAmount}
          />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={() => onSave(card, sets, amount)}>
            Log it
          </button>
        </div>
      </div>
    </div>
  );
}

function RoutineModal({
  routine,
  cards,
  onClose,
  onSave,
  onDelete,
}: {
  routine: RoutineView | null;
  cards: ExerciseCard[];
  onClose: () => void;
  onSave: (name: string, ids: number[], existing: RoutineView | null) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(routine?.name ?? "");
  const [ids, setIds] = useState<number[]>(routine?.exerciseIds ?? []);

  function toggle(id: number) {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="modal-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(520px,100%)" }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
          {routine ? "Edit routine" : "New routine"}
        </h3>
        <span className="mlabel">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push day" />
        <span className="mlabel">Cards in this routine</span>
        {cards.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--faint)" }}>Add some exercise cards first.</p>
        ) : (
          <div className="tags">
            {cards.map((c) => (
              <span
                key={c.id}
                className={`tag${ids.includes(c.id) ? " on" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => toggle(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(c.id);
                  }
                }}
              >
                {ids.includes(c.id) ? "✓ " : ""}
                {c.name}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 20 }}>
          {onDelete ? (
            <button className="btn ghost" onClick={onDelete}>
              Delete
            </button>
          ) : null}
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={!name.trim()} onClick={() => onSave(name.trim(), ids, routine)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
