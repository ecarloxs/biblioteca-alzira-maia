import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { WithdrawButton } from "@/components/reservations/withdraw-button";
import { CancelReservationButton } from "@/components/reservations/cancel-reservation-button";
import { formatDateTime } from "@/lib/utils";
import type { VReserva } from "@/types";

export function ReservasTable({
  rows,
  canAct,
  responsavelNome,
  defaultPrazo,
}: {
  rows: VReserva[];
  canAct: boolean;
  responsavelNome: string;
  defaultPrazo: string;
}) {
  return (
    <Table>
      <THead>
        <TR className="hover:bg-transparent">
          <TH>Aluno</TH>
          <TH>Livro</TH>
          <TH>Reservada em</TH>
          <TH>Expira em</TH>
          <TH>Status</TH>
          {canAct && <TH className="text-right">Ações</TH>}
        </TR>
      </THead>
      <TBody>
        {rows.map((r) => (
          <TR key={r.id}>
            <TD>
              <p className="font-medium">{r.aluno_nome ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{r.turma_nome ?? "Sem turma"}</p>
            </TD>
            <TD>
              <p className="max-w-[16rem] font-medium">{r.livro_titulo}</p>
              <p className="text-xs text-muted-foreground">{r.codigo_exemplar}</p>
            </TD>
            <TD className="whitespace-nowrap">{formatDateTime(r.data_reserva)}</TD>
            <TD className="whitespace-nowrap">{r.status === "ativa" ? formatDateTime(r.expira_em) : "—"}</TD>
            <TD>
              <StatusBadge kind="reserva" value={r.status} />
            </TD>
            {canAct && (
              <TD className="text-right">
                {r.status === "ativa" && (
                  <div className="flex justify-end gap-2">
                    <CancelReservationButton reservaId={r.id} livroTitulo={r.livro_titulo} alunoNome={r.aluno_nome} />
                    <WithdrawButton
                      reservaId={r.id}
                      alunoNome={r.aluno_nome}
                      livroTitulo={r.livro_titulo}
                      codigoExemplar={r.codigo_exemplar}
                      defaultPrazo={defaultPrazo}
                      responsavelNome={responsavelNome}
                    />
                  </div>
                )}
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
