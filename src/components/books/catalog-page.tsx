import { SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCatalog, getCategorias } from "@/lib/data/catalog";
import { first } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { BookCard } from "@/components/books/book-card";
import { PAGE_SIZE } from "@/lib/constants";
import type { SearchParams } from "@/types";

export async function CatalogPage({ basePath, searchParams }: { basePath: string; searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = first(sp.q);
  const categoria = first(sp.categoria);
  const disp = first(sp.disp);
  const ordem = first(sp.ordem);
  const page = Number(first(sp.page)) || 1;

  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica"); // libera exemplares de reservas vencidas
  const [{ items, total }, categorias] = await Promise.all([
    getCatalog(supabase, { q, categoria, disp, ordem, page }),
    getCategorias(supabase),
  ]);

  return (
    <>
      <PageHeader title="Biblioteca" description="Encontre o próximo livro que você vai ler." />
      <FilterBar
        fields={[
          { name: "q", label: "Buscar", type: "search", placeholder: "Título ou autor" },
          { name: "categoria", label: "Categoria", type: "select", options: categorias.map((c) => ({ value: c, label: c })), allLabel: "Todas" },
          {
            name: "disp",
            label: "Disponibilidade",
            type: "select",
            allLabel: "Todos",
            options: [
              { value: "disponiveis", label: "Com exemplar disponível" },
              { value: "indisponiveis", label: "Indisponíveis" },
            ],
          },
          {
            name: "ordem",
            label: "Ordenar por",
            type: "select",
            allLabel: "Título (A–Z)",
            options: [
              { value: "autor", label: "Autor (A–Z)" },
              { value: "recentes", label: "Mais recentes" },
              { value: "disponiveis", label: "Mais disponíveis" },
            ],
          },
        ]}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="Nenhum livro encontrado"
          description="Tente outro título, autor ou remova os filtros."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((l) => (
            <BookCard key={l.id} livro={l} href={`${basePath}/${l.id}`} />
          ))}
        </div>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} params={{ q, categoria, disp, ordem }} />
    </>
  );
}
