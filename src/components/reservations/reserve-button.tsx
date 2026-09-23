"use client";

import { useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Summary } from "@/components/shared/confirm-dialog";
import { useRpc } from "@/hooks/use-rpc";

export function ReserveButton({
  livroId,
  titulo,
  autor,
  validadeDias,
  disabled,
  className,
}: {
  livroId: string;
  titulo: string;
  autor: string;
  validadeDias: number;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { call, pending } = useRpc();

  async function confirm() {
    const res = await call("reservar_livro", { p_livro_id: livroId }, "Livro reservado com sucesso!");
    if (res.ok) setOpen(false);
  }

  return (
    <>
      <Button size="lg" className={className} onClick={() => setOpen(true)} disabled={disabled}>
        <BookmarkPlus /> Reservar livro
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Reservar este livro?"
        description={`Depois de reservar, procure seu professor em até ${validadeDias} ${validadeDias === 1 ? "dia" : "dias"} para retirar o livro. Depois disso a reserva expira.`}
        confirmLabel="Confirmar reserva"
        onConfirm={confirm}
        pending={pending}
      >
        <Summary items={[{ label: "Livro", value: titulo }, { label: "Autor", value: autor }]} />
      </ConfirmDialog>
    </>
  );
}
