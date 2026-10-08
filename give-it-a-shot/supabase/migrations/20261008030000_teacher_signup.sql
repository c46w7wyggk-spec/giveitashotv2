-- Teacher sign-up (additive): teachers create an account with email + password on /teacher, confirm their email, and land on a
-- waitlist. The access request they fill in (name, school, note) is stored here so an admin can approve it in one click.
-- Approval is unchanged: it is still the teacher_beta role, granted by admin_grant_role / grant_role_by_email.
-- Safe to run on top of 20261008020000_teacher_beta_v3.sql.

create table if not exists public.teacher_applications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  school text not null check (char_length(school) between 1 and 120),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dismissed_at timestamptz,
  dismissed_by uuid references auth.users(id) on delete set null
);
alter table public.teacher_applications enable row level security;
revoke all on table public.teacher_applications from public, anon, authenticated;
-- no policies: clients reach this table only through the functions below

-- A signed-in user (approved or not) files or updates their own request. Dismissed requests reopen when the user re-applies.
create or replace function public.teacher_apply(p_name text, p_school text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := (select auth.uid()); n text := btrim(coalesce(p_name, '')); s text := btrim(coalesce(p_school, ''));
        t text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.teacher_beta_enabled() then raise exception 'teacher_beta_disabled' using errcode = '55000'; end if;
  if not public.rl_hit('t_apply:' || v::text, 10, 3600) then raise exception 'rate_limited' using errcode = '54000'; end if;
  if char_length(n) not between 1 and 80 or char_length(s) not between 1 and 120 or char_length(coalesce(t, '')) > 500 then
    raise exception 'invalid_input' using errcode = 'P0001'; end if;
  insert into public.teacher_applications as a (user_id, name, school, note) values (v, n, s, t)
  on conflict (user_id) do update set name = excluded.name, school = excluded.school, note = excluded.note,
    updated_at = now(), dismissed_at = null, dismissed_by = null;
  perform public._log_event('teacher_applied', v, null, null);
end $$;

-- Same as before, plus 'applied' so the waitlist page knows whether to ask for name and school.
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
  return jsonb_build_object('enabled', true, 'authorized', ok, 'is_admin', adm and ok, 'handle', h,
    'applied', exists (select 1 from public.teacher_applications where user_id = v));
end $$;

-- Requests still waiting: not dismissed, and the user does not yet have teacher access.
create or replace function public.admin_list_applications() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_read', 60, 60);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', u.email, 'name', a.name, 'school', a.school,
      'note', a.note, 'created_at', a.created_at, 'confirmed', u.email_confirmed_at is not null) order by a.created_at)
    from public.teacher_applications a join auth.users u on u.id = a.user_id
    where a.dismissed_at is null and not public.user_has_capability(a.user_id, 'teacher.classrooms')), '[]'::jsonb);
end $$;

create or replace function public.admin_dismiss_application(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_write', 30, 3600);
begin
  update public.teacher_applications set dismissed_at = now(), dismissed_by = v where user_id = p_user and dismissed_at is null;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

revoke all on function public.teacher_apply(text, text, text), public.teacher_me(), public.admin_list_applications(),
  public.admin_dismiss_application(uuid) from public, anon, authenticated;
grant execute on function public.teacher_apply(text, text, text), public.teacher_me(), public.admin_list_applications(),
  public.admin_dismiss_application(uuid) to authenticated, service_role;
