const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type InputPayload = {
  prompt?: unknown;
  width?: unknown;
  height?: unknown;
  seed?: unknown;
  model?: unknown;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const clean = value.trim();
  return clean || fallback;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function extractBase64(result: Record<string, unknown>): string | null {
  const direct = [
    result.image,
    result.b64_json,
    result.response,
    result.output_text,
  ];
  for (const item of direct) {
    if (typeof item === 'string' && item.length > 100) return item;
  }

  if (Array.isArray(result.images) && result.images.length > 0) {
    const first = result.images[0];
    if (typeof first === 'string' && first.length > 100) return first;
  }

  if (Array.isArray(result.data) && result.data.length > 0) {
    const first = result.data[0];
    if (typeof first === 'string' && first.length > 100) return first;
    if (first && typeof first === 'object') {
      const row = first as Record<string, unknown>;
      if (typeof row.b64_json === 'string' && row.b64_json.length > 100) {
        return row.b64_json;
      }
    }
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
  if (!accountId || !apiToken) {
    return jsonResponse(500, { error: 'missing_cloudflare_secrets' });
  }

  try {
    const payload = (await request.json()) as InputPayload;
    const prompt = asString(payload.prompt);
    const width = asNumber(payload.width, 1024);
    const height = asNumber(payload.height, 1024);
    const seed = asNumber(payload.seed, 42);
    const model =
      asString(payload.model) || '@cf/black-forest-labs/flux-1-schnell';

    if (!prompt) return jsonResponse(400, { error: 'prompt_required' });

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const cfResp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width,
        height,
        seed,
      }),
    });

    if (!cfResp.ok) {
      const detail = await cfResp.text();
      return jsonResponse(502, {
        error: 'cloudflare_image_failed',
        status: cfResp.status,
        detail,
      });
    }

    const raw = (await cfResp.json()) as Record<string, unknown>;
    const result = (raw.result ?? {}) as Record<string, unknown>;
    const imageBase64 = extractBase64(result);

    if (!imageBase64) {
      return jsonResponse(502, {
        error: 'image_not_found_in_payload',
      });
    }

    return jsonResponse(200, {
      image_base64: imageBase64,
      mime_type: 'image/png',
    });
  } catch (error) {
    console.error('plan-image-gen error', error);
    return jsonResponse(500, { error: 'unexpected_error' });
  }
});

