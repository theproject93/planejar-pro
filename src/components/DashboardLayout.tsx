import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Desktop: começa recolhido (só ícones). Expande ao passar o mouse.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
    { path: '/dashboard/eventos', icon: CalendarDays, label: 'Eventos' },
    { path: '/dashboard/clientes', icon: Users, label: 'Clientes' },
    { path: '/dashboard/financeiro', icon: DollarSign, label: 'Financeiro' },
    {
      path: '/dashboard/configuracoes',
      icon: Settings,
      label: 'Configurações',
    },
  ];

  function closeMobileSidebar() {
    setIsSidebarOpen(false);
    setIsSidebarCollapsed(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
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
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            {/* Logo completo */}
            <span
              className={`
                text-2xl font-bold font-playfair text-gold-500 whitespace-nowrap
                transition-all duration-200
                ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'md:opacity-100'}
              `}
            >
              Planejar<span className="text-gray-900">Pro</span>
            </span>

            {/* Logo compacto */}
            <span
              className={`
                hidden md:flex items-center justify-center
                text-xl font-bold font-playfair text-gold-500
                transition-all duration-200
                ${isSidebarCollapsed ? 'md:opacity-100' : 'md:opacity-0 md:w-0 md:overflow-hidden'}
              `}
              aria-label="PlanejarPro"
              title="PlanejarPro"
            >
              PP
            </span>

            <button
              onClick={closeMobileSidebar}
              className="md:hidden ml-auto p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navegação */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;

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

                  {/* Label normal (some quando recolhido) */}
                  <span
                    className={`
                      whitespace-nowrap
                      transition-all duration-200
                      ${
                        isSidebarCollapsed
                          ? 'md:opacity-0 md:max-w-0 md:overflow-hidden'
                          : 'md:opacity-100 md:max-w-[200px]'
                      }
                    `}
                  >
                    {item.label}
                  </span>

                  {/* Tooltip (somente quando recolhido, somente desktop) */}
                  {isSidebarCollapsed && (
                    <span
                      className={`
                        hidden md:block
                        absolute left-full top-1/2 -translate-y-1/2 ml-3
                        pointer-events-none
                        opacity-0 translate-x-[-2px]
                        group-hover:opacity-100 group-hover:translate-x-0
                        transition-all duration-150
                        z-50
                      `}
                    >
                      <span className="relative inline-flex items-center">
                        {/* Caixa */}
                        <span className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                          {item.label}
                        </span>

                        {/* Setinha */}
                        <span
                          className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"
                          aria-hidden="true"
                        />
                      </span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Rodapé */}
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

            {/* Ações (mobile e desktop expandido) */}
            <div
              className={`
                grid grid-cols-2 gap-2
                ${isSidebarCollapsed ? 'md:hidden' : 'md:grid'}
              `}
            >
              <Link
                to="/dashboard/perfil"
                onClick={closeMobileSidebar}
                className="flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gold-600 transition-colors shadow-sm"
                title="Meu Perfil"
              >
                <Settings size={16} className="mr-2" />
                Perfil
              </Link>

              <button
                onClick={signOut}
                className="flex items-center justify-center px-3 py-2 text-xs font-medium text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-100 transition-colors shadow-sm"
                title="Sair do Sistema"
              >
                <LogOut size={16} className="mr-2" />
                Sair
              </button>
            </div>

            {/* Ações compactas (somente desktop recolhido) */}
            <div
              className={`
                ${isSidebarCollapsed ? 'hidden md:flex' : 'hidden'}
                flex flex-col gap-2
              `}
            >
              {/* Perfil (com tooltip) */}
              <Link
                to="/dashboard/perfil"
                className="relative group flex items-center justify-center p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gold-600 transition-colors shadow-sm"
                title="Meu Perfil"
                aria-label="Meu Perfil"
              >
                <Settings size={18} />
                <span
                  className={`
                    hidden md:block
                    absolute left-full top-1/2 -translate-y-1/2 ml-3
                    pointer-events-none
                    opacity-0 translate-x-[-2px]
                    group-hover:opacity-100 group-hover:translate-x-0
                    transition-all duration-150
                    z-50
                  `}
                >
                  <span className="relative inline-flex items-center">
                    <span className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                      Meu Perfil
                    </span>
                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                  </span>
                </span>
              </Link>

              {/* Sair (com tooltip) */}
              <button
                onClick={signOut}
                className="relative group flex items-center justify-center p-2 text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-100 transition-colors shadow-sm"
                title="Sair do Sistema"
                aria-label="Sair do Sistema"
              >
                <LogOut size={18} />
                <span
                  className={`
                    hidden md:block
                    absolute left-full top-1/2 -translate-y-1/2 ml-3
                    pointer-events-none
                    opacity-0 translate-x-[-2px]
                    group-hover:opacity-100 group-hover:translate-x-0
                    transition-all duration-150
                    z-50
                  `}
                >
                  <span className="relative inline-flex items-center">
                    <span className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                      Sair
                    </span>
                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar Mobile */}
        <header className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center px-4 justify-between">
          <span className="font-bold text-gray-900">PlanejarPro</span>
          <button
            onClick={() => {
              // Ao abrir no mobile, mantém expandido e trava recolhimento por hover
              setIsSidebarCollapsed(false);
              setIsSidebarOpen(true);
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
        />
      )}
    </div>
  );
}
