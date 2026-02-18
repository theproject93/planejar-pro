import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  CircleDot,
  Clock3,
  Loader2,
  Rocket,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type VendorInfo = {
  vendor_id: string;
  event_id: string;
  vendor_name: string;
  vendor_category: string;
  event_name: string;
  event_date: string;
  status: 'pending' | 'en_route' | 'arrived' | 'done' | null;
  expected_arrival_time?: string | null;
  expected_done_time?: string | null;
  latest_note?: string | null;
  latest_updated_at?: string | null;
};

type VendorHistoryRow = {
  status: 'pending' | 'en_route' | 'arrived' | 'done';
  note: string | null;
  updated_by: 'assessoria' | 'fornecedor';
  created_at: string;
};

const STATUS_LABEL: Record<'pending' | 'en_route' | 'arrived' | 'done', string> = {
  pending: 'Aguardando',
  en_route: 'A caminho',
  arrived: 'Cheguei',
  done: 'Finalizado',
};

const STEPS: Array<'en_route' | 'arrived' | 'done'> = ['en_route', 'arrived', 'done'];

export function VendorCommandCenterPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<VendorInfo | null>(null);
  const [history, setHistory] = useState<VendorHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [tourOpen, setTourOpen] = useState(false);

  const loadVendor = useCallback(async () => {
    if (!token) return;
    const { data, error } = await supabase.rpc('get_vendor_by_token_v2', {
      p_token: token,
    });
    if (!error && data && data.length > 0) {
      setInfo(data[0] as VendorInfo);
      return;
    }

    const fallback = await supabase.rpc('get_vendor_by_token', { p_token: token });
    if (!fallback.error && fallback.data && fallback.data.length > 0) {
      setInfo(fallback.data[0] as VendorInfo);
    }
  }, [token]);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    const { data, error } = await supabase.rpc('get_vendor_status_history_by_token', {
      p_token: token,
    });
    if (!error) {
      setHistory((data as VendorHistoryRow[]) ?? []);
    }
  }, [token]);

  useEffect(() => {
    async function bootstrap() {
      if (!token) return;
      setLoading(true);
      await Promise.all([loadVendor(), loadHistory()]);
      setLoading(false);

      const key = `pp_vendor_onboarding_${token}`;
      if (!localStorage.getItem(key)) {
        setTourOpen(true);
        localStorage.setItem(key, 'seen');
      }
    }

    void bootstrap();
  }, [token, loadVendor, loadHistory]);

  async function updateStatus(status: 'pending' | 'en_route' | 'arrived' | 'done') {
    if (!token) return;
    setSavingStatus(true);
    const note = noteInput.trim();

    const res = await supabase.rpc('update_vendor_status_by_token', {
      p_token: token,
      p_status: status,
      p_note: note || null,
    });

    if (res.error) {
      await supabase.rpc('update_vendor_status_by_token', {
        p_token: token,
        p_status: status,
      });
    }

    setNoteInput('');
    await Promise.all([loadVendor(), loadHistory()]);
    setSavingStatus(false);
  }

  const statusProgress = useMemo(() => {
    const order: Record<'pending' | 'en_route' | 'arrived' | 'done', number> = {
      pending: 0,
      en_route: 1,
      arrived: 2,
      done: 3,
    };
    const current = info?.status ?? 'pending';
    return order[current];
  }, [info?.status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Link invalido.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <p className="text-sm text-gray-300">Portal do Fornecedor</p>
          <h1 className="text-3xl font-bold">{info.vendor_name}</h1>
          <p className="text-gray-300 mt-2">
            {info.event_name} • {new Date(info.event_date).toLocaleDateString('pt-BR')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-200">
            {info.expected_arrival_time && (
              <span className="px-2 py-1 rounded-md bg-white/10 border border-white/15">
                Chegada prevista: {info.expected_arrival_time}
              </span>
            )}
            {info.expected_done_time && (
              <span className="px-2 py-1 rounded-md bg-white/10 border border-white/15">
                Finalizacao prevista: {info.expected_done_time}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white/10 border border-white/10 rounded-2xl p-6 mb-6">
          <p className="text-sm text-gray-200 mb-3">Atualize seu status operacional</p>
          <div
            className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${
              tourOpen
                ? 'relative z-50 ring-4 ring-red-500 ring-offset-4 ring-offset-slate-900 rounded-2xl p-2'
                : ''
            }`}
          >
            {STEPS.map((status, index) => (
              <button
                key={status}
                type="button"
                onClick={() => updateStatus(status)}
                disabled={savingStatus}
                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all border ${
                  info.status === status
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : index <= statusProgress
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                } disabled:opacity-60`}
              >
                {STATUS_LABEL[status]}
              </button>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-300 flex items-center gap-2">
            {info.status === 'arrived' || info.status === 'done' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <CircleDot className="w-4 h-4 text-amber-300" />
            )}
            Status atual: {info.status ? STATUS_LABEL[info.status] : 'Aguardando'}
          </div>

          <div className="mt-4">
            <label className="text-xs text-gray-300">Observacao rapida (opcional)</label>
            <div className="mt-1 flex gap-2">
              <input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Ex: transito intenso, chegada em 20 min"
                className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-gray-300"
              />
              <button
                type="button"
                onClick={() => updateStatus(info.status ?? 'pending')}
                disabled={savingStatus || !noteInput.trim()}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60"
                title="Enviar observacao"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/10 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock3 className="w-4 h-4 text-amber-300" />
            <p className="text-sm font-semibold">Historico de atualizacoes</p>
          </div>
          <div className="space-y-2 max-h-60 overflow-auto pr-1">
            {history.length === 0 && (
              <p className="text-sm text-gray-300">Sem atualizacoes ainda.</p>
            )}
            {history.map((item, idx) => (
              <div key={`${item.created_at}-${idx}`} className="rounded-lg bg-white/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    {STATUS_LABEL[item.status]}
                  </p>
                  <p className="text-xs text-gray-300">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                {item.note && <p className="text-xs text-gray-200 mt-1">{item.note}</p>}
                <p className="text-[11px] text-gray-300 mt-1">
                  Atualizado por: {item.updated_by}
                </p>
              </div>
            ))}
          </div>
          {info.latest_note && (
            <div className="mt-4 rounded-lg bg-emerald-500/15 border border-emerald-300/20 p-3">
              <p className="text-xs text-emerald-100 inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Ultima observacao enviada
              </p>
              <p className="text-sm mt-1 text-white">{info.latest_note}</p>
            </div>
          )}
        </div>
      </div>

      {tourOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm pointer-events-none" />
          <div className="fixed inset-0 z-60 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-gray-900">
              <div className="flex items-center gap-2 text-lg font-bold">
                <Rocket className="w-5 h-5 text-red-500" />
                Portal 2.0
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Atualize etapas e observacoes. A assessoria recebe tudo em tempo real.
              </p>
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setTourOpen(false)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg"
                >
                  Comecar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
