import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type InfinitePayWebhook = {
  amount?: unknown;
  paid_amount?: unknown;
  capture_method?: unknown;
  customer?: { email?: unknown } | null;
  invoice_slug?: unknown;
  order_nsu?: unknown;
  receipt_url?: unknown;
  transaction_nsu?: unknown;
};

function textValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean.length > 0 ? clean : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseExternalReference(value: string | null): {
  userId: string | null;
  planId: string | null;
} {
  if (!value) return { userId: null, planId: null };
  const parts = value.split(':');
  if (parts.length < 2) return { userId: null, planId: null };
  return {
    userId: textValue(parts[0]),
    planId: textValue(parts[1]),
  };
}

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: 'server_misconfigured' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    let payload: unknown = null;
    try {
      payload = await request.json();
    } catch {
      payload = null;
    }

    if (!payload || typeof payload !== 'object') {
      return jsonResponse(200, { ok: true, skipped: 'invalid_payload' });
    }

    const event = payload as InfinitePayWebhook;
    const providerPaymentId =
      textValue(event.transaction_nsu) ??
      textValue(event.invoice_slug) ??
      textValue((payload as Record<string, unknown>).id);

    if (!providerPaymentId) {
      return jsonResponse(200, { ok: true, skipped: 'missing_payment_id' });
    }

    const externalReference = textValue(event.order_nsu);
    const parsed = parseExternalReference(externalReference);
    const userId = parsed.userId;
    const planId = parsed.planId;
    const amountCents =
      numberValue(event.paid_amount) ?? numberValue(event.amount);
    const amount =
      amountCents !== null ? Number((amountCents / 100).toFixed(2)) : null;

    await serviceClient.from('billing_payments').upsert(
      {
        provider: 'infinitepay',
        provider_payment_id: providerPaymentId,
        provider_checkout_preference_id: textValue(event.invoice_slug),
        external_reference: externalReference,
        user_id: userId,
        status: 'approved',
        status_detail: 'approved',
        payment_method_id: textValue(event.capture_method),
        payment_type_id: textValue(event.capture_method),
        amount,
        currency: 'BRL',
        payer_email: textValue(event.customer?.email),
        processed_at: new Date().toISOString(),
        raw_payload: payload as Record<string, unknown>,
      },
      { onConflict: 'provider,provider_payment_id' }
    );

    if (userId) {
      await serviceClient.from('billing_subscriptions').upsert(
        {
          user_id: userId,
          provider: 'infinitepay',
          status: 'active',
          plan_id: planId,
          amount_cents: amountCents,
          currency: 'BRL',
          external_reference: externalReference,
          last_payment_id: providerPaymentId,
          last_payment_status: 'approved',
          last_payment_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    }

    return jsonResponse(200, { ok: true, paymentId: providerPaymentId });
  } catch (error) {
    console.error('billing-webhook error', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
