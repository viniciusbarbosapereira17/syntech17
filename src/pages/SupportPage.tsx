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
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { 
  LifeBuoy, 
  Plus, 
  MessageSquare, 
  Clock, 
  Send, 
  ShieldCheck, 
  Headphones, 
  User, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { SupportTicket, SupportMessage } from '../../shared/types.js';

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Ticket Modal
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('TECHNICAL');
  const [priority, setPriority] = useState('HIGH');
  const [initialMessage, setInitialMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Ticket Conversation Modal
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<{ ticket: SupportTicket; messages: SupportMessage[] } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const res = await api.getTickets();
      setTickets(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar chamados', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleOpenTicketDetails = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsLoadingDetails(true);
    try {
      const details = await api.getTicketDetails(ticketId);
      setTicketDetails(details);
    } catch (err: any) {
      showToast(err.message || 'Erro ao abrir chamado', 'error');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createTicket({
        subject,
        department,
        priority,
        message: initialMessage,
      });
      showToast('Chamado aberto com sucesso! Nossa equipe técnica já foi acionada.', 'success', 'Protocolo Aberto');
      setIsNewTicketOpen(false);
      setSubject('');
      setInitialMessage('');
      loadTickets();
    } catch (err: any) {
      showToast(err.message || 'Erro ao abrir chamado', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicketId || !replyText.trim()) return;
    setIsSendingReply(true);
    try {
      await api.addTicketMessage(selectedTicketId, replyText);
      showToast('Resposta enviada.', 'info');
      setReplyText('');
      const updated = await api.getTicketDetails(selectedTicketId);
      setTicketDetails(updated);
      loadTickets();
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar resposta', 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-sky-500" />
            <span>Central de Suporte & Helpdesk Oficial</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Abra chamados técnicos e receba suporte de engenharia com SLA prioritário.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsNewTicketOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Abrir Novo Chamado
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Carregando chamados..." />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="w-10 h-10" />}
          title="Nenhum chamado aberto"
          description="Caso tenha dúvidas ou precise de auxílio na integração com a Meta Cloud API, abra um chamado."
          actionLabel="Abrir Primeiro Chamado"
          onAction={() => setIsNewTicketOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Card
              key={ticket.id}
              onClick={() => handleOpenTicketDetails(ticket.id)}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hoverable cursor-pointer"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-slate-400">#{ticket.id}</span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {ticket.subject}
                  </h3>
                  <Badge
                    variant={
                      ticket.status === 'OPEN' ? 'warning' :
                      ticket.status === 'IN_PROGRESS' ? 'info' :
                      ticket.status === 'RESOLVED' ? 'success' : 'default'
                    }
                    size="sm"
                  >
                    {ticket.status === 'OPEN' ? 'Aberto' :
                     ticket.status === 'IN_PROGRESS' ? 'Em Atendimento' :
                     ticket.status === 'RESOLVED' ? 'Resolvido' : 'Fechado'}
                  </Badge>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ticket.priority === 'URGENT' ? 'bg-rose-500/10 text-rose-500' :
                    ticket.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    Prioridade {ticket.priority}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Departamento: <strong className="text-slate-700 dark:text-slate-300">{ticket.department}</strong> • Criado em: {new Date(ticket.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" className="text-sky-600 dark:text-sky-400">
                  Ver Conversa
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Ticket Modal */}
      <Modal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        title="Abertura de Chamado Técnico"
        subtitle="Descreva com detalhes sua solicitação para atendimento rápido."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <Input
            label="Assunto do Chamado *"
            placeholder="Ex: Dúvida na homologação de novo template WABA"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Departamento"
              value={department}
              onChange={e => setDepartment(e.target.value)}
            >
              <option value="TECHNICAL">Suporte Técnico & APIs</option>
              <option value="BILLING">Faturamento & Assinaturas</option>
              <option value="INTEGRATION">Homologação Meta Cloud</option>
            </Select>

            <Select
              label="Prioridade"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta (SLA 4 Horas)</option>
              <option value="URGENT">Urgente (Bloqueio Total)</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mensagem detalhada *
            </label>
            <textarea
              rows={5}
              className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
              value={initialMessage}
              onChange={e => setInitialMessage(e.target.value)}
              placeholder="Explique o que aconteceu e inclua quaisquer mensagens de erro observadas..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsNewTicketOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Submeter Chamado
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ticket Conversation Thread Modal */}
      <Modal
        isOpen={!!selectedTicketId}
        onClose={() => {
          setSelectedTicketId(null);
          setTicketDetails(null);
        }}
        title={ticketDetails?.ticket.subject || 'Chamado de Suporte'}
        subtitle={`Protocolo: #${selectedTicketId} • Departamento: ${ticketDetails?.ticket.department}`}
        maxWidth="2xl"
      >
        {isLoadingDetails || !ticketDetails ? (
          <LoadingSpinner label="Carregando histórico do chamado..." />
        ) : (
          <div className="space-y-4">
            {/* Status pill header */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs">
              <span className="text-slate-500">Status Atual:</span>
              <Badge variant="info" size="sm">
                {ticketDetails.ticket.status}
              </Badge>
            </div>

            {/* Messages Thread */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto p-2">
              {ticketDetails.messages.map(msg => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-2xl space-y-1.5 ${
                    msg.isStaff
                      ? 'bg-sky-500/10 dark:bg-sky-950/40 border border-sky-500/20 text-slate-800 dark:text-slate-100 ml-4'
                      : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5">
                      {msg.isStaff ? (
                        <>
                          <Headphones className="w-3.5 h-3.5 text-sky-500" />
                          <strong className="text-sky-600 dark:text-sky-400">{msg.senderName} (Suporte Syntech DC)</strong>
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{msg.senderName}</span>
                        </>
                      )}
                    </span>
                    <span className="text-slate-400">{new Date(msg.createdAt).toLocaleString('pt-BR')}</span>
                  </div>

                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Reply Bar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <textarea
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="Escreva uma resposta ao time de suporte..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendReply}
                  isLoading={isSendingReply}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Enviar Resposta
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
