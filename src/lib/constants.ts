import type { Role } from "@/types";

export type Tone = "success" | "warning" | "info" | "danger" | "neutral";

export const EXEMPLAR_STATUS: Record<string, { label: string; tone: Tone }> = {
  disponivel: { label: "Disponível", tone: "success" },
  reservado: { label: "Reservado", tone: "warning" },
  emprestado: { label: "Emprestado", tone: "info" },
  manutencao: { label: "Manutenção", tone: "neutral" },
  perdido: { label: "Perdido", tone: "danger" },
  inativo: { label: "Inativo", tone: "neutral" },
};

export const RESERVA_STATUS: Record<string, { label: string; tone: Tone }> = {
  ativa: { label: "Ativa", tone: "warning" },
  atendida: { label: "Atendida", tone: "success" },
  cancelada: { label: "Cancelada", tone: "neutral" },
  expirada: { label: "Expirada", tone: "neutral" },
};

export const EMPRESTIMO_STATUS: Record<string, { label: string; tone: Tone }> = {
  ativo: { label: "Em empréstimo", tone: "info" },
  atrasado: { label: "Atrasado", tone: "danger" },
  devolvido: { label: "Devolvido", tone: "success" },
  perdido: { label: "Perdido", tone: "danger" },
};

export const CONDICOES = [
  { value: "novo", label: "Novo" },
  { value: "bom", label: "Bom" },
  { value: "regular", label: "Regular" },
  { value: "danificado", label: "Danificado" },
] as const;

export const CONDICOES_DEVOLUCAO = [...CONDICOES, { value: "perdido", label: "Perdido" }] as const;

export const CONDICAO_LABEL: Record<string, string> = Object.fromEntries(
  CONDICOES_DEVOLUCAO.map((c) => [c.value, c.label])
);

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Gestão",
  professor: "Professor(a)",
  aluno: "Aluno(a)",
};

export const TURNOS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
  { value: "integral", label: "Integral" },
] as const;

export const CATEGORIAS_SUGERIDAS = [
  "Literatura infantil",
  "Literatura",
  "Clássicos",
  "Poesia",
  "Aventura",
  "Ciências",
  "História",
  "Geografia",
  "Matemática",
  "Artes",
  "Referência",
  "Quadrinhos",
];

export const PAGE_SIZE = 12;
export const TABLE_PAGE_SIZE = 20;

/** Rótulos legíveis para a tabela de auditoria (logs.acao). */
export const ACAO_LABEL: Record<string, string> = {
  aluno_reservou_livro: "Reservou livro",
  reserva_cancelada: "Cancelou reserva",
  professor_registrou_emprestimo: "Registrou empréstimo",
  professor_registrou_devolucao: "Registrou devolução",
  prazo_alterado: "Alterou prazo de devolução",
  insert_livros: "Cadastrou livro",
  update_livros: "Alterou livro",
  insert_exemplares: "Cadastrou exemplar",
  update_exemplares: "Alterou exemplar",
  delete_exemplares: "Removeu exemplar",
  insert_alunos: "Cadastrou aluno",
  update_alunos: "Alterou aluno",
  insert_professores: "Cadastrou professor",
  update_professores: "Alterou professor",
  insert_professor_turmas: "Vinculou professor a turma",
  delete_professor_turmas: "Removeu vínculo professor/turma",
  insert_turmas: "Cadastrou turma",
  update_turmas: "Alterou turma",
  update_configuracoes: "Alterou configuração",
  insert_configuracoes: "Criou configuração",
  update_profiles: "Alterou usuário",
};

export const ENTIDADE_LABEL: Record<string, string> = {
  livros: "Livros",
  exemplares: "Exemplares",
  reservas: "Reservas",
  emprestimos: "Empréstimos",
  devolucoes: "Devoluções",
  alunos: "Alunos",
  professores: "Professores",
  professor_turmas: "Vínculos",
  turmas: "Turmas",
  configuracoes: "Configurações",
  profiles: "Usuários",
};

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const NAV: Record<Role, NavItem[]> = {
  aluno: [
    { href: "/aluno", label: "Início", icon: "home" },
    { href: "/aluno/biblioteca", label: "Biblioteca", icon: "library" },
    { href: "/aluno/reservas", label: "Minhas reservas", icon: "bookmark" },
    { href: "/aluno/emprestimos", label: "Meus empréstimos", icon: "book-open" },
    { href: "/aluno/historico", label: "Histórico", icon: "history" },
  ],
  professor: [
    { href: "/professor", label: "Início", icon: "home" },
    { href: "/professor/reservas", label: "Reservas", icon: "bookmark" },
    { href: "/professor/emprestimos", label: "Empréstimos", icon: "book-open" },
    { href: "/professor/atrasos", label: "Atrasos", icon: "alarm" },
    { href: "/professor/historico", label: "Histórico", icon: "history" },
    { href: "/professor/biblioteca", label: "Catálogo", icon: "library" },
  ],
  admin: [
    { href: "/admin", label: "Painel", icon: "layout" },
    { href: "/admin/livros", label: "Livros", icon: "library" },
    { href: "/admin/reservas", label: "Reservas", icon: "bookmark" },
    { href: "/admin/emprestimos", label: "Empréstimos", icon: "book-open" },
    { href: "/admin/atrasos", label: "Atrasos", icon: "alarm" },
    { href: "/admin/historico", label: "Histórico", icon: "history" },
    { href: "/admin/alunos", label: "Alunos", icon: "users" },
    { href: "/admin/professores", label: "Professores", icon: "graduation" },
    { href: "/admin/turmas", label: "Turmas", icon: "school" },
    { href: "/admin/usuarios", label: "Usuários", icon: "shield" },
    { href: "/admin/relatorios", label: "Relatórios", icon: "chart" },
    { href: "/admin/auditoria", label: "Auditoria", icon: "scroll" },
    { href: "/admin/configuracoes", label: "Configurações", icon: "settings" },
  ],
};
