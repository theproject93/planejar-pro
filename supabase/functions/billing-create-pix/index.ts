import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PixPayload = {
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

    const payload = (await request.json()) as PixPayload;
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

    const externalReference = `${user.id}:${plan.id}:${Date.now()}`;
    const notificationUrl = `${supabaseUrl}/functions/v1/billing-webhook`;

    const pixPayload = {
      transaction_amount: Number((plan.amountCents / 100).toFixed(2)),
      description: plan.title,
      payment_method_id: 'pix',
      payer: { email },
      notification_url: notificationUrl,
      external_reference: externalReference,
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        plan_amount_cents: plan.amountCents,
      },
    };

    const paymentResponse = await fetch(
      'https://api.mercadopago.com/v1/payments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mercadoPagoAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify(pixPayload),
      }
    );

    if (!paymentResponse.ok) {
      const raw = await paymentResponse.text();
      console.error('mercadopago_pix_error', paymentResponse.status, raw);
      return jsonResponse(400, {
        error: 'mercadopago_pix_failed',
        providerStatus: paymentResponse.status,
        providerBody: raw,
      });
    }

    const payment = (await paymentResponse.json()) as Record<string, unknown>;
    const paymentId = String(payment.id ?? '');
    const status = String(payment.status ?? 'pending');
    const poi = (payment.point_of_interaction ?? {}) as Record<string, unknown>;
    const tx = (poi.transaction_data ?? {}) as Record<string, unknown>;
    const qrCode = typeof tx.qr_code === 'string' ? tx.qr_code : null;
    const qrCodeBase64 =
      typeof tx.qr_code_base64 === 'string' ? tx.qr_code_base64 : null;
    const ticketUrl = typeof tx.ticket_url === 'string' ? tx.ticket_url : null;

    await serviceClient.from('billing_subscriptions').upsert(
      {
        user_id: user.id,
        provider: 'mercadopago',
        status: status === 'approved' ? 'active' : 'pending_pix',
        plan_id: plan.id,
        plan_name: plan.title,
        amount_cents: plan.amountCents,
        currency: 'BRL',
        external_reference: externalReference,
        last_payment_id: paymentId || null,
        last_payment_status: status,
        last_payment_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (paymentId) {
      await serviceClient.from('billing_payments').upsert(
        {
          provider: 'mercadopago',
          provider_payment_id: paymentId,
          user_id: user.id,
          external_reference: externalReference,
          status,
          payment_method_id: 'pix',
          payment_type_id: 'bank_transfer',
          amount: Number((plan.amountCents / 100).toFixed(2)),
          currency: 'BRL',
          payer_email: email,
          processed_at: new Date().toISOString(),
          raw_payload: payment,
        },
        { onConflict: 'provider,provider_payment_id' }
      );
    }

    return jsonResponse(200, {
      ok: true,
      paymentId,
      status,
      qrCode,
      qrCodeBase64,
      ticketUrl,
      planId: plan.id,
      amountCents: plan.amountCents,
    });
  } catch (error) {
    console.error('billing-create-pix error', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
