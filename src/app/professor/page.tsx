import Link from "next/link";
import { AlarmClock, BookOpen, Bookmark, School, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { getMinhasTurmas } from "@/lib/data/professor";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CONDICAO_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { VAluno, VEmprestimo, VReserva } from "@/types";

export const metadata = { title: "Início" };

export default async function ProfessorHome() {
  const session = await getSessionProfile();
  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");

  const turmas = await getMinhasTurmas(supabase);

  const [alunosRes, reservasRes, emprestimosRes, devolucoesRes] = await Promise.all([
    supabase.from("v_alunos").select("*").eq("ativo", true),
    supabase.from("v_reservas").select("*").eq("status", "ativa"),
    supabase.from("v_emprestimos").select("*").in("status_efetivo", ["ativo", "atrasado"]),
    supabase
      .from("v_emprestimos")
      .select("*")
      .not("data_devolucao", "is", null)
      .order("data_devolucao", { ascending: false })
      .limit(5),
  ]);

  const alunos = (alunosRes.data ?? []) as VAluno[];
  const reservas = (reservasRes.data ?? []) as VReserva[];
  const emprestimos = (emprestimosRes.data ?? []) as VEmprestimo[];
  const devolucoesRecentes = (devolucoesRes.data ?? []) as VEmprestimo[];
  const atrasados = emprestimos.filter((e) => e.status_efetivo === "atrasado");

  const porTurma = turmas.map((t) => ({
    turma: t,
    alunos: alunos.filter((a) => a.turma_id === t.id).length,
    emprestimos: emprestimos.filter((e) => e.turma_id === t.id).length,
    reservas: reservas.filter((r) => r.turma_id === t.id).length,
  }));

  return (
    <>
      <PageHeader
        title={`Olá, ${session?.profile.nome.split(" ")[0] ?? ""}!`}
        description="Acompanhe reservas, empréstimos e atrasos das suas turmas."
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Alunos nas minhas turmas" value={alunos.length} icon={<Users />} />
        <StatCard label="Reservas pendentes" value={reservas.length} icon={<Bookmark />} tone="warning" href="/professor/reservas" />
        <StatCard label="Empréstimos ativos" value={emprestimos.length} icon={<BookOpen />} tone="info" href="/professor/emprestimos" />
        <StatCard label="Atrasados" value={atrasados.length} icon={<AlarmClock />} tone={atrasados.length > 0 ? "danger" : "neutral"} href="/professor/atrasos" />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Minhas turmas</h2>
        {porTurma.length === 0 ? (
          <EmptyState icon={<School />} title="Nenhuma turma vinculada" description="Peça à gestão para vincular você a uma turma." />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Turma</TH>
                <TH>Alunos ativos</TH>
                <TH>Reservas pendentes</TH>
                <TH>Empréstimos ativos</TH>
              </TR>
            </THead>
            <TBody>
              {porTurma.map(({ turma, alunos: n, reservas: r, emprestimos: e }) => (
                <TR key={turma.id}>
                  <TD className="font-medium">{turma.nome}</TD>
                  <TD>{n}</TD>
                  <TD>
                    <Link href={`/professor/reservas?turma=${turma.id}`} className="text-primary hover:underline">
                      {r}
                    </Link>
                  </TD>
                  <TD>
                    <Link href={`/professor/emprestimos?turma=${turma.id}`} className="text-primary hover:underline">
                      {e}
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Devoluções recentes</h2>
        {devolucoesRecentes.length === 0 ? (
          <EmptyState icon={<BookOpen />} title="Nenhuma devolução registrada ainda" />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Aluno</TH>
                <TH>Livro</TH>
                <TH>Devolvido em</TH>
                <TH>Condição</TH>
              </TR>
            </THead>
            <TBody>
              {devolucoesRecentes.map((e) => (
                <TR key={e.id}>
                  <TD>{e.aluno_nome ?? "—"}</TD>
                  <TD className="max-w-[16rem] font-medium">{e.livro_titulo}</TD>
                  <TD className="whitespace-nowrap">{formatDateTime(e.data_devolucao)}</TD>
                  <TD>{CONDICAO_LABEL[e.condicao_devolucao ?? ""] ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>
    </>
  );
}
