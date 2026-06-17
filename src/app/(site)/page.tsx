import { auth } from "@/lib/auth";
import { getDashboard, getVisitorDashboard, type Dashboard } from "@/lib/data";
import { todaySG } from "@/lib/date";
import { dailyLine } from "@/lib/quotes";
import CabinScene from "@/components/CabinScene";
import CheckinCard from "@/components/CheckinCard";
import WeighInCard from "@/components/WeighInCard";
import ProgressSection from "@/components/ProgressSection";
import Footer from "@/components/Footer";

export default async function LandingPage() {
  const session = await auth();
  let d: Dashboard;
  if (session?.user?.id) {
    d = (await getDashboard(Number(session.user.id))) ?? getVisitorDashboard();
  } else {
    d = getVisitorDashboard();
  }

  return (
    <>
      <div className="hero">
        <div className="wrap">
          <div className="eyebrow">Autumn at the cabin · Day {d.daysIn}</div>
          <h1>
            <em>{dailyLine(todaySG())}</em>
          </h1>
          <p className="lede">
            Tap a sign to wander down to the garden or the stable. The cabin&apos;s just home.
          </p>
        </div>
      </div>

      <CabinScene />

      {/* 4 quick stats */}
      <section className="stats">
        <div className="wrap">
          <div className="stat">
            <div className="v num">
              {d.lost.toFixed(1)}
              <span className="u">kg</span>
            </div>
            <div className="l">You&apos;ve lost</div>
          </div>
          <div className="stat">
            <div className="v num">
              {d.goalKg != null ? (
                <>
                  {d.goalKg.toFixed(0)}
                  <span className="u">kg</span>
                </>
              ) : (
                "—"
              )}
            </div>
            <div className="l">{d.goalKg != null ? "The goal" : "No goal"}</div>
          </div>
          <div className="stat">
            <div className="v num">{d.streak}</div>
            <div className="l">Day streak</div>
          </div>
          <div className="stat">
            <div className="v num">{d.daysIn}</div>
            <div className="l">Days in</div>
          </div>
        </div>
      </section>

      {/* check-in input */}
      <section className="section" id="checkin">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Today · check in</div>
            <h2>
              What did you <em>do</em> today?
            </h2>
            <p>Log the effort, drop a weigh-in, keep the streak alive.</p>
          </div>
          <div className="cols">
            <CheckinCard
              mode={d.mode}
              initialTags={d.todayTags}
              initialNote={d.todayNote}
              checkedInToday={d.checkedInToday}
            />
            <WeighInCard mode={d.mode} latestWeight={d.latestWeight} prevWeight={d.prevWeight} />
          </div>
        </div>
      </section>

      <ProgressSection d={d} />

      <Footer />
    </>
  );
}
