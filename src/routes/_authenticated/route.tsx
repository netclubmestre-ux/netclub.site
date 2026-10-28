import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { Home, Users, LayoutGrid, MessageCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/netclub/Logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AppShell,
});

const nav = [
  { to: "/home", label: "Início", icon: Home },
  { to: "/network", label: "Rede", icon: Users },
  { to: "/clubs", label: "Grupos", icon: LayoutGrid },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Perfil", icon: User },
] as const;

function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 border-r px-4 py-6 md:flex">
        <Link to="/home" className="mb-6 px-3">
          <Logo />
        </Link>
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              pathname.startsWith(to) && "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="h-5 w-5" /> {label}
          </Link>
        ))}
      </aside>
      <main className="min-w-0 flex-1 pb-24 md:pb-10">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur md:hidden">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground",
                active && "text-primary",
              )}
            >
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
