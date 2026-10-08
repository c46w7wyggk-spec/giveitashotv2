-- Teacher Beta v3: read-only overview of every classroom for admins.
-- Teachers still only ever see their own classrooms. Admins (capability admin.roles) can list all classrooms with the owner,
-- student COUNT and whether a session is running. No student names, results or logs are exposed, and an admin cannot open another
-- teacher's classroom: that stays owner-only.
create or replace function public.admin_list_classrooms() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public._admin_guard('a_read', 60, 60);
begin
  perform public._log_event('admin_classrooms_viewed', v, null, null);
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'archived_at', c.archived_at, 'created_at', c.created_at,
      'owner_handle', p.handle, 'owner_email', u.email,
      'member_count', (select count(*) from public.classroom_members m where m.classroom_id = c.id and m.status = 'active'),
      'session_count', (select count(*) from public.classroom_sessions s where s.classroom_id = c.id),
      'active_session', (select s.title from public.classroom_sessions s where s.classroom_id = c.id and s.status = 'active' limit 1)
    ) order by c.archived_at is not null, c.created_at desc)
    from public.teacher_classrooms c
    left join public.profiles p on p.id = c.owner_user_id
    left join auth.users u on u.id = c.owner_user_id), '[]'::jsonb);
end $$;
revoke all on function public.admin_list_classrooms() from public, anon;
grant execute on function public.admin_list_classrooms() to authenticated;
