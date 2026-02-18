import { supabase } from './supabaseClient';
import { hasCookieConsent } from './privacy';

const SESSION_KEY = 'planejarpro_telemetry_session_id';

function getSessionId(): string {
  const cached = localStorage.getItem(SESSION_KEY);
  if (cached) return cached;
  const created = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, created);
  return created;
}

type TrackPayload = {
  eventName: string;
  page: string;
  metadata?: Record<string, unknown>;
};

export async function trackEvent({
  eventName,
  page,
  metadata = {},
}: TrackPayload): Promise<void> {
  if (!hasCookieConsent()) return;

  try {
    await supabase.functions.invoke('telemetry-intake', {
      body: {
        eventName,
        page,
        sessionId: getSessionId(),
        metadata,
        userAgent: navigator.userAgent,
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
      },
    });
  } catch (error) {
    console.warn('Falha ao registrar telemetria:', error);
  }
}
