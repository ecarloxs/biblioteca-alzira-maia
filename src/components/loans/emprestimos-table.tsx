import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReturnButton } from "@/components/loans/return-button";
import { ExtendButton } from "@/components/loans/extend-button";
import { CONDICAO_LABEL } from "@/lib/constants";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { VEmprestimo } from "@/types";

/** Tabela de empréstimos para professores e gestão. `canAct` liga os botões de devolução/prazo. */
export function EmprestimosTable({
  rows,
  canAct,
  responsavelNome,
  showDevolucao = false,
}: {
  rows: VEmprestimo[];
  canAct: boolean;
  responsavelNome: string;
  showDevolucao?: boolean;
}) {
  return (
    <Table>
      <THead>
        <TR className="hover:bg-transparent">
          <TH>Aluno</TH>
          <TH>Livro</TH>
          <TH>Retirada</TH>
          <TH>Prazo</TH>
          {showDevolucao && <TH>Devolução</TH>}
          <TH>Status</TH>
          {canAct && <TH className="text-right">Ações</TH>}
        </TR>
      </THead>
      <TBody>
        {rows.map((e) => {
          const aberto = e.status_efetivo === "ativo" || e.status_efetivo === "atrasado";
          return (
            <TR key={e.id} className={cn(e.status_efetivo === "atrasado" && "bg-danger-soft/40")}>
              <TD>
                <p className="font-medium">{e.aluno_nome ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{e.turma_nome ?? "Sem turma"}</p>
              </TD>
              <TD>
                <p className="max-w-[16rem] font-medium">{e.livro_titulo}</p>
                <p className="text-xs text-muted-foreground">{e.codigo_exemplar}</p>
              </TD>
              <TD>
                <p>{formatDate(e.data_retirada)}</p>
                <p className="text-xs text-muted-foreground">por {e.professor_retirada_nome ?? "—"}</p>
              </TD>
              <TD className="whitespace-nowrap">{formatDate(e.prazo_devolucao)}</TD>
              {showDevolucao && (
                <TD>
                  {e.data_devolucao ? (
                    <>
                      <p>{formatDateTime(e.data_devolucao)}</p>
                      <p className="text-xs text-muted-foreground">
                        por {e.professor_devolucao_nome ?? "—"} · {CONDICAO_LABEL[e.condicao_devolucao ?? ""] ?? "—"}
                      </p>
                      {e.devolucao_observacao && <p className="mt-0.5 max-w-[14rem] text-xs italic text-muted-foreground">“{e.devolucao_observacao}”</p>}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TD>
              )}
              <TD>
                <StatusBadge kind="emprestimo" value={e.status_efetivo} />
                {e.dias_atraso > 0 && (
                  <p className="mt-1 text-xs font-semibold text-danger">
                    Há {e.dias_atraso} {e.dias_atraso === 1 ? "dia" : "dias"}
                  </p>
                )}
              </TD>
              {canAct && (
                <TD className="text-right">
                  {aberto && (
                    <div className="flex justify-end gap-2">
                      <ExtendButton emprestimoId={e.id} alunoNome={e.aluno_nome} livroTitulo={e.livro_titulo} prazoAtual={e.prazo_devolucao} />
                      <ReturnButton
                        emprestimoId={e.id}
                        alunoNome={e.aluno_nome}
                        livroTitulo={e.livro_titulo}
                        dataRetirada={e.data_retirada}
                        prazo={e.prazo_devolucao}
                        diasAtraso={e.dias_atraso}
                        responsavelNome={responsavelNome}
                      />
                    </div>
                  )}
                </TD>
              )}
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
