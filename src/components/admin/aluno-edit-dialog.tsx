"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import { updateAluno } from "@/lib/actions/pessoas";
import type { Turma, VAluno } from "@/types";

export function AlunoEditDialog({ aluno, turmas }: { aluno: VAluno; turmas: Turma[] }) {
  const [open, setOpen] = useState(false);
  const [matricula, setMatricula] = useState(aluno.matricula);
  const [turmaId, setTurmaId] = useState(aluno.turma_id ?? "");
  const { run, pending } = useAction();

  async function confirm() {
    const res = await run(() => updateAluno(aluno.id, { matricula, turma_id: turmaId || null }), "Aluno atualizado.");
    if (res.ok) setOpen(false);
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil /> Editar
      </Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title={`Editar ${aluno.nome}`} confirmLabel="Salvar" onConfirm={confirm} pending={pending} disabled={!matricula.trim()}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Matrícula" htmlFor={`al-mat-${aluno.id}`}>
            <Input id={`al-mat-${aluno.id}`} value={matricula} onChange={(e) => setMatricula(e.target.value)} maxLength={30} />
          </Field>
          <Field label="Turma" htmlFor={`al-turma-${aluno.id}`}>
            <Select id={`al-turma-${aluno.id}`} value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
              <option value="">Sem turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
