"use client";

import { useEffect, useRef, useState } from "react";

// Top-down stable scene. Phase 1: interactive but IN-MEMORY ONLY — feeding the
// companion does not persist (the companion/marathon model is the deferred game
// layer, Phase 3+).

let floatSeq = 0;

export default function StableScene() {
  const [dots, setDots] = useState<{ cx: number; cy: number; r: number }[]>([]);
  const [end, setEnd] = useState(60);
  const [fed, setFed] = useState(1);
  const [floats, setFloats] = useState<{ id: number; txt: string }[]>([]);
  const [bob, setBob] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const out = [];
    for (let i = 0; i < 70; i++) {
      out.push({
        cx: Math.round(Math.random() * 1000),
        cy: Math.round(200 + Math.random() * 320),
        r: Math.round((1.5 + Math.random() * 2) * 10) / 10,
      });
    }
    setDots(out);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  function feed() {
    setFed((f) => f + 1);
    setEnd((e) => Math.min(100, e + 3));
    [`❤`, `🌾`].forEach((txt) => {
      const id = ++floatSeq;
      setFloats((f) => [...f, { id, txt }]);
      const t = setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 1200);
      timers.current.push(t);
    });
    setBob(true);
    const t = setTimeout(() => setBob(false), 440);
    timers.current.push(t);
  }

  return (
    <>
      <div className="stage">
        <svg viewBox="0 0 1000 540" aria-label="A top-down stable and paddock">
          <rect width="1000" height="540" fill="var(--olive)" opacity=".88" />
          <g fill="#6f7e44" opacity=".5">
            {dots.map((d, i) => (
              <circle key={i} cx={d.cx} cy={d.cy} r={d.r} />
            ))}
          </g>
          {/* fence border */}
          <g fill="#8c6038">
            <rect x="8" y="200" width="8" height="330" />
            <rect x="984" y="200" width="8" height="330" />
            <rect x="8" y="522" width="984" height="8" />
          </g>
          {/* barn seen from above */}
          <rect x="316" y="26" width="368" height="158" rx="12" fill="var(--barn-dk)" />
          <rect x="320" y="30" width="360" height="74" fill="var(--barn)" />
          <rect x="320" y="104" width="360" height="76" fill="#8f3a28" />
          <line x1="320" y1="104" x2="680" y2="104" stroke="#f3e7cf" strokeWidth="3" opacity=".55" />
          <rect x="316" y="26" width="368" height="158" rx="12" fill="none" stroke="#5c2418" strokeWidth="3" />
          <rect x="492" y="44" width="16" height="14" fill="#f3e7cf" opacity=".8" />
          <g stroke="#5c2418" strokeWidth="4" opacity=".5">
            <line x1="440" y1="30" x2="440" y2="104" />
            <line x1="560" y1="30" x2="560" y2="104" />
          </g>
          {/* open barn doors */}
          <rect x="436" y="160" width="128" height="36" rx="4" fill="#3a2410" />
          <g stroke="#f3e7cf" strokeWidth="3" fill="none">
            <line x1="436" y1="160" x2="564" y2="196" />
            <line x1="564" y1="160" x2="436" y2="196" />
          </g>
          {/* hay bales */}
          <g transform="translate(150 300)">
            <rect width="70" height="54" rx="6" fill="#d9b46a" />
            <g stroke="#c79f54" strokeWidth="3">
              <line x1="0" y1="18" x2="70" y2="18" />
              <line x1="0" y1="36" x2="70" y2="36" />
            </g>
          </g>
          <g transform="translate(150 366)">
            <rect width="70" height="54" rx="6" fill="#e6c878" />
            <g stroke="#c79f54" strokeWidth="3">
              <line x1="0" y1="18" x2="70" y2="18" />
              <line x1="0" y1="36" x2="70" y2="36" />
            </g>
          </g>
          {/* water trough */}
          <g transform="translate(760 360)">
            <rect width="120" height="58" rx="12" fill="#7d5230" />
            <rect x="8" y="8" width="104" height="42" rx="8" fill="var(--sky)" />
          </g>
          {/* companion: top-down horse */}
          <g
            className="sway"
            style={{
              animationDuration: "5s",
              transformOrigin: "500px 372px",
              transform: bob ? "translateY(-10px)" : undefined,
              transition: "transform .42s ease-out",
            }}
          >
            <ellipse cx="500" cy="396" rx="48" ry="22" fill="rgba(0,0,0,.12)" />
            <ellipse cx="476" cy="394" rx="6" ry="9" fill="#5c3a22" />
            <ellipse cx="524" cy="394" rx="6" ry="9" fill="#5c3a22" />
            <ellipse cx="478" cy="356" rx="6" ry="9" fill="#5c3a22" />
            <ellipse cx="522" cy="356" rx="6" ry="9" fill="#5c3a22" />
            <ellipse cx="500" cy="374" rx="34" ry="20" fill="#8a5a34" />
            <path d="M500 394 q-7 22 -2 33 q5 -9 9 -2 q5 -11 -7 -31" fill="#3a2410" />
            <ellipse cx="500" cy="344" rx="13" ry="16" fill="#8a5a34" />
            <path d="M487 343 q13 -9 26 0 q-5 11 -13 11 q-8 0 -13 -11" fill="#3a2410" />
            <ellipse cx="500" cy="330" rx="10" ry="11" fill="#9a6a3e" />
            <ellipse cx="492" cy="319" rx="3.2" ry="5" fill="#8a5a34" />
            <ellipse cx="508" cy="319" rx="3.2" ry="5" fill="#8a5a34" />
            <circle cx="495" cy="328" r="1.4" fill="#2a1c10" />
            <circle cx="505" cy="328" r="1.4" fill="#2a1c10" />
          </g>
        </svg>
        {floats.map((f) => (
          <div key={f.id} className="float pop" style={{ left: "50%", top: "66%" }}>
            {f.txt}
          </div>
        ))}
      </div>
      <div className="toolbar">
        <button className="btn" onClick={feed}>
          🌾 Feed Comet
        </button>
        <span className="hint">
          Comet trains on your real workouts. Endurance <b>{end}</b>% · fed <b>{fed}</b>×&nbsp;today.
        </span>
      </div>
    </>
  );
}
