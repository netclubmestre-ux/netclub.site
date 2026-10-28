import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import tech from "@/assets/group-tech.jpg";
import creators from "@/assets/group-creators.jpg";
import growth from "@/assets/group-growth.jpg";
import finance from "@/assets/group-finance.jpg";

export const categoryCover: Record<string, string> = { tech, creators, growth, finance };

export type Profile = {
  id: string;
  full_name: string;
  headline: string;
  bio: string;
  avatar_url: string | null;
  skills: string[];
};

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Não autenticado");
  return data.user.id;
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const id = await uid();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error) throw error;
    return data as Profile;
  },
});

export const connectionsQuery = queryOptions({
  queryKey: ["connections"],
  queryFn: async () => {
    const { data, error } = await supabase.from("connections").select("*");
    if (error) throw error;
    return data;
  },
});

export const peopleQuery = queryOptions({
  queryKey: ["people"],
  queryFn: async () => {
    const id = await uid();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data as Profile[];
  },
});

export const groupsQuery = queryOptions({
  queryKey: ["groups"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("*, group_members(user_id, profiles(id, full_name, avatar_url))")
      .order("created_at");
    if (error) throw error;
    return data;
  },
});

export const feedQuery = queryOptions({
  queryKey: ["feed"],
  queryFn: async () => {
    const id = await uid();
    const [posts, likes, saves] = await Promise.all([
      supabase
        .from("posts")
        .select(
          "*, author:profiles!posts_author_id_fkey(id, full_name, headline, avatar_url), group:groups(name), post_likes(count), post_comments(count)",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("post_likes").select("post_id").eq("user_id", id),
      supabase.from("post_saves").select("post_id").eq("user_id", id),
    ]);
    if (posts.error) throw posts.error;
    const liked = new Set((likes.data ?? []).map((l) => l.post_id));
    const saved = new Set((saves.data ?? []).map((l) => l.post_id));
    return (posts.data ?? []).map((p) => ({
      ...p,
      likeCount: p.post_likes?.[0]?.count ?? 0,
      commentCount: p.post_comments?.[0]?.count ?? 0,
      liked: liked.has(p.id),
      saved: saved.has(p.id),
    }));
  },
});
export type FeedPost = Awaited<ReturnType<NonNullable<typeof feedQuery.queryFn>>>[number];

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*, actor:profiles!notifications_actor_id_fkey(full_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
});

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}

export function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}K` : String(n);
}
