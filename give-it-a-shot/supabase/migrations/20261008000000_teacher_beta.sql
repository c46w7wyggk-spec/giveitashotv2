-- Teacher Beta: roles/capabilities, classrooms, anonymous student members, sessions, server-verified results.
--
-- ARCHITECTURE (read this first)
--   * Teacher and admin operations are SECURITY DEFINER RPCs called by the signed-in user's own JWT.
--     Every one starts with a guard: authenticated? beta flag on? has capability? rate limit ok? Then it checks
--     ownership of each resource by (id AND owner = auth.uid()). The browser never supplies a user id.
--   * Student operations go through the `classroom` edge function (service role). Students have NO Supabase account:
--     they hold a random token whose SHA-256 hash is stored on their classroom_members row.
--   * Tables have RLS enabled. Authenticated users only get narrow SELECT policies/columns (defense in depth);
--     there are no INSERT/UPDATE/DELETE policies, so nothing can be written except through the functions below.
--   * Authorization is by CAPABILITY (role -> capability), so later roles (teacher_paid, school_paid, ...) are just rows.
--
-- Does not touch: profiles, scores, banned_terms, beta_testers, is_beta().

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- roles & capabilities
create table public.roles (
  role text primary key,
  description text not null
);
create table public.role_capabilities (
  role text not null references public.roles(role) on delete cascade,
  capability text not null,
  primary key (role, capability)
);
insert into public.roles(role, description) values
  ('player',        'Default for everyone. No extra capabilities (no row in user_roles needed).'),
  ('teacher_beta',  'Private teacher beta: create classrooms and run classroom sessions.'),
  ('teacher_admin', 'Teacher beta administrator: everything teacher_beta can do, plus granting and revoking roles.');
insert into public.role_capabilities(role, capability) values
  ('teacher_beta',  'teacher.classrooms'),
  ('teacher_admin', 'teacher.classrooms'),
  ('teacher_admin', 'admin.roles');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null references public.roles(role),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null
);
-- one ACTIVE row per (user, role); revoked rows stay as an audit trail
create unique index user_roles_active_idx on public.user_roles (user_id, role) where revoked_at is null;
create index user_roles_user_idx on public.user_roles (user_id);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.feature_flags(key, enabled) values ('TEACHER_BETA_ENABLED', false);

-- ---------------------------------------------------------------- classroom data
create table public.teacher_classrooms (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  join_code text check (join_code is null or join_code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  join_code_expires_at timestamptz,
  active boolean not null default true,
  max_members int not null default 60 check (max_members between 1 and 100),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  check ((join_code is null) = (join_code_expires_at is null))
);
create unique index teacher_classrooms_code_idx on public.teacher_classrooms (join_code) where join_code is not null;
create index teacher_classrooms_owner_idx on public.teacher_classrooms (owner_user_id, created_at desc);

create table public.classroom_members (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.teacher_classrooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,   -- always null in the beta (anonymous participants)
  display_name text not null check (char_length(display_name) between 1 and 40),
  token_hash text not null unique,                              -- sha256 hex of the student's secret token
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','left','removed'))
);
create unique index classroom_members_name_idx on public.classroom_members (classroom_id, display_name);

create table public.classroom_sessions (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.teacher_classrooms(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  instructions text not null default '' check (char_length(instructions) <= 600),
  game_mode text not null default 'president' check (game_mode in ('president')),
  scenario_id text not null default 'president-14day',
  seed int not null check (seed >= 0),                          -- same seed for the whole class so outcomes are comparable
  status text not null default 'active' check (status in ('active','ended')),
  reveal_results boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index classroom_sessions_one_active_idx on public.classroom_sessions (classroom_id) where status = 'active';
create index classroom_sessions_classroom_idx on public.classroom_sessions (classroom_id, created_at desc);

create table public.classroom_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions(id) on delete cascade,
  member_id uuid not null references public.classroom_members(id) on delete cascade,
  completion_status text not null check (completion_status in ('completed','removed')),  -- removed = impeached/removed from office
  score int not null,
  cons_letter text not null,
  lib_letter text not null,
  needle numeric,
  econ_growth numeric not null,
  unemployment numeric not null,
  inflation numeric not null,
  deficit numeric not null,
  approval numeric not null,
  unrest numeric not null,
  scandal numeric not null,
  engine_version int not null,
  log text not null,                                            -- kept for audit/replay; never exposed to teachers
  completed_at timestamptz not null default now(),
  unique (session_id, member_id)                                -- one result per student per session: replays rejected
);

-- ---------------------------------------------------------------- support tables (service/definer only)
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
create table public.analytics_events (
  id bigint generated always as identity primary key,
  event text not null,
  user_id uuid,            -- teacher id for teacher events only; never set for student events
  classroom_id uuid,       -- no FK on purpose: events outlive deleted classrooms and hold no personal data
  session_id uuid,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_events_event_idx on public.analytics_events (event, created_at desc);
create table public.teacher_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  classroom_id uuid,
  what_worked text check (char_length(what_worked) <= 2000),
  what_confused text check (char_length(what_confused) <= 2000),
  what_change text check (char_length(what_change) <= 2000),
  would_use_again boolean,
  would_pay text check (would_pay in ('yes','maybe','no')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS + privileges
alter table public.roles              enable row level security;
alter table public.role_capabilities  enable row level security;
alter table public.user_roles         enable row level security;
alter table public.feature_flags      enable row level security;
alter table public.teacher_classrooms enable row level security;
alter table public.classroom_members  enable row level security;
alter table public.classroom_sessions enable row level security;
alter table public.classroom_results  enable row level security;
alter table public.rate_limits        enable row level security;
alter table public.analytics_events   enable row level security;
alter table public.teacher_feedback   enable row level security;

-- Supabase grants broad default privileges; take them all away, then add back only what is intended.
revoke all on table public.roles, public.role_capabilities, public.user_roles, public.feature_flags,
  public.teacher_classrooms, public.classroom_members, public.classroom_sessions, public.classroom_results,
  public.rate_limits, public.analytics_events, public.teacher_feedback from anon, authenticated;

-- A user may read their own role rows (transparency). Nothing else on these tables is readable by clients.
grant select on public.user_roles to authenticated;
create policy user_roles_select_own on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

-- Capability check usable inside policies. Takes no user id, so it cannot be used to probe other users.
create or replace function public.user_has_capability(p_user uuid, p_cap text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur join public.role_capabilities rc on rc.role = ur.role
    where ur.user_id = p_user and rc.capability = p_cap
      and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now()))
$$;
create or replace function public.auth_has_capability(p_cap text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.user_has_capability((select auth.uid()), p_cap)
$$;
revoke all on function public.user_has_capability(uuid, text) from public, anon, authenticated;
revoke all on function public.auth_has_capability(text) from public, anon;
grant execute on function public.auth_has_capability(text) to authenticated;

-- Teachers can SELECT only what they own, and only while they still hold the capability (revocation is immediate).
grant select on public.teacher_classrooms to authenticated;
create policy classrooms_owner_select on public.teacher_classrooms for select to authenticated
  using (owner_user_id = (select auth.uid()) and public.auth_has_capability('teacher.classrooms'));

-- token_hash is withheld from every client role by column privileges.
grant select (id, classroom_id, display_name, joined_at, last_active_at, status) on public.classroom_members to authenticated;
create policy members_owner_select on public.classroom_members for select to authenticated
  using (public.auth_has_capability('teacher.classrooms')
         and exists (select 1 from public.teacher_classrooms c where c.id = classroom_id and c.owner_user_id = (select auth.uid())));

grant select on public.classroom_sessions to authenticated;
create policy sessions_owner_select on public.classroom_sessions for select to authenticated
  using (public.auth_has_capability('teacher.classrooms')
         and exists (select 1 from public.teacher_classrooms c where c.id = classroom_id and c.owner_user_id = (select auth.uid())));

-- the replay log is withheld from clients
grant select (id, session_id, member_id, completion_status, score, cons_letter, lib_letter, needle, econ_growth,
              unemployment, inflation, deficit, approval, unrest, scandal, engine_version, completed_at)
  on public.classroom_results to authenticated;
create policy results_owner_select on public.classroom_results for select to authenticated
  using (public.auth_has_capability('teacher.classrooms')
         and exists (select 1 from public.classroom_sessions s join public.teacher_classrooms c on c.id = s.classroom_id
                     where s.id = session_id and c.owner_user_id = (select auth.uid())));

-- ---------------------------------------------------------------- internal helpers (no client can call these)
create or replace function public.teacher_beta_enabled() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select enabled from public.feature_flags where key = 'TEACHER_BETA_ENABLED'), false)
$$;

-- Fixed-window rate limiter. Returns false once p_limit hits are exceeded inside the current window.
-- Limitation: fixed windows allow up to 2x p_limit across a window boundary.
create or replace function public.rl_hit(p_key text, p_limit int, p_window int) returns boolean
language plpgsql security definer set search_path = public as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window) * p_window); h int;
begin
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1 returning r.hits into h;
  if random() < 0.01 then delete from public.rate_limits where window_start < now() - interval '1 day'; end if;
  return h <= p_limit;
end $$;
create or replace function public.rl_peek(p_key text, p_window int) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select hits from public.rate_limits
    where key = p_key and window_start = to_timestamp(floor(extract(epoch from now()) / p_window) * p_window)), 0)
$$;

create or replace function public._log_event(p_event text, p_user uuid, p_classroom uuid, p_session uuid, p_props jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.analytics_events(event, user_id, classroom_id, session_id, props) values (p_event, p_user, p_classroom, p_session, coalesce(p_props, '{}'))
$$;

-- Cryptographically random 6-character code from an unambiguous 31-letter alphabet (no 0/O/1/I/L). 31^6 ~ 887M.
create or replace function public.gen_join_code() returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; out text := ''; b int;
begin
  while char_length(out) < 6 loop
    b := get_byte(gen_random_bytes(1), 0);
    if b < 248 then out := out || substr(alphabet, (b % 31) + 1, 1); end if;   -- 248 = 31*8: reject the biased tail
  end loop;
  return out;
end $$;

-- Common guard for every teacher RPC.
create or replace function public._teacher_guard(p_bucket text, p_limit int, p_window int) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid := (select auth.uid());
begin
  if v is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.teacher_beta_enabled() then raise exception 'teacher_beta_disabled' using errcode = '55000'; end if;
  if not public.user_has_capability(v, 'teacher.classrooms') then raise exception 'not_authorized' using errcode = '42501'; end if;
  if not public.rl_hit(p_bucket || ':' || v::text, p_limit, p_window) then raise exception 'rate_limited' using errcode = '54000'; end if;
  return v;
end $$;
create or replace function public._admin_guard(p_bucket text, p_limit int, p_window int) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid := (select auth.uid());
begin
  if v is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.user_has_capability(v, 'admin.roles') then raise exception 'not_authorized' using errcode = '42501'; end if;
  if not public.rl_hit(p_bucket || ':' || v::text, p_limit, p_window) then raise exception 'rate_limited' using errcode = '54000'; end if;
  return v;
end $$;

-- Ownership lookups. Not-owned and not-existing are indistinguishable ('not_found') so ids cannot be probed.
create or replace function public._own_classroom(p_uid uuid, p_id uuid) returns public.teacher_classrooms
language plpgsql security definer set search_path = public as $$
declare c public.teacher_classrooms;
begin
  select * into c from public.teacher_classrooms where id = p_id and owner_user_id = p_uid;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  return c;
end $$;
create or replace function public._own_session(p_uid uuid, p_id uuid) returns public.classroom_sessions
language plpgsql security definer set search_path = public as $$
declare s public.classroom_sessions;
begin
  select s0.* into s from public.classroom_sessions s0 join public.teacher_classrooms c on c.id = s0.classroom_id
   where s0.id = p_id and c.owner_user_id = p_uid;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  return s;
end $$;

-- Aggregate, anonymous statistics for one session (no names). Used for the teacher view and the optional student reveal.
create or replace function public.classroom_session_stats(p_session uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  with r as (select * from public.classroom_results where session_id = p_session)
  select jsonb_build_object(
    'participants', (select count(*) from public.classroom_members m join public.classroom_sessions s on s.classroom_id = m.classroom_id
                     where s.id = p_session and m.status = 'active'),
    'completed', (select count(*) from r),
    'removed_from_office', (select count(*) from r where completion_status = 'removed'),
    'average', (select jsonb_build_object('score', round(avg(score)), 'econ_growth', round(avg(econ_growth), 1),
        'unemployment', round(avg(unemployment), 1), 'inflation', round(avg(inflation), 1), 'deficit', round(avg(deficit), 1),
        'approval', round(avg(approval)), 'unrest', round(avg(unrest))) from r having count(*) > 0),
    'highlights', (select jsonb_build_object('most_resilient_score', max(score), 'strongest_economy', max(econ_growth),
        'lowest_unemployment', min(unemployment), 'lowest_deficit', min(deficit), 'highest_approval', max(approval),
        'calmest_country', min(unrest)) from r having count(*) > 0),
    'distribution', (select jsonb_agg(jsonb_build_object(
        'label', case when b = 5 then '1000+' else (b * 200)::text || '-' || (b * 200 + 199)::text end,
        'count', (select count(*) from r where least(r.score / 200, 5) = b)) order by b) from generate_series(0, 5) b),
    'conservative_grades', (select coalesce(jsonb_object_agg(cons_letter, n), '{}') from (select cons_letter, count(*) n from r group by 1) q),
    'liberal_grades',      (select coalesce(jsonb_object_agg(lib_letter, n), '{}')  from (select lib_letter, count(*) n from r group by 1) q)
  )
$$;

-- ---------------------------------------------------------------- teacher RPCs (callable by signed-in users; guard decides)
create or replace function public.teacher_me() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := (select auth.uid()); ok boolean; adm boolean; h text;
begin
  if v is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.rl_hit('teacher_me:' || v::text, 60, 60) then raise exception 'rate_limited' using errcode = '54000'; end if;
  if not public.teacher_beta_enabled() then return jsonb_build_object('enabled', false, 'authorized', false, 'is_admin', false); end if;
  ok := public.user_has_capability(v, 'teacher.classrooms');
  adm := public.user_has_capability(v, 'admin.roles');
  select handle into h from public.profiles where id = v;
  if ok then perform public._log_event('teacher_beta_access', v, null, null); end if;
  return jsonb_build_object('enabled', true, 'authorized', ok, 'is_admin', adm and ok, 'handle', h);
end $$;

create or replace function public.teacher_dashboard() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_read', 120, 60);
begin
  perform public._log_event('teacher_dashboard_viewed', v, null, null);
  return jsonb_build_object(
    'classrooms', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'active', c.active, 'archived_at', c.archived_at, 'created_at', c.created_at,
        'join_code', case when c.join_code_expires_at > now() then c.join_code end,
        'join_code_expires_at', case when c.join_code_expires_at > now() then c.join_code_expires_at end,
        'member_count', (select count(*) from public.classroom_members m where m.classroom_id = c.id and m.status = 'active'),
        'active_session', (select jsonb_build_object('id', s.id, 'title', s.title,
            'completed', (select count(*) from public.classroom_results r where r.session_id = s.id))
            from public.classroom_sessions s where s.classroom_id = c.id and s.status = 'active')
      ) order by c.archived_at is not null, c.created_at desc) from public.teacher_classrooms c where c.owner_user_id = v), '[]'),
    'recent_sessions', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status, 'started_at', s.started_at,
          'classroom_id', c.id, 'classroom_name', c.name,
          'completed', (select count(*) from public.classroom_results r where r.session_id = s.id)) x
        from public.classroom_sessions s join public.teacher_classrooms c on c.id = s.classroom_id
        where c.owner_user_id = v order by s.started_at desc limit 8) q), '[]'));
end $$;

create or replace function public.teacher_create_classroom(p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_create_classroom', 10, 3600); n text := btrim(coalesce(p_name, '')); c public.teacher_classrooms; tries int := 0;
begin
  if char_length(n) < 1 or char_length(n) > 80 then raise exception 'invalid_name' using errcode = 'P0001'; end if;
  if (select count(*) from public.teacher_classrooms where owner_user_id = v and archived_at is null) >= 20 then
    raise exception 'classroom_limit' using errcode = 'P0001'; end if;
  loop
    begin
      insert into public.teacher_classrooms(owner_user_id, name, join_code, join_code_expires_at)
      values (v, n, public.gen_join_code(), now() + interval '24 hours') returning * into c;
      exit;
    exception when unique_violation then
      tries := tries + 1; if tries > 5 then raise exception 'try_again' using errcode = 'P0001'; end if;
    end;
  end loop;
  perform public._log_event('classroom_created', v, c.id, null);
  return jsonb_build_object('id', c.id, 'name', c.name, 'join_code', c.join_code, 'join_code_expires_at', c.join_code_expires_at);
end $$;

create or replace function public.teacher_get_classroom(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_read', 120, 60); c public.teacher_classrooms := public._own_classroom(v, p_id);
begin
  return jsonb_build_object(
    'classroom', jsonb_build_object('id', c.id, 'name', c.name, 'active', c.active, 'archived_at', c.archived_at, 'created_at', c.created_at,
      'max_members', c.max_members,
      'join_code', case when c.join_code_expires_at > now() then c.join_code end,
      'join_code_expires_at', c.join_code_expires_at),
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'display_name', m.display_name, 'joined_at', m.joined_at,
        'last_active_at', m.last_active_at) order by m.joined_at) from public.classroom_members m where m.classroom_id = c.id and m.status = 'active'), '[]'),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status, 'started_at', s.started_at,
        'ended_at', s.ended_at, 'completed', (select count(*) from public.classroom_results r where r.session_id = s.id))
        order by s.started_at desc) from public.classroom_sessions s where s.classroom_id = c.id), '[]'));
end $$;

create or replace function public.teacher_set_join_code(p_id uuid, p_ttl_hours int default 24) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_code', 20, 3600); c public.teacher_classrooms := public._own_classroom(v, p_id); code text; tries int := 0; ttl int := least(greatest(coalesce(p_ttl_hours, 24), 1), 168);
begin
  if not c.active then raise exception 'classroom_archived' using errcode = 'P0001'; end if;
  loop
    begin
      code := public.gen_join_code();
      update public.teacher_classrooms set join_code = code, join_code_expires_at = now() + make_interval(hours => ttl) where id = c.id;
      exit;
    exception when unique_violation then
      tries := tries + 1; if tries > 5 then raise exception 'try_again' using errcode = 'P0001'; end if;
    end;
  end loop;
  return jsonb_build_object('join_code', code, 'join_code_expires_at', now() + make_interval(hours => ttl));
end $$;

create or replace function public.teacher_revoke_join_code(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_code', 20, 3600); c public.teacher_classrooms := public._own_classroom(v, p_id);
begin
  update public.teacher_classrooms set join_code = null, join_code_expires_at = null where id = c.id;
end $$;

create or replace function public.teacher_archive_classroom(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_write', 60, 3600); c public.teacher_classrooms := public._own_classroom(v, p_id);
begin
  update public.classroom_sessions set status = 'ended', ended_at = now() where classroom_id = c.id and status = 'active';
  update public.teacher_classrooms set active = false, archived_at = coalesce(archived_at, now()), join_code = null, join_code_expires_at = null where id = c.id;
  perform public._log_event('classroom_archived', v, c.id, null);
end $$;

create or replace function public.teacher_delete_classroom(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_write', 60, 3600); c public.teacher_classrooms := public._own_classroom(v, p_id);
begin
  delete from public.teacher_classrooms where id = c.id;   -- cascades to members, sessions, results
  perform public._log_event('classroom_deleted', v, c.id, null);
end $$;

create or replace function public.teacher_start_session(p_classroom uuid, p_title text default null, p_instructions text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v uuid := public._teacher_guard('t_session', 30, 3600); c public.teacher_classrooms := public._own_classroom(v, p_classroom);
        s public.classroom_sessions; t text := btrim(coalesce(p_title, '')); ins text := btrim(coalesce(p_instructions, ''));
begin
  if not c.active then raise exception 'classroom_archived' using errcode = 'P0001'; end if;
  if t = '' then t := 'Class simulation'; end if;
  if char_length(t) > 80 or char_length(ins) > 600 then raise exception 'invalid_text' using errcode = 'P0001'; end if;
  if exists (select 1 from public.classroom_sessions where classroom_id = c.id and status = 'active') then
    raise exception 'session_already_active' using errcode = 'P0001'; end if;
  insert into public.classroom_sessions(classroom_id, title, instructions, seed)
  values (c.id, t, ins, (get_byte(gen_random_bytes(1),0) & 127) * 16777216 + get_byte(gen_random_bytes(1),0) * 65536 + get_byte(gen_random_bytes(1),0) * 256 + get_byte(gen_random_bytes(1),0))
  returning * into s;
  perform public._log_event('classroom_session_started', v, c.id, s.id);
  return jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status);
end $$;

create or replace function public.teacher_get_session(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_read', 120, 60); s public.classroom_sessions := public._own_session(v, p_id); c public.teacher_classrooms;
begin
  select * into c from public.teacher_classrooms where id = s.classroom_id;
  return jsonb_build_object(
    'session', jsonb_build_object('id', s.id, 'title', s.title, 'instructions', s.instructions, 'status', s.status, 'reveal_results', s.reveal_results,
       'started_at', s.started_at, 'ended_at', s.ended_at, 'scenario_id', s.scenario_id),
    'classroom', jsonb_build_object('id', c.id, 'name', c.name, 'archived', c.archived_at is not null),
    'participants', coalesce((select jsonb_agg(jsonb_build_object('member_id', m.id, 'display_name', m.display_name, 'last_active_at', m.last_active_at,
        'completed', r.id is not null) order by m.display_name)
        from public.classroom_members m left join public.classroom_results r on r.member_id = m.id and r.session_id = s.id
        where m.classroom_id = c.id and m.status = 'active'), '[]'),
    'results', coalesce((select jsonb_agg(jsonb_build_object('member_id', r.member_id, 'display_name', m.display_name, 'completion_status', r.completion_status,
        'score', r.score, 'cons_letter', r.cons_letter, 'lib_letter', r.lib_letter, 'needle', r.needle, 'econ_growth', r.econ_growth,
        'unemployment', r.unemployment, 'inflation', r.inflation, 'deficit', r.deficit, 'approval', r.approval, 'unrest', r.unrest,
        'scandal', r.scandal, 'completed_at', r.completed_at) order by m.display_name)
        from public.classroom_results r join public.classroom_members m on m.id = r.member_id where r.session_id = s.id), '[]'),
    'stats', public.classroom_session_stats(s.id));
end $$;

create or replace function public.teacher_end_session(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_write', 60, 3600); s public.classroom_sessions := public._own_session(v, p_id);
begin
  update public.classroom_sessions set status = 'ended', ended_at = coalesce(ended_at, now()) where id = s.id;
  perform public._log_event('classroom_session_ended', v, s.classroom_id, s.id);
end $$;

create or replace function public.teacher_set_reveal(p_id uuid, p_reveal boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_write', 60, 3600); s public.classroom_sessions := public._own_session(v, p_id);
begin
  update public.classroom_sessions set reveal_results = coalesce(p_reveal, false) where id = s.id;
end $$;

create or replace function public.teacher_submit_feedback(p_worked text, p_confused text, p_change text, p_use_again boolean, p_would_pay text, p_classroom uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_feedback', 10, 3600); cid uuid;
begin
  if p_would_pay is not null and p_would_pay not in ('yes','maybe','no') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if p_classroom is not null then cid := (public._own_classroom(v, p_classroom)).id; end if;
  insert into public.teacher_feedback(user_id, classroom_id, what_worked, what_confused, what_change, would_use_again, would_pay)
  values (v, cid, left(p_worked, 2000), left(p_confused, 2000), left(p_change, 2000), p_use_again, p_would_pay);
end $$;

create or replace function public.teacher_track(p_event text) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_track', 60, 60);
begin
  if p_event not in ('teacher_feedback_clicked') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  perform public._log_event(p_event, v, null, null);
end $$;

-- ---------------------------------------------------------------- admin RPCs (capability admin.roles)
create or replace function public.admin_list_roles() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_read', 60, 60);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', ur.user_id, 'role', ur.role, 'handle', p.handle, 'email', u.email,
      'created_at', ur.created_at, 'expires_at', ur.expires_at) order by ur.created_at desc)
    from public.user_roles ur join auth.users u on u.id = ur.user_id left join public.profiles p on p.id = ur.user_id
    where ur.revoked_at is null and ur.role <> 'player'), '[]');
end $$;

create or replace function public.admin_find_users(p_query text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_find', 30, 60); q text := lower(btrim(coalesce(p_query, '')));
begin
  if char_length(q) < 3 then return '[]'::jsonb; end if;
  -- exact email, or handle prefix: no substring scans of the whole user table
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', u.id, 'handle', p.handle, 'email', u.email,
      'roles', coalesce((select jsonb_agg(ur.role) from public.user_roles ur where ur.user_id = u.id and ur.revoked_at is null), '[]')))
    from (select u0.id, u0.email from auth.users u0 left join public.profiles p0 on p0.id = u0.id
          where lower(u0.email) = q or starts_with(lower(p0.handle), q) limit 10) u
    left join public.profiles p on p.id = u.id), '[]');
end $$;

create or replace function public.admin_grant_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_write', 30, 3600);
begin
  if p_role not in ('teacher_beta', 'teacher_admin') then raise exception 'invalid_role' using errcode = 'P0001'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.user_roles(user_id, role, created_by) values (p_user, p_role, v)
  on conflict (user_id, role) where revoked_at is null do nothing;
end $$;

create or replace function public.admin_revoke_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_write', 30, 3600);
begin
  if p_user = v and p_role = 'teacher_admin' then raise exception 'cannot_revoke_self' using errcode = 'P0001'; end if;
  update public.user_roles set revoked_at = now(), revoked_by = v where user_id = p_user and role = p_role and revoked_at is null;
end $$;

-- ---------------------------------------------------------------- SQL-editor workflow (postgres / service_role only)
create or replace function public.grant_role_by_email(p_email text, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  if p_role not in ('teacher_beta', 'teacher_admin') then raise exception 'invalid_role'; end if;
  select id into u from auth.users where lower(email) = lower(btrim(p_email));
  if u is null then raise exception 'No user with email % (they must sign in to the game once first)', p_email; end if;
  insert into public.user_roles(user_id, role) values (u, p_role) on conflict (user_id, role) where revoked_at is null do nothing;
end $$;
create or replace function public.revoke_role_by_email(p_email text, p_role text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.user_roles set revoked_at = now() where role = p_role and revoked_at is null
    and user_id = (select id from auth.users where lower(email) = lower(btrim(p_email)));
  get diagnostics n = row_count; return n;
end $$;

-- ---------------------------------------------------------------- student functions (edge function / service role only)
create or replace function public.classroom_join(p_code text, p_token_hash text, p_names text[])
returns table (o_member_id uuid, o_display_name text, o_classroom_name text)
language plpgsql security definer set search_path = public as $$
declare c public.teacher_classrooms; n text; mid uuid; cnt int;
begin
  if not public.teacher_beta_enabled() then raise exception 'teacher_beta_disabled'; end if;
  select * into c from public.teacher_classrooms t
   where t.join_code = p_code and t.active and t.archived_at is null and t.join_code_expires_at > now() for update;
  if not found then raise exception 'invalid_code'; end if;
  select count(*) into cnt from public.classroom_members m where m.classroom_id = c.id and m.status = 'active';
  if cnt >= c.max_members then raise exception 'classroom_full'; end if;
  foreach n in array p_names loop
    begin
      insert into public.classroom_members(classroom_id, display_name, token_hash) values (c.id, n, p_token_hash) returning id into mid;
      exit;
    exception when unique_violation then mid := null;   -- nickname taken: try the next candidate
    end;
  end loop;
  if mid is null then raise exception 'try_again'; end if;
  perform public._log_event('classroom_joined', null, c.id, null);
  return query select mid, n, c.name;
end $$;

create or replace function public.student_context(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.classroom_members; c public.teacher_classrooms; s public.classroom_sessions; done boolean := false; res jsonb; stats jsonb; cnt int;
begin
  if not public.teacher_beta_enabled() then raise exception 'teacher_beta_disabled'; end if;
  select * into m from public.classroom_members where token_hash = p_token_hash and status = 'active';
  if not found then raise exception 'invalid_token'; end if;
  select * into c from public.teacher_classrooms where id = m.classroom_id;
  if c.archived_at is not null then raise exception 'classroom_closed'; end if;
  update public.classroom_members set last_active_at = now() where id = m.id;
  select * into s from public.classroom_sessions where classroom_id = c.id order by created_at desc limit 1;
  if s.id is not null then
    select jsonb_build_object('score', r.score, 'cons_letter', r.cons_letter, 'lib_letter', r.lib_letter, 'completion_status', r.completion_status,
        'econ_growth', r.econ_growth, 'unemployment', r.unemployment, 'inflation', r.inflation, 'deficit', r.deficit, 'approval', r.approval, 'unrest', r.unrest)
      into res from public.classroom_results r where r.session_id = s.id and r.member_id = m.id;
    done := res is not null;
    select count(*) into cnt from public.classroom_results where session_id = s.id;
    -- class results are shown only after the teacher reveals them, only to students who finished, and only with >= 3 results (anonymity)
    if s.reveal_results and done and cnt >= 3 then stats := public.classroom_session_stats(s.id); end if;
  end if;
  return jsonb_build_object('nickname', m.display_name, 'classroom', jsonb_build_object('name', c.name),
    'session', case when s.id is null then null else jsonb_build_object('id', s.id, 'title', s.title, 'instructions', s.instructions,
        'status', s.status, 'reveal_results', s.reveal_results, 'seed', case when s.status = 'active' then s.seed end) end,
    'completed', done, 'my_result', res, 'class_results', stats);
end $$;

create or replace function public.student_record_result(p_token_hash text, p_session uuid, p_metrics jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare m public.classroom_members; s public.classroom_sessions;
begin
  select * into m from public.classroom_members where token_hash = p_token_hash and status = 'active';
  if not found then raise exception 'invalid_token'; end if;
  select * into s from public.classroom_sessions where id = p_session and classroom_id = m.classroom_id;
  if not found then raise exception 'not_found'; end if;
  if s.status <> 'active' then raise exception 'session_not_active'; end if;
  begin
    insert into public.classroom_results(session_id, member_id, completion_status, score, cons_letter, lib_letter, needle, econ_growth, unemployment,
      inflation, deficit, approval, unrest, scandal, engine_version, log)
    values (s.id, m.id, p_metrics->>'completion_status', (p_metrics->>'score')::int, p_metrics->>'cons_letter', p_metrics->>'lib_letter',
      (p_metrics->>'needle')::numeric, (p_metrics->>'econ_growth')::numeric, (p_metrics->>'unemployment')::numeric, (p_metrics->>'inflation')::numeric,
      (p_metrics->>'deficit')::numeric, (p_metrics->>'approval')::numeric, (p_metrics->>'unrest')::numeric, (p_metrics->>'scandal')::numeric,
      (p_metrics->>'engine_version')::int, p_metrics->>'log');
  exception when unique_violation then raise exception 'already_submitted';
  end;
  perform public._log_event('classroom_session_completed', null, s.classroom_id, s.id);
end $$;

create or replace function public.student_leave(p_token_hash text) returns void
language sql security definer set search_path = public as $$
  -- data minimization: leaving deletes the participant and (by cascade) their results
  delete from public.classroom_members where token_hash = p_token_hash
$$;

-- Retention helper: hard-delete classrooms archived more than p_days ago. Run manually or from pg_cron.
create or replace function public.purge_archived_classrooms(p_days int default 90) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.teacher_classrooms where archived_at is not null and archived_at < now() - make_interval(days => p_days);
  get diagnostics n = row_count; return n;
end $$;

-- ---------------------------------------------------------------- function privileges
-- Postgres grants EXECUTE to PUBLIC by default, and Supabase adds anon/authenticated. Lock everything, then open deliberately.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and (p.proname like 'teacher\_%' or p.proname like 'admin\_%' or p.proname like '\_%'
              or p.proname in ('rl_hit','rl_peek','gen_join_code','classroom_session_stats','classroom_join','student_context',
                               'student_record_result','student_leave','grant_role_by_email','revoke_role_by_email','purge_archived_classrooms'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
-- the only functions a signed-in browser may call (each re-checks identity, flag, capability, ownership and rate limit itself)
grant execute on function public.teacher_me() to authenticated;
grant execute on function public.teacher_dashboard() to authenticated;
grant execute on function public.teacher_create_classroom(text) to authenticated;
grant execute on function public.teacher_get_classroom(uuid) to authenticated;
grant execute on function public.teacher_set_join_code(uuid, int) to authenticated;
grant execute on function public.teacher_revoke_join_code(uuid) to authenticated;
grant execute on function public.teacher_archive_classroom(uuid) to authenticated;
grant execute on function public.teacher_delete_classroom(uuid) to authenticated;
grant execute on function public.teacher_start_session(uuid, text, text) to authenticated;
grant execute on function public.teacher_get_session(uuid) to authenticated;
grant execute on function public.teacher_end_session(uuid) to authenticated;
grant execute on function public.teacher_set_reveal(uuid, boolean) to authenticated;
grant execute on function public.teacher_submit_feedback(text, text, text, boolean, text, uuid) to authenticated;
grant execute on function public.teacher_track(text) to authenticated;
grant execute on function public.admin_list_roles() to authenticated;
grant execute on function public.admin_find_users(text) to authenticated;
grant execute on function public.admin_grant_role(uuid, text) to authenticated;
grant execute on function public.admin_revoke_role(uuid, text) to authenticated;
