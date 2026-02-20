import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  Bell,
  Calendar,
  CalendarDays,
  Camera,
  CheckSquare,
  Clock,
  DollarSign,
  Edit2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  TableProperties,
  UserSquare2,
  Users,
  X,
} from 'lucide-react';
import { PlanAssistantWidget } from './PlanAssistantWidget';
import { supabase } from '../lib/supabaseClient';

type EventModuleItem = {
  key: string;
  label: string;
  icon: any;
  path: string;
};

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTrialBannerDismissedToday, setIsTrialBannerDismissedToday] = useState(false);

  // Desktop: inicia recolhido (icones). Expande ao passar o mouse.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isEventSidebarCollapsed, setIsEventSidebarCollapsed] = useState(true);
  const [eventModuleOrder, setEventModuleOrder] = useState<string[]>([]);
  const [draggedEventModuleKey, setDraggedEventModuleKey] = useState<string | null>(null);

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
    { path: '/dashboard/saude', icon: Activity, label: 'Saude Operacional' },
    { path: '/dashboard/eventos', icon: CalendarDays, label: 'Meus Eventos' },
    { path: '/dashboard/clientes', icon: Users, label: 'Meus Clientes' },
    { path: '/dashboard/financeiro', icon: DollarSign, label: 'Minha Finança' },
    { path: '/dashboard/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  const eventMatch = location.pathname.match(/^\/dashboard\/eventos\/([^/]+)(?:\/(.*))?$/);
  const eventId = eventMatch?.[1] ?? null;
  const eventSuffix = eventMatch?.[2] ?? '';
  const isEventDetailsRoute = Boolean(eventId);

  const currentEventTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('tab') ?? 'overview').toLowerCase();
  }, [location.search]);

  const eventModuleItems = useMemo(() => {
    if (!eventId) return [] as EventModuleItem[];

    return [
      { key: 'overview', label: 'Visão Geral', icon: Sparkles, path: `/dashboard/eventos/${eventId}` },
      {
        key: 'history',
        label: 'Linha do Projeto',
        icon: Calendar,
        path: `/dashboard/eventos/${eventId}?tab=history`,
      },
      {
        key: 'timeline',
        label: 'Cronograma do Dia',
        icon: Clock,
        path: `/dashboard/eventos/${eventId}?tab=timeline`,
      },
      {
        key: 'tasks',
        label: 'Checklist',
        icon: CheckSquare,
        path: `/dashboard/eventos/${eventId}?tab=tasks`,
      },
      {
        key: 'guests',
        label: 'Convidados',
        icon: Users,
        path: `/dashboard/eventos/${eventId}?tab=guests`,
      },
      {
        key: 'invites',
        label: 'Convites',
        icon: Bell,
        path: `/dashboard/eventos/${eventId}?tab=invites`,
      },
      {
        key: 'budget',
        label: 'Orçamento & Financeiro',
        icon: DollarSign,
        path: `/dashboard/eventos/${eventId}?tab=budget`,
      },
      {
        key: 'vendors',
        label: 'Fornecedores',
        icon: UserSquare2,
        path: `/dashboard/eventos/${eventId}?tab=vendors`,
      },
      {
        key: 'documents',
        label: 'Documentos',
        icon: Camera,
        path: `/dashboard/eventos/${eventId}?tab=documents`,
      },
      {
        key: 'notes',
        label: 'Notas',
        icon: Edit2,
        path: `/dashboard/eventos/${eventId}?tab=notes`,
      },
      {
        key: 'team',
        label: 'Equipe',
        icon: FileText,
        path: `/dashboard/eventos/${eventId}?tab=team`,
      },
      {
        key: 'tables',
        label: 'Mapa de Mesas',
        icon: TableProperties,
        path: `/dashboard/eventos/${eventId}?tab=tables`,
      },
    ] as EventModuleItem[];
  }, [eventId]);

  const orderedEventModuleItems = useMemo(() => {
    if (eventModuleOrder.length === 0) return eventModuleItems;

    const byKey = new Map(eventModuleItems.map((item) => [item.key, item]));
    const ordered = eventModuleOrder
      .map((key) => byKey.get(key))
      .filter((item): item is EventModuleItem => Boolean(item));
    const remaining = eventModuleItems.filter(
      (item) => !eventModuleOrder.includes(item.key)
    );

    return [...ordered, ...remaining];
  }, [eventModuleItems, eventModuleOrder]);

  const trialBannerData = useMemo(() => {
    if (!user?.created_at) return null;

    const rawTrialDays = user.user_metadata?.trial_days;
    const trialDays =
      typeof rawTrialDays === 'number' && Number.isFinite(rawTrialDays) && rawTrialDays > 0
        ? Math.floor(rawTrialDays)
        : 30;
    if (trialDays <= 0) return null;

    const createdAt = new Date(user.created_at);
    if (Number.isNaN(createdAt.getTime())) return null;

    const expiration = new Date(createdAt);
    expiration.setDate(expiration.getDate() + trialDays);

    const now = new Date();
    const msLeft = expiration.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    if (daysLeft <= 0) return null;

    return { daysLeft };
  }, [user]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setIsTrialBannerDismissedToday(false);
      return;
    }

    const storageKey = `trial_banner_dismissed_date:${userId}`;
    const today = new Intl.DateTimeFormat('sv-SE').format(new Date());
    const dismissedDate = window.localStorage.getItem(storageKey);
    setIsTrialBannerDismissedToday(dismissedDate === today);
  }, [user?.id]);

  function dismissTrialBannerForToday() {
    if (!user?.id) return;
    const storageKey = `trial_banner_dismissed_date:${user.id}`;
    const today = new Intl.DateTimeFormat('sv-SE').format(new Date());
    window.localStorage.setItem(storageKey, today);
    setIsTrialBannerDismissedToday(true);
  }
  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      queueMicrotask(() => setEventModuleOrder([]));
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('user_ui_preferences')
        .select('event_sidebar_order')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled || error) return;

      const order = Array.isArray(data?.event_sidebar_order)
        ? data.event_sidebar_order.filter(
            (item): item is string => typeof item === 'string'
          )
        : [];

      queueMicrotask(() => {
        if (!cancelled) setEventModuleOrder(order);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  function persistEventModuleOrder(order: string[]) {
    setEventModuleOrder(order);
    if (!user?.id) return;
    void supabase.from('user_ui_preferences').upsert(
      {
        user_id: user.id,
        event_sidebar_order: order,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  }

  function closeMobileSidebar() {
    setIsSidebarOpen(false);
    setIsSidebarCollapsed(true);
  }

  function handleEventItemDragStart(key: string) {
    setDraggedEventModuleKey(key);
  }

  function handleEventItemDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  function handleEventItemDrop(targetKey: string) {
    if (!draggedEventModuleKey || draggedEventModuleKey === targetKey) return;

    const sourceIndex = orderedEventModuleItems.findIndex(
      (item) => item.key === draggedEventModuleKey
    );
    const targetIndex = orderedEventModuleItems.findIndex(
      (item) => item.key === targetKey
    );

    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...orderedEventModuleItems];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);

    persistEventModuleOrder(next.map((item) => item.key));
    setDraggedEventModuleKey(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar principal */}
      <aside
        onMouseEnter={() => {
          if (!isSidebarOpen) setIsSidebarCollapsed(false);
        }}
        onMouseLeave={() => {
          if (!isSidebarOpen) setIsSidebarCollapsed(true);
        }}
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:inset-auto
          md:transition-[width] md:duration-200 md:ease-in-out md:overflow-hidden
          ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <Link
              to="/dashboard/perfil"
              onClick={closeMobileSidebar}
              className={`
                flex items-center min-w-0 rounded-xl transition-all duration-200
                hover:bg-gray-50
                ${isSidebarCollapsed ? 'md:justify-center md:w-full md:px-0' : 'md:px-2 md:py-1.5'}
              `}
              title="Meu Perfil"
            >
              <div className="w-9 h-9 rounded-full bg-gold-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                {(user?.email?.charAt(0) || 'U').toUpperCase()}
              </div>
              <div
                className={`
                  ml-3 min-w-0 transition-all duration-200
                  ${isSidebarCollapsed ? 'md:opacity-0 md:max-w-0 md:overflow-hidden' : 'md:opacity-100'}
                `}
              >
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 truncate">Gerenciar perfil</p>
              </div>
            </Link>

            <button
              onClick={closeMobileSidebar}
              className="md:hidden ml-auto p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive =
                item.path === '/dashboard/eventos'
                  ? location.pathname.startsWith('/dashboard/eventos')
                  : location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileSidebar}
                  className={`
                    relative group
                    flex items-center px-4 py-3 rounded-xl transition-all
                    ${isSidebarCollapsed ? 'md:justify-center md:px-2' : 'md:justify-start'}
                    ${
                      isActive
                        ? 'bg-gold-50 text-gold-600 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      w-5 h-5 mr-3
                      ${isSidebarCollapsed ? 'md:mr-0' : 'md:mr-3'}
                      ${isActive ? 'text-gold-500' : 'text-gray-400 group-hover:text-gray-600'}
                    `}
                  />

                  <span
                    className={`
                      whitespace-nowrap transition-all duration-200
                      ${
                        isSidebarCollapsed
                          ? 'md:opacity-0 md:max-w-0 md:overflow-hidden'
                          : 'md:opacity-100 md:max-w-[200px]'
                      }
                    `}
                  >
                    {item.label}
                  </span>

                  {isSidebarCollapsed && (
                    <span
                      className={`
                        hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-3
                        pointer-events-none opacity-0 translate-x-[-2px]
                        group-hover:opacity-100 group-hover:translate-x-0
                        transition-all duration-150 z-50
                      `}
                    >
                      <span className="relative inline-flex items-center">
                        <span className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                          {item.label}
                        </span>
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                      </span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gold-500 text-white flex items-center justify-center font-bold shadow-sm">
                {(user?.email?.charAt(0) || 'U').toUpperCase()}
              </div>

              <div
                className={`
                  flex-1 min-w-0 transition-all duration-200
                  ${isSidebarCollapsed ? 'md:opacity-0 md:max-w-0 md:overflow-hidden' : 'md:opacity-100'}
                `}
              >
                <p className="text-sm font-bold text-gray-900 truncate">
                  {user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 truncate">Administrador</p>
              </div>
            </div>

            <div className={`${isSidebarCollapsed ? 'md:hidden' : 'md:block'}`}>
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-100 transition-colors shadow-sm"
                title="Sair do Sistema"
              >
                <LogOut size={16} className="mr-2" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar contextual do evento (desktop) */}
      {isEventDetailsRoute && eventId && (
        <aside
          onMouseEnter={() => setIsEventSidebarCollapsed(false)}
          onMouseLeave={() => setIsEventSidebarCollapsed(true)}
          className={`
            hidden md:flex md:flex-col bg-white border-r border-gray-200
            md:transition-[width] md:duration-200 md:ease-in-out md:overflow-hidden
            ${isEventSidebarCollapsed ? 'md:w-20' : 'md:w-72'}
          `}
        >
          <div className="h-16 flex items-center px-4 border-b border-gray-100">
            <span
              className={`
                text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap transition-all duration-200
                ${isEventSidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'md:opacity-100'}
              `}
            >
              Módulos do Evento
            </span>
            <span
              className={`
                hidden md:flex items-center justify-center text-gray-500 transition-all duration-200
                ${isEventSidebarCollapsed ? 'md:opacity-100' : 'md:opacity-0 md:w-0 md:overflow-hidden'}
              `}
              title="Módulos do evento"
            >
              <CalendarDays size={18} />
            </span>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {orderedEventModuleItems.map((item) => {
              const isActive =
                item.key === 'overview'
                  ? currentEventTab === 'overview' && eventSuffix !== 'torre'
                  : currentEventTab === item.key;

              return (
                <Link
                  key={item.key}
                  to={item.path}
                  draggable
                  onDragStart={() => handleEventItemDragStart(item.key)}
                  onDragOver={handleEventItemDragOver}
                  onDrop={() => handleEventItemDrop(item.key)}
                  onDragEnd={() => setDraggedEventModuleKey(null)}
                  className={`
                    relative group flex items-center rounded-xl px-3 py-2.5 transition-all
                    ${isEventSidebarCollapsed ? 'md:justify-center md:px-2' : 'md:justify-start'}
                    ${
                      isActive
                        ? 'bg-violet-50 text-violet-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                    ${draggedEventModuleKey === item.key ? 'opacity-60' : ''}
                  `}
                >
                  <item.icon
                    className={`
                      w-4 h-4 mr-3 ${isEventSidebarCollapsed ? 'md:mr-0' : 'md:mr-3'}
                      ${isActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-gray-600'}
                    `}
                  />

                  <span
                    className={`
                      whitespace-nowrap text-sm transition-all duration-200
                      ${
                        isEventSidebarCollapsed
                          ? 'md:opacity-0 md:max-w-0 md:overflow-hidden'
                          : 'md:opacity-100 md:max-w-[220px]'
                      }
                    `}
                  >
                    {item.label}
                  </span>

                  {isEventSidebarCollapsed && (
                    <span
                      className={`
                        hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-3
                        pointer-events-none opacity-0 translate-x-[-2px]
                        group-hover:opacity-100 group-hover:translate-x-0
                        transition-all duration-150 z-50
                      `}
                    >
                      <span className="relative inline-flex items-center">
                        <span className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                          {item.label}
                        </span>
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                      </span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center px-4 justify-between">
          <span className="font-bold text-gray-900">PlanejarPro</span>
          <button
            onClick={() => {
              setIsSidebarCollapsed(false);
              setIsSidebarOpen(true);
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {trialBannerData && !isTrialBannerDismissedToday && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-amber-900">
                  Faltam <span className="font-bold">{trialBannerData.daysLeft} dias</span> para o
                  teste acabar. Garanta a continuidade do seu planejamento{' '}
                  <Link
                    to="/atendimento-ia?origem=trial-banner"
                    className="font-semibold underline hover:text-amber-700"
                  >
                    aqui
                  </Link>
                  .
                </p>
                <button
                  type="button"
                  onClick={dismissTrialBannerForToday}
                  className="text-amber-700 hover:text-amber-900"
                  aria-label="Fechar aviso de teste"
                  title="Fechar por hoje"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {isSidebarOpen && (
        <div
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
        />
      )}

      <PlanAssistantWidget />
    </div>
  );
}



