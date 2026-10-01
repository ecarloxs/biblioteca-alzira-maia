import { Users2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllTurmas } from "@/lib/data/turmas";
import { setUsuarioAtivo } from "@/lib/actions/usuarios";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateUsuarioDialog } from "@/components/admin/create-usuario-dialog";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import { ToggleAtivoButton } from "@/components/admin/toggle-ativo-button";
import { first, formatDate, sanitizeSearch } from "@/lib/utils";
import { ROLE_LABEL, TABLE_PAGE_SIZE } from "@/lib/constants";
import type { Profile, SearchParams } from "@/types";

export const metadata = { title: "Usuários" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sanitizeSearch(first(sp.q));
  const role = first(sp.role);
  const criar = first(sp.criar) as "aluno" | "professor" | undefined;
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();
  const turmas = await getAllTurmas(supabase, { includeInactive: true });

  let query = supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (q) query = query.or(`nome.ilike.*${q}*,email.ilike.*${q}*`);
  if (role) query = query.eq("role", role);
  const { data, count } = await query.range((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE - 1);
  const usuarios = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Contas de acesso ao sistema. A criação de contas de aluno/professor também cria o cadastro correspondente."
        actions={<CreateUsuarioDialog turmas={turmas} defaultRole={criar} />}
      />
      <FilterBar
        fields={[
          { name: "q", label: "Buscar", type: "search", placeholder: "Nome ou e-mail" },
          {
            name: "role",
            label: "Perfil",
            type: "select",
            allLabel: "Todos os perfis",
            options: [
              { value: "aluno", label: ROLE_LABEL.aluno },
              { value: "professor", label: ROLE_LABEL.professor },
              { value: "admin", label: ROLE_LABEL.admin },
            ],
          },
        ]}
      />
      {usuarios.length === 0 ? (
        <EmptyState icon={<Users2 />} title="Nenhum usuário encontrado" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Nome</TH>
                <TH>E-mail</TH>
                <TH>Perfil</TH>
                <TH>Desde</TH>
                <TH>Situação</TH>
                <TH className="text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {usuarios.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium">{u.nome}</TD>
                  <TD className="text-muted-foreground">{u.email}</TD>
                  <TD>
                    <Badge tone="neutral">{ROLE_LABEL[u.role]}</Badge>
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(u.created_at)}</TD>
                  <TD>
                    <Badge tone={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <ResetPasswordDialog profileId={u.id} nome={u.nome} />
                      <ToggleAtivoButton ativo={u.ativo} nome={u.nome} onToggle={setUsuarioAtivo.bind(null, u.id)} />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
      <Pagination page={page} pageSize={TABLE_PAGE_SIZE} total={count ?? 0} basePath="/admin/usuarios" params={{ q, role }} />
    </>
  );
}
