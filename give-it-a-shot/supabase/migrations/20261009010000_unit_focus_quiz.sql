-- Teacher Beta: AP unit focus for sessions and an end-of-game quiz built from each student's own game (additive).
-- focus: null (mixed) or an AP Macro unit key the engine knows (AP_UNITS in src/policies/base_tree.js); the desk prefers that unit's bills.
-- quiz: the student's answers and written response. The classroom edge function rebuilds the questions from the stored result
-- (src/quiz.js) and grades the multiple choice itself; the browser never sends a score.
-- Safe on top of 20261009000000_owner_dashboard.sql. Existing sessions keep focus = null and deal exactly as before.

alter table public.classroom_sessions
  add column if not exists focus text check (focus in ('u1', 'u3', 'u4', 'u5', 'u6'));

alter table public.classroom_results
  add column if not exists quiz jsonb,                 -- { v, ids, answers, right, frq_id, frq }
  add column if not exists quiz_score smallint,
  add column if not exists quiz_of smallint,
  add column if not exists quiz_at timestamptz;

-- ---------------------------------------------------------------- teacher RPCs
drop function if exists public.teacher_start_session(uuid, text, text, int, int);
create or replace function public.teacher_start_session(p_classroom uuid, p_title text default null, p_instructions text default null,
                                                        p_days int default 14, p_difficulty int default 0, p_focus text default null) returns jsonb
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
  insert into public.classroom_sessions(classroom_id, title, instructions, seed, days, difficulty, focus, scenario_id, starts_at)
  values (c.id, t, ins, (get_byte(gen_random_bytes(1),0) & 127) * 16777216 + get_byte(gen_random_bytes(1),0) * 65536 + get_byte(gen_random_bytes(1),0) * 256 + get_byte(gen_random_bytes(1),0),
          p_days, p_difficulty, f, 'president-' || p_days || 'day', null)
  returning * into s;
  perform public._log_event('classroom_session_started', v, c.id, s.id, jsonb_build_object('days', p_days, 'difficulty', p_difficulty, 'focus', f));
  return jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status, 'days', s.days, 'difficulty', s.difficulty, 'focus', s.focus);
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
       'starts_at', s.starts_at),
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
  return jsonb_build_object('days', s.days, 'difficulty', s.difficulty, 'focus', s.focus,
    'rows', coalesce((select jsonb_agg(jsonb_build_object('member_id', r.member_id, 'display_name', m.display_name, 'score', r.score,
        'cons_letter', r.cons_letter, 'lib_letter', r.lib_letter, 'needle', r.needle, 'completion_status', r.completion_status,
        'econ_growth', r.econ_growth, 'unemployment', r.unemployment, 'inflation', r.inflation, 'deficit', r.deficit,
        'approval', r.approval, 'unrest', r.unrest, 'scandal', r.scandal, 'digest', r.digest,
        'quiz', r.quiz, 'quiz_score', r.quiz_score, 'quiz_of', r.quiz_of) order by m.display_name)
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
        'scandal', r.scandal, 'needle', r.needle, 'digest', r.digest, 'quiz', r.quiz, 'quiz_score', r.quiz_score, 'quiz_of', r.quiz_of)
      into res from public.classroom_results r where r.session_id = s.id and r.member_id = m.id;
    done := res is not null;
    select count(*) into cnt from public.classroom_results where session_id = s.id;
    -- class results are shown only after the teacher reveals them, only to students who finished, and only with >= 3 results (anonymity)
    if s.reveal_results and done and cnt >= 3 then stats := public.classroom_session_stats(s.id); end if;
  end if;
  return jsonb_build_object('nickname', m.display_name, 'classroom', jsonb_build_object('name', c.name), 'server_now', now(),
    'session', case when s.id is null then null else jsonb_build_object('id', s.id, 'title', s.title, 'instructions', s.instructions,
        'status', s.status, 'reveal_results', s.reveal_results, 'days', s.days, 'difficulty', s.difficulty, 'focus', s.focus,
        'starts_at', s.starts_at, 'started', started,
        'seed', case when s.status = 'active' and started then s.seed end) end,
    'completed', done, 'my_result', res, 'class_results', stats);
end $$;

-- One quiz per result. The edge function has already graded it from the stored result; this only stores it.
-- Allowed after the session ends too, so students who finish late in the period can still answer.
create or replace function public.student_record_quiz(p_token_hash text, p_session uuid, p_quiz jsonb, p_score int, p_of int) returns void
language plpgsql security definer set search_path = public as $$
declare m public.classroom_members; s public.classroom_sessions;
begin
  select * into m from public.classroom_members where token_hash = p_token_hash and status = 'active';
  if not found then raise exception 'invalid_token'; end if;
  select * into s from public.classroom_sessions where id = p_session and classroom_id = m.classroom_id;
  if not found then raise exception 'not_found'; end if;
  if p_score is null or p_of is null or p_of < 1 or p_of > 10 or p_score < 0 or p_score > p_of then raise exception 'invalid_quiz'; end if;
  update public.classroom_results set quiz = p_quiz, quiz_score = p_score, quiz_of = p_of, quiz_at = now()
   where session_id = s.id and member_id = m.id and quiz is null;
  if not found then
    if exists (select 1 from public.classroom_results where session_id = s.id and member_id = m.id) then raise exception 'quiz_already_submitted'; end if;
    raise exception 'not_found';
  end if;
  perform public._log_event('classroom_quiz_submitted', null, s.classroom_id, s.id);
end $$;

-- ---------------------------------------------------------------- privileges for everything new or replaced
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('teacher_start_session','teacher_get_session','teacher_session_digests',
             'student_context','student_record_quiz')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
grant execute on function public.teacher_start_session(uuid, text, text, int, int, text) to authenticated;
grant execute on function public.teacher_get_session(uuid) to authenticated;
grant execute on function public.teacher_session_digests(uuid) to authenticated;
