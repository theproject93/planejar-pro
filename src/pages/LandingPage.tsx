import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScrollReveal } from '../components/ScrollReveal'; // Importe o componente
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
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-gold-200">
      {/* Navbar */}
      <nav className="fixed w-full z-50 top-0 start-0 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between p-4">
          <Link
            to="/"
            className="flex items-center space-x-3 rtl:space-x-reverse"
          >
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-gold-500 font-bold text-2xl font-serif">
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
                className="text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-6 py-2.5 text-center transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 border border-transparent hover:border-gold-500/50"
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
                  className="block py-2 px-3 text-gold-600 md:p-0 font-semibold"
                  aria-current="page"
                >
                  Início
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="block py-2 px-3 text-gray-900 hover:text-gold-600 md:p-0 transition-colors"
                >
                  Recursos
                </a>
              </li>
              <li>
                <a
                  href="#sobre"
                  className="block py-2 px-3 text-gray-900 hover:text-gold-600 md:p-0 transition-colors"
                >
                  Sobre
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Hero Section com Vídeo Background + Framer Motion */}
      <section
        id="hero"
        className="relative pt-32 pb-24 min-h-[90vh] flex items-center justify-center overflow-hidden"
      >
        {/* Vídeo Background (Mantivemos igual) */}
        <div className="absolute top-0 left-0 w-full h-full z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/80 via-black/50 to-black/80"></div>
        </div>

        {/* Conteúdo Animado com Framer Motion */}
        <div className="relative z-10 px-4 mx-auto max-w-7xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <span className="bg-white/10 backdrop-blur-md text-gold-300 text-xs font-bold px-4 py-1.5 rounded-full mb-8 inline-block border border-gold-500/30 uppercase tracking-widest shadow-lg hover:bg-white/20 transition-colors cursor-default">
              ✨ Exclusivo para Cerimonialistas
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="mb-6 text-5xl font-extrabold tracking-tight leading-tight text-white md:text-6xl lg:text-7xl drop-shadow-2xl"
          >
            A excelência que seus <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 animate-pulse">
              eventos merecem
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            className="mb-12 text-lg font-light text-gray-200 lg:text-xl sm:px-16 lg:px-48 leading-relaxed drop-shadow-md max-w-4xl mx-auto"
          >
            Eleve o nível da sua assessoria. Gestão impecável, checklists
            precisos e controle financeiro, tudo em uma interface sofisticada.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
            className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-6"
          >
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group inline-flex justify-center items-center py-4 px-8 text-base font-bold text-center text-black rounded-xl bg-gold-400 hover:bg-gold-300 focus:ring-4 focus:ring-gold-300 transition-colors shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] w-full sm:w-auto"
              >
                Começar Agora
                <ArrowRight className="ml-2 -mr-1 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>

            <motion.a
              href="#features"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex justify-center items-center py-4 px-8 text-base font-medium text-center text-white rounded-xl border border-white/30 hover:bg-white/10 backdrop-blur-sm focus:ring-4 focus:ring-gray-100 transition-colors w-full sm:w-auto"
            >
              Conhecer Detalhes
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* Seção Features / Sofisticação */}
      <section
        id="features"
        className="py-24 bg-white relative overflow-hidden"
      >
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal width="100%">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <span className="text-gold-500 font-semibold tracking-wider uppercase text-sm">
                Por que escolher o PlanejarPro?
              </span>
              <h2 className="text-4xl font-playfair font-bold text-gray-900 mt-2 mb-4">
                Sofisticação em cada detalhe
              </h2>
              <div className="w-24 h-1 bg-gold-400 mx-auto rounded-full"></div>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <ScrollReveal delay={0.1}>
              <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-14 h-14 bg-gold-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-gold-400 transition-colors">
                  <span className="text-2xl">📋</span>{' '}
                  {/* Troque por ícone Lucide se tiver */}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">
                  Gestão Completa
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Controle fornecedores, orçamentos e cronogramas em um único
                  lugar, sem planilhas confusas.
                </p>
              </div>
            </ScrollReveal>

            {/* Card 2 - Com um pouco mais de delay */}
            <ScrollReveal delay={0.3}>
              <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-14 h-14 bg-gold-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-gold-400 transition-colors">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">
                  Financeiro Preciso
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Acompanhe pagamentos, vencimentos e fluxo de caixa de cada
                  evento com clareza absoluta.
                </p>
              </div>
            </ScrollReveal>

            {/* Card 3 - Com mais delay ainda */}
            <ScrollReveal delay={0.5}>
              <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-14 h-14 bg-gold-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-gold-400 transition-colors">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">
                  Acesso Mobile
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Tenha todas as informações na palma da mão durante os eventos.
                  Nada de pastas pesadas.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Footer Simples */}
      <footer className="p-8 bg-black text-white border-t border-gray-800">
        <div className="mx-auto max-w-screen-xl text-center">
          <Link
            to="/"
            className="flex justify-center items-center text-2xl font-serif font-bold text-gold-500 mb-4"
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
