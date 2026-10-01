import { Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatDate } from "@/lib/utils";
import type { AlunoConquista, Conquista, EstatisticasAluno } from "@/types";

export const metadata = { title: "Minhas conquistas" };

function progresso(c: Conquista, estatisticas: EstatisticasAluno | null): number {
  if (!estatisticas) return 0;
  const atual =
    c.criterio_tipo === "livros_lidos"
      ? estatisticas.livros_lidos
      : c.criterio_tipo === "paginas_lidas"
        ? estatisticas.paginas_lidas
        : estatisticas.avaliacoes_feitas;
  return Math.min(100, Math.round((atual / c.criterio_valor) * 100));
}

export default async function Page() {
  const session = await getSessionProfile();
  const supabase = await createClient();

  const { data: aluno } = await supabase.from("alunos").select("id").eq("profile_id", session!.user.id).maybeSingle();

  const [{ data: todasConquistas }, { data: obtidasData }, { data: estatisticasData }] = await Promise.all([
    supabase.from("conquistas").select("*").eq("ativo", true).order("ordem"),
    aluno ? supabase.from("aluno_conquistas").select("*, conquistas(*)").eq("aluno_id", aluno.id) : Promise.resolve({ data: [] }),
    aluno ? supabase.rpc("estatisticas_aluno", { p_aluno_id: aluno.id }) : Promise.resolve({ data: null }),
  ]);

  const conquistas = (todasConquistas ?? []) as Conquista[];
  const obtidas = (obtidasData ?? []) as AlunoConquista[];
  const obtidasPorId = new Map(obtidas.map((o) => [o.conquista_id, o]));
  const estatisticas = (Array.isArray(estatisticasData) ? estatisticasData[0] : estatisticasData) as EstatisticasAluno | null;

  return (
    <>
      <PageHeader
        title="🏆 Minhas conquistas"
        description={`Você já desbloqueou ${obtidas.length} de ${conquistas.length} conquistas.`}
      />
      {conquistas.length === 0 ? (
        <EmptyState icon={<Award />} title="Nenhuma conquista cadastrada ainda" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {conquistas.map((c) => {
            const obtida = obtidasPorId.get(c.id);
            const pct = progresso(c, estatisticas);
            return (
              <div
                key={c.id}
                className={cn(
                  "flex flex-col items-center rounded-xl border p-4 text-center transition-colors",
                  obtida ? "border-accent bg-accent/10" : "bg-card opacity-80"
                )}
              >
                <span className={cn("text-4xl", !obtida && "grayscale")}>{c.icone}</span>
                <p className="mt-2 text-sm font-semibold leading-tight">{c.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.descricao}</p>
                {obtida ? (
                  <p className="mt-2 text-xs font-semibold text-accent">Conquistado em {formatDate(obtida.conquistada_em)}</p>
                ) : (
                  <div className="mt-3 w-full">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{pct}%</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
