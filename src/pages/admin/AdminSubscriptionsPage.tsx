import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.js';
import { Receipt, Edit, CheckCircle2, Calendar, AlertCircle } from 'lucide-react';
import { Subscription } from '../../../shared/types.js';

export const AdminSubscriptionsPage: React.FC = () => {
  const { showToast } = useToast();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [status, setStatus] = useState<any>('ACTIVE');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadSubs = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminSubscriptions();
      setSubscriptions(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar assinaturas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubs();
  }, []);

  const handleOpenEdit = (sub: any) => {
    setEditingSub(sub);
    setStatus(sub.status);
    setExpiresAt(sub.expiresAt ? sub.expiresAt.substring(0, 10) : '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateAdminSubscription(editingSub.id, {
        status,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      showToast('Assinatura atualizada com sucesso!', 'success');
      setIsModalOpen(false);
      loadSubs();
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar assinatura', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Receipt className="w-6 h-6 text-sky-400" />
          <span>Assinaturas Contratadas (Tenants)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Monitoramento de vigência, prorrogação de prazos de vencimento e auditoria de planos.
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Carregando contratos de assinatura..." />
      ) : (
        <Card className="p-0 overflow-hidden bg-slate-900 border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4 font-semibold">Empresa / Tenant</th>
                  <th className="py-3 px-4 font-semibold">Plano</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Início</th>
                  <th className="py-3 px-4 font-semibold">Data de Vencimento</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{sub.companyName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">ID: {sub.id}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-sky-400">
                      {sub.planName}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          sub.status === 'ACTIVE' ? 'success' :
                          sub.status === 'TRIAL' ? 'warning' : 'danger'
                        }
                        size="sm"
                      >
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {new Date(sub.startDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('pt-BR') : 'Sem expiração'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(sub)}
                        leftIcon={<Edit className="w-3.5 h-3.5" />}
                      >
                        Ajustar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Gerenciar Assinatura de Cliente"
        subtitle={`Empresa: ${editingSub?.companyName}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label="Status da Assinatura"
            value={status}
            onChange={e => setStatus(e.target.value as any)}
          >
            <option value="ACTIVE">ACTIVE (Ativo)</option>
            <option value="TRIAL">TRIAL (Período de Testes)</option>
            <option value="PAST_DUE">PAST_DUE (Vencido / Pendente)</option>
            <option value="CANCELED">CANCELED (Cancelado)</option>
          </Select>

          <Input
            label="Nova Data de Vencimento / Renovação"
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
