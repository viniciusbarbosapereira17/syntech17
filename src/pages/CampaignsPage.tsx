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
import { VariableChip } from '../components/ui/VariableChip.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { 
  Send, 
  Plus, 
  Play, 
  Pause, 
  XCircle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Zap, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCw
} from 'lucide-react';
import { Campaign, ContactList, Message } from '../../shared/types.js';

export const CampaignsPage: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Wizard Modal
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Wizard Form Fields
  const [campaignName, setCampaignName] = useState('');
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState('');
  const [customMessageTitle, setCustomMessageTitle] = useState('');
  const [customMessageContent, setCustomMessageContent] = useState(
    'Olá {nome}! Temos uma oferta especial para você na unidade de {loja} em {cidade}. Aproveite 20% de desconto no produto {produto}!'
  );
  const [dispatchSpeed, setDispatchSpeed] = useState('60'); // msgs per minute
  const [retryFailed, setRetryFailed] = useState(true);
  const [sendOption, setSendOption] = useState<'NOW' | 'SCHEDULED'>('NOW');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Processing Action State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [campsRes, listsRes, msgsRes] = await Promise.all([
        api.getCampaigns(),
        api.getLists(),
        api.getMessages(),
      ]);
      setCampaigns(campsRes);
      setLists(listsRes);
      setMessages(msgsRes);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar campanhas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenWizard = () => {
    setCampaignName(`Disparo Corporativo #${Math.floor(100 + Math.random() * 900)}`);
    setSelectedListIds(lists.length > 0 ? [lists[0].id] : []);
    setSelectedMessageId(messages.length > 0 ? messages[0].id : '');
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleListToggle = (listId: string) => {
    setSelectedListIds(prev => 
      prev.includes(listId) ? prev.filter(id => id !== listId) : [...prev, listId]
    );
  };

  const handleInsertVariable = (varName: string) => {
    setCustomMessageContent(prev => prev + ` {${varName}}`);
  };

  const estimatedContacts = lists
    .filter(l => selectedListIds.includes(l.id))
    .reduce((acc, curr) => acc + curr.contactCount, 0);

  const handleCreateCampaign = async () => {
    setIsCreating(true);
    try {
      await api.createCampaign({
        name: campaignName,
        listIds: selectedListIds,
        messageId: selectedMessageId || undefined,
        customMessage: selectedMessageId ? undefined : {
          title: customMessageTitle || campaignName,
          content: customMessageContent,
          type: 'TEXT',
        },
        scheduledAt: sendOption === 'SCHEDULED' ? scheduledAt : undefined,
      });

      showToast('Campanha corporativa criada e enfileirada com sucesso!', 'success', 'Disparo Iniciado');
      setIsWizardOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar campanha', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCampaignAction = async (id: string, action: 'pause' | 'resume' | 'cancel' | 'dispatch_step') => {
    setActionLoadingId(id);
    try {
      const updated = await api.campaignAction(id, action);
      if (action === 'dispatch_step') {
        showToast(`Lote processado: ${updated.processedCount}/${updated.totalContacts} mensagens disparadas.`, 'success', 'Fila Atualizada');
      } else if (action === 'pause') {
        showToast('Campanha pausada temporariamente.', 'info');
      } else if (action === 'resume') {
        showToast('Envio de mensagens retomado.', 'success');
      } else if (action === 'cancel') {
        showToast('Campanha cancelada.', 'warning');
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao executar ação na campanha', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-sky-500" />
            <span>Campanhas de Disparos Corporativos</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Programe e monitore envios em massa com controle de vazão, taxa de entrega e variáveis dinâmicas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadData} leftIcon={<RotateCw className="w-4 h-4" />}>
            Atualizar
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenWizard} leftIcon={<Plus className="w-4 h-4" />}>
            Nova Campanha
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Carregando campanhas..." />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Send className="w-10 h-10" />}
          title="Nenhuma campanha iniciada"
          description="Crie seu primeiro disparo em lote selecionando as listas de transmissão e a mensagem personalizada."
          actionLabel="Iniciar Assistente de Disparo"
          onAction={handleOpenWizard}
        />
      ) : (
        <div className="space-y-4">
          {campaigns.map(camp => {
            const progress = camp.totalContacts > 0 ? Math.round((camp.processedCount / camp.totalContacts) * 100) : 0;
            const isFinished = camp.status === 'COMPLETED' || camp.status === 'CANCELLED';

            return (
              <Card key={camp.id} className="p-6 space-y-4 hoverable">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {camp.name}
                      </h3>
                      <Badge
                        variant={
                          camp.status === 'COMPLETED' ? 'success' :
                          camp.status === 'RUNNING' ? 'info' :
                          camp.status === 'SCHEDULED' ? 'purple' :
                          camp.status === 'PAUSED' ? 'warning' : 'danger'
                        }
                        dot={camp.status === 'RUNNING'}
                        size="sm"
                      >
                        {camp.status === 'COMPLETED' ? 'Concluída' :
                         camp.status === 'RUNNING' ? 'Disparando em Tempo Real' :
                         camp.status === 'SCHEDULED' ? 'Agendada' :
                         camp.status === 'PAUSED' ? 'Pausada' : 'Cancelada'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Iniciada em: {new Date(camp.createdAt).toLocaleString('pt-BR')} • Canal de envio: <strong className="text-slate-700 dark:text-slate-200">{company?.senderPhone || '+55 11 99123-4567'}</strong>
                    </p>
                  </div>

                  {/* Action Buttons for this campaign */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {camp.status === 'RUNNING' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCampaignAction(camp.id, 'dispatch_step')}
                          isLoading={actionLoadingId === camp.id}
                          leftIcon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
                        >
                          Disparar Próximo Lote (+50)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCampaignAction(camp.id, 'pause')}
                          leftIcon={<Pause className="w-3.5 h-3.5" />}
                        >
                          Pausar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCampaignAction(camp.id, 'cancel')}
                          leftIcon={<XCircle className="w-3.5 h-3.5" />}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}

                    {camp.status === 'PAUSED' && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleCampaignAction(camp.id, 'resume')}
                          leftIcon={<Play className="w-3.5 h-3.5" />}
                        >
                          Retomar Envio
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCampaignAction(camp.id, 'cancel')}
                          leftIcon={<XCircle className="w-3.5 h-3.5" />}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Live Progress Bar */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">
                      Progresso da Fila: {progress}%
                    </span>
                    <span className="font-mono text-slate-500">
                      {camp.processedCount} de {camp.totalContacts} contatos processados
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        camp.status === 'COMPLETED' ? 'bg-emerald-500' :
                        camp.status === 'PAUSED' ? 'bg-amber-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Sub KPI Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Total Alvo</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                      {(camp.totalContacts || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-emerald-700 dark:text-emerald-300 block text-[11px]">Entregues</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {(camp.sentCount || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-rose-700 dark:text-rose-300 block text-[11px]">Falhas</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-sm">
                      {(camp.failedCount || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                    <span className="text-sky-700 dark:text-sky-300 block text-[11px]">Pendentes</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400 font-mono text-sm">
                      {((camp.totalContacts || 0) - (camp.processedCount || 0)).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 4-Step Campaign Creation Wizard */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title="Assistente de Disparo Corporativo"
        subtitle={`Passo ${wizardStep} de 4: ${
          wizardStep === 1 ? 'Identificação e Audiência' :
          wizardStep === 2 ? 'Mensagem e Variáveis' :
          wizardStep === 3 ? 'Parâmetros de Envio' : 'Revisão e Agendamento'
        }`}
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {/* Step Progress Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            {[1, 2, 3, 4].map(step => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    wizardStep === step
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-400/30'
                      : wizardStep > step
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {wizardStep > step ? <CheckCircle2 className="w-4 h-4" /> : step}
                </div>
                <span className={`text-xs hidden sm:inline ${wizardStep === step ? 'font-bold text-white' : 'text-slate-400'}`}>
                  {step === 1 ? 'Audiência' : step === 2 ? 'Mensagem' : step === 3 ? 'Regras' : 'Lançamento'}
                </span>
              </div>
            ))}
          </div>

          {/* STEP 1: Audience */}
          {wizardStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <Input
                label="Nome da Campanha *"
                placeholder="Ex: Campanha Dia das Mães - Clientes VIP"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                required
              />

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Selecione as Listas de Transmissão para o Disparo:
                </label>

                {lists.length === 0 ? (
                  <p className="text-xs text-amber-500">
                    Você ainda não tem listas criadas. O sistema utilizará a base geral de contatos.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {lists.map(list => {
                      const isSelected = selectedListIds.includes(list.id);
                      return (
                        <div
                          key={list.id}
                          onClick={() => handleListToggle(list.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-sky-500 bg-sky-500/10 text-sky-900 dark:text-sky-200 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">{list.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{list.contactCount} contatos vinculados</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                              isSelected ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-500" />
                  <span>Estimativa Total de Destinatários:</span>
                </span>
                <span className="font-bold text-sky-600 dark:text-sky-400 font-mono text-sm">
                  {(estimatedContacts || 0).toLocaleString('pt-BR')} contatos
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Message & Variables */}
          {wizardStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <Select
                label="Utilizar Mensagem Salva"
                value={selectedMessageId}
                onChange={e => setSelectedMessageId(e.target.value)}
              >
                <option value="">Digitar Mensagem Personalizada</option>
                {messages.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </Select>

              {!selectedMessageId && (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Inserir Variáveis Dinâmicas:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <VariableChip name="nome" description="Nome do cliente" onClick={handleInsertVariable} />
                      <VariableChip name="empresa" description="Sua empresa" onClick={handleInsertVariable} />
                      <VariableChip name="loja" description="Unidade" onClick={handleInsertVariable} />
                      <VariableChip name="cidade" description="Cidade" onClick={handleInsertVariable} />
                      <VariableChip name="produto" description="Produto" onClick={handleInsertVariable} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Texto da Mensagem:
                    </label>
                    <textarea
                      rows={6}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
                      value={customMessageContent}
                      onChange={e => setCustomMessageContent(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Parameters & Speed */}
          {wizardStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                <div className="text-xs text-emerald-800 dark:text-emerald-300">
                  <p className="font-bold">Canal Oficial Homologado WABA</p>
                  <p className="text-[11px] opacity-90">Número Remetente: {company?.senderPhone || '+55 11 99123-4567'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Velocidade de Vazão (Anti-Sobrecarga)"
                  value={dispatchSpeed}
                  onChange={e => setDispatchSpeed(e.target.value)}
                >
                  <option value="30">30 mensagens / minuto (Mais seguro)</option>
                  <option value="60">60 mensagens / minuto (Recomendado)</option>
                  <option value="120">120 mensagens / minuto (Rápido)</option>
                  <option value="300">300 mensagens / minuto (Empresarial)</option>
                </Select>

                <Select
                  label="Re-tentativa em caso de instabilidade"
                  value={retryFailed ? 'true' : 'false'}
                  onChange={e => setRetryFailed(e.target.value === 'true')}
                >
                  <option value="true">Sim (Tentar até 3x automaticamente)</option>
                  <option value="false">Não (Marcar como falha imediata)</option>
                </Select>
              </div>
            </div>
          )}

          {/* STEP 4: Review and Schedule */}
          {wizardStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Resumo da Configuração:</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                  <div>Campanha: <strong className="text-slate-900 dark:text-white">{campaignName}</strong></div>
                  <div>Destinatários: <strong className="text-sky-500">{estimatedContacts} contatos</strong></div>
                  <div>Velocidade: <strong className="text-slate-900 dark:text-white">{dispatchSpeed} msgs/min</strong></div>
                  <div>Vazão WABA: <strong className="text-emerald-500">Oficial Meta Cloud</strong></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Momento do Disparo:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSendOption('NOW')}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                      sendOption === 'NOW'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    Disparar Imediatamente
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendOption('SCHEDULED')}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                      sendOption === 'SCHEDULED'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    Agendar Horário Específico
                  </button>
                </div>

                {sendOption === 'SCHEDULED' && (
                  <Input
                    label="Data e Hora do Disparo"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {wizardStep > 1 ? (
              <Button
                variant="ghost"
                size="md"
                onClick={() => setWizardStep((prev: any) => prev - 1)}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Voltar
              </Button>
            ) : (
              <Button variant="ghost" size="md" onClick={() => setIsWizardOpen(false)}>
                Cancelar
              </Button>
            )}

            {wizardStep < 4 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setWizardStep((prev: any) => prev + 1)}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Avançar
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleCreateCampaign}
                isLoading={isCreating}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                {sendOption === 'NOW' ? 'Iniciar Disparo Agora' : 'Confirmar Agendamento'}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
