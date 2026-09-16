"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlanBlock } from "@/lib/data";
import { syncPlanWeek } from "@/lib/actions";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const COLORS = ["var(--accent)", "var(--olive)", "var(--rust)", "var(--gold)"];

function hourLabel(h: number): string {
  const ap = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ap}`;
}

let tempId = -2000;

export default function PlannerBoard({
  mode,
  initialBlocks,
  weekStart,
  todayDow,
  weekLabel,
  weekRange,
  prevWeek,
  nextWeek,
  isCurrent,
  storageKey,
}: {
  mode: "official" | "visitor";
  initialBlocks: PlanBlock[];
  weekStart: string;
  todayDow: number;
  weekLabel: string;
  weekRange: string;
  prevWeek: string | null;
  nextWeek: string | null;
  isCurrent: boolean;
  storageKey?: string; // user id for the local draft key; absent for visitors
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<PlanBlock[]>(initialBlocks);
  const [expanded, setExpanded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef(0);
  const blocksRef = useRef(blocks);

  const draftKey = storageKey ? `verdant.plan.${storageKey}.${weekStart}` : null;

  // drag gesture
  const gestureRef = useRef<
    | null
    | { id: number; color: string; text: string; startX: number; startY: number; ox: number; oy: number; active: boolean }
  >(null);
  const justDragged = useRef(false);
  const [ghost, setGhost] = useState<null | { color: string; text: string; x: number; y: number }>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  // add / rename modal
  const [modal, setModal] = useState<{
    open: boolean;
    mode: "add" | "rename";
    dow: number;
    hour: number;
    id: number | null;
    value: string;
  }>({ open: false, mode: "add", dow: 0, hour: 0, id: null, value: "" });

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // Load the week: a local draft (unsaved edits) wins over the server copy.
  useEffect(() => {
    let loaded = initialBlocks;
    let isDirty = false;
    if (draftKey) {
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          loaded = JSON.parse(raw) as PlanBlock[];
          isDirty = true;
        }
      } catch {
        /* ignore bad draft */
      }
    }
    setBlocks(loaded);
    setDirty(isDirty);
    // weekStart drives this; initialBlocks changes alongside it on navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  // Auto-scroll to the first hour that has a block (Google-Calendar style).
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const hrs = blocksRef.current.map((b) => b.hour);
    const first = hrs.length ? Math.min(...hrs) : 7;
    const cell = sc.querySelector(`.cell[data-hour="${first}"]`) as HTMLElement | null;
    if (cell) sc.scrollTop = Math.max(0, cell.offsetTop - 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before a hard unload (reload / close tab) when there are unsaved edits.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // All edits go through here: update state, mark unsaved, mirror to the local draft.
  function commit(next: PlanBlock[]) {
    setBlocks(next);
    setSavedFlash(false);
    if (mode === "visitor") return; // visitor edits are in-memory only (no storage, no save)
    setDirty(true);
    if (draftKey) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(next));
      } catch {
        /* storage may be unavailable */
      }
    }
  }

  function clearDraft() {
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    }
  }

  function save() {
    if (mode === "visitor" || !dirty) return;
    startTransition(async () => {
      const res = await syncPlanWeek(weekStart, blocksRef.current);
      if (res.ok) {
        setDirty(false);
        clearDraft();
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1800);
      }
    });
  }

  // --- edits (local only) ---
  function commitAdd(dow: number, hour: number, text: string) {
    const color = COLORS[colorRef.current++ % COLORS.length];
    commit([...blocksRef.current, { id: tempId--, dow, hour, text, color }]);
  }
  function moveBlock(id: number, dow: number, hour: number) {
    commit(blocksRef.current.map((b) => (b.id === id ? { ...b, dow, hour } : b)));
  }
  function commitRename(id: number, text: string) {
    commit(blocksRef.current.map((b) => (b.id === id ? { ...b, text } : b)));
  }
  function remove(id: number) {
    commit(blocksRef.current.filter((b) => b.id !== id));
  }
  function resetWeek() {
    if (blocksRef.current.length === 0) return;
    if (!confirm("Reset this week's schedule to blank?")) return;
    commit([]);
  }

  // Document-level drag listeners (pointer = mouse + touch).
  useEffect(() => {
    function move(e: PointerEvent) {
      const g = gestureRef.current;
      if (!g) return;
      if (!g.active) {
        if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < 5) return;
        g.active = true;
        setDraggingId(g.id);
      }
      setGhost({ color: g.color, text: g.text, x: e.clientX - g.ox, y: e.clientY - g.oy });
    }
    function up(e: PointerEvent) {
      const g = gestureRef.current;
      if (!g) return;
      if (g.active) {
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const cell = el?.closest(".cell") as HTMLElement | null;
        if (cell) moveBlock(g.id, Number(cell.dataset.dow), Number(cell.dataset.hour));
        justDragged.current = true;
        setTimeout(() => (justDragged.current = false), 60);
      }
      gestureRef.current = null;
      setGhost(null);
      setDraggingId(null);
    }
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // modal
  function openAdd(dow: number, hour: number) {
    setModal({ open: true, mode: "add", dow, hour, id: null, value: "" });
  }
  function openRename(id: number) {
    const b = blocksRef.current.find((x) => x.id === id);
    if (!b) return;
    setModal({ open: true, mode: "rename", dow: b.dow, hour: b.hour, id, value: b.text });
  }
  function saveModal() {
    const text = modal.value.trim();
    if (!text) return;
    if (modal.mode === "add") commitAdd(modal.dow, modal.hour, text);
    else if (modal.id != null) commitRename(modal.id, text);
    setModal((m) => ({ ...m, open: false }));
  }

  // Guarded week navigation (confirm if there are unsaved edits).
  function navTo(href: string) {
    if (dirty && !confirm("You have unsaved changes. Leave this week without saving?")) return;
    router.push(href);
  }

  const byDay = DAYS.map((_, di) => blocks.filter((b) => b.dow === di).sort((a, b) => a.hour - b.hour));

  return (
    <>
      {/* week navigation */}
      <div className="weeknav">
        <button
          className="btn ghost"
          onClick={() => prevWeek && navTo(`/planner?week=${prevWeek}`)}
          disabled={!prevWeek}
          style={!prevWeek ? { opacity: 0.4 } : undefined}
        >
          ← Prev
        </button>
        <div className="weeknav-mid">
          <div className="wl">{weekLabel}</div>
          <div className="wr">{weekRange}</div>
        </div>
        <button
          className="btn ghost"
          onClick={() => nextWeek && navTo(`/planner?week=${nextWeek}`)}
          disabled={!nextWeek}
          style={!nextWeek ? { opacity: 0.4 } : undefined}
          title="Up to 3 weeks ahead"
        >
          Next →
        </button>
        {!isCurrent ? (
          <button className="btn" onClick={() => navTo("/planner")} style={{ marginLeft: 4 }}>
            Today
          </button>
        ) : null}
      </div>

      {/* week at a glance — derived from the schedule */}
      <div className="week">
        {DAYS.map((d, di) => (
          <div className="day" key={d}>
            <div className="dh">
              {d} {di === todayDow ? <span>· today</span> : null}
            </div>
            {byDay[di].map((b) => (
              <div className="titem" key={b.id}>
                <span className="d" style={{ background: b.color }} />
                {hourLabel(b.hour)} · {b.text}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="sched-head">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: 24 }}>
            The <em>schedule</em>
          </h2>
          <p>
            Tap an empty slot to add a block · drag a block anywhere to rearrange it.
            {mode === "visitor" ? " (Guest mode — not saved.)" : " Changes save when you press Save."}
          </p>
        </div>
        <div className="sched-controls">
          {mode === "official" ? (
            <span className={`savestate${dirty ? " unsaved" : ""}`}>
              {dirty ? "● Unsaved changes" : savedFlash ? "Saved ✓" : "All changes saved"}
            </span>
          ) : null}
          <button
            className="iconbtn"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Collapse schedule" : "Expand full day"}
            aria-label={expanded ? "Collapse schedule" : "Expand full day"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s var(--ease)" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <button className="iconbtn" onClick={resetWeek} disabled={blocks.length === 0} title="Reset this week to blank" aria-label="Reset week">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          {mode === "official" ? (
            <button className="btn" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          ) : null}
        </div>
      </div>

      {/* One horizontal scroller wraps the head AND the grid so the day columns
          stay aligned on a phone; without it the 616px-wide calendar pushed the
          whole page sideways. Vertical scrolling stays on .cal-scroll inside. */}
      <div className="cal-x">
        <div className="cal-head">
          <div />
          {DAYS.map((d) => (
            <div className="ch" key={d}>
              {d}
            </div>
          ))}
        </div>
        <div
          className="cal-scroll"
          ref={scrollRef}
          style={expanded ? undefined : { maxHeight: 520, overflowY: "auto" }}
        >
        <div className="cal">
          {HOURS.map((h) => (
            <Fragment key={h}>
              <div className="time">{hourLabel(h)}</div>
              {DAYS.map((_, di) => (
                <div className="cell" key={di} data-dow={di} data-hour={h} onClick={() => openAdd(di, h)}>
                  {blocks
                    .filter((b) => b.dow === di && b.hour === h)
                    .map((b) => (
                      <div
                        key={b.id}
                        className="block"
                        style={{ background: b.color, opacity: draggingId === b.id ? 0.35 : 1 }}
                        onPointerDown={(e) => {
                          if ((e.target as HTMLElement).classList.contains("x")) return;
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          gestureRef.current = {
                            id: b.id,
                            color: b.color,
                            text: b.text,
                            startX: e.clientX,
                            startY: e.clientY,
                            ox: e.clientX - r.left,
                            oy: e.clientY - r.top,
                            active: false,
                          };
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (justDragged.current) return;
                          if ((e.target as HTMLElement).classList.contains("x")) return;
                          openRename(b.id);
                        }}
                      >
                        {b.text}
                        <span
                          className="x"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(b.id);
                          }}
                        >
                          ×
                        </span>
                      </div>
                    ))}
                </div>
              ))}
            </Fragment>
          ))}
          </div>
        </div>
      </div>

      {ghost ? (
        <div className="block dragging" style={{ background: ghost.color, left: ghost.x, top: ghost.y }}>
          {ghost.text}
        </div>
      ) : null}

      <div
        className={`modal-bg${modal.open ? " open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && setModal((m) => ({ ...m, open: false }))}
      >
        <div className="modal">
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>
            {modal.mode === "add" ? "New block" : "Rename block"}
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
            {DAYS[modal.dow]} · {hourLabel(modal.hour)}
          </p>
          <span className="mlabel">Name</span>
          <input
            autoFocus
            value={modal.value}
            onChange={(e) => setModal((m) => ({ ...m, value: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveModal();
              if (e.key === "Escape") setModal((m) => ({ ...m, open: false }));
            }}
            placeholder="e.g. Upper body"
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button className="btn ghost" onClick={() => setModal((m) => ({ ...m, open: false }))}>
              Cancel
            </button>
            <button className="btn" onClick={saveModal} disabled={!modal.value.trim()}>
              {modal.mode === "add" ? "Add block" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
