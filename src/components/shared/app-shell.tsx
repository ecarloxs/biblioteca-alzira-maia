"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home, Library, LibraryBig, Bookmark, BookOpen, History, AlarmClock, LayoutDashboard, Users,
  GraduationCap, School, ShieldCheck, BarChart3, ScrollText, Settings, Menu, X, LogOut, Search,
  Trophy, Award, Star,
  type LucideIcon,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { NavItem } from "@/lib/constants";

const ICONS: Record<string, LucideIcon> = {
  home: Home, library: Library, bookmark: Bookmark, "book-open": BookOpen, history: History,
  alarm: AlarmClock, layout: LayoutDashboard, users: Users, graduation: GraduationCap, school: School,
  shield: ShieldCheck, chart: BarChart3, scroll: ScrollText, settings: Settings,
  trophy: Trophy, award: Award, star: Star,
};

export function AppShell({
  role,
  roleLabel,
  nome,
  nav,
  notificationBell,
  children,
}: {
  role: string;
  roleLabel: string;
  nome: string;
  nav: NavItem[];
  notificationBell?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === `/${role}` ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const navList = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Navegação principal">
      {nav.map((item) => {
        const Icon = ICONS[item.icon] ?? Home;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/85 transition-colors hover:bg-white/10",
              active && "bg-white/10 text-white"
            )}
          >
            {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-accent" aria-hidden />}
            <Icon className="size-[1.1rem] shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <Link href={`/${role}`} className="flex items-center gap-3 px-5 py-5">
      <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <LibraryBig className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-bold text-white">Biblioteca</span>
        <span className="block text-xs text-sidebar-muted">Escola Alzira Maia</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Menu lateral (desktop) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex">
        {brand}
        {navList}
        <div className="p-3 text-xs text-sidebar-muted">{roleLabel}</div>
      </aside>

      {/* Menu lateral (celular/tablet) */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-foreground/50" onClick={() => setOpen(false)} aria-label="Fechar menu" />
          <aside className="drawer-in absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-sidebar">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-2 top-3 rounded-md p-2 text-white/80 hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="size-5" />
            </button>
            {brand}
            {navList}
          </aside>
        </div>
      )}

      <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 hover:bg-muted lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>

        <form action={`/${role}/busca`} method="get" className="relative min-w-0 flex-1 sm:max-w-md" role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            required
            minLength={2}
            placeholder={role === "aluno" ? "Buscar livros..." : "Buscar livro, aluno, empréstimo..."}
            aria-label="Busca"
            className="h-10 w-full rounded-full border bg-card pl-9 pr-4 text-sm placeholder:text-muted-foreground/70"
          />
        </form>

        <div className="ml-auto flex items-center gap-3">
          {notificationBell}
          <div className="hidden text-right leading-tight sm:block">
            <p className="max-w-[12rem] truncate text-sm font-semibold">{nome}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials(nome)}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Sair"
            >
              <LogOut className="size-4" />
              <span className="hidden md:inline">Sair</span>
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
