import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { accessRequests, checkins, diaryEntries, gardens, logs, planItems, users, weighIns } from "./db/schema";
import type { TendedPlant } from "./db/schema";
import { relativeFromNow, todaySG, weekStartSG } from "./date";
import { daysIn, lostKg, progressPct, round1, streakDays } from "./stats";
import { betGardenStages, bloomBalance, deriveBlooms } from "./economy";

export type WeightPoint = { day: string; weight: number };

export type Dashboard = {
  mode: "official" | "visitor";
  name: string;
  avatarColor: string;
  startWeight: number;
  goalKg: number | null; // null = no goal (just tracking)
  latestWeight: number | null;
  /** weight before the latest entry, for the "down X since last" line */
  prevWeight: number | null;
  lost: number;
  pct: number | null; // null when there's no goal
  streak: number;
  daysIn: number;
  checkedInToday: boolean;
  todayTags: string[];
  todayNote: string;
  series: WeightPoint[];
};

export type Standing = {
  id: number;
  name: string;
  avatarColor: string;
  lost: number;
  pct: number | null;
  goalKg: number | null;
  streak: number;
  latestWeighInDay: string | null;
};

/** Load everything the landing page needs for one official user. */
export async function getDashboard(userId: number): Promise<Dashboard | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const wis = await db
    .select()
    .from(weighIns)
    .where(eq(weighIns.userId, userId))
    .orderBy(asc(weighIns.day));
  const cis = await db
    .select({ day: checkins.day })
    .from(checkins)
    .where(eq(checkins.userId, userId));
  const today = todaySG();
  const [todayLog] = await db
    .select()
    .from(logs)
    .where(and(eq(logs.userId, userId), eq(logs.day, today)))
    .limit(1);

  const series: WeightPoint[] = wis.map((w) => ({
    day: w.day,
    weight: Number(w.weightKg),
  }));
  const startWeight = Number(user.startWeight);
  const goalKg = user.goalKg == null ? null : Number(user.goalKg);
  const latestWeight = series.length ? series[series.length - 1].weight : null;
  const prevWeight = series.length > 1 ? series[series.length - 2].weight : null;
  const lost = lostKg(startWeight, latestWeight);
  const betStart = todaySG(new Date(user.createdAt));
  const checkinDays = cis.map((c) => c.day);

  return {
    mode: "official",
    name: user.name,
    avatarColor: user.avatarColor,
    startWeight,
    goalKg,
    latestWeight,
    prevWeight,
    lost,
    pct: goalKg == null ? null : progressPct(lost, goalKg),
    streak: streakDays(checkinDays, today),
    daysIn: daysIn(betStart, today),
    checkedInToday: checkinDays.includes(today),
    todayTags: todayLog?.tags ?? [],
    todayNote: todayLog?.note ?? "",
    series,
  };
}

/** Standings for all official users — derived ONLY from real weigh-ins (the firewall). */
export async function getStandings(): Promise<Standing[]> {
  const allUsers = await db.select().from(users).orderBy(asc(users.id));
  const today = todaySG();

  const rows: Standing[] = [];
  for (const user of allUsers) {
    const wis = await db
      .select()
      .from(weighIns)
      .where(eq(weighIns.userId, user.id))
      .orderBy(asc(weighIns.day));
    const cis = await db
      .select({ day: checkins.day })
      .from(checkins)
      .where(eq(checkins.userId, user.id));

    const startWeight = Number(user.startWeight);
    const goalKg = user.goalKg == null ? null : Number(user.goalKg);
    const latest = wis.length ? Number(wis[wis.length - 1].weightKg) : null;
    const lost = lostKg(startWeight, latest);

    rows.push({
      id: user.id,
      name: user.name,
      avatarColor: user.avatarColor,
      lost,
      pct: goalKg == null ? null : progressPct(lost, goalKg),
      goalKg,
      streak: streakDays(
        cis.map((c) => c.day),
        today,
      ),
      latestWeighInDay: wis.length ? wis[wis.length - 1].day : null,
    });
  }

  // Most lost first; the bet leader is rows[0].
  return rows.sort((a, b) => b.lost - a.lost);
}

/**
 * The visitor teaser — static demo data matching the mockup. NOTHING here is
 * persisted; visitor interactions live in client React state only and are wiped
 * on refresh/navigation (NOTES.md hard rule).
 */
export function getVisitorDashboard(): Dashboard {
  const series: WeightPoint[] = [
    { day: "2026-05-01", weight: 84.2 },
    { day: "2026-05-08", weight: 84.0 },
    { day: "2026-05-15", weight: 83.5 },
    { day: "2026-05-22", weight: 83.4 },
    { day: "2026-05-29", weight: 82.8 },
    { day: "2026-06-05", weight: 82.6 },
    { day: "2026-06-12", weight: 82.1 },
    { day: "2026-06-16", weight: 81.9 },
  ];
  return {
    mode: "visitor",
    name: "Guest",
    avatarColor: "#c2632b",
    startWeight: 84.2,
    goalKg: 5,
    latestWeight: 81.9,
    prevWeight: 82.1,
    lost: round1(84.2 - 81.9),
    pct: progressPct(round1(84.2 - 81.9), 5),
    streak: 5,
    daysIn: 47,
    checkedInToday: false,
    todayTags: ["Workout", "Clean eating"],
    todayNote: "",
    series,
  };
}

// ---------- Garden (game layer, Phase 3) ----------

export type GardenView = {
  mode: "official" | "visitor";
  currencies: { sun: number; water: number; compost: number };
  pureBlooms: number;
  bloomBalance: number;
  /** BET garden: one growth stage (0..4) per bed, DERIVED from real kg (firewall read). */
  betBeds: number[];
  /** TENDED garden: pots grown from soft currencies (persisted; §4.4 decay in 3b). */
  tended: TendedPlant[];
};

/** Ensure a garden row exists for the user (lazy create on first visit). */
async function ensureGardenRow(userId: number) {
  await db.insert(gardens).values({ userId }).onConflictDoNothing({ target: gardens.userId });
  const [row] = await db.select().from(gardens).where(eq(gardens.userId, userId)).limit(1);
  return row;
}

/**
 * Load the garden for one official user. The BET garden + Blooms are DERIVED from
 * real weigh-ins (the firewall truth — no game state can alter them); only soft
 * currencies + tended pots are read from storage. (Idle/decay arrives in Phase 3b.)
 */
export async function getGarden(userId: number): Promise<GardenView | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const wis = await db
    .select({ weightKg: weighIns.weightKg })
    .from(weighIns)
    .where(eq(weighIns.userId, userId));
  const series = wis.map((w) => Number(w.weightKg));
  const startWeight = Number(user.startWeight);
  const goalKg = user.goalKg == null ? null : Number(user.goalKg);
  const latest = series.length ? series[series.length - 1] : null;
  const lost = lostKg(startWeight, latest);

  const { pureBlooms, earnedBlooms } = deriveBlooms(series, startWeight);
  const row = await ensureGardenRow(userId);

  return {
    mode: "official",
    currencies: { sun: row.sun, water: row.water, compost: row.compost },
    pureBlooms,
    bloomBalance: bloomBalance(earnedBlooms, row.bloomSpent),
    betBeds: betGardenStages(lost, goalKg),
    tended: row.plantState ?? [],
  };
}

/** Visitor teaser — in-memory only, nothing persisted (NOTES hard rule). */
export function getVisitorGarden(): GardenView {
  return {
    mode: "visitor",
    currencies: { sun: 40, water: 60, compost: 25 },
    pureBlooms: 4,
    bloomBalance: 4,
    betBeds: betGardenStages(2.3, 5), // matches the visitor dashboard's 2.3 kg lost
    tended: [
      { id: "demo-1", species: "aster", stage: 3, wilt: 0, plantedAt: "2026-06-10" },
      { id: "demo-2", species: "daisy", stage: 2, wilt: 0, plantedAt: "2026-06-14" },
    ],
  };
}

// ---------- Journal (per-user) ----------

export type JournalEntry = {
  id: number;
  mood: string;
  title: string;
  body: string | null;
  photos: string[];
  when: string;
  ts: number;
};

export type LogView = {
  id: number;
  day: string;
  tags: string[];
  note: string | null;
  when: string;
  ts: number;
};

export async function getDiaryEntries(userId: number): Promise<JournalEntry[]> {
  const rows = await db
    .select()
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, userId))
    .orderBy(desc(diaryEntries.createdAt));
  return rows.map((r) => ({
    id: r.id,
    mood: r.mood,
    title: r.title,
    body: r.body,
    // Merge legacy single photo with the photos array.
    photos: [...(r.photos ?? []), ...(r.photo ? [r.photo] : [])],
    when: relativeFromNow(new Date(r.createdAt)),
    ts: new Date(r.createdAt).getTime(),
  }));
}

/** Daily activity logs (check-in tags + note) that have content, recent first. */
export async function getActivityLogs(userId: number): Promise<LogView[]> {
  const rows = await db
    .select()
    .from(logs)
    .where(eq(logs.userId, userId))
    .orderBy(desc(logs.day));
  return rows
    .filter((r) => (r.tags && r.tags.length > 0) || (r.note && r.note.trim()))
    .map((r) => ({
      id: r.id,
      day: r.day,
      tags: r.tags ?? [],
      note: r.note,
      when: relativeFromNow(new Date(r.createdAt)),
      ts: new Date(r.createdAt).getTime(),
    }));
}

export function getVisitorDiary(): JournalEntry[] {
  return [
    { id: -1, mood: "🍂", title: "Week 6 check", body: "Down a full 3.6 kg and the morning walks are a ritual now. Lit the fire early.", photos: [], when: "2 days ago", ts: Date.parse("2026-06-15") },
    { id: -2, mood: "💪", title: "Reset day", body: "Slipped over the weekend, back on it Monday. Logged it honestly — that is the point.", photos: [], when: "5 days ago", ts: Date.parse("2026-06-12") },
    { id: -3, mood: "🌰", title: "New trail", body: "Found a leaf-covered loop by the creek. Could do it every morning.", photos: [], when: "9 days ago", ts: Date.parse("2026-06-08") },
  ];
}

export function getVisitorLogs(): LogView[] {
  return [
    { id: -101, day: "2026-06-16", tags: ["Workout", "Clean eating"], note: "Felt strong on the morning lift.", when: "yesterday", ts: Date.parse("2026-06-16") },
    { id: -102, day: "2026-06-14", tags: ["Walk", "Water"], note: null, when: "3 days ago", ts: Date.parse("2026-06-14") },
  ];
}

// ---------- Planner (per-user, current week) ----------

export type PlanBlock = { id: number; dow: number; hour: number; text: string; color: string };

export async function getPlanBlocks(
  userId: number,
  weekStart: string = weekStartSG(),
): Promise<PlanBlock[]> {
  const rows = await db
    .select()
    .from(planItems)
    .where(and(eq(planItems.userId, userId), eq(planItems.weekStart, weekStart)))
    .orderBy(asc(planItems.hour));
  return rows.map((r) => ({ id: r.id, dow: r.dow, hour: r.hour, text: r.text, color: r.color }));
}

export function getVisitorPlan(): PlanBlock[] {
  return [
    { id: -1, dow: 0, hour: 7, text: "Upper body", color: "var(--accent)" },
    { id: -2, dow: 2, hour: 9, text: "5k run", color: "var(--rust)" },
    { id: -3, dow: 4, hour: 11, text: "Spin", color: "var(--olive)" },
    { id: -4, dow: 5, hour: 13, text: "Long hike", color: "var(--gold)" },
    { id: -5, dow: 5, hour: 8, text: "Weigh-in", color: "var(--accent)" },
  ];
}

// ---------- Access requests (admin) ----------

export type AccessRequestView = {
  id: number;
  name: string;
  message: string | null;
  code: string;
  status: string;
  expired: boolean;
  when: string;
};

const CODE_TTL_MS = 14 * 86_400_000;

export async function getAccessRequests(): Promise<AccessRequestView[]> {
  const rows = await db.select().from(accessRequests).orderBy(desc(accessRequests.createdAt));
  // Pending first, then most-recent handled.
  const order = (s: string) => (s === "pending" ? 0 : 1);
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      message: r.message,
      code: r.code,
      status: r.status,
      expired:
        r.status === "approved" && r.approvedAt
          ? Date.now() - new Date(r.approvedAt).getTime() > CODE_TTL_MS
          : false,
      when: relativeFromNow(new Date(r.createdAt)),
    }))
    .sort((a, b) => order(a.status) - order(b.status));
}

export async function getPendingRequestCount(): Promise<number> {
  const rows = await db
    .select({ id: accessRequests.id })
    .from(accessRequests)
    .where(eq(accessRequests.status, "pending"));
  return rows.length;
}

export function getVisitorStandings(): Standing[] {
  return [
    {
      id: -1,
      name: "Mei",
      avatarColor: "#b1556c",
      lost: 3.6,
      pct: 72,
      goalKg: 5,
      streak: 9,
      latestWeighInDay: "2026-06-15",
    },
    {
      id: -2,
      name: "You",
      avatarColor: "#c2632b",
      lost: 2.3,
      pct: 46,
      goalKg: 5,
      streak: 5,
      latestWeighInDay: "2026-06-17",
    },
  ];
}
