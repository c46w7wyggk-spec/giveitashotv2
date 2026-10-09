-- Beta test fixes 10/09.
-- 1. A student who leaves a classroom after finishing no longer deletes their result: the teacher keeps it. Joining again with the
--    same name reattaches them to it (so a student who left by mistake gets their result back and cannot replay the session).
-- 2. Owner dashboard "Users" tab: every account with its game stats, and a switch for Supreme Leader beta access.
-- No DROP statements (the Supabase SQL runner hangs on them); every function keeps its existing signature.

-- ---------------------------------------------------------------- Supreme Leader beta list
-- The table and is_beta() were created by hand in production before migrations existed. Create them only where missing (fresh databases).
create table if not exists public.beta_testers (
  email text primary key,          -- an exact address, or '@domain.org' for a whole domain
  note text,
  created_at timestamptz not null default now()
);
alter table public.beta_testers enable row level security;
-- Nobody reads or writes the list from the browser; is_beta() and the admin functions below are security definer.
revoke all on public.beta_testers from anon, authenticated;
do $$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'is_beta') then
    execute $f$
      create function public.is_beta() returns boolean language sql stable security definer set search_path = public as $b$
        select exists (
          select 1 from public.beta_testers b
          where lower(auth.jwt() ->> 'email') = lower(b.email)
             or (b.email like '@%' and lower(auth.jwt() ->> 'email') like '%' || lower(b.email))
        ) $b$;
      grant execute on function public.is_beta() to anon, authenticated;
    $f$;
  end if;
end $$;

-- ---------------------------------------------------------------- students: leaving keeps finished results
create or replace function public.student_leave(p_token_hash text) returns void
language plpgsql security definer set search_path = public as $$
declare m public.classroom_members;
begin
  select * into m from public.classroom_members where token_hash = p_token_hash and status = 'active';
  if not found then return; end if;
  if exists (select 1 from public.classroom_results r where r.member_id = m.id) then
    -- Keep the row (and so the result) for the teacher. The token stops working; the name stays reserved for a rejoin.
    update public.classroom_members set status = 'left', token_hash = 'left:' || m.id::text, last_active_at = now() where id = m.id;
    delete from public.classroom_progress where member_id = m.id;
  else
    -- data minimization: someone who never finished leaves no trace
    delete from public.classroom_members where id = m.id;
  end if;
end $$;

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
  -- Someone who left after finishing and comes back under the same name gets their old seat (and result) back.
  update public.classroom_members m set token_hash = p_token_hash, status = 'active', last_active_at = now()
   where m.classroom_id = c.id and m.status = 'left' and m.display_name = p_names[1]
  returning m.id, m.display_name into mid, n;
  if mid is not null then
    perform public._log_event('classroom_rejoined', null, c.id, null);
    return query select mid, n, c.name;
    return;
  end if;
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

-- ---------------------------------------------------------------- owner dashboard: every account
create or replace function public.admin_list_users() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_read', 60, 60);
begin
  return coalesce((select jsonb_agg(x.row order by x.last_seen desc nulls last) from (
    select greatest(u.last_sign_in_at, s.last_at, u.created_at) as last_seen, jsonb_build_object(
      'user_id', u.id, 'email', u.email, 'handle', p.handle, 'tag', p.tag,
      'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at, 'confirmed', u.email_confirmed_at is not null,
      'roles', coalesce((select jsonb_agg(ur.role order by ur.role) from public.user_roles ur where ur.user_id = u.id and ur.revoked_at is null and ur.role <> 'player'), '[]'::jsonb),
      'games', coalesce(s.games, 0), 'games_7d', coalesce(s.games_7d, 0), 'daily_games', coalesce(s.daily, 0),
      'best_score', s.best, 'avg_score', s.avg, 'last_game_at', s.last_at,
      'classrooms', (select count(*) from public.teacher_classrooms tc where tc.owner_user_id = u.id),
      'leader_beta', exists (select 1 from public.beta_testers b where lower(b.email) = lower(u.email)
                               or (b.email like '@%' and lower(u.email) like '%' || lower(b.email))),
      'leader_beta_domain', (select b.email from public.beta_testers b where b.email like '@%' and lower(u.email) like '%' || lower(b.email) limit 1)
    ) as row
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join lateral (select count(*) as games, count(*) filter (where sc.created_at > now() - interval '7 days') as games_7d,
        count(*) filter (where sc.mode = 'daily') as daily, max(sc.score) as best, round(avg(sc.score)) as avg, max(sc.created_at) as last_at
      from public.scores sc where sc.user_id = u.id) s on true
    limit 1000) x), '[]'::jsonb);
end $$;

-- Turn Supreme Leader beta access on or off for one account (by its exact email). Access given to a whole '@domain' entry
-- cannot be removed per person here; the result says so.
create or replace function public.admin_set_leader_beta(p_user uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_write', 60, 3600); e text; dom text;
begin
  select lower(email) into e from auth.users where id = p_user;
  if e is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_on then
    insert into public.beta_testers(email, note) values (e, 'granted from the owner dashboard') on conflict (email) do nothing;
  else
    delete from public.beta_testers where lower(email) = e;
  end if;
  select b.email into dom from public.beta_testers b where b.email like '@%' and e like '%' || lower(b.email) limit 1;
  perform public._log_event(case when p_on then 'leader_beta_granted' else 'leader_beta_revoked' end, v, null, null);
  return jsonb_build_object('leader_beta', p_on or dom is not null, 'domain', dom);
end $$;

-- ---------------------------------------------------------------- privileges
revoke all on function public.student_leave(text), public.classroom_join(text, text, text[]),
  public.admin_list_users(), public.admin_set_leader_beta(uuid, boolean) from public, anon, authenticated;
grant execute on function public.student_leave(text), public.classroom_join(text, text, text[]) to service_role;
grant execute on function public.admin_list_users(), public.admin_set_leader_beta(uuid, boolean) to authenticated, service_role;
