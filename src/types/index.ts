export type Role = "admin" | "professor" | "aluno";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  created_at?: string;
}

export interface Turma {
  id: string;
  nome: string;
  ano: number | null;
  turno: string | null;
  ativo: boolean;
}

export interface Livro {
  id: string;
  titulo: string;
  autor: string;
  editora: string | null;
  isbn: string | null;
  ano_publicacao: number | null;
  categoria: string;
  descricao: string | null;
  capa_url: string | null;
  numero_paginas: number | null;
  ativo: boolean;
}

export type StatusGeralLivro = "disponivel" | "emprestimo" | "indisponivel";

export interface LivroCatalogo extends Livro {
  total_exemplares: number;
  disponiveis: number;
  reservados: number;
  emprestados: number;
  status_geral: StatusGeralLivro;
  total_emprestimos: number;
  media_avaliacoes: number;
  total_avaliacoes: number;
}

export type ExemplarStatus = "disponivel" | "reservado" | "emprestado" | "manutencao" | "perdido" | "inativo";
export type Condicao = "novo" | "bom" | "regular" | "danificado";

export interface Exemplar {
  id: string;
  livro_id: string;
  codigo_exemplar: string;
  status: ExemplarStatus;
  condicao: Condicao;
  localizacao: string | null;
}

export interface VAluno {
  id: string;
  profile_id: string;
  matricula: string;
  turma_id: string | null;
  ativo: boolean;
  nome: string;
  email: string;
  turma_nome: string | null;
}

export type ReservaStatus = "ativa" | "atendida" | "cancelada" | "expirada";

export interface VReserva {
  id: string;
  aluno_id: string;
  livro_id: string;
  exemplar_id: string;
  data_reserva: string;
  expira_em: string;
  status: ReservaStatus;
  observacao: string | null;
  livro_titulo: string;
  livro_autor: string;
  capa_url: string | null;
  codigo_exemplar: string;
  aluno_nome: string | null;
  aluno_matricula: string;
  turma_id: string | null;
  turma_nome: string | null;
}

export type EmprestimoStatus = "ativo" | "devolvido" | "atrasado" | "perdido";

export interface VEmprestimo {
  id: string;
  reserva_id: string | null;
  aluno_id: string;
  exemplar_id: string;
  livro_id: string;
  livro_titulo: string;
  livro_autor: string;
  capa_url: string | null;
  codigo_exemplar: string;
  aluno_nome: string | null;
  aluno_matricula: string;
  turma_id: string | null;
  turma_nome: string | null;
  professor_retirada_id: string;
  professor_retirada_nome: string | null;
  data_retirada: string;
  prazo_devolucao: string;
  status: EmprestimoStatus;
  status_efetivo: EmprestimoStatus;
  dias_atraso: number;
  observacao: string | null;
  devolucao_id: string | null;
  data_devolucao: string | null;
  professor_devolucao_id: string | null;
  professor_devolucao_nome: string | null;
  condicao_devolucao: string | null;
  devolucao_observacao: string | null;
}

export interface LogRow {
  id: number;
  usuario_id: string | null;
  usuario_nome: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  detalhes: Record<string, unknown>;
  created_at: string;
}

export interface AdminDashboard {
  total_livros: number;
  total_exemplares: number;
  disponiveis: number;
  emprestados: number;
  reservados: number;
  atrasados: number;
  alunos: number;
  professores: number;
  por_mes: { mes: string; emprestimos: number; devolucoes: number }[];
  mais_emprestados: { titulo: string; total: number }[];
  turmas_mais_ativas: { turma: string; total: number }[];
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// ----------------------------------------------------------------- Evolução:
// avaliações, gamificação, ranking, notificações, fila de interesse
// -----------------------------------------------------------------------

export interface AvaliacaoPublica {
  id: string;
  livro_id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
  autor_anonimizado: string;
}

export interface VAvaliacaoAdmin {
  id: string;
  livro_id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
  removida: boolean;
  aluno_id: string;
  aluno_nome: string;
  turma_nome: string | null;
  livro_titulo: string;
}

export type CriterioConquista = "livros_lidos" | "paginas_lidas" | "avaliacoes_feitas";

export interface Conquista {
  id: string;
  chave: string;
  titulo: string;
  descricao: string;
  icone: string;
  criterio_tipo: CriterioConquista;
  criterio_valor: number;
  ordem: number;
  ativo: boolean;
}

export interface AlunoConquista {
  id: string;
  aluno_id: string;
  conquista_id: string;
  conquistada_em: string;
  conquistas: Conquista;
}

export type NotificacaoTipo = "reserva" | "prazo" | "devolucao" | "avaliacao" | "conquista" | "atrasos" | "sistema";

export interface Notificacao {
  id: string;
  destinatario_id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  entidade: string | null;
  entidade_id: string | null;
  lida: boolean;
  created_at: string;
}

export interface FilaInteresse {
  id: string;
  aluno_id: string;
  livro_id: string;
  created_at: string;
}

export interface RankingLinha {
  aluno_id: string;
  aluno_nome: string;
  turma_nome: string | null;
  livros_lidos: number;
  paginas_lidas: number;
}

export interface EstatisticasAluno {
  livros_lidos: number;
  paginas_lidas: number;
  avaliacoes_feitas: number;
}
