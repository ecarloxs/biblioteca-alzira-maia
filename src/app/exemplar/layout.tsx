import Link from "next/link";
import { LibraryBig } from "lucide-react";
import { requireRole } from "@/lib/auth/session";

export default async function ExemplarLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["admin", "professor"]);
  const home = `/${profile.role}`;

  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="flex h-16 items-center gap-3 border-b bg-background px-4 sm:px-6">
        <Link href={home} className="flex items-center gap-2 font-display font-bold">
          <LibraryBig className="size-5 text-primary" /> Biblioteca Alzira Maia
        </Link>
        <span className="ml-auto text-sm text-muted-foreground">Leitura de exemplar (QR Code)</span>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
