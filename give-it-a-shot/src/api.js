import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = !!(URL && KEY);
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
export async function signInGoogle() {
  const { error } = await need().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  if (error) throw error;
}
export async function signOut() { if (sb) await sb.auth.signOut(); }

export async function getProfile(uid) {
  const { data, error } = await need().from('profiles').select('handle, tag').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data;
}
export async function createProfile(uid, handle, tag) {
  const { error } = await need().from('profiles').insert({ id: uid, handle, tag: tag || null });
  if (error) {
    if (error.code === '23505') throw new Error('That handle is taken.');
    if (/not allowed/i.test(error.message)) throw new Error(error.message.replace(/^.*?(That (handle|tag) is not allowed).*$/i, '$1') + '.');
    if (error.code === '23514') throw new Error('Handles are 3-16 letters, numbers or underscores. Tags are 2-8 letters or numbers.');
    throw error;
  }
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
