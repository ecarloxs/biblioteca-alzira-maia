"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Summary } from "@/components/shared/confirm-dialog";
import { useRpc } from "@/hooks/use-rpc";
import { CONDICOES_DEVOLUCAO } from "@/lib/constants";
import { cn, formatDate, hojeISO } from "@/lib/utils";

export function ReturnButton({
  emprestimoId,
  alunoNome,
  livroTitulo,
  dataRetirada,
  prazo,
  diasAtraso,
  responsavelNome,
  variant = "default",
}: {
  emprestimoId: string;
  alunoNome: string | null;
  livroTitulo: string;
  dataRetirada: string;
  prazo: string;
  diasAtraso: number;
  responsavelNome: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [condicao, setCondicao] = useState("bom");
  const [obs, setObs] = useState("");
  const { call, pending } = useRpc();

  async function confirm() {
    const res = await call(
      "registrar_devolucao",
      { p_emprestimo_id: emprestimoId, p_condicao: condicao, p_observacao: obs || null },
      "Devolução registrada com sucesso."
    );
    if (res.ok) {
      setOpen(false);
      setObs("");
      setCondicao("bom");
    }
  }

  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        <Undo2 /> Registrar devolução
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Registrar devolução"
        description="Tem certeza que deseja registrar a devolução deste livro?"
        confirmLabel="Confirmar devolução"
        onConfirm={confirm}
        pending={pending}
      >
        <div className="space-y-4">
          <Summary
            items={[
              { label: "Aluno", value: alunoNome ?? "—" },
              { label: "Livro", value: livroTitulo },
              { label: "Retirada", value: formatDate(dataRetirada) },
              { label: "Prazo", value: formatDate(prazo) },
              { label: "Devolução", value: `${formatDate(hojeISO())} · recebido por ${responsavelNome}` },
            ]}
          />
          {diasAtraso > 0 && (
            <p className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              Devolução com {diasAtraso} {diasAtraso === 1 ? "dia" : "dias"} de atraso.
            </p>
          )}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Condição do livro</legend>
            <div className="flex flex-wrap gap-2">
              {CONDICOES_DEVOLUCAO.map((c) => (
                <label
                  key={c.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    condicao === c.value
                      ? c.value === "perdido" || c.value === "danificado"
                        ? "border-danger bg-danger-soft text-danger"
                        : "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:bg-muted"
                  )}
                >
                  <input
                    type="radio"
                    name={`condicao-${emprestimoId}`}
                    value={c.value}
                    checked={condicao === c.value}
                    onChange={() => setCondicao(c.value)}
                    className="sr-only"
                  />
                  {c.label}
                </label>
              ))}
            </div>
            {condicao === "danificado" && (
              <p className="mt-2 text-xs text-muted-foreground">O exemplar irá para “Manutenção” até a gestão revisá-lo.</p>
            )}
            {condicao === "perdido" && (
              <p className="mt-2 text-xs text-muted-foreground">O exemplar será marcado como “Perdido” e o empréstimo encerrado.</p>
            )}
          </fieldset>
          <Field label="Observação (opcional)" htmlFor={`dev-obs-${emprestimoId}`}>
            <Textarea id={`dev-obs-${emprestimoId}`} value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
