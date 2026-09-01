import { auth } from "@/lib/auth";
import {
  getActivityCalendar,
  getDashboard,
  getVisitorActivityCalendar,
  getVisitorDashboard,
  type ActivityCalendar,
  type Dashboard,
} from "@/lib/data";
import { todaySG } from "@/lib/date";
import { dailyLine } from "@/lib/quotes";
import ActivityGraph from "@/components/ActivityGraph";
import FallingLeaves from "@/components/FallingLeaves";
import CheckinCard from "@/components/CheckinCard";
import WeighInCard from "@/components/WeighInCard";
import NotificationSetup from "@/components/NotificationSetup";
import ProgressSection from "@/components/ProgressSection";
import Footer from "@/components/Footer";

export default async function LandingPage() {
  const session = await auth();
  let d: Dashboard;
  let cal: ActivityCalendar;
  if (session?.user?.id) {
    const userId = Number(session.user.id);
    const [dash, calendar] = await Promise.all([
      getDashboard(userId),
      getActivityCalendar(userId),
    ]);
    d = dash ?? getVisitorDashboard();
    cal = calendar ?? getVisitorActivityCalendar();
  } else {
    d = getVisitorDashboard();
    cal = getVisitorActivityCalendar();
  }

  return (
    <>
      <div className="hero">
        <FallingLeaves />
        <div className="wrap">
          <div className="eyebrow">Day {d.daysIn}</div>
          <h1>
            <em>{dailyLine(todaySG())}</em>
          </h1>
          <p className="lede">
            Every square is a day you showed up. Log the weight, log the effort, watch the year
            fill in.
          </p>
        </div>
      </div>

      <ActivityGraph cal={cal} />

      {/* 4 quick stats */}
      <section className="stats">
        <div className="wrap">
          <div className="stat">
            <div className="v num">{cal.activeDays}</div>
            <div className="l">Active days</div>
          </div>
          <div className="stat">
            <div className="v num">{d.streak}</div>
            <div className="l">Day streak</div>
          </div>
          <div className="stat">
            <div className="v num">
              {Math.abs(d.lost).toFixed(1)}
              <span className="u">kg</span>
            </div>
            <div className="l">{d.lost < 0 ? "You've gained" : "You've lost"}</div>
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
          {d.mode === "official" && <NotificationSetup />}
        </div>
      </section>

      <ProgressSection d={d} />

      <Footer />
    </>
  );
}
