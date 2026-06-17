import { Sk } from "@/components/skeletons";

// Landing skeleton (also the default fallback for site routes without their own).
export default function Loading() {
  return (
    <>
      <div className="hero">
        <div className="wrap">
          <Sk h={12} w={170} style={{ margin: "0 auto 16px" }} />
          <Sk h={44} w="min(520px,90%)" style={{ margin: "0 auto 14px" }} />
          <Sk h={18} w={300} style={{ margin: "0 auto" }} />
        </div>
      </div>
      <div className="scene-wrap">
        <Sk h={340} r={20} />
      </div>
      <section className="stats">
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="stat">
              <Sk h={36} w={70} style={{ margin: "0 auto 8px" }} />
              <Sk h={12} w={60} style={{ margin: "0 auto" }} />
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="cols">
            <Sk h={300} r={14} />
            <Sk h={300} r={14} />
          </div>
        </div>
      </section>
    </>
  );
}
