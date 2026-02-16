import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Lock, Mail, Loader2, ArrowLeft } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Cadastro realizado! Verifique seu e-mail para confirmar.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/app');
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-400 hover:text-yellow-600 mb-8 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" />
          Voltar para Home
        </Link>

        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <span className="text-yellow-500 font-bold text-2xl font-serif">
              P
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isSignUp ? 'Criar conta exclusiva' : 'Bem-vindo de volta'}
          </h1>
          <p className="text-gray-500 mt-2 font-light">
            {isSignUp
              ? 'Inicie sua jornada de excelência.'
              : 'Acesse seu painel de controle.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-900 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 border border-transparent hover:border-yellow-500/50"
          >
            {loading ? (
              <Loader2 className="animate-spin text-yellow-500" size={20} />
            ) : isSignUp ? (
              'Criar conta'
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          {isSignUp ? 'Já é membro?' : 'Ainda não é membro?'}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-2 text-yellow-600 font-bold hover:text-yellow-700 hover:underline focus:outline-none"
          >
            {isSignUp ? 'Fazer Login' : 'Solicitar acesso'}
          </button>
        </div>
      </div>
    </div>
  );
}
