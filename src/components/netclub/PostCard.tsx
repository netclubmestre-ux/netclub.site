import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type FeedPost, timeAgo } from "@/lib/netclub";
import { UserAvatar } from "./UserAvatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function PostCard({ post, meId }: { post: FeedPost; meId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["feed"] });

  const toggle = useMutation({
    mutationFn: async (kind: "like" | "save") => {
      const table = kind === "like" ? "post_likes" : "post_saves";
      const on = kind === "like" ? post.liked : post.saved;
      const q = on
        ? supabase.from(table).delete().eq("post_id", post.id).eq("user_id", meId)
        : supabase.from(table).insert({ post_id: post.id, user_id: meId });
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: () => toast.error("Não foi possível concluir a ação"),
  });

  const comments = useQuery({
    queryKey: ["comments", post.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("*, author:profiles!post_comments_author_id_fkey(full_name, avatar_url)")
        .eq("post_id", post.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: post.id, author_id: meId, content: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["comments", post.id] });
      refresh();
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Publicação removida");
      refresh();
    },
  });

  const author = post.author;
  return (
    <article className="surface p-4 fade-up">
      <header className="flex items-start gap-3">
        <UserAvatar name={author?.full_name ?? ""} url={author?.avatar_url} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{author?.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[author?.headline, post.group?.name].filter(Boolean).join(" • ")}
          </p>
          <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
        </div>
        {post.author_id === meId && (
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Ações">
              <MoreHorizontal className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => del.mutate()} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{post.content}</p>
      <footer className="mt-4 flex items-center gap-2">
        <button
          onClick={() => toggle.mutate("like")}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Curtir"
        >
          <Heart className={cn("h-4 w-4", post.liked ? "fill-like text-like" : "text-like")} />
          {post.likeCount}
        </button>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Comentar"
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentCount}
        </button>
        <button
          onClick={() => toggle.mutate("save")}
          className="ml-auto rounded-full border p-2 text-muted-foreground hover:text-foreground"
          aria-label="Salvar"
        >
          <Bookmark className={cn("h-4 w-4", post.saved && "fill-primary text-primary")} />
        </button>
      </footer>
      {open && (
        <div className="mt-4 space-y-3 border-t pt-4">
          {comments.data?.map((c) => (
            <div key={c.id} className="flex gap-2">
              <UserAvatar name={c.author?.full_name ?? ""} url={c.author?.avatar_url} className="h-8 w-8 text-xs" />
              <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                <p className="font-semibold">{c.author?.full_name}</p>
                <p>{c.content}</p>
              </div>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) addComment.mutate();
            }}
          >
            <Input placeholder="Escreva um comentário…" value={text} onChange={(e) => setText(e.target.value)} />
          </form>
        </div>
      )}
    </article>
  );
}
