import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.js';
import { PackageCheck, Plus, Edit, Zap, CheckCircle2 } from 'lucide-react';
import { Plan } from '../../../shared/types.js';

export const AdminPlansPage: React.FC = () => {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(490);
  const [messageQuota, setMessageQuota] = useState(25000);
  const [maxContacts, setMaxContacts] = useState(10000);
  const [campaignLimit, setCampaignLimit] = useState(100);
  const [isSaving, setIsSaving] = useState(false);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminPlans();
      setPlans(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar planos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenEdit = (p: Plan) => {
    setEditingPlan(p);
    setName(p.name);
    setDescription(p.description);
    setPrice(p.price);
    setMessageQuota(p.messageQuota);
    setMaxContacts(p.contactLimit || 10000);
    setCampaignLimit(100);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setName('');
    setDescription('');
    setPrice(490);
    setMessageQuota(25000);
    setMaxContacts(10000);
    setCampaignLimit(100);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingPlan) {
        await api.updateAdminPlan(editingPlan.id, {
          name,
          description,
          price: Number(price),
          messageQuota: Number(messageQuota),
          contactLimit: Number(maxContacts),
        });
        showToast('Plano comercial atualizado com sucesso!', 'success');
      } else {
        await api.createAdminPlan({
          name,
          description,
          price: Number(price),
          messageQuota: Number(messageQuota),
          contactLimit: Number(maxContacts),
        });
        showToast('Novo plano criado com sucesso!', 'success');
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar plano', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-sky-400" />
            <span>Planos, Precificação & Cotas WABA</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure pacotes mensais, precificação recorrente e limites de throughput.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
          Criar Novo Plano
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Carregando planos..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => (
            <Card key={p.id} className="p-6 bg-slate-900 border-slate-800 flex flex-col justify-between space-y-6 hoverable">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{p.description}</p>
                  </div>
                  <Badge variant={p.isActive ? 'success' : 'default'} size="sm">
                    {p.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                <div className="pt-2">
                  <span className="text-3xl font-black font-mono text-white">
                    R$ {(p.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400"> / mês</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-400">Cota Mensal:</span>
                    <span className="text-sky-400 font-mono">{(p.messageQuota || 0).toLocaleString('pt-BR')} msgs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Limite de Contatos:</span>
                    <span className="font-mono text-white">{(p.contactLimit || 0).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Campanhas:</span>
                    <span className="font-mono text-white">{p.features?.[0] || 'Ilimitadas'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleOpenEdit(p)}
                  leftIcon={<Edit className="w-4 h-4" />}
                >
                  Editar Parâmetros
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Editar Plano Comercial' : 'Criar Novo Plano'}
        subtitle="Defina os valores e as cotas contratuais."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nome do Plano *"
            placeholder="Ex: Plano Enterprise Custom"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <Input
            label="Descrição Curta"
            placeholder="Ex: Para redes com alto volume e filiais regionais"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Preço Mensal (R$) *"
              type="number"
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
              required
            />
            <Input
              label="Cota de Mensagens / Mês *"
              type="number"
              value={messageQuota}
              onChange={e => setMessageQuota(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Máximo de Contatos"
              type="number"
              value={maxContacts}
              onChange={e => setMaxContacts(Number(e.target.value))}
              required
            />
            <Input
              label="Limite de Campanhas Simultâneas"
              type="number"
              value={campaignLimit}
              onChange={e => setCampaignLimit(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Salvar Plano
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
