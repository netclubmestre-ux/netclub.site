import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Users, MessageCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/netclub/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NetClub — Conecte-se. Compartilhe. Cresça junto." },
      { name: "description", content: "A rede social de networking para quem vive o mercado digital." },
      { property: "og:title", content: "NetClub — Networking para o mercado digital" },
      { property: "og:description", content: "Descubra profissionais, participe de grupos e troque conhecimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Logo />
        <Button asChild variant="ghost">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col justify-center py-16 fade-up">
        <p className="text-sm font-medium text-primary">Networking para o mercado digital</p>
        <h1 className="mt-3 max-w-2xl text-5xl font-bold leading-tight md:text-6xl">
          Conecte-se. Compartilhe. Cresça <span className="text-primary">junto.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Encontre profissionais, participe de grupos e troque experiências com quem já trabalha — ou quer
          começar — no digital.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Criar conta grátis</Link>
          </Button>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { icon: Users, t: "Pessoas certas", d: "Descubra profissionais com habilidades complementares." },
            { icon: Sparkles, t: "Grupos de networking", d: "Comunidades por área: tech, criadores, tráfego, finanças." },
            { icon: MessageCircle, t: "Conversas reais", d: "Dúvidas, experiências e discussões do mercado." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="surface p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
