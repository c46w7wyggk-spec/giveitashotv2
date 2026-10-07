-- Applied to project gaurlsgdfwasrapvlmyd via the Supabase MCP (migration: core_schema_moderation_boards).
-- Kept here so the schema is reproducible. Scores are only ever written by the submit-score edge function (service role).
create table public.banned_terms (term text primary key check (term = lower(term)));
alter table public.banned_terms enable row level security;
insert into public.banned_terms(term) values
 ('fuck'),('shit'),('cunt'),('nazi'),('hitler'),('rape'),('nigger'),('nigga'),('faggot'),('kike'),('retard'),('whore'),('bitch'),('dick'),('cock'),('pussy'),('admin'),('moderator'),('support'),('official')
on conflict do nothing;
-- Add more with: insert into public.banned_terms(term) values ('word');

create or replace function public.normalize_handle(h text) returns text language sql immutable set search_path = public as $$
  select regexp_replace(translate(lower(h), '013457@$!', 'oieastasi'), '[^a-z]', '', 'g') $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null check (handle ~ '^[A-Za-z0-9_]{3,16}$'),
  tag text check (tag is null or tag ~ '^[A-Za-z0-9]{2,8}$'),
  created_at timestamptz not null default now()
);
create unique index profiles_handle_lower_idx on public.profiles (lower(handle));
alter table public.profiles enable row level security;
create policy "profiles are public" on public.profiles for select using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.profiles_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare n text;
begin
  if tg_op = 'UPDATE' and new.handle is distinct from old.handle then raise exception 'Handles cannot be changed once chosen'; end if;
  if tg_op = 'INSERT' then
    n := public.normalize_handle(new.handle);
    if exists (select 1 from public.banned_terms b where position(b.term in n) > 0) then raise exception 'That handle is not allowed'; end if;
  end if;
  if new.tag is not null then
    n := public.normalize_handle(new.tag);
    if exists (select 1 from public.banned_terms b where position(b.term in n) > 0) then raise exception 'That tag is not allowed'; end if;
  end if;
  return new;
end $$;
revoke all on function public.profiles_guard() from public, anon, authenticated;
create trigger profiles_guard_trg before insert or update on public.profiles for each row execute function public.profiles_guard();

create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  seed bigint not null, role text not null,
  mode text not null check (mode in ('free','daily')),
  daily_date date, score int not null,
  cons_letter text not null, lib_letter text not null,
  needle numeric, over text, engine_version int not null, log text not null,
  created_at timestamptz not null default now(),
  check ((mode = 'daily') = (daily_date is not null))
);
create unique index scores_one_daily_idx on public.scores (user_id, daily_date) where mode = 'daily';
create index scores_board_idx on public.scores (mode, daily_date, score desc);
create index scores_user_idx on public.scores (user_id, created_at desc);
alter table public.scores enable row level security;
create policy "scores are public" on public.scores for select using (true);

create or replace function public.top_scores(p_mode text, p_date date default null, p_role text default null, p_tag text default null, p_limit int default 50)
returns table (rank bigint, handle text, tag text, role text, score int, cons_letter text, lib_letter text, created_at timestamptz, is_me boolean)
language sql stable set search_path = public as $$
  with best as (
    select distinct on (s.user_id) s.* from public.scores s
    where s.mode = p_mode and (p_mode <> 'daily' or s.daily_date = p_date) and (p_role is null or s.role = p_role)
    order by s.user_id, s.score desc, s.created_at asc)
  select row_number() over (order by b.score desc, b.created_at asc), p.handle, p.tag, b.role, b.score, b.cons_letter, b.lib_letter, b.created_at,
         (b.user_id = (select auth.uid()))
  from best b join public.profiles p on p.id = b.user_id
  where p_tag is null or lower(p.tag) = lower(p_tag)
  order by b.score desc, b.created_at asc
  limit least(greatest(p_limit,1),100) $$;

create or replace function public.my_streak() returns table (current_streak int, best_streak int, played_today boolean)
language sql stable set search_path = public as $$
  with d as (select distinct daily_date as day from public.scores where user_id = (select auth.uid()) and mode = 'daily'),
  g as (select day, day - (row_number() over (order by day))::int as grp from d),
  runs as (select grp, min(day) as s, max(day) as e, count(*) as n from g group by grp)
  select coalesce((select n from runs where e >= (now() at time zone 'utc')::date - 1 order by e desc limit 1),0)::int,
         coalesce((select max(n) from runs),0)::int,
         exists (select 1 from d where day = (now() at time zone 'utc')::date) $$;
grant execute on function public.top_scores(text,date,text,text,int) to anon, authenticated;
grant execute on function public.my_streak() to authenticated;
revoke execute on function public.my_streak() from anon;
