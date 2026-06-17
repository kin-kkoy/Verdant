import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Instrument_Serif } from "next/font/google";
import "./globals.css";

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--sans",
  display: "swap",
});
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Verdant — a cozy cabin for two",
  description: "A private cozy-cabin tracker for a friendly 5 kg weight-loss bet.",
};

export const viewport: Viewport = {
  themeColor: "#c2632b",
  width: "device-width",
  initialScale: 1,
};

// Apply the saved theme before first paint to avoid a flash.
// Theme is app chrome (not visitor tracker data), so localStorage is allowed here.
const themeScript = `(function(){try{var t=localStorage.getItem('verdant-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${sans.variable} ${serif.variable}`}
      // The inline themeScript rewrites data-theme from localStorage before React
      // hydrates, so a mismatch on this attribute is expected and intentional.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
