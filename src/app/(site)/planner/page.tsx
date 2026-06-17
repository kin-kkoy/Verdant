import { auth } from "@/lib/auth";
import { getPlanBlocks, getVisitorPlan, type PlanBlock } from "@/lib/data";
import {
  addWeeksIso,
  dowMonday0,
  validPlannerWeek,
  weekDiff,
  weekRangeLabel,
  weekStartSG,
  PLANNER_WEEKS_AHEAD,
  PLANNER_WEEKS_BACK,
} from "@/lib/date";
import PlannerBoard from "@/components/PlannerBoard";

export const metadata = { title: "Planner · Verdant" };

function relWeekLabel(diff: number): string {
  if (diff === 0) return "This week";
  if (diff === 1) return "Next week";
  if (diff === -1) return "Last week";
  if (diff > 0) return `In ${diff} weeks`;
  return `${-diff} weeks ago`;
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await auth();
  const authed = !!session?.user?.id;

  const current = weekStartSG();
  const { week } = await searchParams;
  const viewed = validPlannerWeek(week) ?? current;
  const diff = weekDiff(viewed, current);

  let blocks: PlanBlock[];
  if (authed) {
    blocks = await getPlanBlocks(Number(session!.user.id), viewed);
  } else {
    // Visitor teaser: sample only on the current week, empty elsewhere.
    blocks = diff === 0 ? getVisitorPlan() : [];
  }

  return (
    <div className="wrap section">
      <div className="section-head">
        <div className="eyebrow">Planner</div>
        <h2>
          {diff === 0 ? (
            <>
              This week&apos;s <em>plan</em>.
            </>
          ) : (
            <>
              The <em>plan</em>, {relWeekLabel(diff).toLowerCase()}.
            </>
          )}
        </h2>
        <p>Map the week before it maps you.{authed ? "" : " (Guest mode — nothing is saved.)"}</p>
      </div>
      <PlannerBoard
        mode={authed ? "official" : "visitor"}
        initialBlocks={blocks}
        weekStart={viewed}
        todayDow={diff === 0 ? dowMonday0() : -1}
        weekLabel={relWeekLabel(diff)}
        weekRange={weekRangeLabel(viewed)}
        prevWeek={diff > -PLANNER_WEEKS_BACK ? addWeeksIso(viewed, -1) : null}
        nextWeek={diff < PLANNER_WEEKS_AHEAD ? addWeeksIso(viewed, 1) : null}
        isCurrent={diff === 0}
        storageKey={authed ? String(session!.user.id) : undefined}
      />
    </div>
  );
}
