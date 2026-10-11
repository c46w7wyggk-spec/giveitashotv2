-- Covering indexes for foreign keys the Supabase advisor flagged on tables that grow with every class.
-- classroom_progress and classroom_results are read and cleaned up by member, so these keep joins and
-- member removal cheap as classes pile up. The two admin-only columns are left alone (tiny tables).
create index if not exists classroom_members_user_id_idx on public.classroom_members (user_id);
create index if not exists classroom_progress_member_id_idx on public.classroom_progress (member_id);
create index if not exists classroom_results_member_id_idx on public.classroom_results (member_id);
create index if not exists teacher_feedback_user_id_idx on public.teacher_feedback (user_id);
