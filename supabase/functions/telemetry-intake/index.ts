import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type TelemetryInput = {
  eventName?: unknown;
  page?: unknown;
  sessionId?: unknown;
  path?: unknown;
  referrer?: unknown;
  userAgent?: unknown;
  metadata?: unknown;
};

function normalizeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 100);
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    'unknown'
  ).slice(0, 100);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'method_not_allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = (await request.json()) as TelemetryInput;
    const eventName = normalizeString(body.eventName, 100);
    const page = normalizeString(body.page, 100);
    const sessionId = normalizeString(body.sessionId, 128);
    const path = normalizeString(body.path, 500);
    const referrer = normalizeString(body.referrer, 500);
    const userAgent = normalizeString(body.userAgent, 500);
    const metadata = normalizeMetadata(body.metadata);

    if (!eventName || !page || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'invalid_payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'server_misconfigured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader =
      request.headers.get('Authorization') ?? `Bearer ${supabaseAnonKey}`;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const ip = getClientIp(request);
    const rateKey = `${ip}:${sessionId}`;
    const { data: allowed, error: rateLimitError } = await supabase.rpc(
      'check_telemetry_rate_limit',
      {
        p_rate_key: rateKey,
        p_limit: 20,
        p_window_seconds: 60,
      }
    );

    if (rateLimitError) {
      console.error('check_telemetry_rate_limit error', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'rate_limit_check_failed' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'rate_limited' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: ingestError } = await supabase.rpc('ingest_telemetry_event', {
      p_event_name: eventName,
      p_page: page,
      p_session_id: sessionId,
      p_path: path || null,
      p_referrer: referrer || null,
      p_user_agent: userAgent || null,
      p_metadata: metadata,
    });

    if (ingestError) {
      console.error('ingest_telemetry_event error', ingestError);
      return new Response(
        JSON.stringify({ error: 'ingest_failed' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('telemetry-intake error', error);
    return new Response(
      JSON.stringify({ error: 'bad_request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

