import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/types";

/** Usuário logado + perfil (consultado UMA vez por requisição). O perfil vem do banco, com RLS. */
export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nome, email, role, ativo")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  return { user, profile: profile as Profile };
});

/** Garante login e perfil permitido; caso contrário redireciona. Use nos layouts de cada área. */
export async function requireRole(roles: Role[]) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.profile.ativo) redirect("/login?erro=inativo");
  if (!roles.includes(session.profile.role)) redirect(`/${session.profile.role}`);
  return session;
}
