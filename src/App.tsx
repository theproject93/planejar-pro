import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Loader2,
  Megaphone,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { setupGlobalObservability, trackPageView } from './lib/observability';

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((mod) => ({ default: mod.LandingPage }))
);
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((mod) => ({ default: mod.LoginPage }))
);
const SignupPage = lazy(() =>
  import('./pages/SignupPage').then((mod) => ({ default: mod.SignupPage }))
);
const AuthCallbackPage = lazy(() =>
  import('./pages/AuthCallbackPage').then((mod) => ({
    default: mod.AuthCallbackPage,
  }))
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
const SuperBillingPage = lazy(() =>
  import('./pages/SuperBillingPage').then((mod) => ({
    default: mod.SuperBillingPage,
  }))
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
const CouplePortalPage = lazy(() =>
  import('./pages/CouplePortalPage').then((mod) => ({
    default: mod.CouplePortalPage,
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
const OperationalHealthPage = lazy(() =>
  import('./pages/OperationalHealthPage').then((mod) => ({
    default: mod.OperationalHealthPage,
  }))
);
const ClientsPage = lazy(() =>
  import('./pages/ClientsPage').then((mod) => ({
    default: mod.ClientsPage,
  }))
);
const ClientSignaturePage = lazy(() =>
  import('./pages/ClientSignaturePage').then((mod) => ({
    default: mod.ClientSignaturePage,
  }))
);
const PortfolioPublicPage = lazy(() =>
  import('./pages/PortfolioPublicPage').then((mod) => ({
    default: mod.PortfolioPublicPage,
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

type DashboardTaskSummary = {
  event_id: string;
  due_date: string | null;
  text: string | null;
  completed: boolean | null;
};

type DashboardGuestSummary = {
  event_id: string;
  confirmed: boolean | null;
  rsvp_status: string | null;
};

type DashboardVendorSummary = {
  event_id: string;
  category: string | null;
};

type DashboardPendency = {
  id: string;
  eventId: string;
  eventName: string;
  title: string;
  description: string;
  path: string;
  score: number;
};

type DashboardAgendaItem = {
  id: string;
  eventId: string;
  eventName: string;
  title: string;
  dueAt: Date;
};

type ShortcutAction = {
  id: string;
  label: string;
  description: string;
  requiresEvent: boolean;
  eventQuestion?: string;
  icon: React.ComponentType<{ className?: string }>;
  getPath: (eventId?: string) => string;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getPendingRsvpCount(guests: DashboardGuestSummary[]) {
  return guests.filter((guest) => {
    const status = normalizeText(guest.rsvp_status);
    if (status === 'pending') return true;
    if (status === 'confirmed' || status === 'declined') return false;
    return !guest.confirmed;
  }).length;
}

const SHORTCUT_ACTIONS: ShortcutAction[] = [
  {
    id: 'mass-rsvp',
    label: 'Envio de RSVP em massa',
    description: 'Abrir Convites e enviar lembretes para pendentes.',
    requiresEvent: true,
    eventQuestion: 'Para qual evento você quer enviar RSVP em massa?',
    icon: Megaphone,
    getPath: (eventId) => `/dashboard/eventos/${eventId}?tab=invites`,
  },
  {
    id: 'vendors',
    label: 'Ajustar fornecedores',
    description: 'Revisar categorias e contatos dos fornecedores.',
    requiresEvent: true,
    eventQuestion: 'Para qual evento você quer revisar fornecedores?',
    icon: Users,
    getPath: (eventId) => `/dashboard/eventos/${eventId}?tab=vendors`,
  },
  {
    id: 'timeline',
    label: 'Revisar cronograma do dia',
    description: 'Entrar no cronograma do dia e organizar a operação em tempo real.',
    requiresEvent: true,
    eventQuestion: 'Para qual evento você quer abrir o cronograma do dia?',
    icon: CalendarClock,
    getPath: (eventId) => `/dashboard/eventos/${eventId}?tab=timeline`,
  },
  {
    id: 'event-finance',
    label: 'Financeiro do evento',
    description: 'Conferir despesas e pagamentos do evento.',
    requiresEvent: true,
    eventQuestion: 'Para qual evento você quer abrir o financeiro?',
    icon: Wallet,
    getPath: (eventId) => `/dashboard/eventos/${eventId}?tab=budget`,
  },
];

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <>{children}</> : <Navigate to="/dashboard" />;
}

function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeCount: 0,
    completedCount: 0,
    nextEvent: null,
    daysToNext: 0,
    totalBudget: 0,
    budgetByEvent: [],
  });
  const [tasks, setTasks] = useState<DashboardTaskSummary[]>([]);
  const [guests, setGuests] = useState<DashboardGuestSummary[]>([]);
  const [vendors, setVendors] = useState<DashboardVendorSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shortcutModal, setShortcutModal] = useState<{
    shortcut: ShortcutAction | null;
    eventId: string;
  }>({
    shortcut: null,
    eventId: '',
  });

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      setLoading(true);
      setError(null);

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, name, event_date, status')
        .eq('user_id', user.id)
        .or('status.is.null,status.neq.deleted')
        .order('event_date', { ascending: true });

      if (eventsError) {
        setError('Não foi possível carregar a visão geral agora.');
        setLoading(false);
        return;
      }

      const typedEvents = (events as DashboardEventSummary[]) ?? [];
      const active = typedEvents.filter(
        (eventItem) => eventItem.status === 'active' || eventItem.status === 'draft'
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
        const [
          expensesRes,
          tasksRes,
          guestsRes,
          vendorsRes,
        ] = await Promise.all([
          supabase
            .from('event_expenses')
            .select('event_id, value, status')
            .in('event_id', activeEventIds),
          supabase
            .from('event_tasks')
            .select('event_id, due_date, text, completed')
            .in('event_id', activeEventIds),
          supabase
            .from('event_guests')
            .select('event_id, confirmed, rsvp_status')
            .in('event_id', activeEventIds),
          supabase
            .from('event_vendors')
            .select('event_id, category')
            .in('event_id', activeEventIds),
        ]);

        if (!expensesRes.error && expensesRes.data) {
          const managedByEvent = new Map<string, number>();

          total = (expensesRes.data as DashboardExpenseSummary[]).reduce(
            (acc, curr) => {
              const normalizedStatus = (curr.status ?? 'pending').toLowerCase().trim();
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

        setTasks((tasksRes.data as DashboardTaskSummary[]) ?? []);
        setGuests((guestsRes.data as DashboardGuestSummary[]) ?? []);
        setVendors((vendorsRes.data as DashboardVendorSummary[]) ?? []);
      } else {
        setTasks([]);
        setGuests([]);
        setVendors([]);
      }

      setStats({
        activeCount: active.length,
        completedCount: completed.length,
        nextEvent: next ?? null,
        daysToNext: days,
        totalBudget: total,
        budgetByEvent,
      });
      setLoading(false);
    }

    void fetchStats();
  }, [user]);

  const activeEvents = useMemo(() => {
    return stats.budgetByEvent.map((eventBudget) => ({
      id: eventBudget.eventId,
      name: eventBudget.eventName,
    }));
  }, [stats.budgetByEvent]);

  const topPendencies = useMemo<DashboardPendency[]>(() => {
    const taskByEvent = new Map<string, DashboardTaskSummary[]>();
    for (const task of tasks) {
      const current = taskByEvent.get(task.event_id) ?? [];
      current.push(task);
      taskByEvent.set(task.event_id, current);
    }

    const guestByEvent = new Map<string, DashboardGuestSummary[]>();
    for (const guest of guests) {
      const current = guestByEvent.get(guest.event_id) ?? [];
      current.push(guest);
      guestByEvent.set(guest.event_id, current);
    }

    const vendorsByEvent = new Map<string, DashboardVendorSummary[]>();
    for (const vendor of vendors) {
      const current = vendorsByEvent.get(vendor.event_id) ?? [];
      current.push(vendor);
      vendorsByEvent.set(vendor.event_id, current);
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const pendencies: DashboardPendency[] = [];

    for (const eventItem of activeEvents) {
      const eventTasks = taskByEvent.get(eventItem.id) ?? [];
      const overdueTasks = eventTasks.filter((task) => {
        if (task.completed || !task.due_date) return false;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
      }).length;

      if (overdueTasks > 0) {
        pendencies.push({
          id: `${eventItem.id}-tasks`,
          eventId: eventItem.id,
          eventName: eventItem.name,
          title: `${overdueTasks} tarefa(s) atrasada(s)`,
          description: 'Priorize o cronograma para reduzir risco operacional.',
          path: `/dashboard/eventos/${eventItem.id}?tab=timeline`,
          score: 80 + overdueTasks,
        });
      }

      const eventGuests = guestByEvent.get(eventItem.id) ?? [];
      const pendingRsvp = getPendingRsvpCount(eventGuests);
      if (pendingRsvp >= 8) {
        pendencies.push({
          id: `${eventItem.id}-rsvp`,
          eventId: eventItem.id,
          eventName: eventItem.name,
          title: `${pendingRsvp} RSVP pendente(s)`,
          description: 'Faça envio em massa para acelerar confirmações.',
          path: `/dashboard/eventos/${eventItem.id}?tab=invites`,
          score: 70 + pendingRsvp,
        });
      }

      const eventVendors = vendorsByEvent.get(eventItem.id) ?? [];
      const hasBuffet = eventVendors.some((vendor) =>
        normalizeText(vendor.category).includes('buffet')
      );
      if (!hasBuffet) {
        pendencies.push({
          id: `${eventItem.id}-buffet`,
          eventId: eventItem.id,
          eventName: eventItem.name,
          title: 'Fornecedor buffet não encontrado',
          description: 'Cadastre buffet para evitar lacuna crítica.',
          path: `/dashboard/eventos/${eventItem.id}?tab=vendors`,
          score: 95,
        });
      }
    }

    return pendencies.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [activeEvents, guests, tasks, vendors]);

  const agendaNextDays = useMemo<DashboardAgendaItem[]>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sevenDays = new Date(now);
    sevenDays.setDate(now.getDate() + 7);

    const taskItems = tasks
      .filter((task) => !task.completed && task.due_date)
      .map((task) => ({
        id: `${task.event_id}-${task.text}-${task.due_date}`,
        eventId: task.event_id,
        eventName:
          activeEvents.find((eventItem) => eventItem.id === task.event_id)?.name ??
          'Evento',
        title: task.text?.trim() || 'Tarefa pendente',
        dueAt: new Date(task.due_date as string),
      }))
      .filter((item) => item.dueAt >= now && item.dueAt <= sevenDays);

    return taskItems.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()).slice(0, 6);
  }, [activeEvents, tasks]);

  function openShortcut(shortcut: ShortcutAction) {
    if (!shortcut.requiresEvent) {
      navigate(shortcut.getPath());
      return;
    }
    setShortcutModal({
      shortcut,
      eventId: activeEvents[0]?.id ?? '',
    });
  }

  function closeShortcutModal() {
    setShortcutModal({ shortcut: null, eventId: '' });
  }

  function confirmShortcut() {
    if (!shortcutModal.shortcut || !shortcutModal.eventId) return;
    navigate(shortcutModal.shortcut.getPath(shortcutModal.eventId));
    closeShortcutModal();
  }

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin text-gold-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-playfair">Visão Geral</h1>
        <p className="text-sm text-gray-500 mt-2">
          Operação central da assessoria com prioridades e atalhos.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Eventos em andamento</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeCount}</p>
          <p className="text-xs text-green-600 mt-1 flex items-center">
            +{stats.completedCount} realizados
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Próximo evento</h3>
          {stats.nextEvent ? (
            <>
              <p className="text-lg font-bold text-gray-900 mt-2 truncate">
                {stats.nextEvent.name}
              </p>
              <p className="text-sm text-gold-500 font-semibold">
                Faltam {stats.daysToNext} dias
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(stats.nextEvent.event_date).toLocaleDateString('pt-BR')}
              </p>
            </>
          ) : (
            <p className="text-gray-400 mt-2 text-sm">Nenhum evento futuro.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Orçamento gerenciado</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {stats.totalBudget.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Soma das despesas dos eventos ativos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Top pendências</h2>
              <p className="text-xs text-gray-500 mt-1">
                Priorizadas por impacto no evento.
              </p>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-4 space-y-3">
            {topPendencies.length === 0 && (
              <p className="text-sm text-gray-500">Sem pendências críticas agora.</p>
            )}
            {topPendencies.map((pendency) => (
              <div
                key={pendency.id}
                className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{pendency.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{pendency.eventName}</p>
                  <p className="text-xs text-gray-500 mt-1">{pendency.description}</p>
                </div>
                <button
                  onClick={() => navigate(pendency.path)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-800"
                >
                  Resolver
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Atalhos inteligentes</h2>
              <p className="text-xs text-gray-500 mt-1">Ações rápidas da operação.</p>
            </div>
            <Sparkles className="w-5 h-5 text-violet-500" />
          </div>
          <div className="mt-4 space-y-2">
            {SHORTCUT_ACTIONS.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <button
                  key={shortcut.id}
                  onClick={() => openShortcut(shortcut)}
                  className="w-full text-left rounded-xl border border-gray-100 px-3 py-3 hover:bg-violet-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 p-1.5 rounded-lg bg-violet-100 text-violet-600">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{shortcut.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{shortcut.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Próximos 7 dias</h2>
            <p className="text-xs text-gray-500 mt-1">Itens com prazo curto no checklist.</p>
          </div>
          <CalendarClock className="w-5 h-5 text-blue-500" />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {agendaNextDays.length === 0 && (
            <p className="text-sm text-gray-500">Sem tarefas previstas para os próximos 7 dias.</p>
          )}
          {agendaNextDays.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/dashboard/eventos/${item.eventId}?tab=timeline`)}
              className="rounded-xl border border-gray-100 px-3 py-3 text-left hover:bg-gray-50"
            >
              <p className="text-xs text-gray-500">
                {item.dueAt.toLocaleDateString('pt-BR')}
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.eventName}</p>
            </button>
          ))}
        </div>
      </div>

      {shortcutModal.shortcut && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-100 shadow-xl">
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {shortcutModal.shortcut.eventQuestion ?? 'Selecione o evento'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Este atalho depende do contexto de um evento.
                </p>
              </div>
              <button
                onClick={closeShortcutModal}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              {activeEvents.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhum evento ativo disponível.</p>
              ) : (
                <select
                  value={shortcutModal.eventId}
                  onChange={(event) =>
                    setShortcutModal((prev) => ({
                      ...prev,
                      eventId: event.target.value,
                    }))
                  }
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm"
                >
                  {activeEvents.map((eventItem) => (
                    <option key={eventItem.id} value={eventItem.id}>
                      {eventItem.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={closeShortcutModal}
                className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmShortcut}
                disabled={!shortcutModal.eventId}
                className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  function ObservabilityBootstrap() {
    const location = useLocation();

    useEffect(() => {
      setupGlobalObservability();
    }, []);

    useEffect(() => {
      trackPageView(location.pathname + location.search);
    }, [location.pathname, location.search]);

    return null;
  }

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
          <ObservabilityBootstrap />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<SignupPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/atendimento-ia" element={<AtendimentoIAPage />} />
            <Route path="/torre/:token" element={<VendorCommandCenterPage />} />
            <Route path="/noivos/:token" element={<CouplePortalPage />} />
            <Route path="/convite/:token" element={<GuestInvitePage />} />
            <Route path="/assinatura/:token" element={<ClientSignaturePage />} />
            <Route path="/portfolio/:token" element={<PortfolioPublicPage />} />
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
                path="assinaturas"
                element={
                  <SuperAdminRoute>
                    <SuperBillingPage />
                  </SuperAdminRoute>
                }
              />
              <Route path="saude" element={<OperationalHealthPage />} />
              <Route
                path="clientes"
                element={<ClientsPage />}
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

