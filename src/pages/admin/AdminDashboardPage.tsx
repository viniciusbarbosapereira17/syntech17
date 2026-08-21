import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.js';
import { 
  DollarSign, 
  Building2, 
  Send, 
  Headphones, 
  Users, 
  Activity, 
  ArrowRight, 
  ShieldCheck, 
  Server, 
  ExternalLink,
  Zap,
  RotateCw
} from 'lucide-react';

interface AdminDashboardPageProps {
  navigate: (route: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ navigate }) => {
  const { switchTenant } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminDashboard();
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar métricas administrativas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInspectTenant = (companyId: string, companyName: string) => {
    switchTenant(companyId);
    showToast(`Alternando contexto para visualizar como "${companyName}"`, 'info');
    navigate('/dashboard');
  };

  if (isLoading || !data) {
    return <LoadingSpinner label="Carregando centro de comando SYNTECH DC..." />;
  }

  const { metrics, recentLogs, tenantsOverview } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Centro de Comando SYNTECH DC
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              Produção Online
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Governança multi-tenant, auditoria em tempo real, monitor de MRR e infraestrutura WABA.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={loadData} leftIcon={<RotateCw className="w-4 h-4" />}>
            Atualizar Métricas
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/clientes')} leftIcon={<Building2 className="w-4 h-4" />}>
            Cadastrar Nova Empresa
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Receita Mensal Recorrente (MRR)"
          value={`R$ ${(metrics.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="SaaS Assinaturas Ativas"
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          iconBgColor="bg-emerald-500/10"
          badge={{ text: '+18% este mês', variant: 'success' }}
        />

        <StatCard
          title="Empresas (Tenants)"
          value={metrics.totalCompanies || 0}
          subtitle={`${metrics.activeCompanies || 0} ativas • ${metrics.trialCompanies || 0} em trial`}
          icon={<Building2 className="w-5 h-5 text-sky-400" />}
          iconBgColor="bg-sky-500/10"
        />

        <StatCard
          title="Disparos Globais (Mês)"
          value={(metrics.totalMonthlyDispatches || 0).toLocaleString('pt-BR')}
          subtitle="Processados na Meta Cloud API"
          icon={<Send className="w-5 h-5 text-indigo-400" />}
          iconBgColor="bg-indigo-500/10"
        />

        <StatCard
          title="Chamados em Aberto"
          value={metrics.openTickets || 0}
          subtitle="SLA médio de 18 minutos"
          icon={<Headphones className="w-5 h-5 text-amber-400" />}
          iconBgColor="bg-amber-500/10"
          badge={{
            text: metrics.openTickets > 0 ? 'Ação requerida' : 'Zerado',
            variant: metrics.openTickets > 0 ? 'warning' : 'success',
          }}
        />
      </div>

      {/* Tenants Summary & Quick Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenants List (2 cols) */}
        <Card className="p-6 space-y-4 lg:col-span-2 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Empresas Cadastradas (Tenants)</h3>
              <p className="text-xs text-slate-400">Visão consolidada de consumo de cotas e status</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/clientes')} className="text-sky-400">
              <span>Gerenciar Todas</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-3 font-semibold">Empresa / CNPJ</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold">Cota Utilizada</th>
                  <th className="py-3 px-3 font-semibold text-right">Inspecionar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tenantsOverview?.map((t: any) => {
                  const percent = Math.min(100, Math.round((t.usedQuota / t.monthlyQuota) * 100));
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white">{t.tradeName || t.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{t.cnpj}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge
                          variant={t.status === 'ACTIVE' ? 'success' : t.status === 'TRIAL' ? 'warning' : 'danger'}
                          size="sm"
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{percent}%</span>
                            <span>{t.usedQuota}/{t.monthlyQuota}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleInspectTenant(t.id, t.tradeName || t.name)}
                          leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                        >
                          Acessar Portal
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Real-time Audit Logs Feed (1 col) */}
        <Card className="p-6 space-y-4 bg-slate-900 border-slate-800 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Logs de Auditoria</span>
              </h3>
              <button
                onClick={() => navigate('/admin/logs')}
                className="text-xs text-sky-400 hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {recentLogs?.map((log: any) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sky-300 font-mono text-[11px]">{log.action}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] truncate">
                    {log.details ? JSON.stringify(log.details) : `Entidade: ${log.entity}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
            <span>Cluster Status:</span>
            <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              100% OPERATIONAL
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};
