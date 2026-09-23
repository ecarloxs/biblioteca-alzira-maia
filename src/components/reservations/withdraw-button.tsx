"use client";

import { useState } from "react";
import { BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Summary } from "@/components/shared/confirm-dialog";
import { useRpc } from "@/hooks/use-rpc";
import { formatDate, hojeISO } from "@/lib/utils";

export function WithdrawButton({
  reservaId,
  alunoNome,
  livroTitulo,
  codigoExemplar,
  defaultPrazo,
  responsavelNome,
}: {
  reservaId: string;
  alunoNome: string | null;
  livroTitulo: string;
  codigoExemplar: string;
  defaultPrazo: string;
  responsavelNome: string;
}) {
  const [open, setOpen] = useState(false);
  const [prazo, setPrazo] = useState(defaultPrazo);
  const [obs, setObs] = useState("");
  const { call, pending } = useRpc();

  async function confirm() {
    const res = await call(
      "confirmar_retirada",
      { p_reserva_id: reservaId, p_prazo: prazo || null, p_observacao: obs || null },
      "Retirada registrada com sucesso!"
    );
    if (res.ok) {
      setOpen(false);
      setObs("");
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => { setPrazo(defaultPrazo); setOpen(true); }}>
        <BookOpenCheck /> Confirmar retirada
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Confirmar retirada do livro"
        description="Confirme somente depois de entregar o livro ao aluno."
        confirmLabel="Confirmar retirada"
        onConfirm={confirm}
        pending={pending}
        disabled={!prazo}
      >
        <div className="space-y-4">
          <Summary
            items={[
              { label: "Aluno", value: alunoNome ?? "—" },
              { label: "Livro", value: livroTitulo },
              { label: "Exemplar", value: codigoExemplar },
              { label: "Retirada", value: `${formatDate(hojeISO())} · por ${responsavelNome}` },
            ]}
          />
          <Field label="Prazo de devolução" htmlFor={`prazo-${reservaId}`} hint="Você pode ajustar o prazo padrão, se necessário.">
            <Input id={`prazo-${reservaId}`} type="date" min={hojeISO()} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </Field>
          <Field label="Observação (opcional)" htmlFor={`obs-${reservaId}`}>
            <Textarea id={`obs-${reservaId}`} value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
