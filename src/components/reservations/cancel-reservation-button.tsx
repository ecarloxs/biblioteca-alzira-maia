"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Summary } from "@/components/shared/confirm-dialog";
import { useRpc } from "@/hooks/use-rpc";

export function CancelReservationButton({
  reservaId,
  livroTitulo,
  alunoNome,
  size = "sm",
}: {
  reservaId: string;
  livroTitulo: string;
  alunoNome?: string | null;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const { call, pending } = useRpc();

  async function confirm() {
    const res = await call("cancelar_reserva", { p_reserva_id: reservaId }, "Reserva cancelada.");
    if (res.ok) setOpen(false);
  }

  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>
        Cancelar reserva
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancelar esta reserva?"
        description="O exemplar volta a ficar disponível para outros alunos."
        confirmLabel="Cancelar reserva"
        cancelLabel="Voltar"
        variant="destructive"
        onConfirm={confirm}
        pending={pending}
      >
        <Summary
          items={[
            ...(alunoNome ? [{ label: "Aluno", value: alunoNome }] : []),
            { label: "Livro", value: livroTitulo },
          ]}
        />
      </ConfirmDialog>
    </>
  );
}
