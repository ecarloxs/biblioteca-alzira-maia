"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import { createTurma, updateTurma } from "@/lib/actions/pessoas";
import { TURNOS } from "@/lib/constants";
import type { Turma } from "@/types";

export function TurmaFormDialog({ turma }: { turma?: Turma }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(turma?.nome ?? "");
  const [ano, setAno] = useState<number | "">(turma?.ano ?? "");
  const [turno, setTurno] = useState(turma?.turno ?? "");
  const { run, pending } = useAction();
  const isEdit = Boolean(turma);

  async function confirm() {
    const input = {
      nome,
      ano: ano === "" ? null : Number(ano),
      turno: (turno || null) as "manha" | "tarde" | "noite" | "integral" | null,
    };
    const res = isEdit
      ? await run(() => updateTurma(turma!.id, input), "Turma atualizada.")
      : await run(() => createTurma(input), "Turma cadastrada.");
    if (res.ok) {
      setOpen(false);
      if (!isEdit) {
        setNome("");
        setAno("");
        setTurno("");
      }
    }
  }

  return (
    <>
      <Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"} onClick={() => setOpen(true)}>
        {isEdit ? (
          <>
            <Pencil /> Editar
          </>
        ) : (
          <>
            <Plus /> Nova turma
          </>
        )}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={isEdit ? "Editar turma" : "Cadastrar nova turma"}
        confirmLabel={isEdit ? "Salvar" : "Cadastrar"}
        onConfirm={confirm}
        pending={pending}
        disabled={!nome.trim()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da turma" htmlFor="tu-nome" className="sm:col-span-2" hint="Ex.: 6ºA">
            <Input id="tu-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={50} />
          </Field>
          <Field label="Ano/série (opcional)" htmlFor="tu-ano">
            <Input id="tu-ano" type="number" min={1} max={12} value={ano} onChange={(e) => setAno(e.target.value ? Number(e.target.value) : "")} />
          </Field>
          <Field label="Turno (opcional)" htmlFor="tu-turno">
            <Select id="tu-turno" value={turno ?? ""} onChange={(e) => setTurno(e.target.value)}>
              <option value="">Selecione</option>
              {TURNOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
