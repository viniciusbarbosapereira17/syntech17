import React, { useState } from 'react';
import { useAuth, DEMO_PROFILES } from '../context/AuthContext.js';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Building2, 
  Users2, 
  PackageCheck, 
  Receipt, 
  DollarSign, 
  Headphones, 
  Send, 
  ScrollText, 
  Sliders, 
  LogOut, 
  UserCheck, 
  ExternalLink, 
  Activity, 
  Menu, 
  X,
  Server
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentRoute?: string;
  currentPath?: string;
  navigate?: (route: string) => void;
  onNavigate?: (route: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = (props) => {
  const { children } = props;
  const currentRoute = props.currentRoute || props.currentPath || '/admin/dashboard';
  const navigate = props.navigate || props.onNavigate || ((route: string) => { window.location.pathname = route; });
  const { user, logout, switchProfileById } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);

  const adminNavItems = [
    { label: 'Painel Geral', icon: LayoutDashboard, route: '/admin/dashboard' },
    { label: 'Empresas (Tenants)', icon: Building2, route: '/admin/clientes' },
    { label: 'Usuários & Operadores', icon: Users2, route: '/admin/usuarios' },
    { label: 'Planos & Precificação', icon: PackageCheck, route: '/admin/planos' },
    { label: 'Assinaturas Ativas', icon: Receipt, route: '/admin/assinaturas' },
    { label: 'Receitas & Pagamentos', icon: DollarSign, route: '/admin/pagamentos' },
    { label: 'Central de Suporte (SLA)', icon: Headphones, route: '/admin/suporte' },
    { label: 'Fila Global de Disparos', icon: Send, route: '/admin/campanhas' },
    { label: 'Logs de Auditoria', icon: ScrollText, route: '/admin/logs' },
    { label: 'Infra & Configurações', icon: Sliders, route: '/admin/configuracoes' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Admin Command Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs tracking-tight">
              SD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-tight">SYNTECH DC</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                  CORE ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Painel Administrativo Interno</p>
            </div>
          </div>
        </div>

        {/* Status indicator & profile switch */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">WABA Cluster:</span>
            <span className="text-emerald-400 font-mono font-bold">ONLINE 99.99%</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsDemoSwitcherOpen(!isDemoSwitcherOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Operador: {user?.name.split(' ')[0]}</span>
            </button>

            {isDemoSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Alternar operador ou cliente
                </p>
                <div className="space-y-1 mt-1">
                  {DEMO_PROFILES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        switchProfileById(p.id);
                        setIsDemoSwitcherOpen(false);
                        if (p.roleType === 'CLIENT') {
                          navigate('/dashboard');
                        } else {
                          navigate('/admin/dashboard');
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex flex-col transition-colors cursor-pointer ${
                        user?.id === p.id ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className={`text-[10px] ${user?.id === p.id ? 'text-blue-100' : 'text-slate-400'}`}>{p.roleDescription}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium cursor-pointer"
            title="Ir para o Portal do Cliente"
          >
            <span>Portal Cliente</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="lg:hidden p-4 flex justify-between items-center border-b border-slate-800">
            <span className="font-bold text-sm text-white">Menu Syntech DC</span>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Gestão & Infraestrutura
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {adminNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;

              return (
                <button
                  key={item.route}
                  id={`admin-nav-${item.route.replace('/admin/', '')}`}
                  onClick={() => {
                    navigate(item.route);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Admin User Footer */}
          <div className="p-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400">
                {user?.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-emerald-400 font-mono font-medium">{user?.role}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Encerrar sessão de administrador"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
