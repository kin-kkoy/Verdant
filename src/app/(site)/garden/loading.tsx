import { Sk } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="wrap">
      <div className="pagebar">
        <Sk h={38} w={140} r={10} />
        <Sk h={24} w={120} style={{ marginLeft: 4 }} />
      </div>
      <Sk h={460} r={18} />
    </div>
  );
}
