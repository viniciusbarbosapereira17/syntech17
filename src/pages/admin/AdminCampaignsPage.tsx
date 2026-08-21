import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.js';
import { Send, RotateCw, CheckCircle2, Zap } from 'lucide-react';

export const AdminCampaignsPage: React.FC = () => {
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminCampaigns();
      setCampaigns(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar campanhas globais', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-sky-400" />
            <span>Fila Global de Disparos em Execução</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visão consolidada de todas as campanhas em trânsito de todos os clientes corporativos.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={loadData} leftIcon={<RotateCw className="w-4 h-4" />}>
          Atualizar Fila
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Carregando fila global..." />
      ) : (
        <Card className="p-0 overflow-hidden bg-slate-900 border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4 font-semibold">Campanha</th>
                  <th className="py-3 px-4 font-semibold">Empresa Solicitante</th>
                  <th className="py-3 px-4 font-semibold">Progresso da Fila</th>
                  <th className="py-3 px-4 font-semibold">Entregues / Falhas</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Iniciada em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {campaigns.map(c => {
                  const progress = c.totalContacts > 0 ? Math.round((c.processedCount / c.totalContacts) * 100) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{c.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {c.id}</div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {c.companyName}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{progress}%</span>
                            <span>{c.processedCount}/{c.totalContacts}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-emerald-400 font-semibold">{c.sentCount} ok</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-rose-400 font-semibold">{c.failedCount} err</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            c.status === 'COMPLETED' ? 'success' :
                            c.status === 'RUNNING' ? 'info' :
                            c.status === 'PAUSED' ? 'warning' : 'danger'
                          }
                          size="sm"
                          dot={c.status === 'RUNNING'}
                        >
                          {c.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-right">
                        {new Date(c.createdAt).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
