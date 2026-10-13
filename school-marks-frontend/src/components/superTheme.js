/**
 * Control Room theme — the school's ThemeContext tokens (so light/dark keeps
 * working) plus a few superadmin-only accents: a brass/amber "authority" colour
 * instead of the admin purple, and a monospace face for times and usernames.
 */
import { useTheme } from '../context/ThemeContext';

export const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", "Segoe UI Mono", Consolas, monospace';

export function useSuperTheme() {
  const { tokens, isDark, toggleTheme } = useTheme();

  const brass = isDark
    ? { gold: '#E9B949', goldStrong: '#F4CE6A', goldSoft: 'rgba(233,185,73,.12)', goldLine: 'rgba(233,185,73,.35)', onGold: '#1A1405' }
    : { gold: '#9A6B0B', goldStrong: '#7A5306', goldSoft: '#FBF3E2', goldLine: '#E8D3A6', onGold: '#FFFFFF' };

  const chrome = isDark
    ? { barBg: '#141416', barBorder: '#2A2A2E', canvas: '#1A1A1C' }
    : { barBg: '#FFFFFF', barBorder: '#E7E3DA', canvas: '#F6F4EF' };

  // Category identity for the activity log. Always shown WITH its text label.
  const category = {
    AUTH:        { label: 'Sign-in',     color: tokens.infoText },
    MARKS:       { label: 'Marks',       color: brass.gold },
    STUDENTS:    { label: 'Students',    color: tokens.successText },
    TEACHERS:    { label: 'Teachers',    color: tokens.accent },
    ADMINS:      { label: 'Admins',      color: tokens.danger },
    CLASSES:     { label: 'Classes',     color: tokens.textMuted },
    SUBJECTS:    { label: 'Subjects',    color: tokens.warningText },
    EXAMS:       { label: 'Exams',       color: tokens.infoText },
    ASSIGNMENTS: { label: 'Assignments', color: tokens.accent },
    REPORTS:     { label: 'Reports',     color: tokens.successText },
  };

  return { t: tokens, isDark, toggleTheme, ...brass, ...chrome, category, mono: MONO };
}

/* ─── formatting helpers (all times shown in Nairobi time) ─── */
const TZ = 'Africa/Nairobi';

export const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never';

export const nairobiDayKey = (iso) =>
  new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }); // yyyy-mm-dd

export function dayHeading(key) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const y = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: TZ });
  if (key === today) return 'Today';
  if (key === y) return 'Yesterday';
  const [yy, mm, dd] = key.split('-').map(Number);
  return new Date(Date.UTC(yy, mm - 1, dd)).toLocaleDateString('en-GB', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function timeAgo(iso) {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export const ACTION_TEXT = {
  LOGIN: 'signed in', LOGIN_FAILED: 'failed sign-in', LOGOUT: 'signed out', SESSION_TIMEOUT: 'timed out',
  PASSWORD_CHANGE: 'changed password', INSERT: 'entered', UPDATE: 'edited', DELETE: 'deleted',
  CREATE: 'created', DEACTIVATE: 'deactivated', ACTIVATE: 'reactivated', RESET_PASSWORD: 'reset password',
  ARCHIVE: 'archived', RESTORE: 'restored', DOWNLOAD: 'downloaded',
};

export async function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
