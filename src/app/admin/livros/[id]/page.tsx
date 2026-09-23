import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setLivroAtivo } from "@/lib/actions/livros";
import { BookCover } from "@/components/shared/book-cover";
import { Badge } from "@/components/ui/badge";
import { LivroFormDialog } from "@/components/admin/livro-form-dialog";
import { ToggleAtivoButton } from "@/components/admin/toggle-ativo-button";
import { ExemplaresManager } from "@/components/admin/exemplares-manager";
import type { Exemplar, Livro } from "@/types";

export const metadata = { title: "Livro" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: livro }, { data: exemplares }] = await Promise.all([
    supabase.from("livros").select("*").eq("id", id).maybeSingle<Livro>(),
    supabase.from("exemplares").select("*").eq("livro_id", id).order("codigo_exemplar"),
  ]);
  if (!livro) notFound();

  return (
    <>
      <Link href="/admin/livros" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar aos livros
      </Link>

      <div className="mb-8 flex flex-col gap-6 rounded-xl border bg-card p-6 sm:flex-row">
        <div className="mx-auto w-full max-w-[180px] shrink-0 sm:mx-0">
          <BookCover titulo={livro.titulo} autor={livro.autor} capaUrl={livro.capa_url} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone={livro.ativo ? "success" : "neutral"}>{livro.ativo ? "Ativo" : "Inativo"}</Badge>
              <h1 className="mt-2 text-2xl font-bold leading-tight">{livro.titulo}</h1>
              <p className="text-muted-foreground">{livro.autor}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LivroFormDialog livro={livro} />
              <ToggleAtivoButton ativo={livro.ativo} nome={livro.titulo} onToggle={(v) => setLivroAtivo(livro.id, v)} />
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
            <dt className="text-muted-foreground">Categoria</dt>
            <dd className="col-span-1 sm:col-span-2">{livro.categoria}</dd>
            {livro.editora && (
              <>
                <dt className="text-muted-foreground">Editora</dt>
                <dd className="col-span-1 sm:col-span-2">{livro.editora}</dd>
              </>
            )}
            {livro.ano_publicacao && (
              <>
                <dt className="text-muted-foreground">Ano</dt>
                <dd className="col-span-1 sm:col-span-2">{livro.ano_publicacao}</dd>
              </>
            )}
            {livro.isbn && (
              <>
                <dt className="text-muted-foreground">ISBN</dt>
                <dd className="col-span-1 sm:col-span-2">{livro.isbn}</dd>
              </>
            )}
          </dl>
          {livro.descricao && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/85">{livro.descricao}</p>}
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Exemplares</h2>
        <ExemplaresManager livroId={livro.id} exemplares={(exemplares ?? []) as Exemplar[]} />
      </section>
    </>
  );
}
