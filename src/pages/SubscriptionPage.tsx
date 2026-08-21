import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import { 
  CreditCard, 
  Check, 
  Sparkles, 
  Receipt, 
  Zap, 
  Calendar, 
  ShieldCheck, 
  Download,
  Building 
} from 'lucide-react';
import { Plan, Subscription, Payment } from '../../shared/types.js';

export const SubscriptionPage: React.FC = () => {
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Upgrade Modal
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
  const [isUpgrading, setIsUpgrading] = useState(false);

  const loadSubscription = async () => {
    try {
      setIsLoading(true);
      const res = await api.getSubscription();
      setData(res);
      if (res.availablePlans?.length > 0) {
        setSelectedPlanId(res.availablePlans[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar dados da assinatura', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const res = await api.upgradeSubscription(selectedPlanId, paymentMethod);
      showToast(res.message, 'success', 'Plano Atualizado');
      setIsUpgradeModalOpen(false);
      loadSubscription();
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar plano', 'error');
    } finally {
      setIsUpgrading(false);
    }
  };

  if (isLoading || !data) {
    return <LoadingSpinner label="Carregando plano e faturamento..." />;
  }

  const { company, subscription, plan, payments, availablePlans } = data;
  const quotaPercent = Math.min(100, Math.round(((company.usedQuota || 0) / company.monthlyQuota) * 100));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-sky-500" />
          <span>Assinatura Corporativa & Faturamento</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie seu plano de disparos, acompanhe o vencimento da assinatura e emita faturas fiscais.
        </p>
      </div>

      {/* Current Plan Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4 lg:col-span-2 bg-gradient-to-br from-slate-900 via-[#0b1329] to-sky-950 text-white border-sky-900/50">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-wider">
                Plano Atual
              </span>
              <h2 className="text-2xl font-bold mt-2">{plan?.name || 'Plano Pro'}</h2>
              <p className="text-xs text-slate-300 mt-1">{plan?.description || 'Infraestrutura completa para disparos corporativos.'}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black font-mono text-white">
                R$ {plan?.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '890,00'}
              </span>
              <span className="text-xs text-slate-400 block">/mês</span>
            </div>
          </div>

          {/* Quota bar */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Cota Mensal de Mensagens</span>
              </span>
              <span className="font-mono text-sky-300">{quotaPercent}% consumido</span>
            </div>

            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 rounded-full transition-all duration-500"
                style={{ width: `${quotaPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{(company.usedQuota || 0).toLocaleString('pt-BR')} enviadas</span>
              <span>{(company.monthlyQuota || 50000).toLocaleString('pt-BR')} contratadas</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Próxima Renovação: <strong className="text-white">{subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('pt-BR') : '30 dias'}</strong></span>
            </div>

            <Button
              variant="primary"
              size="md"
              className="bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20"
              onClick={() => setIsUpgradeModalOpen(true)}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Fazer Upgrade de Plano
            </Button>
          </div>
        </Card>

        {/* Benefits & SLA */}
        <Card className="p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Inclusos no seu Pacote</span>
            </h3>

            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>API Oficial Meta WhatsApp (WABA)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Variáveis Dinâmicas Ilimitadas</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Isolamento Multi-Tenant com RLS</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Suporte com SLA de 4 Horas</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            Dúvidas sobre faturamento corporativo? Fale com o time de suporte via ticket.
          </div>
        </Card>
      </div>

      {/* Invoices History Table */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Histórico de Faturas & Pagamentos</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Comprovantes fiscais e recibos de quitação</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-3 font-semibold">Código / ID</th>
                <th className="py-3 px-3 font-semibold">Data</th>
                <th className="py-3 px-3 font-semibold">Valor</th>
                <th className="py-3 px-3 font-semibold">Forma de Pagamento</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold text-right">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((p: Payment) => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                    {p.id}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-3 font-bold font-mono text-slate-900 dark:text-white">
                    R$ {(p.amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold uppercase">
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <Badge variant={p.status === 'PAID' ? 'success' : 'warning'} size="sm">
                      {p.status === 'PAID' ? 'Pago' : p.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => showToast(`Recibo fiscal da fatura ${p.id} emitido.`, 'info')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 transition-colors"
                      title="Baixar Comprovante"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upgrade Plans Comparison Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Escolha o Plano Ideal para seu Volume"
        subtitle="Amplie sua cota mensal de mensagens e acelere suas campanhas."
        maxWidth="3xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availablePlans.map((p: Plan) => {
              const isSelected = selectedPlanId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/5 shadow-lg shadow-sky-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">{p.name}</h4>
                      {isSelected && <span className="text-sky-500 font-bold text-xs">Selecionado</span>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{p.description}</p>
                    <div className="pt-2">
                      <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                        R$ {(p.price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-slate-400">/mês</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-600">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{(p.messageQuota ?? 0).toLocaleString('pt-BR')} mensagens</span>
                    </div>
                    <div>{(p.contactLimit ?? 0).toLocaleString('pt-BR')} contatos</div>
                    <div>{p.features?.[0] || 'Campanhas Ilimitadas'}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Forma de Pagamento:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['PIX', 'CREDIT_CARD', 'BOLETO'] as const).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                    paymentMethod === method
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  {method === 'PIX' ? 'PIX (Ativação Imediata)' : method === 'CREDIT_CARD' ? 'Cartão de Crédito' : 'Boleto Bancário'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsUpgradeModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleUpgrade} isLoading={isUpgrading}>
              Confirmar Assinatura
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
