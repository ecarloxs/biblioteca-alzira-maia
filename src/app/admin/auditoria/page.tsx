import { ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { first, formatDateTime, sanitizeSearch } from "@/lib/utils";
import { ACAO_LABEL, ENTIDADE_LABEL, TABLE_PAGE_SIZE } from "@/lib/constants";
import type { LogRow, SearchParams } from "@/types";

export const metadata = { title: "Auditoria" };

function formatDetalhes(detalhes: Record<string, unknown>) {
  const entries = Object.entries(detalhes ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return "—";
  return entries.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ");
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const entidade = first(sp.entidade);
  const q = sanitizeSearch(first(sp.q));
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();
  let query = supabase.from("logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (entidade) query = query.eq("entidade", entidade);
  if (q) query = query.or(`usuario_nome.ilike.*${q}*,acao.ilike.*${q}*`);
  const { data, count } = await query.range((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE - 1);
  const logs = (data ?? []) as LogRow[];

  return (
    <>
      <PageHeader title="Auditoria" description="Registro de todas as ações realizadas no sistema." />
      <FilterBar
        fields={[
          { name: "q", label: "Buscar", type: "search", placeholder: "Nome do usuário ou ação" },
          {
            name: "entidade",
            label: "Entidade",
            type: "select",
            allLabel: "Todas",
            options: Object.entries(ENTIDADE_LABEL).map(([value, label]) => ({ value, label })),
          },
        ]}
      />
      {logs.length === 0 ? (
        <EmptyState icon={<ScrollText />} title="Nenhum registro encontrado" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Quando</TH>
                <TH>Usuário</TH>
                <TH>Ação</TH>
                <TH>Entidade</TH>
                <TH>Detalhes</TH>
              </TR>
            </THead>
            <TBody>
              {logs.map((l) => (
                <TR key={l.id}>
                  <TD className="whitespace-nowrap">{formatDateTime(l.created_at)}</TD>
                  <TD>{l.usuario_nome ?? "Sistema"}</TD>
                  <TD>
                    <Badge tone="neutral">{ACAO_LABEL[l.acao] ?? l.acao}</Badge>
                  </TD>
                  <TD>{ENTIDADE_LABEL[l.entidade] ?? l.entidade}</TD>
                  <TD className="max-w-md truncate text-xs text-muted-foreground" title={formatDetalhes(l.detalhes)}>
                    {formatDetalhes(l.detalhes)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
      <Pagination page={page} pageSize={TABLE_PAGE_SIZE} total={count ?? 0} basePath="/admin/auditoria" params={{ q, entidade }} />
    </>
  );
}
