"use client";

import { useState } from "react";
import { Ban, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Summary } from "@/components/shared/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/lib/actions/types";

export function ToggleAtivoButton({
  ativo,
  nome,
  onToggle,
  size = "sm",
}: {
  ativo: boolean;
  nome: string;
  onToggle: (novoValor: boolean) => Promise<ActionResult>;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAction();

  async function confirm() {
    const res = await run(() => onToggle(!ativo), ativo ? "Desativado." : "Ativado novamente.");
    if (res.ok) setOpen(false);
  }

  return (
    <>
      <Button size={size} variant={ativo ? "outline" : "default"} onClick={() => setOpen(true)}>
        {ativo ? (
          <>
            <Ban /> Desativar
          </>
        ) : (
          <>
            <CheckCircle2 /> Ativar
          </>
        )}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={ativo ? "Desativar este registro?" : "Ativar este registro?"}
        description={ativo ? "Ele deixa de aparecer para os demais usuários, mas o histórico é mantido." : undefined}
        confirmLabel={ativo ? "Desativar" : "Ativar"}
        variant={ativo ? "destructive" : "default"}
        onConfirm={confirm}
        pending={pending}
      >
        <Summary items={[{ label: "Registro", value: nome }]} />
      </ConfirmDialog>
    </>
  );
}
