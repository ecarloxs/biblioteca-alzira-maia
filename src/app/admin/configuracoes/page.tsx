import { createClient } from "@/lib/supabase/server";
import { getConfiguracoes } from "@/lib/data/config";
import { PageHeader } from "@/components/shared/page-header";
import { ConfiguracoesForm } from "@/components/admin/configuracoes-form";

export const metadata = { title: "Configurações" };

export default async function Page() {
  const supabase = await createClient();
  const config = await getConfiguracoes(supabase);

  return (
    <>
      <PageHeader title="Configurações" description="Regras gerais de reservas e empréstimos da biblioteca." />
      <ConfiguracoesForm initial={config} />
    </>
  );
}
