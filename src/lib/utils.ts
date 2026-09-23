import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "America/Recife";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Formata "YYYY-MM-DD" ou timestamp como dd/mm/aaaa (sem deslocar o dia por fuso horário). */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short" }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(
    new Date(value)
  );
}

/** Data de hoje (YYYY-MM-DD) no fuso da escola. */
export function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Diferença em dias inteiros (b - a) entre duas datas YYYY-MM-DD. */
export function diffDias(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

export function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

/** Remove caracteres que quebram filtros .or() do PostgREST e curingas do LIKE. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[,()*%\\]/g, " ").replace(/\s+/g, " ").trim();
}

export function pluralize(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
