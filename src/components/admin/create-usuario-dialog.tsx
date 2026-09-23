"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import { createUsuario } from "@/lib/actions/usuarios";
import { ROLE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Turma } from "@/types";

type Role = "aluno" | "professor" | "admin";

export function CreateUsuarioDialog({ turmas, defaultRole }: { turmas: Turma[]; defaultRole?: Role }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(defaultRole ?? "aluno");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [matricula, setMatricula] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [turmaIds, setTurmaIds] = useState<string[]>([]);
  const { run, pending } = useAction();

  useEffect(() => {
    if (defaultRole) setOpen(true);
  }, [defaultRole]);

  function reset() {
    setNome("");
    setEmail("");
    setSenha("");
    setMatricula("");
    setTurmaId("");
    setTurmaIds([]);
  }

  function toggleTurma(id: string) {
    setTurmaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function confirm() {
    const base = { nome: nome.trim(), email: email.trim(), senha };
    const input =
      role === "aluno"
        ? { ...base, role: "aluno" as const, matricula: matricula.trim(), turma_id: turmaId }
        : role === "professor"
          ? { ...base, role: "professor" as const, turma_ids: turmaIds }
          : { ...base, role: "admin" as const };
    const res = await run(() => createUsuario(input), "Conta criada com sucesso.");
    if (res.ok) {
      setOpen(false);
      reset();
    }
  }

  const valid =
    nome.trim().length > 0 &&
    /.+@.+\..+/.test(email) &&
    senha.length >= 8 &&
    (role !== "aluno" || (matricula.trim().length > 0 && turmaId));

  return (
    <>
      <Button
        onClick={() => {
          setRole(defaultRole ?? "aluno");
          setOpen(true);
        }}
      >
        <UserPlus /> Nova conta
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
        title="Criar conta de acesso"
        description="A conta é criada com e-mail já confirmado. Recomende que a pessoa troque a senha no primeiro acesso."
        confirmLabel="Criar conta"
        onConfirm={confirm}
        pending={pending}
        disabled={!valid}
      >
        <div className="grid gap-4">
          <Field label="Perfil" htmlFor="us-role">
            <Select id="us-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="aluno">{ROLE_LABEL.aluno}</option>
              <option value="professor">{ROLE_LABEL.professor}</option>
              <option value="admin">{ROLE_LABEL.admin}</option>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" htmlFor="us-nome" className="sm:col-span-2">
              <Input id="us-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={200} />
            </Field>
            <Field label="E-mail" htmlFor="us-email">
              <Input id="us-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Senha provisória" htmlFor="us-senha" hint="Mínimo de 8 caracteres.">
              <Input id="us-senha" type="text" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={8} />
            </Field>
          </div>

          {role === "aluno" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Matrícula" htmlFor="us-matricula">
                <Input id="us-matricula" value={matricula} onChange={(e) => setMatricula(e.target.value)} maxLength={30} />
              </Field>
              <Field label="Turma" htmlFor="us-turma">
                <Select id="us-turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                  <option value="">Selecione</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          {role === "professor" && (
            <Field label="Turmas que irá acompanhar (opcional, pode definir depois)" htmlFor="us-turmas">
              {turmas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada ainda.</p>
              ) : (
                <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                  {turmas.map((t) => {
                    const checked = turmaIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTurma(t.id)}
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
            </Field>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
}
