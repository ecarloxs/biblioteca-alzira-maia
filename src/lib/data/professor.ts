import type { SupabaseClient } from "@supabase/supabase-js";

export interface TurmaOption {
  id: string;
  nome: string;
  ano: number | null;
  turno: string | null;
}

/** Turmas que o professor logado gerencia (RLS já restringe às próprias). */
export async function getMinhasTurmas(supabase: SupabaseClient): Promise<TurmaOption[]> {
  const { data } = await supabase
    .from("professor_turmas")
    .select("turmas(id, nome, ano, turno)")
    .order("turma_id");
  const rows = (data ?? []) as unknown as { turmas: TurmaOption }[];
  return rows
    .map((r) => r.turmas)
    .filter(Boolean)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function getMyProfessorId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: prof } = await supabase.from("professores").select("id").eq("profile_id", data.user.id).maybeSingle();
  return (prof?.id as string) ?? null;
}
