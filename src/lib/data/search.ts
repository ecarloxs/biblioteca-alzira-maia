import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeSearch } from "@/lib/utils";
import type { LivroCatalogo, VAluno, VEmprestimo, VReserva } from "@/types";

export interface SearchResults {
  term: string;
  livros: LivroCatalogo[];
  alunos: VAluno[];
  reservas: VReserva[];
  emprestimos: VEmprestimo[];
}

const EMPTY: SearchResults = { term: "", livros: [], alunos: [], reservas: [], emprestimos: [] };

/** Busca simultânea em livros, alunos, reservas e empréstimos. RLS filtra o que cada papel pode ver. */
export async function globalSearch(supabase: SupabaseClient, q: string): Promise<SearchResults> {
  const term = sanitizeSearch(q);
  if (term.length < 2) return EMPTY;

  const [livros, alunos, reservas, emprestimos] = await Promise.all([
    supabase
      .from("v_livros_catalogo")
      .select("*")
      .eq("ativo", true)
      .or(`titulo.ilike.*${term}*,autor.ilike.*${term}*,isbn.ilike.*${term}*`)
      .order("titulo")
      .limit(8),
    supabase.from("v_alunos").select("*").or(`nome.ilike.*${term}*,matricula.ilike.*${term}*`).order("nome").limit(8),
    supabase
      .from("v_reservas")
      .select("*")
      .or(`livro_titulo.ilike.*${term}*,aluno_nome.ilike.*${term}*,codigo_exemplar.ilike.*${term}*`)
      .order("data_reserva", { ascending: false })
      .limit(8),
    supabase
      .from("v_emprestimos")
      .select("*")
      .or(`livro_titulo.ilike.*${term}*,aluno_nome.ilike.*${term}*,codigo_exemplar.ilike.*${term}*`)
      .order("data_retirada", { ascending: false })
      .limit(8),
  ]);

  return {
    term,
    livros: (livros.data ?? []) as LivroCatalogo[],
    alunos: (alunos.data ?? []) as VAluno[],
    reservas: (reservas.data ?? []) as VReserva[],
    emprestimos: (emprestimos.data ?? []) as VEmprestimo[],
  };
}
