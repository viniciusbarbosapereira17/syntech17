import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.js';
import { Activity, ShieldCheck, RotateCw } from 'lucide-react';
import { AuditLog } from '../../../shared/types.js';

export const AdminLogsPage: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminLogs();
      setLogs(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar logs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            <span>Trilha de Auditoria & Logs de Governança</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Registro imutável de todas as ações administrativas, alterações de permissões e logins de usuários.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={loadLogs} leftIcon={<RotateCw className="w-4 h-4" />}>
          Atualizar Logs
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Carregando logs de auditoria..." />
      ) : (
        <Card className="p-0 overflow-hidden bg-slate-900 border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Ação Executada</th>
                  <th className="py-3 px-4 font-semibold">Entidade</th>
                  <th className="py-3 px-4 font-semibold">Usuário Responsável</th>
                  <th className="py-3 px-4 font-semibold">IP Origem</th>
                  <th className="py-3 px-4 font-semibold">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sky-400">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {log.entity}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      {log.userId || 'system'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {log.ip || '127.0.0.1'}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-300 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
