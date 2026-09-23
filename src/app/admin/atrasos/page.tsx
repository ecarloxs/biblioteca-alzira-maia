import { AlarmClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { getAllTurmas } from "@/lib/data/turmas";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { EmprestimosTable } from "@/components/loans/emprestimos-table";
import { first } from "@/lib/utils";
import type { SearchParams, VEmprestimo } from "@/types";

export const metadata = { title: "Atrasos" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const turma = first(sp.turma);

  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");

  const [session, turmas] = await Promise.all([getSessionProfile(), getAllTurmas(supabase, { includeInactive: true })]);

  let query = supabase.from("v_emprestimos").select("*").eq("status_efetivo", "atrasado").order("prazo_devolucao");
  if (turma) query = query.eq("turma_id", turma);
  const { data } = await query;
  const rows = (data ?? []) as VEmprestimo[];

  return (
    <>
      <PageHeader title="Atrasos" description="Livros com devolução vencida em qualquer turma." />
      <FilterBar
        fields={[{ name: "turma", label: "Turma", type: "select", allLabel: "Todas as turmas", options: turmas.map((t) => ({ value: t.id, label: t.nome })) }]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<AlarmClock />} title="Nenhum atraso no momento" description="Muito bem! Todos os empréstimos estão em dia." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <EmprestimosTable rows={rows} canAct responsavelNome={session?.profile.nome ?? ""} />
        </div>
      )}
    </>
  );
}
