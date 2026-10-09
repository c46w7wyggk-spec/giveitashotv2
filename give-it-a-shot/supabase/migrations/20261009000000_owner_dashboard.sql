-- Owner dashboard (additive): what a teacher_admin (capability admin.roles) needs to run the beta.
--   * client_errors: uncaught browser errors and failed server calls, reported by the site itself (anon or signed in).
--   * classroom_tombstones: when a teacher deletes a classroom, a nameless record of its size survives, so past usage stays
--     countable. It holds no classroom name, student name or result.
--   * admin_owner_overview / admin_owner_classrooms / admin_list_feedback / admin_list_errors / admin_resolve_errors:
--     read-only views for admins. Student names, results and logs stay private to the classroom's own teacher.
-- Safe to run on top of 20261008030000_teacher_signup.sql.

-- ---------------------------------------------------------------- tables
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('error', 'rejection', 'api')),
  fingerprint text not null,                       -- md5 of kind + message + source: groups repeats of the same problem
  message text not null check (char_length(message) <= 500),
  source text check (char_length(source) <= 300),  -- file:line:col, or the API call that failed
  stack text check (char_length(stack) <= 2000),
  path text check (char_length(path) <= 200),      -- page path only, never the query string or hash
  build text check (char_length(build) <= 40),
  ua text check (char_length(ua) <= 200),
  user_id uuid,                                    -- set when the person was signed in; no FK so rows outlive accounts
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists client_errors_time_idx on public.client_errors (created_at desc);
create index if not exists client_errors_fp_idx on public.client_errors (fingerprint, created_at desc);

create table if not exists public.classroom_tombstones (
  classroom_id uuid primary key,
  owner_user_id uuid,
  created_at timestamptz not null,
  deleted_at timestamptz not null default now(),
  archived_at timestamptz,
  members int not null default 0,
  sessions int not null default 0,
  results int not null default 0
);

alter table public.client_errors enable row level security;
alter table public.classroom_tombstones enable row level security;
revoke all on table public.client_errors, public.classroom_tombstones from public, anon, authenticated;
-- no policies: clients reach these tables only through the functions below

-- ---------------------------------------------------------------- tombstones
create or replace function public._classroom_tombstone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- BEFORE DELETE runs ahead of the cascades, so the counts are still there
  insert into public.classroom_tombstones(classroom_id, owner_user_id, created_at, archived_at, members, sessions, results)
  values (old.id, old.owner_user_id, old.created_at, old.archived_at,
    (select count(*) from public.classroom_members m where m.classroom_id = old.id),
    (select count(*) from public.classroom_sessions s where s.classroom_id = old.id),
    (select count(*) from public.classroom_results r join public.classroom_sessions s on s.id = r.session_id where s.classroom_id = old.id))
  on conflict (classroom_id) do nothing;
  return old;
end $$;
drop trigger if exists teacher_classrooms_tombstone on public.teacher_classrooms;
create trigger teacher_classrooms_tombstone before delete on public.teacher_classrooms
  for each row execute function public._classroom_tombstone();

-- ---------------------------------------------------------------- error reporting (anyone)
-- Rate limited three ways: per sender (IP hash or user), per fingerprint, and globally, so a broken release or a hostile
-- client cannot flood the table. Over the limit the call silently does nothing.
create or replace function public.log_client_error(p_kind text, p_message text, p_source text default null, p_stack text default null,
                                                   p_path text default null, p_build text default null, p_ua text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v uuid := (select auth.uid()); hdr json; ip text; who text; m text := left(btrim(coalesce(p_message, '')), 500);
        src text := nullif(left(btrim(coalesce(p_source, '')), 300), ''); fp text;
begin
  if p_kind is null or p_kind not in ('error', 'rejection', 'api') or m = '' then return; end if;
  begin hdr := nullif(current_setting('request.headers', true), '')::json; exception when others then hdr := null; end;
  ip := split_part(coalesce(hdr->>'x-forwarded-for', hdr->>'x-real-ip', ''), ',', 1);
  who := coalesce(v::text, 'ip:' || md5(btrim(ip)));
  fp := md5(p_kind || '|' || m || '|' || coalesce(src, ''));
  if not public.rl_hit('err_g', 600, 60) then return; end if;
  if not public.rl_hit('err_w:' || who, 20, 600) then return; end if;
  if not public.rl_hit('err_f:' || fp, 60, 3600) then return; end if;
  insert into public.client_errors(kind, fingerprint, message, source, stack, path, build, ua, user_id)
  values (p_kind, fp, m, src, nullif(left(coalesce(p_stack, ''), 2000), ''), nullif(left(split_part(split_part(coalesce(p_path, ''), '?', 1), '#', 1), 200), ''),
          nullif(left(coalesce(p_build, ''), 40), ''), nullif(left(coalesce(p_ua, ''), 200), ''), v);
  if random() < 0.01 then delete from public.client_errors where created_at < now() - interval '90 days'; end if;
end $$;

-- ---------------------------------------------------------------- admin (owner) views
create or replace function public.admin_owner_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_read', 60, 60);
begin
  perform public._log_event('admin_overview_viewed', v, null, null);
  return jsonb_build_object(
    'generated_at', now(),
    'teacher_beta_enabled', public.teacher_beta_enabled(),
    'people', jsonb_build_object(
      'accounts', (select count(*) from auth.users),
      'accounts_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'confirmed', (select count(*) from auth.users where email_confirmed_at is not null),
      'signed_in_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
      'players_with_handle', (select count(*) from public.profiles),
      'teachers', (select count(distinct user_id) from public.user_roles where role = 'teacher_beta' and revoked_at is null and (expires_at is null or expires_at > now())),
      'admins', (select count(distinct user_id) from public.user_roles where role = 'teacher_admin' and revoked_at is null and (expires_at is null or expires_at > now())),
      'waiting', (select count(*) from public.teacher_applications a where a.dismissed_at is null and not public.user_has_capability(a.user_id, 'teacher.classrooms'))),
    'game', jsonb_build_object(
      'scores', (select count(*) from public.scores),
      'scores_24h', (select count(*) from public.scores where created_at > now() - interval '24 hours'),
      'scores_7d', (select count(*) from public.scores where created_at > now() - interval '7 days'),
      'daily_7d', (select count(*) from public.scores where mode = 'daily' and created_at > now() - interval '7 days'),
      'players_7d', (select count(distinct user_id) from public.scores where created_at > now() - interval '7 days'),
      'avg_score_7d', (select round(avg(score)) from public.scores where created_at > now() - interval '7 days'),
      'last_score_at', (select max(created_at) from public.scores),
      'engine_versions', (select coalesce(jsonb_object_agg(engine_version::text, n), '{}') from
          (select engine_version, count(*) n from public.scores where created_at > now() - interval '30 days' group by 1) q)),
    'classrooms', jsonb_build_object(
      'open', (select count(*) from public.teacher_classrooms where archived_at is null),
      'archived', (select count(*) from public.teacher_classrooms where archived_at is not null),
      'deleted', (select count(*) from public.classroom_tombstones),
      'sessions_running', (select count(*) from public.classroom_sessions where status = 'active'),
      'sessions_total', (select count(*) from public.classroom_sessions) + (select coalesce(sum(sessions), 0) from public.classroom_tombstones),
      'students_now', (select count(*) from public.classroom_members where status = 'active'),
      'students_active_1h', (select count(*) from public.classroom_members where status = 'active' and last_active_at > now() - interval '1 hour'),
      'joins_7d', (select count(*) from public.analytics_events where event = 'classroom_joined' and created_at > now() - interval '7 days'),
      'results_total', (select count(*) from public.classroom_results) + (select coalesce(sum(results), 0) from public.classroom_tombstones),
      'results_7d', (select count(*) from public.classroom_results where completed_at > now() - interval '7 days'),
      'removed_from_office_7d', (select count(*) from public.classroom_results where completion_status = 'removed' and completed_at > now() - interval '7 days'),
      'engine_versions', (select coalesce(jsonb_object_agg(engine_version::text, n), '{}') from
          (select engine_version, count(*) n from public.classroom_results where completed_at > now() - interval '30 days' group by 1) q)),
    'feedback', jsonb_build_object(
      'total', (select count(*) from public.teacher_feedback),
      'last_7d', (select count(*) from public.teacher_feedback where created_at > now() - interval '7 days'),
      'use_again_yes', (select count(*) from public.teacher_feedback where would_use_again),
      'use_again_no', (select count(*) from public.teacher_feedback where would_use_again = false),
      'pay', (select coalesce(jsonb_object_agg(would_pay, n), '{}') from (select would_pay, count(*) n from public.teacher_feedback where would_pay is not null group by 1) q),
      'last_at', (select max(created_at) from public.teacher_feedback)),
    'errors', jsonb_build_object(
      'last_24h', (select count(*) from public.client_errors where created_at > now() - interval '24 hours'),
      'last_7d', (select count(*) from public.client_errors where created_at > now() - interval '7 days'),
      'open_groups', (select count(distinct fingerprint) from public.client_errors where resolved_at is null and created_at > now() - interval '30 days'),
      'people_7d', (select count(distinct coalesce(user_id::text, ua)) from public.client_errors where created_at > now() - interval '7 days'),
      'last_at', (select max(created_at) from public.client_errors)),
    -- one row per day for the last 14 days (UTC), oldest first
    'daily', (select jsonb_agg(jsonb_build_object(
        'day', d::date,
        'scores', (select count(*) from public.scores s where s.created_at >= d and s.created_at < d + interval '1 day'),
        'signups', (select count(*) from auth.users u where u.created_at >= d and u.created_at < d + interval '1 day'),
        'joins', (select count(*) from public.analytics_events e where e.event = 'classroom_joined' and e.created_at >= d and e.created_at < d + interval '1 day'),
        'sessions', (select count(*) from public.analytics_events e where e.event = 'classroom_session_started' and e.created_at >= d and e.created_at < d + interval '1 day'),
        'results', (select count(*) from public.analytics_events e where e.event = 'classroom_session_completed' and e.created_at >= d and e.created_at < d + interval '1 day'),
        'errors', (select count(*) from public.client_errors c where c.created_at >= d and c.created_at < d + interval '1 day')) order by d)
      from generate_series(date_trunc('day', now() at time zone 'utc') - interval '13 days', date_trunc('day', now() at time zone 'utc'), interval '1 day') d),
    'load', jsonb_build_object(
      'db_bytes', pg_database_size(current_database()),
      'connections', (select count(*) from pg_stat_activity where datname = current_database()),
      'connections_active', (select count(*) from pg_stat_activity where datname = current_database() and state = 'active'),
      'max_connections', current_setting('max_connections')::int,
      -- guarded calls counted by the rate limiter in windows that started in the last hour (approximate request volume)
      'calls_1h', (select coalesce(sum(hits), 0) from public.rate_limits where window_start > now() - interval '1 hour'),
      'busiest_hour_7d', (select jsonb_build_object('hour', h, 'events', n) from (select date_trunc('hour', created_at) h, count(*) n from
          (select created_at from public.scores where created_at > now() - interval '7 days'
           union all select created_at from public.analytics_events where created_at > now() - interval '7 days') x group by 1 order by 2 desc limit 1) q),
      'limited_buckets_1h', (select coalesce(jsonb_agg(jsonb_build_object('bucket', b, 'max_hits', mh) order by mh desc), '[]') from
          (select split_part(key, ':', 1) b, max(hits) mh from public.rate_limits where window_start > now() - interval '1 hour' group by 1 order by 2 desc limit 8) q),
      'tables', (select jsonb_agg(jsonb_build_object('name', c.relname, 'rows', greatest(c.reltuples, 0)::bigint, 'bytes', pg_total_relation_size(c.oid)) order by pg_total_relation_size(c.oid) desc)
          from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'))
  );
end $$;

-- Every classroom, open, archived and deleted, with per-session aggregates. No student names, results or logs.
create or replace function public.admin_owner_classrooms() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_read', 60, 60);
begin
  perform public._log_event('admin_classrooms_viewed', v, null, null);
  return jsonb_build_object(
    'classrooms', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'created_at', c.created_at, 'archived_at', c.archived_at,
        'owner_handle', p.handle, 'owner_email', u.email, 'owner_name', a.name, 'owner_school', a.school,
        'join_open', c.join_code_expires_at > now(),
        'members', (select count(*) from public.classroom_members m where m.classroom_id = c.id and m.status = 'active'),
        'last_student_activity', (select max(m.last_active_at) from public.classroom_members m where m.classroom_id = c.id),
        'sessions', coalesce((select jsonb_agg(jsonb_build_object(
            'id', s.id, 'title', s.title, 'status', s.status, 'days', s.days, 'difficulty', s.difficulty,
            'started_at', s.started_at, 'ended_at', s.ended_at,
            'playing', (select count(*) from public.classroom_progress g where g.session_id = s.id),
            'completed', (select count(*) from public.classroom_results r where r.session_id = s.id),
            'removed', (select count(*) from public.classroom_results r where r.session_id = s.id and r.completion_status = 'removed'),
            'avg_score', (select round(avg(r.score)) from public.classroom_results r where r.session_id = s.id))
          order by s.started_at desc) from public.classroom_sessions s where s.classroom_id = c.id), '[]')
      ) order by c.archived_at is not null, c.created_at desc)
      from public.teacher_classrooms c
      left join public.profiles p on p.id = c.owner_user_id
      left join auth.users u on u.id = c.owner_user_id
      left join public.teacher_applications a on a.user_id = c.owner_user_id), '[]'::jsonb),
    'deleted', coalesce((select jsonb_agg(jsonb_build_object(
        'created_at', t.created_at, 'deleted_at', t.deleted_at, 'owner_handle', p.handle, 'owner_email', u.email,
        'members', t.members, 'sessions', t.sessions, 'results', t.results) order by t.deleted_at desc)
      from public.classroom_tombstones t
      left join public.profiles p on p.id = t.owner_user_id
      left join auth.users u on u.id = t.owner_user_id), '[]'::jsonb));
end $$;

create or replace function public.admin_list_feedback() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_read', 60, 60);
begin
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', f.id, 'created_at', f.created_at, 'email', u.email, 'handle', p.handle, 'name', a.name, 'school', a.school,
      'classroom', c.name, 'worked', f.what_worked, 'confused', f.what_confused, 'change', f.what_change,
      'use_again', f.would_use_again, 'would_pay', f.would_pay) order by f.created_at desc)
    from public.teacher_feedback f
    left join auth.users u on u.id = f.user_id
    left join public.profiles p on p.id = f.user_id
    left join public.teacher_applications a on a.user_id = f.user_id
    left join public.teacher_classrooms c on c.id = f.classroom_id), '[]'::jsonb);
end $$;

-- Errors grouped by fingerprint over the last p_days days, newest problem first.
create or replace function public.admin_list_errors(p_days int default 7) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_read', 60, 60); d int := least(greatest(coalesce(p_days, 7), 1), 90);
begin
  return coalesce((select jsonb_agg(g order by (g->>'last_at') desc) from (
    select jsonb_build_object(
      'fingerprint', e.fingerprint, 'kind', min(e.kind), 'message', min(e.message), 'source', min(e.source),
      'count', count(*), 'people', count(distinct coalesce(e.user_id::text, e.ua)),
      'first_at', min(e.created_at), 'last_at', max(e.created_at),
      'resolved', bool_and(e.resolved_at is not null),
      'paths', (select jsonb_agg(distinct x.path) from (select path from public.client_errors where fingerprint = e.fingerprint and path is not null
                 and created_at > now() - make_interval(days => d) limit 50) x),
      'builds', (select jsonb_agg(distinct x.build) from (select build from public.client_errors where fingerprint = e.fingerprint and build is not null
                 and created_at > now() - make_interval(days => d) limit 50) x),
      'sample', (select jsonb_build_object('stack', s.stack, 'ua', s.ua, 'path', s.path, 'at', s.created_at) from public.client_errors s
                 where s.fingerprint = e.fingerprint order by s.created_at desc limit 1)) g
    from public.client_errors e where e.created_at > now() - make_interval(days => d)
    group by e.fingerprint) q), '[]'::jsonb);
end $$;

-- Mark a group fixed. New reports with the same fingerprint show up as open again.
create or replace function public.admin_resolve_errors(p_fingerprint text) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_write', 120, 3600);
begin
  update public.client_errors set resolved_at = now() where fingerprint = p_fingerprint and resolved_at is null;
end $$;

-- ---------------------------------------------------------------- privileges
revoke all on function public._classroom_tombstone(), public.log_client_error(text, text, text, text, text, text, text),
  public.admin_owner_overview(), public.admin_owner_classrooms(), public.admin_list_feedback(), public.admin_list_errors(int),
  public.admin_resolve_errors(text) from public, anon, authenticated;
grant execute on function public.log_client_error(text, text, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.admin_owner_overview(), public.admin_owner_classrooms(), public.admin_list_feedback(),
  public.admin_list_errors(int), public.admin_resolve_errors(text) to authenticated, service_role;
