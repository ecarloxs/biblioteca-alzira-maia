import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AlunoReservaCard } from "@/components/loans/aluno-cards";
import type { VReserva } from "@/types";

export const metadata = { title: "Minhas reservas" };

export default async function Page() {
  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");
  const { data } = await supabase.from("v_reservas").select("*").order("data_reserva", { ascending: false }).limit(50);
  const rows = (data ?? []) as VReserva[];
  const ativas = rows.filter((r) => r.status === "ativa");
  const anteriores = rows.filter((r) => r.status !== "ativa");

  return (
    <>
      <PageHeader title="Minhas reservas" description="Você pode cancelar uma reserva enquanto o livro não tiver sido retirado." />
      {ativas.length === 0 ? (
        <EmptyState icon={<Bookmark />} title="Nenhuma reserva ativa" description="Escolha um livro na biblioteca para reservar." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">{ativas.map((r) => <AlunoReservaCard key={r.id} r={r} />)}</div>
      )}
      {anteriores.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Reservas anteriores</h2>
          <div className="grid gap-3 lg:grid-cols-2">{anteriores.map((r) => <AlunoReservaCard key={r.id} r={r} />)}</div>
        </section>
      )}
    </>
  );
}
