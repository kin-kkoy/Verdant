"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { checkCode, completeSignup, type CodeStatus } from "@/lib/actions";

export default function ClaimCodeFlow({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<CodeStatus | null>(null);
  const [pending, startTransition] = useTransition();

  // setup form (shown when approved)
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [startWeight, setStartWeight] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function check() {
    setError("");
    setDone(false);
    startTransition(async () => {
      const s = await checkCode(code);
      setStatus(s);
      if (s.state === "approved") setLoginName(s.name);
    });
  }

  function create() {
    setError("");
    startTransition(async () => {
      const res = await completeSignup({ code, loginName, password, email, startWeight });
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  if (done) {
    return (
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>You&apos;re in 🎉</h3>
        <p style={{ color: "var(--muted)", fontSize: 14.5, marginBottom: 18 }}>
          Your account is ready. Sign in with your new name and password.
        </p>
        <Link className="btn" href="/login">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <span className="mlabel">Your access code</span>
      <input
        className="rinput"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="VRD-XXXX-XXXX"
        style={{ marginBottom: 12, textTransform: "uppercase" }}
      />
      <button className="btn" onClick={check} disabled={pending || !code.trim()}>
        {pending ? "Checking…" : "Check status"}
      </button>

      {status ? (
        <div style={{ marginTop: 18 }}>
          {status.state === "unknown" && <Msg>We couldn&apos;t find that code. Double-check it?</Msg>}
          {status.state === "pending" && (
            <Msg>Still waiting on the owner to approve — hang tight and check back. 🍂</Msg>
          )}
          {status.state === "dismissed" && <Msg>This request wasn&apos;t approved.</Msg>}
          {status.state === "completed" && <Msg>This code was already used to create an account.</Msg>}
          {status.state === "expired" && (
            <Msg>This code has expired (codes last 14 days after approval). Please request access again.</Msg>
          )}
          {status.state === "approved" && (
            <div>
              <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Approved — welcome! 🎉</h3>
              <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 14 }}>
                Set up your account below.
              </p>
              {error ? <p style={{ color: "var(--rust)", fontSize: 14, marginBottom: 10 }}>{error}</p> : null}
              <div style={{ display: "grid", gap: 10 }}>
                <Field label="Login name">
                  <input className="rinput" value={loginName} onChange={(e) => setLoginName(e.target.value)} />
                </Field>
                <Field label="Password (≥ 6 chars)">
                  <input
                    className="rinput"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                <Field label="Email (optional)">
                  <input
                    className="rinput"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="for future login / recovery"
                  />
                </Field>
                <Field label="Starting weight (kg)">
                  <input
                    className="rinput"
                    inputMode="decimal"
                    value={startWeight}
                    onChange={(e) => setStartWeight(e.target.value)}
                    placeholder="e.g. 70.0"
                  />
                </Field>
                <div>
                  <button className="btn" onClick={create} disabled={pending}>
                    {pending ? "Creating…" : "Create my account"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Msg({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "var(--muted)", fontSize: 14.5 }}>{children}</p>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mlabel">{label}</span>
      {children}
    </div>
  );
}
