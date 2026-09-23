"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("erro") === "inativo"
      ? "Seu acesso está desativado. Procure a gestão da escola."
      : params.get("erro") === "link"
        ? "Este link é inválido ou expirou. Peça um novo em “Esqueci minha senha”."
        : null
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setLoading(false);
      setError("E-mail ou senha incorretos.");
      return;
    }
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    router.replace(safeNext);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}
      <Field label="E-mail" htmlFor="email">
        <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Senha" htmlFor="senha">
        <Input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email || !senha}>
        Entrar
      </Button>
      <p className="text-center text-sm">
        <Link href="/recuperar-senha" className="font-medium text-primary underline-offset-4 hover:underline">
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
