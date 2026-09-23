import { redirect } from "next/navigation";
import type { SearchParams } from "@/types";

/** A busca do aluno é só de livros: reaproveita o catálogo com o mesmo termo. */
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  redirect(`/aluno/biblioteca${q ? `?q=${encodeURIComponent(q)}` : ""}`);
}
