import { useMemo, useState } from 'react';
import { Save, User, Lock, Mail, Phone, Instagram } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabaseClient';

export function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const userMeta = useMemo(
    () => (user?.user_metadata as Record<string, any> | undefined) ?? {},
    [user?.user_metadata]
  );

  const [name, setName] = useState((userMeta.name as string) || '');
  const [email] = useState(user?.email || '');
  const [officialWhatsapp, setOfficialWhatsapp] = useState(
    (userMeta.official_whatsapp as string) || ''
  );
  const [officialInstagram, setOfficialInstagram] = useState(
    (userMeta.official_instagram as string) || ''
  );
  const [officialEmail, setOfficialEmail] = useState(
    (userMeta.official_email as string) || user?.email || ''
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password && password !== confirmPassword) {
      showToast('error', 'As senhas nao conferem.');
      return;
    }

    setSaving(true);
    setSuccessMessage('');

    const metadata = {
      ...userMeta,
      name: name.trim(),
      official_whatsapp: officialWhatsapp.trim(),
      official_instagram: officialInstagram.trim(),
      official_email: officialEmail.trim(),
    };

    const updatePayload: { data: Record<string, any>; password?: string } = {
      data: metadata,
    };

    if (password.trim()) {
      updatePayload.password = password.trim();
    }

    const { error } = await supabase.auth.updateUser(updatePayload);
    setSaving(false);

    if (error) {
      showToast('error', error.message || 'Nao foi possivel atualizar o perfil.');
      return;
    }

    setSuccessMessage('Perfil atualizado com sucesso!');
    showToast('success', 'Perfil atualizado com sucesso.');
    setPassword('');
    setConfirmPassword('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-playfair">Meu Perfil</h1>
        <p className="text-gray-500 mt-2">
          Gerencie suas informacoes pessoais, contatos oficiais e acesso.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center h-fit">
          <div className="w-32 h-32 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 text-4xl font-bold mb-4 shadow-inner">
            {name.substring(0, 2).toUpperCase()}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{name || 'Usuario'}</h2>
          <p className="text-sm text-gray-500 mb-4">Administrador Master</p>
          <div className="w-full border-t border-gray-100 pt-4 mt-2">
            <p className="text-xs text-gray-400">Membro desde</p>
            <p className="text-sm font-medium text-gray-700">Fevereiro de 2026</p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <form onSubmit={handleSave} className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <User className="w-5 h-5 text-yellow-500" />
              Informacoes pessoais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail da conta</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                  />
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2 pt-4">
              <Phone className="w-5 h-5 text-yellow-500" />
              Contatos oficiais (CRM)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp oficial</label>
                <input
                  type="text"
                  value={officialWhatsapp}
                  onChange={(e) => setOfficialWhatsapp(e.target.value)}
                  placeholder="Ex.: +55 11 99999-9999"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail oficial</label>
                <input
                  type="email"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  placeholder="contato@seunegocio.com"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Instagram oficial</label>
                <div className="relative">
                  <Instagram className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={officialInstagram}
                    onChange={(e) => setOfficialInstagram(e.target.value)}
                    placeholder="@seuperfil"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2 pt-4">
              <Lock className="w-5 h-5 text-yellow-500" />
              Seguranca
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nova senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Deixe em branco para manter"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {successMessage && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center animate-fade-in-up">
                {successMessage}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg hover:shadow-yellow-500/30 transition-all transform hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Salvando...' : 'Salvar alteracoes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
