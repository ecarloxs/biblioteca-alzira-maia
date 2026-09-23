"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, QrCode } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { AddExemplaresDialog } from "@/components/admin/add-exemplares-dialog";
import { useAction } from "@/hooks/use-action";
import { updateExemplar } from "@/lib/actions/livros";
import { CONDICOES } from "@/lib/constants";
import type { Exemplar } from "@/types";

const STATUS_EDITAVEIS = [
  { value: "disponivel", label: "Disponível" },
  { value: "manutencao", label: "Manutenção" },
  { value: "perdido", label: "Perdido" },
  { value: "inativo", label: "Inativo" },
] as const;

function EditExemplarDialog({ livroId, exemplar }: { livroId: string; exemplar: Exemplar }) {
  const [open, setOpen] = useState(false);
  const [condicao, setCondicao] = useState(exemplar.condicao);
  const [localizacao, setLocalizacao] = useState(exemplar.localizacao ?? "");
  const [status, setStatus] = useState(exemplar.status);
  const { run, pending } = useAction();
  const emUso = exemplar.status === "reservado" || exemplar.status === "emprestado";

  async function confirm() {
    const res = await run(
      () =>
        updateExemplar({
          id: exemplar.id,
          livro_id: livroId,
          condicao,
          localizacao,
          status: emUso ? undefined : (status as "disponivel" | "manutencao" | "perdido" | "inativo"),
        }),
      "Exemplar atualizado."
    );
    if (res.ok) setOpen(false);
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil /> Editar
      </Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title={`Exemplar ${exemplar.codigo_exemplar}`} confirmLabel="Salvar" onConfirm={confirm} pending={pending}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Condição" htmlFor={`ex-cond-${exemplar.id}`}>
            <Select id={`ex-cond-${exemplar.id}`} value={condicao} onChange={(e) => setCondicao(e.target.value as typeof condicao)}>
              {CONDICOES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Status"
            htmlFor={`ex-status-${exemplar.id}`}
            hint={emUso ? "Reservado/emprestado só muda por reserva, retirada ou devolução." : undefined}
          >
            <Select id={`ex-status-${exemplar.id}`} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} disabled={emUso}>
              {emUso && <option value={exemplar.status}>{exemplar.status === "reservado" ? "Reservado" : "Emprestado"}</option>}
              {STATUS_EDITAVEIS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Localização (opcional)" htmlFor={`ex-local-${exemplar.id}`} className="sm:col-span-2">
            <Input id={`ex-local-${exemplar.id}`} value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} maxLength={120} />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}

export function ExemplaresManager({ livroId, exemplares }: { livroId: string; exemplares: Exemplar[] }) {
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <AddExemplaresDialog livroId={livroId} />
      </div>
      {exemplares.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum exemplar cadastrado ainda.</p>
      ) : (
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Código</TH>
              <TH>Status</TH>
              <TH>Condição</TH>
              <TH>Localização</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {exemplares.map((x) => (
              <TR key={x.id}>
                <TD className="font-medium">{x.codigo_exemplar}</TD>
                <TD>
                  <StatusBadge kind="exemplar" value={x.status} />
                </TD>
                <TD>{x.condicao}</TD>
                <TD>{x.localizacao ?? "—"}</TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="ghost" title="Abrir página de QR Code">
                      <Link href={`/exemplar/${x.codigo_exemplar}`}>
                        <QrCode />
                      </Link>
                    </Button>
                    <EditExemplarDialog livroId={livroId} exemplar={x} />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
