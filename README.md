# Sistema de Gestão da Biblioteca Escolar — Escola Alzira Maia

Sistema completo (não é um protótipo) para gestão da biblioteca escolar: catálogo de livros,
reservas, empréstimos, devoluções, controle por turma, dashboards por perfil, relatórios e
auditoria. Construído com Next.js (App Router) + TypeScript + Tailwind + shadcn/ui no
front-end, e Supabase (Postgres + Auth + RLS) no back-end.

Todas as regras de negócio (reservar, cancelar, confirmar retirada, emprestar, devolver,
alterar prazo) ficam em **funções PostgreSQL `SECURITY DEFINER`**, chamadas via RPC. O
front-end nunca escreve diretamente nas tabelas de reservas/empréstimos/devoluções — isso é
impedido no próprio banco (grants revogados + Row Level Security), então a regra vale mesmo
que alguém tente burlar a interface.

---

## Sumário

1. [Estrutura de pastas](#1-estrutura-de-pastas)
2. [Configurar o Supabase](#2-configurar-o-supabase)
3. [Rodar localmente](#3-rodar-localmente)
4. [Publicar na Vercel](#4-publicar-na-vercel)
5. [Credenciais de teste](#5-credenciais-de-teste-somente-desenvolvimento)
6. [Funcionalidades implementadas](#6-funcionalidades-implementadas)
7. [Melhorias futuras sugeridas](#7-melhorias-futuras-sugeridas)
8. [Notas de segurança e arquitetura](#8-notas-de-segurança-e-arquitetura)

---

## 1. Estrutura de pastas

```
biblioteca-alzira-maia/
├── scripts/
│   └── seed-dev-users.mjs        # cria contas de teste (admin/professor/aluno)
├── supabase/
│   ├── 00_setup_completo.sql     # 001..006 concatenados — cole isso no SQL Editor
│   ├── seed_livros_iniciais.sql  # os 25 livros reais do acervo inicial
│   ├── seed_demo.sql             # ⚠️ opcional: 10 livros extras de demonstração
│   └── migrations/
│       ├── 001_schema.sql            # tabelas
│       ├── 002_funcoes_e_regras.sql  # RPCs de negócio, triggers, auditoria
│       ├── 003_views.sql             # views de leitura (v_livros_catalogo, v_alunos...)
│       ├── 004_rls_policies.sql      # Row Level Security + grants/revokes + storage
│       ├── 005_dados_iniciais.sql    # as 9 turmas iniciais + configurações padrão
│       └── 006_evolucao.sql          # avaliações, gamificação, ranking, notificações, fila
├── src/
│   ├── app/
│   │   ├── login/, recuperar-senha/, redefinir-senha/, auth/   # autenticação
│   │   ├── aluno/            # catálogo, reservas, empréstimos, histórico, ranking, conquistas
│   │   ├── professor/        # turmas, reservas, empréstimos, atrasos, avaliações...
│   │   ├── admin/            # dashboard, CRUDs, relatórios, auditoria, avaliações, ranking...
│   │   └── exemplar/[codigo] # página de leitura de QR Code de um exemplar
│   ├── components/
│   │   ├── ui/               # botão, input, card, badge, diálogo, tabela (estilo shadcn)
│   │   ├── shared/            # layout (AppShell), filtros, paginação, sino de notificações,
│   │   │                      # estrelas de avaliação, diálogo de confirmação...
│   │   ├── books/, reservations/, loans/, reviews/  # componentes de cada fluxo de negócio
│   │   └── admin/             # formulários e diálogos exclusivos da gestão
│   ├── hooks/                 # useRpc (chama funções do banco) e useAction (chama Server Actions)
│   ├── lib/
│   │   ├── supabase/           # clients (browser, server, admin/service-role, middleware)
│   │   ├── actions/            # Server Actions (cadastros que não passam por RPC)
│   │   ├── data/               # consultas de leitura reaproveitadas entre páginas
│   │   ├── auth/session.ts     # getSessionProfile / requireRole
│   │   ├── constants.ts, utils.ts, rpc-errors.ts
│   └── types/index.ts          # tipos TypeScript espelhando o banco
├── .env.example
└── package.json
```

## 2. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano gratuito é suficiente para começar).
2. Vá em **SQL Editor** → **New query**, cole o conteúdo de `supabase/00_setup_completo.sql`
   e execute. Esse arquivo já contém, na ordem certa, todas as tabelas, funções, views,
   políticas de RLS e as 9 turmas iniciais (2ºA, 2ºB, 3ºA, 3ºB, 4ºA, 4ºB, 5ºA, 5ºB, 5ºC).
   - Se preferir, rode os 6 arquivos de `supabase/migrations/` um por um, na ordem numérica
     (001 a 006). **A migration 006 (`006_evolucao.sql`) é obrigatória** — sem ela não existem
     avaliações, gamificação, ranking, notificações nem fila de interesse. Ela é aditiva e
     segura de rodar mesmo em um banco que já tenha as migrations 001–005 aplicadas.
3. Rode `supabase/seed_livros_iniciais.sql` para cadastrar os **25 livros reais** que compõem
   o acervo inicial (título, autor, categoria, número de páginas — 2 exemplares cada). Não são
   dados de demonstração: são o ponto de partida real do catálogo, editável a qualquer momento
   pela tela "Gestão > Livros". Rodar de novo não duplica os livros (é idempotente).
4. **(Opcional)** Para ter mais alguns livros extras só para testar a interface, rode também
   `supabase/seed_demo.sql`. Esses títulos vêm marcados como `[DEMO]` na descrição para
   ficar claro que não são dados reais — apague-os quando for usar o sistema de verdade.
5. Em **Project Settings → API**, copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponha essa chave no
     navegador; ela só é usada em Server Actions, no servidor, para criar contas de usuário).
6. Em **Authentication → URL Configuration**, cadastre a URL do seu site (local ou da Vercel)
   em *Site URL* e *Redirect URLs*, para o link de "esqueci minha senha" funcionar.
7. O bucket de armazenamento `capas` (para imagens de capa de livro) já é criado pela
   migration 004, com leitura pública e escrita restrita a administradores.

## 3. Rodar localmente

Pré-requisitos: Node.js 20+.

```bash
cp .env.example .env.local
# edite .env.local com as 3 chaves do Supabase (passo 2 acima)

npm install
npm run dev
# abre em http://localhost:3000
```

Para já ter contas de teste (1 admin, 2 professores, 4 alunos) sem precisar cadastrar tudo
na mão:

```bash
node --env-file=.env.local scripts/seed-dev-users.mjs
```

Outros comandos úteis:

```bash
npm run typecheck   # checagem de tipos TypeScript
npm run lint         # ESLint
npm run build        # build de produção (o mesmo que a Vercel roda)
```

## 4. Publicar na Vercel

1. Suba este projeto para um repositório Git (GitHub/GitLab/Bitbucket).
2. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, cadastre as mesmas três chaves do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marque como **Sensitive**; não marque como pública)
   - Opcional: `NEXT_PUBLIC_SITE_URL` com a URL final do site (usada nos links dos QR Codes).
4. Clique em **Deploy**. O framework é detectado automaticamente (Next.js).
5. Depois do primeiro deploy, volte no Supabase (**Authentication → URL Configuration**) e
   atualize a *Site URL*/*Redirect URLs* para o domínio da Vercel.
6. Rode o script de usuários de teste apontando para o `.env.local` com as chaves de
   produção **somente se quiser mesmo criar essas contas em produção** — normalmente você vai
   preferir criar as contas reais pela tela **Gestão → Usuários** dentro do próprio sistema.

## 5. Credenciais de teste (⚠️ somente desenvolvimento)

Criadas pelo `scripts/seed-dev-users.mjs`. **Troque ou apague essas contas antes de usar o
sistema com dados reais da escola.**

| Perfil | E-mail | Senha |
|---|---|---|
| Gestão (admin) | `admin@teste.dev` | `Teste@123` |
| Professor(a) | `professor1@teste.dev` | `Teste@123` |
| Professor(a) | `professor2@teste.dev` | `Teste@123` |
| Aluno(a) | `aluno1@teste.dev` | `Teste@123` |
| Aluno(a) | `aluno2@teste.dev` | `Teste@123` |
| Aluno(a) | `aluno3@teste.dev` | `Teste@123` |
| Aluno(a) | `aluno4@teste.dev` | `Teste@123` |

Novas contas de aluno/professor/gestão para uso real são criadas em
**Gestão → Usuários → Nova conta**, já com o cadastro (matrícula/turma ou turmas
acompanhadas) na mesma etapa.

## 6. Funcionalidades implementadas

**Autenticação e permissões**
- Login, recuperação de senha por e-mail e definição de nova senha (Supabase Auth).
- Três perfis (aluno, professor, gestão) com áreas e permissões completamente separadas por
  Row Level Security no banco — não apenas escondidas na interface.
- Contas criadas por autocadastro nunca recebem papel administrativo automaticamente; o papel
  só pode ser definido pelo servidor no momento em que a gestão cria a conta.

**Aluno** — experiência estilo "app de leitura"
- Catálogo pesquisável e filtrável (categoria, disponibilidade, avaliação mínima, ordenar por
  populares/melhor avaliados/recentes), com página de detalhe do livro (capa grande, sinopse,
  nº de páginas, quantas vezes já foi emprestado, média de estrelas e avaliações de colegas).
- Reservar um livro disponível (com bloqueio de reserva duplicada e, opcionalmente, bloqueio
  para quem está com empréstimo em atraso — configurável), ou **entrar na fila de interesse**
  quando o livro está indisponível — avisado automaticamente quando abrir vaga.
- Cancelar reserva própria.
- Dashboard próprio com livros lidos, páginas lidas, posição no ranking, "continuar lendo",
  novidades disponíveis, livros populares e últimas avaliações da comunidade.
- Ver reservas e empréstimos ativos, com aviso de vencimento ("devolva hoje", "atrasado há N
  dias") e histórico completo de devoluções.
- **Avaliar livros já devolvidos** (1 a 5 estrelas + comentário opcional), com a identidade do
  aluno anonimizada nas avaliações públicas (mostra só a turma, não o nome).
- **Ranking de leitura** (geral, por turma ou do mês) por livros e páginas lidas.
- **Conquistas/gamificação**: medalhas por livros lidos, páginas lidas e avaliações feitas,
  liberadas automaticamente e notificadas na hora.
- **Notificações internas** (sino no topo): reserva confirmada, prazo vencendo amanhã, livro
  devolvido/liberado para avaliar, nova conquista, livro da fila disponível.

**Professor**
- Dashboard com as turmas que acompanha, alunos, reservas pendentes, empréstimos ativos,
  **livros e páginas lidas pelas turmas** e uma seção de **Pendências** com os atrasados.
- Confirmar retirada de uma reserva (define/ajusta o prazo de devolução).
- Registrar empréstimo direto (sem reserva prévia).
- Registrar devolução, com condição do livro (novo/bom/regular/danificado/perdido) — cada
  condição aciona automaticamente o novo status do exemplar, libera a avaliação do aluno e
  contabiliza a leitura para as estatísticas/ranking/conquistas.
- Alterar prazo de um empréstimo em andamento.
- Consultar atrasos e histórico da turma; busca global (livro, aluno, reserva, empréstimo).
- **Ver as avaliações feitas pelos alunos das suas turmas** (nota, comentário e livro).
- Página de leitura de QR Code (`/exemplar/[codigo]`) com ação rápida conforme o status do
  exemplar (emprestar, confirmar retirada ou devolver).

**Gestão (admin)** — visão de supervisão, com dados reais
- Dashboard com indicadores gerais e gráficos interativos (empréstimos/devoluções por mês,
  livros mais emprestados, **livros mais bem avaliados**, turmas mais ativas, **total de
  páginas lidas** e **média geral das avaliações**), sempre calculados a partir dos dados do
  banco — nada fixo no código.
- CRUD de livros (sem exclusão física — apenas ativar/desativar, preservando histórico),
  incluindo **número de páginas**, e gestão de exemplares (adicionar em lote, editar
  condição/localização/status, código único gerado automaticamente no padrão `ALZ-000001`,
  atalho para a página de QR Code).
- CRUD de turmas, alunos (matrícula/turma) e professores (turmas que cada um acompanha).
- Criação de contas de acesso (aluno/professor/gestão), reset de senha e ativação/desativação
  de contas.
- Reservas, empréstimos, atrasos e histórico da escola inteira, com os mesmos filtros do
  professor + filtro por turma.
- **Moderação de avaliações** (remover/restaurar um comentário impróprio, mantendo o
  histórico para auditoria) e **ranking de leitura da escola inteira** (geral/turma/mês).
- Relatórios com filtro por período, turma, aluno, professor ou livro, e exportação em CSV
  (abre corretamente no Excel).
- Auditoria: todas as ações relevantes (cadastro/edição de livros, turmas, alunos,
  professores, configurações, reservas, empréstimos, devoluções, avaliações) ficam
  registradas com quem fez, quando e os detalhes — preenchida automaticamente por triggers.
- Página de configurações gerais (prazo padrão de empréstimo, validade da reserva, limite de
  empréstimos simultâneos por aluno, bloqueio de reserva para quem está em atraso).

**Geral**
- Layout responsivo (celular, tablet, desktop), com identidade visual própria ("lombada de
  livro": azul-marinho + dourado), e uma experiência claramente diferente para cada perfil.
- Sino de notificações no topo, em todas as áreas.
- Modo de impressão simplificado para telas de listagem/relatório.
- Todas as ações destrutivas ou importantes pedem confirmação antes de executar.
- RBAC de verdade: todo o controle de permissão vive no banco (RLS + funções
  `SECURITY DEFINER`), não apenas escondendo botões na tela — testado explicitamente contra
  tentativas de acesso indevido entre alunos, turmas e papéis diferentes.

## 7. Melhorias futuras sugeridas

Fora do escopo desta entrega, mas fáceis de priorizar depois:

- Notificações por e-mail/WhatsApp (hoje as notificações são só internas, dentro do sistema).
- Leitura de QR Code pela câmera do celular (hoje a página `/exemplar/[codigo]` já existe;
  falta só o leitor de câmera apontando para ela).
- Geração de etiquetas com código de barras/QR Code para colar nos livros.
- Recomendações de leitura personalizadas por aluno/turma (com base em categorias já lidas).
- Multas ou penalidades por atraso reincidente.
- Exportação de relatórios em Excel (.xlsx) e PDF, além do CSV já disponível.
- Edição do papel (role) de uma conta já existente (hoje, a gestão desativa e cria uma nova
  conta com o papel correto).
- Integração com outros sistemas da escola (matrícula, diário de classe).

## 8. Notas de segurança e arquitetura

- **RPCs `SECURITY DEFINER`** concentram toda regra de negócio sensível (reservar, cancelar,
  confirmar retirada, emprestar, devolver, alterar prazo) — validadas linha a linha durante o
  desenvolvimento (bloqueio de reserva duplicada, isolamento de turmas por RLS, impossibilidade
  de autopromoção de papel, bloqueio de escrita direta nas tabelas transacionais, etc.).
- **Row Level Security** ativada em todas as tabelas; a chave `anon` não tem nenhum acesso e a
  chave `service_role` só é usada no servidor, depois de confirmar que quem chamou é
  administrador.
- **Auditoria automática**: um trigger genérico grava em `logs` qualquer INSERT/UPDATE/DELETE
  nas tabelas de cadastro, além de chamadas manuais dentro das RPCs de negócio — guardando uma
  "fotografia" legível do que aconteceu mesmo que os dados mudem depois.
- Os cabeçalhos de segurança HTTP (X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy) já vêm configurados em `next.config.mjs`.

## 9. Evolução do sistema — migration 006

Esta versão reestruturou as três áreas para terem experiências e permissões bem distintas, sem
quebrar nada do que já existia (nenhuma migration antiga foi alterada; tudo foi feito em cima,
na `supabase/migrations/006_evolucao.sql`). Resumo do que foi adicionado:

**Tabelas novas**: `avaliacoes`, `conquistas`, `aluno_conquistas`, `notificacoes`,
`fila_interesse`. **Coluna nova**: `livros.numero_paginas`. Todas com RLS própria e sem
nenhuma exclusão/renomeação de estrutura existente.

**Funções novas**: `avaliar_livro`, `moderar_avaliacao`, `avaliacoes_publicas`,
`entrar_fila_interesse`, `sair_fila_interesse`, `verificar_conquistas`, `estatisticas_aluno`,
`ranking_leitura`, `marcar_notificacoes_lidas`, `_avisar_fila_interesse`, `_notificar`. As
funções `reservar_livro`, `cancelar_reserva`, `expirar_reservas`, `registrar_devolucao` e
`manutencao_periodica` foram recriadas com a **mesma lógica de negócio original** (validado por
diff automatizado), apenas com a adição de notificações e verificação de conquistas.

**Se você já tem um projeto Supabase rodando com as migrations 001–005**: basta rodar
`006_evolucao.sql` uma vez no SQL Editor — é seguro, idempotente e não apaga dado nenhum. Depois
rode `seed_livros_iniciais.sql` se ainda não tiver livros cadastrados.

Nenhuma variável de ambiente nova é necessária para esta evolução.
