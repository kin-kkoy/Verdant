import { auth } from "@/lib/auth";
import { getPendingRequestCount } from "@/lib/data";
import { isOwner } from "@/lib/owner";
import Nav from "@/components/Nav";

// Shared chrome for all main pages: the persistent nav. Visitors (no session)
// see the same app — the landing/standings just render demo data for them.
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const authed = !!session?.user;
  const owner = authed ? await isOwner() : false;
  const pendingRequests = owner ? await getPendingRequestCount() : 0;
  return (
    <>
      <Nav authed={authed} owner={owner} pendingRequests={pendingRequests} />
      {children}
    </>
  );
}
