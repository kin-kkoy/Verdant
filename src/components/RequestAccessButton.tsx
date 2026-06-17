"use client";

import { useState, useTransition } from "react";
import { submitAccessRequest } from "@/lib/actions";
import ClaimCodeFlow from "./ClaimCodeFlow";

export default function RequestAccessButton() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"request" | "code">("request");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState<string | null>(null); // generated code after submit
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function openModal(initial: "request" | "code") {
    setMode(initial);
    setName("");
    setMessage("");
    setCode(null);
    setCopied(false);
    setError("");
    setOpen(true);
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await submitAccessRequest({ name, message });
      if (res.ok) setCode(res.code);
      else setError(res.error);
    });
  }

  function copy() {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }

  return (
    <>
      <a
        onClick={() => openModal("code")}
        style={{ fontSize: 14.5, color: "var(--muted)", fontWeight: 500, cursor: "pointer" }}
      >
        Have a code?
      </a>
      <button className="btn ghost" onClick={() => openModal("request")}>
        Request access
      </button>

      <div className={`modal-bg${open ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <div className="modal">
          {/* mode tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              className={mode === "request" ? "btn" : "btn ghost"}
              onClick={() => setMode("request")}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Request access
            </button>
            <button
              className={mode === "code" ? "btn" : "btn ghost"}
              onClick={() => setMode("code")}
              style={{ flex: 1, justifyContent: "center" }}
            >
              I have a code
            </button>
          </div>

          {mode === "request" ? (
            code ? (
              <>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Request sent 🍂</h3>
                <p style={{ color: "var(--muted)", fontSize: 14.5, marginBottom: 14 }}>
                  Save your access code. Come back and enter it under <b>“I have a code”</b> to check your
                  status — once the owner approves, you&apos;ll set up your account.
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "14px 16px",
                    border: "1px dashed var(--line-2)",
                    borderRadius: 12,
                    marginBottom: 14,
                  }}
                >
                  <span className="num" style={{ fontSize: 22, fontWeight: 700, letterSpacing: ".04em" }}>
                    {code}
                  </span>
                  <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={copy}>
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn" onClick={() => setOpen(false)}>
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 3 }}>Request access</h3>
                <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
                  Ask to join the bet. You&apos;ll get a code to check your status.
                </p>
                {error ? <p style={{ color: "var(--rust)", fontSize: 14, marginBottom: 12 }}>{error}</p> : null}
                <span className="mlabel">Your name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mei" />
                <span className="mlabel">Message (optional)</span>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything you'd like to say?"
                />
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                  <button className="btn ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button className="btn" onClick={submit} disabled={pending}>
                    {pending ? "Sending…" : "Send request"}
                  </button>
                </div>
              </>
            )
          ) : (
            <ClaimCodeFlow />
          )}
        </div>
      </div>
    </>
  );
}
