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
    const mercadoPagoAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    const appBaseUrl = Deno.env.get('APP_BASE_URL');

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey ||
      !mercadoPagoAccessToken
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

    const externalReference = `${user.id}:${plan.id}:${Date.now()}`;
    const notificationUrl = `${supabaseUrl}/functions/v1/billing-webhook`;
    const unitPrice = Number((plan.amountCents / 100).toFixed(2));

    const checkoutPayload = {
      items: [
        {
          id: plan.id,
          title: plan.title,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: 'BRL',
        },
      ],
      payer: { email },
      external_reference: externalReference,
      notification_url: notificationUrl,
      back_urls: {
        success: `${baseUrl}/dashboard/perfil?billing_status=success`,
        failure: `${baseUrl}/dashboard/perfil?billing_status=failure`,
        pending: `${baseUrl}/dashboard/perfil?billing_status=pending`,
      },
      auto_return: 'approved',
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        plan_amount_cents: plan.amountCents,
      },
      payment_methods: {
        // Avoid forcing Mercado Pago wallet login as the primary option.
        excluded_payment_methods: [{ id: 'account_money' }],
      },
    };

    const checkoutResponse = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mercadoPagoAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify(checkoutPayload),
      }
    );

    if (!checkoutResponse.ok) {
      const raw = await checkoutResponse.text();
      console.error('mercadopago_checkout_error', checkoutResponse.status, raw);
      return jsonResponse(502, { error: 'mercadopago_checkout_failed' });
    }

    const preference = (await checkoutResponse.json()) as Record<string, unknown>;
    const preferenceId =
      typeof preference.id === 'string' ? preference.id : null;
    const initPoint =
      typeof preference.init_point === 'string' ? preference.init_point : null;
    const sandboxInitPoint =
      typeof preference.sandbox_init_point === 'string'
        ? preference.sandbox_init_point
        : null;

    if (!preferenceId || (!initPoint && !sandboxInitPoint)) {
      return jsonResponse(502, { error: 'mercadopago_invalid_checkout_payload' });
    }

    await serviceClient.from('billing_subscriptions').upsert(
      {
        user_id: user.id,
        provider: 'mercadopago',
        status: 'pending_checkout',
        plan_id: plan.id,
        plan_name: plan.title,
        amount_cents: plan.amountCents,
        currency: 'BRL',
        external_reference: externalReference,
        provider_checkout_preference_id: preferenceId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return jsonResponse(200, {
      ok: true,
      preferenceId,
      initPoint,
      sandboxInitPoint,
      checkoutUrl: sandboxInitPoint ?? initPoint,
      planId: plan.id,
      amountCents: plan.amountCents,
    });
  } catch (error) {
    console.error('billing-create-checkout error', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
