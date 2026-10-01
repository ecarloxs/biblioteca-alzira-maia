import Link from "next/link";
import { AlarmClock, BookCopy, BookOpen, Bookmark, BookText, GraduationCap, Library, Star, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  EmprestimosPorMesChart, MaisEmprestadosChart, MaisAvaliadosChart, TurmasAtivasChart,
} from "@/components/admin/dashboard-charts";
import type { AdminDashboard, LivroCatalogo } from "@/types";

export const metadata = { title: "Painel" };

export default async function AdminHome() {
  const supabase = await createClient();
  const [{ data, error }, rankingRes, maisAvaliadosRes] = await Promise.all([
    supabase.rpc("admin_dashboard"),
    supabase.rpc("ranking_leitura"),
    supabase
      .from("v_livros_catalogo")
      .select("*")
      .eq("ativo", true)
      .gt("total_avaliacoes", 0)
      .order("media_avaliacoes", { ascending: false })
      .order("total_avaliacoes", { ascending: false })
      .limit(5),
  ]);
  const stats = (error ? null : (data as AdminDashboard)) ?? null;
  const paginasLidas = ((rankingRes.data ?? []) as { paginas_lidas: number }[]).reduce((acc, r) => acc + r.paginas_lidas, 0);
  const maisAvaliados = (maisAvaliadosRes.data ?? []) as LivroCatalogo[];
  const mediaGeral =
    maisAvaliados.length > 0
      ? maisAvaliados.reduce((acc, l) => acc + l.media_avaliacoes * l.total_avaliacoes, 0) /
        Math.max(1, maisAvaliados.reduce((acc, l) => acc + l.total_avaliacoes, 0))
      : 0;

  if (!stats) {
    return (
      <>
        <PageHeader title="Painel" />
        <EmptyState title="Não foi possível carregar o painel" description="Tente novamente em instantes." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Painel" description="Visão geral da biblioteca escolar." />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Livros cadastrados" value={stats.total_livros} icon={<Library />} href="/admin/livros" />
        <StatCard label="Exemplares" value={stats.total_exemplares} icon={<BookCopy />} href="/admin/livros" />
        <StatCard label="Disponíveis" value={stats.disponiveis} icon={<BookOpen />} tone="success" href="/admin/livros" />
        <StatCard label="Emprestados" value={stats.emprestados} icon={<BookOpen />} tone="info" href="/admin/emprestimos" />
        <StatCard label="Reservados" value={stats.reservados} icon={<Bookmark />} tone="warning" href="/admin/reservas" />
        <StatCard label="Atrasados" value={stats.atrasados} icon={<AlarmClock />} tone={stats.atrasados > 0 ? "danger" : "neutral"} href="/admin/atrasos" />
        <StatCard label="Alunos ativos" value={stats.alunos} icon={<Users />} href="/admin/alunos" />
        <StatCard label="Professores ativos" value={stats.professores} icon={<GraduationCap />} href="/admin/professores" />
        <StatCard label="Páginas lidas (total)" value={paginasLidas} icon={<BookText />} tone="success" href="/admin/ranking" />
        <StatCard label="Média das avaliações" value={mediaGeral > 0 ? mediaGeral.toFixed(1) : "—"} icon={<Star />} tone="warning" href="/admin/avaliacoes" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-lg font-semibold">Empréstimos e devoluções (6 meses)</h2>
          <EmprestimosPorMesChart data={stats.por_mes} />
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-lg font-semibold">Turmas mais ativas</h2>
          {stats.turmas_mais_ativas.length === 0 ? (
            <EmptyState title="Sem dados suficientes ainda" />
          ) : (
            <TurmasAtivasChart data={stats.turmas_mais_ativas} />
          )}
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-lg font-semibold">Livros mais emprestados</h2>
          {stats.mais_emprestados.length === 0 ? (
            <EmptyState title="Sem dados suficientes ainda" />
          ) : (
            <MaisEmprestadosChart data={stats.mais_emprestados} />
          )}
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-lg font-semibold">Livros mais bem avaliados</h2>
          {maisAvaliados.length === 0 ? (
            <EmptyState title="Sem avaliações suficientes ainda" />
          ) : (
            <MaisAvaliadosChart data={maisAvaliados.map((l) => ({ titulo: l.titulo, nota: l.media_avaliacoes }))} />
          )}
        </section>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Veja também o{" "}
        <Link href="/admin/ranking" className="font-semibold text-primary hover:underline">ranking de leitura</Link>
        {" "}e a página de{" "}
        <Link href="/admin/relatorios" className="font-semibold text-primary hover:underline">relatórios</Link>
        {" "}para filtros por período, turma e livro.
      </p>
    </>
  );
}
