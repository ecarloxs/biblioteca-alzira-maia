import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { AlunoEmprestimoCard } from "@/components/loans/aluno-cards";
import { ReviewForm } from "@/components/reviews/review-form";
import { first } from "@/lib/utils";
import type { SearchParams, VEmprestimo } from "@/types";

export const metadata = { title: "Histórico" };
const SIZE = 10;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const supabase = await createClient();
  const session = await getSessionProfile();

  const [{ data, count }, { data: aluno }] = await Promise.all([
    supabase
      .from("v_emprestimos")
      .select("*", { count: "exact" })
      .in("status_efetivo", ["devolvido", "perdido"])
      .order("data_retirada", { ascending: false })
      .range((page - 1) * SIZE, page * SIZE - 1),
    session ? supabase.from("alunos").select("id").eq("profile_id", session.user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const rows = (data ?? []) as VEmprestimo[];

  const { data: avaliadosData } = aluno
    ? await supabase.from("avaliacoes").select("emprestimo_id").eq("aluno_id", aluno.id)
    : { data: [] };
  const jaAvaliados = new Set((avaliadosData ?? []).map((a: { emprestimo_id: string }) => a.emprestimo_id));

  return (
    <>
      <PageHeader title="Histórico" description="Todos os livros que você já leu e devolveu. Avalie para ajudar os colegas!" />
      {rows.length === 0 ? (
        <EmptyState icon={<History />} title="Seu histórico ainda está vazio" description="Os livros devolvidos aparecerão aqui." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((e) => (
            <AlunoEmprestimoCard
              key={e.id}
              e={e}
              actions={
                e.status_efetivo === "devolvido" && !jaAvaliados.has(e.id) ? (
                  <ReviewForm emprestimoId={e.id} livroTitulo={e.livro_titulo} />
                ) : e.status_efetivo === "devolvido" ? (
                  <p className="text-xs font-medium text-success">✓ Você já avaliou este livro</p>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
      <Pagination page={page} pageSize={SIZE} total={count ?? 0} basePath="/aluno/historico" params={{}} />
    </>
  );
}
