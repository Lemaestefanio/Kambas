export const AGE_CONSENT_KEY = 'luanda_prive_age_consent_v1';

/** Keep the declaration only for this browser tab's session. */
export function hasAgeConsent(): boolean {
  try {
    return window.sessionStorage.getItem(AGE_CONSENT_KEY) === 'confirmed';
  } catch {
    return false;
  }
}

/** Storage may be disabled; consent still applies to the current mounted page. */
export function rememberAgeConsent(): void {
  try {
    window.sessionStorage.setItem(AGE_CONSENT_KEY, 'confirmed');
  } catch {
    // No persistent browser state is required to enter after confirming.
  }
}
