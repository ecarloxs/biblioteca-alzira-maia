import { AppShell } from "@/components/shared/app-shell";
import { requireRole } from "@/lib/auth/session";
import { NAV, ROLE_LABEL } from "@/lib/constants";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["aluno"]);
  return (
    <AppShell role="aluno" roleLabel={ROLE_LABEL.aluno} nome={profile.nome} nav={NAV.aluno}>
      {children}
    </AppShell>
  );
}
