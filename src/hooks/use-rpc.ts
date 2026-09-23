"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/rpc-errors";

/**
 * Chama funções RPC do Supabase (regras de negócio no banco) com feedback padronizado:
 * estado de carregamento, toast de sucesso/erro e atualização da tela.
 */
export function useRpc() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const call = useCallback(
    async (fn: string, args: Record<string, unknown>, successMessage: string) => {
      setPending(true);
      const { data, error } = await supabase.rpc(fn, args);
      setPending(false);
      if (error) {
        toast.error(friendlyError(error));
        return { ok: false as const, data: null };
      }
      toast.success(successMessage);
      router.refresh();
      return { ok: true as const, data };
    },
    [supabase, router]
  );

  return { call, pending };
}
