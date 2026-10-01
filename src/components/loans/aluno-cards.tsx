import Link from "next/link";
import { BookCover } from "@/components/shared/book-cover";
import { StatusBadge } from "@/components/shared/status-badge";
import { CancelReservationButton } from "@/components/reservations/cancel-reservation-button";
import { CONDICAO_LABEL } from "@/lib/constants";
import { diffDias, formatDate, formatDateTime, hojeISO } from "@/lib/utils";
import type { VEmprestimo, VReserva } from "@/types";

export function AlunoReservaCard({ r }: { r: VReserva }) {
  return (
    <article className="flex gap-4 rounded-lg border bg-card p-4">
      <div className="w-16 shrink-0 sm:w-20">
        <BookCover titulo={r.livro_titulo} autor={r.livro_autor} capaUrl={r.capa_url} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/aluno/biblioteca/${r.livro_id}`} className="font-display font-semibold leading-tight hover:underline">
              {r.livro_titulo}
            </Link>
            <p className="text-sm text-muted-foreground">{r.livro_autor}</p>
          </div>
          <StatusBadge kind="reserva" value={r.status} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Reservado em {formatDateTime(r.data_reserva)}</p>
        {r.status === "ativa" && (
          <>
            <p className="text-sm">
              Retire com seu professor até <strong>{formatDateTime(r.expira_em)}</strong>.
            </p>
            <div className="mt-3">
              <CancelReservationButton reservaId={r.id} livroTitulo={r.livro_titulo} />
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export function AlunoEmprestimoCard({ e, actions }: { e: VEmprestimo; actions?: React.ReactNode }) {
  const aberto = e.status_efetivo === "ativo" || e.status_efetivo === "atrasado";
  const dias = diffDias(hojeISO(), e.prazo_devolucao);
  return (
    <article className="flex gap-4 rounded-lg border bg-card p-4">
      <div className="w-16 shrink-0 sm:w-20">
        <BookCover titulo={e.livro_titulo} autor={e.livro_autor} capaUrl={e.capa_url} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display font-semibold leading-tight">{e.livro_titulo}</p>
            <p className="text-sm text-muted-foreground">{e.livro_autor}</p>
          </div>
          <StatusBadge kind="emprestimo" value={e.status_efetivo} />
        </div>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          <dt className="text-muted-foreground">Retirado em</dt>
          <dd>{formatDate(e.data_retirada)}</dd>
          <dt className="text-muted-foreground">Devolver até</dt>
          <dd className="font-medium">{formatDate(e.prazo_devolucao)}</dd>
          {e.data_devolucao && (
            <>
              <dt className="text-muted-foreground">Devolvido em</dt>
              <dd>
                {formatDate(e.data_devolucao)}
                {e.condicao_devolucao && <span className="text-muted-foreground"> · {CONDICAO_LABEL[e.condicao_devolucao]}</span>}
              </dd>
            </>
          )}
        </dl>
        {aberto && (
          <p className={`mt-2 text-sm font-semibold ${dias < 0 ? "text-danger" : dias <= 1 ? "text-warning" : "text-muted-foreground"}`}>
            {dias < 0
              ? `Atrasado há ${-dias} ${-dias === 1 ? "dia" : "dias"}. Devolva o quanto antes.`
              : dias === 0
                ? "Devolva hoje."
                : dias === 1
                  ? "Devolva amanhã."
                  : `Faltam ${dias} dias.`}
          </p>
        )}
        {actions && <div className="mt-3">{actions}</div>}
      </div>
    </article>
  );
}
