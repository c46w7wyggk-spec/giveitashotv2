import { reportApi } from './errors.js';

// The URL and publishable key are public by design; the fallbacks keep the board working if a host drops .env files.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://gaurlsgdfwasrapvlmyd.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_TFJz6blaRoBE4YdxJzd8gQ_Y6_EWG4O';
export const configured = !!(URL && KEY);
export const SB_URL = URL, SB_KEY = KEY;
export const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH === '1';

// The Supabase client is about half of the app's JavaScript, and most players never sign in, so it is loaded the first time
// something needs it rather than with the game. It loads straight away only when there is a session to restore or a
// sign-in link to finish. The storage key is Supabase's own default, written out so we can check for a saved session.
const AUTH_KEY = configured ? 'sb-' + new globalThis.URL(URL).hostname.split('.')[0] + '-auth-token' : '';
let client = null, loading = null;
const listeners = [];
const attach = (fn) => client.auth.onAuthStateChange(fn);
export function loadClient() {
  if (!configured) return Promise.resolve(null);
  if (!loading) {
    loading = import('@supabase/supabase-js').then(({ createClient }) => {
      client = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: AUTH_KEY } });
      listeners.forEach(attach);
      return client;
    });
    loading.catch(() => { loading = null; });
  }
  return loading;
}
export const authLinkInUrl = () => /access_token=|[?&]code=|token_hash=|error_code=/.test(window.location.hash + window.location.search);
function hasSession() {
  if (client) return true;
  try { if (window.localStorage.getItem(AUTH_KEY)) return true; } catch (e) { /* storage blocked: there is nothing to restore */ }
  return authLinkInUrl();
}
const need = async () => { const c = await loadClient(); if (!c) throw new Error('The online board is not configured.'); return c; };
// Calls that only make sense for a signed-in player skip loading the client when nobody can be signed in.
const ifSession = async () => (configured && hasSession() ? loadClient() : null);

export async function getUser() {
  const c = await ifSession();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session ? data.session.user : null;
}
// Supabase auth events (event, session), delivered once the client has loaded.
export function onAuthEvent(fn) {
  if (!configured) return () => {};
  let sub = null, off = false;
  const wrap = (e, s) => { if (!off) fn(e, s); };
  if (client) sub = attach(wrap).data.subscription; else listeners.push(wrap);
  return () => { off = true; if (sub) sub.unsubscribe(); const i = listeners.indexOf(wrap); if (i >= 0) listeners.splice(i, 1); };
}
export function onAuth(cb) { return onAuthEvent((_e, session) => cb(session ? session.user : null)); }
export async function signInEmail(email) {
  const { error } = await (await need()).auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
  if (error) throw error;
}
// Teacher accounts: email + password. Every email link lands on the site root (the one redirect URL Supabase already allows);
// main.js then sends the teacher back to /teacher.
export async function signUpTeacher(email, password, info) {
  const { data, error } = await (await need()).auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { teacher_signup: true, name: info.name, school: info.school, note: info.note || '' } } });
  if (error) throw error;
  // With email confirmation on, Supabase answers an already-registered address with a user that has no identities (and sends nothing).
  return { session: data.session, exists: !!(data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) };
}
export async function signInPassword(email, password) {
  const { error } = await (await need()).auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function resendConfirmation(email) {
  const { error } = await (await need()).auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } });
  if (error) throw error;
}
export async function sendPasswordReset(email) {
  const { error } = await (await need()).auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw error;
}
export async function setPassword(password) {
  const { error } = await (await need()).auth.updateUser({ password });
  if (error) throw error;
}
export async function signInGoogle() {
  const { error } = await (await need()).auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  if (error) throw error;
}
export async function isBeta() {
  const c = await ifSession();
  if (!c) return false;
  const { data, error } = await c.rpc('is_beta');
  return !error && data === true;
}
export async function signOut() { const c = await ifSession(); if (c) await c.auth.signOut(); }

export async function getProfile(uid) {
  const { data, error } = await (await need()).from('profiles').select('handle, tag').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data;
}
export async function createProfile(uid, handle, tag) {
  const { data, error } = await (await need()).from('profiles').insert({ id: uid, handle, tag: tag || null }).select('tag').single();
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
  const { data, error } = await (await need()).functions.invoke('submit-score', { body: payload });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch { /* keep default */ }
    const st = error.context && error.context.status;
    if (!st || st >= 500) reportApi('submit-score', (st || 'no status') + ' ' + msg);
    throw new Error(msg);
  }
  return data;
}
export async function topScores({ mode, date = null, tag = null, limit = 50 }) {
  const { data, error } = await (await need()).rpc('top_scores', { p_mode: mode, p_date: date, p_role: null, p_tag: tag, p_limit: limit });
  if (error) throw error;
  return data || [];
}
export async function myStreak() {
  const { data, error } = await (await need()).rpc('my_streak');
  if (error) throw error;
  return (data && data[0]) || { current_streak: 0, best_streak: 0, played_today: false };
}
