import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  ClipboardCopy,
  Clock,
  Loader2,
  MapPin,
  Rocket,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  location: string | null;
};

type VendorRow = {
  id: string;
  name: string;
  category: string;
  control_token: string | null;
};

type StatusRow = {
  vendor_id: string;
  status: 'pending' | 'en_route' | 'arrived' | 'done';
  created_at: string;
  updated_by: 'assessoria' | 'fornecedor';
};

const STATUS_LABEL: Record<StatusRow['status'], string> = {
  pending: 'Aguardando',
  en_route: 'A caminho',
  arrived: 'Chegou',
  done: 'Finalizado',
};

const STATUS_COLOR: Record<StatusRow['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  en_route: 'bg-blue-100 text-blue-700',
  arrived: 'bg-emerald-100 text-emerald-700',
  done: 'bg-gray-100 text-gray-600',
};

export function EventCommandCenterPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = id ?? '';
  const { user } = useAuth();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [statusRows, setStatusRows] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'assessoria' | 'noivos'>('assessoria');
  const [tourStep, setTourStep] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!eventId || !user) return;
      setLoading(true);

      const [eventRes, vendorRes, statusRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, name, event_date, location')
          .eq('id', eventId)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('event_vendors')
          .select('id, name, category, control_token')
          .eq('event_id', eventId)
          .order('created_at', { ascending: true }),
        supabase
          .from('event_vendor_status')
          .select('vendor_id, status, created_at, updated_by')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false }),
      ]);

      if (!eventRes.error) setEvent(eventRes.data as EventRow);
      if (!vendorRes.error) setVendors((vendorRes.data as VendorRow[]) ?? []);
      if (!statusRes.error) setStatusRows((statusRes.data as StatusRow[]) ?? []);

      setLoading(false);

      const key = `pp_torre_onboarding_${eventId}`;
      if (!localStorage.getItem(key)) {
        setTourOpen(true);
        setTourStep(0);
        localStorage.setItem(key, 'seen');
      }
    }

    loadData();
  }, [eventId, user]);

  const latestStatus = useMemo(() => {
    const map = new Map<string, StatusRow>();
    statusRows.forEach((row) => {
      if (!map.has(row.vendor_id)) {
        map.set(row.vendor_id, row);
      }
    });
    return map;
  }, [statusRows]);

  const alerts = useMemo(() => {
    if (!event?.event_date) return [];
    const today = new Date().toISOString().slice(0, 10);
    if (event.event_date !== today) return [];
    return vendors
      .map((vendor) => {
        const st = latestStatus.get(vendor.id)?.status ?? 'pending';
        if (st === 'arrived' || st === 'done') return null;
        return `${vendor.name} ainda esta ${STATUS_LABEL[st].toLowerCase()}.`;
      })
      .filter(Boolean) as string[];
  }, [event?.event_date, vendors, latestStatus]);

  async function updateStatus(vendorId: string, status: StatusRow['status']) {
    if (!eventId) return;
    await supabase.from('event_vendor_status').insert({
      event_id: eventId,
      vendor_id: vendorId,
      status,
      updated_by: 'assessoria',
    });
    const { data } = await supabase
      .from('event_vendor_status')
      .select('vendor_id, status, created_at, updated_by')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    setStatusRows((data as StatusRow[]) ?? []);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Evento nao encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
              <Link to={`/dashboard/eventos/${event.id}`} className="hover:text-gray-700">
                Voltar ao evento
              </Link>
              <span>•</span>
              <span>Torre de Controle</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Central do Evento</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
              <span className="inline-flex items-center gap-1">
                <Users className="w-4 h-4" />
                {event.name}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(event.event_date).toLocaleDateString('pt-BR')}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {event.location ?? 'Sem local'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('assessoria')}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                mode === 'assessoria'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Modo Assessoria
            </button>
            <button
              type="button"
              onClick={() => setMode('noivos')}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                mode === 'noivos'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Modo Noivos
            </button>
          </div>
        </div>

        {mode === 'assessoria' && alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((message) => (
              <div
                key={message}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800"
              >
                <AlertTriangle className="w-4 h-4" />
                {message}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {vendors.map((vendor, index) => {
            const current = latestStatus.get(vendor.id)?.status ?? 'pending';
            const shareUrl = vendor.control_token
              ? `${window.location.origin}/torre/${vendor.control_token}`
              : '';
            const highlightButtons =
              tourOpen && tourStep === 0 && index === 0
                ? 'relative z-50 ring-4 ring-red-500 ring-offset-4'
                : '';
            const highlightShare =
              tourOpen && tourStep === 1 && index === 0
                ? 'relative z-50 ring-4 ring-red-500 ring-offset-4'
                : '';

            return (
              <div
                key={vendor.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
                    <p className="text-sm text-gray-500">{vendor.category}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[current]}`}
                  >
                    {STATUS_LABEL[current]}
                  </span>
                </div>

                <div
                  className={`mt-4 grid grid-cols-2 gap-2 ${highlightButtons}`}
                >
                  {(['en_route', 'arrived', 'done'] as StatusRow['status'][]).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateStatus(vendor.id, status)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
                          current === status
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {STATUS_LABEL[status]}
                      </button>
                    )
                  )}
                </div>

                {mode === 'assessoria' && shareUrl && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(shareUrl)}
                      className={`inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 ${highlightShare}`}
                    >
                      <ClipboardCopy className="w-4 h-4" />
                      Copiar link do fornecedor
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {mode === 'noivos' && (
          <div className="mt-10 bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-emerald-800">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="w-5 h-5" />
              Tudo sob controle
            </div>
            <p className="text-sm mt-2">
              O time da assessoria esta monitorando cada fornecedor. Aproveite o
              seu momento.
            </p>
          </div>
        )}
      </div>

      {tourOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pointer-events-none" />
          <div className="fixed inset-0 z-60 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
              <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Rocket className="w-5 h-5 text-red-500" />
                Torre de Controle
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {tourStep === 0
                  ? 'Use estes botoes para marcar o status de cada fornecedor em tempo real.'
                  : 'Envie este link para o fornecedor atualizar o status sem te chamar.'}
              </p>
              <div className="flex justify-end gap-2 mt-6">
                {tourStep === 0 ? (
                  <button
                    type="button"
                    onClick={() => setTourStep(1)}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg"
                  >
                    Entendi
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTourOpen(false)}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg"
                  >
                    Comecar
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
