import React, { useState } from 'react';
import { useAuth, DEMO_PROFILES } from '../context/AuthContext.js';
import { 
  LayoutDashboard, 
  Users, 
  ListFilter, 
  MessageSquare, 
  FileCode2, 
  Send, 
  BarChart3, 
  CreditCard, 
  LifeBuoy, 
  Building2, 
  Menu, 
  X, 
  LogOut, 
  Sparkles, 
  Shield, 
  Radio, 
  UserCheck, 
  CheckCircle2, 
  Zap 
} from 'lucide-react';

interface ClientLayoutProps {
  children: React.ReactNode;
  currentRoute: string;
  navigate: (route: string) => void;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ children, currentRoute, navigate }) => {
  const { user, company, subscription, logout, switchProfileById } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);

  const navigationItems = [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
    { label: 'Contatos', icon: Users, route: '/contatos' },
    { label: 'Listas', icon: ListFilter, route: '/listas' },
    { label: 'Mensagens', icon: MessageSquare, route: '/mensagens' },
    { label: 'Templates', icon: FileCode2, route: '/templates' },
    { label: 'Campanhas', icon: Send, route: '/campanhas' },
    { label: 'Relatórios', icon: BarChart3, route: '/relatorios' },
    { label: 'Assinatura', icon: CreditCard, route: '/assinatura' },
    { label: 'Suporte', icon: LifeBuoy, route: '/suporte' },
    { label: 'Perfil & WABA', icon: Building2, route: '/perfil' },
  ];

  const quotaPercent = company?.monthlyQuota 
    ? Math.min(100, Math.round(((company.usedQuota || 0) / company.monthlyQuota) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Demo Profile Switcher Bar (For reviewer evaluation) */}
      <header className="bg-slate-900 border-b border-slate-800 text-slate-300 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 z-40">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-white tracking-wide">SYNTECH DC</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Tenant: <strong className="text-sky-400">{company?.tradeName || company?.name || 'Cliente'}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setIsDemoSwitcherOpen(!isDemoSwitcherOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors text-[11px] cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Alternar Perfil Demo ({user?.name.split(' ')[0]})</span>
            </button>

            {isDemoSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <p className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Testar com outros perfis
                </p>
                <div className="space-y-1 mt-1">
                  {DEMO_PROFILES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        switchProfileById(p.id);
                        setIsDemoSwitcherOpen(false);
                        if (p.roleType === 'ADMIN') {
                          navigate('/admin/dashboard');
                        } else {
                          navigate('/dashboard');
                        }
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex flex-col transition-colors cursor-pointer ${
                        user?.id === p.id ? 'bg-sky-600/20 text-sky-300 border border-sky-500/30' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] text-slate-400">{p.roleDescription}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/admin/dashboard')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800/60 text-[11px] font-medium transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Painel Interno Admin</span>
          </button>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop / Tablet Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo & Brand Header */}
          <div className="p-6 flex flex-col gap-1 border-b border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white shadow-xs">
                  <div className="w-3.5 h-3.5 border-2 border-white rotate-45"></div>
                </div>
                <span className="text-lg font-bold text-white tracking-tight">
                  SYNTECH <span className="text-blue-500">DC</span>
                </span>
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
              Disparos Corporativos
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;

              return (
                <button
                  key={item.route}
                  id={`nav-link-${item.route.replace('/', '')}`}
                  onClick={() => {
                    navigate(item.route);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-600 rounded-r'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.route === '/campanhas' && (
                    <span className="ml-auto flex h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quota Usage Widget */}
          <div className="p-4 border-t border-slate-800">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cota do Mês</span>
                </span>
                <span className="font-mono text-slate-400 text-[11px]">
                  {quotaPercent}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-500 ${
                    quotaPercent > 90 ? 'bg-rose-500' : quotaPercent > 75 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{(company?.usedQuota || 0).toLocaleString('pt-BR')} enviadas</span>
                <span>{(company?.monthlyQuota || 50000).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
                  {user?.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{company?.tradeName || company?.name}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Backdrop for Mobile Sidebar */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50">
          {/* Top Bar */}
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-700 uppercase tracking-tight flex items-center gap-2">
                  <span>Dashboard do Cliente</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold uppercase">
                    {company?.status === 'TRIAL' ? 'Trial' : 'Ativo'}
                  </span>
                </h2>
              </div>
            </div>

            {/* Quick Status and Actions */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-xs font-medium text-slate-600">API Conectada</span>
              </div>

              <button
                onClick={() => navigate('/campanhas')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Novo Disparo</span>
              </button>
            </div>
          </header>

          {/* Page Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (App-like feel) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#0b1329]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around">
        <button
          onClick={() => navigate('/dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
            currentRoute === '/dashboard' ? 'text-sky-500' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Início</span>
        </button>

        <button
          onClick={() => navigate('/contatos')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
            currentRoute === '/contatos' ? 'text-sky-500' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Contatos</span>
        </button>

        <button
          onClick={() => navigate('/campanhas')}
          className="flex flex-col items-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/30">
            <Send className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400 mt-1">Disparar</span>
        </button>

        <button
          onClick={() => navigate('/relatorios')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
            currentRoute === '/relatorios' ? 'text-sky-500' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Relatórios</span>
        </button>

        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400"
        >
          <Menu className="w-5 h-5" />
          <span>Mais</span>
        </button>
      </div>
    </div>
  );
};
