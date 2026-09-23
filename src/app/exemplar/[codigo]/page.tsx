import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { getPrazoPadraoISO } from "@/lib/data/config";
import { Badge } from "@/components/ui/badge";
import { BookCover } from "@/components/shared/book-cover";
import { StatusBadge } from "@/components/shared/status-badge";
import { Summary } from "@/components/shared/confirm-dialog";
import { WithdrawButton } from "@/components/reservations/withdraw-button";
import { ReturnButton } from "@/components/loans/return-button";
import { NewLoanDialog, type AlunoOption } from "@/components/loans/new-loan-dialog";
import { CONDICAO_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Exemplar, Livro, VAluno, VEmprestimo, VReserva } from "@/types";

export const metadata = { title: "Exemplar" };

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const supabase = await createClient();
  await supabase.rpc("manutencao_periodica");

  const { data: exemplar } = await supabase
    .from("exemplares")
    .select("*, livros(*)")
    .eq("codigo_exemplar", codigo)
    .maybeSingle<Exemplar & { livros: Livro }>();
  if (!exemplar) notFound();

  const session = await getSessionProfile();
  const livro = exemplar.livros;

  let reserva: VReserva | null = null;
  let emprestimo: VEmprestimo | null = null;
  let alunos: AlunoOption[] = [];
  let prazoPadrao = "";

  if (exemplar.status === "reservado") {
    const { data } = await supabase.from("v_reservas").select("*").eq("exemplar_id", exemplar.id).eq("status", "ativa").maybeSingle();
    reserva = data as VReserva | null;
    prazoPadrao = await getPrazoPadraoISO(supabase);
  } else if (exemplar.status === "emprestado") {
    const { data } = await supabase
      .from("v_emprestimos")
      .select("*")
      .eq("exemplar_id", exemplar.id)
      .in("status_efetivo", ["ativo", "atrasado"])
      .maybeSingle();
    emprestimo = data as VEmprestimo | null;
  } else if (exemplar.status === "disponivel") {
    const { data } = await supabase.from("v_alunos").select("*").eq("ativo", true).order("nome");
    alunos = ((data ?? []) as VAluno[]).map((a) => ({ id: a.id, nome: a.nome, turma_nome: a.turma_nome, matricula: a.matricula }));
    prazoPadrao = await getPrazoPadraoISO(supabase);
  }

  const backHref = `/${session?.profile.role ?? "professor"}/biblioteca/${livro.id}`;

  return (
    <>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar ao livro
      </Link>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 shrink-0">
            <BookCover titulo={livro.titulo} autor={livro.autor} capaUrl={livro.capa_url} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <QrCode className="size-3.5" /> {exemplar.codigo_exemplar}
            </p>
            <h1 className="mt-0.5 font-display text-xl font-bold leading-tight">{livro.titulo}</h1>
            <p className="text-sm text-muted-foreground">{livro.autor}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge kind="exemplar" value={exemplar.status} />
              <Badge tone="neutral">Condição: {CONDICAO_LABEL[exemplar.condicao]}</Badge>
              {exemplar.localizacao && <Badge tone="neutral">{exemplar.localizacao}</Badge>}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-6">
          {exemplar.status === "disponivel" && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">Este exemplar está disponível. Registre o empréstimo direto para o aluno que está retirando agora.</p>
              <NewLoanDialog alunos={alunos} exemplares={[{ id: exemplar.id, codigo_exemplar: exemplar.codigo_exemplar, livro_titulo: livro.titulo }]} defaultPrazo={prazoPadrao} defaultExemplarId={exemplar.id} label="Registrar empréstimo" />
            </>
          )}

          {exemplar.status === "reservado" && reserva && (
            <>
              <p className="mb-3 text-sm font-semibold">Reservado para retirada</p>
              <Summary
                items={[
                  { label: "Aluno", value: reserva.aluno_nome ?? "—" },
                  { label: "Turma", value: reserva.turma_nome ?? "—" },
                  { label: "Reservado em", value: formatDateTime(reserva.data_reserva) },
                  { label: "Expira em", value: formatDateTime(reserva.expira_em) },
                ]}
              />
              <div className="mt-4">
                <WithdrawButton
                  reservaId={reserva.id}
                  alunoNome={reserva.aluno_nome}
                  livroTitulo={livro.titulo}
                  codigoExemplar={exemplar.codigo_exemplar}
                  defaultPrazo={prazoPadrao}
                  responsavelNome={session?.profile.nome ?? ""}
                />
              </div>
            </>
          )}

          {exemplar.status === "emprestado" && emprestimo && (
            <>
              <p className="mb-3 text-sm font-semibold">Emprestado</p>
              <Summary
                items={[
                  { label: "Aluno", value: emprestimo.aluno_nome ?? "—" },
                  { label: "Turma", value: emprestimo.turma_nome ?? "—" },
                  { label: "Retirado em", value: formatDate(emprestimo.data_retirada) },
                  { label: "Prazo", value: formatDate(emprestimo.prazo_devolucao) },
                ]}
              />
              <div className="mt-4">
                <ReturnButton
                  emprestimoId={emprestimo.id}
                  alunoNome={emprestimo.aluno_nome}
                  livroTitulo={livro.titulo}
                  dataRetirada={emprestimo.data_retirada}
                  prazo={emprestimo.prazo_devolucao}
                  diasAtraso={emprestimo.dias_atraso}
                  responsavelNome={session?.profile.nome ?? ""}
                />
              </div>
            </>
          )}

          {(exemplar.status === "manutencao" || exemplar.status === "perdido" || exemplar.status === "inativo") && (
            <p className="text-sm text-muted-foreground">
              Este exemplar não está disponível para empréstimo no momento
              {session?.profile.role === "admin" && (
                <>
                  {" "}
                  · <Link href={`/admin/livros/${livro.id}`} className="font-semibold text-primary hover:underline">gerenciar na gestão</Link>
                </>
              )}
              .
            </p>
          )}
        </div>
      </div>
    </>
  );
}
