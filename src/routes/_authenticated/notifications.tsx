import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notificationsQuery, timeAgo } from "@/lib/netclub";
import { UserAvatar } from "@/components/netclub/UserAvatar";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações — NetClub" },
      { name: "description", content: "Suas notificações no NetClub." },
      { property: "og:title", content: "Notificações — NetClub" },
      { property: "og:description", content: "Suas notificações no NetClub." },
    ],
  }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(notificationsQuery),
  component: NotificationsPage,
});

const text: Record<string, string> = {
  like: "curtiu sua publicação",
  comment: "comentou na sua publicação",
  connection: "quer se conectar com você",
};

function NotificationsPage() {
  const { data } = useSuspenseQuery(notificationsQuery);
  const qc = useQueryClient();
  useEffect(() => {
    if (data.some((n) => !n.read)) {
      supabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false)
        .then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
    }
  }, [data, qc]);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:pt-10">
      <h1 className="text-2xl font-bold">Notificações</h1>
      <div className="mt-6 space-y-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma notificação ainda.</p>}
        {data.map((n) => (
          <div key={n.id} className={`surface flex items-center gap-3 p-3 ${n.read ? "" : "border-primary/40"}`}>
            <UserAvatar name={n.actor?.full_name ?? ""} url={n.actor?.avatar_url} className="h-10 w-10" />
            <p className="flex-1 text-sm">
              <span className="font-semibold">{n.actor?.full_name}</span> {text[n.kind] ?? n.kind}
            </p>
            <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
