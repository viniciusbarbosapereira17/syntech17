import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.js';
import { DollarSign, Download, CheckCircle2 } from 'lucide-react';

export const AdminPaymentsPage: React.FC = () => {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminPayments();
      setPayments(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar pagamentos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const totalRevenue = payments
    .filter(p => p.status === 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <span>Faturamento Global & Transações</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Auditoria financeira de pagamentos, cobranças PIX, boletos e cartões de crédito.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
          Total Liquidado: R$ {(totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Carregando transações..." />
      ) : (
        <Card className="p-0 overflow-hidden bg-slate-900 border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4 font-semibold">Código / Transação</th>
                  <th className="py-3 px-4 font-semibold">Empresa</th>
                  <th className="py-3 px-4 font-semibold">Valor</th>
                  <th className="py-3 px-4 font-semibold">Método</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-mono text-slate-300 font-medium">
                      {p.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {p.companyName}
                    </td>
                    <td className="py-3.5 px-4 font-bold font-mono text-emerald-400 text-sm">
                      R$ {(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-semibold uppercase text-slate-300">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={p.status === 'PAID' ? 'success' : 'warning'} size="sm">
                        {p.status === 'PAID' ? 'Liquidado' : p.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-right">
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
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
