import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Save, User, Lock, Mail } from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();

  // Estados para o formulário
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Simulação de salvamento
    if (password && password !== confirmPassword) {
      alert('As senhas não conferem!');
      return;
    }

    // Aqui chamaríamos uma API para atualizar no banco de dados
    console.log('Salvando perfil...', { name, email, password });

    setSuccessMessage('Perfil atualizado com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-playfair">
          Meu Perfil
        </h1>
        <p className="text-gray-500 mt-2">
          Gerencie suas informações pessoais e de acesso.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda: Cartão de Perfil Visual */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center h-fit">
          <div className="w-32 h-32 rounded-full bg-gold-100 flex items-center justify-center text-gold-600 text-4xl font-bold mb-4 shadow-inner">
            {name.substring(0, 2).toUpperCase()}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{name}</h2>
          <p className="text-sm text-gray-500 mb-4">Administrador Master</p>
          <div className="w-full border-t border-gray-100 pt-4 mt-2">
            <p className="text-xs text-gray-400">Membro desde</p>
            <p className="text-sm font-medium text-gray-700">
              Fevereiro de 2026
            </p>
          </div>
        </div>

        {/* Coluna Direita: Formulário de Edição */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <form onSubmit={handleSave} className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <User className="w-5 h-5 text-gold-500" />
              Informações Pessoais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    disabled // Email geralmente não se muda fácil
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                  />
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2 pt-4">
              <Lock className="w-5 h-5 text-gold-500" />
              Segurança
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Deixe em branco para manter"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Mensagem de Sucesso */}
            {successMessage && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center animate-fade-in-up">
                ✅ {successMessage}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="flex items-center px-6 py-3 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-xl shadow-lg hover:shadow-gold-500/30 transition-all transform hover:-translate-y-1"
              >
                <Save className="w-5 h-5 mr-2" />
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
