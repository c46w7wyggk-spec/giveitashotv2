// Student-side calls to the `classroom` edge function. Students have no account: the token returned by `join`
// (kept in localStorage) is their only credential, and the server stores just its hash.
import { SB_URL, SB_KEY } from '../api.js';

const KEY = 'gias_class_v1';
export const getToken = () => { try { return JSON.parse(window.localStorage.getItem(KEY) || 'null')?.token || null; } catch (e) { return null; } };
export const setToken = (t) => { try { window.localStorage.setItem(KEY, JSON.stringify({ token: t })); } catch (e) { /* storage blocked: the join works for this tab only */ } };
export const clearToken = () => { try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ } };

export class ClassError extends Error { constructor(code, message, status) { super(message || code); this.code = code; this.status = status; } }

export async function call(body) {
  let res;
  try {
    res = await fetch(SB_URL + '/functions/v1/classroom', {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY }, body: JSON.stringify(body),
    });
  } catch (e) { throw new ClassError('network', 'Could not reach the server. Check your connection and try again.', 0); }
  let data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON error */ }
  if (!res.ok || !data || data.error) throw new ClassError((data && data.error) || 'server_error', (data && data.message) || 'Something went wrong. Try again.', res.status);
  return data;
}
export const submitRun = (log) => call({ action: 'submit', token: getToken(), log });
export const progressRun = (log) => call({ action: 'progress', token: getToken(), log });
