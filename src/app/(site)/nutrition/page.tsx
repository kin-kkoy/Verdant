import { auth } from "@/lib/auth";
import { getNutrition, getVisitorNutrition, type NutritionView } from "@/lib/data";
import NutritionBoard from "@/components/NutritionBoard";
import RefreshButton from "@/components/RefreshButton";
import Footer from "@/components/Footer";

export const metadata = { title: "Food · Verdant" };

export default async function NutritionPage() {
  const session = await auth();
  const authed = !!session?.user?.id;
  const data: NutritionView =
    (authed ? await getNutrition(Number(session!.user.id)) : null) ?? getVisitorNutrition();

  return (
    <>
      <div className="wrap section">
        <div className="section-head">
          <div className="eyebrow">Today · food</div>
          <h2>
            What you <em>ate</em>, roughly.
          </h2>
          <p>
            Write meals the way you&apos;d say them out loud. The numbers are worked out for you and
            stay editable — nothing here needs to be exact to be useful.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <RefreshButton />
        </div>

        <NutritionBoard initial={data} />
      </div>
      <Footer />
    </>
  );
}
