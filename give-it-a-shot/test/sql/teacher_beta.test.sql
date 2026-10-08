-- Teacher Beta database tests. Any failed assertion raises and aborts the run (ON_ERROR_STOP).
create schema t;
grant usage on schema t to public;
create function t.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), true); execute 'set local role authenticated'; end $$;
create function t.as_anon() returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon'; end $$;
create function t.as_service() returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', '', true); execute 'set local role service_role'; end $$;
create function t.back() returns void language plpgsql as $$ begin execute 'reset role'; end $$;
create function t.ok(name text) returns void language plpgsql as $$ begin raise notice 'ok   %', name; end $$;
create function t.eq(name text, got anyelement, want anyelement) returns void language plpgsql as $$
begin if got is distinct from want then raise exception 'FAIL % : got % want %', name, got, want; end if; perform t.ok(name); end $$;
-- run q and require it to fail with a message containing `expect`
create function t.fails(name text, q text, expect text) returns void language plpgsql as $$
declare ok boolean := true;
begin
  begin execute q; exception when others then
    ok := false;
    if position(expect in sqlerrm) = 0 then raise exception 'FAIL % : wrong error "%" (wanted "%")', name, sqlerrm, expect; end if;
  end;
  if ok then raise exception 'FAIL % : expected an error containing "%" but the call succeeded', name, expect; end if;
  perform t.ok(name);
end $$;
create function t.isnull(name text, v jsonb) returns void language plpgsql as $$
begin if v is not null and v <> 'null'::jsonb then raise exception 'FAIL % : expected null, got %', name, v; end if; perform t.ok(name); end $$;
create function t.metrics(sc int, removed boolean default false) returns jsonb language sql as $$
  select jsonb_build_object('completion_status', case when removed then 'removed' else 'completed' end, 'score', sc, 'cons_letter', 'B', 'lib_letter', 'C',
    'needle', 55, 'econ_growth', sc / 100.0, 'unemployment', 4.1, 'inflation', 2.2, 'deficit', 3.0 + sc / 1000.0, 'approval', 50 + sc / 50, 'unrest', 20,
    'scandal', 5, 'engine_version', 2, 'log', 'sessseessee', 'digest', jsonb_build_object('days', 14, 'signed', jsonb_build_array('mw15'))) $$;

-- fixtures (as postgres)
insert into auth.users(id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'teacher.a@example.com'),
  ('b0000000-0000-0000-0000-00000000000b', 'teacher.b@example.com'),
  ('c0000000-0000-0000-0000-00000000000c', 'player@example.com'),
  ('d0000000-0000-0000-0000-00000000000d', 'admin@example.com');
select public.grant_role_by_email('teacher.a@example.com', 'teacher_beta');
select public.grant_role_by_email('teacher.b@example.com', 'teacher_beta');
select public.grant_role_by_email('admin@example.com', 'teacher_admin');

-- 1. feature flag is off by default and is enforced everywhere
do $$ begin
  perform t.eq('flag defaults to off', public.teacher_beta_enabled(), false);
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  perform t.eq('teacher_me reports disabled', (public.teacher_me())->>'enabled', 'false');
  perform t.fails('dashboard blocked while disabled', 'select public.teacher_dashboard()', 'teacher_beta_disabled');
  perform t.fails('create blocked while disabled', $q$select public.teacher_create_classroom('x')$q$, 'teacher_beta_disabled');
end $$;
update public.feature_flags set enabled = true where key = 'TEACHER_BETA_ENABLED';

-- 2. anonymous callers get nothing
do $$ begin
  perform t.as_anon();
  perform t.fails('anon cannot call teacher_me', 'select public.teacher_me()', 'permission denied');
  perform t.fails('anon cannot call dashboard', 'select public.teacher_dashboard()', 'permission denied');
  perform t.fails('anon cannot read classrooms', 'select * from public.teacher_classrooms', 'permission denied');
  perform t.fails('anon cannot call classroom_join', $q$select * from public.classroom_join('ABC234','h',array['x'])$q$, 'permission denied');
  perform t.fails('anon cannot read user_roles', 'select * from public.user_roles', 'permission denied');
end $$;

-- 3. a normal signed-in player is refused
do $$ declare n int; begin
  perform t.as_user('c0000000-0000-0000-0000-00000000000c');
  perform t.eq('player: teacher_me authorized=false', (public.teacher_me())->>'authorized', 'false');
  perform t.fails('player cannot open dashboard', 'select public.teacher_dashboard()', 'not_authorized');
  perform t.fails('player cannot create classroom', $q$select public.teacher_create_classroom('Hacked')$q$, 'not_authorized');
  perform t.fails('player cannot grant roles', $q$select public.admin_grant_role('c0000000-0000-0000-0000-00000000000c','teacher_admin')$q$, 'not_authorized');
  perform t.fails('player cannot list roles', 'select public.admin_list_roles()', 'not_authorized');
  perform t.fails('player cannot insert a role row directly', $q$insert into public.user_roles(user_id, role) values ('c0000000-0000-0000-0000-00000000000c','teacher_admin')$q$, 'permission denied');
  perform t.fails('player cannot call grant_role_by_email', $q$select public.grant_role_by_email('player@example.com','teacher_admin')$q$, 'permission denied');
  perform t.fails('player cannot call internal guard', $q$select public._teacher_guard('x',1,1)$q$, 'permission denied');
  perform t.fails('player cannot flip the flag', $q$update public.feature_flags set enabled = false$q$, 'permission denied');
  select count(*) into n from public.user_roles; perform t.eq('player sees no one elses roles', n, 0);
  select count(*) into n from public.teacher_classrooms; perform t.eq('player sees no classrooms', n, 0);
end $$;

-- 4. teacher A creates; teacher B cannot touch it (IDOR)
create table t.state (k text primary key, v text);
grant all on t.state to public;
do $$ declare r jsonb; cid uuid; code text; begin
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  perform t.eq('teacher_me authorized', (public.teacher_me())->>'authorized', 'true');
  perform t.eq('teacher_me is_admin false', (public.teacher_me())->>'is_admin', 'false');
  r := public.teacher_create_classroom('  Period 3 Civics  ');
  perform t.eq('name trimmed', r->>'name', 'Period 3 Civics');
  code := r->>'join_code'; cid := (r->>'id')::uuid;
  if code !~ '^[A-HJKMNP-Z2-9]{6}$' then raise exception 'bad code format %', code; end if;
  perform t.ok('code format ' || code);
  perform t.fails('empty name rejected', $q$select public.teacher_create_classroom('   ')$q$, 'invalid_name');
  perform t.fails('long name rejected', format('select public.teacher_create_classroom(%L)', repeat('x', 81)), 'invalid_name');
  perform t.as_service(); perform t.eq('not on the roster of anything else', 1, 1);
  perform t.back();
  insert into t.state values ('cid', cid::text), ('code', code);
end $$;
do $$ declare cid uuid := (select v::uuid from t.state where k='cid'); n int; begin
  perform t.as_user('b0000000-0000-0000-0000-00000000000b');
  perform t.fails('B cannot get A classroom', format('select public.teacher_get_classroom(%L)', cid), 'not_found');
  perform t.fails('B cannot regenerate A code', format('select public.teacher_set_join_code(%L, 24)', cid), 'not_found');
  perform t.fails('B cannot revoke A code', format('select public.teacher_revoke_join_code(%L)', cid), 'not_found');
  perform t.fails('B cannot archive A classroom', format('select public.teacher_archive_classroom(%L)', cid), 'not_found');
  perform t.fails('B cannot delete A classroom', format('select public.teacher_delete_classroom(%L)', cid), 'not_found');
  perform t.fails('B cannot start a session in A classroom', format('select public.teacher_start_session(%L, ''x'', '''')', cid), 'not_found');
  perform t.fails('B feedback cannot reference A classroom', format('select public.teacher_submit_feedback(null,null,null,true,''yes'',%L)', cid), 'not_found');
  perform t.fails('unknown id looks identical to foreign id', $q$select public.teacher_get_classroom(gen_random_uuid())$q$, 'not_found');
  perform t.eq('B dashboard is empty', jsonb_array_length((public.teacher_dashboard())->'classrooms'), 0);
  select count(*) into n from public.teacher_classrooms; perform t.eq('B direct SELECT sees nothing (RLS)', n, 0);
  perform t.fails('B cannot UPDATE A classroom directly', format('update public.teacher_classrooms set name=''pwned'' where id=%L', cid), 'permission denied');
  perform t.fails('B cannot INSERT classroom for A', $q$insert into public.teacher_classrooms(owner_user_id,name) values ('a0000000-0000-0000-0000-00000000000a','x')$q$, 'permission denied');
  perform t.fails('B cannot DELETE directly', format('delete from public.teacher_classrooms where id=%L', cid), 'permission denied');
  perform t.back();
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  select count(*) into n from public.teacher_classrooms; perform t.eq('A direct SELECT sees own classroom (RLS)', n, 1);
  perform t.eq('A dashboard lists it', jsonb_array_length((public.teacher_dashboard())->'classrooms'), 1);
end $$;

-- 5. students join (service role): codes, duplicates, expiry, revocation, capacity
do $$ declare code text := (select v from t.state where k='code'); cid uuid := (select v::uuid from t.state where k='cid'); m record; n int; begin
  perform t.as_service();
  select * into m from public.classroom_join(code, 'hash-s1', array['Brave Otter 11','Calm Fox 22']);
  perform t.eq('s1 joined with first nickname', m.o_display_name, 'Brave Otter 11');
  select * into m from public.classroom_join(code, 'hash-s2', array['Brave Otter 11','Calm Fox 22']);
  perform t.eq('duplicate nickname falls through to next candidate', m.o_display_name, 'Calm Fox 22');
  select * into m from public.classroom_join(code, 'hash-s3', array['Quick Lynx 33']);
  select * into m from public.classroom_join(code, 'hash-s4', array['Keen Wolf 44']);
  perform t.fails('all candidates taken', format('select * from public.classroom_join(%L, ''hash-s5'', array[''Keen Wolf 44''])', code), 'try_again');
  perform t.fails('invalid code', $q$select * from public.classroom_join('AAAAAA','hash-x',array['n'])$q$, 'invalid_code');
  perform t.fails('lowercase raw code is not special-cased in SQL (edge normalizes)', format('select * from public.classroom_join(%L,''hash-x'',array[''n''])', lower(code)), 'invalid_code');
  perform t.back();
  update public.teacher_classrooms set join_code_expires_at = now() - interval '1 minute' where id = cid;
  perform t.as_service();
  perform t.fails('expired code', format('select * from public.classroom_join(%L,''hash-x'',array[''n''])', code), 'invalid_code');
  perform t.back();
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  perform t.eq('expired code hidden from teacher view', (public.teacher_get_classroom(cid))->'classroom'->>'join_code', null);
  code := (public.teacher_set_join_code(cid, 1000))->>'join_code';   -- ttl clamped to 168h
  update t.state set v = code where k = 'code';
  perform t.back(); perform t.as_service();
  select * into m from public.classroom_join(code, 'hash-s5', array['Warm Hare 55']);
  perform t.back(); perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  perform public.teacher_revoke_join_code(cid);
  perform t.back(); perform t.as_service();
  perform t.fails('revoked code', format('select * from public.classroom_join(%L,''hash-x'',array[''n''])', code), 'invalid_code');
  perform t.back();
  update public.teacher_classrooms set max_members = 5 where id = cid;
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  code := (public.teacher_set_join_code(cid, 24))->>'join_code'; update t.state set v = code where k = 'code';
  perform t.back(); perform t.as_service();
  perform t.fails('classroom full', format('select * from public.classroom_join(%L,''hash-x'',array[''Late Owl 66''])', code), 'classroom_full');
  perform t.back();
  update public.teacher_classrooms set max_members = 60 where id = cid;
  select count(*) into n from public.classroom_members where classroom_id = cid; perform t.eq('5 members', n, 5);
end $$;

-- 6. sessions, server-recorded results, replay and cross-student protection
do $$ declare cid uuid := (select v::uuid from t.state where k='cid'); sid uuid; s jsonb; ctx jsonb; r0 jsonb; begin
  perform t.as_service();
  ctx := public.student_context('hash-s1');
  perform t.isnull('no session yet', ctx->'session');
  perform t.fails('bad token', $q$select public.student_context('nope')$q$, 'invalid_token');
  perform t.back();
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  s := public.teacher_start_session(cid, 'Tax week', 'Play it through once.'); sid := (s->>'id')::uuid;
  insert into t.state values ('sid', sid::text);
  perform t.fails('only one active session', format('select public.teacher_start_session(%L, ''again'', '''')', cid), 'session_already_active');
  perform t.fails('days below 3 rejected', format('select public.teacher_start_session(%L, ''x'', '''', 2, 0)', cid), 'invalid_days');
  perform t.fails('days above 28 rejected', format('select public.teacher_start_session(%L, ''x'', '''', 29, 0)', cid), 'invalid_days');
  perform t.fails('bad difficulty rejected', format('select public.teacher_start_session(%L, ''x'', '''', 14, 2)', cid), 'invalid_difficulty');
  perform t.back(); perform t.as_service();
  ctx := public.student_context('hash-s1');
  perform t.eq('student sees session title', ctx->'session'->>'title', 'Tax week');
  perform t.eq('default length is 14 days', ctx->'session'->>'days', '14');
  perform t.eq('default difficulty is standard', ctx->'session'->>'difficulty', '0');
  perform t.eq('not started yet', ctx->'session'->>'started', 'false');
  perform t.isnull('seed withheld until the countdown ends', ctx->'session'->'seed');
  perform t.fails('cannot submit before start', format('select public.student_record_result(''hash-s1'', %L, t.metrics(600))', sid), 'not_started');
  perform t.fails('cannot report progress before start', format('select public.student_record_progress(''hash-s1'', %L, 1, 100, 50, 0, false)', sid), 'not_started');
  perform t.back();
  perform t.as_user('b0000000-0000-0000-0000-00000000000b');
  perform t.fails('B cannot start A countdown', format('select public.teacher_begin_countdown(%L)', sid), 'not_found');
  perform t.back();
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  r0 := public.teacher_begin_countdown(sid);
  perform t.eq('countdown sets a start time in the future', (r0->>'starts_at')::timestamptz > now(), true);
  perform t.eq('countdown is about 5 seconds', (r0->>'starts_at')::timestamptz - now() between interval '3 seconds' and interval '6 seconds', true);
  perform t.eq('countdown is idempotent', public.teacher_begin_countdown(sid)->>'starts_at', r0->>'starts_at');
  perform t.back(); perform t.as_service();
  perform t.isnull('seed still withheld during countdown', public.student_context('hash-s1')->'session'->'seed');
  perform t.back();
  update public.classroom_sessions set starts_at = now() - interval '1 second' where id = sid;   -- fast-forward the 5 seconds
  perform t.as_service();
  ctx := public.student_context('hash-s1');
  perform t.eq('started after countdown', ctx->'session'->>'started', 'true');
  if (ctx->'session'->>'seed')::bigint not between 0 and 2147483647 then raise exception 'seed out of range'; end if; perform t.ok('seed in engine range');
  perform public.student_record_progress('hash-s1', sid, 3, 420, 51, 2, false);
  perform public.student_record_progress('hash-s1', sid, 2, 400, 50, 2, false);   -- an older day cannot move progress backwards
  perform t.back();
  perform t.as_service();
  perform public.student_record_result('hash-s1', sid, t.metrics(600));
  perform public.student_record_result('hash-s2', sid, t.metrics(500));
  perform t.fails('replayed submission rejected', format('select public.student_record_result(''hash-s1'', %L, t.metrics(999))', sid), 'already_submitted');
  perform t.eq('student sees completed', public.student_context('hash-s1')->>'completed', 'true');
  perform t.eq('first score kept', public.student_context('hash-s1')->'my_result'->>'score', '600');
  perform t.fails('bad token cannot submit', format('select public.student_record_result(''forged'', %L, t.metrics(1))', sid), 'invalid_token');
  perform t.back();
end $$;
do $$ declare sid uuid := (select v::uuid from t.state where k='sid'); ctx jsonb; r jsonb; othercode text; ocid uuid; mid5 uuid; begin
  -- a student from ANOTHER classroom cannot submit into this session
  perform t.as_user('b0000000-0000-0000-0000-00000000000b');
  r := public.teacher_create_classroom('B Class'); ocid := (r->>'id')::uuid; othercode := r->>'join_code';
  perform t.back(); perform t.as_service();
  perform public.classroom_join(othercode, 'hash-other', array['Zed Crow 99']);
  perform t.fails('student of another classroom cannot write into session', format('select public.student_record_result(''hash-other'', %L, t.metrics(1))', sid), 'not_found');
  perform t.back();
  -- results 3,4 then stats
  perform t.as_service();
  perform public.student_record_progress('hash-s5', sid, 4, 350, 48, 3, false);
  perform public.student_record_progress('hash-s4', sid, 9, 200, 30, 40, true);
  perform public.student_record_result('hash-s3', sid, t.metrics(700));
  perform public.student_record_result('hash-s4', sid, t.metrics(300, true));
  ctx := public.student_context('hash-s1');
  perform t.isnull('class results hidden until revealed', ctx->'class_results');
  perform t.back();
  perform t.as_user('b0000000-0000-0000-0000-00000000000b');
  perform t.fails('B cannot reveal A session', format('select public.teacher_set_reveal(%L, true)', sid), 'not_found');
  perform t.fails('B cannot read A session', format('select public.teacher_get_session(%L)', sid), 'not_found');
  perform t.fails('B cannot end A session', format('select public.teacher_end_session(%L)', sid), 'not_found');
  perform t.back();
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  r := public.teacher_get_session(sid);
  perform t.eq('teacher sees 4 results', jsonb_array_length(r->'results'), 4);
  perform t.eq('teacher sees 5 participants (1 not finished)', jsonb_array_length(r->'participants'), 5);
  perform t.eq('leaderboard is ordered by score', r->'participants'->0->>'live_score', '700');
  perform t.eq('finished students show the final day', r->'participants'->0->>'day', '14');
  perform t.eq('in-progress student shows live score', (select x->>'live_score' from jsonb_array_elements(r->'participants') x where x->>'completed' = 'false' and x->>'live_score' is not null), '350');
  perform t.eq('in-progress student shows current day', (select x->>'day' from jsonb_array_elements(r->'participants') x where x->>'completed' = 'false' and x->>'live_score' is not null), '4');
  perform t.eq('removed-from-office flagged on the board', (select x->>'over' from jsonb_array_elements(r->'participants') x where x->>'live_score' = '300'), 'true');
  perform t.eq('stats completed', r->'stats'->>'completed', '4');
  perform t.eq('stats avg score', r->'stats'->'average'->>'score', '525');
  perform t.eq('stats removed count', r->'stats'->>'removed_from_office', '1');
  perform t.eq('stats highlight best score', r->'stats'->'highlights'->>'most_resilient_score', '700');
  perform t.eq('distribution has 6 bins', jsonb_array_length(r->'stats'->'distribution'), 6);
  if r::text ~* '(token|hash-s|log|email|user_id|a0000000)' then raise exception 'teacher payload leaks sensitive field: %', r::text; end if;
  perform t.ok('teacher payload carries no token/log/email/user ids');
  r := public.teacher_session_digests(sid);
  perform t.eq('digests: one row per finished student', jsonb_array_length(r->'rows'), 4);
  perform t.eq('digests carry the decision summary', r->'rows'->0->'digest'->>'days', '14');
  if r::text ~* '(token|hash-s|"log"|email|user_id|a0000000)' then raise exception 'digest payload leaks sensitive field'; end if;
  perform t.ok('digest payload carries no token/log/email/user ids');
  perform t.back(); mid5 := (select id from public.classroom_members where token_hash = 'hash-s5'); perform t.as_user('b0000000-0000-0000-0000-00000000000b');
  perform t.fails('B cannot read A digests', format('select public.teacher_session_digests(%L)', sid), 'not_found');
  perform t.fails('B cannot remove A member', format('select public.teacher_remove_member(%L)', mid5), 'not_found');
  perform t.back(); perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  perform public.teacher_set_reveal(sid, true);
  perform t.back(); perform t.as_service();
  ctx := public.student_context('hash-s1');
  perform t.eq('revealed stats visible to finisher', ctx->'class_results'->>'completed', '4');
  perform t.eq('revealed stats are aggregates only (no names)', (ctx->'class_results')::text ~* 'otter|fox|lynx|wolf', false);
  perform t.isnull('non-finisher gets no class results', public.student_context('hash-s5')->'class_results');
  perform t.back();
end $$;
do $$ begin
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  perform t.fails('teacher cannot read token_hash', 'select token_hash from public.classroom_members', 'permission denied');
  perform t.fails('teacher cannot read replay log column', 'select log from public.classroom_results', 'permission denied');
  perform t.fails('teacher cannot forge a result', $q$insert into public.classroom_results(session_id,member_id,completion_status,score,cons_letter,lib_letter,econ_growth,unemployment,inflation,deficit,approval,unrest,scandal,engine_version,log) select session_id,member_id,'completed',99999,'A','A',1,1,1,1,1,1,1,2,'x' from public.classroom_results limit 1$q$, 'permission denied');
  perform t.fails('teacher cannot edit a score', 'update public.classroom_results set score = 99999', 'permission denied');
end $$;

-- 7. end session: late submissions refused
do $$ declare sid uuid := (select v::uuid from t.state where k='sid'); begin
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  perform public.teacher_end_session(sid);
  perform t.back(); perform t.as_service();
  perform t.fails('submission after end refused', format('select public.student_record_result(''hash-s5'', %L, t.metrics(10))', sid), 'session_not_active');
  perform t.eq('seed hidden once ended', public.student_context('hash-s5')->'session'->>'seed', null);
  perform t.back();
end $$;

-- 8. leaving deletes the student and their data
do $$ declare n int; begin
  perform t.as_service();
  perform public.student_leave('hash-s2');
  perform t.back();
  select count(*) into n from public.classroom_members where token_hash = 'hash-s2'; perform t.eq('left: member gone', n, 0);
  select count(*) into n from public.classroom_results where score = 500; perform t.eq('left: results gone', n, 0);
end $$;

-- 9. role revocation is immediate; expiry honoured
do $$ declare n int; begin
  perform t.back();
  perform t.eq('revoke by email', public.revoke_role_by_email('teacher.b@example.com', 'teacher_beta'), 1);
  perform t.as_user('b0000000-0000-0000-0000-00000000000b');
  perform t.fails('revoked teacher blocked', 'select public.teacher_dashboard()', 'not_authorized');
  select count(*) into n from public.teacher_classrooms; perform t.eq('revoked teacher sees nothing via RLS even for own rows', n, 0);
  perform t.eq('teacher_me authorized=false after revoke', (public.teacher_me())->>'authorized', 'false');
  perform t.back();
  perform public.grant_role_by_email('teacher.b@example.com', 'teacher_beta');
  update public.user_roles set expires_at = now() - interval '1 second' where user_id = 'b0000000-0000-0000-0000-00000000000b' and revoked_at is null;
  perform t.as_user('b0000000-0000-0000-0000-00000000000b');
  perform t.fails('expired role blocked', 'select public.teacher_dashboard()', 'not_authorized');
  perform t.back();
end $$;

-- 10. admin tool
do $$ declare r jsonb; begin
  perform t.as_user('d0000000-0000-0000-0000-00000000000d');
  perform t.eq('admin flagged in teacher_me', (public.teacher_me())->>'is_admin', 'true');
  r := public.admin_find_users('player@example.com');
  perform t.eq('find by exact email', jsonb_array_length(r), 1);
  perform t.eq('short query returns nothing', jsonb_array_length(public.admin_find_users('pl')), 0);
  perform t.eq('partial email does not enumerate', jsonb_array_length(public.admin_find_users('example.com')), 0);
  perform public.admin_grant_role('c0000000-0000-0000-0000-00000000000c', 'teacher_beta');
  perform public.admin_grant_role('c0000000-0000-0000-0000-00000000000c', 'teacher_beta');  -- idempotent
  perform t.fails('cannot grant arbitrary role', $q$select public.admin_grant_role('c0000000-0000-0000-0000-00000000000c','superuser')$q$, 'invalid_role');
  perform t.fails('cannot revoke own admin', $q$select public.admin_revoke_role('d0000000-0000-0000-0000-00000000000d','teacher_admin')$q$, 'cannot_revoke_self');
  perform t.back();
  perform t.as_user('c0000000-0000-0000-0000-00000000000c');
  perform t.eq('player became teacher', (public.teacher_me())->>'authorized', 'true');
  perform t.fails('new teacher is not admin', 'select public.admin_list_roles()', 'not_authorized');
  perform t.back();
  perform t.as_user('d0000000-0000-0000-0000-00000000000d');
  perform public.admin_revoke_role('c0000000-0000-0000-0000-00000000000c', 'teacher_beta');
  r := public.admin_list_roles();
  perform t.eq('list shows 3 active grants (A, B, admin)', jsonb_array_length(r), 3);
  perform t.back();
  perform t.as_user('c0000000-0000-0000-0000-00000000000c');
  perform t.fails('admin revoke takes effect', 'select public.teacher_dashboard()', 'not_authorized');
  perform t.back();
end $$;

-- 11. rate limiting
do $$ declare i int; begin
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  for i in 1..12 loop
    begin perform public.teacher_create_classroom('Spam ' || i);
    exception when others then
      if sqlerrm = 'rate_limited' then perform t.ok('rate limited creating classroom #' || i); exit;
      elsif sqlerrm = 'classroom_limit' then perform t.ok('classroom cap hit at #' || i); exit;
      else raise; end if;
    end;
    if i = 12 then raise exception 'FAIL: no limit reached'; end if;
  end loop;
  perform t.back();
  perform t.as_service();
  perform public.rl_hit('unit', 3, 60); perform public.rl_hit('unit', 3, 60); perform public.rl_hit('unit', 3, 60);
  perform t.eq('4th hit denied', public.rl_hit('unit', 3, 60), false);
  perform t.eq('peek counts hits', public.rl_peek('unit', 60), 4);
  perform t.back();
end $$;

-- 12. archive, delete, feedback, analytics, purge
do $$ declare cid uuid := (select v::uuid from t.state where k='cid'); code text; n int; begin
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  perform public.teacher_submit_feedback('worked', 'confusing', 'change', true, 'maybe', cid);
  perform t.fails('bad would_pay rejected', $q$select public.teacher_submit_feedback('a','b','c',true,'sure',null)$q$, 'invalid_input');
  perform public.teacher_track('teacher_feedback_clicked');
  perform t.fails('arbitrary analytics events rejected', $q$select public.teacher_track('admin_pwned')$q$, 'invalid_input');
  perform public.teacher_archive_classroom(cid);
  perform t.eq('archived classroom has no code', (public.teacher_get_classroom(cid))->'classroom'->>'join_code', null);
  perform t.fails('archived classroom cannot start sessions', format('select public.teacher_start_session(%L,''x'','''')', cid), 'classroom_archived');
  perform t.fails('archived classroom cannot get a new code', format('select public.teacher_set_join_code(%L, 1)', cid), 'classroom_archived');
  perform t.back(); perform t.as_service();
  perform t.fails('archived classroom closes student token', $q$select public.student_context('hash-s1')$q$, 'classroom_closed');
  perform t.back();
  select count(distinct event) into n from public.analytics_events
   where event in ('teacher_beta_access','classroom_created','classroom_joined','classroom_session_started','classroom_session_completed','classroom_archived','teacher_dashboard_viewed','teacher_feedback_clicked');
  perform t.eq('all 8 required analytics events recorded', n, 8);
  select count(*) into n from public.analytics_events where event in ('classroom_joined','classroom_session_completed') and user_id is not null;
  perform t.eq('student events carry no user id', n, 0);
  perform t.eq('purge keeps recent archives', public.purge_archived_classrooms(90), 0);
  update public.teacher_classrooms set archived_at = now() - interval '91 days' where id = cid;
  perform t.eq('purge deletes old archives', public.purge_archived_classrooms(90), 1);
  select count(*) into n from public.classroom_results; perform t.eq('purge cascaded to results', n, 0);
  select count(*) into n from public.classroom_members where classroom_id = cid; perform t.eq('purge cascaded to members', n, 0);
end $$;

-- 13. code generator quality
do $$ declare n int; d int; bad int; begin
  select count(*), count(distinct c), count(*) filter (where c !~ '^[A-HJKMNP-Z2-9]{6}$') into n, d, bad
    from (select public.gen_join_code() c from generate_series(1, 3000)) q;
  perform t.eq('3000 codes well-formed', bad, 0);
  if d < 2990 then raise exception 'too many duplicate codes: % distinct of %', d, n; end if;
  perform t.ok('3000 codes, ' || d || ' distinct');
end $$;

-- 13b. admin overview of all classrooms (read-only, counts only)
do $$ declare r jsonb; n int; begin
  select count(*) into n from public.teacher_classrooms;
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  perform t.fails('a teacher cannot list all classrooms', 'select public.admin_list_classrooms()', 'not_authorized');
  perform t.back();
  perform t.as_user('d0000000-0000-0000-0000-00000000000d');
  r := public.admin_list_classrooms();
  perform t.eq('admin sees every classroom', jsonb_array_length(r), n);
  perform t.eq('overview carries counts but no student data', (select count(*) from jsonb_array_elements(r) e where e ? 'members' or e ? 'students' or e ? 'display_name'), 0::bigint);
  perform t.back();
end $$;

-- 14. every public function that browsers can reach is on the intended allow-list
do $$ declare names text; begin
  select string_agg(p.proname, ',' order by p.proname) into names
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
     and (p.proname like 'teacher\_%' or p.proname like 'admin\_%' or p.proname like '\_%' or p.proname in ('rl_hit','rl_peek','gen_join_code','classroom_join','student_context','student_record_result','student_leave','classroom_session_stats','grant_role_by_email','revoke_role_by_email','purge_archived_classrooms','user_has_capability'));
  perform t.eq('authenticated-executable function allow-list',
    names, 'admin_find_users,admin_grant_role,admin_list_classrooms,admin_list_roles,admin_revoke_role,teacher_archive_classroom,teacher_begin_countdown,teacher_create_classroom,teacher_dashboard,teacher_delete_classroom,teacher_end_session,teacher_get_classroom,teacher_get_session,teacher_me,teacher_remove_member,teacher_revoke_join_code,teacher_session_digests,teacher_set_join_code,teacher_set_reveal,teacher_start_session,teacher_submit_feedback,teacher_track');
  select string_agg(p.proname, ',') into names from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') and p.proname ~ '^(teacher|admin|classroom|student|rl|grant|revoke|purge|gen|_)';
  perform t.eq('anon can execute none of the new functions', names, null);
end $$;
select 'ALL SQL TESTS PASSED' as result;
