"use client";

import { useEffect, useState } from "react";
import type { AccessRequestView } from "@/lib/data";
import RequestRow from "./RequestRow";

export default function RequestsBrowser({ requests }: { requests: AccessRequestView[] }) {
  const [q, setQ] = useState("");
  // Local list so approve/dismiss/delete update instantly without a full refetch.
  const [rows, setRows] = useState<AccessRequestView[]>(requests);
  useEffect(() => setRows(requests), [requests]);

  function onUpdate(id: number, status: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }
  function onRemove(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const norm = q.trim().toLowerCase();

  const match = (r: AccessRequestView) =>
    !norm ||
    r.name.toLowerCase().includes(norm) ||
    r.code.toLowerCase().includes(norm) ||
    (r.message ?? "").toLowerCase().includes(norm) ||
    r.status.toLowerCase().includes(norm);

  const filtered = rows.filter(match);
  const pending = filtered.filter((r) => r.status === "pending");
  const handled = filtered.filter((r) => r.status !== "pending");

  return (
    <>
      <input
        className="rinput"
        placeholder="Search by name, code, message, or status…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 18 }}
      />

      {rows.length === 0 ? (
        <div className="card" style={{ color: "var(--faint)", textAlign: "center" }}>
          No requests yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ color: "var(--faint)", textAlign: "center" }}>
          No matches for “{q}”.
        </div>
      ) : null}

      {pending.length > 0 ? (
        <>
          <h3 style={{ fontSize: 15, margin: "4px 0 12px", color: "var(--muted)" }}>
            Pending ({pending.length})
          </h3>
          {pending.map((r) => (
            <RequestRow key={r.id} req={r} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </>
      ) : null}

      {handled.length > 0 ? (
        <>
          <h3 style={{ fontSize: 15, margin: "24px 0 12px", color: "var(--muted)" }}>Handled</h3>
          {handled.map((r) => (
            <RequestRow key={r.id} req={r} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </>
      ) : null}
    </>
  );
}
