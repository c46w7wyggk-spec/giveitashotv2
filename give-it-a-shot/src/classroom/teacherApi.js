// Teacher/admin calls. These go straight to Postgres functions with the signed-in user's own JWT.
// There is no service key in the browser, and the browser never says who it is: the database reads auth.uid().
import { loadClient } from '../api.js';
import { reportApi } from '../errors.js';

const MSG = {
  not_authenticated: 'Please sign in again.',
  not_authorized: 'This account is not on the Teacher Beta list.',
  teacher_beta_disabled: 'Teacher Beta is currently unavailable.',
  rate_limited: 'You are doing that too quickly. Wait a moment and try again.',
  not_found: 'That item was not found, or it belongs to another account.',
  invalid_name: 'Enter a classroom name between 1 and 80 characters.',
  classroom_limit: 'You have reached the limit of 20 open classrooms. Archive one first.',
  classroom_archived: 'This classroom is archived.',
  session_already_active: 'A session is already running in this classroom.',
  invalid_text: 'That title or those instructions are too long.',
  invalid_days: 'Choose between 3 and 28 days.',
  invalid_difficulty: 'Choose a difficulty level.',
  invalid_focus: 'Choose an AP unit from the list.',
  session_not_active: 'This session has already ended.',
  invalid_input: 'Check the form and try again.',
  invalid_role: 'That role cannot be granted.',
  cannot_revoke_self: 'You cannot remove your own admin access.',
  try_again: 'Please try again.',
  offline: 'The online service is not configured.',
  server_error: 'Something went wrong. Try again in a moment.',
};
export class TError extends Error { constructor(code) { super(MSG[code] || MSG.server_error); this.code = code; } }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s) => typeof s === 'string' && UUID.test(s);

function codeOf(e) {
  const m = String(e.message || '').trim();
  if (MSG[m]) return m;
  if (/invalid input syntax/i.test(m)) return 'not_found';
  if (/permission denied/i.test(m) || e.status === 403) return 'not_authorized';
  if (/jwt|not authenticated/i.test(m) || e.status === 401) return 'not_authenticated';
  return 'server_error';
}
async function rpc(fn, args) {
  let sb = null; try { sb = await loadClient(); } catch (e) { throw new TError('try_again'); }
  if (!sb) throw new TError('offline');
  const { data, error } = await sb.rpc(fn, args || {});
  if (error) { const c = codeOf(error); if (c === 'server_error') reportApi('rpc:' + fn, error.message); throw new TError(c); }
  return data;
}

export const me = () => rpc('teacher_me');
export const dashboard = () => rpc('teacher_dashboard');
export const createClassroom = (name) => rpc('teacher_create_classroom', { p_name: name });
export const getClassroom = (id) => rpc('teacher_get_classroom', { p_id: id });
export const setJoinCode = (id, hours) => rpc('teacher_set_join_code', { p_id: id, p_ttl_hours: hours });
export const revokeJoinCode = (id) => rpc('teacher_revoke_join_code', { p_id: id });
export const archiveClassroom = (id) => rpc('teacher_archive_classroom', { p_id: id });
export const deleteClassroom = (id) => rpc('teacher_delete_classroom', { p_id: id });
// powerPlays is sent only when off, so the call still works against a database without the power_plays migration.
export const startSession = (id, title, instructions, days, difficulty, focus, powerPlays) => rpc('teacher_start_session', Object.assign({ p_classroom: id, p_title: title, p_instructions: instructions, p_days: days, p_difficulty: difficulty, p_focus: focus || null }, powerPlays === false ? { p_power_plays: false } : {}));
export const beginCountdown = (id) => rpc('teacher_begin_countdown', { p_id: id });
export const digests = (id) => rpc('teacher_session_digests', { p_id: id });
export const removeMember = (id) => rpc('teacher_remove_member', { p_member: id });
export const getSession = (id) => rpc('teacher_get_session', { p_id: id });
export const endSession = (id) => rpc('teacher_end_session', { p_id: id });
export const setReveal = (id, on) => rpc('teacher_set_reveal', { p_id: id, p_reveal: on });
export const sendFeedback = (f) => rpc('teacher_submit_feedback', { p_worked: f.worked, p_confused: f.confused, p_change: f.change, p_use_again: f.useAgain, p_would_pay: f.wouldPay, p_classroom: f.classroom || null });
export const track = (event) => rpc('teacher_track', { p_event: event }).catch(() => {});
export const apply = (f) => rpc('teacher_apply', { p_name: f.name, p_school: f.school, p_note: f.note || null });
export const adminRoles = () => rpc('admin_list_roles');
export const adminApplications = () => rpc('admin_list_applications');
export const adminDismiss = (uid) => rpc('admin_dismiss_application', { p_user: uid });
export const adminClassrooms = () => rpc('admin_list_classrooms');
export const adminOverview = () => rpc('admin_owner_overview');
export const adminOwnerClassrooms = () => rpc('admin_owner_classrooms');
export const adminFeedback = () => rpc('admin_list_feedback');
export const adminErrors = (days) => rpc('admin_list_errors', { p_days: days });
export const adminResolveError = (fp) => rpc('admin_resolve_errors', { p_fingerprint: fp });
export const adminFind = (q) => rpc('admin_find_users', { p_query: q });
export const adminGrant = (uid, role) => rpc('admin_grant_role', { p_user: uid, p_role: role });
export const adminRevoke = (uid, role) => rpc('admin_revoke_role', { p_user: uid, p_role: role });
export const adminUsers = () => rpc('admin_list_users');
export const adminSetLeaderBeta = (uid, on) => rpc('admin_set_leader_beta', { p_user: uid, p_on: !!on });
