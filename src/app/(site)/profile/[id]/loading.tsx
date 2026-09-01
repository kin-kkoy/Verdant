import { Sk } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="wrap">
      <div className="phead">
        <Sk h={52} w={52} r={14} />
        <div style={{ flex: 1 }}>
          <Sk h={26} w={180} style={{ marginBottom: 8 }} />
          <Sk h={14} w={130} />
        </div>
      </div>
      <div className="sk-card" style={{ marginTop: 24, padding: 24 }}>
        <Sk h={130} />
      </div>
      <div className="pstats">
        {[0, 1, 2, 3].map((i) => (
          <div className="pstat" key={i}>
            <Sk h={26} w="60%" style={{ margin: "0 auto" }} />
            <Sk h={13} w="80%" style={{ margin: "8px auto 0" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
