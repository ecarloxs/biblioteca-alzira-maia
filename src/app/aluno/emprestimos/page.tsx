import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AlunoEmprestimoCard } from "@/components/loans/aluno-cards";
import type { VEmprestimo } from "@/types";

export const metadata = { title: "Meus empréstimos" };

export default async function Page() {
  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");
  const { data } = await supabase
    .from("v_emprestimos").select("*").in("status_efetivo", ["ativo", "atrasado"]).order("prazo_devolucao");
  const rows = (data ?? []) as VEmprestimo[];

  return (
    <>
      <PageHeader
        title="Meus empréstimos"
        description="A devolução é registrada pelo professor quando você entrega o livro."
      />
      {rows.length === 0 ? (
        <EmptyState icon={<BookOpen />} title="Você não está com nenhum livro no momento" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">{rows.map((e) => <AlunoEmprestimoCard key={e.id} e={e} />)}</div>
      )}
    </>
  );
}
