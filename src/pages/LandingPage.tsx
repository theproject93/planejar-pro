import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScrollReveal } from '../components/ScrollReveal'; // Importe o componente
import {
  ArrowRight,
  Menu,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { acceptCookieConsent, hasCookieConsent } from '../lib/privacy';

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(
    () => !hasCookieConsent()
  );
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  function handleAcceptCookies() {
    acceptCookieConsent();
    setShowCookieBanner(false);
  }

  function handleHeroVideoEnded() {
    const video = heroVideoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }

  function handleHeroVideoPause() {
    const video = heroVideoRef.current;
    if (!video) return;
    const isNearEnd =
      Number.isFinite(video.duration) &&
      video.duration > 0 &&
      video.currentTime >= video.duration - 0.15;
    if (!isNearEnd) return;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }

  useEffect(() => {
    function handleVisibilityChange() {
      const video = heroVideoRef.current;
      if (!video || document.hidden) return;
      if (video.paused) {
        void video.play().catch(() => {});
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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
              <li>
                <a
                  href="#precos"
                  className="block py-2 px-3 text-gray-900 hover:text-gold-600 md:p-0 transition-colors"
                >
                  Preços
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
            ref={heroVideoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onEnded={handleHeroVideoEnded}
            onPause={handleHeroVideoPause}
            onStalled={handleHeroVideoPause}
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
              ✨ EXCLUSIVO PARA VOCÊ
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
            <Link to="/atendimento-ia?origem=hero&plano=profissional">
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

      {/* Seção Sobre / Conversão */}
      <section id="sobre" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <ScrollReveal width="100%">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <span className="text-gold-500 font-semibold tracking-wider uppercase text-sm">
                Sobre a Plataforma
              </span>
              <h2 className="text-4xl font-playfair font-bold text-gray-900 mt-2 mb-4">
                A plataforma que a assessora usa para organizar melhor e vender com mais autoridade
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Planejar Pro foi desenhado para quem vive a rotina de eventos e precisa de controle
                total, agilidade e um padrão profissional em cada entrega.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ScrollReveal delay={0.1}>
              <div className="bg-white p-7 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mb-4">
                  <span className="text-xl">⚡</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Método Pronto para Eventos
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Estrutura completa para casamentos, aniversários e eventos sociais sem
                  começar do zero a cada novo contrato.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="bg-white p-7 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mb-4">
                  <span className="text-xl">📈</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Tudo em Um Painel
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Cronograma, checklist, equipe, fornecedores e documentos no mesmo lugar,
                  sem planilha espalhada e sem retrabalho.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="bg-white p-7 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mb-4">
                  <span className="text-xl">🛡️</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Financeiro que Não Te Deixa no Escuro
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Entradas, saídas, vencimentos e custos por evento para você saber sua
                  margem real e tomar decisão com segurança.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <div className="bg-white p-7 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mb-4">
                  <span className="text-xl">💳</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Diferencial Percebido Pelo Cliente
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Uma operação organizada aumenta sua autoridade no atendimento e valoriza
                  o seu serviço frente à concorrência.
                </p>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.5}>
            <div className="mt-10 text-center">
              <Link to="/atendimento-ia?origem=sobre&plano=profissional">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl bg-black px-8 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                >
                  Quero Profissionalizar Minha Operação
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </Link>
            </div>
          </ScrollReveal>
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

      {/* Seção de Preços */}
      <section id="precos" className="py-24 bg-black text-white">
        <div className="container mx-auto px-4">
          <ScrollReveal width="100%">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <span className="text-gold-400 font-semibold tracking-wider uppercase text-sm">
                Planos
              </span>
              <h2 className="text-4xl font-playfair font-bold mt-2 mb-4">
                Invista no sistema que acompanha o seu nível de entrega
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Faixa de referência de mercado em 18/02/2026: de cerca de R$ 49,90/mês
                a R$ 149,90/mês em plataformas do nicho de eventos.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid lg:grid-cols-3 gap-7 max-w-6xl mx-auto">
            <ScrollReveal delay={0.1}>
              <div className="h-full rounded-2xl border border-white/20 bg-white/5 p-8">
                <p className="text-gold-300 text-sm font-semibold uppercase tracking-wider mb-4">
                  Essencial
                </p>
                <p className="text-4xl font-bold mb-1">R$ 59</p>
                <p className="text-sm text-gray-300 mb-6">/mês</p>
                <ul className="space-y-3 text-sm text-gray-200 mb-8">
                  <li>Base completa para organizar cada evento</li>
                  <li>Checklist e cronograma com execução mais rápida</li>
                  <li>Controle financeiro essencial por evento</li>
                </ul>
                <Link
                  to="/atendimento-ia?origem=precos&plano=essencial"
                  className="inline-block w-full"
                >
                  <button className="w-full rounded-lg border border-white/30 py-2.5 hover:bg-white/10 transition-colors">
                    Começar agora
                  </button>
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="h-full rounded-2xl border-2 border-gold-400 bg-white/10 p-8 shadow-[0_0_30px_rgba(250,204,21,0.15)] relative">
                <span className="absolute -top-3 right-6 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-black">
                  MAIS ESCOLHIDO
                </span>
                <p className="text-gold-300 text-sm font-semibold uppercase tracking-wider mb-4">
                  Profissional
                </p>
                <p className="text-4xl font-bold mb-1">R$ 99</p>
                <p className="text-sm text-gray-300 mb-6">/mês</p>
                <ul className="space-y-3 text-sm text-gray-100 mb-8">
                  <li>Tudo do Essencial + operação avançada</li>
                  <li>Gestão de equipe e fornecedores sem caos</li>
                  <li>Mais controle para quem já está crescendo</li>
                </ul>
                <Link
                  to="/atendimento-ia?origem=precos&plano=profissional"
                  className="inline-block w-full"
                >
                  <button className="w-full rounded-lg bg-gold-400 py-2.5 font-semibold text-black hover:bg-gold-300 transition-colors">
                    Assinar Agora
                  </button>
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="h-full rounded-2xl border border-white/20 bg-white/5 p-8">
                <p className="text-gold-300 text-sm font-semibold uppercase tracking-wider mb-4">
                  Elite
                </p>
                <p className="text-4xl font-bold mb-1">R$ 149</p>
                <p className="text-sm text-gray-300 mb-6">/mês</p>
                <ul className="space-y-3 text-sm text-gray-200 mb-8">
                  <li>Para equipes com operação intensa e multi-eventos</li>
                  <li>Gestão premium para padrão elevado de entrega</li>
                  <li>Prioridade no suporte e evolução contínua</li>
                </ul>
                <Link
                  to="/atendimento-ia?origem=precos&plano=elite"
                  className="inline-block w-full"
                >
                  <button className="w-full rounded-lg border border-white/30 py-2.5 hover:bg-white/10 transition-colors">
                    Falar com Vendas
                  </button>
                </Link>
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
          <p className="mb-4">
            <Link
              to="/politica-de-privacidade"
              className="text-sm text-gold-400 hover:text-gold-300 underline underline-offset-4"
            >
              Política de Privacidade
            </Link>
          </p>
          <span className="text-sm text-gray-600 sm:text-center">
            © 2026 Planejar Pro. Todos os direitos reservados.
          </span>
        </div>
      </footer>
      {showCookieBanner && (
        <div className="fixed bottom-0 inset-x-0 z-[60] p-4">
          <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white/95 backdrop-blur shadow-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              Utilizamos cookies para melhorar sua experiência e analisar o
              uso da plataforma. Ao continuar, você concorda com nossa{' '}
              <Link
                to="/politica-de-privacidade"
                className="text-gold-700 font-semibold underline underline-offset-4 hover:text-gold-600"
              >
                Política de Privacidade
              </Link>
              .
            </p>
            <button
              type="button"
              onClick={handleAcceptCookies}
              className="shrink-0 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Aceitar cookies
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

