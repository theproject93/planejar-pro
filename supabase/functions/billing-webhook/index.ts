import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type MercadoPagoPayment = {
  id?: unknown;
  status?: unknown;
  status_detail?: unknown;
  payment_method_id?: unknown;
  payment_type_id?: unknown;
  transaction_amount?: unknown;
  currency_id?: unknown;
  external_reference?: unknown;
  order?: { id?: unknown } | null;
  payer?: { email?: unknown } | null;
  metadata?: Record<string, unknown> | null;
  date_approved?: unknown;
  date_last_updated?: unknown;
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

function extractPaymentIdFromRequest(request: Request, payload: unknown): string | null {
  const url = new URL(request.url);
  const queryCandidates = [
    url.searchParams.get('data.id'),
    url.searchParams.get('id'),
  ];

  for (const candidate of queryCandidates) {
    const parsed = textValue(candidate);
    if (parsed) return parsed;
  }

  if (payload && typeof payload === 'object') {
    const row = payload as Record<string, unknown>;
    const nestedData = row.data as Record<string, unknown> | undefined;

    const bodyCandidates = [
      row.id,
      row.resource,
      nestedData?.id,
      row['data.id'],
    ];

    for (const candidate of bodyCandidates) {
      const parsed = textValue(candidate);
      if (!parsed) continue;
      const pathMatch = parsed.match(/\/payments\/(\d+)/);
      if (pathMatch?.[1]) return pathMatch[1];
      return parsed;
    }
  }

  return null;
}

function parseExternalReference(value: string | null): { userId: string | null; planId: string | null } {
  if (!value) return { userId: null, planId: null };
  const parts = value.split(':');
  if (parts.length < 2) return { userId: null, planId: null };
  return {
    userId: textValue(parts[0]),
    planId: textValue(parts[1]),
  };
}

function mapSubscriptionStatus(paymentStatus: string | null): string {
  if (paymentStatus === 'approved') return 'active';
  if (paymentStatus === 'pending' || paymentStatus === 'in_process') return 'pending_payment';
  if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') return 'payment_failed';
  return 'pending_payment';
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
    const mercadoPagoAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!supabaseUrl || !serviceRoleKey || !mercadoPagoAccessToken) {
      return jsonResponse(500, { error: 'server_misconfigured' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    let payload: unknown = null;
    try {
      payload = await request.json();
    } catch {
      payload = null;
    }

    const paymentId = extractPaymentIdFromRequest(request, payload);
    if (!paymentId) {
      return jsonResponse(200, { ok: true, skipped: 'missing_payment_id' });
    }

    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mercadoPagoAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paymentResponse.ok) {
      const raw = await paymentResponse.text();
      console.error('mercadopago_payment_fetch_error', paymentResponse.status, raw);
      return jsonResponse(502, { error: 'mercadopago_payment_fetch_failed' });
    }

    const payment = (await paymentResponse.json()) as MercadoPagoPayment;
    const providerPaymentId = textValue(payment.id) ?? paymentId;
    const status = textValue(payment.status);
    const externalReference = textValue(payment.external_reference);
    const parsed = parseExternalReference(externalReference);
    const metadata = payment.metadata ?? {};
    const metadataUserId = textValue(metadata.user_id);
    const metadataPlanId = textValue(metadata.plan_id);
    const userId = parsed.userId ?? metadataUserId;
    const planId = parsed.planId ?? metadataPlanId;
    const amount = numberValue(payment.transaction_amount);
    const approvedAt =
      textValue(payment.date_approved) ??
      textValue(payment.date_last_updated) ??
      new Date().toISOString();

    await serviceClient.from('billing_payments').upsert(
      {
        provider: 'mercadopago',
        provider_payment_id: providerPaymentId,
        provider_checkout_preference_id: textValue(metadata.preference_id),
        provider_merchant_order_id: textValue(payment.order?.id),
        user_id: userId,
        external_reference: externalReference,
        status: status ?? 'pending',
        status_detail: textValue(payment.status_detail),
        payment_method_id: textValue(payment.payment_method_id),
        payment_type_id: textValue(payment.payment_type_id),
        amount,
        currency: textValue(payment.currency_id),
        payer_email: textValue(payment.payer?.email),
        processed_at: new Date().toISOString(),
        raw_payload: payment as unknown as Record<string, unknown>,
      },
      { onConflict: 'provider,provider_payment_id' }
    );

    if (userId) {
      const nextStatus = mapSubscriptionStatus(status);
      const amountCents =
        amount !== null ? Math.round(amount * 100) : null;

      await serviceClient.from('billing_subscriptions').upsert(
        {
          user_id: userId,
          provider: 'mercadopago',
          status: nextStatus,
          plan_id: planId,
          amount_cents: amountCents,
          currency: textValue(payment.currency_id) ?? 'BRL',
          external_reference: externalReference,
          last_payment_id: providerPaymentId,
          last_payment_status: status,
          last_payment_at: approvedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    }

    return jsonResponse(200, { ok: true, paymentId: providerPaymentId, status });
  } catch (error) {
    console.error('billing-webhook error', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
