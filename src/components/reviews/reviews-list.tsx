import { MessageSquareText } from "lucide-react";
import { StarRating } from "@/components/shared/star-rating";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import type { AvaliacaoPublica } from "@/types";

export function ReviewsList({ avaliacoes }: { avaliacoes: AvaliacaoPublica[] }) {
  if (avaliacoes.length === 0) {
    return <EmptyState icon={<MessageSquareText />} title="Ainda não há avaliações para este livro" description="Seja o primeiro a avaliar depois de ler!" />;
  }

  return (
    <ul className="space-y-4">
      {avaliacoes.map((a) => (
        <li key={a.id} className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <StarRating value={a.nota} size="sm" />
            <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
          </div>
          {a.comentario && <p className="mt-2 text-sm leading-relaxed text-foreground/90">"{a.comentario}"</p>}
          <p className="mt-2 text-xs font-medium text-muted-foreground">— {a.autor_anonimizado}</p>
        </li>
      ))}
    </ul>
  );
}
