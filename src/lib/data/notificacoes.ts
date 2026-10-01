import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notificacao } from "@/types";

export async function getNotificacoesRecentes(supabase: SupabaseClient): Promise<Notificacao[]> {
  const { data } = await supabase
    .from("notificacoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15);
  return (data ?? []) as Notificacao[];
}
