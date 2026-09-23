"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import { setProfessorTurmas } from "@/lib/actions/pessoas";
import { cn } from "@/lib/utils";
import type { Turma } from "@/types";

export function ProfessorTurmasDialog({
  professorId,
  nome,
  turmas,
  vinculadas,
}: {
  professorId: string;
  nome: string;
  turmas: Turma[];
  vinculadas: string[];
}) {
  const [open, setOpen] = useState(false);
  const [selecionadas, setSelecionadas] = useState<string[]>(vinculadas);
  const { run, pending } = useAction();

  function toggle(id: string) {
    setSelecionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function confirm() {
    const res = await run(() => setProfessorTurmas(professorId, selecionadas), "Turmas atualizadas.");
    if (res.ok) setOpen(false);
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil /> Turmas
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Turmas de ${nome}`}
        description="Selecione as turmas que este professor pode acompanhar."
        confirmLabel="Salvar"
        onConfirm={confirm}
        pending={pending}
      >
        {turmas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada ainda.</p>
        ) : (
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {turmas.map((t) => {
              const checked = selecionadas.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors",
                    checked ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-muted"
                  )}
                >
                  {t.nome}
                </button>
              );
            })}
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
