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
