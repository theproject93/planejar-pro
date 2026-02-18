import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, CircleDot, Loader2, Rocket } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type VendorInfo = {
  vendor_id: string;
  event_id: string;
  vendor_name: string;
  vendor_category: string;
  event_name: string;
  event_date: string;
  status: 'pending' | 'en_route' | 'arrived' | 'done' | null;
};

const STATUS_LABEL: Record<'pending' | 'en_route' | 'arrived' | 'done', string> = {
  pending: 'Aguardando',
  en_route: 'A caminho',
  arrived: 'Cheguei',
  done: 'Finalizado',
};

export function VendorCommandCenterPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<VendorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    async function loadVendor() {
      if (!token) return;
      setLoading(true);
      const { data, error } = await supabase.rpc('get_vendor_by_token', {
        p_token: token,
      });
      if (!error && data && data.length > 0) {
        setInfo(data[0] as VendorInfo);
      }
      setLoading(false);

      const key = `pp_vendor_onboarding_${token}`;
      if (!localStorage.getItem(key)) {
        setTourOpen(true);
        localStorage.setItem(key, 'seen');
      }
    }

    loadVendor();
  }, [token]);

  async function updateStatus(status: 'pending' | 'en_route' | 'arrived' | 'done') {
    if (!token) return;
    await supabase.rpc('update_vendor_status_by_token', {
      p_token: token,
      p_status: status,
    });
    const { data } = await supabase.rpc('get_vendor_by_token', {
      p_token: token,
    });
    if (data && data.length > 0) setInfo(data[0] as VendorInfo);
  }

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
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-sm text-gray-300">Central do Evento</p>
          <h1 className="text-3xl font-bold">{info.vendor_name}</h1>
          <p className="text-gray-300 mt-2">
            {info.event_name} •{' '}
            {new Date(info.event_date).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="bg-white/10 border border-white/10 rounded-2xl p-6">
          <p className="text-sm text-gray-200 mb-3">Atualize seu status</p>
          <div className={`grid grid-cols-2 gap-3 ${tourOpen ? 'relative z-50 ring-4 ring-red-500 ring-offset-4 ring-offset-slate-900 rounded-2xl p-2' : ''}`}>
            {(['en_route', 'arrived', 'done'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => updateStatus(status)}
                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                  info.status === status
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
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
        </div>
      </div>

      {tourOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm pointer-events-none" />
          <div className="fixed inset-0 z-60 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-gray-900">
              <div className="flex items-center gap-2 text-lg font-bold">
                <Rocket className="w-5 h-5 text-red-500" />
                Bem-vindo
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Clique nos botoes para informar seu status. Isso ajuda a assessoria
                a manter tudo sincronizado.
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
