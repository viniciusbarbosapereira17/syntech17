import React, { useState } from 'react';
import { useAuth, DEMO_PROFILES } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { ShieldCheck, Sparkles, Building2, Send, Lock, Mail, Phone, User, CheckCircle2 } from 'lucide-react';

interface AuthLayoutProps {
  mode?: 'login' | 'cadastro' | 'admin-login' | 'register';
  type?: 'login' | 'cadastro' | 'admin-login' | 'register';
  navigate?: (route: string) => void;
  onNavigate?: (route: string) => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = (props) => {
  const mode = props.mode === 'register' ? 'cadastro' : props.type === 'register' ? 'cadastro' : (props.mode || props.type || 'login');
  const navigate = props.navigate || props.onNavigate || ((route: string) => { window.location.pathname = route; });
  const { login, adminLogin, register, switchProfileById } = useAuth();
  const { showToast } = useToast();

  // Login form state
  const [email, setEmail] = useState('roberto@farmavida.com.br');
  const [password, setPassword] = useState('syntech@2026');

  // Register form state
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'cadastro') {
      if (!registerPassword || registerPassword.length < 6) {
        showToast('A senha de acesso deve possuir pelo menos 6 caracteres.', 'error', 'Validação');
        return;
      }
      if (registerPassword !== confirmPassword) {
        showToast('A confirmação de senha não confere com a senha digitada.', 'error', 'Validação');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        showToast('Login realizado com sucesso!', 'success', 'Bem-vindo');
        navigate('/dashboard');
      } else if (mode === 'admin-login') {
        await adminLogin(email, password);
        showToast('Acesso administrativo autenticado!', 'success', 'Syntech Core');
        navigate('/admin/dashboard');
      } else if (mode === 'cadastro') {
        await register({
          companyName,
          tradeName,
          cnpj,
          adminName,
          adminEmail,
          phone,
          password: registerPassword,
          planId: 'plan-pro',
        });
        showToast('Conta corporativa criada com sucesso!', 'success', 'Bem-vindo à Syntech DC');
        navigate('/dashboard');
      }
    } catch (err: any) {
      showToast(err.message || 'Falha na operação de autenticação.', 'error', 'Erro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (profileId: string) => {
    try {
      await switchProfileById(profileId);
      const target = DEMO_PROFILES.find(p => p.id === profileId);
      showToast(`Conectado como ${target?.name}`, 'info', 'Acesso Rápido');
      if (target?.roleType === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao alternar perfil', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 antialiased">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* Left Side: Brand Value Proposition (45%) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-sky-950 via-slate-900 to-[#0b1329] p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 relative overflow-hidden">
          {/* Subtle glow background */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-sky-500/30">
                SD
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight leading-none">
                  SYNTECH <span className="text-sky-400">DC</span>
                </h2>
                <p className="text-xs text-sky-200/80 font-medium tracking-wide mt-1">
                  Disparos Corporativos & Multi-Tenant
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-2xl font-bold text-white leading-tight">
                Infraestrutura corporativa oficial para disparo em escala.
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Gerencie réguas de comunicação, variáveis dinâmicas personalizadas e acompanhe métricas de entrega em tempo real com isolamento total por empresa.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Isolamento multi-tenant seguro por tenant_id</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Integração com Meta WhatsApp Cloud API Oficial</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Painel interno de governança e suporte com SLA</span>
              </div>
            </div>
          </div>

          {/* Quick Demo Selector */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 relative z-10">
            <p className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider mb-2.5">
              ⚡ Teste Rápido (1-Clique):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('usr-farmavida-roberto')}
                className="text-left px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-white truncate">Dr. Roberto (FarmaVida)</div>
                <div className="text-[10px] text-sky-400">Portal do Cliente</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('usr-admin-carlos')}
                className="text-left px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-white truncate">Carlos Andrade (Admin)</div>
                <div className="text-[10px] text-emerald-400">Painel Interno Core</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Form View (55%) */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-slate-900">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => {
                  navigate('/login');
                  setEmail('roberto@farmavida.com.br');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'login' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Portal Cliente
              </button>
              <button
                onClick={() => navigate('/cadastro')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'cadastro' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Novo Cadastro
              </button>
              <button
                onClick={() => {
                  navigate('/admin/login');
                  setEmail('admin@syntechdc.com.br');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'admin-login' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Admin Syntech
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                {mode === 'login' && 'Acesso ao Portal do Cliente'}
                {mode === 'cadastro' && 'Criar Nova Conta Corporativa'}
                {mode === 'admin-login' && 'Acesso Administrativo Interno'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login' && 'Entre com seu e-mail corporativo cadastrado.'}
                {mode === 'cadastro' && 'Experimente 14 dias grátis com cota de testes inclusa.'}
                {mode === 'admin-login' && 'Área restrita aos operadores e engenharia SYNTECH DC.'}
              </p>
            </div>

            {/* Forms */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'cadastro' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Razão Social"
                      placeholder="Ex: Farmácia Central S.A."
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      required
                    />
                    <Input
                      label="Nome Fantasia"
                      placeholder="Ex: Farma Central"
                      value={tradeName}
                      onChange={e => setTradeName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="CNPJ"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={e => setCnpj(e.target.value)}
                      required
                    />
                    <Input
                      label="WhatsApp do Administrador"
                      placeholder="+55 11 99999-8888"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Nome do Gestor Responsável"
                      placeholder="Ex: Carlos Mendes"
                      value={adminName}
                      onChange={e => setAdminName(e.target.value)}
                      required
                    />
                    <Input
                      label="E-mail Corporativo"
                      type="email"
                      placeholder="gestor@empresa.com.br"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Senha de Acesso"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={registerPassword}
                      onChange={e => setRegisterPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                      required
                    />
                    <Input
                      label="Confirmar Senha"
                      type="password"
                      placeholder="Repita sua senha"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="seu.email@empresa.com.br"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    required
                  />

                  <Input
                    label="Senha de Acesso"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    required
                  />
                </>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                {mode === 'login' && 'Entrar no Portal'}
                {mode === 'cadastro' && 'Criar Conta e Iniciar Teste'}
                {mode === 'admin-login' && 'Autenticar Acesso Admin'}
              </Button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-500">
              Ambiente seguro com criptografia e isolamento multi-tenant de dados.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
