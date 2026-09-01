"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import RequestAccessButton from "./RequestAccessButton";
import { signOutAction } from "@/lib/actions";

const LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/journal", label: "Journal" },
  { href: "/planner", label: "Planner" },
  { href: "/standings", label: "Standings" },
];

export default function Nav({
  authed,
  owner = false,
  pendingRequests = 0,
}: {
  authed: boolean;
  owner?: boolean;
  pendingRequests?: number;
}) {
  const pathname = usePathname();

  return (
    <header className="nav">
      <div className="wrap">
        <Link className="brand" href="/">
          <svg className="mk" viewBox="0 0 24 24" fill="none">
            <path d="M12 21V12" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M12 13c-4 0-6.5-2.5-6.5-6.5C9.5 6.5 12 9 12 13z" fill="var(--accent)" />
            <path d="M12 11c0-3.4 2.3-5.8 5.8-5.8C17.8 8.6 15.5 11 12 11z" fill="var(--gold)" />
          </svg>
          Verdant
        </Link>
        <nav className="links">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href || pathname.startsWith(`${l.href}/`) ? "on" : ""}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="spacer" />
        <ThemeToggle />
        {authed ? (
          <>
            {owner ? (
              <Link href="/requests" className={pathname === "/requests" ? "on" : ""}
                style={{ fontSize: 14.5, color: "var(--muted)", fontWeight: 500, display: "inline-flex", alignItems: "center" }}>
                Requests
                {pendingRequests > 0 ? <span className="navbadge">{pendingRequests}</span> : null}
              </Link>
            ) : null}
            <Link className="btn" href="/#checkin">
              Check in
            </Link>
            <form action={signOutAction}>
              <button className="btn ghost" type="submit">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <RequestAccessButton />
            <Link className="btn" href="/login">
              Sign in
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
