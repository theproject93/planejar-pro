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
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-yellow-200">
      {/* Navbar com Glassmorphism */}
      <nav className="fixed w-full z-50 top-0 start-0 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between p-4">
          <Link
            to="/"
            className="flex items-center space-x-3 rtl:space-x-reverse"
          >
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-yellow-500 font-bold text-2xl font-serif">
                P
              </span>
            </div>
            <span className="self-center text-xl font-bold whitespace-nowrap text-gray-900 tracking-tight">
              Planejar Pro
            </span>
          </Link>

          <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
            <Link to="/login">
              <button
                type="button"
                className="text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-6 py-2.5 text-center transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 border border-transparent hover:border-yellow-500/50"
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
                  className="block py-2 px-3 text-yellow-600 md:p-0 font-semibold"
                  aria-current="page"
                >
                  Início
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="block py-2 px-3 text-gray-900 hover:text-yellow-600 md:p-0 transition-colors"
                >
                  Recursos
                </a>
              </li>
              <li>
                <a
                  href="#sobre"
                  className="block py-2 px-3 text-gray-900 hover:text-yellow-600 md:p-0 transition-colors"
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
        className="pt-32 pb-24 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-50 via-white to-white"
      >
        <div className="px-4 mx-auto max-w-7xl text-center">
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full mb-6 inline-block border border-yellow-200 uppercase tracking-wide">
            ✨ Exclusivo para Cerimonialistas
          </span>
          <h1 className="mb-6 text-5xl font-extrabold tracking-tight leading-tight text-gray-900 md:text-6xl lg:text-7xl">
            A excelência que seus <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700">
              eventos merecem
            </span>
          </h1>
          <p className="mb-10 text-lg font-light text-gray-600 lg:text-xl sm:px-16 lg:px-48 leading-relaxed">
            Eleve o nível da sua assessoria. Gestão impecável, checklists
            precisos e controle financeiro, tudo em uma interface sofisticada.
          </p>
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
            <Link
              to="/login"
              className="inline-flex justify-center items-center py-4 px-8 text-base font-bold text-center text-white rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 focus:ring-4 focus:ring-yellow-300 transition-all shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-1"
            >
              Começar Agora
              <ArrowRight className="ml-2 -mr-1 w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex justify-center items-center py-4 px-8 text-base font-medium text-center text-gray-900 rounded-xl border border-gray-200 hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition-all"
            >
              Conhecer Detalhes
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="py-8 px-4 mx-auto max-w-7xl sm:py-16 lg:px-6">
          <div className="max-w-screen-md mb-12 lg:mb-16">
            <h2 className="mb-4 text-4xl tracking-tight font-extrabold text-gray-900">
              Sofisticação em cada detalhe
            </h2>
            <p className="text-gray-500 sm:text-xl font-light">
              Ferramentas poderosas desenhadas para quem não aceita menos que a
              perfeição.
            </p>
          </div>
          <div className="space-y-8 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-12 md:space-y-0">
            {/* Card 1 */}
            <div className="group p-8 bg-white rounded-2xl border border-gray-100 hover:border-yellow-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-center items-center mb-6 w-14 h-14 rounded-xl bg-gray-50 text-gray-900 group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                <LayoutDashboard className="w-7 h-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Dashboard Executivo
              </h3>
              <p className="text-gray-500 font-light leading-relaxed">
                Tenha uma visão panorâmica e elegante de todos os seus projetos
                em andamento.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group p-8 bg-white rounded-2xl border border-gray-100 hover:border-yellow-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-center items-center mb-6 w-14 h-14 rounded-xl bg-gray-50 text-gray-900 group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Checklists Premium
              </h3>
              <p className="text-gray-500 font-light leading-relaxed">
                Cronogramas detalhados para garantir que nenhum minuto do grande
                dia seja esquecido.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group p-8 bg-white rounded-2xl border border-gray-100 hover:border-yellow-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-center items-center mb-6 w-14 h-14 rounded-xl bg-gray-50 text-gray-900 group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                <DollarSign className="w-7 h-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Gestão Financeira
              </h3>
              <p className="text-gray-500 font-light leading-relaxed">
                Controle orçamentos e fluxo de caixa com a precisão que seu
                negócio exige.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group p-8 bg-white rounded-2xl border border-gray-100 hover:border-yellow-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-center items-center mb-6 w-14 h-14 rounded-xl bg-gray-50 text-gray-900 group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Agenda Exclusiva
              </h3>
              <p className="text-gray-500 font-light leading-relaxed">
                Organize visitas, degustações e reuniões em um calendário
                integrado e intuitivo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Simples */}
      <footer className="p-8 bg-black text-white border-t border-gray-800">
        <div className="mx-auto max-w-screen-xl text-center">
          <Link
            to="/"
            className="flex justify-center items-center text-2xl font-serif font-bold text-yellow-500 mb-4"
          >
            Planejar Pro
          </Link>
          <p className="my-6 text-gray-400 font-light">
            Elevando o padrão da assessoria de eventos no Brasil.
          </p>
          <span className="text-sm text-gray-600 sm:text-center">
            © 2026 Planejar Pro. Todos os direitos reservados.
          </span>
        </div>
      </footer>
    </div>
  );
}
