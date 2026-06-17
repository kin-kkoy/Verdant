"use client";

import { useEffect, useId, useRef, useState } from "react";

// Top-down garden scene. Phase 1: interactive but IN-MEMORY ONLY — tending beds
// does not persist (the real garden growth model is the deferred game layer, Phase 3+).

type Bed = { x: number; y: number; g: number };
const INITIAL: Bed[] = [
  { x: 60, y: 120, g: 3 },
  { x: 60, y: 300, g: 2 },
  { x: 720, y: 120, g: 4 },
  { x: 720, y: 300, g: 1 },
];
const PLOT_COLORS = ["#d27ba0", "#d4953a", "#c8642f", "#b48ed9"];
const SPOTS = [
  [60, 55],
  [110, 90],
  [160, 50],
  [90, 120],
  [150, 115],
];
const STAGE_LABEL = ["Seedlings", "Sprouting", "Leafing", "In bloom"];

let floatSeq = 0;

export default function GardenScene() {
  const [beds, setBeds] = useState<Bed[]>(INITIAL.map((b) => ({ ...b })));
  const [grass, setGrass] = useState<{ cx: number; cy: number; r: number }[]>([]);
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; txt: string }[]>([]);
  const idBase = useId();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Grass dots use randomness → generate client-side to avoid hydration mismatch.
    const out = [];
    for (let i = 0; i < 90; i++) {
      out.push({
        cx: Math.round(Math.random() * 1000),
        cy: Math.round(60 + Math.random() * 470),
        r: Math.round((1.5 + Math.random() * 2) * 10) / 10,
      });
    }
    setGrass(out);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  function spawnFloat(x: number, y: number, txt: string) {
    const id = ++floatSeq;
    setFloats((f) => [...f, { id, x, y, txt }]);
    const t = setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 1100);
    timers.current.push(t);
  }

  function tend(i: number) {
    setBeds((prev) => prev.map((b, j) => (j === i && b.g < 4 ? { ...b, g: b.g + 1 } : b)));
    spawnFloat(beds[i].x + 110, beds[i].y + 40, "💧");
  }

  function waterAll() {
    setBeds((prev) => prev.map((b) => (b.g < 4 ? { ...b, g: b.g + 1 } : b)));
    for (let k = 0; k < 5; k++) {
      const t = setTimeout(
        () => spawnFloat(120 + Math.random() * 760, 120 + Math.random() * 300, ["💧", "🌱", "🍂"][k % 3]),
        k * 120,
      );
      timers.current.push(t);
    }
  }

  return (
    <>
      <div className="stage">
        <svg viewBox="0 0 1000 540" aria-label="A top-down garden">
          <rect width="1000" height="540" fill="var(--olive)" opacity=".85" />
          <g fill="#6f7e44" opacity=".5">
            {grass.map((g, i) => (
              <circle key={i} cx={g.cx} cy={g.cy} r={g.r} />
            ))}
          </g>
          {/* back wall of cabin */}
          <rect x="0" y="0" width="1000" height="56" fill="var(--wood)" />
          <rect x="0" y="52" width="1000" height="8" fill="var(--wood-dk)" />
          {/* stone path */}
          <rect x="460" y="56" width="80" height="484" fill="#cbb98c" opacity=".7" />
          <g fill="#bfa97a">
            <rect x="468" y="80" width="64" height="26" rx="5" />
            <rect x="468" y="120" width="64" height="26" rx="5" />
            <rect x="468" y="160" width="64" height="26" rx="5" />
          </g>
          {/* fence border */}
          <g fill="#8c6038">
            <rect x="8" y="60" width="8" height="470" />
            <rect x="984" y="60" width="8" height="470" />
          </g>
          {/* beds */}
          {beds.map((b, i) => (
            <g
              key={i}
              style={{ cursor: "pointer" }}
              className="hot"
              onClick={() => tend(i)}
            >
              <rect x={b.x} y={b.y} width="220" height="150" rx="10" fill="#7a5230" />
              <rect x={b.x} y={b.y} width="220" height="12" rx="6" fill="#8c6038" />
              <g stroke="#5e3d22" strokeWidth="3">
                <line x1={b.x + 16} y1={b.y + 40} x2={b.x + 204} y2={b.y + 40} />
                <line x1={b.x + 16} y1={b.y + 75} x2={b.x + 204} y2={b.y + 75} />
                <line x1={b.x + 16} y1={b.y + 110} x2={b.x + 204} y2={b.y + 110} />
              </g>
              {SPOTS.map((sp, j) =>
                j <= b.g ? (
                  <g key={j} transform={`translate(${b.x + sp[0]} ${b.y + sp[1]}) scale(1.1)`}>
                    <Plant stage={b.g} colorIndex={i} keyBase={`${idBase}-${i}-${j}`} />
                  </g>
                ) : null,
              )}
              <text
                x={b.x + 12}
                y={b.y + 140}
                fontSize="13"
                fill="#f3e7cf"
                fontFamily="Hanken Grotesk"
                fontWeight="600"
              >
                {STAGE_LABEL[Math.min(3, b.g)]}
              </text>
            </g>
          ))}
        </svg>
        {floats.map((f) => (
          <div
            key={f.id}
            className="float pop"
            style={{ left: `${(f.x / 1000) * 100}%`, top: `${(f.y / 540) * 100}%` }}
          >
            {f.txt}
          </div>
        ))}
      </div>
      <div className="toolbar">
        <button className="btn" onClick={waterAll}>
          💧 Water the beds
        </button>
        <span className="hint">Tap a plot to tend it — water sprouts to grow them toward bloom.</span>
      </div>
    </>
  );
}

function Plant({ stage, colorIndex, keyBase }: { stage: number; colorIndex: number; keyBase: string }) {
  const leaves = Math.min(6, 2 + stage);
  const els = [];
  for (let k = 0; k < leaves; k++) {
    const a = (k / leaves) * 360;
    els.push(<ellipse key={`${keyBase}-l${k}`} cx="0" cy="-13" rx="6" ry="12" fill="var(--olive)" transform={`rotate(${a})`} />);
  }
  return (
    <g>
      {els}
      {stage >= 3 ? (
        <>
          <circle r="9" fill={PLOT_COLORS[colorIndex % 4]} />
          <circle r="3.5" fill="var(--gold)" />
        </>
      ) : (
        <circle r="5" fill="#6f7e44" />
      )}
    </g>
  );
}
