"use client";

import { useState, useTransition } from "react";
import { setProfileInvite, setProfileVisibility } from "@/lib/actions";
import type { ProfileVisibility } from "@/lib/db/schema";

type Person = { id: number; name: string; avatarColor: string };

/**
 * "Who can see this" — shown only on your own profile. Optimistic like the rest
 * of the app's mutations: flip the control immediately, persist in the background,
 * roll back if the action rejects.
 */
export default function ProfileAccess({
  visibility,
  invited,
  people,
}: {
  visibility: ProfileVisibility;
  invited: number[];
  people: Person[];
}) {
  const [mode, setMode] = useState<ProfileVisibility>(visibility);
  const [allowed, setAllowed] = useState<Set<number>>(new Set(invited));
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function chooseMode(next: ProfileVisibility) {
    if (next === mode) return;
    const prev = mode;
    setMode(next);
    setError("");
    startTransition(async () => {
      const res = await setProfileVisibility(next);
      if (!res.ok) {
        setMode(prev);
        setError(res.error);
      }
    });
  }

  function toggle(person: Person) {
    const next = new Set(allowed);
    const adding = !next.has(person.id);
    if (adding) next.add(person.id);
    else next.delete(person.id);
    setAllowed(next);
    setError("");
    startTransition(async () => {
      const res = await setProfileInvite(person.id, adding);
      if (!res.ok) {
        setAllowed((cur) => {
          const back = new Set(cur);
          if (adding) back.delete(person.id);
          else back.add(person.id);
          return back;
        });
        setError(res.error);
      }
    });
  }

  return (
    <div className="card access">
      <div className="section-head" style={{ marginBottom: 16 }}>
        <div className="eyebrow">Who can see this</div>
        <p style={{ fontSize: 14.5 }}>
          Your rank and activity on Standings stay public either way — this only covers your
          profile page.
        </p>
      </div>

      {error ? (
        <p style={{ color: "var(--rust)", fontSize: 14, marginBottom: 12 }}>{error}</p>
      ) : null}

      <div className="tags" style={{ marginBottom: mode === "invited" ? 20 : 0 }}>
        {(["everyone", "invited"] as const).map((m) => (
          <span
            key={m}
            className={`tag${mode === m ? " on" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => chooseMode(m)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                chooseMode(m);
              }
            }}
          >
            {m === "everyone" ? "Everyone" : "Only people I invite"}
          </span>
        ))}
      </div>

      {mode === "invited" ? (
        people.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--faint)" }}>
            Nobody else has an account yet — there&apos;s no one to invite.
          </p>
        ) : (
          <>
            <span className="mlabel">Invited</span>
            <div className="tags">
              {people.map((p) => (
                <span
                  key={p.id}
                  className={`tag${allowed.has(p.id) ? " on" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(p);
                    }
                  }}
                >
                  {allowed.has(p.id) ? "✓ " : ""}
                  {p.name}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 12 }}>
              {allowed.size === 0
                ? "Nobody's invited — everyone else gets the locked page."
                : `${allowed.size} ${allowed.size === 1 ? "person" : "people"} can see your profile.`}
            </p>
          </>
        )
      ) : null}
    </div>
  );
}
