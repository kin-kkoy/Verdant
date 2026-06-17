import { Sk, SkHead } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="wrap section">
      <SkHead />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Sk h={38} w={96} r={10} />
      </div>
      <Sk h={44} r={10} style={{ marginBottom: 18 }} />
      {[0, 1, 2].map((i) => (
        <Sk key={i} h={96} r={14} style={{ marginBottom: 14 }} />
      ))}
    </div>
  );
}
