import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllTurmas } from "@/lib/data/turmas";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { EmprestimosTable } from "@/components/loans/emprestimos-table";
import { first } from "@/lib/utils";
import { TABLE_PAGE_SIZE } from "@/lib/constants";
import type { SearchParams, VEmprestimo } from "@/types";

export const metadata = { title: "Histórico" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const turma = first(sp.turma);
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();
  const turmas = await getAllTurmas(supabase, { includeInactive: true });

  let query = supabase
    .from("v_emprestimos")
    .select("*", { count: "exact" })
    .in("status_efetivo", ["devolvido", "perdido"])
    .order("data_devolucao", { ascending: false });
  if (turma) query = query.eq("turma_id", turma);
  const { data, count } = await query.range((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE - 1);
  const rows = (data ?? []) as VEmprestimo[];

  return (
    <>
      <PageHeader title="Histórico" description="Todos os empréstimos já devolvidos ou marcados como perdidos." />
      <FilterBar
        fields={[{ name: "turma", label: "Turma", type: "select", allLabel: "Todas as turmas", options: turmas.map((t) => ({ value: t.id, label: t.nome })) }]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<History />} title="Nenhum registro no histórico" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <EmprestimosTable rows={rows} canAct={false} responsavelNome="" showDevolucao />
        </div>
      )}
      <Pagination page={page} pageSize={TABLE_PAGE_SIZE} total={count ?? 0} basePath="/admin/historico" params={{ turma }} />
    </>
  );
}
