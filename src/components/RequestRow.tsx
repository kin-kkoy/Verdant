"use client";

import { useState, useTransition } from "react";
import type { AccessRequestView } from "@/lib/data";
import { approveAccessRequest, deleteAccessRequest, dismissAccessRequest } from "@/lib/actions";

export default function RequestRow({
  req,
  onUpdate,
  onRemove,
}: {
  req: AccessRequestView;
  onUpdate: (id: number, status: string) => void;
  onRemove: (id: number) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, onOk: () => void) {
    setError("");
    startTransition(async () => {
      const res = await fn();
      if (res.ok) onOk();
      else setError(res.error ?? "Something went wrong.");
    });
  }

  const handled = req.status !== "pending";
  const statusLabel = req.expired ? "approved · expired" : req.status;

  return (
    <div className="card" style={{ marginBottom: 14, opacity: handled ? 0.7 : 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 16 }}>{req.name}</strong>
        <span className="num" style={{ fontSize: 13, color: "var(--faint)" }}>{req.code}</span>
        <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--faint)" }}>{req.when}</span>
        {handled ? <span className="pill" style={{ marginLeft: 8 }}>{statusLabel}</span> : null}
        <button
          className="jdel"
          style={{ opacity: 0.7, marginLeft: 4 }}
          title="Delete permanently"
          aria-label="Delete request"
          onClick={() => {
            if (confirm(`Delete ${req.name}'s request permanently?`))
              act(() => deleteAccessRequest(req.id), () => onRemove(req.id));
          }}
          disabled={pending}
        >
          ×
        </button>
      </div>
      {req.message ? (
        <p style={{ fontSize: 14.5, color: "var(--muted)", marginTop: 8, whiteSpace: "pre-wrap" }}>{req.message}</p>
      ) : null}

      {error ? <p style={{ color: "var(--rust)", fontSize: 14, marginTop: 10 }}>{error}</p> : null}

      {!handled ? (
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            className="btn"
            onClick={() => act(() => approveAccessRequest(req.id), () => onUpdate(req.id, "approved"))}
            disabled={pending}
          >
            Approve
          </button>
          <button
            className="btn ghost"
            onClick={() => act(() => dismissAccessRequest(req.id), () => onUpdate(req.id, "dismissed"))}
            disabled={pending}
          >
            Dismiss
          </button>
        </div>
      ) : req.status === "approved" ? (
        <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>
          {req.expired
            ? "Their code expired before they set up. They'll need to request again."
            : "Approved — waiting for them to set up their account with their code."}
        </p>
      ) : null}
    </div>
  );
}
