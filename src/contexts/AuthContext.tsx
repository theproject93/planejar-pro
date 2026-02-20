import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInWithProvider: (provider: 'google' | 'azure') => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const superAdminEmails = useMemo(
    () =>
      ((import.meta.env.VITE_SUPER_ADMIN_EMAILS as string | undefined) ?? '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0),
    []
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const currentUser = user;
    if (!currentUser) {
      setIsSuperAdmin(false);
      return;
    }

    const metadata =
      (currentUser.user_metadata as Record<string, unknown> | undefined) ?? {};
    const role =
      typeof metadata.role === 'string'
        ? metadata.role.toLowerCase().trim()
        : null;
    const metadataIsSuper =
      metadata.is_super_admin === true ||
      metadata.super_admin === true ||
      role === 'super_admin';
    const email = currentUser.email?.toLowerCase().trim() ?? '';
    const envIsSuper = email.length > 0 && superAdminEmails.includes(email);

    if (metadataIsSuper || envIsSuper) {
      setIsSuperAdmin(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('super_admin_users')
        .select('user_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!cancelled) {
        setIsSuperAdmin(Boolean(data?.user_id));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, superAdminEmails]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          name: (name ?? '').trim(),
          plan_interest: 'trial_30d',
          trial_days: 30,
        },
      },
    });

    if (error) throw error;
  };

  const signInWithProvider = async (provider: 'google' | 'azure') => {
    const scopes = provider === 'azure' ? 'email' : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes,
      },
    });

    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signIn,
        signUp,
        signInWithProvider,
        signOut,
        isAuthenticated: !!user,
        isSuperAdmin,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
