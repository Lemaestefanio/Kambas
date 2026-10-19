/** Keep the requested profile through the first remote catalogue load. */
export function getRequestedCreatorId(search: string): string | null {
  const value = new URLSearchParams(search).get('creator');
  return value && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;
}
