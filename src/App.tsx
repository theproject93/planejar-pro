import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, type ReactNode } from 'react';
import { supabase } from './lib/supabaseClient';
import { Loader2 } from 'lucide-react';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';
import { ProfilePage } from './pages/ProfilePage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailsPage } from './pages/EventDetailsPage';

// Componente para proteger rotas
function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// Conteúdo da Home do Dashboard (Agora Real!)
function DashboardHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCount: 0,
    completedCount: 0,
    nextEvent: null as any,
    daysToNext: 0,
    totalBudget: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar stats:', error);
      } else if (events) {
        const active = events.filter(
          (e) => e.status === 'active' || e.status === 'draft'
        );
        const completed = events.filter((e) => e.status === 'completed');

        // Próximo evento (data maior ou igual a hoje)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const next = active.find((e) => {
          const eventDate = new Date(e.event_date + 'T12:00:00');
          return eventDate >= today;
        });

        const days = next
          ? Math.ceil(
              (new Date(next.event_date).getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

        // Soma do Orçamento (Se tiver campo budget_total)
        const total = active.reduce(
          (acc, curr) => acc + (Number(curr.budget_total) || 0),
          0
        );

        setStats({
          activeCount: active.length,
          completedCount: completed.length,
          nextEvent: next,
          daysToNext: days,
          totalBudget: total,
        });
      }
      setLoading(false);
    }

    fetchStats();
  }, [user]);

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin text-gold-500 w-8 h-8" />
      </div>
    );

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6 font-playfair">
        Visão Geral
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Eventos Ativos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">
            Eventos em Andamento
          </h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {stats.activeCount}
          </p>
          <p className="text-xs text-green-600 mt-1 flex items-center">
            +{stats.completedCount} realizados
          </p>
        </div>

        {/* Card 2: Próximo Casamento */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Próximo Evento</h3>
          {stats.nextEvent ? (
            <>
              <p className="text-lg font-bold text-gray-900 mt-2 truncate">
                {stats.nextEvent.name}
              </p>
              <p className="text-sm text-gold-500 font-semibold">
                Faltam {stats.daysToNext} dias
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(stats.nextEvent.event_date).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="text-gray-400 mt-2 text-sm">Nenhum evento futuro.</p>
          )}
        </div>

        {/* Card 3: Volume Financeiro */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">
            Orçamento Gerenciado
          </h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            R$ {(stats.totalBudget / 1000).toFixed(1)}k
          </p>
          <p className="text-xs text-gray-400 mt-1">Soma dos ativos</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Rota Mestre do Dashboard */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardHome />} />

            <Route path="eventos" element={<EventsPage />} />
            <Route path="eventos/:id" element={<EventDetailsPage />} />

            <Route path="perfil" element={<ProfilePage />} />
            <Route
              path="clientes"
              element={
                <div className="p-8">
                  <h1 className="text-2xl font-bold text-gray-400">
                    Página de Clientes (Em breve)
                  </h1>
                </div>
              }
            />
            <Route
              path="financeiro"
              element={
                <div className="p-8">
                  <h1 className="text-2xl font-bold text-gray-400">
                    Página Financeira (Em breve)
                  </h1>
                </div>
              }
            />
            <Route
              path="configuracoes"
              element={
                <div className="p-8">
                  <h1 className="text-2xl font-bold text-gray-400">
                    Configurações (Em breve)
                  </h1>
                </div>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
