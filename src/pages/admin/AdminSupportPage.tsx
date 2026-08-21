import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { Select } from '../../components/ui/Select.js';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner.js';
import { Headphones, Send, Clock, User, CheckCircle2, Shield } from 'lucide-react';
import { SupportTicket, SupportMessage } from '../../../shared/types.js';

export const AdminSupportPage: React.FC = () => {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Ticket Conversation Modal
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<{ ticket: SupportTicket; messages: SupportMessage[] } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [ticketStatusUpdate, setTicketStatusUpdate] = useState<any>('IN_PROGRESS');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminTickets({ status: statusFilter });
      setTickets(res);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar chamados', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const handleOpenTicket = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsLoadingDetails(true);
    try {
      const details = await api.getAdminTicketDetails(ticketId);
      setTicketDetails(details);
      setTicketStatusUpdate(details.ticket.status);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar detalhes', 'error');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSendAdminReply = async () => {
    if (!selectedTicketId || !replyText.trim()) return;
    setIsSendingReply(true);
    try {
      await api.adminReplyTicket(selectedTicketId, replyText, ticketStatusUpdate);
      showToast('Resposta enviada ao cliente com sucesso!', 'success');
      setReplyText('');
      const updated = await api.getAdminTicketDetails(selectedTicketId);
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
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Headphones className="w-6 h-6 text-sky-400" />
            <span>Fila Global de Atendimento & Helpdesk</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Console de atendimento técnico para resolução de tickets de todos os clientes da plataforma.
          </p>
        </div>

        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os Status</option>
            <option value="OPEN">Abertos</option>
            <option value="IN_PROGRESS">Em Atendimento</option>
            <option value="RESOLVED">Resolvidos</option>
            <option value="CLOSED">Fechados</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Carregando chamados..." />
      ) : (
        <Card className="p-0 overflow-hidden bg-slate-900 border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4 font-semibold">Protocolo / Assunto</th>
                  <th className="py-3 px-4 font-semibold">Empresa Solicitante</th>
                  <th className="py-3 px-4 font-semibold">Departamento</th>
                  <th className="py-3 px-4 font-semibold">Prioridade</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tickets.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/40 cursor-pointer" onClick={() => handleOpenTicket(t.id)}>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{t.subject}</div>
                      <div className="text-[11px] text-slate-400 font-mono">#{t.id} • {new Date(t.createdAt).toLocaleString('pt-BR')}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {t.companyName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {t.department}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.priority === 'URGENT' ? 'bg-rose-500/10 text-rose-400' :
                        t.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          t.status === 'OPEN' ? 'warning' :
                          t.status === 'IN_PROGRESS' ? 'info' :
                          t.status === 'RESOLVED' ? 'success' : 'default'
                        }
                        size="sm"
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button variant="secondary" size="sm">
                        Atender
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Ticket Reply Modal */}
      <Modal
        isOpen={!!selectedTicketId}
        onClose={() => {
          setSelectedTicketId(null);
          setTicketDetails(null);
        }}
        title={ticketDetails?.ticket.subject || 'Atendimento de Suporte'}
        subtitle={`Empresa: ${(ticketDetails as any)?.ticket?.companyName || 'Cliente'} • Protocolo #${selectedTicketId}`}
        maxWidth="2xl"
      >
        {isLoadingDetails || !ticketDetails ? (
          <LoadingSpinner label="Carregando histórico..." />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
              <span className="text-slate-400">Alterar Status para:</span>
              <div className="w-48">
                <Select
                  value={ticketStatusUpdate}
                  onChange={e => setTicketStatusUpdate(e.target.value as any)}
                >
                  <option value="IN_PROGRESS">IN_PROGRESS (Em Atendimento)</option>
                  <option value="RESOLVED">RESOLVED (Resolvido)</option>
                  <option value="CLOSED">CLOSED (Encerrado)</option>
                </Select>
              </div>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto p-2">
              {ticketDetails.messages.map(msg => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-2xl space-y-1.5 ${
                    msg.isStaff
                      ? 'bg-sky-500/10 border border-sky-500/20 text-slate-100 ml-4'
                      : 'bg-slate-800 border border-slate-700 text-slate-100 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5">
                      {msg.isStaff ? (
                        <>
                          <Shield className="w-3.5 h-3.5 text-sky-400" />
                          <strong className="text-sky-400">{msg.senderName} (Engenharia Syntech DC)</strong>
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{msg.senderName} (Cliente)</span>
                        </>
                      )}
                    </span>
                    <span className="text-slate-400">{new Date(msg.createdAt).toLocaleString('pt-BR')}</span>
                  </div>

                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <textarea
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="Escreva um parecer técnico para o cliente..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendAdminReply}
                  isLoading={isSendingReply}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Publicar Resposta Oficial
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
