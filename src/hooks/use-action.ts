"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions/types";

/**
 * Chama uma Server Action com feedback padronizado (carregamento + toast),
 * espelhando o comportamento do useRpc() para ações que não passam por RPC
 * (cadastros de livros, alunos, professores, turmas, usuários...).
 */
export function useAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<ActionResult<T>>, successMessage?: string) => {
      setPending(true);
      const res = await fn();
      setPending(false);
      if (!res.ok) {
        toast.error(res.error);
        return res;
      }
      if (successMessage) toast.success(successMessage);
      router.refresh();
      return res;
    },
    [router]
  );

  return { run, pending };
}
