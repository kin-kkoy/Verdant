"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Refetch-on-focus with a cooldown: an actual server refetch happens at most once
// per COOLDOWN window. Inside the window we still flash the spinner so it feels
// live, but skip the network/DB hit to save resources.
const COOLDOWN_MS = 75_000; // ~1m15s (between 1m and 1m30s)
const SPIN_MS = 700;

export default function RefreshButton({ label = "Refresh" }: { label?: string }) {
  const router = useRouter();
  const lastFetch = useRef(Date.now()); // mount = fresh server data
  const spinTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [spinning, setSpinning] = useState(false);

  const refresh = useCallback(() => {
    setSpinning(true);
    if (Date.now() - lastFetch.current >= COOLDOWN_MS) {
      lastFetch.current = Date.now();
      router.refresh();
    }
    // else: within cooldown → just show the spinner, no real fetch.
    clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => setSpinning(false), SPIN_MS);
  }, [router]);

  // Auto-refresh when the user returns to the tab/app (also throttled).
  useEffect(() => {
    const onFocus = () => refresh();
    const onVis = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      clearTimeout(spinTimer.current);
    };
  }, [refresh]);

  return (
    <button className="btn ghost" onClick={refresh} aria-label="Refresh" title="Refresh">
      <svg
        className={spinning ? "spin" : ""}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      {label}
    </button>
  );
}
