import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { Card } from '../components/ui/Card.js';
import { StatCard } from '../components/ui/StatCard.js';
import { Button } from '../components/ui/Button.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import { 
  BarChart3, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Percent, 
  ShieldCheck, 
  FileSpreadsheet 
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSummary = async () => {
    try {
      setIsLoading(true);
      const res = await api.getReportsSummary();
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar relatórios', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const headers = ['Métrica', 'Valor'];
    const rows = [
      ['Total de Mensagens Alvo', data.totalMessages],
      ['Mensagens Entregues', data.sentMessages],
      ['Falhas de Envio', data.failedMessages],
      ['Taxa de Sucesso', `${data.successRate}%`],
      ['Taxa de Falha', `${data.failureRate}%`],
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_analitico_syntech_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório CSV exportado com sucesso.', 'info');
  };

  if (isLoading || !data) {
    return <LoadingSpinner label="Compilando relatórios analíticos de entrega..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-500" />
            <span>Relatórios Analíticos & Taxas de Entrega</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Auditoria detalhada de conversão, volumes de transmissão e motivos de recusa.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportCSV} leftIcon={<Download className="w-4 h-4" />}>
          Exportar Relatório Geral
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Processado"
          value={(data.totalMessages || 0).toLocaleString('pt-BR')}
          subtitle="Disparos executados na plataforma"
          icon={<BarChart3 className="w-5 h-5 text-sky-500" />}
          iconBgColor="bg-sky-500/10"
        />

        <StatCard
          title="Taxa de Entrega"
          value={`${data.successRate}%`}
          subtitle={`${(data.sentMessages || 0).toLocaleString('pt-BR')} entregues com sucesso`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          iconBgColor="bg-emerald-500/10"
          badge={{ text: 'Excelente', variant: 'success' }}
        />

        <StatCard
          title="Falhas Detectadas"
          value={(data.failedMessages || 0).toLocaleString('pt-BR')}
          subtitle={`Taxa de recusa de ${data.failureRate}%`}
          icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
          iconBgColor="bg-rose-500/10"
          badge={{ text: `${data.failureRate}%`, variant: 'danger' }}
        />

        <StatCard
          title="Campanhas Ativas"
          value={data.campaignsSummary?.length || 0}
          subtitle="Monitoramento em tempo real"
          icon={<Clock className="w-5 h-5 text-indigo-500" />}
          iconBgColor="bg-indigo-500/10"
        />
      </div>

      {/* Breakdown per campaign */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Desempenho por Campanha
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-3 font-semibold">Campanha</th>
                <th className="py-3 px-3 font-semibold">Total Alvo</th>
                <th className="py-3 px-3 font-semibold">Entregues</th>
                <th className="py-3 px-3 font-semibold">Falhas</th>
                <th className="py-3 px-3 font-semibold">Taxa de Sucesso</th>
                <th className="py-3 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.campaignsSummary?.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{c.name}</td>
                  <td className="py-3 px-3 font-mono">{(c.totalContacts || 0).toLocaleString('pt-BR')}</td>
                  <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{(c.sentCount || 0).toLocaleString('pt-BR')}</td>
                  <td className="py-3 px-3 font-mono text-rose-500 font-semibold">{(c.failedCount || 0).toLocaleString('pt-BR')}</td>
                  <td className="py-3 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">{c.successRate}%</td>
                  <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
