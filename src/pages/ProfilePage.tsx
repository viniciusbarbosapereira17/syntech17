import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Badge } from '../components/ui/Badge.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import { 
  Building2, 
  ShieldCheck, 
  Phone, 
  Users, 
  Key, 
  CheckCircle2, 
  Save, 
  Radio, 
  Ban, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { Company, User, BlacklistEntry } from '../../shared/types.js';

export const ProfilePage: React.FC = () => {
  const { company, refreshAuth } = useAuth();
  const { showToast } = useToast();

  const [profileData, setProfileData] = useState<{ company: Company; users: User[] } | null>(null);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Blacklist Add
  const [blackPhone, setBlackPhone] = useState('');
  const [blackReason, setBlackReason] = useState('Solicitação de Opt-out');
  const [isAddingBlacklist, setIsAddingBlacklist] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [profRes, blackRes] = await Promise.all([
        api.getProfile(),
        api.getBlacklist(),
      ]);
      setProfileData(profRes as any);
      setBlacklist(blackRes);

      setCompanyName(profRes.company.name);
      setTradeName(profRes.company.tradeName || '');
      setCnpj(profRes.company.cnpj);
      setPhone(profRes.company.phone);
      setSenderPhone(profRes.company.senderPhone || '');
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar perfil', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [company?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateProfile({
        name: companyName,
        tradeName,
        cnpj,
        phone,
        senderPhone,
      });
      showToast('Dados cadastrais atualizados com sucesso!', 'success');
      await refreshAuth();
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar dados', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackPhone.trim()) return;
    setIsAddingBlacklist(true);
    try {
      await api.addToBlacklist(blackPhone, blackReason);
      showToast('Número incluído na lista de bloqueio (Blacklist)', 'info');
      setBlackPhone('');
      const updated = await api.getBlacklist();
      setBlacklist(updated);
    } catch (err: any) {
      showToast(err.message || 'Erro ao adicionar na blacklist', 'error');
    } finally {
      setIsAddingBlacklist(false);
    }
  };

  const handleRemoveBlacklist = async (id: string) => {
    try {
      await api.removeFromBlacklist(id);
      showToast('Número removido da blacklist.', 'info');
      const updated = await api.getBlacklist();
      setBlacklist(updated);
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover da blacklist', 'error');
    }
  };

  if (isLoading || !profileData) {
    return <LoadingSpinner label="Carregando perfil e credenciais corporativas..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-sky-500" />
          <span>Configurações da Empresa & Canal WABA</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie dados cadastrais, remetente oficial do WhatsApp e lista de bloqueio (Opt-out).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Company Info Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-500" />
                <span>Dados Cadastrais da Empresa</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Razão Social *"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required
                />
                <Input
                  label="Nome Fantasia *"
                  value={tradeName}
                  onChange={e => setTradeName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="CNPJ"
                  value={cnpj}
                  onChange={e => setCnpj(e.target.value)}
                  required
                />
                <Input
                  label="Telefone de Contato"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  Canal de Disparo Meta WhatsApp (WABA)
                </h4>

                <Input
                  label="Número Remetente Conectado"
                  placeholder="+55 11 99123-4567"
                  value={senderPhone}
                  onChange={e => setSenderPhone(e.target.value)}
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button variant="primary" type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </Card>

          {/* Team Members List */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-500" />
                <span>Membros da Equipe</span>
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {profileData.users.map(u => (
                <div key={u.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs text-slate-900 dark:text-white">{u.name}</p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </div>
                  <Badge variant={u.role === 'ADMIN' ? 'purple' : 'default'} size="sm">
                    {u.role}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Blacklist / Opt-out Management (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-500" />
                <span>Lista de Bloqueio (Opt-out / LGPD)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Números cadastrados aqui são automaticamente ignorados e nunca receberão disparos.
              </p>
            </div>

            <form onSubmit={handleAddBlacklist} className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <Input
                label="Telefone para Bloqueio"
                placeholder="+55 11 99999-0000"
                value={blackPhone}
                onChange={e => setBlackPhone(e.target.value)}
                required
              />
              <Input
                label="Motivo do Bloqueio"
                placeholder="Ex: Solicitou 'SAIR' via WhatsApp"
                value={blackReason}
                onChange={e => setBlackReason(e.target.value)}
              />
              <Button variant="danger" size="sm" type="submit" isLoading={isAddingBlacklist} className="w-full" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Adicionar à Blacklist
              </Button>
            </form>

            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">
                Números Bloqueados ({blacklist.length}):
              </h4>

              {blacklist.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhum número em restrição.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {blacklist.map(b => (
                    <div key={b.id} className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{b.phone}</span>
                        <span className="text-[10px] text-slate-500 block">{b.reason}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveBlacklist(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Desbloquear número"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
