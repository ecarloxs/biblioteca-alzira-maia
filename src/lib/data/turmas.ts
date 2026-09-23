import type { SupabaseClient } from "@supabase/supabase-js";
import type { Turma } from "@/types";

export async function getAllTurmas(supabase: SupabaseClient, opts?: { includeInactive?: boolean }): Promise<Turma[]> {
  let query = supabase.from("turmas").select("*").order("nome");
  if (!opts?.includeInactive) query = query.eq("ativo", true);
  const { data } = await query;
  return (data ?? []) as Turma[];
}
