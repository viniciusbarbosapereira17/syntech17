import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { StatCard } from '../components/ui/StatCard.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import { 
  Users, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  Calendar, 
  Sparkles, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Radio,
  FileText
} from 'lucide-react';
import { Campaign, SupportTicket } from '../../shared/types.js';

interface DashboardPageProps {
  navigate: (route: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ navigate }) => {
  const { company } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [company?.id]);

  if (isLoading || !data) {
    return <LoadingSpinner label="Carregando métricas corporativas..." />;
  }

  const { metrics, recentCampaigns, openTickets } = data;
  const quotaPercent = Math.min(100, Math.round(((metrics.usedQuota || 0) / (metrics.monthlyQuota || 50000)) * 100));

  const formatExpiration = (dateStr?: string) => {
    if (!dateStr) return '30 dias';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Main KPI Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Total Contatos</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{(metrics.totalContacts || 0).toLocaleString('pt-BR')}</span>
            <span className="text-emerald-500 text-xs font-medium">+4.2%</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Campanhas Ativas</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{String(metrics.activeCampaigns || 0).padStart(2, '0')}</span>
            <span className="text-slate-400 text-xs font-medium">Estável</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Enviadas (Mês)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{(metrics.totalSent || 0).toLocaleString('pt-BR')}</span>
            <span className="text-emerald-500 text-xs font-medium">+12%</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Taxa de Entrega</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.successRate || 99.4}%</span>
            <span className="text-emerald-500 text-xs font-medium">Excelente</span>
          </div>
        </div>
      </section>

      {/* Main Grid: Recent Campaigns & Subscription Card */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Campaigns Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-700">Campanhas Recentes</h3>
              <p className="text-xs text-slate-400 mt-0.5">Histórico e progresso de envios em tempo real</p>
            </div>
            <button 
              onClick={() => navigate('/campanhas')}
              className="text-blue-600 text-xs font-semibold hover:underline cursor-pointer"
            >
              Ver Todas
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recentCampaigns.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                Nenhuma campanha criada até o momento.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Nome da Campanha</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Progresso</th>
                    <th className="px-6 py-3 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentCampaigns.map((camp: Campaign) => {
                    const percent = camp.totalContacts > 0 ? Math.round((camp.processedCount / camp.totalContacts) * 100) : 0;
                    return (
                      <tr key={camp.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {camp.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            camp.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            camp.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
                            camp.status === 'SCHEDULED' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {camp.status === 'COMPLETED' ? 'Finalizado' :
                             camp.status === 'RUNNING' ? 'Processando' :
                             camp.status === 'SCHEDULED' ? 'Agendado' : camp.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-32 space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>{percent}%</span>
                              <span>{camp.processedCount}/{camp.totalContacts}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${camp.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(camp.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Subscription Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col p-6 gap-6 justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 flex items-center justify-between">
              <span>Assinatura</span>
              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded uppercase font-bold">
                {metrics.subscriptionStatus === 'ACTIVE' ? 'Ativa' : 'Trial'}
              </span>
            </h3>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Plano Atual</div>
              <div className="text-lg font-bold text-slate-800 mt-0.5">SYNTECH CORPORATE</div>
              <div className="text-xs text-blue-600 font-semibold mt-1">R$ 499,90 / mês</div>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Próxima Fatura</span>
              <span className="font-semibold text-slate-800">{formatExpiration(metrics.expirationDate)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Limite de Mensagens</span>
              <span className="font-semibold text-slate-800">{(metrics.monthlyQuota || 50000).toLocaleString('pt-BR')}</span>
            </div>

            <div className="space-y-1">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full transition-all duration-500 ${
                    quotaPercent > 90 ? 'bg-rose-500' : quotaPercent > 75 ? 'bg-amber-500' : 'bg-blue-600'
                  }`} 
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 italic text-center mt-1">
                Você utilizou {quotaPercent}% da sua franquia mensal.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button 
              onClick={() => navigate('/campanhas')}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
            >
              Novo Disparo
            </button>
            <button 
              onClick={() => navigate('/suporte')}
              className="w-full py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Suporte ao Cliente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
