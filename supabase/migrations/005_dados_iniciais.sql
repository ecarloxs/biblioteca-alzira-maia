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
