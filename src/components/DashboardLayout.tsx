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

  // Itens do Menu
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (Desktop: Fixa / Mobile: Overlay) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:inset-auto
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo da Sidebar */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <span className="text-2xl font-bold font-playfair text-gold-500">
              Planejar<span className="text-gray-900">Pro</span>
            </span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden ml-auto p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Links de Navegação */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center px-4 py-3 rounded-xl transition-all group
                    ${
                      isActive
                        ? 'bg-gold-50 text-gold-600 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`w-5 h-5 mr-3 ${isActive ? 'text-gold-500' : 'text-gray-400 group-hover:text-gray-600'}`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Rodapé da Sidebar (Perfil + Ações) */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gold-500 text-white flex items-center justify-center font-bold shadow-sm">
                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 truncate">Administrador</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/dashboard/perfil"
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
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar Mobile */}
        <header className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center px-4 justify-between">
          <span className="font-bold text-gray-900">PlanejarPro</span>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Área de Conteúdo */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
        />
      )}
    </div>
  );
}
