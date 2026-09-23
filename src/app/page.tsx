import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.profile.ativo) redirect("/login?erro=inativo");
  redirect(`/${session.profile.role}`);
}
