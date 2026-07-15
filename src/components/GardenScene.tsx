"use client";

import { useEffect, useRef, useState } from "react";
import type { GardenView } from "@/lib/data";
import type { TendedPlant } from "@/lib/db/schema";
import { plantSeed, tendPlant } from "@/lib/actions";
import { COST, MAX_STAGE } from "@/lib/economy";
import { PlantArt, speciesForBed, speciesById, stageLabel } from "@/lib/garden/plants";

// Phase 3a garden. Two layers (see NOTES "Game layer"):
//  • BET garden — beds whose growth is DERIVED from real kg (firewall read).
//    Read-only here; they grow as you actually lose weight. Never die.
//  • TENDED garden — pots grown by spending soft currency earned from logging.
// Official users persist via server actions (optimistic, no router.refresh).
// Visitors mutate in-memory only — wiped on refresh (NOTES hard rule).

let floatSeq = 0;
let localSeq = 0;

export default function GardenScene({ garden }: { garden: GardenView }) {
  const visitor = garden.mode === "visitor";
  const [currencies, setCurrencies] = useState(garden.currencies);
  const [tended, setTended] = useState<TendedPlant[]>(garden.tended);
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; txt: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function spawnFloat(x: number, y: number, txt: string) {
    const id = ++floatSeq;
    setFloats((f) => [...f, { id, x, y, txt }]);
    const t = setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 1100);
    timers.current.push(t);
  }
  function flash(text: string) {
    setMsg(text);
    const t = setTimeout(() => setMsg(null), 2200);
    timers.current.push(t);
  }
  function canAfford(cost: { sun: number; water: number; compost: number }) {
    return currencies.sun >= cost.sun && currencies.water >= cost.water && currencies.compost >= cost.compost;
  }

  async function onPlant() {
    if (busy) return;
    if (!canAfford(COST.plantSeed)) return flash(`Need ${COST.plantSeed.water}💧 to plant a seed — log a workout.`);
    if (visitor) {
      const species = speciesForBed(tended.length).id;
      setCurrencies((c) => ({ ...c, water: c.water - COST.plantSeed.water }));
      setTended((t) => [...t, { id: `local-${++localSeq}`, species, stage: 0, wilt: 0, plantedAt: "today" }]);
      spawnFloat(500, 430, "🌱");
      return;
    }
    setBusy(true);
    const res = await plantSeed();
    setBusy(false);
    if (res.ok) {
      setCurrencies(res.currencies);
      setTended(res.tended);
      spawnFloat(500, 430, "🌱");
    } else flash(res.error);
  }

  async function onTend(plant: TendedPlant, x: number, y: number) {
    if (busy || plant.stage >= MAX_STAGE) return;
    if (!canAfford(COST.tendStage)) return flash(`Need ${COST.tendStage.water}💧 to tend — log activity to earn more.`);
    if (visitor) {
      setCurrencies((c) => ({ ...c, water: c.water - COST.tendStage.water }));
      setTended((t) => t.map((p) => (p.id === plant.id ? { ...p, stage: p.stage + 1 } : p)));
      spawnFloat(x, y, "💧");
      return;
    }
    setBusy(true);
    const res = await tendPlant(plant.id);
    setBusy(false);
    if (res.ok) {
      setCurrencies(res.currencies);
      setTended(res.tended);
      spawnFloat(x, y, "💧");
    } else flash(res.error);
  }

  // ---- layout ----
  const beds = garden.betBeds;
  const cols = Math.min(Math.max(beds.length, 1), 4);
  const rows = Math.ceil(beds.length / cols);
  const X0 = 80, X1 = 920, Y0 = 96, Y1 = rows > 1 ? 300 : 230;
  const cellW = (X1 - X0) / cols;
  const cellH = rows > 1 ? (Y1 - Y0) / rows : 0;
  function bedPos(i: number) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    return { cx: X0 + cellW * c + cellW / 2, cy: rows > 1 ? Y0 + cellH * r + cellH / 2 : (Y0 + Y1) / 2 };
  }

  // tended pots along a shelf near the bottom
  const potY = 452;
  const potCount = Math.max(tended.length, 1);
  const potGap = Math.min(120, 840 / potCount);
  const potX0 = 500 - ((potCount - 1) * potGap) / 2;

  return (
    <>
      <div className="ghud">
        <span className="res"><span className="ri">☀️</span><b>{currencies.sun}</b> Sun</span>
        <span className="res"><span className="ri">💧</span><b>{currencies.water}</b> Water</span>
        <span className="res"><span className="ri">🪱</span><b>{currencies.compost}</b> Compost</span>
        <span className="res bloom"><span className="ri">🌸</span><b>{garden.bloomBalance}</b> Bloom</span>
        <span className="res bloom"><span className="ri">🏆</span><b>{garden.pureBlooms}</b> Pure</span>
      </div>

      <div className="stage">
        <svg viewBox="0 0 1000 540" aria-label="A top-down garden of beds and tended pots">
          <rect width="1000" height="540" fill="var(--olive)" opacity=".85" />
          {/* back wall of cabin */}
          <rect x="0" y="0" width="1000" height="56" fill="var(--wood)" />
          <rect x="0" y="52" width="1000" height="8" fill="var(--wood-dk)" />
          {/* fence border */}
          <g fill="#8c6038">
            <rect x="8" y="60" width="8" height="470" />
            <rect x="984" y="60" width="8" height="470" />
          </g>
          {/* potting shelf */}
          <rect x="40" y="488" width="920" height="14" rx="4" fill="var(--wood)" />
          <rect x="40" y="500" width="920" height="6" fill="var(--wood-dk)" />

          {/* BET garden — beds grow with real kg */}
          {beds.map((stage, i) => {
            const { cx, cy } = bedPos(i);
            const sp = speciesForBed(i);
            return (
              <g key={`bed-${i}`}>
                <rect x={cx - 74} y={cy - 30} width="148" height="92" rx="10" fill="#7a5230" />
                <rect x={cx - 74} y={cy - 30} width="148" height="10" rx="5" fill="#8c6038" />
                <g transform={`translate(${cx} ${cy + 54}) scale(1.25)`}>
                  <PlantArt speciesId={sp.id} stage={stage} keyBase={`bed-${i}`} />
                </g>
                <text x={cx - 66} y={cy + 56} fontSize="12.5" fill="#f3e7cf" fontFamily="Hanken Grotesk" fontWeight="600">
                  {stageLabel(stage)}
                </text>
              </g>
            );
          })}

          {/* TENDED garden — pots you grow with soft currency */}
          {tended.map((p, i) => {
            const px = potX0 + i * potGap;
            const sp = speciesById(p.species);
            const full = p.stage >= MAX_STAGE;
            return (
              <g
                key={p.id}
                className={full ? undefined : "hot"}
                style={{ cursor: full ? "default" : "pointer" }}
                onClick={() => onTend(p, px, potY - 30)}
              >
                {/* plant rises out of the pot */}
                <g transform={`translate(${px} ${potY - 6}) scale(1.05)`}>
                  <PlantArt speciesId={sp.id} stage={p.stage} keyBase={`pot-${p.id}`} />
                </g>
                {/* terracotta pot */}
                <path d={`M${px - 18} ${potY - 8} L${px + 18} ${potY - 8} L${px + 13} ${potY + 22} L${px - 13} ${potY + 22} Z`} fill="#b5652f" />
                <rect x={px - 21} y={potY - 12} width="42" height="8" rx="2" fill="#c47338" />
              </g>
            );
          })}
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
        <button className="btn" onClick={onPlant} disabled={busy}>
          🌱 Plant a seed <span style={{ opacity: 0.8, fontWeight: 500 }}>({COST.plantSeed.water}💧)</span>
        </button>
        <span className="hint">
          {msg ??
            "Top beds grow as you lose real weight — they can't be rushed. Tap a potted plant to tend it with the resources you earn by logging."}
        </span>
      </div>
    </>
  );
}
