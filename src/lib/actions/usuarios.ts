"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { friendlyError } from "@/lib/rpc-errors";
import { ok, fail, type ActionResult } from "@/lib/actions/types";

const baseSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome.").max(200),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

const alunoSchema = baseSchema.extend({
  role: z.literal("aluno"),
  matricula: z.string().trim().min(1, "Informe a matrícula."),
  turma_id: z.string().uuid("Selecione a turma."),
});

const professorSchema = baseSchema.extend({
  role: z.literal("professor"),
  turma_ids: z.array(z.string().uuid()).default([]),
});

const adminSchema = baseSchema.extend({ role: z.literal("admin") });

const createUsuarioSchema = z.discriminatedUnion("role", [alunoSchema, professorSchema, adminSchema]);

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;

/**
 * Cria uma conta de acesso (Supabase Auth) + o cadastro correspondente (aluno/professor).
 * O papel é gravado em raw_app_meta_data — só o servidor (service_role) pode defini-lo,
 * então nenhum usuário consegue se autopromover editando o próprio perfil.
 */
export async function createUsuario(input: CreateUsuarioInput): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin"]);
  const parsed = createUsuarioSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const data = parsed.data;

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.senha,
    email_confirm: true,
    app_metadata: { role: data.role, provisionado: true },
    user_metadata: { nome: data.nome },
  });
  if (authError || !created.user) {
    const msg = authError?.message ?? "";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      return fail("Já existe uma conta com este e-mail.");
    }
    return fail(msg || "Não foi possível criar a conta.");
  }

  const userId = created.user.id;
  const supabase = await createClient();

  try {
    if (data.role === "aluno") {
      const { error } = await supabase
        .from("alunos")
        .insert({ profile_id: userId, matricula: data.matricula.trim(), turma_id: data.turma_id });
      if (error) throw error;
    } else if (data.role === "professor") {
      const { data: prof, error } = await supabase
        .from("professores")
        .insert({ profile_id: userId })
        .select("id")
        .single();
      if (error) throw error;
      if (data.turma_ids.length > 0) {
        const { error: vincErr } = await supabase
          .from("professor_turmas")
          .insert(data.turma_ids.map((turma_id) => ({ professor_id: prof.id as string, turma_id })));
        if (vincErr) throw vincErr;
      }
    }
  } catch (error) {
    // Cadastro específico falhou depois de criar a conta: remove a conta para não deixar lixo.
    await admin.auth.admin.deleteUser(userId);
    return fail(friendlyError(error as { code?: string; message?: string }));
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/alunos");
  revalidatePath("/admin/professores");
  return ok({ id: userId });
}

export async function setUsuarioAtivo(profileId: string, ativo: boolean): Promise<ActionResult> {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ ativo }).eq("id", profileId);
  if (error) return fail(friendlyError(error));

  revalidatePath("/admin/usuarios");
  return ok(undefined);
}

const senhaSchema = z.string().min(8, "A senha deve ter pelo menos 8 caracteres.");

export async function redefinirSenhaUsuario(profileId: string, novaSenha: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  const parsed = senhaSchema.safeParse(novaSenha);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Senha inválida.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profileId, { password: parsed.data });
  if (error) return fail(error.message || "Não foi possível redefinir a senha.");

  return ok(undefined);
}
