import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { FileCode2, Plus, CheckCircle2, Clock, XCircle, Tag, ShieldCheck } from 'lucide-react';
import { Template } from '../../shared/types.js';

export const TemplatesPage: React.FC = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'DOCUMENT'>('NONE');
  const [content, setContent] = useState('Olá {1}, sua solicitação na unidade {2} foi processada.');
  const [variables, setVariables] = useState('nome, loja');
  const [isSaving, setIsSaving] = useState(false);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await api.getTemplates();
      setTemplates(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar templates', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedVars = variables.split(',').map(v => v.trim()).filter(Boolean);
      await api.createTemplate({
        name,
        category,
        content,
        variables: parsedVars,
      });
      showToast('Template enviado para homologação oficial!', 'success');
      setIsModalOpen(false);
      loadTemplates();
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar template', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCode2 className="w-6 h-6 text-sky-500" />
            <span>Templates Oficiais Meta WhatsApp (WABA)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie modelos de mensagens homologados pela Meta para disparo sem restrição de janela de 24h.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Criar Novo Template
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Carregando templates homologados..." />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<FileCode2 className="w-10 h-10" />}
          title="Nenhum template cadastrado"
          description="Crie seu primeiro modelo de mensagem para aprovação na Meta Cloud API."
          actionLabel="Criar Template"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card key={template.id} className="p-5 flex flex-col justify-between hoverable space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {template.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Idioma: {template.language}
                    </p>
                  </div>
                  <Badge
                    variant={
                      template.status === 'APPROVED' ? 'success' :
                      template.status === 'PENDING' ? 'warning' : 'danger'
                    }
                    size="sm"
                    dot={template.status === 'APPROVED'}
                  >
                    {template.status === 'APPROVED' ? 'Aprovado' : template.status === 'PENDING' ? 'Em Análise' : 'Rejeitado'}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed whitespace-pre-wrap min-h-[90px]">
                  {template.content}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Variáveis homologadas:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map(v => (
                      <span key={v} className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px] font-mono border border-sky-500/20">
                        {`{${v}}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold uppercase">
                  {template.category}
                </span>

                <span className="text-[11px] flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Meta Verified</span>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submeter Template para Homologação WABA"
        subtitle="O template será enviado para os servidores da Meta para aprovação corporativa."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Identificador do Template (Sem espaços) *"
            placeholder="ex: promocao_aniversario_vip"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Categoria Meta"
              value={category}
              onChange={e => setCategory(e.target.value as any)}
            >
              <option value="MARKETING">Marketing (Ofertas, Reengajamento)</option>
              <option value="UTILITY">Utilidade (Avisos, Cobranças, Pedidos)</option>
              <option value="AUTHENTICATION">Autenticação (OTP, 2FA)</option>
            </Select>

            <Select
              label="Cabeçalho de Mídia"
              value={headerType}
              onChange={e => setHeaderType(e.target.value as any)}
            >
              <option value="NONE">Sem Cabeçalho</option>
              <option value="TEXT">Texto Destacado</option>
              <option value="IMAGE">Imagem de Produto/Banner</option>
              <option value="DOCUMENT">Documento PDF</option>
            </Select>
          </div>

          <Input
            label="Variáveis Dinâmicas (Separadas por vírgula)"
            placeholder="nome, empresa, loja, cidade, produto"
            value={variables}
            onChange={e => setVariables(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Texto do Template Oficial *
            </label>
            <textarea
              rows={5}
              className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Submeter à Meta
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
