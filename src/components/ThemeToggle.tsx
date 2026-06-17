"use client";

import { useEffect, useState } from "react";

const SUN = (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
  </>
);
const MOON = <path d="M21 12.8A8 8 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" />;

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // Sync initial state from the <html> attribute set by the no-flash script.
  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("verdant-theme", next);
    } catch {
      /* storage may be unavailable — theme just won't persist */
    }
    setDark(!dark);
  }

  return (
    <button className="iconbtn" onClick={toggle} title="Toggle light / dark" aria-label="Toggle theme">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        {dark ? MOON : SUN}
      </svg>
    </button>
  );
}
