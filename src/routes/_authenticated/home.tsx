import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bell, Search, Plus, Check, Users, Code2, Sparkles, TrendingUp, LineChart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  categoryCover,
  connectionsQuery,
  feedQuery,
  formatCount,
  groupsQuery,
  meQuery,
  notificationsQuery,
  peopleQuery,
} from "@/lib/netclub";
import { Logo } from "@/components/netclub/Logo";
import { UserAvatar } from "@/components/netclub/UserAvatar";
import { PostCard } from "@/components/netclub/PostCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Início — NetClub" },
      { name: "description", content: "Seu feed de networking no NetClub." },
      { property: "og:title", content: "Início — NetClub" },
      { property: "og:description", content: "Seu feed de networking no NetClub." },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(meQuery),
      queryClient.ensureQueryData(peopleQuery),
      queryClient.ensureQueryData(groupsQuery),
      queryClient.ensureQueryData(feedQuery),
      queryClient.ensureQueryData(connectionsQuery),
    ]),
  component: HomePage,
});

const categoryIcon: Record<string, typeof Code2> = {
  tech: Code2,
  creators: Sparkles,
  growth: TrendingUp,
  finance: LineChart,
};

function HomePage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: people } = useSuspenseQuery(peopleQuery);
  const { data: groups } = useSuspenseQuery(groupsQuery);
  const { data: feed } = useSuspenseQuery(feedQuery);
  const { data: conns } = useSuspenseQuery(connectionsQuery);
  const { data: notifs } = useQuery(notificationsQuery);
  const unread = notifs?.some((n) => !n.read);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");

  const connectedIds = useMemo(
    () => new Set(conns.flatMap((c) => [c.requester_id, c.addressee_id])),
    [conns],
  );

  const connect = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("connections").insert({ requester_id: me.id, addressee_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite de conexão enviado");
      qc.invalidateQueries({ queryKey: ["connections"] });
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").insert({ author_id: me.id, content: draft.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => toast.error("Não foi possível publicar"),
  });

  const term = q.trim().toLowerCase();
  const results = term
    ? {
        people: people.filter((p) => `${p.full_name} ${p.headline}`.toLowerCase().includes(term)).slice(0, 5),
        groups: groups.filter((g) => g.name.toLowerCase().includes(term)).slice(0, 5),
        posts: feed.filter((p) => p.content.toLowerCase().includes(term)).slice(0, 5),
      }
    : null;

  const firstName = me.full_name.split(" ")[0] || "por aqui";

  return (
    <div className="mx-auto max-w-2xl px-4 pt-5 md:pt-8">
      <header className="flex items-center justify-between md:hidden">
        <Logo />
        <NotifBell unread={!!unread} />
      </header>
      <div className="hidden justify-end md:flex">
        <NotifBell unread={!!unread} />
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busque pessoas, grupos ou publicações…"
          className="h-12 w-full rounded-2xl border bg-card pl-12 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        {results && (
          <div className="surface absolute inset-x-0 top-14 z-30 max-h-96 overflow-auto p-2">
            {[...results.people, ...results.groups, ...results.posts].length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">Nada encontrado.</p>
            )}
            {results.people.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary">
                <UserAvatar name={p.full_name} url={p.avatar_url} className="h-8 w-8 text-xs" />
                <div className="text-sm">
                  <p className="font-medium">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">{p.headline || "Pessoa"}</p>
                </div>
              </div>
            ))}
            {results.groups.map((g) => (
              <Link key={g.id} to="/clubs" className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-secondary">
                <Users className="h-4 w-4 text-primary" /> {g.name}
              </Link>
            ))}
            {results.posts.map((p) => (
              <p key={p.id} className="truncate rounded-lg p-2 text-sm hover:bg-secondary">
                “{p.content}” — <span className="text-muted-foreground">{p.author?.full_name}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <section className="mt-7 flex items-center gap-4 fade-up">
        <div className="flex-1">
          <p className="text-sm font-medium text-primary">Bem-vindo de volta, {firstName} 👋</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
            Conecte-se. Compartilhe.
            <br />
            Cresça <span className="text-primary">junto.</span>
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Conversas que importam e conexões que fazem sua carreira digital avançar.
          </p>
        </div>
        <div className="relative hidden h-32 w-32 shrink-0 sm:block">
          <div className="orbit absolute inset-0 rounded-full border border-primary/30">
            <span className="absolute -top-1 left-1/2 h-2 w-2 rounded-full bg-gold" />
            <span className="absolute right-2 top-6 h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
          <div className="absolute inset-5 flex items-center justify-center rounded-full bg-primary-deep/60">
            <Users className="h-12 w-12 text-primary" strokeWidth={1.5} />
          </div>
        </div>
      </section>

      <SectionHeader title="Pessoas recomendadas" to="/network" label="Ver todas" />
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
        {people.length === 0 && (
          <p className="text-sm text-muted-foreground">Convide colegas — novos membros aparecerão aqui.</p>
        )}
        {people.slice(0, 12).map((p) => {
          const done = connectedIds.has(p.id);
          return (
            <div key={p.id} className="flex w-[72px] shrink-0 flex-col items-center gap-2">
              <div className="relative">
                <UserAvatar name={p.full_name} url={p.avatar_url} className="h-[72px] w-[72px] border-2 border-primary/50 text-lg" />
                <button
                  disabled={done || connect.isPending}
                  onClick={() => connect.mutate(p.id)}
                  aria-label={done ? "Conectado" : `Conectar com ${p.full_name}`}
                  className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground"
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </button>
              </div>
              <span className="w-full truncate text-center text-sm">{p.full_name.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>

      <SectionHeader title="Grupos de networking" to="/clubs" label="Ver todos" />
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {groups.map((g) => {
          const Icon = categoryIcon[g.category] ?? Users;
          const members = g.group_members ?? [];
          return (
            <Link key={g.id} to="/clubs" className="surface w-44 shrink-0 overflow-hidden transition-transform hover:-translate-y-0.5">
              <div className="relative h-24">
                <img
                  src={g.cover_url ?? categoryCover[g.category] ?? categoryCover.tech}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <span
                  className={`absolute bottom-2 left-3 flex h-8 w-8 items-center justify-center rounded-full ${g.category === "creators" ? "bg-gold text-gold-foreground" : "bg-primary-deep text-primary"}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="p-3">
                <p className="truncate font-semibold">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCount(members.length)} {members.length === 1 ? "membro" : "membros"}
                </p>
                <div className="mt-2 flex -space-x-2">
                  {members.slice(0, 4).map((m) => (
                    <UserAvatar
                      key={m.user_id}
                      name={m.profiles?.full_name ?? ""}
                      url={m.profiles?.avatar_url}
                      className="h-6 w-6 border-2 border-card text-[9px]"
                    />
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Da sua rede</h2>
      <div className="surface p-4">
        <div className="flex gap-3">
          <UserAvatar name={me.full_name} url={me.avatar_url} className="h-10 w-10" />
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Compartilhe uma dúvida, experiência ou opinião…"
            className="min-h-[70px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
            maxLength={3000}
          />
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" disabled={!draft.trim() || publish.isPending} onClick={() => publish.mutate()}>
            Publicar
          </Button>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {feed.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Seja a primeira pessoa a publicar algo!</p>
        )}
        {feed.map((p) => (
          <PostCard key={p.id} post={p} meId={me.id} />
        ))}
      </div>
    </div>
  );
}

function NotifBell({ unread }: { unread: boolean }) {
  return (
    <Link to="/notifications" className="relative rounded-full p-2 hover:bg-secondary" aria-label="Notificações">
      <Bell className="h-6 w-6" />
      {unread && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-gold" />}
    </Link>
  );
}

function SectionHeader({ title, to, label }: { title: string; to: "/network" | "/clubs"; label: string }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link to={to} className="text-sm text-primary hover:underline">
        {label}
      </Link>
    </div>
  );
}
