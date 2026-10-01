import type { SupabaseClient } from "@supabase/supabase-js";
import { PAGE_SIZE } from "@/lib/constants";
import { sanitizeSearch } from "@/lib/utils";
import type { LivroCatalogo } from "@/types";

export interface CatalogParams {
  q?: string;
  categoria?: string;
  disp?: string;
  avaliacao?: string;
  ordem?: string;
  page?: number;
  includeInactive?: boolean;
  pageSize?: number;
}

export async function getCatalog(supabase: SupabaseClient, p: CatalogParams) {
  const pageSize = p.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, p.page ?? 1);
  let query = supabase.from("v_livros_catalogo").select("*", { count: "exact" });

  if (!p.includeInactive) query = query.eq("ativo", true);
  const q = sanitizeSearch(p.q ?? "");
  if (q) query = query.or(`titulo.ilike.*${q}*,autor.ilike.*${q}*,isbn.ilike.*${q}*`);
  if (p.categoria) query = query.eq("categoria", p.categoria);
  if (p.disp === "disponiveis") query = query.gt("disponiveis", 0);
  if (p.disp === "indisponiveis") query = query.eq("disponiveis", 0);
  if (p.avaliacao) query = query.gte("media_avaliacoes", Number(p.avaliacao));

  switch (p.ordem) {
    case "autor":
      query = query.order("autor").order("titulo");
      break;
    case "recentes":
      query = query.order("created_at", { ascending: false });
      break;
    case "disponiveis":
      query = query.order("disponiveis", { ascending: false }).order("titulo");
      break;
    case "avaliacao":
      query = query.order("media_avaliacoes", { ascending: false }).order("total_avaliacoes", { ascending: false });
      break;
    case "populares":
      query = query.order("total_emprestimos", { ascending: false });
      break;
    default:
      query = query.order("titulo");
  }

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error("Falha ao carregar o catálogo.");
  return { items: (data ?? []) as LivroCatalogo[], total: count ?? 0, page, pageSize };
}

export async function getCategorias(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from("livros").select("categoria").eq("ativo", true);
  return [...new Set((data ?? []).map((r: { categoria: string }) => r.categoria))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
}
