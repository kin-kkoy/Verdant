import ClaimCodeFlow from "@/components/ClaimCodeFlow";

export const metadata = { title: "Join · Verdant" };

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <main className="auth-wrap">
      <div className="card auth-card">
        <h1>
          Join the <em>cabin</em>
        </h1>
        <p className="sub">Enter your access code to check your status and set up your account.</p>
        <ClaimCodeFlow initialCode={code ?? ""} />
      </div>
    </main>
  );
}
