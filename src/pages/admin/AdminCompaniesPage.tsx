import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.js';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  KeyRound, 
  ExternalLink, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Trash2 
} from 'lucide-react';
import { Company } from '../../../shared/types.js';

interface AdminCompaniesPageProps {
  navigate?: (route: string) => void;
}

export const AdminCompaniesPage: React.FC<AdminCompaniesPageProps> = ({ navigate }) => {
  const { switchTenant } = useAuth();
  const { showToast } = useToast();

  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'TRIAL'>('ACTIVE');
  const [monthlyQuota, setMonthlyQuota] = useState(50000);
  const [senderPhone, setSenderPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminCompanies({ search, status: statusFilter });
      setCompanies(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar empresas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [search, statusFilter]);

  const handleOpenEdit = (comp: any) => {
    setEditingCompany(comp);
    setName(comp.name);
    setTradeName(comp.tradeName || '');
    setCnpj(comp.cnpj);
    setStatus(comp.status);
    setMonthlyQuota(comp.monthlyQuota || 50000);
    setSenderPhone(comp.senderPhone || '');
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingCompany(null);
    setName('');
    setTradeName('');
    setCnpj('');
    setStatus('ACTIVE');
    setMonthlyQuota(50000);
    setSenderPhone('+55 11 99123-4567');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingCompany) {
        await api.updateAdminCompany(editingCompany.id, {
          name,
          tradeName,
          cnpj,
          status,
          monthlyQuota: Number(monthlyQuota),
          senderPhone,
        });
        showToast('Dados e cotas da empresa atualizados!', 'success');
      } else {
        await api.createAdminCompany({
          name,
          tradeName,
          cnpj,
          status,
          monthlyQuota: Number(monthlyQuota),
          senderPhone,
          phone: senderPhone,
        });
        showToast('Nova empresa cadastrada na plataforma!', 'success');
      }
      setIsModalOpen(false);
      loadCompanies();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar empresa', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAccess = async (companyId: string, companyName: string) => {
    try {
      const res = await api.resetClientAccess(companyId);
      showToast(`Link de redefinição para ${companyName} gerado com sucesso!`, 'info', 'Acesso Reenviado');
    } catch (err: any) {
      showToast(err.message || 'Erro ao resetar acesso', 'error');
    }
  };

  const handleImpersonate = (companyId: string) => {
    switchTenant(companyId);
    showToast('Alternado para o portal deste cliente.', 'info');
    if (navigate) navigate('/dashboard');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-400" />
            <span>Gestão de Empresas (Tenants)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Controle de isolamento multi-tenant, auditoria de planos, cotas mensais e suspensão de contas.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
          Adicionar Empresa
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-slate-900 border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8">
            <Input
              placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="sm:col-span-4">
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os Status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="TRIAL">Trial</option>
              <option value="SUSPENDED">Suspensas</option>
              <option value="BLOCKED">Bloqueadas</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Companies Table */}
      {isLoading ? (
        <LoadingSpinner label="Carregando empresas cadastradas..." />
      ) : (
        <Card className="p-0 overflow-hidden bg-slate-900 border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4 font-semibold">Empresa / CNPJ</th>
                  <th className="py-3 px-4 font-semibold">Plano</th>
                  <th className="py-3 px-4 font-semibold">Consumo de Cota</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Ações de Governança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {companies.map(comp => {
                  const percent = Math.min(100, Math.round(((comp.usedQuota || 0) / comp.monthlyQuota) * 100));
                  return (
                    <tr key={comp.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{comp.tradeName || comp.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {comp.cnpj} • Remetente: {comp.senderPhone || 'Não configurado'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-sky-400">
                        {comp.planName || 'Plano Pro'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{percent}%</span>
                            <span>{(comp.usedQuota || 0).toLocaleString('pt-BR')} / {(comp.monthlyQuota || 50000).toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${percent > 90 ? 'bg-rose-500' : 'bg-sky-500'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            comp.status === 'ACTIVE' ? 'success' :
                            comp.status === 'TRIAL' ? 'warning' : 'danger'
                          }
                          size="sm"
                        >
                          {comp.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleImpersonate(comp.id)}
                            leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                            title="Acessar painel como esta empresa"
                          >
                            Entrar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(comp)}
                            leftIcon={<Edit className="w-3.5 h-3.5" />}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetAccess(comp.id, comp.tradeName || comp.name)}
                            title="Gerar link de redefinição de acesso"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit / Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCompany ? 'Editar Empresa & Cotas' : 'Cadastrar Nova Empresa (Tenant)'}
        subtitle="Gerenciamento administrativo interno de limites e credenciais."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Razão Social *"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <Input
            label="Nome Fantasia *"
            value={tradeName}
            onChange={e => setTradeName(e.target.value)}
            required
          />
          <Input
            label="CNPJ *"
            value={cnpj}
            onChange={e => setCnpj(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Status da Conta"
              value={status}
              onChange={e => setStatus(e.target.value as any)}
            >
              <option value="ACTIVE">Ativa (Acesso Liberado)</option>
              <option value="TRIAL">Trial (Período de Avaliação)</option>
              <option value="SUSPENDED">Suspensa (Inadimplência)</option>
              <option value="BLOCKED">Bloqueada (Violação de Termos)</option>
            </Select>

            <Input
              label="Cota Mensal de Mensagens"
              type="number"
              value={monthlyQuota}
              onChange={e => setMonthlyQuota(Number(e.target.value))}
              required
            />
          </div>

          <Input
            label="Número Remetente WABA"
            placeholder="+55 11 99123-4567"
            value={senderPhone}
            onChange={e => setSenderPhone(e.target.value)}
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
