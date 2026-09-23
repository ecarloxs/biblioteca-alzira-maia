-- =============================================================================
-- BIBLIOTECA ESCOLAR — ALZIRA MAIA · SETUP COMPLETO (001 → 005)
-- Cole tudo no Supabase > SQL Editor e clique em RUN. Dados demo: supabase/seed_demo.sql
-- =============================================================================

-- ########## 001_schema.sql ##########
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

-- ########## 002_funcoes_e_regras.sql ##########
-- =============================================================================
-- 002 · Funções auxiliares, auditoria e REGRAS DE NEGÓCIO (RPCs)
--
-- Todas as operações que mudam estado (reservar, retirar, devolver...) são
-- funções SECURITY DEFINER que validam o perfil de quem chama (auth.uid()) e
-- executam tudo de forma atômica. O frontend só usa a anon key.
-- =============================================================================

-- ------------------------------------------------------------------ helpers --
create or replace function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and ativo
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() = 'admin', false)
$$;

create or replace function public.is_professor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() = 'professor', false)
$$;

create or replace function public.is_aluno()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() = 'aluno', false)
$$;

create or replace function public.my_aluno_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.alunos where profile_id = auth.uid() and ativo
$$;

create or replace function public.my_professor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.professores where profile_id = auth.uid() and ativo
$$;

-- O professor enxerga apenas alunos das turmas às quais está vinculado
create or replace function public.professor_ve_aluno(p_aluno_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.alunos a
    join public.professor_turmas pt on pt.turma_id = a.turma_id
    join public.professores p on p.id = pt.professor_id
    where a.id = p_aluno_id
      and p.profile_id = auth.uid()
      and p.ativo
      and public.is_professor()
  )
$$;

create or replace function public.pode_gerir_aluno(p_aluno_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.professor_ve_aluno(p_aluno_id)
$$;

create or replace function public.config_int(p_chave text, p_default int)
returns int language sql stable security definer set search_path = public as $$
  select coalesce((select valor::int from public.configuracoes where chave = p_chave), p_default)
$$;

create or replace function public.config_bool(p_chave text, p_default boolean)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select valor::boolean from public.configuracoes where chave = p_chave), p_default)
$$;

-- --------------------------------------------------------------- auditoria --
create or replace function public._log(p_acao text, p_entidade text, p_entidade_id text, p_detalhes jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.logs (usuario_id, usuario_nome, acao, entidade, entidade_id, detalhes)
  values (
    auth.uid(),
    (select nome from public.profiles where id = auth.uid()),
    p_acao, p_entidade, p_entidade_id, coalesce(p_detalhes, '{}'::jsonb)
  );
end $$;

-- Trigger genérico para cadastros (livros, turmas, alunos, professores...)
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_ref jsonb;
begin
  if tg_op in ('UPDATE','DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT','UPDATE') then v_new := to_jsonb(new); end if;
  v_ref := coalesce(v_new, v_old);

  insert into public.logs (usuario_id, usuario_nome, acao, entidade, entidade_id, detalhes)
  values (
    auth.uid(),
    (select nome from public.profiles where id = auth.uid()),
    lower(tg_op) || '_' || tg_table_name,
    tg_table_name,
    coalesce(v_ref->>'id', v_ref->>'chave', (v_ref->>'professor_id') || ':' || (v_ref->>'turma_id')),
    jsonb_build_object('antes', v_old, 'depois', v_new)
  );
  return null;
end $$;

create trigger audit_livros         after insert or update or delete on public.livros           for each row execute function public.audit_trigger();
create trigger audit_turmas         after insert or update or delete on public.turmas           for each row execute function public.audit_trigger();
create trigger audit_alunos         after insert or update or delete on public.alunos           for each row execute function public.audit_trigger();
create trigger audit_professores    after insert or update or delete on public.professores      for each row execute function public.audit_trigger();
create trigger audit_prof_turmas    after insert or update or delete on public.professor_turmas for each row execute function public.audit_trigger();
create trigger audit_configuracoes  after insert or update or delete on public.configuracoes    for each row execute function public.audit_trigger();
create trigger audit_profiles_upd   after update on public.profiles                             for each row execute function public.audit_trigger();
-- Exemplares: cadastro/remoção e edição de dados (mudanças de status vêm das RPCs, já auditadas)
create trigger audit_exemplares_ins after insert or delete on public.exemplares                 for each row execute function public.audit_trigger();
create trigger audit_exemplares_upd after update of livro_id, codigo_exemplar, localizacao on public.exemplares for each row execute function public.audit_trigger();

-- ---------------------------------------------- proteção do status do exemplar --
-- Status "reservado"/"emprestado" só podem ser alterados pelas RPCs abaixo
-- (que sinalizam app.internal = 1). Assim ninguém "solta" um exemplar
-- emprestado nem marca um exemplar como emprestado manualmente.
create or replace function public.exemplar_status_guard()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.internal', true), '') <> '1' then
    if old.status in ('reservado','emprestado') or new.status in ('reservado','emprestado') then
      raise exception 'O status "reservado" ou "emprestado" só muda por reserva, retirada ou devolução.';
    end if;
  end if;
  return new;
end $$;

create trigger trg_exemplar_status_guard
  before update on public.exemplares
  for each row execute function public.exemplar_status_guard();

-- ------------------------------------------------------ manutenção periódica --
-- Expira reservas vencidas e liberta o exemplar.
create or replace function public.expirar_reservas()
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  perform set_config('app.internal', '1', true);
  with exp as (
    update public.reservas set status = 'expirada'
    where status = 'ativa' and expira_em < now()
    returning id, exemplar_id
  ),
  lib as (
    update public.exemplares e set status = 'disponivel'
    from exp where e.id = exp.exemplar_id and e.status = 'reservado'
    returning e.id
  )
  select count(*) into v_n from exp;
  return v_n;
end $$;

-- Reflete no banco os empréstimos cujo prazo passou (a tela também calcula
-- o atraso em tempo real, então nada depende só disto).
create or replace function public.sync_atrasos()
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  update public.emprestimos set status = 'atrasado'
  where status = 'ativo' and prazo_devolucao < public.hoje_local();
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.manutencao_periodica()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.expirar_reservas();
  perform public.sync_atrasos();
end $$;
-- Opcional (Supabase > Database > Extensions > pg_cron):
--   select cron.schedule('biblioteca-manutencao', '*/15 * * * *', 'select public.manutencao_periodica()');

-- ------------------------------------------------------------ RESERVAR LIVRO --
create or replace function public.reservar_livro(p_livro_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_aluno   uuid;
  v_livro   public.livros%rowtype;
  v_ex      uuid;
  v_res     uuid;
  v_max     int;
  v_abertos int;
begin
  perform set_config('app.internal', '1', true);
  if not public.is_aluno() then
    raise exception 'Apenas alunos podem reservar livros.';
  end if;
  perform public.manutencao_periodica();

  v_aluno := public.my_aluno_id();
  if v_aluno is null then
    raise exception 'Seu cadastro de aluno não foi encontrado ou está inativo.';
  end if;

  select * into v_livro from public.livros where id = p_livro_id and ativo;
  if not found then
    raise exception 'Este livro não está disponível no catálogo.';
  end if;

  if exists (select 1 from public.reservas where aluno_id = v_aluno and livro_id = p_livro_id and status = 'ativa') then
    raise exception 'Você já possui uma reserva ativa para este livro.';
  end if;

  if public.config_bool('bloquear_reserva_com_atraso', true) and exists (
    select 1 from public.emprestimos
    where aluno_id = v_aluno and status in ('ativo','atrasado') and prazo_devolucao < public.hoje_local()
  ) then
    raise exception 'Você tem livro em atraso. Devolva-o antes de fazer novas reservas.';
  end if;

  v_max := public.config_int('max_emprestimos_por_aluno', 2);
  select (select count(*) from public.reservas where aluno_id = v_aluno and status = 'ativa')
       + (select count(*) from public.emprestimos where aluno_id = v_aluno and status in ('ativo','atrasado'))
    into v_abertos;
  if v_abertos >= v_max then
    raise exception 'Você já atingiu o limite de % livro(s) ao mesmo tempo.', v_max;
  end if;

  select id into v_ex
  from public.exemplares
  where livro_id = p_livro_id and status = 'disponivel'
  order by codigo_exemplar
  limit 1
  for update skip locked;

  if v_ex is null then
    raise exception 'Não há exemplares disponíveis deste livro no momento.';
  end if;

  insert into public.reservas (aluno_id, livro_id, exemplar_id, expira_em)
  values (v_aluno, p_livro_id, v_ex, now() + make_interval(days => public.config_int('validade_reserva_dias', 2)))
  returning id into v_res;

  update public.exemplares set status = 'reservado' where id = v_ex;

  perform public._log('aluno_reservou_livro', 'reservas', v_res::text,
    jsonb_build_object('livro_id', p_livro_id, 'livro_titulo', v_livro.titulo, 'exemplar_id', v_ex,
      'aluno_nome', (select nome from public.profiles where id = auth.uid())));
  return v_res;
exception when unique_violation then
  raise exception 'Você já possui uma reserva ativa para este livro.';
end $$;

-- --------------------------------------------------------- CANCELAR RESERVA --
create or replace function public.cancelar_reserva(p_reserva_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.reservas%rowtype;
  v_titulo text;
begin
  perform set_config('app.internal', '1', true);
  select * into r from public.reservas where id = p_reserva_id for update;
  if not found then raise exception 'Reserva não encontrada.'; end if;

  if not (
    public.is_admin()
    or (public.is_aluno() and r.aluno_id = public.my_aluno_id())
    or (public.is_professor() and public.professor_ve_aluno(r.aluno_id))
  ) then
    raise exception 'Você não tem permissão para cancelar esta reserva.';
  end if;

  if r.status <> 'ativa' then
    raise exception 'Esta reserva não está mais ativa.';
  end if;

  update public.reservas set status = 'cancelada' where id = r.id;
  update public.exemplares set status = 'disponivel' where id = r.exemplar_id and status = 'reservado';

  select titulo into v_titulo from public.livros where id = r.livro_id;
  perform public._log('reserva_cancelada', 'reservas', r.id::text,
    jsonb_build_object('livro_titulo', v_titulo, 'aluno_id', r.aluno_id,
      'aluno_nome', (select p.nome from public.alunos a join public.profiles p on p.id = a.profile_id where a.id = r.aluno_id)));
end $$;

-- ------------------------------------------------------- CONFIRMAR RETIRADA --
create or replace function public.confirmar_retirada(p_reserva_id uuid, p_prazo date default null, p_observacao text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  r public.reservas%rowtype;
  v_prazo date;
  v_emp uuid;
  v_titulo text;
  v_cod text;
begin
  perform set_config('app.internal', '1', true);
  if not (public.is_admin() or public.is_professor()) then
    raise exception 'Apenas professores ou a gestão podem confirmar retiradas.';
  end if;
  perform public.expirar_reservas();

  select * into r from public.reservas where id = p_reserva_id for update;
  if not found then raise exception 'Reserva não encontrada.'; end if;
  if not public.pode_gerir_aluno(r.aluno_id) then
    raise exception 'Este aluno não pertence às suas turmas.';
  end if;
  if r.status <> 'ativa' then
    raise exception 'Esta reserva não está mais ativa (status: %).', r.status;
  end if;
  if not exists (select 1 from public.alunos where id = r.aluno_id and ativo) then
    raise exception 'O cadastro do aluno está inativo.';
  end if;

  v_prazo := coalesce(p_prazo, public.hoje_local() + public.config_int('prazo_padrao_dias', 7));
  if v_prazo < public.hoje_local() then
    raise exception 'O prazo de devolução não pode estar no passado.';
  end if;

  insert into public.emprestimos (reserva_id, aluno_id, exemplar_id, professor_retirada_id, prazo_devolucao, observacao)
  values (r.id, r.aluno_id, r.exemplar_id, auth.uid(), v_prazo, nullif(trim(p_observacao), ''))
  returning id into v_emp;

  update public.reservas set status = 'atendida' where id = r.id;
  update public.exemplares set status = 'emprestado' where id = r.exemplar_id;

  select l.titulo, x.codigo_exemplar into v_titulo, v_cod
    from public.exemplares x join public.livros l on l.id = x.livro_id where x.id = r.exemplar_id;

  perform public._log('professor_registrou_emprestimo', 'emprestimos', v_emp::text,
    jsonb_build_object('livro_titulo', v_titulo, 'codigo_exemplar', v_cod, 'prazo_devolucao', v_prazo, 'reserva_id', r.id,
      'aluno_nome', (select p.nome from public.alunos a join public.profiles p on p.id = a.profile_id where a.id = r.aluno_id)));
  return v_emp;
end $$;

-- ----------------------------------------------- EMPRÉSTIMO DIRETO (sem reserva) --
create or replace function public.registrar_emprestimo_direto(p_aluno_id uuid, p_exemplar_id uuid, p_prazo date default null, p_observacao text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_ex public.exemplares%rowtype;
  v_prazo date;
  v_emp uuid;
  v_titulo text;
  v_abertos int;
  v_max int;
begin
  perform set_config('app.internal', '1', true);
  if not (public.is_admin() or public.is_professor()) then
    raise exception 'Apenas professores ou a gestão podem registrar empréstimos.';
  end if;
  perform public.expirar_reservas();

  if not public.pode_gerir_aluno(p_aluno_id) then
    raise exception 'Este aluno não pertence às suas turmas.';
  end if;
  if not exists (select 1 from public.alunos where id = p_aluno_id and ativo) then
    raise exception 'O cadastro do aluno está inativo.';
  end if;

  select * into v_ex from public.exemplares where id = p_exemplar_id for update;
  if not found then raise exception 'Exemplar não encontrado.'; end if;
  if v_ex.status <> 'disponivel' then
    raise exception 'Este exemplar não está disponível (status: %).', v_ex.status;
  end if;

  if exists (select 1 from public.reservas where aluno_id = p_aluno_id and livro_id = v_ex.livro_id and status = 'ativa') then
    raise exception 'Este aluno tem reserva ativa deste livro. Use "Confirmar retirada" na reserva.';
  end if;

  v_max := public.config_int('max_emprestimos_por_aluno', 2);
  select (select count(*) from public.reservas where aluno_id = p_aluno_id and status = 'ativa')
       + (select count(*) from public.emprestimos where aluno_id = p_aluno_id and status in ('ativo','atrasado'))
    into v_abertos;
  if v_abertos >= v_max then
    raise exception 'O aluno já atingiu o limite de % livro(s) ao mesmo tempo.', v_max;
  end if;

  v_prazo := coalesce(p_prazo, public.hoje_local() + public.config_int('prazo_padrao_dias', 7));
  if v_prazo < public.hoje_local() then
    raise exception 'O prazo de devolução não pode estar no passado.';
  end if;

  insert into public.emprestimos (aluno_id, exemplar_id, professor_retirada_id, prazo_devolucao, observacao)
  values (p_aluno_id, p_exemplar_id, auth.uid(), v_prazo, nullif(trim(p_observacao), ''))
  returning id into v_emp;

  update public.exemplares set status = 'emprestado' where id = p_exemplar_id;

  select titulo into v_titulo from public.livros where id = v_ex.livro_id;
  perform public._log('professor_registrou_emprestimo', 'emprestimos', v_emp::text,
    jsonb_build_object('livro_titulo', v_titulo, 'codigo_exemplar', v_ex.codigo_exemplar, 'prazo_devolucao', v_prazo, 'direto', true,
      'aluno_nome', (select p.nome from public.alunos a join public.profiles p on p.id = a.profile_id where a.id = p_aluno_id)));
  return v_emp;
end $$;

-- ------------------------------------------------------ REGISTRAR DEVOLUÇÃO --
create or replace function public.registrar_devolucao(p_emprestimo_id uuid, p_condicao text, p_observacao text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e public.emprestimos%rowtype;
  v_dev uuid;
  v_titulo text;
  v_cod text;
  v_livro uuid;
  v_dias_atraso int;
begin
  perform set_config('app.internal', '1', true);
  if not (public.is_admin() or public.is_professor()) then
    raise exception 'Apenas professores ou a gestão podem registrar devoluções.';
  end if;
  if p_condicao is null or p_condicao not in ('novo','bom','regular','danificado','perdido') then
    raise exception 'Informe a condição do livro.';
  end if;

  select * into e from public.emprestimos where id = p_emprestimo_id for update;
  if not found then raise exception 'Empréstimo não encontrado.'; end if;
  if not public.pode_gerir_aluno(e.aluno_id) then
    raise exception 'Este aluno não pertence às suas turmas.';
  end if;
  if e.status not in ('ativo','atrasado') then
    raise exception 'Só é possível registrar devolução de um empréstimo ativo.';
  end if;

  insert into public.devolucoes (emprestimo_id, professor_devolucao_id, condicao_devolucao, observacao)
  values (e.id, auth.uid(), p_condicao, nullif(trim(p_observacao), ''))
  returning id into v_dev;

  if p_condicao = 'perdido' then
    update public.emprestimos set status = 'perdido' where id = e.id;
    update public.exemplares set status = 'perdido' where id = e.exemplar_id;
  elsif p_condicao = 'danificado' then
    update public.emprestimos set status = 'devolvido' where id = e.id;
    update public.exemplares set status = 'manutencao', condicao = 'danificado' where id = e.exemplar_id;
  else
    update public.emprestimos set status = 'devolvido' where id = e.id;
    update public.exemplares set status = 'disponivel', condicao = p_condicao where id = e.exemplar_id;
  end if;

  select l.titulo, x.codigo_exemplar, l.id into v_titulo, v_cod, v_livro
    from public.exemplares x join public.livros l on l.id = x.livro_id where x.id = e.exemplar_id;
  v_dias_atraso := greatest(public.hoje_local() - e.prazo_devolucao, 0);

  perform public._log('professor_registrou_devolucao', 'devolucoes', v_dev::text,
    jsonb_build_object('emprestimo_id', e.id, 'livro_titulo', v_titulo, 'codigo_exemplar', v_cod,
      'condicao', p_condicao, 'dias_atraso', v_dias_atraso,
      'aluno_nome', (select p.nome from public.alunos a join public.profiles p on p.id = a.profile_id where a.id = e.aluno_id)));
  return v_dev;
end $$;

-- ---------------------------------------------------------- ALTERAR PRAZO --
create or replace function public.alterar_prazo_emprestimo(p_emprestimo_id uuid, p_novo_prazo date, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  e public.emprestimos%rowtype;
  v_titulo text;
begin
  if not (public.is_admin() or public.is_professor()) then
    raise exception 'Apenas professores ou a gestão podem alterar prazos.';
  end if;
  select * into e from public.emprestimos where id = p_emprestimo_id for update;
  if not found then raise exception 'Empréstimo não encontrado.'; end if;
  if not public.pode_gerir_aluno(e.aluno_id) then
    raise exception 'Este aluno não pertence às suas turmas.';
  end if;
  if e.status not in ('ativo','atrasado') then
    raise exception 'Só é possível alterar o prazo de empréstimos em aberto.';
  end if;
  if p_novo_prazo is null or p_novo_prazo < (e.data_retirada at time zone 'America/Recife')::date then
    raise exception 'O novo prazo não pode ser anterior à data da retirada.';
  end if;

  update public.emprestimos
     set prazo_devolucao = p_novo_prazo,
         status = case when p_novo_prazo < public.hoje_local() then 'atrasado' else 'ativo' end
   where id = e.id;

  select l.titulo into v_titulo from public.exemplares x join public.livros l on l.id = x.livro_id where x.id = e.exemplar_id;
  perform public._log('prazo_alterado', 'emprestimos', e.id::text,
    jsonb_build_object('livro_titulo', v_titulo, 'prazo_anterior', e.prazo_devolucao, 'prazo_novo', p_novo_prazo, 'motivo', nullif(trim(p_motivo), ''),
      'aluno_nome', (select p.nome from public.alunos a join public.profiles p on p.id = a.profile_id where a.id = e.aluno_id)));
end $$;

-- -------------------------------------------------------- DASHBOARD DO ADMIN --
create or replace function public.admin_dashboard()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso restrito à gestão.';
  end if;
  perform public.manutencao_periodica();

  return jsonb_build_object(
    'total_livros',      (select count(*) from public.livros where ativo),
    'total_exemplares',  (select count(*) from public.exemplares where status <> 'inativo'),
    'disponiveis',       (select count(*) from public.exemplares where status = 'disponivel'),
    'emprestados',       (select count(*) from public.exemplares where status = 'emprestado'),
    'reservados',        (select count(*) from public.exemplares where status = 'reservado'),
    'atrasados',         (select count(*) from public.emprestimos where status = 'atrasado'
                            or (status = 'ativo' and prazo_devolucao < public.hoje_local())),
    'alunos',            (select count(*) from public.alunos where ativo),
    'professores',       (select count(*) from public.professores where ativo),
    'por_mes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'mes', to_char(m, 'YYYY-MM'),
        'emprestimos', (select count(*) from public.emprestimos e
                        where date_trunc('month', e.data_retirada at time zone 'America/Recife') = m),
        'devolucoes',  (select count(*) from public.devolucoes d
                        where date_trunc('month', d.data_devolucao at time zone 'America/Recife') = m)
      ) order by m), '[]'::jsonb)
      from generate_series(
        date_trunc('month', now() at time zone 'America/Recife') - interval '5 months',
        date_trunc('month', now() at time zone 'America/Recife'),
        interval '1 month') m
    ),
    'mais_emprestados', (
      select coalesce(jsonb_agg(t order by t.total desc, t.titulo), '[]'::jsonb)
      from (
        select l.titulo, count(*) as total
        from public.emprestimos e
        join public.exemplares x on x.id = e.exemplar_id
        join public.livros l on l.id = x.livro_id
        group by l.titulo order by total desc, l.titulo limit 5
      ) t
    ),
    'turmas_mais_ativas', (
      select coalesce(jsonb_agg(t order by t.total desc, t.turma), '[]'::jsonb)
      from (
        select tu.nome as turma, count(*) as total
        from public.emprestimos e
        join public.alunos a on a.id = e.aluno_id
        join public.turmas tu on tu.id = a.turma_id
        group by tu.nome order by total desc, tu.nome limit 6
      ) t
    )
  );
end $$;

-- ########## 003_views.sql ##########
-- =============================================================================
-- 003 · Views de leitura
-- Todas usam security_invoker = true: as políticas RLS de cada tabela
-- continuam valendo para quem consulta (aluno vê só o dele, etc.).
-- O status "atrasado" é calculado em tempo real (status_efetivo / dias_atraso).
-- =============================================================================

create or replace view public.v_livros_catalogo with (security_invoker = true) as
select
  l.*,
  coalesce(c.total, 0)       as total_exemplares,
  coalesce(c.disponiveis, 0) as disponiveis,
  coalesce(c.reservados, 0)  as reservados,
  coalesce(c.emprestados, 0) as emprestados
from public.livros l
left join (
  select livro_id,
         count(*) filter (where status <> 'inativo')    as total,
         count(*) filter (where status = 'disponivel')  as disponiveis,
         count(*) filter (where status = 'reservado')   as reservados,
         count(*) filter (where status = 'emprestado')  as emprestados
  from public.exemplares
  group by livro_id
) c on c.livro_id = l.id;

create or replace view public.v_alunos with (security_invoker = true) as
select
  a.id, a.profile_id, a.matricula, a.turma_id, a.ativo, a.created_at,
  p.nome, p.email,
  t.nome as turma_nome
from public.alunos a
join public.profiles p on p.id = a.profile_id
left join public.turmas t on t.id = a.turma_id;

create or replace view public.v_reservas with (security_invoker = true) as
select
  r.id, r.aluno_id, r.livro_id, r.exemplar_id,
  r.data_reserva, r.expira_em, r.status, r.observacao,
  l.titulo as livro_titulo, l.autor as livro_autor, l.capa_url,
  x.codigo_exemplar,
  p.nome as aluno_nome, a.matricula as aluno_matricula,
  a.turma_id, t.nome as turma_nome
from public.reservas r
join public.livros l on l.id = r.livro_id
join public.exemplares x on x.id = r.exemplar_id
join public.alunos a on a.id = r.aluno_id
left join public.profiles p on p.id = a.profile_id
left join public.turmas t on t.id = a.turma_id;

create or replace view public.v_emprestimos with (security_invoker = true) as
select
  e.id, e.reserva_id, e.aluno_id, e.exemplar_id,
  x.livro_id, l.titulo as livro_titulo, l.autor as livro_autor, l.capa_url,
  x.codigo_exemplar,
  pa.nome as aluno_nome, a.matricula as aluno_matricula,
  a.turma_id, t.nome as turma_nome,
  e.professor_retirada_id, pr.nome as professor_retirada_nome,
  e.data_retirada, e.prazo_devolucao, e.status,
  case when e.status = 'ativo' and e.prazo_devolucao < public.hoje_local()
       then 'atrasado' else e.status end as status_efetivo,
  case when e.status in ('ativo','atrasado') and e.prazo_devolucao < public.hoje_local()
       then (public.hoje_local() - e.prazo_devolucao) else 0 end as dias_atraso,
  e.observacao,
  d.id as devolucao_id, d.data_devolucao, d.professor_devolucao_id,
  pd.nome as professor_devolucao_nome,
  d.condicao_devolucao, d.observacao as devolucao_observacao,
  e.created_at
from public.emprestimos e
join public.exemplares x on x.id = e.exemplar_id
join public.livros l on l.id = x.livro_id
join public.alunos a on a.id = e.aluno_id
left join public.profiles pa on pa.id = a.profile_id
left join public.turmas t on t.id = a.turma_id
left join public.profiles pr on pr.id = e.professor_retirada_id
left join public.devolucoes d on d.emprestimo_id = e.id
left join public.profiles pd on pd.id = d.professor_devolucao_id;

-- ########## 004_rls_policies.sql ##########
-- =============================================================================
-- 004 · Row Level Security (RLS), grants e Storage
--
-- Regras:
--  • Ninguém acessa nada sem estar autenticado (anon não tem acesso algum).
--  • Escritas de reservas/empréstimos/devoluções/logs NÃO têm policy de
--    INSERT/UPDATE/DELETE: só acontecem pelas funções RPC (SECURITY DEFINER).
--  • Não existe DELETE em tabelas históricas → nada é apagado sem rastro.
-- =============================================================================

alter table public.profiles         enable row level security;
alter table public.turmas           enable row level security;
alter table public.alunos           enable row level security;
alter table public.professores      enable row level security;
alter table public.professor_turmas enable row level security;
alter table public.livros           enable row level security;
alter table public.exemplares       enable row level security;
alter table public.reservas         enable row level security;
alter table public.emprestimos      enable row level security;
alter table public.devolucoes       enable row level security;
alter table public.logs             enable row level security;
alter table public.configuracoes    enable row level security;

-- profiles ---------------------------------------------------------------
-- Cada um vê o próprio perfil; admin vê todos; todos veem nome de professores
-- e gestores (necessário para mostrar "quem entregou/recebeu");
-- professor vê perfis dos alunos das suas turmas.
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or public.is_admin()
  or role in ('professor','admin')
  or (public.is_professor() and exists (
        select 1 from public.alunos a
        where a.profile_id = profiles.id and public.professor_ve_aluno(a.id)))
);
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- turmas -----------------------------------------------------------------
create policy turmas_select on public.turmas for select to authenticated using (true);
create policy turmas_insert on public.turmas for insert to authenticated with check (public.is_admin());
create policy turmas_update on public.turmas for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- alunos -----------------------------------------------------------------
create policy alunos_select on public.alunos for select to authenticated using (
  public.is_admin() or profile_id = auth.uid() or public.professor_ve_aluno(id)
);
create policy alunos_insert on public.alunos for insert to authenticated with check (public.is_admin());
create policy alunos_update on public.alunos for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- professores ------------------------------------------------------------
create policy professores_select on public.professores for select to authenticated using (
  public.is_admin() or profile_id = auth.uid()
);
create policy professores_insert on public.professores for insert to authenticated with check (public.is_admin());
create policy professores_update on public.professores for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- professor_turmas -------------------------------------------------------
create policy prof_turmas_select on public.professor_turmas for select to authenticated using (
  public.is_admin() or professor_id = public.my_professor_id()
);
create policy prof_turmas_insert on public.professor_turmas for insert to authenticated with check (public.is_admin());
create policy prof_turmas_delete on public.professor_turmas for delete to authenticated using (public.is_admin());

-- livros / exemplares ----------------------------------------------------
create policy livros_select on public.livros for select to authenticated using (true);
create policy livros_insert on public.livros for insert to authenticated with check (public.is_admin());
create policy livros_update on public.livros for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy exemplares_select on public.exemplares for select to authenticated using (true);
create policy exemplares_insert on public.exemplares for insert to authenticated with check (public.is_admin());
create policy exemplares_update on public.exemplares for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- reservas / emprestimos / devolucoes (somente leitura direta) -----------
create policy reservas_select on public.reservas for select to authenticated using (
  public.is_admin()
  or aluno_id = public.my_aluno_id()
  or public.professor_ve_aluno(aluno_id)
);

create policy emprestimos_select on public.emprestimos for select to authenticated using (
  public.is_admin()
  or aluno_id = public.my_aluno_id()
  or public.professor_ve_aluno(aluno_id)
);

create policy devolucoes_select on public.devolucoes for select to authenticated using (
  exists (select 1 from public.emprestimos e where e.id = devolucoes.emprestimo_id
          and (public.is_admin() or e.aluno_id = public.my_aluno_id() or public.professor_ve_aluno(e.aluno_id)))
);

-- logs (somente admin lê; ninguém escreve direto) ------------------------
create policy logs_select_admin on public.logs for select to authenticated using (public.is_admin());

-- configuracoes ----------------------------------------------------------
create policy config_select on public.configuracoes for select to authenticated using (true);
create policy config_update on public.configuracoes for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- GRANTS: anon não acessa nada; authenticated acessa via RLS.
-- -----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated, service_role;
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- Tabelas históricas: reforça que o app nunca apaga esses registros
revoke delete on public.reservas, public.emprestimos, public.devolucoes, public.logs, public.livros,
                 public.exemplares, public.alunos, public.professores, public.turmas, public.profiles,
                 public.configuracoes from authenticated;
revoke insert, update on public.reservas, public.emprestimos, public.devolucoes, public.logs from authenticated;

-- Objetos futuros criados no schema public também não ficam abertos ao anon
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- -----------------------------------------------------------------------------
-- STORAGE: bucket público (leitura) para capas dos livros; só admin escreve.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('capas', 'capas', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy capas_leitura on storage.objects for select using (bucket_id = 'capas');
create policy capas_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'capas' and public.is_admin());
create policy capas_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'capas' and public.is_admin()) with check (bucket_id = 'capas' and public.is_admin());
create policy capas_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'capas' and public.is_admin());

-- ########## 005_dados_iniciais.sql ##########
-- =============================================================================
-- 005 · Dados iniciais (REAIS): turmas da escola e regras padrão da biblioteca
-- Estes NÃO são dados de demonstração — são a configuração inicial do sistema.
-- Novas turmas podem ser criadas depois em Admin > Turmas.
-- =============================================================================

insert into public.turmas (nome, ano) values
  ('2º A', 2), ('2º B', 2),
  ('3º A', 3), ('3º B', 3),
  ('4º A', 4), ('4º B', 4),
  ('5º A', 5), ('5º B', 5), ('5º C', 5)
on conflict (nome) do nothing;

insert into public.configuracoes (chave, valor, descricao) values
  ('prazo_padrao_dias',            '7',    'Prazo padrão de devolução, em dias'),
  ('validade_reserva_dias',        '2',    'Dias para retirar o livro reservado antes da reserva expirar'),
  ('max_emprestimos_por_aluno',    '2',    'Máximo de livros simultâneos (reservas ativas + empréstimos em aberto) por aluno'),
  ('bloquear_reserva_com_atraso',  'true', 'Impede novas reservas de alunos com livro em atraso (true/false)')
on conflict (chave) do nothing;
