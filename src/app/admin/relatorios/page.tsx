import { Download, FileBarChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllTurmas } from "@/lib/data/turmas";
import { buildRelatorioQuery } from "@/lib/data/relatorios";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { EmprestimosTable } from "@/components/loans/emprestimos-table";
import { first } from "@/lib/utils";
import { TABLE_PAGE_SIZE } from "@/lib/constants";
import type { SearchParams, VEmprestimo } from "@/types";

export const metadata = { title: "Relatórios" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = first(sp.q);
  const turma = first(sp.turma);
  const status = first(sp.status);
  const dataInicio = first(sp.data_inicio);
  const dataFim = first(sp.data_fim);
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();
  const turmas = await getAllTurmas(supabase, { includeInactive: true });

  const filtros = { q, turma, status, dataInicio, dataFim };
  const { data, count } = await buildRelatorioQuery(supabase, filtros, { count: "exact" }).range(
    (page - 1) * TABLE_PAGE_SIZE,
    page * TABLE_PAGE_SIZE - 1
  );
  const rows = (data ?? []) as VEmprestimo[];

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (turma) exportParams.set("turma", turma);
  if (status) exportParams.set("status", status);
  if (dataInicio) exportParams.set("data_inicio", dataInicio);
  if (dataFim) exportParams.set("data_fim", dataFim);

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Filtre empréstimos por período, turma, aluno, professor, livro ou status e exporte para CSV/Excel."
        actions={
          <Button asChild variant="outline">
            <a href={`/admin/relatorios/exportar?${exportParams.toString()}`}>
              <Download /> Baixar CSV
            </a>
          </Button>
        }
      />
      <FilterBar
        fields={[
          { name: "q", label: "Aluno, livro ou professor", type: "search", placeholder: "Buscar..." },
          { name: "turma", label: "Turma", type: "select", allLabel: "Todas as turmas", options: turmas.map((t) => ({ value: t.id, label: t.nome })) },
          {
            name: "status",
            label: "Status",
            type: "select",
            allLabel: "Todos",
            options: [
              { value: "ativo", label: "Ativo" },
              { value: "atrasado", label: "Atrasado" },
              { value: "devolvido", label: "Devolvido" },
              { value: "perdido", label: "Perdido" },
            ],
          },
          { name: "data_inicio", label: "De", type: "date" },
          { name: "data_fim", label: "Até", type: "date" },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<FileBarChart />} title="Nenhum resultado para os filtros aplicados" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <EmprestimosTable rows={rows} canAct={false} responsavelNome="" showDevolucao />
        </div>
      )}
      <Pagination page={page} pageSize={TABLE_PAGE_SIZE} total={count ?? 0} basePath="/admin/relatorios" params={{ q, turma, status, data_inicio: dataInicio, data_fim: dataFim }} />
    </>
  );
}
