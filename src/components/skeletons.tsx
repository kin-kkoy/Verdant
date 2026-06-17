// Reusable skeleton primitives (plain server components — render instantly, no JS).
import type { CSSProperties } from "react";

export function Sk({
  h = 14,
  w = "100%",
  r = 8,
  style,
}: {
  h?: number | string;
  w?: number | string;
  r?: number;
  style?: CSSProperties;
}) {
  return <div className="sk" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

export function SkHead() {
  return (
    <div className="section-head">
      <Sk h={12} w={120} style={{ marginBottom: 14 }} />
      <Sk h={32} w="55%" style={{ marginBottom: 10 }} />
      <Sk h={16} w="40%" />
    </div>
  );
}
