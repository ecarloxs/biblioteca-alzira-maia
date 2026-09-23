import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { buildRelatorioQuery } from "@/lib/data/relatorios";
import { CONDICAO_LABEL, EMPRESTIMO_STATUS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { VEmprestimo } from "@/types";

const HEADERS = [
  "Aluno",
  "Matrícula",
  "Turma",
  "Livro",
  "Código do exemplar",
  "Retirado em",
  "Prazo",
  "Status",
  "Dias em atraso",
  "Devolvido em",
  "Condição na devolução",
  "Registrado por",
];

function csvField(value: string) {
  const v = value.replace(/"/g, '""');
  return `"${v}"`;
}

export async function GET(request: NextRequest) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const filtros = {
    q: searchParams.get("q") ?? undefined,
    turma: searchParams.get("turma") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    dataInicio: searchParams.get("data_inicio") ?? undefined,
    dataFim: searchParams.get("data_fim") ?? undefined,
  };

  const { data } = await buildRelatorioQuery(supabase, filtros).limit(5000);
  const rows = (data ?? []) as VEmprestimo[];

  const linhas = rows.map((e) =>
    [
      e.aluno_nome ?? "",
      e.aluno_matricula,
      e.turma_nome ?? "",
      e.livro_titulo,
      e.codigo_exemplar,
      formatDate(e.data_retirada),
      formatDate(e.prazo_devolucao),
      EMPRESTIMO_STATUS[e.status_efetivo]?.label ?? e.status_efetivo,
      String(e.dias_atraso ?? 0),
      e.data_devolucao ? formatDateTime(e.data_devolucao) : "",
      e.condicao_devolucao ? (CONDICAO_LABEL[e.condicao_devolucao] ?? e.condicao_devolucao) : "",
      e.professor_retirada_nome ?? "",
    ]
      .map(csvField)
      .join(";")
  );

  const csv = "\uFEFF" + [HEADERS.map(csvField).join(";"), ...linhas].join("\r\n");
  const dataHoje = formatDate(new Date().toISOString()).replace(/\//g, "-");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-emprestimos-${dataHoje}.csv"`,
    },
  });
}
