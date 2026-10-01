import { AppShell } from "@/components/shared/app-shell";
import { NotificationBell } from "@/components/shared/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getNotificacoesRecentes } from "@/lib/data/notificacoes";
import { NAV, ROLE_LABEL } from "@/lib/constants";

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["professor"]);
  const supabase = await createClient();
  const notificacoes = await getNotificacoesRecentes(supabase);
  return (
    <AppShell
      role="professor"
      roleLabel={ROLE_LABEL.professor}
      nome={profile.nome}
      nav={NAV.professor}
      notificationBell={<NotificationBell initial={notificacoes} />}
    >
      {children}
    </AppShell>
  );
}
