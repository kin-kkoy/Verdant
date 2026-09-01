import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Sign in · Verdant" };

async function login(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { name, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw err; // re-throw redirect() control-flow errors
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="auth-wrap">
      <form className="card auth-card" action={login}>
        <h1>
          Welcome back to <em>Verdant</em>
        </h1>
        <p className="sub">Sign in to keep the streak alive.</p>
        {error ? <div className="err">That name and password didn&apos;t match.</div> : null}
        <label htmlFor="name">Name</label>
        <input id="name" name="name" autoComplete="username" autoFocus required />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>
    </main>
  );
}
