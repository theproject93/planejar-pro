import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type CheckoutPayload = {
  planId?: unknown;
};

type PlanDefinition = {
  id: string;
  title: string;
  amountCents: number;
};

const PLAN_MAP: Record<string, PlanDefinition> = {
  test_1: { id: 'test_1', title: 'Plano Teste R$ 1', amountCents: 100 },
  test_2: { id: 'test_2', title: 'Plano Teste R$ 2', amountCents: 200 },
  essencial: { id: 'essencial', title: 'Plano Essencial', amountCents: 3900 },
  profissional: { id: 'profissional', title: 'Plano Profissional', amountCents: 5900 },
  elite: { id: 'elite', title: 'Plano Elite', amountCents: 8900 },
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function findCheckoutUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const directCandidates = [
    row.checkout_url,
    row.payment_url,
    row.url,
    row.link,
    row.invoice_url,
    row.invoice_link,
  ];
  for (const candidate of directCandidates) {
    const found = findCheckoutUrl(candidate);
    if (found) return found;
  }
  for (const nested of Object.values(row)) {
    const found = findCheckoutUrl(nested);
    if (found) return found;
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const infinitePayHandle = Deno.env.get('INFINITEPAY_HANDLE')?.trim();
    const appBaseUrl = Deno.env.get('APP_BASE_URL');

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey ||
      !infinitePayHandle
    ) {
      return jsonResponse(500, { error: 'server_misconfigured' });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, { error: 'missing_authorization' });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse(401, { error: 'unauthorized' });
    }

    const payload = (await request.json()) as CheckoutPayload;
    const planId = typeof payload.planId === 'string' ? payload.planId.trim() : '';
    const plan = PLAN_MAP[planId];
    if (!plan) {
      return jsonResponse(400, { error: 'invalid_plan' });
    }

    const user = authData.user;
    const email = user.email?.trim();
    if (!email) {
      return jsonResponse(400, { error: 'missing_user_email' });
    }

    const baseUrl =
      appBaseUrl?.trim().replace(/\/+$/, '') ??
      request.headers.get('origin')?.trim().replace(/\/+$/, '') ??
      'http://localhost:5173';

    const orderNsu = `${user.id}:${plan.id}:${Date.now()}`;
    const webhookUrl = `${supabaseUrl}/functions/v1/billing-webhook`;
    const redirectUrl = `${baseUrl}/dashboard/perfil?billing_provider=infinitepay`;
    const rawName = (user.user_metadata?.name as string | undefined)?.trim();
    const customerName =
      rawName && rawName.length > 0 ? rawName : email.split('@')[0];

    const checkoutPayload = {
      handle: infinitePayHandle,
      items: [
        {
          quantity: 1,
          price: plan.amountCents,
          description: plan.title,
        },
      ],
      customer: {
        name: customerName,
        email,
      },
      order_nsu: orderNsu,
      webhook_url: webhookUrl,
      redirect_url: redirectUrl,
    };

    const checkoutResponse = await fetch(
      'https://api.infinitepay.io/invoices/public/checkout/links',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload),
      }
    );

    if (!checkoutResponse.ok) {
      const raw = await checkoutResponse.text();
      console.error('infinitepay_checkout_error', checkoutResponse.status, raw);
      return jsonResponse(400, {
        error: 'infinitepay_checkout_failed',
        providerStatus: checkoutResponse.status,
        providerBody: raw,
      });
    }

    const responseBody = (await checkoutResponse.json()) as Record<string, unknown>;
    const checkoutUrl = findCheckoutUrl(responseBody);
    if (!checkoutUrl) {
      return jsonResponse(502, {
        error: 'infinitepay_invalid_checkout_payload',
        providerBody: responseBody,
      });
    }

    const invoiceSlug =
      typeof responseBody.invoice_slug === 'string'
        ? responseBody.invoice_slug
        : typeof responseBody.slug === 'string'
          ? responseBody.slug
          : null;

    await serviceClient.from('billing_subscriptions').upsert(
      {
        user_id: user.id,
        provider: 'infinitepay',
        status: 'pending_checkout',
        plan_id: plan.id,
        plan_name: plan.title,
        amount_cents: plan.amountCents,
        currency: 'BRL',
        external_reference: orderNsu,
        provider_checkout_preference_id: invoiceSlug,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return jsonResponse(200, {
      ok: true,
      provider: 'infinitepay',
      checkoutUrl,
      orderNsu,
      invoiceSlug,
      planId: plan.id,
      amountCents: plan.amountCents,
    });
  } catch (error) {
    console.error('billing-create-checkout error', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
