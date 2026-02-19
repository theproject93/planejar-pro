import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Eye, RefreshCw, ServerCrash } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { trackRpcFailure } from '../lib/observability';

type HealthSummary = {
  total_events: number;
  page_views: number;
  rpc_errors: number;
  frontend_errors: number;
};

type TopErrorByScreen = {
  screen: string;
  count: number;
};

type TopRpcFailure = {
  scope: string;
  action: string;
  count: number;
};

type TopPageView = {
  path: string;
  count: number;
};

type HealthDashboardPayload = {
  window_days: number;
  generated_at: string;
  summary: HealthSummary;
  top_errors_by_screen: TopErrorByScreen[];
  top_rpc_failures: TopRpcFailure[];
  top_page_views: TopPageView[];
};

const EMPTY_PAYLOAD: HealthDashboardPayload = {
  window_days: 7,
  generated_at: '',
  summary: {
    total_events: 0,
    page_views: 0,
    rpc_errors: 0,
    frontend_errors: 0,
  },
  top_errors_by_screen: [],
  top_rpc_failures: [],
  top_page_views: [],
};

function normalizePayload(raw: unknown): HealthDashboardPayload {
  const source = (raw as Record<string, any> | null) ?? {};
  return {
    window_days: Number(source.window_days ?? 7),
    generated_at: String(source.generated_at ?? ''),
    summary: {
      total_events: Number(source.summary?.total_events ?? 0),
      page_views: Number(source.summary?.page_views ?? 0),
      rpc_errors: Number(source.summary?.rpc_errors ?? 0),
      frontend_errors: Number(source.summary?.frontend_errors ?? 0),
    },
    top_errors_by_screen: Array.isArray(source.top_errors_by_screen)
      ? source.top_errors_by_screen.map((item: any) => ({
          screen: String(item.screen ?? 'desconhecida'),
          count: Number(item.count ?? 0),
        }))
      : [],
    top_rpc_failures: Array.isArray(source.top_rpc_failures)
      ? source.top_rpc_failures.map((item: any) => ({
          scope: String(item.scope ?? 'desconhecido'),
          action: String(item.action ?? 'acao_desconhecida'),
          count: Number(item.count ?? 0),
        }))
      : [],
    top_page_views: Array.isArray(source.top_page_views)
      ? source.top_page_views.map((item: any) => ({
          path: String(item.path ?? 'sem_path'),
          count: Number(item.count ?? 0),
        }))
      : [],
  };
}

export function OperationalHealthPage() {
  const [windowDays, setWindowDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [payload, setPayload] = useState<HealthDashboardPayload>(EMPTY_PAYLOAD);

  async function loadDashboard(days: number) {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.rpc('get_operational_health_dashboard', {
      p_window_days: days,
    });

    if (error) {
      trackRpcFailure('operational_health', 'get_operational_health_dashboard', error);
      setErrorMsg(error.message || 'Nao foi possivel carregar o dashboard de saude.');
      setLoading(false);
      return;
    }

    setPayload(normalizePayload(data));
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard(windowDays);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [windowDays]);

  const generatedAtLabel = useMemo(() => {
    if (!payload.generated_at) return '-';
    const date = new Date(payload.generated_at);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
  }, [payload.generated_at]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saude Operacional</h1>
          <p className="text-sm text-gray-500 mt-1">
            Erros por tela, falhas de RPC e volume de page views.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value))}
            className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
          >
            <option value={1}>Ultimas 24h</option>
            <option value={7}>Ultimos 7 dias</option>
          </select>
          <button
            type="button"
            onClick={() => void loadDashboard(windowDays)}
            className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium inline-flex items-center gap-2 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">Gerado em: {generatedAtLabel}</p>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Eventos</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loading ? '...' : payload.summary.total_events}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Page views</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">
            {loading ? '...' : payload.summary.page_views}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Falhas RPC</p>
          <p className="text-2xl font-bold text-amber-700 mt-2">
            {loading ? '...' : payload.summary.rpc_errors}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Erros Front</p>
          <p className="text-2xl font-bold text-rose-700 mt-2">
            {loading ? '...' : payload.summary.frontend_errors}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="rounded-2xl border border-gray-100 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            Top 5 erros por tela
          </h2>
          <div className="mt-3 space-y-2">
            {!loading && payload.top_errors_by_screen.length === 0 && (
              <p className="text-sm text-gray-500">Sem erros no periodo.</p>
            )}
            {payload.top_errors_by_screen.map((item) => (
              <div
                key={item.screen}
                className="rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3"
              >
                <p className="text-sm text-gray-700 truncate">{item.screen}</p>
                <span className="text-sm font-semibold text-rose-700">{item.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2">
            <ServerCrash className="w-4 h-4 text-amber-500" />
            Falhas RPC por acao
          </h2>
          <div className="mt-3 space-y-2">
            {!loading && payload.top_rpc_failures.length === 0 && (
              <p className="text-sm text-gray-500">Sem falhas RPC no periodo.</p>
            )}
            {payload.top_rpc_failures.map((item) => (
              <div
                key={`${item.scope}-${item.action}`}
                className="rounded-xl border border-gray-100 p-3"
              >
                <p className="text-xs text-gray-500">{item.scope}</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-800 truncate">{item.action}</p>
                  <span className="text-sm font-semibold text-amber-700">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            Page views principais
          </h2>
          <div className="mt-3 space-y-2">
            {!loading && payload.top_page_views.length === 0 && (
              <p className="text-sm text-gray-500">Sem page views no periodo.</p>
            )}
            {payload.top_page_views.map((item) => (
              <div
                key={item.path}
                className="rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3"
              >
                <p className="text-sm text-gray-700 truncate">{item.path}</p>
                <span className="text-sm font-semibold text-blue-700">{item.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-500" />
          Leitura rapida
        </h2>
        <ul className="mt-3 text-sm text-gray-600 space-y-1">
          <li>Priorize primeiro erros frontend recorrentes em telas de fluxo critico.</li>
          <li>Depois trate as acoes RPC com maior volume de falha.</li>
          <li>Use o ranking de page views para focar no que mais impacta o usuario.</li>
        </ul>
      </div>
    </div>
  );
}
