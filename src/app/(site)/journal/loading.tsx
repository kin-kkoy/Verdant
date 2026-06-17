import { Sk, SkHead } from "@/components/skeletons";

export default function Loading() {
  const heights = [200, 260, 180, 300, 220, 170];
  return (
    <div className="wrap section">
      <SkHead />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Sk h={38} w={96} r={10} />
      </div>
      <div className="jmasonry">
        {heights.map((h, i) => (
          <Sk key={i} h={h} r={14} />
        ))}
      </div>
    </div>
  );
}
