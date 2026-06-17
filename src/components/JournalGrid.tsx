"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { JournalEntry, LogView } from "@/lib/data";
import { addDiaryEntry, deleteDiaryEntry } from "@/lib/actions";
import { fileToDownscaledDataUrl } from "@/lib/photo";
import PaperModal from "./PaperModal";

const MOODS = ["🍂", "🍁", "💪", "🌰", "🔥", "😮‍💨", "✨", "😴"];
const MAX_PHOTOS = 8;
let tempId = -1000;

export default function JournalGrid({
  mode,
  initialEntries,
  logs,
}: {
  mode: "official" | "visitor";
  initialEntries: JournalEntry[];
  logs: LogView[];
}) {
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
  const [pending, startTransition] = useTransition();

  // add modal
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState("🍂");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // viewers
  const [viewing, setViewing] = useState<JournalEntry | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => setEntries(initialEntries), [initialEntries]);

  function openModal() {
    setMood("🍂");
    setTitle("");
    setNote("");
    setPhotos([]);
    if (fileRef.current) fileRef.current.value = "";
    setOpen(true);
  }

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusyPhoto(true);
    try {
      const room = MAX_PHOTOS - photos.length;
      const next: string[] = [];
      for (const f of files.slice(0, room)) next.push(await fileToDownscaledDataUrl(f));
      setPhotos((p) => [...p, ...next]);
    } finally {
      setBusyPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function save() {
    const t = title.trim() || "Untitled";
    if (mode === "visitor") {
      setEntries((prev) => [
        { id: tempId--, mood, title: t, body: note.trim() || null, photos, when: "just now", ts: Date.now() },
        ...prev,
      ]);
      setOpen(false);
      return;
    }
    // Optimistic: show the entry immediately with a temp id, then swap in the real
    // id from the server so a later delete still hits the DB. No full-page refetch.
    const tid = tempId--;
    setEntries((prev) => [
      { id: tid, mood, title: t, body: note.trim() || null, photos, when: "just now", ts: Date.now() },
      ...prev,
    ]);
    setOpen(false);
    startTransition(async () => {
      const res = await addDiaryEntry({ mood, title: t, body: note, photos });
      if (res.ok) {
        setEntries((prev) => prev.map((e) => (e.id === tid ? { ...e, id: res.id } : e)));
      } else {
        setEntries((prev) => prev.filter((e) => e.id !== tid)); // roll back on failure
      }
    });
  }

  function remove(id: number) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setViewing(null);
    if (mode === "visitor" || id < 0) return;
    startTransition(async () => {
      await deleteDiaryEntry(id);
    });
  }

  const logCount = logs.length;

  return (
    <>
      <div className="jmasonry">
        {/* add entry */}
        <div className="jentry add" onClick={openModal} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openModal())}>
          <div className="add-inner">
            <div className="plus">＋</div>
            <div className="add-label">Add entry</div>
            <div className="add-sub">Pin a new memory</div>
          </div>
        </div>

        {/* check-in log card — always right after add-entry, only if there are logs */}
        {logCount > 0 ? (
          <div className="jentry logcard" onClick={() => setShowLogs(true)} role="button" tabIndex={0}>
            <div className="ph">{logCount}</div>
            <div className="b">
              <h4>Check-in log</h4>
              <div className="meta">
                {logCount} check-in{logCount > 1 ? "s" : ""} · last {logs[0].when}
              </div>
            </div>
          </div>
        ) : null}

        {/* diary entries — thumbnail/emoji + title + date only (no body, no author) */}
        {entries.map((e) => (
          <div className="jentry" key={e.id} onClick={() => setViewing(e)} role="button" tabIndex={0}>
            {e.photos.length > 0 ? (
              <div className="jthumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.photos[0]} alt="" />
                {e.photos.length > 1 ? <span className="jcount">🖼 {e.photos.length}</span> : null}
              </div>
            ) : (
              <div className="ph">{e.mood}</div>
            )}
            <div className="b">
              <h4>{e.title}</h4>
              <div className="meta">{e.when}</div>
            </div>
          </div>
        ))}
      </div>

      {/* add-entry modal */}
      <div className={`modal-bg${open ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <div className="modal">
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>New journal entry</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
            Pin a moment from the season.
            {mode === "visitor" ? " (Guest mode — not saved.)" : ""}
          </p>
          <span className="mlabel">Mood</span>
          <div className="moods">
            {MOODS.map((m) => (
              <button key={m} className={m === mood ? "on" : ""} onClick={() => setMood(m)}>
                {m}
              </button>
            ))}
          </div>
          <span className="mlabel">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 7 — feeling lighter" />
          <span className="mlabel">Note</span>
          <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened? How did it feel?" />
          <span className="mlabel" style={{ marginTop: 12 }}>
            Photos (optional · up to {MAX_PHOTOS})
          </span>
          {photos.length > 0 ? (
            <div className="imgprev">
              {photos.map((src, i) => (
                <div className="it" key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                  <button onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} aria-label="Remove">
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {photos.length < MAX_PHOTOS ? (
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPickPhotos} style={{ marginBottom: 12 }} />
          ) : null}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn" onClick={save} disabled={pending || busyPhoto}>
              {busyPhoto ? "Processing…" : pending ? "Pinning…" : "Pin entry"}
            </button>
          </div>
        </div>
      </div>

      {/* paper viewer — diary entry */}
      {viewing ? (
        <PaperModal onClose={() => setViewing(null)} onDelete={() => remove(viewing.id)}>
          {viewing.photos.length > 0 ? <PaperImages photos={viewing.photos} /> : null}
          <h3>{viewing.title}</h3>
          <div className="pmeta">
            <span>{viewing.mood}</span>
            <span>{viewing.when}</span>
          </div>
          {viewing.body ? <div className="ptext">{viewing.body}</div> : null}
        </PaperModal>
      ) : null}

      {/* paper viewer — check-in log (numbered, descending) */}
      {showLogs ? (
        <PaperModal onClose={() => setShowLogs(false)}>
          <h3>Check-in log</h3>
          <div className="pmeta">
            <span>📋</span>
            <span>
              {logCount} check-in{logCount > 1 ? "s" : ""} logged
            </span>
          </div>
          <div>
            {logs.map((l, i) => (
              <div className="logitem" key={l.id}>
                <div className="n">#{logCount - i}</div>
                <div className="lbody">
                  <div className="lmeta">{l.when}</div>
                  {l.tags.length > 0 ? (
                    <div className="logtags">
                      {l.tags.map((t) => (
                        <span className="logtag" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {l.note ? <p>{l.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </PaperModal>
      ) : null}
    </>
  );
}

function PaperImages({ photos }: { photos: string[] }) {
  // 1 image → shown large; 2+ → a grid that ADDS columns as the modal widens
  // (cells stay a fixed size), so expanding reveals more rather than scaling up.
  // Clicking any image opens a focused lightbox on top.
  const [idx, setIdx] = useState<number | null>(null);
  const n = photos.length;

  return (
    <>
      {n === 1 ? (
        <div className="pimgs single">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[0]} alt="" onClick={() => setIdx(0)} />
        </div>
      ) : (
        <div className="pimgs grid">
          {photos.map((src, i) => (
            <div className="pcell" key={i} onClick={() => setIdx(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
            </div>
          ))}
        </div>
      )}

      {idx !== null ? (
        <div className="lightbox" onClick={() => setIdx(null)}>
          <button className="lb-btn lb-close" onClick={() => setIdx(null)} aria-label="Close">
            ×
          </button>
          {n > 1 ? (
            <>
              <button
                className="lb-btn lb-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setIdx((i) => ((i ?? 0) - 1 + n) % n);
                }}
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                className="lb-btn lb-next"
                onClick={(e) => {
                  e.stopPropagation();
                  setIdx((i) => ((i ?? 0) + 1) % n);
                }}
                aria-label="Next"
              >
                ›
              </button>
              <div className="lb-count">
                {idx + 1} / {n}
              </div>
            </>
          ) : null}
          {/* key forces a remount on prev/next so the fade-in animation replays */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={idx} src={photos[idx]} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </>
  );
}
