import { BookDetail } from "@/components/books/book-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookDetail id={id} role="professor" />;
}
