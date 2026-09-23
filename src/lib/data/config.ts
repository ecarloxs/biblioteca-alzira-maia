import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysISO, hojeISO } from "@/lib/utils";

export interface Configuracoes {
  prazo_padrao_dias: number;
  validade_reserva_dias: number;
  max_emprestimos_por_aluno: number;
  bloquear_reserva_com_atraso: boolean;
}

export async function getConfiguracoes(supabase: SupabaseClient): Promise<Configuracoes> {
  const { data } = await supabase.from("configuracoes").select("chave, valor");
  const map = new Map((data ?? []).map((r: { chave: string; valor: string }) => [r.chave, r.valor]));
  return {
    prazo_padrao_dias: Number(map.get("prazo_padrao_dias") ?? 7),
    validade_reserva_dias: Number(map.get("validade_reserva_dias") ?? 2),
    max_emprestimos_por_aluno: Number(map.get("max_emprestimos_por_aluno") ?? 2),
    bloquear_reserva_com_atraso: (map.get("bloquear_reserva_com_atraso") ?? "true") === "true",
  };
}

export async function getPrazoPadraoISO(supabase: SupabaseClient): Promise<string> {
  const cfg = await getConfiguracoes(supabase);
  return addDaysISO(hojeISO(), cfg.prazo_padrao_dias);
}
