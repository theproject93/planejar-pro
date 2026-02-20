import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Concluindo login com provedor...');

  useEffect(() => {
    let mounted = true;

    async function finishOAuth() {
      const params = new URLSearchParams(window.location.search);
      const providerError =
        params.get('error_description') ?? params.get('error') ?? null;

      if (providerError) {
        if (mounted) {
          setMessage('Não foi possível concluir login com Google. Tente novamente.');
          window.setTimeout(() => navigate('/login', { replace: true }), 1200);
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        if (mounted) navigate('/dashboard', { replace: true });
        return;
      }

      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session) {
        if (mounted) navigate('/dashboard', { replace: true });
        return;
      }

      if (mounted) {
        setMessage('Sessão não encontrada. Redirecionando para login...');
        window.setTimeout(() => navigate('/login', { replace: true }), 1200);
      }
    }

    void finishOAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-lg text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold-500" />
        <p className="mt-4 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}
