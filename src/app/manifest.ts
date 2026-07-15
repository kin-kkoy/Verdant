import type { MetadataRoute } from "next";

// Next serves this at /manifest.webmanifest and auto-injects the
// <link rel="manifest"> tag, so no change to layout.tsx is needed to link it.
// Colors mirror the brand tokens in globals.css (--bg, --accent).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Verdant",
    short_name: "Verdant",
    description: "A private cozy-cabin tracker for a friendly 5 kg weight-loss bet.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    background_color: "#faf3e6",
    theme_color: "#c2632b",
    // The PNGs are padded for the maskable safe zone; we also expose them as
    // "any" so non-masking contexts still have a 192/512 icon. (Next's types
    // only accept one purpose per entry, so each size is listed twice.)
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
