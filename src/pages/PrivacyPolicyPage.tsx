import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
  const updateDate = '17 de fevereiro de 2026';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-gold-700 hover:text-gold-600 mb-6"
        >
          Voltar para a página inicial
        </Link>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-10 shadow-sm space-y-8">
          <header className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold font-playfair">
              Política de Privacidade
            </h1>
            <p className="text-sm text-gray-500">Última atualização: {updateDate}</p>
          </header>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">1. Dados coletados</h2>
            <p className="text-gray-700 leading-relaxed">
              Podemos coletar dados de cadastro, informações de navegação e
              preferências de uso para permitir o funcionamento da plataforma e
              melhorar a experiência do usuário.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">2. Uso de cookies</h2>
            <p className="text-gray-700 leading-relaxed">
              Utilizamos cookies essenciais para autenticação e segurança, e
              cookies de desempenho para entender como os recursos são usados.
              Você pode limpar os cookies no seu navegador a qualquer momento.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">3. Finalidade do tratamento</h2>
            <p className="text-gray-700 leading-relaxed">
              Os dados são tratados para operar o Planejar Pro, permitir acesso
              à conta, oferecer suporte, prevenir fraudes e evoluir nossos
              serviços.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">4. Compartilhamento de dados</h2>
            <p className="text-gray-700 leading-relaxed">
              Não vendemos dados pessoais. O compartilhamento pode ocorrer com
              provedores necessários para hospedagem, autenticação e
              infraestrutura, sempre com medidas de segurança adequadas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">5. Direitos do titular</h2>
            <p className="text-gray-700 leading-relaxed">
              Você pode solicitar acesso, correção ou exclusão de dados
              pessoais, conforme aplicável pela legislação vigente.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">6. Contato</h2>
            <p className="text-gray-700 leading-relaxed">
              Para dúvidas sobre esta política, entre em contato pelo canal de
              suporte oficial da plataforma.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
