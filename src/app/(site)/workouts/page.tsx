import { auth } from "@/lib/auth";
import { getVisitorWorkouts, getWorkouts, type WorkoutsView } from "@/lib/data";
import WorkoutGrid from "@/components/WorkoutGrid";
import RefreshButton from "@/components/RefreshButton";
import Footer from "@/components/Footer";

export const metadata = { title: "Workouts · Verdant" };

export default async function WorkoutsPage() {
  const session = await auth();
  const authed = !!session?.user?.id;
  const data: WorkoutsView =
    (authed ? await getWorkouts(Number(session!.user.id)) : null) ?? getVisitorWorkouts();

  return (
    <>
      <div className="wrap section">
        <div className="section-head">
          <div className="eyebrow">Your library</div>
          <h2>
            The exercises you <em>actually</em> do.
          </h2>
          <p>
            Make a card for a movement, then tap it whenever you do it. Two different cards in a
            day fills your square.
            {data.tracksWorkouts
              ? null
              : " Workouts are currently off in your tracking settings, so these don't count toward your day."}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <RefreshButton />
        </div>

        <WorkoutGrid initial={data} />
      </div>
      <Footer />
    </>
  );
}
