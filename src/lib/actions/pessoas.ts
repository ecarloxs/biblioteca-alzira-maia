"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { friendlyError } from "@/lib/rpc-errors";
import { ok, fail, type ActionResult } from "@/lib/actions/types";

// --------------------------------------------------------------------- turmas
const turmaSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da turma.").max(50),
  ano: z.coerce.number().int().min(1).max(12).optional().nullable(),
  turno: z.enum(["manha", "tarde", "noite", "integral"]).optional().nullable(),
});

export async function createTurma(input: z.infer<typeof turmaSchema>): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin"]);
  const parsed = turmaSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("turmas")
    .insert({ nome: parsed.data.nome.trim(), ano: parsed.data.ano ?? null, turno: parsed.data.turno ?? null })
    .select("id")
    .single();
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/turmas");
  return ok({ id: data.id as string });
}

export async function updateTurma(id: string, input: z.infer<typeof turmaSchema>): Promise<ActionResult> {
  await requireRole(["admin"]);
  const parsed = turmaSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("turmas")
    .update({ nome: parsed.data.nome.trim(), ano: parsed.data.ano ?? null, turno: parsed.data.turno ?? null })
    .eq("id", id);
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/turmas");
  return ok(undefined);
}

export async function setTurmaAtiva(id: string, ativo: boolean): Promise<ActionResult> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("turmas").update({ ativo }).eq("id", id);
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/turmas");
  return ok(undefined);
}

// --------------------------------------------------------------------- alunos
const alunoUpdateSchema = z.object({
  matricula: z.string().trim().min(1, "Informe a matrícula.").max(30),
  turma_id: z.string().uuid().nullable(),
});

export async function updateAluno(id: string, input: z.infer<typeof alunoUpdateSchema>): Promise<ActionResult> {
  await requireRole(["admin"]);
  const parsed = alunoUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("alunos")
    .update({ matricula: parsed.data.matricula.trim(), turma_id: parsed.data.turma_id })
    .eq("id", id);
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/alunos");
  return ok(undefined);
}

export async function setAlunoAtivo(id: string, ativo: boolean): Promise<ActionResult> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("alunos").update({ ativo }).eq("id", id);
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/alunos");
  return ok(undefined);
}

// ---------------------------------------------------------------- professores
export async function setProfessorAtivo(id: string, ativo: boolean): Promise<ActionResult> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("professores").update({ ativo }).eq("id", id);
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/professores");
  return ok(undefined);
}

/** Substitui a lista de turmas que um professor gerencia (remove e insere de novo). */
export async function setProfessorTurmas(professorId: string, turmaIds: string[]): Promise<ActionResult> {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { error: delErr } = await supabase.from("professor_turmas").delete().eq("professor_id", professorId);
  if (delErr) return fail(friendlyError(delErr));

  if (turmaIds.length > 0) {
    const { error: insErr } = await supabase
      .from("professor_turmas")
      .insert(turmaIds.map((turma_id) => ({ professor_id: professorId, turma_id })));
    if (insErr) return fail(friendlyError(insErr));
  }

  revalidatePath("/admin/professores");
  return ok(undefined);
}
