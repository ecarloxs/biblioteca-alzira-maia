-- =============================================================================
-- BIBLIOTECA ESCOLAR — ESCOLA ALZIRA MAIA
-- Acervo inicial: 25 livros reais para começar a operação (não são dados de
-- demonstração — são o ponto de partida real do catálogo). A gestão pode
-- editar, desativar ou adicionar quantos livros quiser depois, pela tela
-- "Gestão > Livros". Cada livro recebe 2 exemplares por padrão.
--
-- Números de página são aproximados (edição de referência comum); ajuste
-- livremente pela interface se sua edição física for diferente.
-- =============================================================================

do $$
declare
  v_livro_id uuid;
  v_titulo   text;
  v_autor    text;
  v_categoria text;
  v_paginas  int;
  v_ano      int;
  v_descricao text;
  livros_iniciais jsonb := '[
    {"titulo":"Reinações de Narizinho","autor":"Monteiro Lobato","categoria":"Literatura infantil","paginas":216,"ano":1931,"descricao":"O primeiro livro do Sítio do Picapau Amarelo, com Narizinho, Emília e os amigos do sítio."},
    {"titulo":"O Saci","autor":"Monteiro Lobato","categoria":"Literatura infantil","paginas":144,"ano":1921,"descricao":"Pedrinho encontra o travesso Saci-Pererê em uma aventura pelo sítio."},
    {"titulo":"Fábulas","autor":"Monteiro Lobato","categoria":"Fábulas","paginas":160,"ano":1922,"descricao":"Clássicas fábulas recontadas pelos personagens do Sítio do Picapau Amarelo."},
    {"titulo":"Memórias de Emília","autor":"Monteiro Lobato","categoria":"Literatura infantil","paginas":184,"ano":1936,"descricao":"A boneca de pano Emília narra suas próprias memórias e aventuras."},
    {"titulo":"O Pequeno Príncipe","autor":"Antoine de Saint-Exupéry","categoria":"Clássicos","paginas":96,"ano":1943,"descricao":"Um piloto perdido no deserto encontra um pequeno príncipe vindo de outro planeta."},
    {"titulo":"Alice no País das Maravilhas","autor":"Lewis Carroll","categoria":"Clássicos","paginas":200,"ano":1865,"descricao":"Alice cai numa toca de coelho e descobre um mundo repleto de personagens inusitados."},
    {"titulo":"As Aventuras de Pinóquio","autor":"Carlo Collodi","categoria":"Clássicos","paginas":248,"ano":1883,"descricao":"O boneco de madeira que sonha em se tornar um menino de verdade."},
    {"titulo":"Robinson Crusoé","autor":"Daniel Defoe","categoria":"Aventura","paginas":280,"ano":1719,"descricao":"Um náufrago precisa sobreviver sozinho em uma ilha deserta."},
    {"titulo":"Chapeuzinho Vermelho e Outros Contos","autor":"Irmãos Grimm","categoria":"Fábulas","paginas":96,"ano":1812,"descricao":"Coletânea de contos de fadas clássicos dos Irmãos Grimm."},
    {"titulo":"Contos de Andersen","autor":"Hans Christian Andersen","categoria":"Fábulas","paginas":208,"ano":1837,"descricao":"Coletânea com \"O Patinho Feio\", \"A Pequena Sereia\" e outros contos clássicos."},
    {"titulo":"O Mágico de Oz","autor":"L. Frank Baum","categoria":"Aventura","paginas":224,"ano":1900,"descricao":"Dorothy e seus amigos seguem a estrada de tijolos amarelos em busca do Mágico de Oz."},
    {"titulo":"Peter Pan","autor":"J. M. Barrie","categoria":"Aventura","paginas":232,"ano":1911,"descricao":"O menino que não queria crescer leva os irmãos Darling à Terra do Nunca."},
    {"titulo":"A Ilha do Tesouro","autor":"Robert Louis Stevenson","categoria":"Aventura","paginas":288,"ano":1883,"descricao":"Jim Hawkins parte em busca de um tesouro pirata escondido."},
    {"titulo":"As Aventuras de Tom Sawyer","autor":"Mark Twain","categoria":"Aventura","paginas":264,"ano":1876,"descricao":"As travessuras e aventuras de Tom Sawyer às margens do rio Mississippi."},
    {"titulo":"O Menino Maluquinho","autor":"Ziraldo","categoria":"Literatura infantil","paginas":80,"ano":1980,"descricao":"As travessuras de um menino cheio de imaginação e energia."},
    {"titulo":"Flicts","autor":"Ziraldo","categoria":"Literatura infantil","paginas":48,"ano":1969,"descricao":"A cor Flicts procura seu lugar em um mundo cheio de outras cores."},
    {"titulo":"A Bolsa Amarela","autor":"Lygia Bojunga","categoria":"Literatura infantil","paginas":128,"ano":1976,"descricao":"Raquel guarda seus desejos mais secretos dentro de uma bolsa amarela."},
    {"titulo":"Marcelo, Marmelo, Martelo","autor":"Ruth Rocha","categoria":"Literatura infantil","paginas":64,"ano":1976,"descricao":"Contos curtos e divertidos sobre a imaginação de Marcelo."},
    {"titulo":"Uma Ideia Toda Azul","autor":"Marina Colasanti","categoria":"Literatura infantil","paginas":112,"ano":1979,"descricao":"Contos poéticos que brincam com cores, sonhos e sentimentos."},
    {"titulo":"O Auto da Compadecida","autor":"Ariano Suassuna","categoria":"Literatura","paginas":128,"ano":1955,"descricao":"João Grilo e Chicó vivem aventuras cheias de humor no sertão nordestino."},
    {"titulo":"A Arca de Noé","autor":"Vinicius de Moraes","categoria":"Poesia","paginas":96,"ano":1970,"descricao":"Poemas divertidos sobre bichos, feitos para serem lidos em voz alta."},
    {"titulo":"Vinte Mil Léguas Submarinas","autor":"Júlio Verne","categoria":"Aventura","paginas":352,"ano":1870,"descricao":"A bordo do submarino Nautilus, o Capitão Nemo explora as profundezas dos oceanos."},
    {"titulo":"A Volta ao Mundo em 80 Dias","autor":"Júlio Verne","categoria":"Aventura","paginas":272,"ano":1873,"descricao":"Phileas Fogg aposta que consegue dar a volta ao mundo em apenas 80 dias."},
    {"titulo":"Meu Pé de Laranja Lima","autor":"José Mauro de Vasconcelos","categoria":"Literatura","paginas":192,"ano":1968,"descricao":"Zezé encontra na amizade com um pé de laranja lima seu maior consolo."},
    {"titulo":"Dom Quixote (adaptação infantojuvenil)","autor":"Miguel de Cervantes","categoria":"Clássicos","paginas":240,"ano":1605,"descricao":"O cavaleiro andante que enxerga moinhos de vento como gigantes."}
  ]'::jsonb;
begin
  for v_titulo, v_autor, v_categoria, v_paginas, v_ano, v_descricao in
    select x->>'titulo', x->>'autor', x->>'categoria', (x->>'paginas')::int, (x->>'ano')::int, x->>'descricao'
    from jsonb_array_elements(livros_iniciais) as x
  loop
    if not exists (select 1 from public.livros where titulo = v_titulo and autor = v_autor) then
      insert into public.livros (titulo, autor, categoria, numero_paginas, ano_publicacao, descricao)
      values (v_titulo, v_autor, v_categoria, v_paginas, v_ano, v_descricao)
      returning id into v_livro_id;

      insert into public.exemplares (livro_id, condicao) values (v_livro_id, 'novo'), (v_livro_id, 'novo');
    end if;
  end loop;
end $$;
