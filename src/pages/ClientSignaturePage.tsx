import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type SignPayload = {
  request_id: string;
  client_name: string;
  client_email: string | null;
  document_title: string;
  document_content: string;
  status: string;
  expires_at: string | null;
};

export function ClientSignaturePage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SignPayload | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) {
        setError('Link invalido.');
        setLoading(false);
        return;
      }
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_signature_request_by_token',
        { p_token: token }
      );
      if (rpcError) {
        setError('Nao foi possivel abrir o documento.');
      } else if (Array.isArray(rpcData) && rpcData[0]) {
        setData(rpcData[0] as SignPayload);
      } else {
        setError('Este link expirou ou nao esta mais disponivel.');
      }
      setLoading(false);
    }
    void load();
  }, [token]);

  async function signNow() {
    if (!token || !accepted || !signerName.trim()) return;
    const { data: ok, error: rpcError } = await supabase.rpc(
      'sign_signature_request_by_token',
      {
        p_token: token,
        p_signer_name: signerName.trim(),
        p_signer_email: signerEmail.trim() || null,
      }
    );
    if (rpcError || !ok) {
      setError('Nao foi possivel concluir a assinatura.');
      return;
    }
    setDone(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Assinatura de contrato</h1>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        {done && !error && (
          <p className="text-sm text-emerald-700 font-semibold">
            Assinatura concluida com sucesso.
          </p>
        )}
        {data && !done && (
          <>
            <p className="text-sm text-gray-600">
              Cliente: <b>{data.client_name}</b>
            </p>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900 mb-2">{data.document_title}</p>
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {data.document_content}
              </pre>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Seu nome completo"
                className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
              />
              <input
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="Seu email (opcional)"
                className="h-10 rounded-xl border border-gray-200 px-3 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              Li e concordo com os termos acima.
            </label>
            <button
              onClick={() => void signNow()}
              disabled={!accepted || !signerName.trim()}
              className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-60"
            >
              Assinar contrato
            </button>
          </>
        )}
      </div>
    </div>
  );
}
