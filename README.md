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
│   ├── 00_setup_completo.sql     # 001..005 concatenados — cole isso no SQL Editor
│   ├── seed_demo.sql             # ⚠️ opcional: 10 livros de demonstração
│   └── migrations/
│       ├── 001_schema.sql            # tabelas
│       ├── 002_funcoes_e_regras.sql  # RPCs de negócio, triggers, auditoria
│       ├── 003_views.sql             # views de leitura (v_livros_catalogo, v_alunos...)
│       ├── 004_rls_policies.sql      # Row Level Security + grants/revokes + storage
│       └── 005_dados_iniciais.sql    # as 9 turmas iniciais + configurações padrão
├── src/
│   ├── app/
│   │   ├── login/, recuperar-senha/, redefinir-senha/, auth/   # autenticação
│   │   ├── aluno/            # área do aluno (catálogo, reservas, empréstimos, histórico)
│   │   ├── professor/        # área do professor (turmas, reservas, empréstimos, atrasos...)
│   │   ├── admin/            # área da gestão (dashboard, CRUDs, relatórios, auditoria...)
│   │   └── exemplar/[codigo] # página de leitura de QR Code de um exemplar
│   ├── components/
│   │   ├── ui/               # botão, input, card, badge, diálogo, tabela (estilo shadcn)
│   │   ├── shared/            # layout (AppShell), filtros, paginação, diálogo de confirmação...
│   │   ├── books/, reservations/, loans/   # componentes de cada fluxo de negócio
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
   - Se preferir, rode os 5 arquivos de `supabase/migrations/` um por um, na ordem numérica.
3. **(Opcional)** Para já ter alguns livros para testar a interface, rode também
   `supabase/seed_demo.sql`. Todos os títulos vêm marcados como `[DEMO]` na descrição para
   ficar claro que não são dados reais — apague-os quando for usar o sistema de verdade.
4. Em **Project Settings → API**, copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponha essa chave no
     navegador; ela só é usada em Server Actions, no servidor, para criar contas de usuário).
5. Em **Authentication → URL Configuration**, cadastre a URL do seu site (local ou da Vercel)
   em *Site URL* e *Redirect URLs*, para o link de "esqueci minha senha" funcionar.
6. O bucket de armazenamento `capas` (para imagens de capa de livro) já é criado pela
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

**Aluno**
- Catálogo pesquisável e filtrável (categoria, disponibilidade), com página de detalhe do livro.
- Reservar um livro disponível (com bloqueio de reserva duplicada e, opcionalmente, bloqueio
  para quem está com empréstimo em atraso — configurável).
- Cancelar reserva própria.
- Ver reservas e empréstimos ativos, com aviso de vencimento ("devolva hoje", "atrasado há N
  dias") e histórico completo de devoluções.

**Professor**
- Dashboard com as turmas que acompanha, alunos, reservas pendentes e empréstimos ativos.
- Confirmar retirada de uma reserva (define/ajusta o prazo de devolução).
- Registrar empréstimo direto (sem reserva prévia).
- Registrar devolução, com condição do livro (novo/bom/regular/danificado/perdido) — cada
  condição aciona automaticamente o novo status do exemplar.
- Alterar prazo de um empréstimo em andamento.
- Consultar atrasos e histórico da turma; busca global (livro, aluno, reserva, empréstimo).
- Página de leitura de QR Code (`/exemplar/[codigo]`) com ação rápida conforme o status do
  exemplar (emprestar, confirmar retirada ou devolver).

**Gestão (admin)**
- Dashboard com indicadores gerais e gráficos (empréstimos/devoluções por mês, livros mais
  emprestados, turmas mais ativas), usando a função `admin_dashboard()`.
- CRUD de livros (sem exclusão física — apenas ativar/desativar, preservando histórico) e
  gestão de exemplares (adicionar em lote, editar condição/localização/status, código único
  gerado automaticamente no padrão `ALZ-000001`, atalho para a página de QR Code).
- CRUD de turmas, alunos (matrícula/turma) e professores (turmas que cada um acompanha).
- Criação de contas de acesso (aluno/professor/gestão), reset de senha e ativação/desativação
  de contas.
- Reservas, empréstimos, atrasos e histórico da escola inteira, com os mesmos filtros do
  professor + filtro por turma.
- Relatórios com filtro por período, turma, aluno, professor ou livro, e exportação em CSV
  (abre corretamente no Excel).
- Auditoria: todas as ações relevantes (cadastro/edição de livros, turmas, alunos,
  professores, configurações, reservas, empréstimos, devoluções) ficam registradas com quem
  fez, quando e os detalhes — preenchida automaticamente por triggers no banco.
- Página de configurações gerais (prazo padrão de empréstimo, validade da reserva, limite de
  empréstimos simultâneos por aluno, bloqueio de reserva para quem está em atraso).

**Geral**
- Layout responsivo (celular, tablet, desktop), com identidade visual própria ("lombada de
  livro": azul-marinho + dourado).
- Modo de impressão simplificado para telas de listagem/relatório.
- Todas as ações destrutivas ou importantes pedem confirmação antes de executar.

## 7. Melhorias futuras sugeridas

Fora do escopo desta primeira entrega, mas fáceis de priorizar depois:

- Notificações por e-mail/WhatsApp de vencimento próximo e de reserva disponível.
- Fila de espera quando todos os exemplares de um livro estão emprestados.
- Leitura de QR Code pela câmera do celular (hoje a página `/exemplar/[codigo]` já existe;
  falta só o leitor de câmera apontando para ela).
- Geração de etiquetas com código de barras/QR Code para colar nos livros.
- Recomendações de leitura personalizadas por aluno/turma.
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
