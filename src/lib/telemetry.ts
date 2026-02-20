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
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData.session;
    if (!session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session;
    }
    if (!session) return;

    const { error } = await supabase.functions.invoke('telemetry-intake', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
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

    if (error) {
      if (error.message?.includes('non-2xx status code')) return;
      console.warn('Falha ao registrar telemetria:', error.message);
    }
  } catch (error) {
    console.warn('Falha ao registrar telemetria:', error);
  }
}
