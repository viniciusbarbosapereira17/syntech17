import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { VariableChip } from '../components/ui/VariableChip.js';
import { WhatsAppSimulator } from '../components/ui/WhatsAppSimulator.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import { 
  MessageSquare, 
  Sparkles, 
  Save, 
  Image as ImageIcon, 
  FileText, 
  Send, 
  Copy, 
  Check,
  Eye
} from 'lucide-react';
import { Message, Template } from '../../shared/types.js';

interface MessagesPageProps {
  navigate?: (route: string) => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ navigate }) => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('Campanha Relâmpago de Cupons VIP');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [type, setType] = useState<'TEXT' | 'IMAGE' | 'DOCUMENT'>('TEXT');
  const [mediaUrl, setMediaUrl] = useState('');
  const [content, setContent] = useState(
    'Olá *{nome}*! 👋\n\nTemos uma novidade especial para você na nossa unidade de *{loja}* em *{cidade}*!\n\nSeu produto favorito *{produto}* está com 20% de desconto exclusivo nesta semana.\n\nAproveite antes que acabe o estoque da filial!\n\nAtenciosamente,\n*{empresa}*'
  );

  // Sample data for live simulator test
  const [sampleNome, setSampleNome] = useState('Dra. Vanessa Martins');
  const [sampleLoja, setSampleLoja] = useState('Unidade Jardins - SP');
  const [sampleCidade, setSampleCidade] = useState('São Paulo');
  const [sampleProduto, setSampleProduto] = useState('Sérum Vitamina C 15ml');

  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [msgRes, templRes] = await Promise.all([
        api.getMessages(),
        api.getTemplates(),
      ]);
      setMessages(msgRes);
      setTemplates(templRes);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar mensagens', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInsertVariable = (varName: string) => {
    const variableToken = `{${varName}}`;
    setContent(prev => prev + ' ' + variableToken);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const found = templates.find(t => t.id === templateId);
    if (found) {
      setContent(found.content);
      if (found.headerType === 'IMAGE') {
        setType('IMAGE');
        setMediaUrl('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80');
      } else {
        setType('TEXT');
        setMediaUrl('');
      }
    }
  };

  const handleSaveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      showToast('O corpo da mensagem não pode estar vazio.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await api.createMessage({
        title,
        content,
        templateId: selectedTemplateId || undefined,
        messageType: (type as any) || 'TEXT',
        mediaUrl: mediaUrl || undefined,
      });
      showToast('Mensagem corporativa salva com sucesso!', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar mensagem', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-sky-500" />
          <span>Editor de Mensagens & Variáveis Dinâmicas</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Crie textos personalizados em tempo real com dados de cada cliente e pré-visualize no simulador oficial do WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Message Builder (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-6">
            <form onSubmit={handleSaveMessage} className="space-y-4">
              <Input
                label="Identificação da Mensagem *"
                placeholder="Ex: Alerta de Renovação ou Oferta VIP"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Importar de um Template WABA Aprovado"
                  value={selectedTemplateId}
                  onChange={e => handleSelectTemplate(e.target.value)}
                >
                  <option value="">Texto Livre / Personalizado</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </Select>

                <Select
                  label="Tipo de Formato"
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                >
                  <option value="TEXT">Somente Texto</option>
                  <option value="IMAGE">Texto com Imagem</option>
                  <option value="DOCUMENT">Documento / PDF</option>
                </Select>
              </div>

              {type === 'IMAGE' && (
                <Input
                  label="URL da Imagem de Cabeçalho"
                  placeholder="https://exemplo.com.br/banner-promocional.jpg"
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  leftIcon={<ImageIcon className="w-4 h-4" />}
                />
              )}

              {/* Variable Insertion Chips */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Variáveis Dinâmicas Disponíveis (Clique para inserir no texto):
                </label>
                <div className="flex flex-wrap gap-2">
                  <VariableChip name="nome" description="Nome do cliente" onClick={handleInsertVariable} />
                  <VariableChip name="empresa" description="Sua empresa" onClick={handleInsertVariable} />
                  <VariableChip name="loja" description="Unidade/Filial" onClick={handleInsertVariable} />
                  <VariableChip name="cidade" description="Cidade" onClick={handleInsertVariable} />
                  <VariableChip name="produto" description="Produto de interesse" onClick={handleInsertVariable} />
                </div>
              </div>

              {/* Message Text Area */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Corpo da Mensagem *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Dica: use *negrito* e _itálico_ para formatação WhatsApp
                  </span>
                </div>
                <textarea
                  rows={9}
                  className="w-full text-xs sm:text-sm font-sans p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500">
                  {content.length} caracteres
                </span>

                <div className="flex gap-2">
                  <Button variant="primary" type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                    Salvar Mensagem
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Preview: Interactive WhatsApp Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 bg-slate-100/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-500" />
                <span>Simulador em Tempo Real</span>
              </h3>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Oficial WABA
              </span>
            </div>

            {/* Phone Mockup */}
            <WhatsAppSimulator
              content={content}
              senderName={company?.tradeName || 'SYNTECH DC Oficial'}
              senderPhone={company?.senderPhone || '+55 11 99123-4567'}
              mediaUrl={type === 'IMAGE' ? (mediaUrl || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80') : undefined}
              mediaType={type}
              sampleData={{
                nome: sampleNome,
                empresa: company?.tradeName || 'Rede FarmaVida',
                loja: sampleLoja,
                cidade: sampleCidade,
                produto: sampleProduto,
              }}
            />

            {/* Test Variable Controls */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Simular variáveis com dados de exemplo:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                  value={sampleNome}
                  onChange={e => setSampleNome(e.target.value)}
                  placeholder="Nome teste"
                />
                <input
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                  value={sampleProduto}
                  onChange={e => setSampleProduto(e.target.value)}
                  placeholder="Produto teste"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
