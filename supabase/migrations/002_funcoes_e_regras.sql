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
