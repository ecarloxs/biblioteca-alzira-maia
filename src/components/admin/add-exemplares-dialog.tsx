"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import { createExemplares } from "@/lib/actions/livros";
import { CONDICOES } from "@/lib/constants";

export function AddExemplaresDialog({ livroId }: { livroId: string }) {
  const [open, setOpen] = useState(false);
  const [quantidade, setQuantidade] = useState(1);
  const [condicao, setCondicao] = useState<"novo" | "bom" | "regular" | "danificado">("novo");
  const [localizacao, setLocalizacao] = useState("");
  const { run, pending } = useAction();

  async function confirm() {
    const res = await run(
      () => createExemplares({ livro_id: livroId, condicao, localizacao, quantidade }),
      quantidade === 1 ? "Exemplar cadastrado." : `${quantidade} exemplares cadastrados.`
    );
    if (res.ok) {
      setOpen(false);
      setQuantidade(1);
      setLocalizacao("");
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PackagePlus /> Adicionar exemplares
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Adicionar exemplares"
        description="Cada exemplar recebe um código único (ALZ-000001, ...) usado no QR Code."
        confirmLabel="Adicionar"
        onConfirm={confirm}
        pending={pending}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantidade" htmlFor="ex-qtd">
            <Input id="ex-qtd" type="number" min={1} max={50} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value) || 1)} />
          </Field>
          <Field label="Condição" htmlFor="ex-cond">
            <Select id="ex-cond" value={condicao} onChange={(e) => setCondicao(e.target.value as typeof condicao)}>
              {CONDICOES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Localização (opcional)" htmlFor="ex-local" className="sm:col-span-2" hint="Ex.: Estante 3, Prateleira B">
            <Input id="ex-local" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} maxLength={120} />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
