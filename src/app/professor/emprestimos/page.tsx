import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { getMinhasTurmas } from "@/lib/data/professor";
import { getPrazoPadraoISO } from "@/lib/data/config";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { EmprestimosTable } from "@/components/loans/emprestimos-table";
import { NewLoanDialog, type AlunoOption, type ExemplarOption } from "@/components/loans/new-loan-dialog";
import { first } from "@/lib/utils";
import type { SearchParams, VAluno, VEmprestimo } from "@/types";

export const metadata = { title: "Empréstimos" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = first(sp.status);
  const turma = first(sp.turma);

  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");

  const [session, turmas, prazoPadrao, alunosRes, exemplaresRes] = await Promise.all([
    getSessionProfile(),
    getMinhasTurmas(supabase),
    getPrazoPadraoISO(supabase),
    supabase.from("v_alunos").select("*").eq("ativo", true).order("nome"),
    supabase.from("exemplares").select("id, codigo_exemplar, livros(titulo)").eq("status", "disponivel"),
  ]);

  let query = supabase.from("v_emprestimos").select("*").order("data_retirada", { ascending: false }).limit(200);
  if (status) query = query.eq("status_efetivo", status);
  else query = query.in("status_efetivo", ["ativo", "atrasado"]);
  if (turma) query = query.eq("turma_id", turma);
  const { data } = await query;
  const rows = (data ?? []) as VEmprestimo[];

  const alunos: AlunoOption[] = ((alunosRes.data ?? []) as VAluno[]).map((a) => ({
    id: a.id,
    nome: a.nome,
    turma_nome: a.turma_nome,
    matricula: a.matricula,
  }));
  const exemplares: ExemplarOption[] = ((exemplaresRes.data ?? []) as unknown as {
    id: string;
    codigo_exemplar: string;
    livros: { titulo: string } | null;
  }[]).map((x) => ({ id: x.id, codigo_exemplar: x.codigo_exemplar, livro_titulo: x.livros?.titulo ?? "—" }));

  return (
    <>
      <PageHeader
        title="Empréstimos"
        description="Registre a retirada de um livro sem reserva prévia, ou gerencie os empréstimos ativos."
        actions={<NewLoanDialog alunos={alunos} exemplares={exemplares} defaultPrazo={prazoPadrao} />}
      />
      <FilterBar
        fields={[
          {
            name: "status",
            label: "Status",
            type: "select",
            allLabel: "Ativos e atrasados",
            options: [
              { value: "devolvido", label: "Devolvidos" },
              { value: "perdido", label: "Perdidos" },
            ],
          },
          {
            name: "turma",
            label: "Turma",
            type: "select",
            allLabel: "Todas as minhas turmas",
            options: turmas.map((t) => ({ value: t.id, label: t.nome })),
          },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<BookOpen />} title="Nenhum empréstimo encontrado" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <EmprestimosTable rows={rows} canAct showDevolucao responsavelNome={session?.profile.nome ?? ""} />
        </div>
      )}
    </>
  );
}
