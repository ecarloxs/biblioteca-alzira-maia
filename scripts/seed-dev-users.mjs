// scripts/seed-dev-users.mjs
//
// ⚠️  SOMENTE PARA DESENVOLVIMENTO/DEMONSTRAÇÃO. Nunca rode isto contra um
//     projeto Supabase de produção com dados reais de alunos.
//
// Cria algumas contas de teste (1 admin, 2 professores, 4 alunos) usando a
// service_role key, para você conseguir explorar o sistema imediatamente
// após rodar as migrations. As senhas abaixo são só para teste local —
// troque-as (ou apague estes usuários) antes de ir para produção.
//
// Uso:
//   node --env-file=.env.local scripts/seed-dev-users.mjs
// (ou exporte as variáveis de ambiente manualmente antes de rodar)

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error(
    "Faltam variáveis de ambiente. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY\n" +
      "(por exemplo: node --env-file=.env.local scripts/seed-dev-users.mjs)"
  );
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const USUARIOS = [
  { role: "admin", nome: "Admin de Testes", email: "admin@teste.dev", senha: "Teste@123" },
  { role: "professor", nome: "Professor(a) João Teste", email: "professor1@teste.dev", senha: "Teste@123", turmas: ["2ºA", "2ºB", "3ºA"] },
  { role: "professor", nome: "Professor(a) Maria Teste", email: "professor2@teste.dev", senha: "Teste@123", turmas: ["4ºA", "4ºB", "5ºA", "5ºB", "5ºC"] },
  { role: "aluno", nome: "Ana Beatriz (Aluna Teste)", email: "aluno1@teste.dev", senha: "Teste@123", matricula: "2024-0001", turma: "2ºA" },
  { role: "aluno", nome: "Bruno Costa (Aluno Teste)", email: "aluno2@teste.dev", senha: "Teste@123", matricula: "2024-0002", turma: "3ºB" },
  { role: "aluno", nome: "Carla Dias (Aluna Teste)", email: "aluno3@teste.dev", senha: "Teste@123", matricula: "2024-0003", turma: "4ºA" },
  { role: "aluno", nome: "Diego Farias (Aluno Teste)", email: "aluno4@teste.dev", senha: "Teste@123", matricula: "2024-0004", turma: "5ºA" },
];

let _turmasCache = null;

function normaliza(nome) {
  return nome.replace(/\s+/g, "").toLowerCase();
}

async function getTurmaIdPorNome(nome) {
  if (!_turmasCache) {
    const { data, error } = await supabase.from("turmas").select("id, nome");
    if (error) throw error;
    _turmasCache = data ?? [];
  }
  const alvo = normaliza(nome);
  const encontrada = _turmasCache.find((t) => normaliza(t.nome) === alvo);
  if (!encontrada) {
    throw new Error(`Turma "${nome}" não encontrada. Rode as migrations (005_dados_iniciais.sql) antes deste script.`);
  }
  return encontrada.id;
}

async function jaExiste(email) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email.toLowerCase()).maybeSingle();
  return data?.id ?? null;
}

async function main() {
  console.log("Criando usuários de teste...\n");
  const criados = [];

  for (const u of USUARIOS) {
    const existenteId = await jaExiste(u.email);
    if (existenteId) {
      console.log(`↷ ${u.email} já existe, pulando.`);
      criados.push({ ...u, pulado: true });
      continue;
    }

    const { data: created, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.senha,
      email_confirm: true,
      app_metadata: { role: u.role, provisionado: true },
      user_metadata: { nome: u.nome },
    });
    if (error || !created.user) {
      console.error(`✗ Erro ao criar ${u.email}:`, error?.message);
      continue;
    }
    const userId = created.user.id;

    try {
      if (u.role === "aluno") {
        const turmaId = await getTurmaIdPorNome(u.turma);
        const { error: e } = await supabase.from("alunos").insert({ profile_id: userId, matricula: u.matricula, turma_id: turmaId });
        if (e) throw e;
      } else if (u.role === "professor") {
        const { data: prof, error: e } = await supabase.from("professores").insert({ profile_id: userId }).select("id").single();
        if (e) throw e;
        const turmaIds = await Promise.all(u.turmas.map(getTurmaIdPorNome));
        const { error: e2 } = await supabase.from("professor_turmas").insert(turmaIds.map((turma_id) => ({ professor_id: prof.id, turma_id })));
        if (e2) throw e2;
      }
      console.log(`✓ ${u.role.padEnd(10)} ${u.email}`);
      criados.push(u);
    } catch (err) {
      console.error(`✗ Erro ao configurar cadastro de ${u.email}:`, err.message);
      await supabase.auth.admin.deleteUser(userId);
    }
  }

  console.log("\n--------------------------------------------------------");
  console.log("Credenciais de teste (⚠️  apenas para desenvolvimento):");
  console.log("--------------------------------------------------------");
  for (const u of USUARIOS) {
    console.log(`${u.role.padEnd(10)} ${u.email.padEnd(24)} senha: ${u.senha}`);
  }
  console.log("--------------------------------------------------------\n");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
