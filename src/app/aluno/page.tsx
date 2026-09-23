import Link from "next/link";
import { AlarmClock, BookOpen, Bookmark, History, Library, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { AlunoEmprestimoCard, AlunoReservaCard } from "@/components/loans/aluno-cards";
import { diffDias, formatDate, hojeISO } from "@/lib/utils";
import type { VEmprestimo, VReserva } from "@/types";

export const metadata = { title: "Início" };

export default async function AlunoHome() {
  const session = await getSessionProfile();
  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");

  const [reservasRes, abertosRes, histRes] = await Promise.all([
    supabase.from("v_reservas").select("*").eq("status", "ativa").order("data_reserva", { ascending: false }),
    supabase.from("v_emprestimos").select("*").in("status_efetivo", ["ativo", "atrasado"]).order("prazo_devolucao"),
    supabase.from("v_emprestimos").select("id", { count: "exact", head: true }).in("status_efetivo", ["devolvido", "perdido"]),
  ]);

  const reservas = (reservasRes.data ?? []) as VReserva[];
  const abertos = (abertosRes.data ?? []) as VEmprestimo[];
  const totalHistorico = histRes.count ?? 0;
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
        title={`Olá, ${primeiroNome}!`}
        description="Veja suas reservas, empréstimos e prazos."
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

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Minhas reservas" value={reservas.length} icon={<Bookmark />} tone="warning" href="/aluno/reservas" />
        <StatCard label="Empréstimos ativos" value={abertos.length} icon={<BookOpen />} tone="info" href="/aluno/emprestimos" />
        <StatCard
          label="Próxima devolução"
          value={abertos[0] ? formatDate(abertos[0].prazo_devolucao) : "—"}
          icon={<AlarmClock />}
          tone={abertos[0] && diffDias(hoje, abertos[0].prazo_devolucao) < 0 ? "danger" : "neutral"}
          href="/aluno/emprestimos"
        />
        <StatCard label="Livros no histórico" value={totalHistorico} icon={<History />} href="/aluno/historico" />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Para devolver</h2>
        {abertos.length === 0 ? (
          <EmptyState icon={<BookOpen />} title="Você não está com nenhum livro" description="Reserve um livro na biblioteca e retire com seu professor." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">{abertos.map((e) => <AlunoEmprestimoCard key={e.id} e={e} />)}</div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Reservados para retirar</h2>
        {reservas.length === 0 ? (
          <EmptyState icon={<Bookmark />} title="Nenhuma reserva ativa" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">{reservas.map((r) => <AlunoReservaCard key={r.id} r={r} />)}</div>
        )}
      </section>
    </>
  );
}
