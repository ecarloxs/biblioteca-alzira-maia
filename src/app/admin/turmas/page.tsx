import { School } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setTurmaAtiva } from "@/lib/actions/pessoas";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TurmaFormDialog } from "@/components/admin/turma-form-dialog";
import { ToggleAtivoButton } from "@/components/admin/toggle-ativo-button";
import { TURNOS } from "@/lib/constants";
import type { Turma } from "@/types";

export const metadata = { title: "Turmas" };

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("turmas").select("*").order("nome");
  const turmas = (data ?? []) as Turma[];
  const turnoLabel = Object.fromEntries(TURNOS.map((t) => [t.value, t.label]));

  return (
    <>
      <PageHeader title="Turmas" description="Turmas cadastradas na escola." actions={<TurmaFormDialog />} />
      {turmas.length === 0 ? (
        <EmptyState icon={<School />} title="Nenhuma turma cadastrada" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Turma</TH>
                <TH>Ano/série</TH>
                <TH>Turno</TH>
                <TH>Situação</TH>
                <TH className="text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {turmas.map((t) => (
                <TR key={t.id}>
                  <TD className="font-medium">{t.nome}</TD>
                  <TD>{t.ano ?? "—"}</TD>
                  <TD>{t.turno ? turnoLabel[t.turno] : "—"}</TD>
                  <TD>
                    <Badge tone={t.ativo ? "success" : "neutral"}>{t.ativo ? "Ativa" : "Inativa"}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <TurmaFormDialog turma={t} />
                      <ToggleAtivoButton ativo={t.ativo} nome={t.nome} onToggle={setTurmaAtiva.bind(null, t.id)} />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}
