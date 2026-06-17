import Link from "next/link";
import GardenScene from "@/components/GardenScene";

export const metadata = { title: "The garden · Verdant" };

export default function GardenPage() {
  return (
    <div className="wrap">
      <div className="pagebar">
        <Link className="btn ghost" href="/">
          ← Back to cabin
        </Link>
        <h2>
          The <em>garden</em>
        </h2>
        <span className="pill">¾ top-down</span>
      </div>
      <GardenScene />
    </div>
  );
}
