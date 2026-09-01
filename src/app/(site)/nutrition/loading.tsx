import { Sk, SkHead } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="wrap section">
      <SkHead />
      <div className="sk-card" style={{ padding: 24, marginBottom: 18 }}>
        <Sk h={16} w="35%" style={{ marginBottom: 12 }} />
        <Sk h={7} />
        <Sk h={16} w="35%" style={{ margin: "22px 0 12px" }} />
        <Sk h={7} />
      </div>
      <div className="jmasonry">
        {[0, 1, 2, 3].map((i) => (
          <div className="sk-card" key={i} style={{ marginBottom: 18, padding: 16 }}>
            <Sk h={18} w="80%" />
            <Sk h={13} w="40%" style={{ marginTop: 10 }} />
            <Sk h={15} w="60%" style={{ marginTop: 14 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
