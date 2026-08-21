import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { ListFilter, Plus, Edit, Trash2, Users, Calendar, ArrowRight } from 'lucide-react';
import { ContactList } from '../../shared/types.js';

interface ListsPageProps {
  navigate?: (route: string) => void;
}

export const ListsPage: React.FC<ListsPageProps> = ({ navigate }) => {
  const { showToast } = useToast();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ContactList | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete
  const [deleteListId, setDeleteListId] = useState<string | null>(null);

  const loadLists = async () => {
    try {
      setIsLoading(true);
      const res = await api.getLists();
      setLists(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar listas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  const handleOpenAdd = () => {
    setEditingList(null);
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (list: ContactList) => {
    setEditingList(list);
    setName(list.name);
    setDescription(list.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingList) {
        await api.updateList(editingList.id, { name, description });
        showToast('Lista atualizada com sucesso!', 'success');
      } else {
        await api.createList({ name, description });
        showToast('Lista criada com sucesso!', 'success');
      }
      setIsModalOpen(false);
      loadLists();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar lista', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteListId) return;
    try {
      await api.deleteList(deleteListId);
      showToast('Lista excluída com sucesso.', 'info');
      setDeleteListId(null);
      loadLists();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir lista', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ListFilter className="w-6 h-6 text-sky-500" />
            <span>Listas de Transmissão & Segmentos</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize sua audiência por perfil de compra, filial ou categorias de produtos.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
          Nova Lista
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Carregando listas..." />
      ) : lists.length === 0 ? (
        <EmptyState
          icon={<ListFilter className="w-10 h-10" />}
          title="Nenhuma lista cadastrada"
          description="Crie listas para agrupar contatos e realizar disparos direcionados."
          actionLabel="Criar Primeira Lista"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map(list => (
            <Card key={list.id} className="p-5 flex flex-col justify-between hoverable space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    {list.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-semibold shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    <span>{list.contactCount} contatos</span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed min-h-[36px]">
                  {list.description || 'Sem descrição cadastrada.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(list.createdAt).toLocaleDateString('pt-BR')}</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(list)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Editar Lista"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteListId(list.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Excluir Lista"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingList ? 'Editar Lista' : 'Nova Lista de Transmissão'}
        subtitle="Informe o nome e objetivo desta segmentação de contatos."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nome da Lista *"
            placeholder="Ex: Clientes VIP - São Paulo"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Descrição / Observação
            </label>
            <textarea
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="Ex: Base com compras acima de R$ 500 no último trimestre..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Salvar Lista
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteListId}
        onClose={() => setDeleteListId(null)}
        onConfirm={handleDelete}
        title="Excluir Lista"
        description="Tem certeza que deseja excluir esta lista? Os contatos permanecerão na sua base de dados geral."
        confirmText="Sim, Excluir"
      />
    </div>
  );
};
