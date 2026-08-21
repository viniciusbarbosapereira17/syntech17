import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Badge } from '../../components/ui/Badge.js';
import { Settings, ShieldCheck, Server, Save, CheckCircle2, RefreshCw } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { showToast } = useToast();

  const [wabaClusterUrl, setWabaClusterUrl] = useState('https://graph.facebook.com/v20.0');
  const [maxBatchConcurrency, setMaxBatchConcurrency] = useState('10');
  const [globalThrottleRate, setGlobalThrottleRate] = useState('500');
  const [webhookSecret, setWebhookSecret] = useState('whsec_syntech_dc_live_meta_cloud_2026');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast('Parâmetros globais de infraestrutura salvos!', 'success');
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-sky-400" />
          <span>Configurações Globais da Infraestrutura</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Parâmetros de balanceamento de carga, credenciais da Meta Cloud API e segurança corporativa.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card className="p-6 bg-slate-900 border-slate-800">
            <form onSubmit={handleSave} className="space-y-5">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400" />
                <span>Cluster Meta WhatsApp Business (WABA)</span>
              </h3>

              <Input
                label="Endpoint Oficial Graph API"
                value={wabaClusterUrl}
                onChange={e => setWabaClusterUrl(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Concorrência Máxima de Lotes"
                  type="number"
                  value={maxBatchConcurrency}
                  onChange={e => setMaxBatchConcurrency(e.target.value)}
                  required
                />
                <Input
                  label="Limite Global de Throttle (msgs/segundo)"
                  type="number"
                  value={globalThrottleRate}
                  onChange={e => setGlobalThrottleRate(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Webhook Secret de Verificação (Meta Cloud)"
                type="password"
                value={webhookSecret}
                onChange={e => setWebhookSecret(e.target.value)}
                required
              />

              <div className="flex justify-end pt-3">
                <Button variant="primary" type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                  Salvar Configurações
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card className="p-6 bg-slate-900 border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Status de Saúde do Cluster</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">PostgreSQL (Supabase)</span>
                <span className="text-emerald-400 font-bold font-mono">CONECTADO</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Meta Cloud API</span>
                <span className="text-emerald-400 font-bold font-mono">v20.0 READY</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Redis Queue (Fila)</span>
                <span className="text-emerald-400 font-bold font-mono">0.4ms LATENCY</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
