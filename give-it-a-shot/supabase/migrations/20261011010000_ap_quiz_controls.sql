-- Teacher Beta: teacher control of the end-of-game quiz, a Unit 2 focus, waiting-room settings and written-response scores (additive).
-- quiz: false turns the end-of-game quiz off for a session (the student page hides it and the edge function refuses answers).
--   The teacher can switch it at any time, including after the session ends; answers already given stay.
-- focus: adds 'u2' (economic indicators). Needs the engine that knows AP_UNITS.u2 (src/policies/base_tree.js).
-- teacher_update_session: change quiz at any time; change unit, power plays, difficulty and length only in the waiting room
--   (before Start), since every student's game is replayed with the session's settings.
-- teacher_grade_frq: the teacher scores a student's written response against its rubric (0 to p_of points), or clears it.
-- Safe on top of 20261011000000_power_plays_switch.sql. Existing sessions keep quiz = true and play exactly as before.

alter table public.classroom_sessions
  add column if not exists quiz boolean not null default true;

alter table public.classroom_sessions drop constraint if exists classroom_sessions_focus_check;
alter table public.classroom_sessions
  add constraint classroom_sessions_focus_check check (focus in ('u1', 'u2', 'u3', 'u4', 'u5', 'u6'));

alter table public.classroom_results
  add column if not exists frq_points smallint,
  add column if not exists frq_of smallint,
  add column if not exists frq_graded_at timestamptz;

-- ---------------------------------------------------------------- teacher RPCs
-- Same signature as 20261011000000; only the unit list changes.
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
  if f is not null and f not in ('u1', 'u2', 'u3', 'u4', 'u5', 'u6') then raise exception 'invalid_focus' using errcode = 'P0001'; end if;
  if exists (select 1 from public.classroom_sessions where classroom_id = c.id and status = 'active') then
    raise exception 'session_already_active' using errcode = 'P0001'; end if;
  insert into public.classroom_sessions(classroom_id, title, instructions, seed, days, difficulty, focus, power_plays, scenario_id, starts_at)
  values (c.id, t, ins, (get_byte(gen_random_bytes(1),0) & 127) * 16777216 + get_byte(gen_random_bytes(1),0) * 65536 + get_byte(gen_random_bytes(1),0) * 256 + get_byte(gen_random_bytes(1),0),
          p_days, p_difficulty, f, coalesce(p_power_plays, true), 'president-' || p_days || 'day', null)
  returning * into s;
  perform public._log_event('classroom_session_started', v, c.id, s.id, jsonb_build_object('days', p_days, 'difficulty', p_difficulty, 'focus', f, 'power_plays', coalesce(p_power_plays, true)));
  return jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status, 'days', s.days, 'difficulty', s.difficulty, 'focus', s.focus, 'power_plays', s.power_plays, 'quiz', s.quiz);
end $$;

-- p_settings: any of { quiz: bool } (any time) and { focus: 'u1'..'u6' or null, power_plays: bool, difficulty: 0|1, days: 3..28 }
-- (waiting room only). Unknown keys are ignored.
create or replace function public.teacher_update_session(p_id uuid, p_settings jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_write', 120, 3600); s public.classroom_sessions := public._own_session(v, p_id);
        k jsonb := coalesce(p_settings, '{}'::jsonb); f text; n int; dif int;
begin
  if jsonb_typeof(k) <> 'object' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if k ? 'quiz' then
    if jsonb_typeof(k->'quiz') <> 'boolean' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
    update public.classroom_sessions set quiz = (k->>'quiz')::boolean where id = s.id returning * into s;
  end if;
  if k ?| array['focus', 'power_plays', 'difficulty', 'days'] then
    if s.status <> 'active' or s.starts_at is not null then raise exception 'session_started' using errcode = 'P0001'; end if;
    f := case when k ? 'focus' then nullif(btrim(coalesce(k->>'focus', '')), '') else s.focus end;
    if f is not null and f not in ('u1', 'u2', 'u3', 'u4', 'u5', 'u6') then raise exception 'invalid_focus' using errcode = 'P0001'; end if;
    if (k ? 'power_plays' and jsonb_typeof(k->'power_plays') <> 'boolean') or (k ? 'difficulty' and jsonb_typeof(k->'difficulty') <> 'number')
       or (k ? 'days' and jsonb_typeof(k->'days') <> 'number') or (k ? 'focus' and jsonb_typeof(k->'focus') not in ('string', 'null')) then
      raise exception 'invalid_input' using errcode = 'P0001'; end if;
    if (k ? 'days' and (k->>'days')::numeric <> trunc((k->>'days')::numeric)) or (k ? 'difficulty' and (k->>'difficulty')::numeric <> trunc((k->>'difficulty')::numeric)) then
      raise exception 'invalid_input' using errcode = 'P0001'; end if;
    dif := case when k ? 'difficulty' then (k->>'difficulty')::int else s.difficulty end;
    if dif is null or dif not in (0, 1) then raise exception 'invalid_difficulty' using errcode = 'P0001'; end if;
    n := case when k ? 'days' then (k->>'days')::int else s.days end;
    if n is null or n < 3 or n > 28 then raise exception 'invalid_days' using errcode = 'P0001'; end if;
    -- starts_at is null in the WHERE as well, so a Start pressed a moment earlier wins and nothing changes under a running game.
    update public.classroom_sessions set focus = f, difficulty = dif, days = n, scenario_id = 'president-' || n || 'day',
           power_plays = case when k ? 'power_plays' then (k->>'power_plays')::boolean else power_plays end
     where id = s.id and status = 'active' and starts_at is null returning * into s;
    if not found then raise exception 'session_started' using errcode = 'P0001'; end if;
  end if;
  perform public._log_event('classroom_session_settings', v, s.classroom_id, s.id, k);
  return jsonb_build_object('id', s.id, 'days', s.days, 'difficulty', s.difficulty, 'focus', s.focus, 'power_plays', s.power_plays, 'quiz', s.quiz);
end $$;

-- Score (or with p_points null, clear) one student's written response. p_of is the rubric's point count.
create or replace function public.teacher_grade_frq(p_session uuid, p_member uuid, p_points int, p_of int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_grade', 900, 3600); s public.classroom_sessions := public._own_session(v, p_session); r public.classroom_results;
begin
  if p_points is not null and (p_of is null or p_of < 1 or p_of > 6 or p_points < 0 or p_points > p_of) then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  update public.classroom_results set frq_points = p_points, frq_of = case when p_points is null then null else p_of end,
         frq_graded_at = case when p_points is null then null else now() end
   where session_id = s.id and member_id = p_member and quiz is not null returning * into r;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object('member_id', r.member_id, 'frq_points', r.frq_points, 'frq_of', r.frq_of);
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
       'power_plays', s.power_plays, 'quiz', s.quiz, 'starts_at', s.starts_at),
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
        'scandal', r.scandal, 'completed_at', r.completed_at, 'quiz_score', r.quiz_score, 'quiz_of', r.quiz_of, 'quiz_at', r.quiz_at,
        'frq_points', r.frq_points, 'frq_of', r.frq_of) order by m.display_name)
        from public.classroom_results r join public.classroom_members m on m.id = r.member_id where r.session_id = s.id), '[]'),
    'stats', public.classroom_session_stats(s.id));
end $$;

create or replace function public.teacher_session_digests(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._teacher_guard('t_digest', 30, 60); s public.classroom_sessions := public._own_session(v, p_id);
begin
  return jsonb_build_object('days', s.days, 'difficulty', s.difficulty, 'focus', s.focus, 'power_plays', s.power_plays, 'quiz', s.quiz,
    'rows', coalesce((select jsonb_agg(jsonb_build_object('member_id', r.member_id, 'display_name', m.display_name, 'score', r.score,
        'cons_letter', r.cons_letter, 'lib_letter', r.lib_letter, 'needle', r.needle, 'completion_status', r.completion_status,
        'econ_growth', r.econ_growth, 'unemployment', r.unemployment, 'inflation', r.inflation, 'deficit', r.deficit,
        'approval', r.approval, 'unrest', r.unrest, 'scandal', r.scandal, 'digest', r.digest,
        'quiz', r.quiz, 'quiz_score', r.quiz_score, 'quiz_of', r.quiz_of, 'frq_points', r.frq_points, 'frq_of', r.frq_of) order by m.display_name)
        from public.classroom_results r join public.classroom_members m on m.id = r.member_id where r.session_id = s.id), '[]'));
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
        'scandal', r.scandal, 'needle', r.needle, 'digest', r.digest, 'quiz', r.quiz, 'quiz_score', r.quiz_score, 'quiz_of', r.quiz_of,
        'frq_points', r.frq_points, 'frq_of', r.frq_of)
      into res from public.classroom_results r where r.session_id = s.id and r.member_id = m.id;
    done := res is not null;
    select count(*) into cnt from public.classroom_results where session_id = s.id;
    -- class results are shown only after the teacher reveals them, only to students who finished, and only with >= 3 results (anonymity)
    if s.reveal_results and done and cnt >= 3 then stats := public.classroom_session_stats(s.id); end if;
  end if;
  return jsonb_build_object('nickname', m.display_name, 'classroom', jsonb_build_object('name', c.name), 'server_now', now(),
    'session', case when s.id is null then null else jsonb_build_object('id', s.id, 'title', s.title, 'instructions', s.instructions,
        'status', s.status, 'reveal_results', s.reveal_results, 'days', s.days, 'difficulty', s.difficulty, 'focus', s.focus, 'power_plays', s.power_plays,
        'quiz', s.quiz, 'starts_at', s.starts_at, 'started', started,
        'seed', case when s.status = 'active' and started then s.seed end) end,
    'completed', done, 'my_result', res, 'class_results', stats);
end $$;

-- One quiz per result, and only while the teacher has the quiz on for that session.
create or replace function public.student_record_quiz(p_token_hash text, p_session uuid, p_quiz jsonb, p_score int, p_of int) returns void
language plpgsql security definer set search_path = public as $$
declare m public.classroom_members; s public.classroom_sessions;
begin
  select * into m from public.classroom_members where token_hash = p_token_hash and status = 'active';
  if not found then raise exception 'invalid_token'; end if;
  select * into s from public.classroom_sessions where id = p_session and classroom_id = m.classroom_id;
  if not found then raise exception 'not_found'; end if;
  if not s.quiz then raise exception 'quiz_off'; end if;
  if p_score is null or p_of is null or p_of < 1 or p_of > 10 or p_score < 0 or p_score > p_of then raise exception 'invalid_quiz'; end if;
  update public.classroom_results set quiz = p_quiz, quiz_score = p_score, quiz_of = p_of, quiz_at = now()
   where session_id = s.id and member_id = m.id and quiz is null;
  if not found then
    if exists (select 1 from public.classroom_results where session_id = s.id and member_id = m.id) then raise exception 'quiz_already_submitted'; end if;
    raise exception 'not_found';
  end if;
  perform public._log_event('classroom_quiz_submitted', null, s.classroom_id, s.id);
end $$;

-- ---------------------------------------------------------------- privileges
do $$ begin
  revoke all on function public.student_context(text) from public, anon, authenticated;
  grant execute on function public.student_context(text) to service_role;
  revoke all on function public.student_record_quiz(text, uuid, jsonb, int, int) from public, anon, authenticated;
  grant execute on function public.student_record_quiz(text, uuid, jsonb, int, int) to service_role;
end $$;
revoke all on function public.teacher_update_session(uuid, jsonb) from public, anon;
revoke all on function public.teacher_grade_frq(uuid, uuid, int, int) from public, anon;
grant execute on function public.teacher_start_session(uuid, text, text, int, int, text, boolean) to authenticated;
grant execute on function public.teacher_update_session(uuid, jsonb) to authenticated;
grant execute on function public.teacher_grade_frq(uuid, uuid, int, int) to authenticated;
grant execute on function public.teacher_get_session(uuid) to authenticated;
grant execute on function public.teacher_session_digests(uuid) to authenticated;
