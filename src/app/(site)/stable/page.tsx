import Link from "next/link";
import StableScene from "@/components/StableScene";

export const metadata = { title: "The stable · Verdant" };

export default function StablePage() {
  return (
    <div className="wrap">
      <div className="pagebar">
        <Link className="btn ghost" href="/">
          ← Back to cabin
        </Link>
        <h2>
          The <em>stable</em>
        </h2>
        <span className="pill">top-down</span>
      </div>
      <StableScene />
    </div>
  );
}
