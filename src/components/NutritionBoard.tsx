"use client";

import { useEffect, useState, useTransition } from "react";
import type { LoggedMeal, NutritionView } from "@/lib/data";
import type { MealItem } from "@/lib/db/schema";
import { ACTIVITY_LABELS, type ActivityLevel } from "@/lib/nutrition/targets";
import {
  deleteMeal,
  estimateMeal,
  saveBodyProfile,
  saveFood,
  saveMeal,
  saveSleep,
  setTargetOverride,
} from "@/lib/actions";
import LabelScanner from "./LabelScanner";
import PaperModal from "./PaperModal";

let tempId = -1000;

const SOURCE_LABEL: Record<MealItem["source"], string> = {
  saved: "your food",
  bundled: "estimate",
  openfoodfacts: "Open Food Facts",
  label: "from the label",
  manual: "you typed it",
};

export default function NutritionBoard({ initial }: { initial: NutritionView }) {
  const visitor = initial.mode === "visitor";
  const [meals, setMeals] = useState<LoggedMeal[]>(initial.meals);
  const [sleep, setSleep] = useState<number | null>(initial.sleepHours);
  const [, startTransition] = useTransition();

  useEffect(() => setMeals(initial.meals), [initial.meals]);

  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [setup, setSetup] = useState(false);
  const [editTargets, setEditTargets] = useState(false);
  const [viewing, setViewing] = useState<LoggedMeal | null>(null);
  const [error, setError] = useState("");

  function note(msg: string) {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  }

  const eaten = {
    kcal: meals.reduce((n, m) => n + m.kcal, 0),
    protein: Math.round(meals.reduce((n, m) => n + m.protein, 0) * 10) / 10,
  };
  const goal = initial.goal;
  const leftKcal = goal ? Math.max(0, goal.kcal - eaten.kcal) : null;
  const leftProtein = goal ? Math.max(0, Math.round((goal.protein - eaten.protein) * 10) / 10) : null;

  function addMeal(title: string, items: MealItem[]) {
    const tid = tempId--;
    const kcal = items.reduce((n, i) => n + i.kcal, 0);
    const protein = Math.round(items.reduce((n, i) => n + i.protein, 0) * 10) / 10;
    setMeals((prev) => [
      { id: tid, day: initial.day, title, kcal, protein, items, when: "just now", ts: Date.now() },
      ...prev,
    ]);
    setAdding(false);
    setScanning(false);
    if (visitor) return;
    startTransition(async () => {
      const res = await saveMeal(title, items);
      if (res.ok) setMeals((prev) => prev.map((m) => (m.id === tid ? { ...m, id: res.id } : m)));
      else {
        setMeals((prev) => prev.filter((m) => m.id !== tid));
        note(res.error);
        return;
      }
      // Anything the user typed the numbers for themselves gets remembered, so the
      // cascade stops at step 1 next time. Their number beats any public average.
      for (const i of items) {
        if (i.source === "manual" && i.kcal > 0) {
          await saveFood(i.name, i.unit, i.kcal / i.qty, i.protein / i.qty);
        }
      }
    });
  }

  function removeMeal(m: LoggedMeal) {
    setMeals((prev) => prev.filter((x) => x.id !== m.id));
    setViewing(null);
    if (visitor || m.id < 0) return;
    startTransition(async () => {
      const res = await deleteMeal(m.id);
      if (!res.ok) note(res.error);
    });
  }

  function commitSleep(hours: number | null) {
    setSleep(hours);
    if (visitor) return;
    startTransition(async () => {
      const res = await saveSleep(hours);
      if (!res.ok) note(res.error);
    });
  }

  return (
    <>
      {error ? (
        <p className="card" style={{ color: "var(--rust)", marginBottom: 16, padding: 14 }}>
          {error}
        </p>
      ) : null}

      {/* today's numbers */}
      {goal ? (
        <div className="card nutsummary">
          <Meter
            label="Calories"
            eaten={eaten.kcal}
            goal={goal.kcal}
            left={leftKcal!}
            unit="kcal"
          />
          <Meter
            label="Protein"
            eaten={eaten.protein}
            goal={goal.protein}
            left={leftProtein!}
            unit="g"
          />
          <p className="nutkind">
            No stress if you don&apos;t land it exactly. Close counts, and showing up counts more.
          </p>
          <div className="nutactions">
            <button className="btn ghost" onClick={() => setEditTargets(true)}>
              {initial.overridden ? "Targets · manual" : "Adjust targets"}
            </button>
            <button className="btn ghost" onClick={() => setSetup(true)}>
              Body profile
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="section-head" style={{ marginBottom: 14 }}>
            <div className="eyebrow">One-time setup</div>
            <p style={{ fontSize: 15 }}>
              To work out your daily calories we need your height, birth year, sex and roughly how
              active you are. It recalculates itself every time you weigh in.
              {initial.latestWeight == null ? " You'll also need one weigh-in on the home page." : ""}
            </p>
          </div>
          <button className="btn" onClick={() => setSetup(true)}>
            Set this up
          </button>
        </div>
      )}

      {/* sleep */}
      <div className="card nutsleep">
        <div>
          <strong>Sleep last night</strong>
          <span className="sub">Recorded for your own reference — it doesn&apos;t affect your squares.</span>
        </div>
        <div className="tags">
          {[5, 6, 7, 8, 9].map((h) => (
            <span
              key={h}
              className={`tag${sleep === h ? " on" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => commitSleep(sleep === h ? null : h)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  commitSleep(sleep === h ? null : h);
                }
              }}
            >
              {h}h
            </span>
          ))}
        </div>
      </div>

      {/* meals */}
      <div className="jmasonry" style={{ marginTop: 26 }}>
        <div
          className="jentry add"
          role="button"
          tabIndex={0}
          onClick={() => setAdding(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setAdding(true);
            }
          }}
        >
          <div className="add-inner">
            <div className="plus">+</div>
            <div className="add-label">Log what you ate</div>
            <div className="add-sub">Type it, or scan a label</div>
          </div>
        </div>

        {meals.map((m) => (
          <div
            className="jentry"
            key={m.id}
            role="button"
            tabIndex={0}
            onClick={() => setViewing(m)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setViewing(m);
              }
            }}
          >
            <div className="b">
              <h4>{m.title}</h4>
              <div className="meta">{m.when}</div>
              <div className="nutrow">
                <span>
                  <b className="num">{m.kcal}</b> kcal
                </span>
                <span>
                  <b className="num">{m.protein}</b> g protein
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="nutdisclaimer">
        Calories and protein are estimates from public food data and rough portion sizes — not
        measurements. Anything that looks wrong, just edit it.
      </p>

      {visitor ? (
        <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>
          Guest mode — nothing is saved. Sign in to keep your own log.
        </p>
      ) : null}

      {adding ? (
        <AddMealModal
          visitor={visitor}
          onClose={() => setAdding(false)}
          onScan={() => {
            setAdding(false);
            setScanning(true);
          }}
          onSave={addMeal}
          onNote={note}
        />
      ) : null}

      {scanning ? (
        <LabelScanner
          onClose={() => setScanning(false)}
          onUse={(name, kcal, protein) =>
            addMeal(name, [{ name, qty: 1, unit: "pack", kcal, protein, source: "label" }])
          }
        />
      ) : null}

      {setup ? (
        <SetupModal
          initial={initial}
          visitor={visitor}
          onClose={() => setSetup(false)}
          onNote={note}
        />
      ) : null}

      {editTargets && goal ? (
        <TargetsModal
          initial={initial}
          goal={goal}
          visitor={visitor}
          onClose={() => setEditTargets(false)}
          onNote={note}
        />
      ) : null}

      {viewing ? (
        <PaperModal onClose={() => setViewing(null)} onDelete={() => removeMeal(viewing)}>
          <h3>{viewing.title}</h3>
          <div className="pmeta">
            {viewing.when} · {viewing.kcal} kcal · {viewing.protein} g protein
          </div>
          {viewing.items.map((i, n) => (
            <div className="logitem" key={n}>
              <div className="n">{n + 1}</div>
              <div className="lbody" style={{ flex: 1 }}>
                <div className="lmeta">
                  {i.qty}
                  {i.unit ? ` ${i.unit}` : ""} · {SOURCE_LABEL[i.source]}
                </div>
                <p>
                  {i.name} — {i.kcal} kcal, {i.protein} g protein
                </p>
              </div>
            </div>
          ))}
        </PaperModal>
      ) : null}
    </>
  );
}

function Meter({
  label,
  eaten,
  goal,
  left,
  unit,
}: {
  label: string;
  eaten: number;
  goal: number;
  left: number;
  unit: string;
}) {
  const pct = Math.min(100, Math.round((eaten / goal) * 100));
  const over = eaten > goal;
  return (
    <div className="nutmeter">
      <div className="pl">
        <span>{label}</span>
        <span>
          <b className="num">{eaten}</b> / {goal} {unit}
        </span>
      </div>
      <div className="track">
        <i style={{ width: `${pct}%`, background: over ? "var(--gold)" : "var(--accent)" }} />
      </div>
      <div className="nutleft">
        {over ? (
          <>
            <b className="num">{Math.round((eaten - goal) * 10) / 10}</b> {unit} over — that&apos;s
            fine, tomorrow&apos;s a fresh one.
          </>
        ) : (
          <>
            <b className="num">{left}</b> {unit} to go
          </>
        )}
      </div>
    </div>
  );
}

function AddMealModal({
  visitor,
  onClose,
  onScan,
  onSave,
  onNote,
}: {
  visitor: boolean;
  onClose: () => void;
  onScan: () => void;
  onSave: (title: string, items: MealItem[]) => void;
  onNote: (msg: string) => void;
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<MealItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function estimate() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      if (visitor) {
        // The guest teaser can't hit the server; show a plausible read instead.
        setItems([
          { name: text.trim(), qty: 1, unit: null, kcal: 250, protein: 10, source: "bundled" },
        ]);
        return;
      }
      const res = await estimateMeal(text);
      if (res.ok) setItems(res.items);
      else onNote(res.error);
    } finally {
      setBusy(false);
    }
  }

  function patch(i: number, field: "kcal" | "protein", value: number) {
    setItems((prev) =>
      prev ? prev.map((it, n) => (n === i ? { ...it, [field]: value, source: "manual" } : it)) : prev,
    );
  }

  const total = items
    ? {
        kcal: items.reduce((n, i) => n + i.kcal, 0),
        protein: Math.round(items.reduce((n, i) => n + i.protein, 0) * 10) / 10,
      }
    : null;

  return (
    <div className="modal-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(560px,100%)" }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>What did you eat?</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
          Write it how you&apos;d say it — &ldquo;a bowl of munggo and two cups of rice&rdquo;.
        </p>

        <textarea
          className="rinput"
          rows={2}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setItems(null);
          }}
          placeholder="a bowl of munggo and two cups of rice"
          style={{ marginBottom: 12, resize: "vertical" }}
          autoFocus
        />

        {!items ? (
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" disabled={!text.trim() || busy} onClick={estimate}>
              {busy ? "Working it out…" : "Work out the numbers"}
            </button>
            <button className="btn ghost" onClick={onScan}>
              Scan a label
            </button>
          </div>
        ) : (
          <>
            <span className="mlabel">What it read — edit anything that&apos;s off</span>
            {items.map((i, n) => (
              <div className="nutitem" key={n}>
                <div className="nutitem-name">
                  <strong>{i.name}</strong>
                  <span className="sub">
                    {i.qty}
                    {i.unit ? ` ${i.unit}` : ""} · {SOURCE_LABEL[i.source]}
                  </span>
                </div>
                <input
                  className="rinput"
                  inputMode="decimal"
                  aria-label={`${i.name} calories`}
                  value={i.kcal}
                  onChange={(e) => patch(n, "kcal", Number(e.target.value) || 0)}
                />
                <input
                  className="rinput"
                  inputMode="decimal"
                  aria-label={`${i.name} protein`}
                  value={i.protein}
                  onChange={(e) => patch(n, "protein", Number(e.target.value) || 0)}
                />
              </div>
            ))}
            <div className="nutitem nutitem-head">
              <span />
              <span className="mlabel" style={{ margin: 0 }}>
                kcal
              </span>
              <span className="mlabel" style={{ margin: 0 }}>
                protein
              </span>
            </div>
            <p className="nuttotal">
              Total <b className="num">{total!.kcal}</b> kcal ·{" "}
              <b className="num">{total!.protein}</b> g protein
            </p>
            {items.some((i) => i.kcal === 0) ? (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>
                Something came back empty — type its numbers once and it&apos;ll be remembered.
              </p>
            ) : null}
          </>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          {items ? (
            <button className="btn" onClick={() => onSave(text.trim(), items)}>
              Log it
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SetupModal({
  initial,
  visitor,
  onClose,
  onNote,
}: {
  initial: NutritionView;
  visitor: boolean;
  onClose: () => void;
  onNote: (msg: string) => void;
}) {
  const p = initial.profile;
  const [height, setHeight] = useState(p.heightCm ?? 170);
  const [birthYear, setBirthYear] = useState(p.birthYear ?? 2000);
  const [sex, setSex] = useState<"male" | "female">(p.sex ?? "male");
  const [activity, setActivity] = useState<ActivityLevel>(p.activityLevel ?? "light");
  const [mealsPerDay, setMealsPerDay] = useState(initial.mealsPerDay ?? 3);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (visitor) return onClose();
    setBusy(true);
    const res = await saveBodyProfile({
      heightCm: height,
      birthYear,
      sex,
      activityLevel: activity,
      mealsPerDay,
    });
    setBusy(false);
    if (res.ok) onClose();
    else onNote(res.error);
  }

  return (
    <div className="modal-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(500px,100%)" }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>About your body</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
          Asked once. Your weight comes from your weigh-ins, so the target updates itself.
        </p>

        <div className="nutgrid">
          <label>
            <span className="mlabel">Height (cm)</span>
            <input
              className="rinput"
              inputMode="decimal"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value) || 0)}
            />
          </label>
          <label>
            <span className="mlabel">Birth year</span>
            <input
              className="rinput"
              inputMode="numeric"
              value={birthYear}
              onChange={(e) => setBirthYear(Number(e.target.value) || 0)}
            />
          </label>
        </div>

        <span className="mlabel" style={{ marginTop: 14 }}>
          Sex
        </span>
        <div className="tags" style={{ marginBottom: 14 }}>
          {(["male", "female"] as const).map((v) => (
            <span
              key={v}
              className={`tag${sex === v ? " on" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => setSex(v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSex(v);
                }
              }}
            >
              {v === "male" ? "Male" : "Female"}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--faint)", marginTop: -8, marginBottom: 14 }}>
          The formula only has these two settings — pick whichever gives you a number that fits.
        </p>

        <span className="mlabel">How active are you?</span>
        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((v) => (
            <span
              key={v}
              className={`tag${activity === v ? " on" : ""}`}
              role="button"
              tabIndex={0}
              style={{ textAlign: "left" }}
              onClick={() => setActivity(v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActivity(v);
                }
              }}
            >
              {ACTIVITY_LABELS[v]}
            </span>
          ))}
        </div>

        <span className="mlabel">Meals you aim to log a day</span>
        <div className="tags">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`tag${mealsPerDay === n ? " on" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => setMealsPerDay(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setMealsPerDay(n);
                }
              }}
            >
              {n}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 8 }}>
          This is what a full day looks like on your contribution graph — pick what&apos;s normal
          for you, not what&apos;s impressive.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TargetsModal({
  initial,
  goal,
  visitor,
  onClose,
  onNote,
}: {
  initial: NutritionView;
  goal: { kcal: number; protein: number };
  visitor: boolean;
  onClose: () => void;
  onNote: (msg: string) => void;
}) {
  const [kcal, setKcal] = useState(goal.kcal);
  const [protein, setProtein] = useState(goal.protein);
  const [busy, setBusy] = useState(false);
  const t = initial.targets;

  async function run(c: number | null, p: number | null) {
    if (visitor) return onClose();
    setBusy(true);
    const res = await setTargetOverride(c, p);
    setBusy(false);
    if (res.ok) onClose();
    else onNote(res.error);
  }

  return (
    <div className="modal-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>Your daily targets</h3>
        {t ? (
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
            Worked out from your weigh-in: about <b>{t.bmr}</b> kcal at rest, <b>{t.tdee}</b> for a
            normal day, then {t.direction === "lose" ? "a deficit" : t.direction === "gain" ? "a surplus" : "holding steady"}.
            {t.floored ? " Held at your resting burn — going lower isn't worth it." : ""}
          </p>
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
            Set your own numbers, or fill in your body profile to have them worked out.
          </p>
        )}

        <div className="nutgrid">
          <label>
            <span className="mlabel">Calories</span>
            <input
              className="rinput"
              inputMode="decimal"
              value={kcal}
              onChange={(e) => setKcal(Number(e.target.value) || 0)}
            />
          </label>
          <label>
            <span className="mlabel">Protein (g)</span>
            <input
              className="rinput"
              inputMode="decimal"
              value={protein}
              onChange={(e) => setProtein(Number(e.target.value) || 0)}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 18 }}>
          {initial.overridden ? (
            <button className="btn ghost" disabled={busy} onClick={() => run(null, null)}>
              Back to automatic
            </button>
          ) : null}
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={busy} onClick={() => run(kcal, protein)}>
            {busy ? "Saving…" : "Use these"}
          </button>
        </div>
      </div>
    </div>
  );
}
