import type { Creator } from '../types';

export type ActionLinkKey = 'subscribe' | 'message' | 'tip' | 'signup' | 'login' | 'explore' | 'notifications';

/** Only explicit HTTPS destinations and same-origin paths are accepted. */
export function safeActionUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const url = value.trim();
  if (url.length > 4096 || /[\\\\\u0000-\u0020\u007f]/.test(url)) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : null;
  } catch { return null; }
}

export function openConfiguredAction(creator: Creator, key: ActionLinkKey): boolean {
  const url = safeActionUrl(creator.actionLinks?.[key]);
  if (!url) return false;
  window.location.assign(url);
  return true;
}
