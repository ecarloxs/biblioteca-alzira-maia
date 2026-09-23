"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ConfirmDialog, Summary } from "@/components/shared/confirm-dialog";
import { useRpc } from "@/hooks/use-rpc";
import { formatDate } from "@/lib/utils";

export function ExtendButton({
  emprestimoId,
  alunoNome,
  livroTitulo,
  prazoAtual,
}: {
  emprestimoId: string;
  alunoNome: string | null;
  livroTitulo: string;
  prazoAtual: string;
}) {
  const [open, setOpen] = useState(false);
  const [prazo, setPrazo] = useState(prazoAtual);
  const [motivo, setMotivo] = useState("");
  const { call, pending } = useRpc();

  async function confirm() {
    const res = await call(
      "alterar_prazo_emprestimo",
      { p_emprestimo_id: emprestimoId, p_novo_prazo: prazo, p_motivo: motivo || null },
      "Prazo alterado com sucesso."
    );
    if (res.ok) setOpen(false);
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setPrazo(prazoAtual); setOpen(true); }} title="Alterar prazo">
        <CalendarClock /> Prazo
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Alterar prazo de devolução"
        confirmLabel="Salvar novo prazo"
        onConfirm={confirm}
        pending={pending}
        disabled={!prazo || prazo === prazoAtual}
      >
        <div className="space-y-4">
          <Summary items={[{ label: "Aluno", value: alunoNome ?? "—" }, { label: "Livro", value: livroTitulo }, { label: "Prazo atual", value: formatDate(prazoAtual) }]} />
          <Field label="Novo prazo" htmlFor={`np-${emprestimoId}`}>
            <Input id={`np-${emprestimoId}`} type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </Field>
          <Field label="Motivo (opcional)" htmlFor={`nm-${emprestimoId}`}>
            <Input id={`nm-${emprestimoId}`} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
