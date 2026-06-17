import { auth } from "@/lib/auth";
import {
  getActivityLogs,
  getDiaryEntries,
  getVisitorDiary,
  getVisitorLogs,
  type JournalEntry,
  type LogView,
} from "@/lib/data";
import JournalGrid from "@/components/JournalGrid";
import RefreshButton from "@/components/RefreshButton";

export const metadata = { title: "Journal · Verdant" };

export default async function JournalPage() {
  const session = await auth();
  const authed = !!session?.user?.id;
  let entries: JournalEntry[];
  let logs: LogView[];
  if (authed) {
    const uid = Number(session!.user.id);
    [entries, logs] = await Promise.all([getDiaryEntries(uid), getActivityLogs(uid)]);
  } else {
    entries = getVisitorDiary();
    logs = getVisitorLogs();
  }

  return (
    <div className="wrap section">
      <div className="section-head">
        <div className="eyebrow">Journal</div>
        <h2>
          The <em>diary</em>.
        </h2>
        <p>
          Your entries and daily check-in logs, together.
          {authed ? "" : " (Guest mode — nothing is saved.)"}
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <RefreshButton />
      </div>
      <JournalGrid mode={authed ? "official" : "visitor"} initialEntries={entries} logs={logs} />
    </div>
  );
}
