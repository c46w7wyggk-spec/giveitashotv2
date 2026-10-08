-- Rollback for 20261008000000_teacher_beta.sql.
-- DESTROYS all Teacher Beta data: classrooms, nicknames, sessions, results, roles, feedback, analytics. Export first if you need any of it:
--   \copy (select * from public.teacher_feedback) to 'feedback.csv' csv header
-- Does not touch profiles, scores, banned_terms, beta_testers or is_beta().
-- Cheaper alternative that keeps the data: switch the feature off, nothing is deleted:
--   update public.feature_flags set enabled = false where key = 'TEACHER_BETA_ENABLED';

-- teacher sign-up (20261008030000_teacher_signup.sql) and v3 objects go first:
drop function if exists public.teacher_apply(text, text, text), public.admin_list_applications(), public.admin_dismiss_application(uuid),
  public.admin_list_classrooms();
drop table if exists public.teacher_applications;

-- v2 (20261008010000_teacher_beta_v2.sql) objects:
drop function if exists public.teacher_begin_countdown(uuid, int), public.teacher_session_digests(uuid), public.teacher_remove_member(uuid),
  public.student_record_progress(text, uuid, int, int, numeric, numeric, boolean), public.teacher_start_session(uuid, text, text, int, int) cascade;
drop table if exists public.classroom_progress;

drop function if exists public.teacher_me(), public.teacher_dashboard(), public.teacher_create_classroom(text), public.teacher_get_classroom(uuid),
  public.teacher_set_join_code(uuid, int), public.teacher_revoke_join_code(uuid), public.teacher_archive_classroom(uuid),
  public.teacher_delete_classroom(uuid), public.teacher_start_session(uuid, text, text), public.teacher_get_session(uuid),
  public.teacher_end_session(uuid), public.teacher_set_reveal(uuid, boolean),
  public.teacher_submit_feedback(text, text, text, boolean, text, uuid), public.teacher_track(text),
  public.admin_list_roles(), public.admin_find_users(text), public.admin_grant_role(uuid, text), public.admin_revoke_role(uuid, text),
  public.grant_role_by_email(text, text), public.revoke_role_by_email(text, text), public.purge_archived_classrooms(int),
  public.classroom_join(text, text, text[]), public.student_context(text), public.student_record_result(text, uuid, jsonb), public.student_leave(text),
  public.classroom_session_stats(uuid), public.gen_join_code(), public.rl_hit(text, int, int), public.rl_peek(text, int),
  public._log_event(text, uuid, uuid, uuid, jsonb), public._teacher_guard(text, int, int), public._admin_guard(text, int, int),
  public._own_classroom(uuid, uuid), public._own_session(uuid, uuid), public.teacher_beta_enabled(),
  public.auth_has_capability(text), public.user_has_capability(uuid, text)
  cascade;   -- cascade also removes the RLS policies that call auth_has_capability()

drop table if exists public.classroom_results, public.classroom_sessions, public.classroom_members, public.teacher_classrooms,
  public.teacher_feedback, public.analytics_events, public.rate_limits, public.user_roles, public.role_capabilities, public.roles, public.feature_flags;
-- pgcrypto is left installed: other things may use it.
