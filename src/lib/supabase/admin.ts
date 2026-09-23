import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service_role — IGNORA o RLS.
 * Só pode ser importado em código de servidor (o pacote "server-only" quebra o build se
 * alguém importar isto num componente de cliente). Use APENAS depois de validar que o
 * usuário logado é administrador, e apenas para a API de administração do Auth.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
