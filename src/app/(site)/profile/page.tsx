import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** `/profile` is a shortcut to your own profile. */
export default async function MyProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  redirect(`/profile/${session.user.id}`);
}
