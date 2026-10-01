import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { getAllTurmas } from "@/lib/data/turmas";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, first } from "@/lib/utils";
import type { RankingLinha, SearchParams } from "@/types";

export const metadata = { title: "Ranking de leitura" };

const MEDALHAS = ["🥇", "🥈", "🥉"];

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const turma = first(sp.turma);
  const periodo = first(sp.periodo);

  const supabase = await createClient();
  const [session, turmas] = await Promise.all([getSessionProfile(), getAllTurmas(supabase, { includeInactive: true })]);
  const { data: aluno } = await supabase.from("alunos").select("id").eq("profile_id", session!.user.id).maybeSingle();

  const mesFiltro = periodo === "mensal" ? new Date().toISOString().slice(0, 10) : null;
  const { data } = await supabase.rpc("ranking_leitura", { p_turma_id: turma || null, p_mes: mesFiltro });
  const ranking = (data ?? []) as RankingLinha[];

  return (
    <>
      <PageHeader title="🏆 Ranking de leitura" description="Veja quem mais leu livros e páginas na escola." />
      <FilterBar
        fields={[
          {
            name: "periodo",
            label: "Período",
            type: "select",
            allLabel: "Ranking geral",
            options: [{ value: "mensal", label: "Este mês" }],
          },
          { name: "turma", label: "Turma", type: "select", allLabel: "Todas as turmas", options: turmas.map((t) => ({ value: t.id, label: t.nome })) },
        ]}
      />
      {ranking.length === 0 ? (
        <EmptyState icon={<Trophy />} title="Ainda não há leituras registradas" description="Assim que os primeiros livros forem devolvidos, o ranking aparece aqui." />
      ) : (
        <ol className="space-y-2">
          {ranking.map((r, i) => (
            <li
              key={r.aluno_id}
              className={cn(
                "flex items-center gap-4 rounded-lg border bg-card p-4",
                aluno?.id === r.aluno_id && "border-accent bg-accent/10"
              )}
            >
              <span className="w-8 shrink-0 text-center text-xl">{MEDALHAS[i] ?? `${i + 1}º`}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.aluno_nome}{aluno?.id === r.aluno_id && " (você)"}</p>
                <p className="text-sm text-muted-foreground">{r.turma_nome ?? "Sem turma"}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-display text-lg font-bold">{r.livros_lidos}</p>
                <p className="text-xs text-muted-foreground">livros</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-display text-lg font-bold">{r.paginas_lidas}</p>
                <p className="text-xs text-muted-foreground">páginas</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
