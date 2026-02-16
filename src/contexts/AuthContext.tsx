import { createContext, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

// Tipagem do usuário
interface User {
  id: string;
  name: string;
  email: string;
}

// Tipagem do contexto
interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Função de Login Fake
  const signIn = async (email: string, password: string) => {
    // Simula um delay de API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Validação Hardcoded
    if (email === 'admin@planejar.pro' && password === '123456') {
      // Mudei aqui de "Arthur & Esposa" para "Admin Pro"
      setUser({ id: '1', name: 'Admin Pro', email });
      localStorage.setItem('@PlanejarPro:user', JSON.stringify({ email }));
      navigate('/dashboard');
    } else {
      throw new Error('E-mail ou senha inválidos.');
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('@PlanejarPro:user');
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{ user, signIn, signOut, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar o contexto fácil
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
