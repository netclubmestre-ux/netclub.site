create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  headline text not null default '',
  bio text not null default '',
  avatar_url text,
  skills text[] not null default '{}',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by signed-in" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, headline, avatar_url)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'headline',''),
    new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null default 'tech',
  cover_url text,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert on public.groups to authenticated;
grant all on public.groups to service_role;
alter table public.groups enable row level security;
create policy "groups readable" on public.groups for select to authenticated using (true);
create policy "groups create" on public.groups for insert to authenticated with check (auth.uid() = created_by);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
grant select, insert, delete on public.group_members to authenticated;
grant all on public.group_members to service_role;
alter table public.group_members enable row level security;
create policy "members readable" on public.group_members for select to authenticated using (true);
create policy "join self" on public.group_members for insert to authenticated with check (auth.uid() = user_id);
create policy "leave self" on public.group_members for delete to authenticated using (auth.uid() = user_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  content text not null check (char_length(content) between 1 and 3000),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "posts readable" on public.posts for select to authenticated using (true);
create policy "posts insert own" on public.posts for insert to authenticated with check (auth.uid() = author_id);
create policy "posts update own" on public.posts for update to authenticated using (auth.uid() = author_id);
create policy "posts delete own" on public.posts for delete to authenticated using (auth.uid() = author_id);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);
create table public.post_saves (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);
grant select, insert, delete on public.post_likes, public.post_saves to authenticated;
grant all on public.post_likes, public.post_saves to service_role;
alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
create policy "likes readable" on public.post_likes for select to authenticated using (true);
create policy "like self" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "unlike self" on public.post_likes for delete to authenticated using (auth.uid() = user_id);
create policy "saves own read" on public.post_saves for select to authenticated using (auth.uid() = user_id);
create policy "save self" on public.post_saves for insert to authenticated with check (auth.uid() = user_id);
create policy "unsave self" on public.post_saves for delete to authenticated using (auth.uid() = user_id);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.post_comments to authenticated;
grant all on public.post_comments to service_role;
alter table public.post_comments enable row level security;
create policy "comments readable" on public.post_comments for select to authenticated using (true);
create policy "comment self" on public.post_comments for insert to authenticated with check (auth.uid() = author_id);
create policy "uncomment self" on public.post_comments for delete to authenticated using (auth.uid() = author_id);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
grant select, insert, update, delete on public.connections to authenticated;
grant all on public.connections to service_role;
alter table public.connections enable row level security;
create policy "conn read own" on public.connections for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy "conn request" on public.connections for insert to authenticated with check (auth.uid() = requester_id and status = 'pending');
create policy "conn accept" on public.connections for update to authenticated using (auth.uid() = addressee_id);
create policy "conn delete" on public.connections for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  kind text not null,
  post_id uuid references public.posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif own" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notif mark read" on public.notifications for update to authenticated using (auth.uid() = user_id);

create or replace function public.notify_like() returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select author_id into owner from posts where id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into notifications(user_id, actor_id, kind, post_id) values (owner, new.user_id, 'like', new.post_id);
  end if; return new;
end $$;
create trigger trg_notify_like after insert on public.post_likes for each row execute function public.notify_like();

create or replace function public.notify_comment() returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select author_id into owner from posts where id = new.post_id;
  if owner is not null and owner <> new.author_id then
    insert into notifications(user_id, actor_id, kind, post_id) values (owner, new.author_id, 'comment', new.post_id);
  end if; return new;
end $$;
create trigger trg_notify_comment after insert on public.post_comments for each row execute function public.notify_comment();

create or replace function public.notify_connection() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications(user_id, actor_id, kind) values (new.addressee_id, new.requester_id, 'connection');
  return new;
end $$;
create trigger trg_notify_conn after insert on public.connections for each row execute function public.notify_connection();

insert into public.groups (name, description, category) values
('Tech Connect', 'Desenvolvedores, produto e tecnologia.', 'tech'),
('Creators Hub', 'Criadores de conteúdo e marcas pessoais.', 'creators'),
('Tráfego & Performance', 'Mídia paga, dados e crescimento.', 'growth'),
('Mercado Financeiro', 'Investimentos, finanças e economia digital.', 'finance');