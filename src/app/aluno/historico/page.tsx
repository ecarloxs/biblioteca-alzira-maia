import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { AlunoEmprestimoCard } from "@/components/loans/aluno-cards";
import { first } from "@/lib/utils";
import type { SearchParams, VEmprestimo } from "@/types";

export const metadata = { title: "Histórico" };
const SIZE = 10;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("v_emprestimos")
    .select("*", { count: "exact" })
    .in("status_efetivo", ["devolvido", "perdido"])
    .order("data_retirada", { ascending: false })
    .range((page - 1) * SIZE, page * SIZE - 1);
  const rows = (data ?? []) as VEmprestimo[];

  return (
    <>
      <PageHeader title="Histórico" description="Todos os livros que você já leu e devolveu." />
      {rows.length === 0 ? (
        <EmptyState icon={<History />} title="Seu histórico ainda está vazio" description="Os livros devolvidos aparecerão aqui." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">{rows.map((e) => <AlunoEmprestimoCard key={e.id} e={e} />)}</div>
      )}
      <Pagination page={page} pageSize={SIZE} total={count ?? 0} basePath="/aluno/historico" params={{}} />
    </>
  );
}
