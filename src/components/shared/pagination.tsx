import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Paginação por URL (?page=2) preservando os demais filtros. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== "page") sp.set(k, v);
    });
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const linkCls =
    "inline-flex h-9 items-center gap-1 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted";

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Paginação">
      <p className="text-muted-foreground">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={linkCls}>
            <ChevronLeft className="size-4" /> Anterior
          </Link>
        ) : (
          <span className={cn(linkCls, "pointer-events-none opacity-40")}>
            <ChevronLeft className="size-4" /> Anterior
          </span>
        )}
        <span className="px-1 text-muted-foreground">
          Página {page} de {pages}
        </span>
        {page < pages ? (
          <Link href={href(page + 1)} className={linkCls}>
            Próxima <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={cn(linkCls, "pointer-events-none opacity-40")}>
            Próxima <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
