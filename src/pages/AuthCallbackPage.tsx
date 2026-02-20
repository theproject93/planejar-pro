import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

function readProviderError(): string | null {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  return (
    query.get('error_description') ??
    query.get('error') ??
    hash.get('error_description') ??
    hash.get('error') ??
    null
  );
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Concluindo login com Google...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | null = null;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted || !session) return;
      navigate('/dashboard', { replace: true });
    });

    async function finishOAuth() {
      const providerError = readProviderError();
      if (providerError) {
        if (!mounted) return;
        setError(providerError);
        setMessage('Falha ao autenticar com Google.');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        if (mounted) navigate('/dashboard', { replace: true });
        return;
      }

      // Give Supabase time to exchange OAuth code and persist session.
      setMessage('Finalizando sessao...');
      timeoutId = window.setTimeout(async () => {
        if (!mounted) return;
        const { data: afterWait } = await supabase.auth.getSession();
        if (afterWait.session) {
          navigate('/dashboard', { replace: true });
          return;
        }
        setError('Sessao nao foi criada apos o retorno do Google.');
        setMessage('Nao foi possivel entrar automaticamente.');
      }, 4000);
    }

    void finishOAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-lg text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold-500" />
        <p className="mt-4 text-sm text-gray-600">{message}</p>
        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-left">
            <p className="text-xs font-semibold text-rose-700">Detalhe:</p>
            <p className="mt-1 text-xs text-rose-700 break-words">{error}</p>
            <Link
              to="/login"
              className="mt-3 inline-flex text-xs font-semibold text-rose-700 underline"
            >
              Voltar para login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
