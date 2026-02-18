export const COOKIE_CONSENT_KEY = 'planejarpro_cookie_consent';
const CONSENT_ACCEPTED_VALUE = 'accepted';

export function hasCookieConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(COOKIE_CONSENT_KEY) === CONSENT_ACCEPTED_VALUE;
}

export function acceptCookieConsent(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COOKIE_CONSENT_KEY, CONSENT_ACCEPTED_VALUE);
}

