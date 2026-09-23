import { cn } from "@/lib/utils";

/** Cores de "lombada" usadas nas capas geradas (livros sem imagem). */
const SPINES = ["#14304A", "#1B7F79", "#C9891A", "#C4553D", "#5F4A8B", "#43703A"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function BookCover({
  titulo,
  autor,
  capaUrl,
  className,
}: {
  titulo: string;
  autor?: string;
  capaUrl?: string | null;
  className?: string;
}) {
  if (capaUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={capaUrl}
        alt={`Capa de ${titulo}`}
        loading="lazy"
        className={cn("aspect-[3/4] w-full rounded-md border bg-muted object-cover", className)}
      />
    );
  }
  const color = SPINES[hash(titulo) % SPINES.length];
  return (
    <div
      role="img"
      aria-label={`Capa de ${titulo}`}
      className={cn("relative flex aspect-[3/4] w-full overflow-hidden rounded-md text-white", className)}
      style={{ backgroundColor: color }}
    >
      <div className="w-[11%] shrink-0 bg-black/20" />
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
        <p className="font-display text-[0.95rem] font-bold leading-tight [overflow-wrap:anywhere] line-clamp-5">{titulo}</p>
        {autor && <p className="text-[0.7rem] leading-tight text-white/80 line-clamp-2">{autor}</p>}
      </div>
    </div>
  );
}
