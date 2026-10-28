import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryCover, groupsQuery, meQuery } from "@/lib/netclub";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/clubs")({
  head: () => ({
    meta: [
      { title: "Grupos — NetClub" },
      { name: "description", content: "Participe de grupos de networking." },
      { property: "og:title", content: "Grupos — NetClub" },
      { property: "og:description", content: "Participe de grupos de networking." },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([queryClient.ensureQueryData(meQuery), queryClient.ensureQueryData(groupsQuery)]),
  component: ClubsPage,
});

function ClubsPage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: groups } = useSuspenseQuery(groupsQuery);
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: async ({ id, member }: { id: string; member: boolean }) => {
      const { error } = member
        ? await supabase.from("group_members").delete().eq("group_id", id).eq("user_id", me.id)
        : await supabase.from("group_members").insert({ group_id: id, user_id: me.id });
      if (error) throw error;
      return member;
    },
    onSuccess: (wasMember) => {
      toast.success(wasMember ? "Você saiu do grupo" : "Você entrou no grupo");
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:pt-10">
      <h1 className="text-2xl font-bold">Grupos de networking</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {groups.map((g) => {
          const member = g.group_members.some((m) => m.user_id === me.id);
          return (
            <div key={g.id} className="surface overflow-hidden">
              <img
                src={g.cover_url ?? categoryCover[g.category] ?? categoryCover["tech"]}
                alt=""
                loading="lazy"
                className="h-32 w-full object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold">{g.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {g.group_members.length} {g.group_members.length === 1 ? "membro" : "membros"}
                  </span>
                  <Button
                    size="sm"
                    variant={member ? "secondary" : "default"}
                    onClick={() => toggle.mutate({ id: g.id, member })}
                  >
                    {member ? "Sair" : "Participar"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
