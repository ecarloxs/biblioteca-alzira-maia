import type { Metadata } from "next";
import { LibraryBig } from "lucide-react";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { BookSpines } from "@/components/shared/book-spines";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <LibraryBig className="size-6" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-bold">Biblioteca</p>
            <p className="text-sm text-sidebar-muted">Escola Alzira Maia</p>
          </div>
        </div>
        <div>
          <h2 className="max-w-md font-display text-4xl font-bold leading-tight">
            Cada livro tem um leitor esperando por ele.
          </h2>
          <p className="mt-4 max-w-sm text-sidebar-foreground/80">
            Reserve, retire e devolva livros com facilidade — e acompanhe tudo em um só lugar.
          </p>
        </div>
        <BookSpines className="h-44 w-full max-w-md" />
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LibraryBig className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="font-display font-bold">Biblioteca</p>
              <p className="text-xs text-muted-foreground">Escola Alzira Maia</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold">Entrar</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">Use o e-mail e a senha que a escola forneceu.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
