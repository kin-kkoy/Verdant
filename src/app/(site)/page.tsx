import { auth } from "@/lib/auth";
import {
  getActivityCalendar,
  getDashboard,
  getVisitorActivityCalendar,
  getVisitorDashboard,
  type ActivityCalendar,
  type Dashboard,
} from "@/lib/data";
import Link from "next/link";
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

      {d.nutrition ? (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="card nutsummary" style={{ marginBottom: 0 }}>
              <div className="section-head" style={{ marginBottom: 18 }}>
                <div className="eyebrow">Today · food</div>
                <p style={{ fontSize: 15 }}>
                  <Link href="/nutrition">Log what you ate →</Link>
                </p>
              </div>
              <Remaining
                label="Calories"
                eaten={d.nutrition.eatenKcal}
                goal={d.nutrition.goalKcal}
                unit="kcal"
              />
              <Remaining
                label="Protein"
                eaten={d.nutrition.eatenProtein}
                goal={d.nutrition.goalProtein}
                unit="g"
              />
              <p className="nutkind">
                No worries if you don&apos;t finish it. Getting close, most days, is the whole game.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <ProgressSection d={d} />

      <Footer />
    </>
  );
}

/** The "how much is left today" strip. Server component — no interactivity. */
function Remaining({
  label,
  eaten,
  goal,
  unit,
}: {
  label: string;
  eaten: number;
  goal: number;
  unit: string;
}) {
  const left = Math.round((goal - eaten) * 10) / 10;
  const pct = Math.min(100, Math.round((eaten / goal) * 100));
  return (
    <div className="nutmeter">
      <div className="pl">
        <span>{label}</span>
        <span>
          <b className="num">{eaten}</b> / {goal} {unit}
        </span>
      </div>
      <div className="track">
        <i style={{ width: `${pct}%`, background: left < 0 ? "var(--gold)" : "var(--accent)" }} />
      </div>
      <div className="nutleft">
        {left >= 0 ? (
          <>
            <b className="num">{left}</b> {unit} left
          </>
        ) : (
          <>
            <b className="num">{Math.abs(left)}</b> {unit} over
          </>
        )}
      </div>
    </div>
  );
}
