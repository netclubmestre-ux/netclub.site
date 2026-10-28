import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/netclub";
import { UserAvatar } from "@/components/netclub/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Meu perfil — NetClub" },
      { name: "description", content: "Seu perfil profissional no NetClub." },
      { property: "og:title", content: "Meu perfil — NetClub" },
      { property: "og:description", content: "Seu perfil profissional no NetClub." },
    ],
  }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(meQuery),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: me.full_name,
    headline: me.headline,
    bio: me.bio,
    skills: me.skills.join(", "),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          headline: form.headline.trim(),
          bio: form.bio.trim(),
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 15),
        })
        .eq("id", me.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries();
    },
    onError: () => toast.error("Não foi possível salvar"),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 md:pt-10">
      <div className="flex items-center gap-4">
        <UserAvatar name={me.full_name} url={me.avatar_url} className="h-20 w-20 border-2 border-primary/50 text-2xl" />
        <div>
          <h1 className="text-2xl font-bold">{me.full_name}</h1>
          <p className="text-sm text-muted-foreground">{me.headline || "Adicione sua área de atuação"}</p>
        </div>
      </div>
      {me.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {me.skills.map((s) => (
            <span key={s} className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
              {s}
            </span>
          ))}
        </div>
      )}
      <form
        className="surface mt-6 space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="n">Nome</Label>
          <Input id="n" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="h">Área de atuação</Label>
          <Input id="h" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b">Sobre você</Label>
          <Textarea id="b" maxLength={600} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s">Habilidades (separadas por vírgula)</Label>
          <Input id="s" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
        </div>
        <Button disabled={save.isPending}>Salvar perfil</Button>
      </form>
      <Button variant="ghost" className="mt-4 text-muted-foreground" onClick={signOut}>
        Sair da conta
      </Button>
    </div>
  );
}
