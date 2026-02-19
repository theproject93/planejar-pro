import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type PortfolioSharePayload = {
  title: string;
  pdf_url: string;
  sender_name: string | null;
  sender_email: string | null;
  sender_whatsapp: string | null;
  sender_instagram: string | null;
  created_at: string;
};

export function PortfolioPublicPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<PortfolioSharePayload | null>(null);

  useEffect(() => {
    async function loadShare() {
      if (!token) {
        setError('Link invalido.');
        setLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc(
        'get_portfolio_share_by_token',
        { p_token: token }
      );

      if (rpcError) {
        setError('Nao foi possivel abrir o portfolio.');
      } else if (Array.isArray(data) && data[0]) {
        setShare(data[0] as PortfolioSharePayload);
      } else {
        setError('Este link expirou ou nao existe.');
      }

      setLoading(false);
    }

    void loadShare();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">
            {share?.title || 'Portfolio'}
          </h1>
          {error && <p className="text-sm text-rose-700 mt-2">{error}</p>}
          {share && (
            <p className="text-xs text-gray-500 mt-1">
              Publicado em {new Date(share.created_at).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        {share && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
            <div className="h-[75vh] border-r border-gray-100">
              <iframe
                src={share.pdf_url}
                title="Portfolio PDF"
                className="w-full h-full"
              />
            </div>
            <aside className="p-4">
              <h2 className="text-sm font-semibold text-gray-900">Contato</h2>
              <div className="mt-2 text-sm text-gray-700 space-y-1">
                <p>{share.sender_name || '-'}</p>
                <p>{share.sender_email || '-'}</p>
                <p>{share.sender_whatsapp || '-'}</p>
                <p>{share.sender_instagram || '-'}</p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
