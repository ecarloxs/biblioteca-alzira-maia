"use client";

import { useMemo, useState } from "react";
import { BookPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useRpc } from "@/hooks/use-rpc";
import { hojeISO } from "@/lib/utils";

export interface AlunoOption { id: string; nome: string; turma_nome: string | null; matricula: string }
export interface ExemplarOption { id: string; codigo_exemplar: string; livro_titulo: string }

/** Empréstimo direto (sem reserva prévia): o aluno já está com o livro em mãos. */
export function NewLoanDialog({
  alunos,
  exemplares,
  defaultPrazo,
  defaultExemplarId,
  label = "Novo empréstimo",
}: {
  alunos: AlunoOption[];
  exemplares: ExemplarOption[];
  defaultPrazo: string;
  defaultExemplarId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [alunoId, setAlunoId] = useState("");
  const [exemplarId, setExemplarId] = useState(defaultExemplarId ?? "");
  const [prazo, setPrazo] = useState(defaultPrazo);
  const [obs, setObs] = useState("");
  const { call, pending } = useRpc();

  const porTurma = useMemo(() => {
    const m = new Map<string, AlunoOption[]>();
    alunos.forEach((a) => {
      const k = a.turma_nome ?? "Sem turma";
      m.set(k, [...(m.get(k) ?? []), a]);
    });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [alunos]);

  async function confirm() {
    const res = await call(
      "registrar_emprestimo_direto",
      { p_aluno_id: alunoId, p_exemplar_id: exemplarId, p_prazo: prazo || null, p_observacao: obs || null },
      "Empréstimo registrado com sucesso!"
    );
    if (res.ok) {
      setOpen(false);
      setAlunoId("");
      setObs("");
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <BookPlus /> {label}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Registrar empréstimo"
        description="Use quando o aluno retirar um livro sem reserva. Se ele reservou, use “Confirmar retirada” na reserva."
        confirmLabel="Registrar empréstimo"
        onConfirm={confirm}
        pending={pending}
        disabled={!alunoId || !exemplarId || !prazo}
      >
        <div className="space-y-4">
          <Field label="Aluno" htmlFor="nl-aluno">
            <Select id="nl-aluno" value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
              <option value="">Selecione o aluno</option>
              {porTurma.map(([turma, lista]) => (
                <optgroup key={turma} label={turma}>
                  {lista.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome} ({a.matricula})</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Exemplar disponível" htmlFor="nl-ex">
            <Select id="nl-ex" value={exemplarId} onChange={(e) => setExemplarId(e.target.value)}>
              <option value="">Selecione o exemplar</option>
              {exemplares.map((x) => (
                <option key={x.id} value={x.id}>{x.codigo_exemplar} — {x.livro_titulo}</option>
              ))}
            </Select>
          </Field>
          <Field label="Prazo de devolução" htmlFor="nl-prazo">
            <Input id="nl-prazo" type="date" min={hojeISO()} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </Field>
          <Field label="Observação (opcional)" htmlFor="nl-obs">
            <Textarea id="nl-obs" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
