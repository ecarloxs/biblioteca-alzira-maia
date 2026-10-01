import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllTurmas } from "@/lib/data/turmas";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { first } from "@/lib/utils";
import type { RankingLinha, SearchParams } from "@/types";

export const metadata = { title: "Ranking de leitura" };
const MEDALHAS = ["🥇", "🥈", "🥉"];

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const turma = first(sp.turma);
  const periodo = first(sp.periodo);

  const supabase = await createClient();
  const turmas = await getAllTurmas(supabase, { includeInactive: true });
  const mesFiltro = periodo === "mensal" ? new Date().toISOString().slice(0, 10) : null;
  const { data } = await supabase.rpc("ranking_leitura", { p_turma_id: turma || null, p_mes: mesFiltro });
  const ranking = (data ?? []) as RankingLinha[];

  return (
    <>
      <PageHeader title="Ranking de leitura" description="Alunos com mais livros e páginas lidas." />
      <FilterBar
        fields={[
          { name: "periodo", label: "Período", type: "select", allLabel: "Ranking geral", options: [{ value: "mensal", label: "Este mês" }] },
          { name: "turma", label: "Turma", type: "select", allLabel: "Todas as turmas", options: turmas.map((t) => ({ value: t.id, label: t.nome })) },
        ]}
      />
      {ranking.length === 0 ? (
        <EmptyState icon={<Trophy />} title="Ainda não há leituras registradas" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>#</TH><TH>Aluno</TH><TH>Turma</TH><TH>Livros lidos</TH><TH>Páginas lidas</TH>
              </TR>
            </THead>
            <TBody>
              {ranking.map((r, i) => (
                <TR key={r.aluno_id}>
                  <TD>{MEDALHAS[i] ?? i + 1}</TD>
                  <TD className="font-medium">{r.aluno_nome}</TD>
                  <TD>{r.turma_nome ?? "—"}</TD>
                  <TD>{r.livros_lidos}</TD>
                  <TD>{r.paginas_lidas}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}
