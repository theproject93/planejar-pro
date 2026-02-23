import { useEffect, useState } from 'react';
import { type Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const OAUTH_SIGNUP_INTENT_KEY = 'planejarpro.oauth_signup_intent';
const OAUTH_SIGNUP_INTENT_MAX_AGE_MS = 1000 * 60 * 15;

type OAuthSignupIntent = {
  source: 'signup';
  createdAt: number;
  planId: 'essencial' | 'profissional' | 'elite';
  trialDays: number;
};

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

function readSignupIntentFromStorage(): OAuthSignupIntent | null {
  const raw = window.localStorage.getItem(OAUTH_SIGNUP_INTENT_KEY);
  if (!raw) return null;

  window.localStorage.removeItem(OAUTH_SIGNUP_INTENT_KEY);

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.source !== 'signup') return null;

    const createdAt =
      typeof parsed.createdAt === 'number' && Number.isFinite(parsed.createdAt)
        ? parsed.createdAt
        : 0;
    if (createdAt <= 0) return null;
    if (Date.now() - createdAt > OAUTH_SIGNUP_INTENT_MAX_AGE_MS) return null;

    const planId = parsed.planId;
    if (
      planId !== 'essencial' &&
      planId !== 'profissional' &&
      planId !== 'elite'
    ) {
      return null;
    }

    const rawTrialDays =
      typeof parsed.trialDays === 'number' && Number.isFinite(parsed.trialDays)
        ? Math.floor(parsed.trialDays)
        : 0;
    const normalizedTrialDays = planId === 'essencial' && rawTrialDays > 0 ? rawTrialDays : 0;

    return {
      source: 'signup',
      createdAt,
      planId,
      trialDays: normalizedTrialDays,
    };
  } catch {
    return null;
  }
}

async function applySignupIntentToUser(session: Session) {
  const intent = readSignupIntentFromStorage();
  if (!intent) return;

  const metadata =
    (session.user.user_metadata as Record<string, unknown> | undefined) ?? {};
  const currentPlan =
    typeof metadata.plan_interest === 'string' ? metadata.plan_interest : null;
  const currentTrialDays =
    typeof metadata.trial_days === 'number' && Number.isFinite(metadata.trial_days)
      ? Math.floor(metadata.trial_days)
      : 0;

  if (currentPlan === intent.planId && currentTrialDays === intent.trialDays) {
    return;
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      plan_interest: intent.planId,
      trial_days: intent.trialDays,
    },
  });

  if (error) {
    console.error('[AuthCallback] falha ao aplicar plano inicial do cadastro:', error.message);
  }
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Concluindo login com Google...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | null = null;
    let finalizing = false;

    async function finalizeSession(session: Session) {
      if (!mounted || finalizing) return;
      finalizing = true;

      setMessage('Finalizando sessao...');
      await applySignupIntentToUser(session);

      if (mounted) {
        navigate('/dashboard', { replace: true });
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted || !session) return;
      void finalizeSession(session);
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
        await finalizeSession(sessionData.session);
        return;
      }

      // Give Supabase time to exchange OAuth code and persist session.
      setMessage('Finalizando sessao...');
      timeoutId = window.setTimeout(async () => {
        if (!mounted) return;
        const { data: afterWait } = await supabase.auth.getSession();
        if (afterWait.session) {
          await finalizeSession(afterWait.session);
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
