import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { getAllTurmas } from "@/lib/data/turmas";
import { getPrazoPadraoISO } from "@/lib/data/config";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ReservasTable } from "@/components/reservations/reservas-table";
import { first } from "@/lib/utils";
import { TABLE_PAGE_SIZE } from "@/lib/constants";
import type { SearchParams, VReserva } from "@/types";

export const metadata = { title: "Reservas" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = first(sp.status);
  const turma = first(sp.turma);
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");

  const [session, turmas, prazoPadrao] = await Promise.all([
    getSessionProfile(),
    getAllTurmas(supabase, { includeInactive: true }),
    getPrazoPadraoISO(supabase),
  ]);

  let query = supabase.from("v_reservas").select("*", { count: "exact" }).order("data_reserva", { ascending: false });
  if (status) query = query.eq("status", status);
  else query = query.eq("status", "ativa");
  if (turma) query = query.eq("turma_id", turma);
  const { data, count } = await query.range((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE - 1);
  const rows = (data ?? []) as VReserva[];

  return (
    <>
      <PageHeader title="Reservas" description="Todas as reservas da biblioteca, de qualquer turma." />
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
          { name: "turma", label: "Turma", type: "select", allLabel: "Todas as turmas", options: turmas.map((t) => ({ value: t.id, label: t.nome })) },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<Bookmark />} title="Nenhuma reserva encontrada" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <ReservasTable rows={rows} canAct responsavelNome={session?.profile.nome ?? ""} defaultPrazo={prazoPadrao} />
        </div>
      )}
      <Pagination page={page} pageSize={TABLE_PAGE_SIZE} total={count ?? 0} basePath="/admin/reservas" params={{ status, turma }} />
    </>
  );
}
