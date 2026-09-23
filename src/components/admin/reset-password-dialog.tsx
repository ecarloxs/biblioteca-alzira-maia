"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import { redefinirSenhaUsuario } from "@/lib/actions/usuarios";

export function ResetPasswordDialog({ profileId, nome }: { profileId: string; nome: string }) {
  const [open, setOpen] = useState(false);
  const [senha, setSenha] = useState("");
  const { run, pending } = useAction();

  async function confirm() {
    const res = await run(() => redefinirSenhaUsuario(profileId, senha), "Senha redefinida.");
    if (res.ok) {
      setOpen(false);
      setSenha("");
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <KeyRound /> Redefinir senha
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Redefinir senha de ${nome}`}
        description="Informe a pessoa da nova senha por um canal seguro depois de salvar."
        confirmLabel="Redefinir"
        onConfirm={confirm}
        pending={pending}
        disabled={senha.length < 8}
      >
        <Field label="Nova senha" htmlFor="rs-senha" hint="Mínimo de 8 caracteres.">
          <Input id="rs-senha" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={8} />
        </Field>
      </ConfirmDialog>
    </>
  );
}
