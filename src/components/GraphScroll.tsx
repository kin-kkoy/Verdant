"use client";

import { useEffect, useRef } from "react";

/**
 * Horizontal scroll box for the contribution graph. Server-rendered SVG is
 * passed in as children; this only pins the initial scroll position to the
 * right-hand edge (today) on mount, so a phone opens on the current week.
 */
export default function GraphScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <div className="graphscroll" ref={ref}>
      {children}
    </div>
  );
}
