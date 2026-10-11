-- Teacher Beta: a per-session switch for power plays (additive).
-- power_plays = false hides the "Power Plays" executive actions and the crisis payoff option for that session; the classroom
-- edge function replays with the same switch, so a forged log that uses one is rejected. Only meaningful at AP difficulty
-- (Core already has no executive actions). Existing sessions keep power_plays = true and play exactly as before.
-- Safe on top of 20261009020000_beta_fixes_1009.sql. Needs the classroom edge function that passes power_plays to the engine.

alter table public.classroom_sessions
  add column if not exists power_plays boolean not null default true;

drop function if exists public.teacher_start_session(uuid, text, text, int, int, text);
create or replace function public.teacher_start_session(p_classroom uuid, p_title text default null, p_instructions text default null,
                                                        p_days int default 14, p_difficulty int default 0, p_focus text default null,
                                                        p_power_plays boolean default true) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v uuid := public._teacher_guard('t_session', 30, 3600); c public.teacher_classrooms := public._own_classroom(v, p_classroom);
        s public.classroom_sessions; t text := btrim(coalesce(p_title, '')); ins text := btrim(coalesce(p_instructions, ''));
        f text := nullif(btrim(coalesce(p_focus, '')), '');
begin
  if not c.active then raise exception 'classroom_archived' using errcode = 'P0001'; end if;
  if t = '' then t := 'Class simulation'; end if;
  if char_length(t) > 80 or char_length(ins) > 600 then raise exception 'invalid_text' using errcode = 'P0001'; end if;
  if p_days is null or p_days < 3 or p_days > 28 then raise exception 'invalid_days' using errcode = 'P0001'; end if;
  if p_difficulty is null or p_difficulty not in (0, 1) then raise exception 'invalid_difficulty' using errcode = 'P0001'; end if;
  if f is not null and f not in ('u1', 'u3', 'u4', 'u5', 'u6') then raise exception 'invalid_focus' using errcode = 'P0001'; end if;
  if exists (select 1 from public.classroom_sessions where classroom_id = c.id and status = 'active') then
    raise exception 'session_already_active' using errcode = 'P0001'; end if;
  insert into public.classroom_sessions(classroom_id, title, instructions, seed, days, difficulty, focus, power_plays, scenario_id, starts_at)
  values (c.id, t, ins, (get_byte(gen_random_bytes(1),0) & 127) * 16777216 + get_byte(gen_random_bytes(1),0) * 65536 + get_byte(gen_random_bytes(1),0) * 256 + get_byte(gen_random_bytes(1),0),
          p_days, p_difficulty, f, coalesce(p_power_plays, true), 'president-' || p_days || 'day', null)
  returning * into s;
  perform public._log_event('classroom_session_started', v, c.id, s.id, jsonb_build_object('days', p_days, 'difficulty', p_difficulty, 'focus', f, 'power_plays', coalesce(p_power_plays, true)));
  return jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status, 'days', s.days, 'difficulty', s.difficulty, 'focus', s.focus, 'power_plays', s.power_plays);
end $$;

create or replace function public.teacher_get_session(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_read', 240, 60); s public.classroom_sessions := public._own_session(v, p_id); c public.teacher_classrooms;
begin
  select * into c from public.teacher_classrooms where id = s.classroom_id;
  return jsonb_build_object(
    'server_now', now(),
    'session', jsonb_build_object('id', s.id, 'title', s.title, 'instructions', s.instructions, 'status', s.status, 'reveal_results', s.reveal_results,
       'started_at', s.started_at, 'ended_at', s.ended_at, 'scenario_id', s.scenario_id, 'days', s.days, 'difficulty', s.difficulty, 'focus', s.focus,
       'power_plays', s.power_plays, 'starts_at', s.starts_at),
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
        'scandal', r.scandal, 'completed_at', r.completed_at, 'quiz_score', r.quiz_score, 'quiz_of', r.quiz_of) order by m.display_name)
        from public.classroom_results r join public.classroom_members m on m.id = r.member_id where r.session_id = s.id), '[]'),
    'stats', public.classroom_session_stats(s.id));
end $$;

create or replace function public.teacher_session_digests(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_digest', 30, 60); s public.classroom_sessions := public._own_session(v, p_id);
begin
  return jsonb_build_object('days', s.days, 'difficulty', s.difficulty, 'focus', s.focus, 'power_plays', s.power_plays,
    'rows', coalesce((select jsonb_agg(jsonb_build_object('member_id', r.member_id, 'display_name', m.display_name, 'score', r.score,
        'cons_letter', r.cons_letter, 'lib_letter', r.lib_letter, 'needle', r.needle, 'completion_status', r.completion_status,
        'econ_growth', r.econ_growth, 'unemployment', r.unemployment, 'inflation', r.inflation, 'deficit', r.deficit,
        'approval', r.approval, 'unrest', r.unrest, 'scandal', r.scandal, 'digest', r.digest,
        'quiz', r.quiz, 'quiz_score', r.quiz_score, 'quiz_of', r.quiz_of) order by m.display_name)
        from public.classroom_results r join public.classroom_members m on m.id = r.member_id where r.session_id = s.id), '[]'));
end $$;

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
        'scandal', r.scandal, 'needle', r.needle, 'digest', r.digest, 'quiz', r.quiz, 'quiz_score', r.quiz_score, 'quiz_of', r.quiz_of)
      into res from public.classroom_results r where r.session_id = s.id and r.member_id = m.id;
    done := res is not null;
    select count(*) into cnt from public.classroom_results where session_id = s.id;
    -- class results are shown only after the teacher reveals them, only to students who finished, and only with >= 3 results (anonymity)
    if s.reveal_results and done and cnt >= 3 then stats := public.classroom_session_stats(s.id); end if;
  end if;
  return jsonb_build_object('nickname', m.display_name, 'classroom', jsonb_build_object('name', c.name), 'server_now', now(),
    'session', case when s.id is null then null else jsonb_build_object('id', s.id, 'title', s.title, 'instructions', s.instructions,
        'status', s.status, 'reveal_results', s.reveal_results, 'days', s.days, 'difficulty', s.difficulty, 'focus', s.focus, 'power_plays', s.power_plays,
        'starts_at', s.starts_at, 'started', started,
        'seed', case when s.status = 'active' and started then s.seed end) end,
    'completed', done, 'my_result', res, 'class_results', stats);
end $$;

do $$ begin
  revoke all on function public.student_context(text) from public, anon, authenticated;
  grant execute on function public.student_context(text) to service_role;
end $$;
revoke all on function public.teacher_start_session(uuid, text, text, int, int, text, boolean) from public, anon;
grant execute on function public.teacher_start_session(uuid, text, text, int, int, text, boolean) to authenticated;
grant execute on function public.teacher_get_session(uuid) to authenticated;
grant execute on function public.teacher_session_digests(uuid) to authenticated;
