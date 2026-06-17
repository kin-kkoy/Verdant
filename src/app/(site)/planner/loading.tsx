import { Sk, SkHead } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="wrap section">
      <SkHead />
      {/* week nav */}
      <div className="weeknav">
        <Sk h={38} w={80} r={10} />
        <div className="weeknav-mid" style={{ display: "grid", placeItems: "center", gap: 6 }}>
          <Sk h={16} w={120} />
          <Sk h={12} w={90} />
        </div>
        <Sk h={38} w={80} r={10} />
      </div>
      {/* week at a glance */}
      <div className="week">
        {Array.from({ length: 7 }).map((_, i) => (
          <Sk key={i} h={150} r={12} />
        ))}
      </div>
      {/* schedule */}
      <div style={{ marginTop: 48, marginBottom: 18 }}>
        <Sk h={24} w={180} style={{ marginBottom: 8 }} />
        <Sk h={14} w={320} />
      </div>
      <Sk h={420} r={14} />
    </div>
  );
}
