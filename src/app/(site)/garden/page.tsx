import Link from "next/link";
import { auth } from "@/lib/auth";
import { getGarden, getVisitorGarden, type GardenView } from "@/lib/data";
import GardenScene from "@/components/GardenScene";

export const metadata = { title: "The garden · Verdant" };

export default async function GardenPage() {
  const session = await auth();
  const uid = session?.user?.id ? Number(session.user.id) : null;
  const garden: GardenView = (uid ? await getGarden(uid) : null) ?? getVisitorGarden();

  return (
    <div className="wrap">
      <div className="pagebar">
        <Link className="btn ghost" href="/">
          ← Back to cabin
        </Link>
        <h2>
          The <em>garden</em>
        </h2>
        <span className="pill">{garden.mode === "visitor" ? "guest — not saved" : "¾ top-down"}</span>
      </div>
      <GardenScene garden={garden} />
    </div>
  );
}
