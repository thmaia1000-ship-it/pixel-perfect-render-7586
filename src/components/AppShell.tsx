import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  LayoutDashboard,
  Wrench,
  Users,
  ShieldCheck,
  Menu,
  Smartphone,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { InstallAppModal } from "@/components/InstallAppModal";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/ordens", label: "Ordens de serviço", icon: Wrench },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/usuarios", label: "Administração", icon: ShieldCheck },
] as const;

export function AppShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [modalAppAberto, setModalAppAberto] = useState(false);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-transparent">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/75 backdrop-blur-xl print:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/painel" className="min-w-0">
            <Logo />
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                  activeProps={{
                    className: "bg-secondary text-foreground shadow-sm shadow-black/20",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalAppAberto(true)}
              className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10 shadow-sm"
              title="Instalar aplicativo Android ou gerar APK"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">App Android</span>
            </Button>

            <Button variant="ghost" size="icon" onClick={sair} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setAberto((v) => !v)}
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {aberto && (
          <nav className="grid gap-1 border-t border-border/60 bg-card/90 backdrop-blur-xl px-4 py-2 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setAberto(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                setModalAppAberto(true);
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Smartphone className="h-4 w-4 shrink-0" />
              Instalar App Android (APK)
            </button>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h1 className="truncate text-2xl font-bold">{title}</h1>
          {actions}
        </div>
        {children}
      </main>

      <InstallAppModal open={modalAppAberto} onClose={() => setModalAppAberto(false)} />
    </div>
  );
}
