import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { connectionsQuery, meQuery, peopleQuery } from "@/lib/netclub";
import { UserAvatar } from "@/components/netclub/UserAvatar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/network")({
  head: () => ({
    meta: [
      { title: "Rede — NetClub" },
      { name: "description", content: "Descubra e conecte-se com profissionais." },
      { property: "og:title", content: "Rede — NetClub" },
      { property: "og:description", content: "Descubra e conecte-se com profissionais." },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(meQuery),
      queryClient.ensureQueryData(peopleQuery),
      queryClient.ensureQueryData(connectionsQuery),
    ]),
  component: NetworkPage,
});

function NetworkPage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: people } = useSuspenseQuery(peopleQuery);
  const { data: conns } = useSuspenseQuery(connectionsQuery);
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["connections"] });

  const connect = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("connections").insert({ requester_id: me.id, addressee_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite enviado");
      refresh();
    },
  });
  const accept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("connections").update({ status: "accepted" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:pt-10">
      <h1 className="text-2xl font-bold">Sua rede</h1>
      <p className="mt-1 text-sm text-muted-foreground">Profissionais do mercado digital no NetClub.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {people.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há outros membros.</p>}
        {people.map((p) => {
          const c = conns.find(
            (x) => (x.requester_id === me.id && x.addressee_id === p.id) || (x.addressee_id === me.id && x.requester_id === p.id),
          );
          return (
            <div key={p.id} className="surface flex items-center gap-3 p-4">
              <UserAvatar name={p.full_name} url={p.avatar_url} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{p.headline || "Membro NetClub"}</p>
              </div>
              {!c && (
                <Button size="sm" onClick={() => connect.mutate(p.id)}>
                  Conectar
                </Button>
              )}
              {c?.status === "pending" && c.addressee_id === me.id && (
                <Button size="sm" onClick={() => accept.mutate(c.id)}>
                  Aceitar
                </Button>
              )}
              {c?.status === "pending" && c.requester_id === me.id && (
                <span className="text-xs text-muted-foreground">Pendente</span>
              )}
              {c?.status === "accepted" && <span className="text-xs text-primary">Conectado</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
