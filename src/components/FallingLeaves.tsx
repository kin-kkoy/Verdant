"use client";

import { useEffect, useState } from "react";

const COLS = ["#c8642f", "#b3472c", "#d4953a", "#a8442e", "#d27ba0"];

type Leaf = {
  left: string;
  size: number;
  dur: string;
  delay: string;
  dx: string;
  rot: string;
  dist: string;
  color: string;
};

// Generated on the client after mount (uses Math.random → must not run during SSR
// or hydration would mismatch). Decorative only.
export default function FallingLeaves() {
  const [leaves, setLeaves] = useState<Leaf[]>([]);

  useEffect(() => {
    const out: Leaf[] = [];
    for (let i = 0; i < 14; i++) {
      const sz = 13 + Math.random() * 10;
      out.push({
        left: `${(i * 7 + Math.random() * 6).toFixed(1)}%`,
        size: sz,
        dur: `${(7 + Math.random() * 7).toFixed(1)}s`,
        delay: `${(-Math.random() * 10).toFixed(1)}s`,
        dx: `${(Math.random() * 120 - 30).toFixed(0)}px`,
        rot: `${(360 + Math.random() * 400).toFixed(0)}deg`,
        dist: `${(320 + Math.random() * 120).toFixed(0)}px`,
        color: COLS[i % 5],
      });
    }
    setLeaves(out);
  }, []);

  return (
    <div className="leaves" aria-hidden>
      {leaves.map((l, i) => (
        <span
          key={i}
          className="leaf"
          style={
            {
              left: l.left,
              width: l.size,
              height: l.size,
              animationDuration: l.dur,
              animationDelay: l.delay,
              "--dx": l.dx,
              "--rot": l.rot,
              "--dist": l.dist,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 16 16" width="100%" height="100%">
            <path
              d="M8 1C11 5 15 6 15 9c0 4-4 6-7 6S1 13 1 9c0-3 4-4 7-8z"
              fill={l.color}
            />
            <path d="M8 3v11" stroke="rgba(60,40,20,.25)" />
          </svg>
        </span>
      ))}
    </div>
  );
}
