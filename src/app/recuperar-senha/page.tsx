"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    setLoading(false);
    if (error) {
      setError("Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/login" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar ao login
        </Link>
        <h1 className="text-3xl font-bold">Recuperar senha</h1>
        {sent ? (
          <div className="mt-6 rounded-lg border bg-card p-5 text-sm">
            <MailCheck className="mb-3 size-8 text-success" />
            <p className="font-semibold">Verifique seu e-mail.</p>
            <p className="mt-1 text-muted-foreground">
              Se houver uma conta com esse endereço, enviamos um link para criar uma nova senha.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
            {error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">{error}</p>}
            <Field label="E-mail" htmlFor="email">
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email}>
              Enviar link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
