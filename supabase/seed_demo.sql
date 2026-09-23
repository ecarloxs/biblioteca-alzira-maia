-- =============================================================================
-- ⚠️  DADOS DE DEMONSTRAÇÃO — SOMENTE PARA TESTES / DESENVOLVIMENTO  ⚠️
-- Execute somente em ambiente de teste. Em produção, cadastre o acervo real
-- pelo painel (Admin > Livros).
--
-- Cria alguns livros e exemplares de exemplo (localização "Estante DEMO").
-- Não inventa ISBN/editora: esses campos ficam vazios.
-- Para criar usuários de teste (admin/professor/alunos) use:
--     npm run seed:dev-users     (veja o README)
-- =============================================================================

with novos(titulo, autor, categoria, ano, descricao, qtd) as (
  values
    ('O Pequeno Príncipe',               'Antoine de Saint-Exupéry', 'Literatura',          1943, '[DEMO] Um piloto encontra um pequeno príncipe no deserto e descobre lições sobre amizade e amor.', 3),
    ('A Bolsa Amarela',                  'Lygia Bojunga',            'Literatura infantil', 1976, '[DEMO] Raquel guarda desejos e segredos em uma bolsa amarela.', 2),
    ('O Menino Maluquinho',              'Ziraldo',                  'Literatura infantil', 1980, '[DEMO] As aventuras de um menino cheio de imaginação.', 3),
    ('Reinações de Narizinho',           'Monteiro Lobato',          'Literatura infantil', 1931, '[DEMO] Narizinho e as histórias do Sítio do Picapau Amarelo.', 2),
    ('Marcelo, Marmelo, Martelo',        'Ruth Rocha',               'Literatura infantil', 1976, '[DEMO] Marcelo quer dar nome próprio às coisas.', 2),
    ('Alice no País das Maravilhas',     'Lewis Carroll',            'Clássicos',           1865, '[DEMO] Alice segue um coelho e cai em um mundo fantástico.', 2),
    ('As Aventuras de Pinóquio',         'Carlo Collodi',            'Clássicos',           1883, '[DEMO] O boneco de madeira que sonha em virar menino.', 2),
    ('Ou Isto ou Aquilo',                'Cecília Meireles',         'Poesia',              1964, '[DEMO] Poemas para crianças sobre escolhas e descobertas.', 2),
    ('O Livro da Selva',                 'Rudyard Kipling',          'Aventura',            1894, '[DEMO] Mowgli cresce entre os animais da selva.', 2),
    ('Atlas Geográfico Escolar',         'Vários autores',           'Referência',          null, '[DEMO] Mapas do Brasil e do mundo para consulta.', 2)
),
ins as (
  insert into public.livros (titulo, autor, categoria, ano_publicacao, descricao)
  select titulo, autor, categoria, ano, descricao
  from novos
  where not exists (select 1 from public.livros l where l.titulo = novos.titulo)
  returning id, titulo
)
insert into public.exemplares (livro_id, localizacao, condicao)
select i.id, 'Estante DEMO', 'bom'
from ins i
join novos n on n.titulo = i.titulo
cross join lateral generate_series(1, n.qtd);
