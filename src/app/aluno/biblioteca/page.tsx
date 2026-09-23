import { CatalogPage } from "@/components/books/catalog-page";
import type { SearchParams } from "@/types";

export const metadata = { title: "Biblioteca" };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <CatalogPage basePath="/aluno/biblioteca" searchParams={searchParams} />;
}
