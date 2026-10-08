import { createClient } from '@supabase/supabase-js';

// The URL and publishable key are public by design; the fallbacks keep the board working if a host drops .env files.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://gaurlsgdfwasrapvlmyd.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_TFJz6blaRoBE4YdxJzd8gQ_Y6_EWG4O';
export const configured = !!(URL && KEY);
export const SB_URL = URL, SB_KEY = KEY;
export const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH === '1';

export const sb = configured ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

const need = () => { if (!sb) throw new Error('The online board is not configured.'); return sb; };

export async function getUser() {
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session ? data.session.user : null;
}
export function onAuth(cb) {
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_e, session) => cb(session ? session.user : null));
  return () => data.subscription.unsubscribe();
}
export async function signInEmail(email) {
  const { error } = await need().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
  if (error) throw error;
}
// Teacher accounts: email + password. Every email link lands on the site root (the one redirect URL Supabase already allows);
// main.js then sends the teacher back to /teacher.
export async function signUpTeacher(email, password, info) {
  const { data, error } = await need().auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { teacher_signup: true, name: info.name, school: info.school, note: info.note || '' } } });
  if (error) throw error;
  // With email confirmation on, Supabase answers an already-registered address with a user that has no identities (and sends nothing).
  return { session: data.session, exists: !!(data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) };
}
export async function signInPassword(email, password) {
  const { error } = await need().auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function resendConfirmation(email) {
  const { error } = await need().auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } });
  if (error) throw error;
}
export async function sendPasswordReset(email) {
  const { error } = await need().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw error;
}
export async function setPassword(password) {
  const { error } = await need().auth.updateUser({ password });
  if (error) throw error;
}
export async function signInGoogle() {
  const { error } = await need().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  if (error) throw error;
}
export async function isBeta() {
  if (!sb) return false;
  const { data, error } = await sb.rpc('is_beta');
  return !error && data === true;
}
export async function signOut() { if (sb) await sb.auth.signOut(); }

export async function getProfile(uid) {
  const { data, error } = await need().from('profiles').select('handle, tag').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data;
}
export async function createProfile(uid, handle, tag) {
  const { data, error } = await need().from('profiles').insert({ id: uid, handle, tag: tag || null }).select('tag').single();
  if (error) {
    if (error.code === '23505') throw new Error('That handle is taken.');
    if (/UATX tag is only/i.test(error.message)) throw new Error('The UATX tag is only for @student.uaustin.org emails. Leave the tag blank or pick another.');
    if (/not allowed/i.test(error.message)) throw new Error(error.message.replace(/^.*?(That (handle|tag) is not allowed).*$/i, '$1') + '.');
    if (error.code === '23514') throw new Error('Handles are 3-16 letters, numbers or underscores. Tags are 2-8 letters or numbers.');
    throw error;
  }
  return data && data.tag;
}
export async function submitScore(payload) {
  const { data, error } = await need().functions.invoke('submit-score', { body: payload });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch { /* keep default */ }
    throw new Error(msg);
  }
  return data;
}
export async function topScores({ mode, date = null, tag = null, limit = 50 }) {
  const { data, error } = await need().rpc('top_scores', { p_mode: mode, p_date: date, p_role: null, p_tag: tag, p_limit: limit });
  if (error) throw error;
  return data || [];
}
export async function myStreak() {
  const { data, error } = await need().rpc('my_streak');
  if (error) throw error;
  return (data && data[0]) || { current_streak: 0, best_streak: 0, played_today: false };
}
