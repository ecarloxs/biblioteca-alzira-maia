"use client";

import { useState } from "react";
import { EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useRpc } from "@/hooks/use-rpc";

export function ModerarAvaliacaoButton({ id, removida }: { id: string; removida: boolean }) {
  const [open, setOpen] = useState(false);
  const { call, pending } = useRpc();

  async function confirmar() {
    const res = await call(
      "moderar_avaliacao",
      { p_avaliacao_id: id, p_remover: !removida },
      removida ? "Avaliação restaurada." : "Avaliação removida."
    );
    if (res.ok) setOpen(false);
  }

  return (
    <>
      <Button size="sm" variant={removida ? "outline" : "destructive"} onClick={() => setOpen(true)}>
        {removida ? (<><RotateCcw /> Restaurar</>) : (<><EyeOff /> Remover</>)}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={removida ? "Restaurar esta avaliação?" : "Remover esta avaliação?"}
        description={removida ? "Ela volta a aparecer publicamente na página do livro." : "Ela deixa de aparecer publicamente, mas fica registrada para auditoria."}
        confirmLabel={removida ? "Restaurar" : "Remover"}
        variant={removida ? "default" : "destructive"}
        onConfirm={confirmar}
        pending={pending}
      />
    </>
  );
}
