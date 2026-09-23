import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeSearch } from "@/lib/utils";

export interface RelatorioFiltros {
  q?: string;
  turma?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
}

/** Monta a consulta de empréstimos usada tanto na página de relatórios quanto na exportação CSV. */
export function buildRelatorioQuery(supabase: SupabaseClient, filtros: RelatorioFiltros, opts?: { count?: "exact" }) {
  let query = supabase
    .from("v_emprestimos")
    .select("*", opts?.count ? { count: opts.count } : undefined)
    .order("data_retirada", { ascending: false });

  const q = sanitizeSearch(filtros.q ?? "");
  if (q) query = query.or(`aluno_nome.ilike.*${q}*,livro_titulo.ilike.*${q}*,professor_retirada_nome.ilike.*${q}*`);
  if (filtros.turma) query = query.eq("turma_id", filtros.turma);
  if (filtros.status) query = query.eq("status_efetivo", filtros.status);
  if (filtros.dataInicio) query = query.gte("data_retirada", filtros.dataInicio);
  if (filtros.dataFim) query = query.lte("data_retirada", `${filtros.dataFim}T23:59:59`);

  return query;
}
