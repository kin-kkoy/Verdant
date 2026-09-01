"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { auth, signOut } from "./auth";
import { db } from "./db";
import { accessRequests, checkins, diaryEntries, exerciseLogs, exercises, logs, planItems, profileInvites, pushSubscriptions, routineExercises, routines, users, weighIns } from "./db/schema";
import type { ExerciseUnit, ProfileVisibility } from "./db/schema";
import { catalogExercise } from "./exercises/catalog";
import { todaySG, validPlannerWeek, weekStartSG } from "./date";
import { isOwner } from "./owner";
import { round1 } from "./stats";
import { ACTIVITY_TAGS } from "./tags";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireUserId(): Promise<number | null> {
  const session = await auth();
  const id = session?.user?.id;
  return id ? Number(id) : null;
}

/**
 * Check in for today: saves the activity log (tags + note) AND records the
 * check-in that drives the streak. Idempotent per (user, day) — re-checking in
 * just updates the log. Day is always group-TZ "today" (Asia/Singapore).
 */
export async function checkInToday(
  tags: string[],
  note: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const day = todaySG();
  const cleanTags = tags.filter((t) =>
    (ACTIVITY_TAGS as readonly string[]).includes(t),
  );
  const cleanNote = note.trim().slice(0, 2000) || null;

  await db
    .insert(logs)
    .values({ userId, day, tags: cleanTags, note: cleanNote })
    .onConflictDoUpdate({
      target: [logs.userId, logs.day],
      set: { tags: cleanTags, note: cleanNote },
    });

  await db
    .insert(checkins)
    .values({ userId, day })
    .onConflictDoNothing({ target: [checkins.userId, checkins.day] });

  revalidatePath("/");
  revalidatePath("/standings");
  revalidatePath("/profile", "layout");
  return { ok: true };
}

// ---------- Profile visibility ----------

/** Open your profile to everyone, or limit it to the people you've invited. */
export async function setProfileVisibility(mode: ProfileVisibility): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  if (mode !== "everyone" && mode !== "invited") {
    return { ok: false, error: "Unknown visibility setting." };
  }
  await db.update(users).set({ profileVisibility: mode }).where(eq(users.id, userId));
  revalidatePath("/profile", "layout");
  return { ok: true };
}

/**
 * Let one person into your profile, or take the invitation back. One-way — the
 * viewer isn't asked and isn't notified; it only controls what they can open.
 */
export async function setProfileInvite(
  viewerId: number,
  invited: boolean,
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  if (!Number.isInteger(viewerId) || viewerId <= 0) {
    return { ok: false, error: "Unknown account." };
  }
  if (viewerId === userId) return { ok: false, error: "You can always see your own profile." };

  if (invited) {
    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, viewerId))
      .limit(1);
    if (!target) return { ok: false, error: "Unknown account." };
    await db
      .insert(profileInvites)
      .values({ ownerId: userId, viewerId })
      .onConflictDoNothing({ target: [profileInvites.ownerId, profileInvites.viewerId] });
  } else {
    await db
      .delete(profileInvites)
      .where(and(eq(profileInvites.ownerId, userId), eq(profileInvites.viewerId, viewerId)));
  }
  revalidatePath("/profile", "layout");
  return { ok: true };
}

// ---------- Workouts ----------

const MAX_CARDS = 200;
const MAX_ROUTINES = 50;
const MAX_ROUTINE_CARDS = 40;
/** Same cap the journal uses for a client-downscaled data URL. */
const MAX_IMAGE_CHARS = 1_600_000;

/** Anything that writes a completion moves the contribution graph. */
function revalidateWorkouts() {
  revalidatePath("/workouts");
  revalidatePath("/");
  revalidatePath("/standings");
  revalidatePath("/profile", "layout");
}

function cleanUnit(unit: string): ExerciseUnit {
  return unit === "seconds" ? "seconds" : "reps";
}

function cleanInt(n: unknown, lo: number, hi: number): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const v = Math.round(n);
  return v < lo || v > hi ? null : v;
}

type CardInput = {
  name: string;
  slug?: string | null;
  unit: string;
  sets: number;
  amount: number;
  image?: string | null;
};

/** Validate the shared card fields. Returns an error string, or the clean row. */
function validateCard(input: CardInput):
  | { ok: false; error: string }
  | { ok: true; value: { name: string; slug: string | null; unit: ExerciseUnit; sets: number; amount: number; image: string | null } } {
  const name = input.name.trim().slice(0, 60);
  if (!name) return { ok: false, error: "Give the exercise a name." };

  // A slug must be a real catalogue entry — never trust the client with a path.
  const slug = input.slug?.trim() || null;
  if (slug && !catalogExercise(slug)) return { ok: false, error: "Unknown exercise." };

  const sets = cleanInt(input.sets, 1, 99);
  if (sets == null) return { ok: false, error: "Sets should be between 1 and 99." };
  const amount = cleanInt(input.amount, 1, 999);
  if (amount == null) return { ok: false, error: "That amount looks off." };

  // Catalogue exercises keep their figure via the slug; only custom ones store an image.
  let image: string | null = null;
  if (!slug && input.image) {
    if (!input.image.startsWith("data:image/") || input.image.length > MAX_IMAGE_CHARS) {
      return { ok: false, error: "That image is too large." };
    }
    image = input.image;
  }

  return { ok: true, value: { name, slug, unit: cleanUnit(input.unit), sets, amount, image } };
}

/** Add a card to your library. */
export async function createExercise(
  input: CardInput,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const clean = validateCard(input);
  if (!clean.ok) return clean;

  const existing = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(eq(exercises.userId, userId));
  if (existing.length >= MAX_CARDS) {
    return { ok: false, error: "That's a lot of cards — tidy some up first." };
  }

  const [row] = await db
    .insert(exercises)
    .values({ userId, ...clean.value })
    .returning({ id: exercises.id });

  revalidatePath("/workouts");
  return { ok: true, id: row.id };
}

/** Edit a card. Past completions keep the numbers they were logged with. */
export async function updateExercise(id: number, input: CardInput): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const clean = validateCard(input);
  if (!clean.ok) return clean;

  await db
    .update(exercises)
    .set(clean.value)
    .where(and(eq(exercises.id, id), eq(exercises.userId, userId)));

  revalidateWorkouts();
  return { ok: true };
}

/** Delete a card and, by cascade, its completions. */
export async function deleteExercise(id: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.userId, userId)));
  revalidateWorkouts();
  return { ok: true };
}

/** Record that you did a card today. */
export async function logExercise(
  exerciseId: number,
  sets: number,
  amount: number,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const [card] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)))
    .limit(1);
  if (!card) return { ok: false, error: "That card is gone." };

  const cleanSets = cleanInt(sets, 1, 99);
  if (cleanSets == null) return { ok: false, error: "Sets should be between 1 and 99." };
  const cleanAmount = cleanInt(amount, 1, 999);
  if (cleanAmount == null) return { ok: false, error: "That amount looks off." };

  const [row] = await db
    .insert(exerciseLogs)
    .values({
      userId,
      exerciseId,
      day: todaySG(),
      sets: cleanSets,
      amount: cleanAmount,
      unit: card.unit,
    })
    .returning({ id: exerciseLogs.id });

  revalidateWorkouts();
  return { ok: true, id: row.id };
}

/** Undo one completion (a mis-tap, or a day you didn't really do it). */
export async function deleteExerciseLog(id: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  await db.delete(exerciseLogs).where(and(eq(exerciseLogs.id, id), eq(exerciseLogs.userId, userId)));
  revalidateWorkouts();
  return { ok: true };
}

/** Log every card in a routine at its own sets/amount, in one go. */
export async function logRoutine(
  routineId: number,
): Promise<{ ok: true; logged: number } | { ok: false; error: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const rows = await db
    .select({ id: exercises.id, sets: exercises.sets, amount: exercises.amount, unit: exercises.unit })
    .from(routineExercises)
    .innerJoin(routines, eq(routines.id, routineExercises.routineId))
    .innerJoin(exercises, eq(exercises.id, routineExercises.exerciseId))
    .where(and(eq(routineExercises.routineId, routineId), eq(routines.userId, userId)))
    .orderBy(asc(routineExercises.position));

  if (rows.length === 0) return { ok: false, error: "That routine has no cards yet." };

  const day = todaySG();
  await db.insert(exerciseLogs).values(
    rows.map((r) => ({
      userId,
      exerciseId: r.id,
      day,
      sets: r.sets,
      amount: r.amount,
      unit: r.unit,
    })),
  );

  revalidateWorkouts();
  return { ok: true, logged: rows.length };
}

/** Create a named group of cards. */
export async function createRoutine(
  name: string,
  exerciseIds: number[],
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const clean = name.trim().slice(0, 60);
  if (!clean) return { ok: false, error: "Give the routine a name." };

  const existing = await db
    .select({ id: routines.id })
    .from(routines)
    .where(eq(routines.userId, userId));
  if (existing.length >= MAX_ROUTINES) {
    return { ok: false, error: "That's plenty of routines already." };
  }

  const [row] = await db
    .insert(routines)
    .values({ userId, name: clean })
    .returning({ id: routines.id });

  const res = await setRoutineCards(userId, row.id, exerciseIds);
  if (!res.ok) return res;

  revalidatePath("/workouts");
  return { ok: true, id: row.id };
}

/** Rename a routine and/or replace the whole set of cards in it. */
export async function updateRoutine(
  id: number,
  name: string,
  exerciseIds: number[],
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const clean = name.trim().slice(0, 60);
  if (!clean) return { ok: false, error: "Give the routine a name." };

  const [own] = await db
    .select({ id: routines.id })
    .from(routines)
    .where(and(eq(routines.id, id), eq(routines.userId, userId)))
    .limit(1);
  if (!own) return { ok: false, error: "That routine is gone." };

  await db.update(routines).set({ name: clean }).where(eq(routines.id, id));
  const res = await setRoutineCards(userId, id, exerciseIds);
  if (!res.ok) return res;

  revalidatePath("/workouts");
  return { ok: true };
}

export async function deleteRoutine(id: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  await db.delete(routines).where(and(eq(routines.id, id), eq(routines.userId, userId)));
  revalidatePath("/workouts");
  return { ok: true };
}

/**
 * Replace a routine's cards wholesale — the same delete-then-insert shape as
 * `syncPlanWeek`. Not atomic (neon-http has no multi-statement transactions), which
 * is accepted for one user editing their own routine.
 */
async function setRoutineCards(
  userId: number,
  routineId: number,
  exerciseIds: number[],
): Promise<ActionResult> {
  const owned = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(eq(exercises.userId, userId));
  const ownedIds = new Set(owned.map((e) => e.id));

  const wanted = [...new Set(exerciseIds)]
    .filter((id) => ownedIds.has(id))
    .slice(0, MAX_ROUTINE_CARDS);

  await db.delete(routineExercises).where(eq(routineExercises.routineId, routineId));
  if (wanted.length > 0) {
    await db
      .insert(routineExercises)
      .values(wanted.map((exerciseId, position) => ({ routineId, exerciseId, position })));
  }
  return { ok: true };
}

/**
 * Opt in or out of workouts. Off lowers the daily contribution-graph target by
 * MAX_WORKOUTS — it doesn't penalise, it just stops asking for something you
 * never intended to do.
 */
export async function setTracksWorkouts(on: boolean): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  await db.update(users).set({ tracksWorkouts: !!on }).where(eq(users.id, userId));
  revalidatePath("/");
  revalidatePath("/standings");
  revalidatePath("/profile", "layout");
  return { ok: true };
}

/** Sign out and return to the landing page. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/** Re-baseline the signed-in user's starting weight (e.g. after a long break). */
export async function updateStartWeight(weight: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  if (!Number.isFinite(weight) || weight < 30 || weight > 400) {
    return { ok: false, error: "Pick a weight between 30 and 400 kg." };
  }
  await db.update(users).set({ startWeight: String(round1(weight)) }).where(eq(users.id, userId));
  revalidatePath("/");
  revalidatePath("/standings");
  return { ok: true };
}

/** Update the signed-in user's goal. `null` clears it (pure tracking, no goal). */
export async function updateGoal(goal: number | null): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  // Goals are SIGNED: positive = lose that many kg, negative = gain that many.
  let value: string | null = null;
  if (goal != null) {
    const size = Math.abs(goal);
    if (!Number.isFinite(goal) || size === 0 || size > 200) {
      return { ok: false, error: "Pick a goal between 0 and 200 kg." };
    }
    value = String(round1(goal));
  }
  await db.update(users).set({ goalKg: value }).where(eq(users.id, userId));
  revalidatePath("/");
  revalidatePath("/standings");
  return { ok: true };
}

// ---------- Access requests (claim-code flow) ----------

const CODE_TTL_DAYS = 14;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no 0/O/1/I

function generateCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  // 256 % 32 === 0, so b % 32 is unbiased.
  const c = [...bytes].map((b) => CODE_ALPHABET[b % 32]).join("");
  return `VRD-${c.slice(0, 4)}-${c.slice(4, 8)}`;
}

function isExpired(approvedAt: Date | null): boolean {
  if (!approvedAt) return false;
  return Date.now() - new Date(approvedAt).getTime() > CODE_TTL_DAYS * 86_400_000;
}

/** Public: a visitor asks to join. Returns the claim code they must keep. */
export async function submitAccessRequest(input: {
  name: string;
  message: string;
}): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Tell us your name." };
  const message = input.message.trim().slice(0, 1000) || null;

  const pending = await db
    .select({ id: accessRequests.id })
    .from(accessRequests)
    .where(eq(accessRequests.status, "pending"));
  if (pending.length >= 50) return { ok: false, error: "Too many pending requests right now." };

  // Generate a unique code (retry on the rare collision).
  let code = "";
  for (let i = 0; i < 6; i++) {
    code = generateCode();
    const clash = await db.select({ id: accessRequests.id }).from(accessRequests).where(eq(accessRequests.code, code));
    if (clash.length === 0) break;
    if (i === 5) return { ok: false, error: "Couldn't allocate a code, try again." };
  }

  await db.insert(accessRequests).values({ name, message, code });
  revalidatePath("/requests");
  return { ok: true, code };
}

export type CodeStatus =
  | { state: "unknown" }
  | { state: "pending"; name: string }
  | { state: "dismissed" }
  | { state: "expired" }
  | { state: "completed" }
  | { state: "approved"; name: string };

/** Public: check a claim code's status (used by the requester to follow up). */
export async function checkCode(rawCode: string): Promise<CodeStatus> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { state: "unknown" };
  const [r] = await db.select().from(accessRequests).where(eq(accessRequests.code, code)).limit(1);
  if (!r) return { state: "unknown" };
  if (r.status === "dismissed") return { state: "dismissed" };
  if (r.status === "completed") return { state: "completed" };
  if (r.status === "approved") {
    if (isExpired(r.approvedAt)) return { state: "expired" };
    return { state: "approved", name: r.name };
  }
  return { state: "pending", name: r.name };
}

/** Owner only: approve a request → starts the 14-day window for them to set up. */
export async function approveAccessRequest(id: number): Promise<ActionResult> {
  if (!(await isOwner())) return { ok: false, error: "Owner only." };
  await db
    .update(accessRequests)
    .set({ status: "approved", approvedAt: new Date() })
    .where(eq(accessRequests.id, id));
  revalidatePath("/requests");
  return { ok: true };
}

/** Owner only: dismiss a request (soft — keeps the record). */
export async function dismissAccessRequest(id: number): Promise<ActionResult> {
  if (!(await isOwner())) return { ok: false, error: "Owner only." };
  await db.update(accessRequests).set({ status: "dismissed" }).where(eq(accessRequests.id, id));
  revalidatePath("/requests");
  return { ok: true };
}

/** Owner only: permanently delete a request row. */
export async function deleteAccessRequest(id: number): Promise<ActionResult> {
  if (!(await isOwner())) return { ok: false, error: "Owner only." };
  await db.delete(accessRequests).where(eq(accessRequests.id, id));
  revalidatePath("/requests");
  return { ok: true };
}

/** Public (gated by a valid approved code): the requester creates their own account. */
export async function completeSignup(input: {
  code: string;
  loginName: string;
  password: string;
  email: string;
  startWeight: string;
}): Promise<ActionResult> {
  const code = input.code.trim().toUpperCase();
  const [r] = await db.select().from(accessRequests).where(eq(accessRequests.code, code)).limit(1);
  if (!r || r.status !== "approved") return { ok: false, error: "This code isn't approved." };
  if (isExpired(r.approvedAt)) return { ok: false, error: "This code has expired — please request again." };

  const loginName = input.loginName.trim().slice(0, 80);
  if (!loginName) return { ok: false, error: "Pick a login name." };
  if (input.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  const email = input.email.trim().slice(0, 160) || null;
  const sw = Number(input.startWeight);
  if (!Number.isFinite(sw) || sw < 30 || sw > 400) return { ok: false, error: "Start weight looks off." };

  const clashName = await db.select({ id: users.id }).from(users).where(eq(users.name, loginName));
  if (clashName.length > 0) return { ok: false, error: "That login name is taken." };

  const passwordHash = await bcrypt.hash(input.password, 10);
  await db.insert(users).values({
    name: loginName,
    email,
    passwordHash,
    startWeight: String(round1(sw)),
    avatarColor: "#7d8c4e",
  });
  await db.update(accessRequests).set({ status: "completed" }).where(eq(accessRequests.id, r.id));

  revalidatePath("/requests");
  revalidatePath("/standings");
  return { ok: true };
}

// ---------- Journal ----------

// Guard against bloating the DB; ~1.6MB data URL ceiling (downscaled photos are
// far smaller). Photos live in Postgres for now (seam to Blob later).
const MAX_PHOTO_CHARS = 1_600_000;

const MAX_PHOTOS = 8;

export async function addDiaryEntry(input: {
  mood: string;
  title: string;
  body: string;
  photos: string[];
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const title = input.title.trim().slice(0, 140);
  if (!title) return { ok: false, error: "Give it a title." };
  const body = input.body.trim().slice(0, 4000) || null;
  const mood = input.mood.slice(0, 8) || "🍂";

  const photos = (input.photos ?? []).slice(0, MAX_PHOTOS);
  for (const p of photos) {
    if (!p.startsWith("data:image/") || p.length > MAX_PHOTO_CHARS) {
      return { ok: false, error: "One of those photos is too large." };
    }
  }

  const [row] = await db
    .insert(diaryEntries)
    .values({ userId, mood, title, body, photos })
    .returning({ id: diaryEntries.id });
  revalidatePath("/journal");
  return { ok: true, id: row.id };
}

export async function deleteDiaryEntry(id: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  await db
    .delete(diaryEntries)
    .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, userId)));
  revalidatePath("/journal");
  return { ok: true };
}

// ---------- Planner ----------

const CLAMP = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Replace an entire week's schedule in ONE call. The planner edits locally and
 * persists with this on Save, so we never write per-drag. Deletes the week's rows
 * then inserts the provided set (sequential — neon-http has no multi-statement txn;
 * the non-atomic window is acceptable for a single user editing their own week).
 */
export async function syncPlanWeek(
  weekStartInput: string,
  blocks: { dow: number; hour: number; text: string; color: string }[],
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  const weekStart = validPlannerWeek(weekStartInput);
  if (!weekStart) return { ok: false, error: "That week is out of range." };

  const rows = (blocks ?? [])
    .map((b) => ({
      userId,
      weekStart,
      dow: CLAMP(b.dow, 0, 6),
      hour: CLAMP(b.hour, 0, 23),
      text: (b.text ?? "").trim().slice(0, 80),
      color: b.color || "var(--accent)",
    }))
    .filter((b) => b.text)
    .slice(0, 200); // sane cap

  await db
    .delete(planItems)
    .where(and(eq(planItems.userId, userId), eq(planItems.weekStart, weekStart)));
  if (rows.length > 0) await db.insert(planItems).values(rows);

  revalidatePath("/planner");
  return { ok: true };
}

/** Save today's weigh-in (one per user per day; re-saving overwrites). */
export async function saveWeighIn(weight: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  if (!Number.isFinite(weight) || weight < 30 || weight > 400) {
    return { ok: false, error: "That weight looks off." };
  }
  const day = todaySG();
  const weightKg = String(round1(weight));

  await db
    .insert(weighIns)
    .values({ userId, day, weightKg })
    .onConflictDoUpdate({
      target: [weighIns.userId, weighIns.day],
      set: { weightKg },
    });

  revalidatePath("/");
  revalidatePath("/standings");
  revalidatePath("/profile", "layout");
  return { ok: true };
}

/**
 * Store (or refresh) a Web Push subscription for the signed-in user. Keyed by the
 * push `endpoint`, so re-subscribing on the same device just updates the keys and
 * re-points it at the current user. Called by the client after the browser grants
 * notification permission.
 */
export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  if (!sub?.endpoint || !sub.p256dh || !sub.auth) {
    return { ok: false, error: "Invalid subscription." };
  }

  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.p256dh, authKey: sub.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.p256dh, authKey: sub.auth },
    });
  return { ok: true };
}

/** Remove a push subscription (user turned reminders off on this device). */
export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)));
  return { ok: true };
}

/**
 * Set the signed-in user's daily reminder time. `minute` is minutes since local
 * midnight, snapped to a 30-min slot (or null to clear). `timezone` is the IANA
 * zone from their phone. Clearing the time resets the nudge guard so a re-enable
 * can fire the same day.
 */
export async function setReminderPref(pref: {
  minute: number | null;
  timezone?: string;
}): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  let minute = pref.minute;
  if (minute != null) {
    if (!Number.isFinite(minute) || minute < 0 || minute > 1439) {
      return { ok: false, error: "Invalid time." };
    }
    minute = Math.round(minute / 30) * 30; // snap to :00 / :30
  }

  const tz = pref.timezone?.trim();
  await db
    .update(users)
    .set({
      reminderMinute: minute,
      ...(tz ? { timezone: tz } : {}),
      ...(minute == null ? { lastNudgedDay: null } : {}),
    })
    .where(eq(users.id, userId));
  return { ok: true };
}

/** Read the signed-in user's reminder time (minutes since midnight) for the picker. */
export async function getMyReminderMinute(): Promise<number | null> {
  const userId = await requireUserId();
  if (!userId) return null;
  const rows = await db
    .select({ minute: users.reminderMinute })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.minute ?? null;
}
