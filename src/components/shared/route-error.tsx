"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-lg border bg-card p-8 text-center">
      <AlertTriangle className="mx-auto mb-3 size-8 text-warning" />
      <h2 className="text-xl font-semibold">Não foi possível carregar esta página</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Verifique sua conexão e tente novamente. Se o problema continuar, avise a gestão da biblioteca.
      </p>
      <Button className="mt-5" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
