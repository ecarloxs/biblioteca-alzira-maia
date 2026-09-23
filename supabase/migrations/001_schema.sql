-- =============================================================================
-- BIBLIOTECA ESCOLAR — ESCOLA ALZIRA MAIA
-- 001 · Esquema: tabelas, constraints, índices e triggers básicos
-- Execute os arquivos 001 → 005 em ordem (ou use 00_setup_completo.sql).
-- =============================================================================

-- Fuso horário da escola (Paraíba = America/Recife, UTC-3)
create or replace function public.hoje_local()
returns date language sql stable as $$
  select (now() at time zone 'America/Recife')::date
$$;

-- -----------------------------------------------------------------------------
-- profiles  (1:1 com auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null,
  role        text not null default 'aluno' check (role in ('admin','professor','aluno')),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));
create index profiles_role_idx on public.profiles (role);

-- -----------------------------------------------------------------------------
-- turmas
-- -----------------------------------------------------------------------------
create table public.turmas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  ano         smallint check (ano between 1 and 12),
  turno       text check (turno in ('manha','tarde','noite','integral')),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- alunos / professores
-- -----------------------------------------------------------------------------
create table public.alunos (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles(id) on delete restrict,
  matricula   text not null unique,
  turma_id    uuid references public.turmas(id) on delete restrict,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index alunos_turma_idx on public.alunos (turma_id);

create table public.professores (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles(id) on delete restrict,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Turmas em que cada professor atua (define o que ele enxerga)
create table public.professor_turmas (
  professor_id uuid not null references public.professores(id) on delete cascade,
  turma_id     uuid not null references public.turmas(id) on delete cascade,
  primary key (professor_id, turma_id)
);
create index professor_turmas_turma_idx on public.professor_turmas (turma_id);

-- -----------------------------------------------------------------------------
-- livros e exemplares
-- -----------------------------------------------------------------------------
create table public.livros (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  autor           text not null,
  editora         text,
  isbn            text,
  ano_publicacao  smallint check (ano_publicacao between 1000 and 2100),
  categoria       text not null default 'Geral',
  descricao       text,
  capa_url        text,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index livros_categoria_idx on public.livros (categoria);
create index livros_titulo_idx on public.livros (lower(titulo));

-- Código único de cada exemplar: ALZ-000001, ALZ-000002, ... (usado no QR Code)
create sequence public.exemplar_codigo_seq start 1;

create table public.exemplares (
  id               uuid primary key default gen_random_uuid(),
  livro_id         uuid not null references public.livros(id) on delete restrict,
  codigo_exemplar  text not null unique
                   default ('ALZ-' || lpad(nextval('public.exemplar_codigo_seq')::text, 6, '0')),
  status           text not null default 'disponivel'
                   check (status in ('disponivel','reservado','emprestado','manutencao','perdido','inativo')),
  condicao         text not null default 'bom'
                   check (condicao in ('novo','bom','regular','danificado')),
  localizacao      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index exemplares_livro_idx on public.exemplares (livro_id);
create index exemplares_status_idx on public.exemplares (status);

-- -----------------------------------------------------------------------------
-- reservas
-- (livro_id é redundante de propósito: permite garantir por índice único
--  que o aluno não tenha duas reservas ativas do mesmo livro)
-- -----------------------------------------------------------------------------
create table public.reservas (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.alunos(id) on delete restrict,
  livro_id      uuid not null references public.livros(id) on delete restrict,
  exemplar_id   uuid not null references public.exemplares(id) on delete restrict,
  data_reserva  timestamptz not null default now(),
  expira_em     timestamptz not null,
  status        text not null default 'ativa' check (status in ('ativa','atendida','cancelada','expirada')),
  observacao    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index reservas_aluno_livro_ativa_uq on public.reservas (aluno_id, livro_id) where status = 'ativa';
create unique index reservas_exemplar_ativa_uq on public.reservas (exemplar_id) where status = 'ativa';
create index reservas_aluno_idx on public.reservas (aluno_id);
create index reservas_status_idx on public.reservas (status);

-- -----------------------------------------------------------------------------
-- emprestimos
-- professor_retirada_id referencia profiles (professor OU administrador que
-- entregou o livro), para que a gestão também possa registrar retiradas.
-- reserva_id é opcional: empréstimos diretos (sem reserva) também são permitidos.
-- -----------------------------------------------------------------------------
create table public.emprestimos (
  id                      uuid primary key default gen_random_uuid(),
  reserva_id              uuid unique references public.reservas(id) on delete restrict,
  aluno_id                uuid not null references public.alunos(id) on delete restrict,
  exemplar_id             uuid not null references public.exemplares(id) on delete restrict,
  professor_retirada_id   uuid not null references public.profiles(id) on delete restrict,
  data_retirada           timestamptz not null default now(),
  prazo_devolucao         date not null,
  status                  text not null default 'ativo' check (status in ('ativo','devolvido','atrasado','perdido')),
  observacao              text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
-- Um exemplar nunca pode ter dois empréstimos abertos ao mesmo tempo
create unique index emprestimos_exemplar_aberto_uq on public.emprestimos (exemplar_id) where status in ('ativo','atrasado');
create index emprestimos_aluno_idx on public.emprestimos (aluno_id);
create index emprestimos_status_prazo_idx on public.emprestimos (status, prazo_devolucao);
create index emprestimos_retirada_idx on public.emprestimos (data_retirada);

-- -----------------------------------------------------------------------------
-- devolucoes
-- -----------------------------------------------------------------------------
create table public.devolucoes (
  id                        uuid primary key default gen_random_uuid(),
  emprestimo_id             uuid not null unique references public.emprestimos(id) on delete restrict,
  professor_devolucao_id    uuid not null references public.profiles(id) on delete restrict,
  data_devolucao            timestamptz not null default now(),
  condicao_devolucao        text not null check (condicao_devolucao in ('novo','bom','regular','danificado','perdido')),
  observacao                text,
  created_at                timestamptz not null default now()
);
create index devolucoes_data_idx on public.devolucoes (data_devolucao);

-- -----------------------------------------------------------------------------
-- logs (auditoria: quem fez o quê)
-- usuario_nome é um "retrato" do nome na hora da ação (o histórico não muda
-- mesmo que o cadastro seja alterado depois).
-- -----------------------------------------------------------------------------
create table public.logs (
  id            bigint generated always as identity primary key,
  usuario_id    uuid references public.profiles(id) on delete set null,
  usuario_nome  text,
  acao          text not null,
  entidade      text not null,
  entidade_id   text,
  detalhes      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index logs_created_idx on public.logs (created_at desc);
create index logs_usuario_idx on public.logs (usuario_id);
create index logs_entidade_idx on public.logs (entidade, entidade_id);

-- -----------------------------------------------------------------------------
-- configuracoes (regras da biblioteca)
-- -----------------------------------------------------------------------------
create table public.configuracoes (
  chave       text primary key,
  valor       text not null,
  descricao   text,
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Trigger genérico de updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_profiles_updated      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger trg_livros_updated        before update on public.livros        for each row execute function public.set_updated_at();
create trigger trg_exemplares_updated    before update on public.exemplares    for each row execute function public.set_updated_at();
create trigger trg_reservas_updated      before update on public.reservas      for each row execute function public.set_updated_at();
create trigger trg_emprestimos_updated   before update on public.emprestimos   for each row execute function public.set_updated_at();
create trigger trg_configuracoes_updated before update on public.configuracoes for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Criação automática do profile quando um usuário é criado no Supabase Auth.
--
-- SEGURANÇA: o papel (role) é lido de raw_app_meta_data, que só pode ser
-- definido com a service_role key (servidor) — nunca de user_metadata, que o
-- próprio usuário consegue editar. Contas criadas fora do painel da escola
-- (ex.: auto-cadastro, caso esteja habilitado por engano) nascem INATIVAS.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_app_meta_data->>'role', 'aluno');
  v_ativo boolean := coalesce((new.raw_app_meta_data->>'provisionado')::boolean, false);
begin
  if v_role not in ('admin','professor','aluno') then
    v_role := 'aluno';
  end if;

  insert into public.profiles (id, nome, email, role, ativo)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    v_role,
    v_ativo
  )
  on conflict (id) do nothing;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
