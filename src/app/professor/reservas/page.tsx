import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { getMinhasTurmas } from "@/lib/data/professor";
import { getPrazoPadraoISO } from "@/lib/data/config";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ReservasTable } from "@/components/reservations/reservas-table";
import { first } from "@/lib/utils";
import type { SearchParams, VReserva } from "@/types";

export const metadata = { title: "Reservas" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = first(sp.status);
  const turma = first(sp.turma);

  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");

  const [session, turmas, prazoPadrao] = await Promise.all([
    getSessionProfile(),
    getMinhasTurmas(supabase),
    getPrazoPadraoISO(supabase),
  ]);

  let query = supabase.from("v_reservas").select("*").order("data_reserva", { ascending: false }).limit(200);
  if (status) query = query.eq("status", status);
  else query = query.eq("status", "ativa");
  if (turma) query = query.eq("turma_id", turma);
  const { data } = await query;
  const rows = (data ?? []) as VReserva[];

  return (
    <>
      <PageHeader title="Reservas" description="Confirme a retirada quando o aluno pegar o livro." />
      <FilterBar
        fields={[
          {
            name: "status",
            label: "Status",
            type: "select",
            allLabel: "Ativas",
            options: [
              { value: "atendida", label: "Atendidas" },
              { value: "cancelada", label: "Canceladas" },
              { value: "expirada", label: "Expiradas" },
            ],
          },
          {
            name: "turma",
            label: "Turma",
            type: "select",
            allLabel: "Todas as minhas turmas",
            options: turmas.map((t) => ({ value: t.id, label: t.nome })),
          },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<Bookmark />} title="Nenhuma reserva encontrada" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <ReservasTable rows={rows} canAct responsavelNome={session?.profile.nome ?? ""} defaultPrazo={prazoPadrao} />
        </div>
      )}
    </>
  );
}
