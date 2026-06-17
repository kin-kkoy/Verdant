import { redirect } from "next/navigation";
import { getAccessRequests } from "@/lib/data";
import { isOwner } from "@/lib/owner";
import RequestsBrowser from "@/components/RequestsBrowser";
import RefreshButton from "@/components/RefreshButton";

export const metadata = { title: "Access requests · Verdant" };

// Owner-only view (see src/lib/owner.ts). Non-owners are sent home.
export default async function RequestsPage() {
  if (!(await isOwner())) redirect("/");

  const requests = await getAccessRequests();

  return (
    <div className="wrap section">
      <div className="section-head">
        <div className="eyebrow">Admin</div>
        <h2>
          Access <em>requests</em>.
        </h2>
        <p>Approve a request to let that person set up their account, dismiss, or delete it.</p>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <RefreshButton />
      </div>
      <RequestsBrowser requests={requests} />
    </div>
  );
}
