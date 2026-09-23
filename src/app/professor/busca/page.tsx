import { createClient } from "@/lib/supabase/server";
import { globalSearch } from "@/lib/data/search";
import { PageHeader } from "@/components/shared/page-header";
import { SearchResultsView } from "@/components/shared/search-results";
import { first } from "@/lib/utils";
import type { SearchParams } from "@/types";

export const metadata = { title: "Busca" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = first(sp.q);
  const supabase = await createClient();
  const results = await globalSearch(supabase, q);

  return (
    <>
      <PageHeader title="Resultados da busca" description={q ? `Buscando por "${q}"` : undefined} />
      <SearchResultsView results={results} basePath="/professor" />
    </>
  );
}
