"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { friendlyError } from "@/lib/rpc-errors";
import { ok, fail, type ActionResult } from "@/lib/actions/types";

const configSchema = z.object({
  prazo_padrao_dias: z.coerce.number().int().min(1).max(90),
  validade_reserva_dias: z.coerce.number().int().min(1).max(30),
  max_emprestimos_por_aluno: z.coerce.number().int().min(1).max(20),
  bloquear_reserva_com_atraso: z.boolean(),
});

export type ConfigInput = z.infer<typeof configSchema>;

export async function updateConfiguracoes(input: ConfigInput): Promise<ActionResult> {
  await requireRole(["admin"]);
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await createClient();
  const rows = Object.entries(parsed.data).map(([chave, valor]) => ({ chave, valor: String(valor) }));
  const { error } = await supabase.from("configuracoes").upsert(rows, { onConflict: "chave" });
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/configuracoes");
  return ok(undefined);
}
