import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StarRating } from "@/components/shared/star-rating";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Avaliações" };

interface Row {
  id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
  livros: { titulo: string } | null;
  alunos: { profiles: { nome: string } | null; turmas: { nome: string } | null } | null;
}

export default async function Page() {
  const supabase = await createClient();
  // "alunos!inner" garante que só voltam avaliações de alunos das turmas que
  // este professor acompanha — a RLS de "alunos" filtra o resto silenciosamente.
  const { data } = await supabase
    .from("avaliacoes")
    .select("id, nota, comentario, created_at, livros(titulo), alunos!inner(profiles(nome), turmas(nome))")
    .eq("removida", false)
    .order("created_at", { ascending: false })
    .limit(100);
  const avaliacoes = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Avaliações" description="O que os alunos das suas turmas estão achando dos livros." />
      {avaliacoes.length === 0 ? (
        <EmptyState icon={<Star />} title="Nenhuma avaliação ainda" description="Assim que os alunos avaliarem livros devolvidos, elas aparecem aqui." />
      ) : (
        <ul className="space-y-3">
          {avaliacoes.map((a) => (
            <li key={a.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{a.livros?.titulo ?? "—"}</p>
                <StarRating value={a.nota} size="sm" />
              </div>
              {a.comentario && <p className="mt-2 text-sm text-foreground/85">"{a.comentario}"</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {a.alunos?.profiles?.nome ?? "Aluno"} · {a.alunos?.turmas?.nome ?? "—"} · {formatDate(a.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
