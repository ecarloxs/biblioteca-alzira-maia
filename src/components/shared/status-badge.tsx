import { Badge } from "@/components/ui/badge";
import { EMPRESTIMO_STATUS, EXEMPLAR_STATUS, RESERVA_STATUS, STATUS_GERAL_LIVRO } from "@/lib/constants";

const MAPS = {
  emprestimo: EMPRESTIMO_STATUS,
  reserva: RESERVA_STATUS,
  exemplar: EXEMPLAR_STATUS,
  status_geral: STATUS_GERAL_LIVRO,
} as const;

export function StatusBadge({ kind, value }: { kind: keyof typeof MAPS; value: string }) {
  const item = MAPS[kind][value] ?? { label: value, tone: "neutral" as const };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}
