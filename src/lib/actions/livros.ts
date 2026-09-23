"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { friendlyError } from "@/lib/rpc-errors";
import { ok, fail, type ActionResult } from "@/lib/actions/types";

const livroSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o título.").max(300),
  autor: z.string().trim().min(1, "Informe o autor.").max(200),
  editora: z.string().trim().max(200).optional().or(z.literal("")),
  isbn: z.string().trim().max(30).optional().or(z.literal("")),
  ano_publicacao: z.coerce.number().int().min(1000).max(2100).optional().nullable(),
  categoria: z.string().trim().min(1, "Informe a categoria.").max(100),
  descricao: z.string().trim().max(4000).optional().or(z.literal("")),
  capa_url: z.string().trim().url().optional().or(z.literal("")),
});

export type LivroInput = z.infer<typeof livroSchema>;

function normalize(input: LivroInput) {
  return {
    titulo: input.titulo.trim(),
    autor: input.autor.trim(),
    editora: input.editora?.trim() || null,
    isbn: input.isbn?.trim() || null,
    ano_publicacao: input.ano_publicacao ?? null,
    categoria: input.categoria.trim(),
    descricao: input.descricao?.trim() || null,
    capa_url: input.capa_url?.trim() || null,
  };
}

export async function createLivro(input: LivroInput): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin"]);
  const parsed = livroSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await createClient();
  const { data, error } = await supabase.from("livros").insert(normalize(parsed.data)).select("id").single();
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/livros");
  return ok({ id: data.id as string });
}

export async function updateLivro(id: string, input: LivroInput): Promise<ActionResult> {
  await requireRole(["admin"]);
  const parsed = livroSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await createClient();
  const { error } = await supabase.from("livros").update(normalize(parsed.data)).eq("id", id);
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/livros");
  revalidatePath(`/admin/livros/${id}`);
  return ok(undefined);
}

export async function setLivroAtivo(id: string, ativo: boolean): Promise<ActionResult> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("livros").update({ ativo }).eq("id", id);
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/livros");
  return ok(undefined);
}

const exemplarSchema = z.object({
  livro_id: z.string().uuid(),
  condicao: z.enum(["novo", "bom", "regular", "danificado"]),
  localizacao: z.string().trim().max(120).optional().or(z.literal("")),
  quantidade: z.coerce.number().int().min(1).max(50).default(1),
});

export async function createExemplares(
  input: z.infer<typeof exemplarSchema>
): Promise<ActionResult<{ criados: number }>> {
  await requireRole(["admin"]);
  const parsed = exemplarSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const { livro_id, condicao, localizacao, quantidade } = parsed.data;

  const supabase = await createClient();
  const rows = Array.from({ length: quantidade }, () => ({
    livro_id,
    condicao,
    localizacao: localizacao?.trim() || null,
  }));
  const { error } = await supabase.from("exemplares").insert(rows);
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/livros");
  revalidatePath(`/admin/livros/${livro_id}`);
  return ok({ criados: quantidade });
}

const NON_BUSINESS_STATUS = ["disponivel", "manutencao", "perdido", "inativo"] as const;

const exemplarUpdateSchema = z.object({
  id: z.string().uuid(),
  livro_id: z.string().uuid(),
  condicao: z.enum(["novo", "bom", "regular", "danificado"]),
  localizacao: z.string().trim().max(120).optional().or(z.literal("")),
  status: z.enum(NON_BUSINESS_STATUS).optional(),
});

export async function updateExemplar(input: z.infer<typeof exemplarUpdateSchema>): Promise<ActionResult> {
  await requireRole(["admin"]);
  const parsed = exemplarUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const { id, livro_id, condicao, localizacao, status } = parsed.data;

  const supabase = await createClient();
  const patch: Record<string, unknown> = { condicao, localizacao: localizacao?.trim() || null };
  if (status) patch.status = status;
  const { error } = await supabase.from("exemplares").update(patch).eq("id", id);
  if (error) {
    // A trigger de proteção bloqueia mudar de/para reservado ou emprestado por aqui.
    return fail(friendlyError(error));
  }

  revalidatePath("/admin/livros");
  revalidatePath(`/admin/livros/${livro_id}`);
  return ok(undefined);
}
