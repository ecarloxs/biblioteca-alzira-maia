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
