import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { getConfiguracoes } from "@/lib/data/config";
import { BookCover } from "@/components/shared/book-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReserveButton } from "@/components/reservations/reserve-button";
import { CONDICAO_LABEL } from "@/lib/constants";
import type { Exemplar, LivroCatalogo } from "@/types";

export async function BookDetail({ id, role }: { id: string; role: "aluno" | "professor" }) {
  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");

  const { data: livro } = await supabase.from("v_livros_catalogo").select("*").eq("id", id).maybeSingle<LivroCatalogo>();
  if (!livro || !livro.ativo) notFound();

  const session = await getSessionProfile();
  const cfg = await getConfiguracoes(supabase);

  let jaReservou = false;
  let semCadastro = false;
  if (role === "aluno" && session) {
    const { data: aluno } = await supabase.from("v_alunos").select("id").eq("profile_id", session.user.id).eq("ativo", true).maybeSingle();
    semCadastro = !aluno;
    const { count } = await supabase
      .from("reservas")
      .select("id", { count: "exact", head: true })
      .eq("livro_id", id)
      .eq("status", "ativa");
    jaReservou = (count ?? 0) > 0;
  }

  let exemplares: Exemplar[] = [];
  if (role === "professor") {
    const { data } = await supabase.from("exemplares").select("*").eq("livro_id", id).order("codigo_exemplar");
    exemplares = (data ?? []) as Exemplar[];
  }

  const base = `/${role}/biblioteca`;
  const disp = livro.disponiveis;

  return (
    <>
      <Link href={base} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar à biblioteca
      </Link>

      <div className="grid gap-8 md:grid-cols-[minmax(0,260px)_1fr]">
        <div className="mx-auto w-full max-w-[260px] md:mx-0">
          <BookCover titulo={livro.titulo} autor={livro.autor} capaUrl={livro.capa_url} />
        </div>

        <div>
          <Badge tone="neutral">{livro.categoria}</Badge>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">{livro.titulo}</h1>
          <p className="mt-1 text-lg text-muted-foreground">{livro.autor}</p>

          <dl className="mt-5 grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-4">
              <dt className="text-sm text-muted-foreground">Exemplares</dt>
              <dd className="font-display text-2xl font-bold">{livro.total_exemplares}</dd>
            </div>
            <div className={`rounded-lg border p-4 ${disp > 0 ? "bg-success-soft" : "bg-card"}`}>
              <dt className="text-sm text-muted-foreground">Disponíveis</dt>
              <dd className={`font-display text-2xl font-bold ${disp > 0 ? "text-success" : ""}`}>{disp}</dd>
            </div>
          </dl>

          {role === "aluno" && (
            <div className="mt-5 max-w-md">
              {semCadastro ? (
                <p className="rounded-md bg-warning-soft p-3 text-sm text-warning">
                  Seu cadastro de aluno ainda não foi concluído. Procure a gestão da biblioteca.
                </p>
              ) : jaReservou ? (
                <p className="rounded-md bg-info-soft p-3 text-sm text-info">
                  Você já reservou este livro. <Link href="/aluno/reservas" className="font-semibold underline">Ver minhas reservas</Link>
                </p>
              ) : (
                <>
                  <ReserveButton
                    livroId={livro.id}
                    titulo={livro.titulo}
                    autor={livro.autor}
                    validadeDias={cfg.validade_reserva_dias}
                    disabled={disp === 0}
                    className="w-full sm:w-auto"
                  />
                  {disp === 0 && <p className="mt-2 text-sm text-muted-foreground">Todos os exemplares estão emprestados ou reservados no momento.</p>}
                </>
              )}
            </div>
          )}

          {livro.descricao && (
            <section className="mt-6 max-w-2xl">
              <h2 className="mb-1 text-lg font-semibold">Sobre o livro</h2>
              <p className="leading-relaxed text-foreground/85">{livro.descricao}</p>
            </section>
          )}

          <dl className="mt-6 grid max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            {livro.editora && (<><dt className="text-muted-foreground">Editora</dt><dd>{livro.editora}</dd></>)}
            {livro.ano_publicacao && (<><dt className="text-muted-foreground">Ano</dt><dd>{livro.ano_publicacao}</dd></>)}
            {livro.isbn && (<><dt className="text-muted-foreground">ISBN</dt><dd>{livro.isbn}</dd></>)}
          </dl>
        </div>
      </div>

      {role === "professor" && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Exemplares</h2>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Código</TH><TH>Status</TH><TH>Condição</TH><TH>Localização</TH><TH className="text-right">QR Code</TH>
              </TR>
            </THead>
            <TBody>
              {exemplares.map((x) => (
                <TR key={x.id}>
                  <TD className="font-medium">{x.codigo_exemplar}</TD>
                  <TD><StatusBadge kind="exemplar" value={x.status} /></TD>
                  <TD>{CONDICAO_LABEL[x.condicao]}</TD>
                  <TD>{x.localizacao ?? "—"}</TD>
                  <TD className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/exemplar/${x.codigo_exemplar}`}><QrCode /> Abrir</Link>
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>
      )}
    </>
  );
}
