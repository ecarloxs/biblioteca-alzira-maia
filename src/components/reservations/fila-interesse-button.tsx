"use client";

import { BellPlus, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRpc } from "@/hooks/use-rpc";

export function FilaInteresseButton({ livroId, naFila }: { livroId: string; naFila: boolean }) {
  const { call, pending } = useRpc();

  if (naFila) {
    return (
      <Button
        variant="outline"
        onClick={() => call("sair_fila_interesse", { p_livro_id: livroId }, "Você saiu da fila de interesse.")}
        loading={pending}
      >
        <BellOff /> Sair da fila de interesse
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      onClick={() => call("entrar_fila_interesse", { p_livro_id: livroId }, "Você entrou na fila! Avisaremos quando abrir uma vaga.")}
      loading={pending}
    >
      <BellPlus /> Entrar na fila de interesse
    </Button>
  );
}
