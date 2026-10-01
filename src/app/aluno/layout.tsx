import { AppShell } from "@/components/shared/app-shell";
import { NotificationBell } from "@/components/shared/notification-bell";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getNotificacoesRecentes } from "@/lib/data/notificacoes";
import { NAV, ROLE_LABEL } from "@/lib/constants";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["aluno"]);
  const supabase = await createClient();
  const notificacoes = await getNotificacoesRecentes(supabase);
  return (
    <AppShell
      role="aluno"
      roleLabel={ROLE_LABEL.aluno}
      nome={profile.nome}
      nav={NAV.aluno}
      notificationBell={<NotificationBell initial={notificacoes} />}
    >
      {children}
    </AppShell>
  );
}
