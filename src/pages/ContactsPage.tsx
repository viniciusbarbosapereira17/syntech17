import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { 
  Users, 
  UserPlus, 
  Upload, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  ShieldBan, 
  Download, 
  Tag, 
  Building, 
  MapPin, 
  ShoppingBag,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Contact, ContactList } from '../../shared/types.js';

export const ContactsPage: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStore, setFormStore] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formProduct, setFormProduct] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formListIds, setFormListIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Dialog
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importListId, setImportListId] = useState('');
  const [importTag, setImportTag] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [contactsRes, listsRes] = await Promise.all([
        api.getContacts({ search, tag: selectedTag, listId: selectedList }),
        api.getLists(),
      ]);
      setContacts(contactsRes.contacts);
      setLists(listsRes);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar contatos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedList, selectedTag, company?.id]);

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormStore('Matriz Principal');
    setFormCity('São Paulo');
    setFormProduct('');
    setFormTags('');
    setFormListIds(lists.length > 0 ? [lists[0].id] : []);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormPhone(contact.phone);
    setFormEmail(contact.email || '');
    setFormStore(contact.store || '');
    setFormCity(contact.city || '');
    setFormProduct(contact.product || '');
    setFormTags(contact.tags.join(', '));
    setFormListIds(contact.listIds || []);
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedTags = formTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (editingContact) {
        await api.updateContact(editingContact.id, {
          name: formName,
          phone: formPhone,
          email: formEmail,
          store: formStore,
          city: formCity,
          product: formProduct,
          tags: parsedTags,
          listIds: formListIds,
        });
        showToast('Contato atualizado com sucesso!', 'success');
      } else {
        await api.createContact({
          name: formName,
          phone: formPhone,
          email: formEmail,
          store: formStore,
          city: formCity,
          product: formProduct,
          tags: parsedTags,
          listIds: formListIds,
        });
        showToast('Contato adicionado com sucesso!', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar contato', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteContactId) return;
    try {
      await api.deleteContact(deleteContactId);
      showToast('Contato excluído com sucesso.', 'info');
      setDeleteContactId(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir contato', 'error');
    }
  };

  const handleImportCSV = async () => {
    if (!importText.trim()) {
      showToast('Insira ou cole as linhas do CSV para importar.', 'warning');
      return;
    }

    setIsImporting(true);
    try {
      // Parse simple CSV / TSV lines: Nome, Telefone, Email, Loja, Cidade, Produto
      const lines = importText.split('\n').filter(l => l.trim().length > 0);
      const parsedContacts: any[] = [];

      lines.forEach((line, index) => {
        // Skip header if detected
        if (index === 0 && (line.toLowerCase().includes('nome') || line.toLowerCase().includes('telefone'))) {
          return;
        }

        const delimiter = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
        const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));

        if (cols.length >= 2) {
          parsedContacts.push({
            name: cols[0],
            phone: cols[1],
            email: cols[2] || '',
            store: cols[3] || 'Unidade Principal',
            city: cols[4] || 'São Paulo',
            product: cols[5] || '',
          });
        }
      });

      if (parsedContacts.length === 0) {
        showToast('Não foi possível identificar registros válidos. Utilize o formato: Nome, Telefone, Email, Loja, Cidade, Produto', 'error');
        return;
      }

      const res = await api.importContacts(
        parsedContacts,
        importListId || undefined,
        importTag ? [importTag] : []
      );

      showToast(`Importação concluída: ${res.imported} novos contatos adicionados. (${res.duplicates} duplicados ignorados)`, 'success', 'Importação CSV');
      setIsImportModalOpen(false);
      setImportText('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao importar contatos', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportCSV = () => {
    if (contacts.length === 0) {
      showToast('Nenhum contato para exportar.', 'warning');
      return;
    }

    const headers = ['ID', 'Nome', 'Telefone', 'Email', 'Loja', 'Cidade', 'Produto', 'Tags'];
    const rows = contacts.map(c => [
      c.id,
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.store || ''}"`,
      `"${c.city || ''}"`,
      `"${c.product || ''}"`,
      `"${c.tags.join(';')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `contatos_syntech_${company?.tradeName || 'empresa'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Download do arquivo CSV iniciado.', 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-500" />
            <span>Gestão de Contatos & Audiência</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cadastre, segmente por lojas/cidades e importe bases de clientes para disparo corporativo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handleExportCSV} leftIcon={<Download className="w-4 h-4" />}>
            Exportar CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsImportModalOpen(true)} leftIcon={<Upload className="w-4 h-4" />}>
            Importar CSV / Planilha
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<UserPlus className="w-4 h-4" />}>
            Novo Contato
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <Input
              placeholder="Buscar por nome, telefone, email, loja ou produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={selectedList}
              onChange={e => setSelectedList(e.target.value)}
            >
              <option value="">Todas as Listas</option>
              {lists.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.contactCount})
                </option>
              ))}
            </Select>
          </div>

          <div className="sm:col-span-3">
            <Select
              value={selectedTag}
              onChange={e => setSelectedTag(e.target.value)}
            >
              <option value="">Todas as Tags</option>
              <option value="VIP">VIP</option>
              <option value="Skincare">Skincare</option>
              <option value="Uso Contínuo">Uso Contínuo</option>
              <option value="Suplementação">Suplementação</option>
              <option value="Campinas">Campinas</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Contacts Table View */}
      {isLoading ? (
        <LoadingSpinner label="Carregando lista de contatos..." />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={<Users className="w-10 h-10" />}
          title="Nenhum contato encontrado"
          description="Adicione seus primeiros contatos manualmente ou importe uma planilha CSV."
          actionLabel="Adicionar Novo Contato"
          onAction={handleOpenAdd}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nome / Telefone</th>
                  <th className="py-3 px-4 font-semibold">Unidade / Loja</th>
                  <th className="py-3 px-4 font-semibold">Cidade</th>
                  <th className="py-3 px-4 font-semibold">Produto Favorito</th>
                  <th className="py-3 px-4 font-semibold">Segmentação & Tags</th>
                  <th className="py-3 px-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {contacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{contact.name}</span>
                        {contact.isBlacklisted && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold">
                            BLACKLIST
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] mt-0.5">
                        {contact.phone} {contact.email && `• ${contact.email}`}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{contact.store || '—'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{contact.city || '—'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span className="truncate max-w-[150px] font-medium">{contact.product || '—'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(contact)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Editar Contato"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteContactId(contact.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Excluir Contato"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Contact Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContact ? 'Editar Contato' : 'Adicionar Novo Contato'}
        subtitle="Preencha os dados cadastrais do cliente e as variáveis personalizadas."
      >
        <form onSubmit={handleSaveContact} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nome Completo *"
              placeholder="Ex: Dra. Ana Carolina"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              required
            />
            <Input
              label="WhatsApp / Telefone com DDD *"
              placeholder="+55 11 99888-7766"
              value={formPhone}
              onChange={e => setFormPhone(e.target.value)}
              required
            />
          </div>

          <Input
            label="E-mail (Opcional)"
            type="email"
            placeholder="cliente@email.com.br"
            value={formEmail}
            onChange={e => setFormEmail(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Unidade / Loja (Variável {loja})"
              placeholder="Ex: Unidade Jardins"
              value={formStore}
              onChange={e => setFormStore(e.target.value)}
            />
            <Input
              label="Cidade (Variável {cidade})"
              placeholder="Ex: São Paulo"
              value={formCity}
              onChange={e => setFormCity(e.target.value)}
            />
          </div>

          <Input
            label="Produto de Interesse (Variável {produto})"
            placeholder="Ex: Sérum Vitamina C 15ml"
            value={formProduct}
            onChange={e => setFormProduct(e.target.value)}
          />

          <Input
            label="Tags (Separadas por vírgula)"
            placeholder="VIP, Skincare, Uso Contínuo"
            value={formTags}
            onChange={e => setFormTags(e.target.value)}
          />

          {lists.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Adicionar à Lista de Disparo
              </label>
              <Select
                value={formListIds[0] || ''}
                onChange={e => setFormListIds(e.target.value ? [e.target.value] : [])}
              >
                <option value="">Nenhuma lista específica</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {editingContact ? 'Salvar Alterações' : 'Cadastrar Contato'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV / XLSX Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importar Contatos em Massa (CSV / XLSX)"
        subtitle="Cole o conteúdo ou export de seu sistema ERP/CRM com as colunas organizadas."
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-800 dark:text-sky-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Formato recomendado das colunas:</span>
            </div>
            <p className="font-mono text-[11px] text-sky-900 dark:text-sky-200">
              Nome, Telefone, Email, Loja, Cidade, Produto
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Cole as linhas do arquivo CSV ou Planilha Excel:
            </label>
            <textarea
              rows={8}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="Ana Silva, +55 11 99888-1122, ana@email.com, Loja Jardins, São Paulo, Sérum Vitamina C&#10;Carlos Pereira, +55 11 97766-5544, carlos@email.com, Loja Moema, São Paulo, Whey Protein Isolado"
              className="w-full font-mono text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Vincular à Lista (Opcional)"
              value={importListId}
              onChange={e => setImportListId(e.target.value)}
            >
              <option value="">Nenhuma lista específica</option>
              {lists.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>

            <Input
              label="Tag Automática (Opcional)"
              placeholder="Ex: Importação-Agosto"
              value={importTag}
              onChange={e => setImportTag(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleImportCSV} isLoading={isImporting}>
              Processar e Importar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteContactId}
        onClose={() => setDeleteContactId(null)}
        onConfirm={handleDeleteContact}
        title="Excluir Contato"
        description="Tem certeza que deseja remover este contato da sua base? Essa ação removerá o contato de todas as listas vinculadas."
        confirmText="Sim, Excluir"
      />
    </div>
  );
};
