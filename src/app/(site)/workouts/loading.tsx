import { Sk, SkHead } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="wrap section">
      <SkHead />
      <div className="routinebar">
        <Sk h={30} w={110} r={10} />
        <Sk h={30} w={90} r={10} />
      </div>
      <div className="jmasonry">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="sk-card" key={i} style={{ marginBottom: 18, padding: 14 }}>
            <Sk h={150} />
            <Sk h={17} w="70%" style={{ marginTop: 12 }} />
            <Sk h={13} w="45%" style={{ marginTop: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
