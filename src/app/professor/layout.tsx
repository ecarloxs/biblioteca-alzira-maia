import { AppShell } from "@/components/shared/app-shell";
import { requireRole } from "@/lib/auth/session";
import { NAV, ROLE_LABEL } from "@/lib/constants";

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["professor"]);
  return (
    <AppShell role="professor" roleLabel={ROLE_LABEL.professor} nome={profile.nome} nav={NAV.professor}>
      {children}
    </AppShell>
  );
}
