import { SearchX } from "lucide-react";
import { BookCard } from "@/components/books/book-card";
import { ReservasTable } from "@/components/reservations/reservas-table";
import { EmprestimosTable } from "@/components/loans/emprestimos-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { SearchResults } from "@/lib/data/search";

export function SearchResultsView({ results, basePath }: { results: SearchResults; basePath: string }) {
  const { term, livros, alunos, reservas, emprestimos } = results;
  const total = livros.length + alunos.length + reservas.length + emprestimos.length;

  if (term.length < 2) {
    return <EmptyState icon={<SearchX />} title="Digite pelo menos 2 letras para buscar" />;
  }

  if (total === 0) {
    return (
      <EmptyState
        icon={<SearchX />}
        title={`Nada encontrado para "${term}"`}
        description="Tente outro título, nome, matrícula ou código de exemplar."
      />
    );
  }

  return (
    <div className="space-y-10">
      {livros.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Livros</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {livros.map((l) => (
              <BookCard key={l.id} livro={l} href={`${basePath}/biblioteca/${l.id}`} />
            ))}
          </div>
        </section>
      )}

      {alunos.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Alunos</h2>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Nome</TH>
                <TH>Matrícula</TH>
                <TH>Turma</TH>
              </TR>
            </THead>
            <TBody>
              {alunos.map((a) => (
                <TR key={a.id}>
                  <TD className="font-medium">{a.nome}</TD>
                  <TD>{a.matricula}</TD>
                  <TD>{a.turma_nome ?? "Sem turma"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>
      )}

      {reservas.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Reservas</h2>
          <div className="overflow-x-auto rounded-lg border">
            <ReservasTable rows={reservas} canAct={false} responsavelNome="" defaultPrazo="" />
          </div>
        </section>
      )}

      {emprestimos.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Empréstimos</h2>
          <div className="overflow-x-auto rounded-lg border">
            <EmprestimosTable rows={emprestimos} canAct={false} responsavelNome="" showDevolucao />
          </div>
        </section>
      )}
    </div>
  );
}
