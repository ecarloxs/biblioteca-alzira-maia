import Link from "next/link";
import { GraduationCap, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllTurmas } from "@/lib/data/turmas";
import { setProfessorAtivo } from "@/lib/actions/pessoas";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfessorTurmasDialog } from "@/components/admin/professor-turmas-dialog";
import { ToggleAtivoButton } from "@/components/admin/toggle-ativo-button";

export const metadata = { title: "Professores" };

interface Row {
  id: string;
  ativo: boolean;
  profiles: { nome: string; email: string } | null;
  professor_turmas: { turma_id: string; turmas: { nome: string } | null }[];
}

export default async function Page() {
  const supabase = await createClient();
  const [{ data }, turmas] = await Promise.all([
    supabase
      .from("professores")
      .select("id, ativo, profiles(nome, email), professor_turmas(turma_id, turmas(nome))")
      .order("id"),
    getAllTurmas(supabase, { includeInactive: true }),
  ]);
  const professores = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader
        title="Professores"
        description="Professores e as turmas que cada um acompanha."
        actions={
          <Button asChild>
            <Link href="/admin/usuarios?criar=professor">
              <UserPlus /> Novo professor
            </Link>
          </Button>
        }
      />
      {professores.length === 0 ? (
        <EmptyState icon={<GraduationCap />} title="Nenhum professor cadastrado" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Nome</TH>
                <TH>E-mail</TH>
                <TH>Turmas</TH>
                <TH>Situação</TH>
                <TH className="text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {professores.map((p) => {
                const nomes = p.professor_turmas.map((pt) => pt.turmas?.nome).filter(Boolean) as string[];
                return (
                  <TR key={p.id}>
                    <TD className="font-medium">{p.profiles?.nome ?? "—"}</TD>
                    <TD className="text-muted-foreground">{p.profiles?.email ?? "—"}</TD>
                    <TD className="max-w-[16rem]">
                      {nomes.length === 0 ? <span className="text-muted-foreground">Nenhuma</span> : nomes.join(", ")}
                    </TD>
                    <TD>
                      <Badge tone={p.ativo ? "success" : "neutral"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <ProfessorTurmasDialog
                          professorId={p.id}
                          nome={p.profiles?.nome ?? ""}
                          turmas={turmas}
                          vinculadas={p.professor_turmas.map((pt) => pt.turma_id)}
                        />
                        <ToggleAtivoButton ativo={p.ativo} nome={p.profiles?.nome ?? ""} onToggle={setProfessorAtivo.bind(null, p.id)} />
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}
