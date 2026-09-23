"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (senha.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirmar) return setError("As senhas não são iguais.");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) return setError("Não foi possível alterar a senha. Peça um novo link de recuperação.");
    toast.success("Senha alterada com sucesso!");
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-bold">Nova senha</h1>
        {error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        <Field label="Nova senha" htmlFor="senha" hint="Mínimo de 8 caracteres.">
          <Input id="senha" type="password" autoComplete="new-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Field>
        <Field label="Repita a nova senha" htmlFor="confirmar">
          <Input id="confirmar" type="password" autoComplete="new-password" required value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Salvar nova senha
        </Button>
      </form>
    </div>
  );
}
