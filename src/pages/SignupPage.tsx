import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PLAN_OPTIONS = [
  {
    id: 'essencial',
    name: 'Essencial',
    price: 'R$ 39/mês',
    featured: false,
    notes: ['Checklist e cronograma', 'Financeiro por evento', 'Gestão principal'],
  },
  {
    id: 'profissional',
    name: 'Profissional',
    price: 'R$ 59/mês',
    notes: ['Tudo do Essencial', 'Equipe e fornecedores avançado', 'Mais automações com IA'],
    featured: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 'R$ 89/mês',
    featured: false,
    notes: ['Operação multi-eventos', 'Prioridade de suporte', 'Escala para equipes'],
  },
] as const;

export function SignupPage() {
  const { signUp, signInWithProvider } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>('profissional');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'azure' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedPlanLabel = useMemo(
    () => PLAN_OPTIONS.find((p) => p.id === selectedPlan)?.name ?? 'Profissional',
    [selectedPlan]
  );

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    if (password.length < 6) {
      setError('Use uma senha com pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name || undefined);
      setSuccess(
        `Conta criada com sucesso no plano ${selectedPlanLabel}. Você já está no teste grátis de 30 dias com acesso completo.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível criar sua conta agora.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'azure') {
    setError('');
    setSuccess('');
    setOauthLoading(provider);
    try {
      await signInWithProvider(provider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao conectar com provedor.';
      setError(message);
      setOauthLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <Link to="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-gold-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para login
        </Link>

        <div className="rounded-3xl bg-white border border-gray-100 shadow-xl overflow-hidden">
          <div className="p-8 md:p-10 border-b border-gray-100 bg-gradient-to-r from-black to-gray-900 text-white">
            <p className="text-gold-300 text-xs font-semibold uppercase tracking-widest">Teste Grátis</p>
            <h1 className="mt-2 text-3xl font-playfair font-bold">Acesso completo por 30 dias</h1>
            <p className="mt-2 text-sm text-gray-200">
              Escolha o plano agora, mas use tudo sem limite durante 30 dias. Cancele quando quiser.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-0">
            <div className="p-8 md:p-10 border-r border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Planos da plataforma</h2>
              <div className="grid gap-3">
                {PLAN_OPTIONS.map((plan) => {
                  const selected = plan.id === selectedPlan;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`text-left rounded-2xl border p-4 transition-all ${
                        selected
                          ? 'border-gold-400 bg-gold-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                          <p className="text-xl font-bold text-gray-900 mt-1">{plan.price}</p>
                          <p className="text-xs text-gray-500 mt-1">após os 30 dias grátis</p>
                        </div>
                        {plan.featured && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gold-400 text-black">
                            MAIS VENDIDO
                          </span>
                        )}
                      </div>
                      <ul className="mt-3 space-y-1">
                        {plan.notes.map((item) => (
                          <li key={item} className="text-xs text-gray-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-8 md:p-10 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Criar conta</h2>
              <p className="text-sm text-gray-500 mb-5">Você pode criar com formulário ou sincronizar com Google/Microsoft.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => void handleOAuth('google')}
                  disabled={oauthLoading !== null}
                  className="h-11 rounded-xl border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-100 disabled:opacity-60"
                >
                  {oauthLoading === 'google' ? 'Conectando...' : 'Continuar com Google'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleOAuth('azure')}
                  disabled={oauthLoading !== null}
                  className="h-11 rounded-xl border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-100 disabled:opacity-60"
                >
                  {oauthLoading === 'azure' ? 'Conectando...' : 'Continuar com Microsoft'}
                </button>
              </div>

              <div className="relative my-4">
                <div className="border-t border-gray-200" />
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-50 px-2 text-xs text-gray-400">
                  ou
                </span>
              </div>

              <form onSubmit={handleSignUp} className="space-y-3">
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm"
                />
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm"
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm"
                />
                <input
                  type="password"
                  placeholder="Confirmar senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm"
                />

                {error && <p className="text-sm text-rose-600">{error}</p>}
                {success && <p className="text-sm text-emerald-700">{success}</p>}

                <button
                  type="submit"
                  disabled={loading || oauthLoading !== null}
                  className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 disabled:opacity-60 inline-flex items-center justify-center"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar conta e iniciar teste de 30 dias'}
                </button>
              </form>

              <p className="text-xs text-gray-500 mt-4">
                Plano selecionado: <span className="font-semibold text-gray-700">{selectedPlanLabel}</span>.
                O acesso permanece completo durante os 30 dias grátis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
