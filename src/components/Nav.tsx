"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import RequestAccessButton from "./RequestAccessButton";
import { signOutAction } from "@/lib/actions";

const LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/workouts", label: "Workouts" },
  { href: "/nutrition", label: "Food" },
  { href: "/journal", label: "Journal" },
  { href: "/planner", label: "Planner" },
  { href: "/standings", label: "Standings" },
];

/**
 * The top bar.
 *
 * Six destinations plus the auth buttons come to roughly 1000px of intrinsic
 * width, which no phone can show. Below 880px the inline row and the action
 * buttons are hidden and everything moves into a drawer, leaving the bar as just
 * brand + theme + menu. Without that the header forces the whole document wider
 * than the viewport and you can pan sideways into empty space.
 */
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigating always closes the drawer — including a tap on the route you're
  // already on, which produces no pathname change but should still close.
  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isOn = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="nav">
      <div className="wrap">
        <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
          <svg className="mk" viewBox="0 0 24 24" fill="none">
            <path d="M12 21V12" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M12 13c-4 0-6.5-2.5-6.5-6.5C9.5 6.5 12 9 12 13z" fill="var(--accent)" />
            <path d="M12 11c0-3.4 2.3-5.8 5.8-5.8C17.8 8.6 15.5 11 12 11z" fill="var(--gold)" />
          </svg>
          Verdant
        </Link>

        <nav className="links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isOn(l.href) ? "on" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="spacer" />
        <ThemeToggle />

        <div className="navactions">
          {authed ? (
            <>
              {owner ? (
                <Link href="/requests" className={`navreq${isOn("/requests") ? " on" : ""}`}>
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

        <button
          className="iconbtn navtoggle"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          {!menuOpen && owner && pendingRequests > 0 ? <span className="navdot" /> : null}
        </button>
      </div>

      {menuOpen ? (
        <>
          <div className="navscrim" onClick={() => setMenuOpen(false)} />
          <div className="navdrawer">
            {authed ? (
              <Link className="navcta" href="/#checkin" onClick={() => setMenuOpen(false)}>
                Check in for today
              </Link>
            ) : null}

            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={isOn(l.href) ? "on" : ""}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}

            <div className="sep" />

            {authed ? (
              <>
                {owner ? (
                  <Link
                    href="/requests"
                    className={isOn("/requests") ? "on" : ""}
                    onClick={() => setMenuOpen(false)}
                  >
                    Requests
                    {pendingRequests > 0 ? <span className="navbadge">{pendingRequests}</span> : null}
                  </Link>
                ) : null}
                <form action={signOutAction}>
                  <button type="submit">Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
            )}
          </div>
        </>
      ) : null}
    </header>
  );
}
