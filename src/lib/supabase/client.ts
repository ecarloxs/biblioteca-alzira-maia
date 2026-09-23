import { createBrowserClient } from "@supabase/ssr";

/** Cliente do navegador — usa apenas a chave pública (anon). O acesso real é protegido por RLS. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
