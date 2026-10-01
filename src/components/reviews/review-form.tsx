"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StarRating } from "@/components/shared/star-rating";
import { useRpc } from "@/hooks/use-rpc";

export function ReviewForm({ emprestimoId, livroTitulo }: { emprestimoId: string; livroTitulo: string }) {
  const [open, setOpen] = useState(false);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const { call, pending } = useRpc();

  async function confirmar() {
    const res = await call(
      "avaliar_livro",
      { p_emprestimo_id: emprestimoId, p_nota: nota, p_comentario: comentario || null },
      "Avaliação enviada. Obrigado!"
    );
    if (res.ok) setOpen(false);
  }

  return (
    <>
      <Button size="sm" variant="accent" onClick={() => setOpen(true)}>
        <Star /> Avaliar livro
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Avaliar "${livroTitulo}"`}
        description="Conte para os colegas o que achou do livro."
        confirmLabel="Enviar avaliação"
        onConfirm={confirmar}
        pending={pending}
      >
        <div className="space-y-4">
          <Field label="Sua nota" htmlFor="av-nota">
            <StarRating value={nota} onChange={setNota} size="lg" />
          </Field>
          <Field label="Comentário (opcional)" htmlFor="av-comentario">
            <Textarea
              id="av-comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={1000}
              placeholder="O que você achou da história?"
            />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
