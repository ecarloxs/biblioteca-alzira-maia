import { AlarmClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EmprestimosTable } from "@/components/loans/emprestimos-table";
import type { VEmprestimo } from "@/types";

export const metadata = { title: "Atrasos" };

export default async function Page() {
  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");
  const [session, { data }] = await Promise.all([
    getSessionProfile(),
    supabase.from("v_emprestimos").select("*").eq("status_efetivo", "atrasado").order("prazo_devolucao"),
  ]);
  const rows = (data ?? []) as VEmprestimo[];

  return (
    <>
      <PageHeader title="Atrasos" description="Livros com devolução vencida." />
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
