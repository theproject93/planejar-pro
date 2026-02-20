import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type SubscriptionRow = {
  user_id: string;
  provider: string;
  status: string;
  plan_id: string | null;
  amount_cents: number | null;
  last_payment_status: string | null;
  updated_at: string;
};

type PaymentRow = {
  id: string;
  user_id: string | null;
  provider: string;
  provider_payment_id: string;
  status: string;
  amount: number | null;
  currency: string | null;
  payment_method_id: string | null;
  payer_email: string | null;
  processed_at: string;
};

function formatCurrency(value: number | null | undefined, currency = 'BRL') {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency });
}

function statusStyle(status: string | null | undefined) {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'active' || normalized === 'approved') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (
    normalized === 'pending' ||
    normalized === 'pending_checkout' ||
    normalized === 'pending_payment' ||
    normalized === 'in_process'
  ) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (normalized === 'rejected' || normalized === 'cancelled' || normalized === 'payment_failed') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

export function SuperBillingPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const metrics = useMemo(() => {
    const totalAssinantes = subscriptions.length;
    const ativos = subscriptions.filter((row) => row.status === 'active').length;
    const pendentes = subscriptions.filter((row) =>
      ['pending_checkout', 'pending_payment', 'pending_pix'].includes(row.status)
    ).length;
    const aprovadosHoje = payments.filter((payment) => {
      if (payment.status !== 'approved') return false;
      const processed = new Date(payment.processed_at);
      const now = new Date();
      return (
        processed.getUTCFullYear() === now.getUTCFullYear() &&
        processed.getUTCMonth() === now.getUTCMonth() &&
        processed.getUTCDate() === now.getUTCDate()
      );
    }).length;
    const receitaAprovada = payments
      .filter((payment) => payment.status === 'approved')
      .reduce((acc, payment) => acc + (payment.amount ?? 0), 0);

    return {
      totalAssinantes,
      ativos,
      pendentes,
      aprovadosHoje,
      receitaAprovada,
    };
  }, [payments, subscriptions]);

  async function loadData() {
    const [subsRes, paymentsRes] = await Promise.all([
      supabase
        .from('billing_subscriptions')
        .select('user_id, provider, status, plan_id, amount_cents, last_payment_status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(300),
      supabase
        .from('billing_payments')
        .select(
          'id, user_id, provider, provider_payment_id, status, amount, currency, payment_method_id, payer_email, processed_at'
        )
        .order('processed_at', { ascending: false })
        .limit(300),
    ]);

    if (subsRes.error) {
      throw subsRes.error;
    }
    if (paymentsRes.error) {
      throw paymentsRes.error;
    }

    setSubscriptions((subsRes.data as SubscriptionRow[]) ?? []);
    setPayments((paymentsRes.data as PaymentRow[]) ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadData();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar assinaturas.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshNow() {
    try {
      setRefreshing(true);
      setError(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar assinaturas.');
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Carregando assinaturas...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-playfair">Assinantes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Painel do super admin com status de assinatura e pagamentos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshNow()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Assinantes</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{metrics.totalAssinantes}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Ativos</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{metrics.ativos}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Pendentes</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{metrics.pendentes}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Pagamentos hoje</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{metrics.aprovadosHoje}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Receita aprovada</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatCurrency(metrics.receitaAprovada)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Assinaturas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ultimo pagamento</th>
                <th className="px-4 py-3">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((row) => (
                <tr key={row.user_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.user_id}</td>
                  <td className="px-4 py-3 text-gray-900">{row.plan_id ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {formatCurrency(
                      row.amount_cents !== null ? row.amount_cents / 100 : null
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusStyle(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.last_payment_status ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(row.updated_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    Nenhuma assinatura encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Pagamentos recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Metodo</th>
                <th className="px-4 py-3">Pagador</th>
                <th className="px-4 py-3">Pagamento ID</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(row.processed_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusStyle(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {formatCurrency(row.amount, row.currency ?? 'BRL')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.payment_method_id ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{row.payer_email ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {row.provider_payment_id}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
