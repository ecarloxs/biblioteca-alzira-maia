"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookPlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAction } from "@/hooks/use-action";
import { createLivro, updateLivro, type LivroInput } from "@/lib/actions/livros";
import { CATEGORIAS_SUGERIDAS } from "@/lib/constants";
import type { Livro } from "@/types";

const EMPTY: LivroInput = {
  titulo: "",
  autor: "",
  editora: "",
  isbn: "",
  ano_publicacao: null,
  categoria: "",
  numero_paginas: null,
  descricao: "",
  capa_url: "",
};

export function LivroFormDialog({ livro }: { livro?: Livro }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LivroInput>(
    livro
      ? {
          titulo: livro.titulo,
          autor: livro.autor,
          editora: livro.editora ?? "",
          isbn: livro.isbn ?? "",
          ano_publicacao: livro.ano_publicacao,
          categoria: livro.categoria,
          numero_paginas: livro.numero_paginas,
          descricao: livro.descricao ?? "",
          capa_url: livro.capa_url ?? "",
        }
      : EMPTY
  );
  const { run, pending } = useAction();
  const router = useRouter();
  const isEdit = Boolean(livro);

  function set<K extends keyof LivroInput>(key: K, value: LivroInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function confirm() {
    if (isEdit) {
      const res = await run(() => updateLivro(livro!.id, form), "Livro atualizado.");
      if (res.ok) setOpen(false);
      return;
    }
    const res = await run(() => createLivro(form), "Livro cadastrado.");
    if (res.ok) {
      setOpen(false);
      setForm(EMPTY);
      router.push(`/admin/livros/${res.data.id}`);
    }
  }

  const valid = form.titulo.trim() && form.autor.trim() && form.categoria.trim();

  return (
    <>
      <Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"} onClick={() => setOpen(true)}>
        {isEdit ? (
          <>
            <Pencil /> Editar
          </>
        ) : (
          <>
            <BookPlus /> Novo livro
          </>
        )}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={isEdit ? "Editar livro" : "Cadastrar novo livro"}
        confirmLabel={isEdit ? "Salvar alterações" : "Cadastrar livro"}
        onConfirm={confirm}
        pending={pending}
        disabled={!valid}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" htmlFor="lv-titulo" className="sm:col-span-2">
            <Input id="lv-titulo" value={form.titulo} onChange={(e) => set("titulo", e.target.value)} maxLength={300} />
          </Field>
          <Field label="Autor" htmlFor="lv-autor">
            <Input id="lv-autor" value={form.autor} onChange={(e) => set("autor", e.target.value)} maxLength={200} />
          </Field>
          <Field label="Categoria" htmlFor="lv-categoria">
            <Input id="lv-categoria" value={form.categoria} onChange={(e) => set("categoria", e.target.value)} maxLength={100} list="categorias-sugeridas" />
            <datalist id="categorias-sugeridas">
              {CATEGORIAS_SUGERIDAS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Editora (opcional)" htmlFor="lv-editora">
            <Input id="lv-editora" value={form.editora ?? ""} onChange={(e) => set("editora", e.target.value)} maxLength={200} />
          </Field>
          <Field label="Ano de publicação (opcional)" htmlFor="lv-ano">
            <Input
              id="lv-ano"
              type="number"
              min={1000}
              max={2100}
              value={form.ano_publicacao ?? ""}
              onChange={(e) => set("ano_publicacao", e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="Número de páginas (opcional)" htmlFor="lv-paginas">
            <Input
              id="lv-paginas"
              type="number"
              min={1}
              max={20000}
              value={form.numero_paginas ?? ""}
              onChange={(e) => set("numero_paginas", e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="ISBN (opcional)" htmlFor="lv-isbn">
            <Input id="lv-isbn" value={form.isbn ?? ""} onChange={(e) => set("isbn", e.target.value)} maxLength={30} />
          </Field>
          <Field label="URL da capa (opcional)" htmlFor="lv-capa" hint="Deixe em branco para usar uma capa gerada automaticamente.">
            <Input id="lv-capa" type="url" value={form.capa_url ?? ""} onChange={(e) => set("capa_url", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Descrição (opcional)" htmlFor="lv-descricao" className="sm:col-span-2">
            <Textarea id="lv-descricao" value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} maxLength={4000} />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
