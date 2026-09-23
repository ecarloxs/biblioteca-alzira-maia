import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllTurmas } from "@/lib/data/turmas";
import { setAlunoAtivo } from "@/lib/actions/pessoas";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlunoEditDialog } from "@/components/admin/aluno-edit-dialog";
import { ToggleAtivoButton } from "@/components/admin/toggle-ativo-button";
import { first, sanitizeSearch } from "@/lib/utils";
import { TABLE_PAGE_SIZE } from "@/lib/constants";
import type { SearchParams, VAluno } from "@/types";

export const metadata = { title: "Alunos" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sanitizeSearch(first(sp.q));
  const turma = first(sp.turma);
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();
  const turmas = await getAllTurmas(supabase, { includeInactive: true });

  let query = supabase.from("v_alunos").select("*", { count: "exact" }).order("nome");
  if (q) query = query.or(`nome.ilike.*${q}*,matricula.ilike.*${q}*`);
  if (turma) query = query.eq("turma_id", turma);
  const { data, count } = await query.range((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE - 1);
  const alunos = (data ?? []) as VAluno[];

  return (
    <>
      <PageHeader
        title="Alunos"
        description="Cadastro dos alunos matriculados na biblioteca."
        actions={
          <Button asChild>
            <Link href="/admin/usuarios?criar=aluno">
              <UserPlus /> Novo aluno
            </Link>
          </Button>
        }
      />
      <FilterBar
        fields={[
          { name: "q", label: "Buscar", type: "search", placeholder: "Nome ou matrícula" },
          { name: "turma", label: "Turma", type: "select", allLabel: "Todas as turmas", options: turmas.map((t) => ({ value: t.id, label: t.nome })) },
        ]}
      />
      {alunos.length === 0 ? (
        <EmptyState icon={<Users />} title="Nenhum aluno encontrado" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Nome</TH>
                <TH>Matrícula</TH>
                <TH>Turma</TH>
                <TH>Situação</TH>
                <TH className="text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {alunos.map((a) => (
                <TR key={a.id}>
                  <TD className="font-medium">{a.nome}</TD>
                  <TD>{a.matricula}</TD>
                  <TD>{a.turma_nome ?? "Sem turma"}</TD>
                  <TD>
                    <Badge tone={a.ativo ? "success" : "neutral"}>{a.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <AlunoEditDialog aluno={a} turmas={turmas} />
                      <ToggleAtivoButton ativo={a.ativo} nome={a.nome} onToggle={(v) => setAlunoAtivo(a.id, v)} />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
      <Pagination page={page} pageSize={TABLE_PAGE_SIZE} total={count ?? 0} basePath="/admin/alunos" params={{ q, turma }} />
    </>
  );
}
