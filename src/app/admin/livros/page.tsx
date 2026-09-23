import Link from "next/link";
import { SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCatalog, getCategorias } from "@/lib/data/catalog";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookCover } from "@/components/shared/book-cover";
import { LivroFormDialog } from "@/components/admin/livro-form-dialog";
import { first } from "@/lib/utils";
import { TABLE_PAGE_SIZE } from "@/lib/constants";
import type { SearchParams } from "@/types";

export const metadata = { title: "Livros" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = first(sp.q);
  const categoria = first(sp.categoria);
  const disp = first(sp.disp);
  const page = Number(first(sp.page)) || 1;

  const supabase = await createClient();
  const [{ items, total }, categorias] = await Promise.all([
    getCatalog(supabase, { q, categoria, disp, page, includeInactive: true, pageSize: TABLE_PAGE_SIZE }),
    getCategorias(supabase),
  ]);

  return (
    <>
      <PageHeader title="Livros" description="Cadastro de títulos e gerenciamento de exemplares." actions={<LivroFormDialog />} />
      <FilterBar
        fields={[
          { name: "q", label: "Buscar", type: "search", placeholder: "Título, autor ou ISBN" },
          { name: "categoria", label: "Categoria", type: "select", allLabel: "Todas", options: categorias.map((c) => ({ value: c, label: c })) },
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
        ]}
      />
      {items.length === 0 ? (
        <EmptyState icon={<SearchX />} title="Nenhum livro encontrado" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Livro</TH>
                <TH>Categoria</TH>
                <TH>Exemplares</TH>
                <TH>Situação</TH>
                <TH className="text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((l) => (
                <TR key={l.id}>
                  <TD>
                    <Link href={`/admin/livros/${l.id}`} className="flex items-center gap-3">
                      <div className="w-10 shrink-0">
                        <BookCover titulo={l.titulo} capaUrl={l.capa_url} />
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-[18rem] truncate font-medium hover:underline">{l.titulo}</p>
                        <p className="truncate text-xs text-muted-foreground">{l.autor}</p>
                      </div>
                    </Link>
                  </TD>
                  <TD>{l.categoria}</TD>
                  <TD>
                    {l.disponiveis}/{l.total_exemplares} disponíveis
                  </TD>
                  <TD>
                    <Badge tone={l.ativo ? "success" : "neutral"}>{l.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TD>
                  <TD className="text-right">
                    <Link href={`/admin/livros/${l.id}`} className="text-sm font-semibold text-primary hover:underline">
                      Gerenciar
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
      <Pagination page={page} pageSize={TABLE_PAGE_SIZE} total={total} basePath="/admin/livros" params={{ q, categoria, disp }} />
    </>
  );
}
