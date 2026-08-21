import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Company, Plan, Subscription } from '../../shared/types.js';
import { api } from '../services/api.js';

export interface DemoProfile {
  id: string;
  name: string;
  email: string;
  roleDescription: string;
  roleType: 'CLIENT' | 'ADMIN';
  companyName: string;
}

export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: 'usr-farmavida-roberto',
    name: 'Dr. Roberto Mendes',
    email: 'roberto@farmavida.com.br',
    roleDescription: 'Cliente Admin (FarmaVida Brasil)',
    roleType: 'CLIENT',
    companyName: 'Rede FarmaVida Brasil',
  },
  {
    id: 'usr-farmavida-juliana',
    name: 'Juliana Costa',
    email: 'juliana.mkt@farmavida.com.br',
    roleDescription: 'Operador de Marketing (FarmaVida)',
    roleType: 'CLIENT',
    companyName: 'Rede FarmaVida Brasil',
  },
  {
    id: 'usr-smart-marcelo',
    name: 'Marcelo Borges',
    email: 'marcelo@smartvarejo.com.br',
    roleDescription: 'Cliente Admin (SmartVarejo)',
    roleType: 'CLIENT',
    companyName: 'SmartVarejo Sul',
  },
  {
    id: 'usr-admin-carlos',
    name: 'Carlos Andrade',
    email: 'admin@syntechdc.com.br',
    roleDescription: 'Super Admin SYNTECH DC',
    roleType: 'ADMIN',
    companyName: 'SYNTECH DC Matriz',
  },
  {
    id: 'usr-support-felipe',
    name: 'Felipe Castro',
    email: 'felipe.suporte@syntechdc.com.br',
    roleDescription: 'Líder de Suporte SYNTECH DC',
    roleType: 'ADMIN',
    companyName: 'SYNTECH DC Suporte',
  },
];

interface AuthContextData {
  user: User | null;
  company: Company | null;
  subscription: Subscription | null;
  plan: Plan | null;
  availableTenants: { id: string; name: string; status: string }[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  adminLogin: (email: string, password?: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  switchTenant: (companyId: string) => void;
  switchProfileById: (profileId: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [availableTenants, setAvailableTenants] = useState<{ id: string; name: string; status: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshAuth = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMe();
      setUser(data.user);
      setCompany(data.company || null);
      setSubscription(data.subscription || null);
      setPlan(data.plan || null);
      if (data.availableTenants) {
        setAvailableTenants(data.availableTenants);
      }
    } catch (err) {
      console.error('Falha ao autenticar sessão:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check initial user ID in local storage or fallback to demo
    const storedUserId = localStorage.getItem('syntech_user_id');
    if (!storedUserId) {
      localStorage.setItem('syntech_user_id', 'usr-farmavida-roberto');
      localStorage.setItem('syntech_token', 'token_usr-farmavida-roberto');
      localStorage.setItem('syntech_company_id', 'comp-farmavida');
    }
    refreshAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      localStorage.setItem('syntech_token', res.token);
      localStorage.setItem('syntech_user_id', res.user.id);
      localStorage.setItem('syntech_company_id', res.user.companyId || '');
      setUser(res.user);
      setCompany(res.company || null);
      await refreshAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await api.adminLogin(email, password);
      localStorage.setItem('syntech_token', res.token);
      localStorage.setItem('syntech_user_id', res.user.id);
      localStorage.removeItem('syntech_company_id');
      setUser(res.user);
      await refreshAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      localStorage.setItem('syntech_token', res.token);
      localStorage.setItem('syntech_user_id', res.user.id);
      localStorage.setItem('syntech_company_id', res.company.id);
      setUser(res.user);
      setCompany(res.company);
      await refreshAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('syntech_token');
    localStorage.removeItem('syntech_user_id');
    localStorage.removeItem('syntech_company_id');
    setUser(null);
    setCompany(null);
    setSubscription(null);
    setPlan(null);
  };

  const switchTenant = (companyId: string) => {
    localStorage.setItem('syntech_company_id', companyId);
    refreshAuth();
  };

  const switchProfileById = async (profileId: string) => {
    setIsLoading(true);
    try {
      const profile = DEMO_PROFILES.find(p => p.id === profileId);
      if (profile) {
        localStorage.setItem('syntech_user_id', profile.id);
        localStorage.setItem('syntech_token', `token_${profile.id}`);
        if (profile.roleType === 'CLIENT') {
          if (profile.id.includes('farmavida')) {
            localStorage.setItem('syntech_company_id', 'comp-farmavida');
          } else if (profile.id.includes('smart')) {
            localStorage.setItem('syntech_company_id', 'comp-smartvarejo');
          }
        } else {
          localStorage.removeItem('syntech_company_id');
        }
      }
      await refreshAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = user ? ['ADMIN', 'MANAGER', 'SUPPORT', 'OPERATOR'].includes(user.role) : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        subscription,
        plan,
        availableTenants,
        isAuthenticated: !!user,
        isAdmin,
        isLoading,
        login,
        adminLogin,
        register,
        logout,
        switchTenant,
        switchProfileById,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
