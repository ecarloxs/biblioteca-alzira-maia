import Link from "next/link";
import { BookText } from "lucide-react";
import { BookCover } from "@/components/shared/book-cover";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/shared/star-rating";
import type { LivroCatalogo } from "@/types";

export function BookCard({ livro, href }: { livro: LivroCatalogo; href: string }) {
  const disp = livro.disponiveis;
  return (
    <article className="group relative flex flex-col rounded-lg border bg-card p-3 transition-colors hover:border-primary/40">
      <Link href={href} className="block" aria-label={`Ver ${livro.titulo}`}>
        <BookCover titulo={livro.titulo} autor={livro.autor} capaUrl={livro.capa_url} />
      </Link>
      <div className="mt-3 flex flex-1 flex-col">
        <h2 className="line-clamp-2 font-display text-base font-semibold leading-snug">
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {livro.titulo}
          </Link>
        </h2>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{livro.autor}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{livro.categoria}</Badge>
          {livro.numero_paginas && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <BookText className="size-3.5" /> {livro.numero_paginas}p
            </span>
          )}
        </div>
        {livro.total_avaliacoes > 0 && (
          <div className="mt-1.5">
            <StarRating value={livro.media_avaliacoes} size="sm" showValue />
          </div>
        )}
        <p className={`mt-auto pt-3 text-sm font-semibold ${disp > 0 ? "text-success" : "text-muted-foreground"}`}>
          {disp > 0 ? `${disp} ${disp === 1 ? "exemplar disponível" : "exemplares disponíveis"}` : "Indisponível no momento"}
        </p>
      </div>
    </article>
  );
}
