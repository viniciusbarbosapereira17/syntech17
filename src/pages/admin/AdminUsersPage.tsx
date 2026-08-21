import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.js';
import { Users2, Plus, Search, Shield, UserCheck, Edit } from 'lucide-react';
import { User } from '../../../shared/types.js';

export const AdminUsersPage: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<any>('OPERATOR');
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminUsers({ role: roleFilter });
      setUsers(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar usuários', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.createAdminUser({
        name,
        email,
        role,
      });
      showToast('Novo operador interno criado com sucesso!', 'success');
      setIsModalOpen(false);
      setName('');
      setEmail('');
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar usuário', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users2 className="w-6 h-6 text-sky-400" />
            <span>Usuários & Operadores da Plataforma</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestão de papéis internos (ADMIN, MANAGER, SUPPORT, OPERATOR) e usuários de clientes.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Novo Operador Interno
        </Button>
      </div>

      <Card className="p-4 bg-slate-900 border-slate-800">
        <div className="max-w-xs">
          <Select
            label="Filtrar por Papel"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="">Todos os Papéis</option>
            <option value="ADMIN">Super Admins</option>
            <option value="SUPPORT">Suporte Técnico</option>
            <option value="OPERATOR">Operadores</option>
            <option value="CLIENT_ADMIN">Clientes Administradores</option>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <LoadingSpinner label="Carregando usuários..." />
      ) : (
        <Card className="p-0 overflow-hidden bg-slate-900 border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nome / E-mail</th>
                  <th className="py-3 px-4 font-semibold">Empresa Vinculada</th>
                  <th className="py-3 px-4 font-semibold">Papel / Acesso</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {u.companyName || 'SYNTECH DC Matriz (Interno)'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          u.role === 'ADMIN' ? 'danger' :
                          u.role === 'SUPPORT' ? 'info' :
                          u.role === 'CLIENT_ADMIN' ? 'purple' : 'default'
                        }
                        size="sm"
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-right">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Operador Syntech DC"
        subtitle="Crie acessos para engenharia, atendimento e suporte técnico."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nome Completo *"
            placeholder="Ex: Lucas Ferreira"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <Input
            label="E-mail Corporativo (@syntechdc.com.br) *"
            type="email"
            placeholder="lucas@syntechdc.com.br"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Select
            label="Papel / Permissões *"
            value={role}
            onChange={e => setRole(e.target.value as any)}
          >
            <option value="OPERATOR">OPERATOR (Visualização e Disparos)</option>
            <option value="SUPPORT">SUPPORT (Atendimento de Chamados & Helpdesk)</option>
            <option value="MANAGER">MANAGER (Gestão Comercial & Faturamento)</option>
            <option value="ADMIN">ADMIN (Super Administrador da Infraestrutura)</option>
          </Select>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Criar Acesso
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
