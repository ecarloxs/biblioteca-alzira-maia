import { CatalogPage } from "@/components/books/catalog-page";
import type { SearchParams } from "@/types";

export const metadata = { title: "Catálogo" };

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <CatalogPage basePath="/professor/biblioteca" searchParams={searchParams} />;
}
