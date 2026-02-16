import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  LayoutDashboard,
  DollarSign,
  Calendar,
  ArrowRight,
  Menu,
} from 'lucide-react';
import { useState } from 'react';

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navbar com Glassmorphism */}
      <nav className="fixed w-full z-50 top-0 start-0 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between p-4">
          <Link
            to="/"
            className="flex items-center space-x-2 rtl:space-x-reverse"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <span className="self-center text-xl font-bold whitespace-nowrap text-gray-900">
              Planejar Pro
            </span>
          </Link>

          <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
            <Link to="/login">
              <button
                type="button"
                className="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-all shadow-lg hover:shadow-indigo-500/30"
              >
                Acessar Plataforma
              </button>
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none"
            >
              <Menu />
            </button>
          </div>

          <div
            className={`items-center justify-between w-full md:flex md:w-auto md:order-1 ${isMenuOpen ? 'block' : 'hidden'}`}
          >
            <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-transparent">
              <li>
                <a
                  href="#hero"
                  className="block py-2 px-3 text-indigo-600 md:p-0"
                  aria-current="page"
                >
                  Início
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="block py-2 px-3 text-gray-900 hover:text-indigo-600 md:p-0 transition-colors"
                >
                  Recursos
                </a>
              </li>
              <li>
                <a
                  href="#sobre"
                  className="block py-2 px-3 text-gray-900 hover:text-indigo-600 md:p-0 transition-colors"
                >
                  Sobre
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="hero"
        className="pt-32 pb-20 bg-gradient-to-b from-indigo-50 to-white"
      >
        <div className="px-4 mx-auto max-w-7xl text-center">
          <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-3 py-1 rounded-full mb-6 inline-block border border-indigo-200">
            🚀 A ferramenta definitiva para cerimonialistas
          </span>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-6xl lg:text-7xl">
            Organize eventos com <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              precisão e tecnologia
            </span>
          </h1>
          <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48">
            Diga adeus às planilhas bagunçadas. Tenha controle total de tarefas,
            fornecedores e orçamentos em um único lugar.
          </p>
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
            <Link
              to="/login"
              className="inline-flex justify-center items-center py-4 px-8 text-base font-medium text-center text-white rounded-xl bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 transition-all shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-1"
            >
              Começar Grátis
              <ArrowRight className="ml-2 -mr-1 w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex justify-center items-center py-4 px-8 text-base font-medium text-center text-gray-900 rounded-xl border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 transition-all"
            >
              Ver Recursos
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="py-8 px-4 mx-auto max-w-7xl sm:py-16 lg:px-6">
          <div className="max-w-screen-md mb-8 lg:mb-16">
            <h2 className="mb-4 text-4xl tracking-tight font-extrabold text-gray-900">
              Tudo o que você precisa para entregar o evento perfeito
            </h2>
            <p className="text-gray-500 sm:text-xl">
              Desenvolvido pensando na rotina real de quem organiza sonhos.
            </p>
          </div>
          <div className="space-y-8 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-12 md:space-y-0">
            {/* Card 1 */}
            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="flex justify-center items-center mb-4 w-12 h-12 rounded-lg bg-indigo-100 text-indigo-600">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Dashboard Intuitivo</h3>
              <p className="text-gray-500">
                Visão geral de todos os seus eventos ativos, próximos prazos e
                pendências críticas.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="flex justify-center items-center mb-4 w-12 h-12 rounded-lg bg-purple-100 text-purple-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">
                Checklists Inteligentes
              </h3>
              <p className="text-gray-500">
                Modelos prontos de tarefas para Casamentos, 15 Anos e
                Corporativos. Nunca esqueça um detalhe.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="flex justify-center items-center mb-4 w-12 h-12 rounded-lg bg-green-100 text-green-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Controle Financeiro</h3>
              <p className="text-gray-500">
                Acompanhe orçamentos, pagamentos realizados e pendentes de cada
                cliente.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="flex justify-center items-center mb-4 w-12 h-12 rounded-lg bg-pink-100 text-pink-600">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Agenda Integrada</h3>
              <p className="text-gray-500">
                Sincronize visitas técnicas, reuniões e datas de eventos em um
                só lugar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Simples */}
      <footer className="p-4 bg-white md:p-8 lg:p-10 border-t border-gray-200">
        <div className="mx-auto max-w-screen-xl text-center">
          <Link
            to="/"
            className="flex justify-center items-center text-2xl font-semibold text-gray-900 mb-4"
          >
            Planejar Pro
          </Link>
          <p className="my-6 text-gray-500">
            Feito com ❤️ para facilitar a vida de quem organiza eventos.
          </p>
          <span className="text-sm text-gray-500 sm:text-center">
            © 2026 Planejar Pro. Todos os direitos reservados.
          </span>
        </div>
      </footer>
    </div>
  );
}
