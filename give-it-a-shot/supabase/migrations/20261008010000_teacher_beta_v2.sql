-- Teacher Beta v2 (additive): session length (3-28 days), difficulty (0 = AP/standard, 1 = core), synchronized countdown start,
-- live progress for the teacher leaderboard, per-student decision digests for written summaries, and removing a participant.
-- Safe to run on top of 20261008000000_teacher_beta.sql. Existing sessions keep working (14 days, standard, already started).

-- ---------------------------------------------------------------- columns and tables
alter table public.classroom_sessions
  add column if not exists days int not null default 14 check (days between 3 and 28),
  add column if not exists difficulty smallint not null default 0 check (difficulty in (0, 1)),
  add column if not exists starts_at timestamptz;     -- null = waiting room; set by the teacher's Start button (now + 5 seconds)
update public.classroom_sessions set starts_at = started_at where starts_at is null;

alter table public.classroom_results add column if not exists digest jsonb;   -- decisions summary computed by the server-side replay; never the raw log

create table if not exists public.classroom_progress (
  session_id uuid not null references public.classroom_sessions(id) on delete cascade,
  member_id uuid not null references public.classroom_members(id) on delete cascade,
  day int not null check (day between 1 and 28),
  score int not null,
  approval numeric not null,
  scandal numeric not null,
  over boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (session_id, member_id)
);
alter table public.classroom_progress enable row level security;
revoke all on table public.classroom_progress from anon, authenticated;     -- read only through teacher_get_session (definer)

-- ---------------------------------------------------------------- teacher RPCs
drop function if exists public.teacher_start_session(uuid, text, text);
create or replace function public.teacher_start_session(p_classroom uuid, p_title text default null, p_instructions text default null,
                                                        p_days int default 14, p_difficulty int default 0) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v uuid := public._teacher_guard('t_session', 30, 3600); c public.teacher_classrooms := public._own_classroom(v, p_classroom);
        s public.classroom_sessions; t text := btrim(coalesce(p_title, '')); ins text := btrim(coalesce(p_instructions, ''));
begin
  if not c.active then raise exception 'classroom_archived' using errcode = 'P0001'; end if;
  if t = '' then t := 'Class simulation'; end if;
  if char_length(t) > 80 or char_length(ins) > 600 then raise exception 'invalid_text' using errcode = 'P0001'; end if;
  if p_days is null or p_days < 3 or p_days > 28 then raise exception 'invalid_days' using errcode = 'P0001'; end if;
  if p_difficulty is null or p_difficulty not in (0, 1) then raise exception 'invalid_difficulty' using errcode = 'P0001'; end if;
  if exists (select 1 from public.classroom_sessions where classroom_id = c.id and status = 'active') then
    raise exception 'session_already_active' using errcode = 'P0001'; end if;
  insert into public.classroom_sessions(classroom_id, title, instructions, seed, days, difficulty, scenario_id, starts_at)
  values (c.id, t, ins, (get_byte(gen_random_bytes(1),0) & 127) * 16777216 + get_byte(gen_random_bytes(1),0) * 65536 + get_byte(gen_random_bytes(1),0) * 256 + get_byte(gen_random_bytes(1),0),
          p_days, p_difficulty, 'president-' || p_days || 'day', null)
  returning * into s;
  perform public._log_event('classroom_session_started', v, c.id, s.id, jsonb_build_object('days', p_days, 'difficulty', p_difficulty));
  return jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status, 'days', s.days, 'difficulty', s.difficulty);
end $$;

-- Teacher presses Start: every student's game begins when starts_at passes (5 seconds from now). Idempotent.
create or replace function public.teacher_begin_countdown(p_id uuid, p_seconds int default 5) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_write', 120, 3600); s public.classroom_sessions := public._own_session(v, p_id);
begin
  if s.status <> 'active' then raise exception 'session_not_active' using errcode = 'P0001'; end if;
  if s.starts_at is null then
    update public.classroom_sessions set starts_at = now() + make_interval(secs => greatest(2, least(coalesce(p_seconds, 5), 30)))
     where id = s.id returning * into s;
    perform public._log_event('classroom_session_countdown', v, s.classroom_id, s.id);
  end if;
  return jsonb_build_object('starts_at', s.starts_at, 'server_now', now());
end $$;

create or replace function public.teacher_get_session(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_read', 240, 60); s public.classroom_sessions := public._own_session(v, p_id); c public.teacher_classrooms;
begin
  select * into c from public.teacher_classrooms where id = s.classroom_id;
  return jsonb_build_object(
    'server_now', now(),
    'session', jsonb_build_object('id', s.id, 'title', s.title, 'instructions', s.instructions, 'status', s.status, 'reveal_results', s.reveal_results,
       'started_at', s.started_at, 'ended_at', s.ended_at, 'scenario_id', s.scenario_id, 'days', s.days, 'difficulty', s.difficulty, 'starts_at', s.starts_at),
    'classroom', jsonb_build_object('id', c.id, 'name', c.name, 'archived', c.archived_at is not null),
    'participants', coalesce((select jsonb_agg(jsonb_build_object('member_id', m.id, 'display_name', m.display_name, 'last_active_at', m.last_active_at,
        'completed', r.id is not null,
        'day', case when r.id is not null then s.days else pr.day end,
        'live_score', coalesce(r.score, pr.score), 'live_approval', coalesce(r.approval, pr.approval), 'live_scandal', coalesce(r.scandal, pr.scandal),
        'over', coalesce(r.completion_status = 'removed', pr.over, false),
        'progress_at', pr.updated_at) order by coalesce(r.score, pr.score, -1) desc, m.display_name)
        from public.classroom_members m
        left join public.classroom_results r on r.member_id = m.id and r.session_id = s.id
        left join public.classroom_progress pr on pr.member_id = m.id and pr.session_id = s.id
        where m.classroom_id = c.id and m.status = 'active'), '[]'),
    'results', coalesce((select jsonb_agg(jsonb_build_object('member_id', r.member_id, 'display_name', m.display_name, 'completion_status', r.completion_status,
        'score', r.score, 'cons_letter', r.cons_letter, 'lib_letter', r.lib_letter, 'needle', r.needle, 'econ_growth', r.econ_growth,
        'unemployment', r.unemployment, 'inflation', r.inflation, 'deficit', r.deficit, 'approval', r.approval, 'unrest', r.unrest,
        'scandal', r.scandal, 'completed_at', r.completed_at) order by m.display_name)
        from public.classroom_results r join public.classroom_members m on m.id = r.member_id where r.session_id = s.id), '[]'),
    'stats', public.classroom_session_stats(s.id));
end $$;

-- Per-student decision digests (for the written summaries). Loaded on demand because it is much bigger than the live board.
create or replace function public.teacher_session_digests(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_digest', 30, 60); s public.classroom_sessions := public._own_session(v, p_id);
begin
  return jsonb_build_object('days', s.days, 'difficulty', s.difficulty,
    'rows', coalesce((select jsonb_agg(jsonb_build_object('member_id', r.member_id, 'display_name', m.display_name, 'score', r.score,
        'cons_letter', r.cons_letter, 'lib_letter', r.lib_letter, 'needle', r.needle, 'completion_status', r.completion_status,
        'econ_growth', r.econ_growth, 'unemployment', r.unemployment, 'inflation', r.inflation, 'deficit', r.deficit,
        'approval', r.approval, 'unrest', r.unrest, 'scandal', r.scandal, 'digest', r.digest) order by m.display_name)
        from public.classroom_results r join public.classroom_members m on m.id = r.member_id where r.session_id = s.id), '[]'));
end $$;

create or replace function public.teacher_remove_member(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_write', 120, 3600);
begin
  delete from public.classroom_members m using public.teacher_classrooms c
   where m.id = p_member and c.id = m.classroom_id and c.owner_user_id = v;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

-- ---------------------------------------------------------------- student functions (edge function / service role only)
create or replace function public.student_context(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.classroom_members; c public.teacher_classrooms; s public.classroom_sessions; done boolean := false; res jsonb; stats jsonb; cnt int; started boolean := false;
begin
  if not public.teacher_beta_enabled() then raise exception 'teacher_beta_disabled'; end if;
  select * into m from public.classroom_members where token_hash = p_token_hash and status = 'active';
  if not found then raise exception 'invalid_token'; end if;
  select * into c from public.teacher_classrooms where id = m.classroom_id;
  if c.archived_at is not null then raise exception 'classroom_closed'; end if;
  update public.classroom_members set last_active_at = now() where id = m.id;
  select * into s from public.classroom_sessions where classroom_id = c.id order by created_at desc limit 1;
  if s.id is not null then
    started := s.starts_at is not null and s.starts_at <= now();
    select jsonb_build_object('score', r.score, 'cons_letter', r.cons_letter, 'lib_letter', r.lib_letter, 'completion_status', r.completion_status,
        'econ_growth', r.econ_growth, 'unemployment', r.unemployment, 'inflation', r.inflation, 'deficit', r.deficit, 'approval', r.approval, 'unrest', r.unrest,
        'scandal', r.scandal, 'needle', r.needle, 'digest', r.digest)
      into res from public.classroom_results r where r.session_id = s.id and r.member_id = m.id;
    done := res is not null;
    select count(*) into cnt from public.classroom_results where session_id = s.id;
    -- class results are shown only after the teacher reveals them, only to students who finished, and only with >= 3 results (anonymity)
    if s.reveal_results and done and cnt >= 3 then stats := public.classroom_session_stats(s.id); end if;
  end if;
  return jsonb_build_object('nickname', m.display_name, 'classroom', jsonb_build_object('name', c.name), 'server_now', now(),
    'session', case when s.id is null then null else jsonb_build_object('id', s.id, 'title', s.title, 'instructions', s.instructions,
        'status', s.status, 'reveal_results', s.reveal_results, 'days', s.days, 'difficulty', s.difficulty,
        'starts_at', s.starts_at, 'started', started,
        'seed', case when s.status = 'active' and started then s.seed end) end,
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
  if s.starts_at is null or s.starts_at > now() then raise exception 'not_started'; end if;
  begin
    insert into public.classroom_results(session_id, member_id, completion_status, score, cons_letter, lib_letter, needle, econ_growth, unemployment,
      inflation, deficit, approval, unrest, scandal, engine_version, log, digest)
    values (s.id, m.id, p_metrics->>'completion_status', (p_metrics->>'score')::int, p_metrics->>'cons_letter', p_metrics->>'lib_letter',
      (p_metrics->>'needle')::numeric, (p_metrics->>'econ_growth')::numeric, (p_metrics->>'unemployment')::numeric, (p_metrics->>'inflation')::numeric,
      (p_metrics->>'deficit')::numeric, (p_metrics->>'approval')::numeric, (p_metrics->>'unrest')::numeric, (p_metrics->>'scandal')::numeric,
      (p_metrics->>'engine_version')::int, p_metrics->>'log', p_metrics->'digest');
  exception when unique_violation then raise exception 'already_submitted';
  end;
  delete from public.classroom_progress where session_id = s.id and member_id = m.id;
  perform public._log_event('classroom_session_completed', null, s.classroom_id, s.id);
end $$;

-- Live leaderboard feed. The numbers come from the edge function's own replay of the student's log so far, never from the browser.
create or replace function public.student_record_progress(p_token_hash text, p_session uuid, p_day int, p_score int, p_approval numeric, p_scandal numeric, p_over boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare m public.classroom_members; s public.classroom_sessions;
begin
  select * into m from public.classroom_members where token_hash = p_token_hash and status = 'active';
  if not found then raise exception 'invalid_token'; end if;
  select * into s from public.classroom_sessions where id = p_session and classroom_id = m.classroom_id;
  if not found then raise exception 'not_found'; end if;
  if s.status <> 'active' then raise exception 'session_not_active'; end if;
  if s.starts_at is null or s.starts_at > now() then raise exception 'not_started'; end if;
  if exists (select 1 from public.classroom_results where session_id = s.id and member_id = m.id) then return; end if;
  insert into public.classroom_progress as p(session_id, member_id, day, score, approval, scandal, over, updated_at)
  values (s.id, m.id, least(greatest(p_day, 1), s.days), p_score, p_approval, p_scandal, coalesce(p_over, false), now())
  on conflict (session_id, member_id) do update set day = greatest(p.day, excluded.day), score = excluded.score, approval = excluded.approval,
    scandal = excluded.scandal, over = excluded.over, updated_at = now();
end $$;

-- ---------------------------------------------------------------- privileges for everything new or replaced
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('teacher_start_session','teacher_begin_countdown','teacher_get_session','teacher_session_digests',
             'teacher_remove_member','student_context','student_record_result','student_record_progress')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
grant execute on function public.teacher_start_session(uuid, text, text, int, int) to authenticated;
grant execute on function public.teacher_begin_countdown(uuid, int) to authenticated;
grant execute on function public.teacher_get_session(uuid) to authenticated;
grant execute on function public.teacher_session_digests(uuid) to authenticated;
grant execute on function public.teacher_remove_member(uuid) to authenticated;
