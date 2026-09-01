import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  canViewProfile,
  getActivityCalendar,
  getProfileInvites,
  getProfileUser,
  listProfileUsers,
  type ProfileUser,
} from "@/lib/data";
import { randomTease } from "@/lib/teases";
import ActivityGraph from "@/components/ActivityGraph";
import ProfileAccess from "@/components/ProfileAccess";
import TrackingPrefs from "@/components/TrackingPrefs";
import Footer from "@/components/Footer";

export const metadata = { title: "Profile · Verdant" };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  // Profiles are for people in the group — visitors get the login page.
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) notFound();

  const viewerId = Number(session.user.id);
  const user = await getProfileUser(userId);
  if (!user) notFound();

  const isMe = viewerId === userId;
  if (!(await canViewProfile(user, viewerId))) {
    return <LockedProfile user={user} />;
  }

  const [cal, everyone, invited] = await Promise.all([
    getActivityCalendar(userId),
    listProfileUsers(),
    isMe ? getProfileInvites(userId) : Promise.resolve<number[]>([]),
  ]);
  if (!cal) notFound();

  return (
    <>
      <ProfileHead user={user} isMe={isMe} />

      <ActivityGraph
        cal={cal}
        caption={
          isMe
            ? "Brighter means more of your day logged."
            : `Brighter means more of ${user.name}'s day logged.`
        }
      />

      <div className="wrap section">
        <div className="pstats">
          <div className="pstat">
            <b className="num">{cal.activeDays}</b>
            <span>Active days</span>
          </div>
          <div className="pstat">
            <b className="num">{cal.currentStreak}</b>
            <span>Current streak</span>
          </div>
          <div className="pstat">
            <b className="num">{cal.longestStreak}</b>
            <span>Longest streak</span>
          </div>
          <div className="pstat">
            <b className="num">{cal.totalPoints}</b>
            <span>Total points</span>
          </div>
        </div>

        {isMe ? (
          <div style={{ marginTop: 34, display: "grid", gap: 18 }}>
            <TrackingPrefs tracksWorkouts={user.tracksWorkouts} />
            <ProfileAccess
              visibility={user.visibility}
              invited={invited}
              people={everyone.filter((u) => u.id !== userId)}
            />
          </div>
        ) : null}

        <OtherProfiles everyone={everyone} currentId={userId} />
      </div>

      <Footer />
    </>
  );
}

function ProfileHead({ user, isMe }: { user: ProfileUser; isMe: boolean }) {
  return (
    <div className="wrap">
      <div className="phead">
        <span className="av" style={{ background: user.avatarColor }}>
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h1>
            {user.name}
            {isMe ? <span className="sub"> · you</span> : null}
          </h1>
          <div className="sub">
            Here since {user.joinedDay}
            {isMe && user.visibility === "invited" ? " · invite-only" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

/** What someone sees when they open an invite-only profile uninvited. */
async function LockedProfile({ user }: { user: ProfileUser }) {
  const everyone = await listProfileUsers();
  return (
    <>
      <ProfileHead user={user} isMe={false} />
      <div className="wrap section">
        <div className="card locked">
          <div className="lockmark" aria-hidden>
            🔒
          </div>
          {/* Fresh line on every visit — the route is dynamic, nothing is cached. */}
          <p className="teaseline">{randomTease()}</p>
          <p className="sub">This profile is invite-only.</p>
        </div>
        <OtherProfiles everyone={everyone} currentId={user.id} />
      </div>
      <Footer />
    </>
  );
}

function OtherProfiles({
  everyone,
  currentId,
}: {
  everyone: ProfileUser[];
  currentId: number;
}) {
  const others = everyone.filter((u) => u.id !== currentId);
  if (others.length === 0) return null;
  return (
    <>
      <div className="section-head" style={{ marginTop: 44, marginBottom: 14 }}>
        <div className="eyebrow">Everyone else</div>
      </div>
      <div className="tags">
        {others.map((u) => (
          <Link key={u.id} href={`/profile/${u.id}`} className="tag">
            {u.name}
          </Link>
        ))}
      </div>
    </>
  );
}
