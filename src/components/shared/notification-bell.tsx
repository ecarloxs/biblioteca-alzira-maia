"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { NOTIFICACAO_TIPO_ICON } from "@/lib/constants";
import { useRpc } from "@/hooks/use-rpc";
import type { Notificacao } from "@/types";

export function NotificationBell({ initial }: { initial: Notificacao[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initial);
  const { call, pending } = useRpc();
  const naoLidas = items.filter((n) => !n.lida).length;

  async function marcarTodasComoLidas() {
    if (naoLidas === 0) return;
    const res = await call("marcar_notificacoes_lidas", {}, "Notificações marcadas como lidas.");
    if (res.ok) setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Notificações"
      >
        <Bell className="size-5" />
        {naoLidas > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} aria-label="Fechar" />
          <div className="dialog-in absolute right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-semibold">Notificações</p>
              {naoLidas > 0 && (
                <button onClick={marcarTodasComoLidas} disabled={pending} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                  Marcar tudo como lido
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
              ) : (
                items.map((n) => (
                  <div key={n.id} className={cn("flex gap-3 border-b px-4 py-3 last:border-0", !n.lida && "bg-accent/10")}>
                    <span className="text-lg leading-none">{NOTIFICACAO_TIPO_ICON[n.tipo] ?? "📌"}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{n.titulo}</p>
                      <p className="text-sm text-muted-foreground">{n.mensagem}</p>
                      <p className="mt-1 text-xs text-muted-foreground/70">{formatDateTime(n.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
