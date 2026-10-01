-- =============================================================================
-- BIBLIOTECA ESCOLAR — ESCOLA ALZIRA MAIA
-- 006 · Evolução: avaliações, gamificação, ranking de leitura, notificações,
--        fila de interesse e novos campos do livro.
--
-- Esta migration é ADITIVA: não remove nem renomeia nada de 001–005.
-- Pode ser aplicada com segurança em cima de um banco já em produção.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Livro: número de páginas (campo pedido pela evolução do sistema)
-- -----------------------------------------------------------------------------
alter table public.livros
  add column if not exists numero_paginas integer check (numero_paginas is null or numero_paginas > 0);

-- -----------------------------------------------------------------------------
-- 2. Avaliações (reviews) dos alunos sobre livros já devolvidos
-- -----------------------------------------------------------------------------
create table if not exists public.avaliacoes (
  id            uuid primary key default gen_random_uuid(),
  emprestimo_id uuid not null unique references public.emprestimos(id) on delete restrict,
  aluno_id      uuid not null references public.alunos(id) on delete restrict,
  livro_id      uuid not null references public.livros(id) on delete restrict,
  nota          smallint not null check (nota between 1 and 5),
  comentario    text,
  removida      boolean not null default false,   -- moderação: soft-remove, preserva o histórico/auditoria
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists avaliacoes_livro_idx on public.avaliacoes (livro_id) where not removida;
create index if not exists avaliacoes_aluno_idx on public.avaliacoes (aluno_id);

drop trigger if exists set_updated_at_avaliacoes on public.avaliacoes;
create trigger set_updated_at_avaliacoes before update on public.avaliacoes
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Gamificação: catálogo de conquistas + conquistas obtidas por aluno
-- -----------------------------------------------------------------------------
create table if not exists public.conquistas (
  id            uuid primary key default gen_random_uuid(),
  chave         text not null unique,       -- ex.: 'primeiro_livro', '5_livros'
  titulo        text not null,
  descricao     text not null,
  icone         text not null default '🏆', -- emoji, exibido diretamente na interface
  criterio_tipo text not null check (criterio_tipo in ('livros_lidos','paginas_lidas','avaliacoes_feitas')),
  criterio_valor integer not null check (criterio_valor > 0),
  ordem         integer not null default 0,
  ativo         boolean not null default true
);

create table if not exists public.aluno_conquistas (
  id             uuid primary key default gen_random_uuid(),
  aluno_id       uuid not null references public.alunos(id) on delete restrict,
  conquista_id   uuid not null references public.conquistas(id) on delete restrict,
  conquistada_em timestamptz not null default now(),
  unique (aluno_id, conquista_id)
);
create index if not exists aluno_conquistas_aluno_idx on public.aluno_conquistas (aluno_id);

-- -----------------------------------------------------------------------------
-- 4. Notificações internas
-- -----------------------------------------------------------------------------
create table if not exists public.notificacoes (
  id             uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references public.profiles(id) on delete cascade,
  tipo           text not null,   -- 'reserva','prazo','devolucao','avaliacao','conquista','atrasos','sistema'
  titulo         text not null,
  mensagem       text not null,
  entidade       text,
  entidade_id    text,
  lida           boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists notificacoes_destinatario_idx on public.notificacoes (destinatario_id, lida, created_at desc);

-- -----------------------------------------------------------------------------
-- 5. Fila de interesse (livro indisponível no momento)
-- -----------------------------------------------------------------------------
create table if not exists public.fila_interesse (
  id         uuid primary key default gen_random_uuid(),
  aluno_id   uuid not null references public.alunos(id) on delete restrict,
  livro_id   uuid not null references public.livros(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (aluno_id, livro_id)
);
create index if not exists fila_interesse_livro_idx on public.fila_interesse (livro_id, created_at);

-- -----------------------------------------------------------------------------
-- 6. View do catálogo: agora também com páginas, status textual e avaliação
-- -----------------------------------------------------------------------------
-- l.* agora inclui numero_paginas (adicionada acima) em posição diferente da
-- view original — precisa recriar do zero em vez de "or replace".
drop view if exists public.v_livros_catalogo;
create view public.v_livros_catalogo with (security_invoker = true) as
select
  l.*,
  coalesce(c.total, 0)       as total_exemplares,
  coalesce(c.disponiveis, 0) as disponiveis,
  coalesce(c.reservados, 0)  as reservados,
  coalesce(c.emprestados, 0) as emprestados,
  case
    when coalesce(c.disponiveis, 0) > 0 then 'disponivel'
    when coalesce(c.emprestados, 0) > 0 then 'emprestimo'
    else 'indisponivel'
  end as status_geral,
  coalesce(h.total_emprestimos, 0) as total_emprestimos,
  coalesce(r.media_avaliacoes, 0)::numeric(3,2) as media_avaliacoes,
  coalesce(r.total_avaliacoes, 0) as total_avaliacoes
from public.livros l
left join (
  select livro_id,
         count(*) filter (where status <> 'inativo')    as total,
         count(*) filter (where status = 'disponivel')  as disponiveis,
         count(*) filter (where status = 'reservado')   as reservados,
         count(*) filter (where status = 'emprestado')  as emprestados
  from public.exemplares
  group by livro_id
) c on c.livro_id = l.id
left join (
  select x.livro_id, count(*) as total_emprestimos
  from public.emprestimos e join public.exemplares x on x.id = e.exemplar_id
  group by x.livro_id
) h on h.livro_id = l.id
left join (
  select livro_id, avg(nota) as media_avaliacoes, count(*) as total_avaliacoes
  from public.avaliacoes where not removida
  group by livro_id
) r on r.livro_id = l.id;

-- IMPORTANTE: como esta view foi recriada (drop+create) em vez de "or replace",
-- ela perde o GRANT que 004_rls_policies.sql deu de uma vez só com
-- "grant ... on all tables in schema public" — esse grant não é retroativo
-- para objetos criados depois. Sem isto, o catálogo pararia de funcionar.
grant select on public.v_livros_catalogo to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Avaliações públicas (anonimizadas) de um livro
--
-- IMPORTANTE: isto precisa ser uma função SECURITY DEFINER, e não uma view
-- "security_invoker" com JOIN em alunos/turmas — testado e confirmado que uma
-- view desse tipo aplicaria a RLS de "alunos" também para quem está
-- consultando, e como um aluno só enxerga a própria linha em "alunos" (ou a
-- de quem seu professor gerencia), o JOIN "sumiria" com as avaliações de
-- colegas de outras turmas — quebrando a visualização pública de avaliações
-- que é exatamente o objetivo aqui. A anonimização em si já protege a
-- privacidade; não precisamos também herdar a RLS interna de "alunos".
-- -----------------------------------------------------------------------------
create or replace function public.avaliacoes_publicas(p_livro_id uuid default null)
returns table(id uuid, livro_id uuid, nota smallint, comentario text, created_at timestamptz, autor_anonimizado text)
language sql stable security definer set search_path = public as $$
  select
    av.id, av.livro_id, av.nota, av.comentario, av.created_at,
    'Aluno(a) da turma ' || coalesce(t.nome, '—') as autor_anonimizado
  from public.avaliacoes av
  join public.alunos a on a.id = av.aluno_id
  left join public.turmas t on t.id = a.turma_id
  where not av.removida
    and (p_livro_id is null or av.livro_id = p_livro_id)
  order by av.created_at desc;
$$;

-- View para a GESTÃO moderar (aqui sim faz sentido aplicar RLS: só quem tem
-- "is_admin() ou é o próprio aluno" consegue ver aluno_id/removida de verdade;
-- is_admin() sempre satisfaz a policy de "alunos" também, então o JOIN nunca
-- falha para quem tem permissão de moderar).
create or replace view public.v_avaliacoes with (security_invoker = true) as
select
  av.id, av.livro_id, av.nota, av.comentario, av.created_at, av.removida,
  av.aluno_id,
  p.nome as aluno_nome,
  t.nome as turma_nome,
  l.titulo as livro_titulo
from public.avaliacoes av
join public.alunos a on a.id = av.aluno_id
join public.profiles p on p.id = a.profile_id
left join public.turmas t on t.id = a.turma_id
join public.livros l on l.id = av.livro_id;

grant select on public.v_avaliacoes to authenticated;

-- -----------------------------------------------------------------------------
-- 8. RLS — avaliações
-- -----------------------------------------------------------------------------
alter table public.avaliacoes enable row level security;

drop policy if exists avaliacoes_select on public.avaliacoes;
create policy avaliacoes_select on public.avaliacoes for select to authenticated
  using (
    not removida
    or public.is_admin()
    or aluno_id = public.my_aluno_id()
  );

drop policy if exists avaliacoes_insert on public.avaliacoes;
create policy avaliacoes_insert on public.avaliacoes for insert to authenticated
  with check (false); -- toda escrita passa pela RPC avaliar_livro (SECURITY DEFINER)

drop policy if exists avaliacoes_update on public.avaliacoes;
create policy avaliacoes_update on public.avaliacoes for update to authenticated
  using (false); -- edição/remoção só pela RPC moderar_avaliacao

revoke insert, update, delete on public.avaliacoes from authenticated;
grant select on public.avaliacoes to authenticated;

-- -----------------------------------------------------------------------------
-- 9. RLS — conquistas (catálogo público de leitura) e aluno_conquistas
-- -----------------------------------------------------------------------------
alter table public.conquistas enable row level security;
drop policy if exists conquistas_select on public.conquistas;
create policy conquistas_select on public.conquistas for select to authenticated using (true);
revoke insert, update, delete on public.conquistas from authenticated;
grant select on public.conquistas to authenticated;

alter table public.aluno_conquistas enable row level security;
drop policy if exists aluno_conquistas_select on public.aluno_conquistas;
create policy aluno_conquistas_select on public.aluno_conquistas for select to authenticated
  using (
    public.is_admin()
    or aluno_id = public.my_aluno_id()
    or public.professor_ve_aluno(aluno_id)
  );
revoke insert, update, delete on public.aluno_conquistas from authenticated;
grant select on public.aluno_conquistas to authenticated;

-- -----------------------------------------------------------------------------
-- 10. RLS — notificações (cada usuário só vê e só altera as suas)
-- -----------------------------------------------------------------------------
alter table public.notificacoes enable row level security;

drop policy if exists notificacoes_select on public.notificacoes;
create policy notificacoes_select on public.notificacoes for select to authenticated
  using (destinatario_id = auth.uid());

drop policy if exists notificacoes_update on public.notificacoes;
create policy notificacoes_update on public.notificacoes for update to authenticated
  using (destinatario_id = auth.uid())
  with check (destinatario_id = auth.uid());

revoke insert, delete on public.notificacoes from authenticated;
grant select, update on public.notificacoes to authenticated;

-- -----------------------------------------------------------------------------
-- 11. RLS — fila de interesse
-- -----------------------------------------------------------------------------
alter table public.fila_interesse enable row level security;

drop policy if exists fila_interesse_select on public.fila_interesse;
create policy fila_interesse_select on public.fila_interesse for select to authenticated
  using (public.is_admin() or public.is_professor() or aluno_id = public.my_aluno_id());

revoke insert, update, delete on public.fila_interesse from authenticated;
grant select on public.fila_interesse to authenticated;

-- -----------------------------------------------------------------------------
-- 12. Notificar + checar conquistas: funções auxiliares
-- -----------------------------------------------------------------------------
create or replace function public._notificar(p_destinatario_id uuid, p_tipo text, p_titulo text, p_mensagem text,
                                              p_entidade text default null, p_entidade_id text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notificacoes (destinatario_id, tipo, titulo, mensagem, entidade, entidade_id)
  values (p_destinatario_id, p_tipo, p_titulo, p_mensagem, p_entidade, p_entidade_id);
end $$;

-- Estatísticas de leitura de um aluno (livros e páginas lidas — sempre calculado ao vivo, nunca hardcoded)
create or replace function public.estatisticas_aluno(p_aluno_id uuid)
returns table(livros_lidos bigint, paginas_lidas bigint, avaliacoes_feitas bigint)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where e.status = 'devolvido')::bigint as livros_lidos,
    coalesce(sum(l.numero_paginas) filter (where e.status = 'devolvido'), 0)::bigint as paginas_lidas,
    (select count(*) from public.avaliacoes av where av.aluno_id = p_aluno_id and not av.removida)::bigint as avaliacoes_feitas
  from public.emprestimos e
  join public.exemplares x on x.id = e.exemplar_id
  join public.livros l on l.id = x.livro_id
  where e.aluno_id = p_aluno_id;
$$;

create or replace function public.verificar_conquistas(p_aluno_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_stats record;
  v_c record;
  v_profile_id uuid;
begin
  select * into v_stats from public.estatisticas_aluno(p_aluno_id);
  select p.id into v_profile_id from public.alunos a join public.profiles p on p.id = a.profile_id where a.id = p_aluno_id;

  for v_c in select * from public.conquistas where ativo loop
    if not exists (select 1 from public.aluno_conquistas where aluno_id = p_aluno_id and conquista_id = v_c.id) then
      if (v_c.criterio_tipo = 'livros_lidos' and v_stats.livros_lidos >= v_c.criterio_valor)
         or (v_c.criterio_tipo = 'paginas_lidas' and v_stats.paginas_lidas >= v_c.criterio_valor)
         or (v_c.criterio_tipo = 'avaliacoes_feitas' and v_stats.avaliacoes_feitas >= v_c.criterio_valor)
      then
        insert into public.aluno_conquistas (aluno_id, conquista_id) values (p_aluno_id, v_c.id)
        on conflict do nothing;
        if v_profile_id is not null then
          perform public._notificar(v_profile_id, 'conquista', 'Nova conquista!',
            'Você conquistou "' || v_c.titulo || '" ' || v_c.icone, 'conquista', v_c.id::text);
        end if;
      end if;
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 13. Avaliar livro (RPC) — só quem devolveu o livro, uma vez por empréstimo
-- -----------------------------------------------------------------------------
create or replace function public.avaliar_livro(p_emprestimo_id uuid, p_nota int, p_comentario text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e public.emprestimos%rowtype;
  v_id uuid;
begin
  if not public.is_aluno() then
    raise exception 'Apenas alunos podem avaliar livros.';
  end if;
  if p_nota is null or p_nota not between 1 and 5 then
    raise exception 'A nota deve ser de 1 a 5.';
  end if;

  select * into e from public.emprestimos where id = p_emprestimo_id;
  if not found then raise exception 'Empréstimo não encontrado.'; end if;
  if e.aluno_id <> public.my_aluno_id() then
    raise exception 'Este empréstimo não pertence a você.';
  end if;
  if e.status not in ('devolvido') then
    raise exception 'Só é possível avaliar depois que o livro for devolvido.';
  end if;
  if exists (select 1 from public.avaliacoes where emprestimo_id = p_emprestimo_id) then
    raise exception 'Você já avaliou este empréstimo.';
  end if;

  insert into public.avaliacoes (emprestimo_id, aluno_id, livro_id, nota, comentario)
  select e.id, e.aluno_id, x.livro_id, p_nota, nullif(trim(p_comentario), '')
  from public.exemplares x where x.id = e.exemplar_id
  returning id into v_id;

  perform public._log('aluno_avaliou_livro', 'avaliacoes', v_id::text,
    jsonb_build_object('emprestimo_id', e.id, 'nota', p_nota));
  perform public.verificar_conquistas(e.aluno_id);
  return v_id;
end $$;

create or replace function public.moderar_avaliacao(p_avaliacao_id uuid, p_remover boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas a gestão pode moderar avaliações.';
  end if;
  update public.avaliacoes set removida = p_remover, updated_at = now() where id = p_avaliacao_id;
  if not found then raise exception 'Avaliação não encontrada.'; end if;
  perform public._log(case when p_remover then 'admin_removeu_avaliacao' else 'admin_restaurou_avaliacao' end,
    'avaliacoes', p_avaliacao_id::text, '{}'::jsonb);
end $$;

-- -----------------------------------------------------------------------------
-- 14. Fila de interesse (RPCs)
-- -----------------------------------------------------------------------------
create or replace function public.entrar_fila_interesse(p_livro_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_aluno uuid;
begin
  v_aluno := public.my_aluno_id();
  if v_aluno is null then raise exception 'Apenas alunos podem entrar na fila de interesse.'; end if;
  insert into public.fila_interesse (aluno_id, livro_id) values (v_aluno, p_livro_id)
  on conflict (aluno_id, livro_id) do nothing;
end $$;

create or replace function public.sair_fila_interesse(p_livro_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_aluno uuid;
begin
  v_aluno := public.my_aluno_id();
  delete from public.fila_interesse where aluno_id = v_aluno and livro_id = p_livro_id;
end $$;

-- Avisa (e limpa) a fila de interesse de um livro que acabou de ficar disponível
create or replace function public._avisar_fila_interesse(p_livro_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_r record; v_titulo text;
begin
  select titulo into v_titulo from public.livros where id = p_livro_id;
  for v_r in
    select f.id as fila_id, p.id as profile_id
    from public.fila_interesse f
    join public.alunos a on a.id = f.aluno_id
    join public.profiles p on p.id = a.profile_id
    where f.livro_id = p_livro_id
    order by f.created_at
  loop
    perform public._notificar(v_r.profile_id, 'sistema', 'Livro disponível!',
      '"' || v_titulo || '" já tem exemplar disponível. Corra para reservar.', 'livro', p_livro_id::text);
    delete from public.fila_interesse where id = v_r.fila_id;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 15. Marcar notificação como lida (RPC simples, além do UPDATE via RLS)
-- -----------------------------------------------------------------------------
create or replace function public.marcar_notificacoes_lidas(p_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  update public.notificacoes set lida = true
  where destinatario_id = auth.uid() and not lida
    and (p_ids is null or id = any(p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- -----------------------------------------------------------------------------
-- 16. Ranking de leitura (SECURITY DEFINER: expõe só o mínimo necessário —
--     nome, turma e contadores — sem vazar dados privados de empréstimo)
-- -----------------------------------------------------------------------------
create or replace function public.ranking_leitura(p_turma_id uuid default null, p_mes date default null)
returns table(aluno_id uuid, aluno_nome text, turma_nome text, livros_lidos bigint, paginas_lidas bigint)
language sql stable security definer set search_path = public as $$
  select
    a.id as aluno_id,
    p.nome as aluno_nome,
    t.nome as turma_nome,
    count(*) filter (
      where e.status = 'devolvido'
      and (p_mes is null or date_trunc('month', d.data_devolucao) = date_trunc('month', p_mes::timestamptz))
    )::bigint as livros_lidos,
    coalesce(sum(l.numero_paginas) filter (
      where e.status = 'devolvido'
      and (p_mes is null or date_trunc('month', d.data_devolucao) = date_trunc('month', p_mes::timestamptz))
    ), 0)::bigint as paginas_lidas
  from public.alunos a
  join public.profiles p on p.id = a.profile_id
  left join public.turmas t on t.id = a.turma_id
  left join public.emprestimos e on e.aluno_id = a.id
  left join public.devolucoes d on d.emprestimo_id = e.id
  left join public.exemplares x on x.id = e.exemplar_id
  left join public.livros l on l.id = x.livro_id
  where a.ativo and (p_turma_id is null or a.turma_id = p_turma_id)
  group by a.id, p.nome, t.nome
  order by livros_lidos desc, paginas_lidas desc
  limit 100;
$$;

-- -----------------------------------------------------------------------------
-- 17. Atualiza registrar_devolucao: agora também notifica e checa conquistas
--     (mesma assinatura de 002 — recriação segura, sem quebrar chamadas atuais)
-- -----------------------------------------------------------------------------
create or replace function public.registrar_devolucao(p_emprestimo_id uuid, p_condicao text, p_observacao text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e public.emprestimos%rowtype;
  v_dev uuid;
  v_titulo text;
  v_cod text;
  v_livro uuid;
  v_dias_atraso int;
  v_profile_id uuid;
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

  select p.id into v_profile_id from public.alunos a join public.profiles p on p.id = a.profile_id where a.id = e.aluno_id;
  if v_profile_id is not null then
    perform public._notificar(v_profile_id, 'devolucao', 'Livro devolvido',
      'A devolução de "' || v_titulo || '" foi registrada. Você já pode avaliar este livro!', 'emprestimo', e.id::text);
  end if;

  if p_condicao <> 'perdido' then
    perform public._avisar_fila_interesse(v_livro);
  end if;

  perform public.verificar_conquistas(e.aluno_id);
  return v_dev;
end $$;

-- -----------------------------------------------------------------------------
-- 18. Atualiza reservar_livro: mesma lógica original de 002 (limite de
--     empréstimos, bloqueio por atraso, concorrência etc.), só adicionando a
--     notificação ao final. Corpo idêntico ao original + 1 bloco novo.
-- -----------------------------------------------------------------------------
create or replace function public.reservar_livro(p_livro_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_aluno   uuid;
  v_livro   public.livros%rowtype;
  v_ex      uuid;
  v_res     uuid;
  v_max     int;
  v_abertos int;
  v_profile_id uuid;
  v_validade_dias int;
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

  v_validade_dias := public.config_int('validade_reserva_dias', 2);

  insert into public.reservas (aluno_id, livro_id, exemplar_id, expira_em)
  values (v_aluno, p_livro_id, v_ex, now() + make_interval(days => v_validade_dias))
  returning id into v_res;

  update public.exemplares set status = 'reservado' where id = v_ex;

  perform public._log('aluno_reservou_livro', 'reservas', v_res::text,
    jsonb_build_object('livro_id', p_livro_id, 'livro_titulo', v_livro.titulo, 'exemplar_id', v_ex,
      'aluno_nome', (select nome from public.profiles where id = auth.uid())));

  select p.id into v_profile_id from public.alunos a join public.profiles p on p.id = a.profile_id where a.id = v_aluno;
  if v_profile_id is not null then
    perform public._notificar(v_profile_id, 'reserva', 'Reserva confirmada',
      'Seu livro "' || v_livro.titulo || '" foi reservado. Retire na biblioteca em até ' || v_validade_dias || ' dia(s).',
      'reserva', v_res::text);
  end if;

  return v_res;
exception when unique_violation then
  raise exception 'Você já possui uma reserva ativa para este livro.';
end $$;

-- -----------------------------------------------------------------------------
-- 18b. cancelar_reserva: mesma lógica original + avisa a fila de interesse
-- -----------------------------------------------------------------------------
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

  perform public._avisar_fila_interesse(r.livro_id);
end $$;

-- -----------------------------------------------------------------------------
-- 18c. expirar_reservas: mesma lógica original + avisa a fila de interesse
-- -----------------------------------------------------------------------------
create or replace function public.expirar_reservas()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_n integer;
  v_livro_id uuid;
  v_livro_ids uuid[];
begin
  perform set_config('app.internal', '1', true);

  -- 1) expira as reservas vencidas, guardando quais exemplares/livros foram afetados
  create temporary table if not exists _tmp_exp (id uuid, exemplar_id uuid, livro_id uuid) on commit drop;
  delete from _tmp_exp;
  with u as (
    update public.reservas set status = 'expirada'
    where status = 'ativa' and expira_em < now()
    returning id, exemplar_id, livro_id
  )
  insert into _tmp_exp (id, exemplar_id, livro_id) select id, exemplar_id, livro_id from u;

  select count(*) into v_n from _tmp_exp;

  -- 2) libera de volta para "disponivel" os exemplares que estavam reservados
  select coalesce(array_agg(distinct t.livro_id), '{}') into v_livro_ids
  from _tmp_exp t
  join public.exemplares e on e.id = t.exemplar_id and e.status = 'reservado';

  update public.exemplares set status = 'disponivel'
  where id in (select exemplar_id from _tmp_exp) and status = 'reservado';

  -- 3) avisa quem estava na fila de interesse desses livros
  foreach v_livro_id in array v_livro_ids loop
    perform public._avisar_fila_interesse(v_livro_id);
  end loop;

  return v_n;
end $$;

-- -----------------------------------------------------------------------------
-- 19. manutencao_periodica: agora também gera os avisos de "vence amanhã" e
--     "existem N atrasados" para o(s) professor(es) da turma — de forma
--     idempotente (não duplica aviso no mesmo dia).
-- -----------------------------------------------------------------------------
create or replace function public.avisar_prazos_e_atrasos()
returns void language plpgsql security definer set search_path = public as $$
declare v_r record; v_prof record;
begin
  -- aluno: prazo vence amanhã
  for v_r in
    select e.id as emprestimo_id, l.titulo, p.id as profile_id
    from public.emprestimos e
    join public.exemplares x on x.id = e.exemplar_id
    join public.livros l on l.id = x.livro_id
    join public.alunos a on a.id = e.aluno_id
    join public.profiles p on p.id = a.profile_id
    where e.status = 'ativo' and e.prazo_devolucao = public.hoje_local() + 1
      and not exists (
        select 1 from public.notificacoes n
        where n.destinatario_id = p.id and n.tipo = 'prazo' and n.entidade_id = e.id::text
          and n.created_at::date = public.hoje_local()
      )
  loop
    perform public._notificar(v_r.profile_id, 'prazo', 'Prazo termina amanhã',
      'O prazo de devolução de "' || v_r.titulo || '" termina amanhã.', 'emprestimo', v_r.emprestimo_id::text);
  end loop;

  -- professor: existem N livros atrasados nas turmas que ele acompanha
  for v_prof in
    select pt.professor_id, pr.id as profile_id, count(*) as n
    from public.professor_turmas pt
    join public.professores pf on pf.id = pt.professor_id
    join public.profiles pr on pr.id = pf.profile_id
    join public.alunos a on a.turma_id = pt.turma_id
    join public.emprestimos e on e.aluno_id = a.id and e.status = 'atrasado'
    group by pt.professor_id, pr.id
    having count(*) > 0
  loop
    if not exists (
      select 1 from public.notificacoes n
      where n.destinatario_id = v_prof.profile_id and n.tipo = 'atrasos'
        and n.created_at::date = public.hoje_local()
    ) then
      perform public._notificar(v_prof.profile_id, 'atrasos', 'Livros em atraso',
        'Existem ' || v_prof.n || ' empréstimo(s) em atraso nas suas turmas.', 'turma', null);
    end if;
  end loop;
end $$;

create or replace function public.manutencao_periodica()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.expirar_reservas();
  perform public.sync_atrasos();
  perform public.avisar_prazos_e_atrasos();
end $$;

-- -----------------------------------------------------------------------------
-- 19b. IMPORTANTE: "alter default privileges" em 004_rls_policies.sql só
--      bloqueia PUBLIC/anon para objetos futuros — não concede automaticamente
--      para "authenticated". Sem isto, nenhuma das novas funções acima seria
--      executável pelo app (erro "permission denied for function ...").
-- -----------------------------------------------------------------------------
grant execute on all functions in schema public to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 20. Catálogo inicial de conquistas (idempotente)
-- -----------------------------------------------------------------------------
insert into public.conquistas (chave, titulo, descricao, icone, criterio_tipo, criterio_valor, ordem) values
  ('primeiro_livro',   'Primeiro livro',        'Leu e devolveu o primeiro livro.',           '📚', 'livros_lidos',      1,    1),
  ('5_livros',         '5 livros lidos',        'Já leu 5 livros.',                            '📚', 'livros_lidos',      5,    2),
  ('10_livros',        '10 livros lidos',       'Já leu 10 livros.',                           '📚', 'livros_lidos',      10,   3),
  ('20_livros',        '20 livros lidos',       'Já leu 20 livros — leitor(a) dedicado(a)!',   '📚', 'livros_lidos',      20,   4),
  ('500_paginas',      '500 páginas',           'Já leu mais de 500 páginas.',                 '📄', 'paginas_lidas',     500,  5),
  ('1000_paginas',     '1.000 páginas',         'Já leu mais de 1.000 páginas.',               '📄', 'paginas_lidas',     1000, 6),
  ('2000_paginas',     '2.000 páginas',         'Já leu mais de 2.000 páginas — impressionante!', '📄', 'paginas_lidas',  2000, 7),
  ('primeira_avaliacao','Primeira avaliação',   'Avaliou um livro pela primeira vez.',         '⭐', 'avaliacoes_feitas', 1,    8)
on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- 21. Entidades de auditoria/rótulos novos (referência para o front-end)
--     acao: aluno_avaliou_livro, admin_removeu_avaliacao, admin_restaurou_avaliacao
--     entidade: avaliacoes
-- -----------------------------------------------------------------------------
