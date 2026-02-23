import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const OAUTH_SIGNUP_INTENT_KEY = 'planejarpro.oauth_signup_intent';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'azure' | null>(null);
  const [error, setError] = useState('');

  const { signIn, signInWithProvider, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'azure') {
    setError('');
    window.localStorage.removeItem(OAUTH_SIGNUP_INTENT_KEY);
    setOauthLoading(provider);
    try {
      await signInWithProvider(provider);
    } catch {
      setError(
        provider === 'google'
          ? 'Não foi possível iniciar login com Google.'
          : 'Não foi possível iniciar login com Microsoft.'
      );
      setOauthLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md relative z-10 border border-gray-100"
      >
        <Link
          to="/"
          className="inline-flex items-center text-gray-400 hover:text-gold-500 transition-colors mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao início
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-playfair font-bold text-gray-900 mb-2">
            Acessar Conta
          </h1>
          <p className="text-gray-500 text-sm">Entre com suas credenciais.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleOAuth('google')}
              disabled={loading || oauthLoading !== null}
              className="w-full h-11 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="w-4 h-4">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"
                  />
                  <path
                    fill="#34A853"
                    d="M3.7 7.6l3.2 2.3c.9-1.8 2.8-3.1 5.1-3.1 1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5c-3.6 0-6.8 2-8.3 5.1z"
                  />
                  <path
                    fill="#4A90E2"
                    d="M12 21.5c2.5 0 4.7-.8 6.3-2.3l-3-2.4c-.8.5-1.9.9-3.3.9-2.5 0-4.5-1.6-5.3-3.9l-3.3 2.5c1.6 3.1 4.8 5.2 8.6 5.2z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.7 13.8c-.2-.5-.3-1.1-.3-1.8s.1-1.2.3-1.8L3.4 7.7C2.8 9 2.5 10.5 2.5 12s.3 3 .9 4.3l3.3-2.5z"
                  />
                </svg>
              )}
              {oauthLoading === 'google' ? 'Conectando...' : 'Google'}
            </button>
            <button
              type="button"
              onClick={() => void handleOAuth('azure')}
              disabled={loading || oauthLoading !== null}
              className="w-full h-11 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {oauthLoading === 'azure' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="w-4 h-4">
                  <path fill="#F35325" d="M2 2h9v9H2z" />
                  <path fill="#81BC06" d="M13 2h9v9h-9z" />
                  <path fill="#05A6F0" d="M2 13h9v9H2z" />
                  <path fill="#FFBA08" d="M13 13h9v9h-9z" />
                </svg>
              )}
              {oauthLoading === 'azure' ? 'Conectando...' : 'Microsoft'}
            </button>
          </div>

          <div className="relative">
            <div className="border-t border-gray-200" />
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2 text-xs text-gray-400">
              ou
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || oauthLoading !== null}
            className="w-full py-4 bg-gold-400 hover:bg-gold-500 text-black font-bold rounded-xl shadow-lg hover:shadow-gold-400/30 transition-all flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar na Plataforma'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600 mb-3">Ainda não tem conta?</p>
          <Link
            to="/cadastro?plano=essencial"
            className="inline-flex items-center justify-center w-full h-11 rounded-xl border border-black text-black font-semibold hover:bg-black hover:text-white transition-colors"
          >
            Criar conta (30 dias no Essencial)
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
