"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminDashboard } from "@/types";

const PALETTE = ["#14304A", "#1B7F79", "#C9891A", "#C4553D", "#5F4A8B", "#43703A"];

function mesLabel(mes: string) {
  const [, m] = mes.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return nomes[Number(m) - 1] ?? mes;
}

export function EmprestimosPorMesChart({ data }: { data: AdminDashboard["por_mes"] }) {
  const chartData = data.map((d) => ({ mes: mesLabel(d.mes), Empréstimos: d.emprestimos, Devoluções: d.devolucoes }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="Empréstimos" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Devoluções" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MaisEmprestadosChart({ data }: { data: AdminDashboard["mais_emprestados"] }) {
  const chartData = [...data].reverse();
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="titulo"
          width={140}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 20 ? v.slice(0, 19) + "…" : v)}
        />
        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        <Bar dataKey="total" name="Empréstimos" radius={[0, 4, 4, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MaisAvaliadosChart({ data }: { data: { titulo: string; nota: number }[] }) {
  const chartData = [...data].reverse();
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
        <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="titulo"
          width={140}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 20 ? v.slice(0, 19) + "…" : v)}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{ borderRadius: 8, fontSize: 13 }}
          formatter={(v) => (typeof v === "number" ? v.toFixed(1) : String(v))}
        />
        <Bar dataKey="nota" name="Nota média" radius={[0, 4, 4, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TurmasAtivasChart({ data }: { data: AdminDashboard["turmas_mais_ativas"] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="turma" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        <Bar dataKey="total" name="Empréstimos" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
