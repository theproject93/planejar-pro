import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import {
  Suspense,
  lazy,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((mod) => ({ default: mod.LandingPage }))
);
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((mod) => ({ default: mod.LoginPage }))
);
const PrivacyPolicyPage = lazy(() =>
  import('./pages/PrivacyPolicyPage').then((mod) => ({
    default: mod.PrivacyPolicyPage,
  }))
);
const AtendimentoIAPage = lazy(() =>
  import('./pages/AtendimentoIAPage').then((mod) => ({
    default: mod.AtendimentoIAPage,
  }))
);
const DashboardLayout = lazy(() =>
  import('./components/DashboardLayout').then((mod) => ({
    default: mod.DashboardLayout,
  }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((mod) => ({ default: mod.ProfilePage }))
);
const EventsPage = lazy(() =>
  import('./pages/EventsPage').then((mod) => ({ default: mod.EventsPage }))
);
const EventDetailsPage = lazy(() =>
  import('./pages/EventDetailsPage').then((mod) => ({
    default: mod.EventDetailsPage,
  }))
);
const EventCommandCenterPage = lazy(() =>
  import('./pages/EventCommandCenterPage').then((mod) => ({
    default: mod.EventCommandCenterPage,
  }))
);
const VendorCommandCenterPage = lazy(() =>
  import('./pages/VendorCommandCenterPage').then((mod) => ({
    default: mod.VendorCommandCenterPage,
  }))
);
const GuestInvitePage = lazy(() =>
  import('./pages/GuestInvitePage').then((mod) => ({
    default: mod.GuestInvitePage,
  }))
);
const FinanceiroPage = lazy(() =>
  import('./pages/FinanceiroPage').then((mod) => ({
    default: mod.FinanceiroPage,
  }))
);

type DashboardEventSummary = {
  id: string;
  name: string;
  event_date: string;
  status: string | null;
};

type DashboardExpenseSummary = {
  event_id: string;
  value: number | null;
  status: string | null;
};

type DashboardBudgetByEvent = {
  eventId: string;
  eventName: string;
  managedBudget: number;
};

type DashboardStats = {
  activeCount: number;
  completedCount: number;
  nextEvent: DashboardEventSummary | null;
  daysToNext: number;
  totalBudget: number;
  budgetByEvent: DashboardBudgetByEvent[];
};

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function DashboardHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeCount: 0,
    completedCount: 0,
    nextEvent: null,
    daysToNext: 0,
    totalBudget: 0,
    budgetByEvent: [],
  });

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      const { data: events, error } = await supabase
        .from('events')
        .select('id, name, event_date, status')
        .eq('user_id', user.id)
        .or('status.is.null,status.neq.deleted')
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar stats:', error);
      } else if (events) {
        const typedEvents = events as DashboardEventSummary[];
        const active = typedEvents.filter(
          (eventItem) =>
            eventItem.status === 'active' || eventItem.status === 'draft'
        );
        const completed = typedEvents.filter(
          (eventItem) => eventItem.status === 'completed'
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const next = active.find((eventItem) => {
          const eventDate = new Date(`${eventItem.event_date}T12:00:00`);
          return eventDate >= today;
        });

        const days = next
          ? Math.ceil(
              (new Date(next.event_date).getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

        const activeEventIds = active.map((eventItem) => eventItem.id);
        let total = 0;
        let budgetByEvent: DashboardBudgetByEvent[] = [];

        if (activeEventIds.length > 0) {
          const { data: expenses, error: expensesError } = await supabase
            .from('event_expenses')
            .select('event_id, value, status')
            .in('event_id', activeEventIds);

          if (expensesError) {
            console.error('Erro ao buscar despesas do dashboard:', expensesError);
          } else if (expenses) {
            const managedByEvent = new Map<string, number>();

            total = (expenses as DashboardExpenseSummary[]).reduce(
              (acc, curr) => {
                const normalizedStatus = (curr.status ?? 'pending')
                  .toLowerCase()
                  .trim();
                if (normalizedStatus === 'cancelled') return acc;
                const value = Number(curr.value) || 0;
                managedByEvent.set(
                  curr.event_id,
                  (managedByEvent.get(curr.event_id) ?? 0) + value
                );
                return acc + value;
              },
              0
            );

            budgetByEvent = active.map((eventItem) => ({
              eventId: eventItem.id,
              eventName: eventItem.name,
              managedBudget: managedByEvent.get(eventItem.id) ?? 0,
            }));
          }
        }

        setStats({
          activeCount: active.length,
          completedCount: completed.length,
          nextEvent: next ?? null,
          daysToNext: days,
          totalBudget: total,
          budgetByEvent,
        });
      }
      setLoading(false);
    }

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin text-gold-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6 font-playfair">
        Visão Geral
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">
            Orçamento Gerenciado
          </h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {stats.totalBudget.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Soma das despesas dos eventos ativos
          </p>
          {stats.budgetByEvent.length > 0 && (
            <div className="mt-3 space-y-1">
              {stats.budgetByEvent.slice(0, 3).map((eventItem) => (
                <div
                  key={eventItem.eventId}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-gray-500 truncate">{eventItem.eventName}</span>
                  <span className="text-gray-700 font-medium whitespace-nowrap">
                    {eventItem.managedBudget.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              ))}
              {stats.budgetByEvent.length > 3 && (
                <p className="text-xs text-gray-400">
                  +{stats.budgetByEvent.length - 3} evento(s)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="animate-spin text-gold-500 w-8 h-8" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/atendimento-ia" element={<AtendimentoIAPage />} />
            <Route path="/torre/:token" element={<VendorCommandCenterPage />} />
            <Route path="/convite/:token" element={<GuestInvitePage />} />
            <Route
              path="/politica-de-privacidade"
              element={<PrivacyPolicyPage />}
            />

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
              <Route path="eventos/:id/torre" element={<EventCommandCenterPage />} />
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
                element={<FinanceiroPage />}
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
