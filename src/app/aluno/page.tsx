import Link from "next/link";
import {
  AlarmClock, Award, BookOpen, Bookmark, History, Library, Sparkles, Trophy, TriangleAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { BookCard } from "@/components/books/book-card";
import { ReviewsList } from "@/components/reviews/reviews-list";
import { AlunoEmprestimoCard, AlunoReservaCard } from "@/components/loans/aluno-cards";
import { diffDias, formatDate, hojeISO } from "@/lib/utils";
import type { AvaliacaoPublica, EstatisticasAluno, LivroCatalogo, RankingLinha, VEmprestimo, VReserva } from "@/types";

export const metadata = { title: "Início" };

export default async function AlunoHome() {
  const session = await getSessionProfile();
  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");

  const { data: aluno } = session
    ? await supabase.from("alunos").select("id").eq("profile_id", session.user.id).maybeSingle()
    : { data: null };

  const [reservasRes, abertosRes, histRes, estatisticasRes, rankingRes, disponiveisRes, popularesRes, avaliacoesRes] =
    await Promise.all([
      supabase.from("v_reservas").select("*").eq("status", "ativa").order("data_reserva", { ascending: false }),
      supabase.from("v_emprestimos").select("*").in("status_efetivo", ["ativo", "atrasado"]).order("prazo_devolucao"),
      supabase.from("v_emprestimos").select("id", { count: "exact", head: true }).in("status_efetivo", ["devolvido", "perdido"]),
      aluno ? supabase.rpc("estatisticas_aluno", { p_aluno_id: aluno.id }) : Promise.resolve({ data: null }),
      supabase.rpc("ranking_leitura"),
      supabase.from("v_livros_catalogo").select("*").eq("ativo", true).gt("disponiveis", 0).order("created_at", { ascending: false }).limit(4),
      supabase.from("v_livros_catalogo").select("*").eq("ativo", true).order("total_emprestimos", { ascending: false }).limit(4),
      supabase.rpc("avaliacoes_publicas"),
    ]);

  const reservas = (reservasRes.data ?? []) as VReserva[];
  const abertos = (abertosRes.data ?? []) as VEmprestimo[];
  const totalHistorico = histRes.count ?? 0;
  const estatisticas = (Array.isArray(estatisticasRes.data) ? estatisticasRes.data[0] : estatisticasRes.data) as EstatisticasAluno | null;
  const ranking = (rankingRes.data ?? []) as RankingLinha[];
  const minhaPosicao = aluno ? ranking.findIndex((r) => r.aluno_id === aluno.id) + 1 : 0;
  const disponiveis = (disponiveisRes.data ?? []) as LivroCatalogo[];
  const populares = (popularesRes.data ?? []) as LivroCatalogo[];
  const avaliacoes = ((avaliacoesRes.data ?? []) as AvaliacaoPublica[]).slice(0, 3);

  const primeiroNome = session?.profile.nome.split(" ")[0] ?? "";
  const hoje = hojeISO();

  const alertas = abertos
    .map((e) => {
      const d = diffDias(hoje, e.prazo_devolucao);
      if (d < 0) return { tone: "danger" as const, text: `Seu livro “${e.livro_titulo}” está atrasado há ${-d} ${-d === 1 ? "dia" : "dias"}.` };
      if (d === 0) return { tone: "warning" as const, text: `Seu livro “${e.livro_titulo}” deve ser devolvido hoje.` };
      if (d === 1) return { tone: "warning" as const, text: `Seu livro “${e.livro_titulo}” deve ser devolvido amanhã.` };
      return null;
    })
    .filter((a): a is { tone: "danger" | "warning"; text: string } => a !== null);

  return (
    <>
      <PageHeader
        title={`Olá, ${primeiroNome}! 👋`}
        description="Veja suas leituras, prazos e sua posição no ranking."
        actions={
          <Button asChild variant="accent">
            <Link href="/aluno/biblioteca"><Library /> Explorar a biblioteca</Link>
          </Button>
        }
      />

      {alertas.length > 0 && (
        <div className="mb-6 space-y-2" role="status">
          {alertas.map((a, i) => (
            <p
              key={i}
              className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${a.tone === "danger" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {a.text}
            </p>
          ))}
        </div>
      )}

      {/* Hero de estatísticas de leitura — a "cara" do app do aluno */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="📚 Livros lidos" value={estatisticas?.livros_lidos ?? 0} icon={<BookOpen />} tone="success" href="/aluno/historico" />
        <StatCard label="📄 Páginas lidas" value={estatisticas?.paginas_lidas ?? 0} icon={<Sparkles />} tone="info" href="/aluno/historico" />
        <StatCard
          label="🏆 Minha posição no ranking"
          value={minhaPosicao > 0 ? `${minhaPosicao}º lugar` : "—"}
          icon={<Trophy />}
          tone="warning"
          href="/aluno/ranking"
        />
        <StatCard label="Empréstimos ativos" value={abertos.length} icon={<Bookmark />} href="/aluno/emprestimos" />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">📖 Continuar lendo</h2>
        {abertos.length === 0 ? (
          <EmptyState icon={<BookOpen />} title="Você não está com nenhum livro" description="Reserve um livro na biblioteca e retire com seu professor." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">{abertos.map((e) => <AlunoEmprestimoCard key={e.id} e={e} />)}</div>
        )}
      </section>

      {reservas.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">🔖 Reservados para retirar</h2>
          <div className="grid gap-3 lg:grid-cols-2">{reservas.map((r) => <AlunoReservaCard key={r.id} r={r} />)}</div>
        </section>
      )}

      {disponiveis.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">✨ Novidades disponíveis</h2>
            <Link href="/aluno/biblioteca?ordem=recentes" className="text-sm font-semibold text-primary hover:underline">Ver tudo</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {disponiveis.map((l) => <BookCard key={l.id} livro={l} href={`/aluno/biblioteca/${l.id}`} />)}
          </div>
        </section>
      )}

      {populares.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">🔥 Livros populares</h2>
            <Link href="/aluno/biblioteca?ordem=populares" className="text-sm font-semibold text-primary hover:underline">Ver tudo</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {populares.map((l) => <BookCard key={l.id} livro={l} href={`/aluno/biblioteca/${l.id}`} />)}
          </div>
        </section>
      )}

      {avaliacoes.length > 0 && (
        <section className="mb-8 max-w-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">💬 Últimas avaliações</h2>
            <Link href="/aluno/conquistas" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              <Award className="size-4" /> Minhas conquistas
            </Link>
          </div>
          <ReviewsList avaliacoes={avaliacoes} />
        </section>
      )}

      <p className="text-sm text-muted-foreground">
        Total no histórico: <Link href="/aluno/historico" className="font-semibold text-primary hover:underline">{totalHistorico} livro(s)</Link>
      </p>
    </>
  );
}
