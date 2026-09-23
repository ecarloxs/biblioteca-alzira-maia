"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { updateConfiguracoes, type ConfigInput } from "@/lib/actions/config";

export function ConfiguracoesForm({ initial }: { initial: ConfigInput }) {
  const [form, setForm] = useState<ConfigInput>(initial);
  const { run, pending } = useAction();

  function set<K extends keyof ConfigInput>(key: K, value: ConfigInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await run(() => updateConfiguracoes(form), "Configurações salvas.");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5 rounded-xl border bg-card p-6">
      <Field label="Prazo padrão de empréstimo (dias)" htmlFor="cfg-prazo" hint="Usado ao registrar uma retirada, mas pode ser ajustado individualmente.">
        <Input id="cfg-prazo" type="number" min={1} max={90} value={form.prazo_padrao_dias} onChange={(e) => set("prazo_padrao_dias", Number(e.target.value))} />
      </Field>
      <Field label="Validade da reserva (dias)" htmlFor="cfg-reserva" hint="Depois desse prazo sem retirada, a reserva expira automaticamente.">
        <Input
          id="cfg-reserva"
          type="number"
          min={1}
          max={30}
          value={form.validade_reserva_dias}
          onChange={(e) => set("validade_reserva_dias", Number(e.target.value))}
        />
      </Field>
      <Field label="Máximo de empréstimos simultâneos por aluno" htmlFor="cfg-max">
        <Input
          id="cfg-max"
          type="number"
          min={1}
          max={20}
          value={form.max_emprestimos_por_aluno}
          onChange={(e) => set("max_emprestimos_por_aluno", Number(e.target.value))}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4 rounded border-input"
          checked={form.bloquear_reserva_com_atraso}
          onChange={(e) => set("bloquear_reserva_com_atraso", e.target.checked)}
        />
        Bloquear novas reservas para alunos com empréstimo em atraso
      </label>
      <Button type="submit" loading={pending}>
        <Save /> Salvar configurações
      </Button>
    </form>
  );
}
