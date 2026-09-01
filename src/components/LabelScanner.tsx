"use client";

import { useState } from "react";
import { fileToDownscaledDataUrl } from "@/lib/photo";
import { readLabel, wholePack, type LabelReading } from "@/lib/nutrition/label";

/**
 * Snap a nutrition label and let OCR fill in the numbers.
 *
 * Runs entirely on the phone — no key, no server, no cost. Tesseract is loaded
 * with a dynamic import so its ~2MB never touches the main bundle; the language
 * data is fetched on first use and cached by the browser after that.
 *
 * OCR on a photo of a curved foil packet in bad light will sometimes be wrong,
 * so this NEVER writes anything. It fills a review form the user confirms.
 */
export default function LabelScanner({
  onUse,
  onClose,
}: {
  onUse: (name: string, kcal: number, protein: number) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState<LabelReading | null>(null);
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [kcal, setKcal] = useState(0);
  const [protein, setProtein] = useState(0);
  const [ateWhole, setAteWhole] = useState(true);

  async function scan(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    setProgress("Reading the label…");
    try {
      // Labels are small print, so downscale far less aggressively than a
      // journal photo — 900px (the default) loses the numbers.
      const dataUrl = await fileToDownscaledDataUrl(file, 1600, 0.9);
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      try {
        const { data } = await worker.recognize(dataUrl);
        const r = readLabel(data.text);
        setReading(r);
        setServings(r.servings ?? 1);
        setKcal(r.kcal ?? 0);
        setProtein(r.protein ?? 0);
        if (r.kcal == null && r.protein == null) {
          setError("Couldn't read that one — type the numbers in yourself below.");
        }
      } finally {
        await worker.terminate();
      }
    } catch {
      setError("The scan failed. You can still type the numbers in.");
      setReading({ servings: null, kcal: null, protein: null, servingSize: null });
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const total = ateWhole
    ? wholePack({ servings, kcal, protein, servingSize: null })
    : { kcal, protein };

  return (
    <div className="modal-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(500px,100%)" }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>Scan a nutrition label</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
          Point at the label on the pack. Everything it reads is editable before you add it.
        </p>

        {!reading ? (
          <>
            <label className="btn lg" style={{ width: "100%", justifyContent: "center", cursor: "pointer" }}>
              {busy ? progress || "Working…" : "Take or choose a photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                disabled={busy}
                onChange={(e) => scan(e.target.files?.[0])}
              />
            </label>
            {error ? (
              <p style={{ color: "var(--rust)", fontSize: 14, marginTop: 12 }}>{error}</p>
            ) : null}
          </>
        ) : (
          <>
            {error ? (
              <p style={{ color: "var(--rust)", fontSize: 14, marginBottom: 12 }}>{error}</p>
            ) : null}

            <span className="mlabel">What is it?</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. bag of chips"
              autoFocus
            />

            <div className="nutgrid">
              <label>
                <span className="mlabel">Servings in pack</span>
                <input
                  className="rinput"
                  inputMode="decimal"
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value) || 0)}
                />
              </label>
              <label>
                <span className="mlabel">Calories / serving</span>
                <input
                  className="rinput"
                  inputMode="decimal"
                  value={kcal}
                  onChange={(e) => setKcal(Number(e.target.value) || 0)}
                />
              </label>
              <label>
                <span className="mlabel">Protein / serving (g)</span>
                <input
                  className="rinput"
                  inputMode="decimal"
                  value={protein}
                  onChange={(e) => setProtein(Number(e.target.value) || 0)}
                />
              </label>
            </div>

            <div className="tags" style={{ marginTop: 14 }}>
              {([true, false] as const).map((v) => (
                <span
                  key={String(v)}
                  className={`tag${ateWhole === v ? " on" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setAteWhole(v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setAteWhole(v);
                    }
                  }}
                >
                  {v ? "I ate the whole pack" : "Just one serving"}
                </span>
              ))}
            </div>

            <p className="nuttotal">
              That&apos;s <b className="num">{total.kcal ?? 0}</b> kcal and{" "}
              <b className="num">{total.protein ?? 0}</b> g protein.
            </p>
          </>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          {reading ? (
            <button
              className="btn"
              disabled={!name.trim()}
              onClick={() => onUse(name.trim(), total.kcal ?? 0, total.protein ?? 0)}
            >
              Add it
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
