import Link from "next/link";
import { AlarmClock, BookCopy, BookOpen, Bookmark, GraduationCap, Library, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { EmprestimosPorMesChart, MaisEmprestadosChart, TurmasAtivasChart } from "@/components/admin/dashboard-charts";
import type { AdminDashboard } from "@/types";

export const metadata = { title: "Painel" };

export default async function AdminHome() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard");
  const stats = (error ? null : (data as AdminDashboard)) ?? null;

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

        <section className="rounded-lg border bg-card p-4 lg:col-span-2">
          <h2 className="mb-2 text-lg font-semibold">Livros mais emprestados</h2>
          {stats.mais_emprestados.length === 0 ? (
            <EmptyState title="Sem dados suficientes ainda" />
          ) : (
            <MaisEmprestadosChart data={stats.mais_emprestados} />
          )}
        </section>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Precisa de um relatório mais detalhado? Veja a página de{" "}
        <Link href="/admin/relatorios" className="font-semibold text-primary hover:underline">
          Relatórios
        </Link>
        .
      </p>
    </>
  );
}
