import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/shared/star-rating";
import { ModerarAvaliacaoButton } from "@/components/admin/moderar-avaliacao-button";
import { first, formatDate } from "@/lib/utils";
import { TABLE_PAGE_SIZE } from "@/lib/constants";
import type { SearchParams, VAvaliacaoAdmin } from "@/types";

export const metadata = { title: "Avaliações" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = first(sp.status);
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();
  let query = supabase.from("v_avaliacoes").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (status === "removidas") query = query.eq("removida", true);
  else query = query.eq("removida", false);
  const { data, count } = await query.range((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE - 1);
  const avaliacoes = (data ?? []) as VAvaliacaoAdmin[];

  return (
    <>
      <PageHeader title="Avaliações" description="Modere as avaliações feitas pelos alunos sobre os livros." />
      <FilterBar
        fields={[
          {
            name: "status",
            label: "Status",
            type: "select",
            allLabel: "Ativas",
            options: [{ value: "removidas", label: "Removidas" }],
          },
        ]}
      />
      {avaliacoes.length === 0 ? (
        <EmptyState icon={<Star />} title="Nenhuma avaliação encontrada" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Livro</TH>
                <TH>Nota</TH>
                <TH>Comentário</TH>
                <TH>Aluno</TH>
                <TH>Turma</TH>
                <TH>Data</TH>
                <TH className="text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {avaliacoes.map((a) => (
                <TR key={a.id}>
                  <TD className="max-w-[12rem] truncate font-medium">{a.livro_titulo}</TD>
                  <TD><StarRating value={a.nota} size="sm" /></TD>
                  <TD className="max-w-[18rem] truncate text-sm text-muted-foreground" title={a.comentario ?? ""}>{a.comentario ?? "—"}</TD>
                  <TD>{a.aluno_nome}</TD>
                  <TD>{a.turma_nome ?? "—"}</TD>
                  <TD className="whitespace-nowrap">{formatDate(a.created_at)}</TD>
                  <TD className="text-right">
                    {a.removida && <Badge tone="neutral">Removida</Badge>}
                    <div className="mt-1 flex justify-end">
                      <ModerarAvaliacaoButton id={a.id} removida={a.removida} />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
      <Pagination page={page} pageSize={TABLE_PAGE_SIZE} total={count ?? 0} basePath="/admin/avaliacoes" params={{ status }} />
    </>
  );
}
