export const GENERIC_ERROR = "Não foi possível realizar a operação. Tente novamente.";

interface PgLikeError {
  code?: string;
  message?: string;
}

/**
 * As funções do banco levantam erros de regra de negócio (código P0001) com mensagens
 * já em português e seguras para exibir. Qualquer outro erro vira a mensagem genérica.
 */
export function friendlyError(error: PgLikeError | null | undefined): string {
  if (!error) return GENERIC_ERROR;
  if (error.code === "P0001" && error.message) return error.message;
  if (error.code === "23505") return "Já existe um registro com esses dados.";
  if (error.code === "42501") return "Você não tem permissão para esta ação.";
  return GENERIC_ERROR;
}
