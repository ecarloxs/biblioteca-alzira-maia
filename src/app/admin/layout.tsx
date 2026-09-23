import { AppShell } from "@/components/shared/app-shell";
import { requireRole } from "@/lib/auth/session";
import { NAV, ROLE_LABEL } from "@/lib/constants";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["admin"]);
  return (
    <AppShell role="admin" roleLabel={ROLE_LABEL.admin} nome={profile.nome} nav={NAV.admin}>
      {children}
    </AppShell>
  );
}
