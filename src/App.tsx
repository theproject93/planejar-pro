import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';
import { ProfilePage } from './pages/ProfilePage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { type ReactNode } from 'react';

// Componente para proteger rotas
function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// Conteúdo da Home do Dashboard
function DashboardHome() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6 font-playfair">
        Visão Geral
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Eventos Ativos</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">12</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">
            Próximo Casamento
          </h3>
          <p className="text-lg font-bold text-gray-900 mt-2">Carla & João</p>
          <p className="text-sm text-gold-500 font-semibold">Em 5 dias</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">
            Faturamento (Mês)
          </h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">R$ 15.400</p>
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
            {/* AGORA SIM: Rota correta para a página de eventos */}
            <Route path="eventos" element={<EventsPage />} />
            <Route path="eventos/:id" element={<EventDetailsPage />} />{' '}
            {/* Nova Rota Dinâmica */}
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
