import { Sk, SkHead } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="wrap section">
      <SkHead />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Sk h={38} w={96} r={10} />
      </div>
      <div className="card">
        {[0, 1].map((i) => (
          <div className="srow" key={i}>
            <Sk h={16} w={64} />
            <div className="who">
              <Sk h={40} w={40} r={11} />
              <div>
                <Sk h={16} w={120} style={{ marginBottom: 6 }} />
                <Sk h={12} w={180} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <Sk h={7} w={160} r={30} />
              <Sk h={20} w={48} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
