"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface FilterField {
  name: string;
  label: string;
  type: "search" | "select" | "date";
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Texto da opção "sem filtro" nos selects. */
  allLabel?: string;
}

/**
 * Barra de filtros que sincroniza com a URL (?q=...&status=...). A página (servidor) lê os
 * parâmetros e consulta o Supabase — assim os filtros são compartilháveis e funcionam com paginação.
 */
export function FilterBar({ fields }: { fields: FilterField[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchValues, setSearchValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.filter((f) => f.type === "search").map((f) => [f.name, params.get(f.name) ?? ""]))
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function push(name: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(name, value);
    else sp.delete(name);
    sp.delete("page");
    startTransition(() => {
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function clearAll() {
    setSearchValues(Object.fromEntries(Object.keys(searchValues).map((k) => [k, ""])));
    startTransition(() => router.replace(pathname));
  }

  const hasFilters = fields.some((f) => params.get(f.name));

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3 no-print">
      {fields.map((f) => (
        <div key={f.name} className={f.type === "search" ? "min-w-[14rem] flex-1" : "min-w-[9rem]"}>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={`f-${f.name}`}>
            {f.label}
          </label>
          {f.type === "search" && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={`f-${f.name}`}
                className="pl-9"
                placeholder={f.placeholder ?? "Buscar..."}
                value={searchValues[f.name] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchValues((s) => ({ ...s, [f.name]: v }));
                  if (timer.current) clearTimeout(timer.current);
                  timer.current = setTimeout(() => push(f.name, v.trim()), 350);
                }}
              />
            </div>
          )}
          {f.type === "select" && (
            <Select id={`f-${f.name}`} value={params.get(f.name) ?? ""} onChange={(e) => push(f.name, e.target.value)}>
              <option value="">{f.allLabel ?? "Todos"}</option>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
          {f.type === "date" && (
            <Input id={`f-${f.name}`} type="date" value={params.get(f.name) ?? ""} onChange={(e) => push(f.name, e.target.value)} />
          )}
        </div>
      ))}
      <div className="flex h-10 items-center gap-2">
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Carregando" />}
        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            <X /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
