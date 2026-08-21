import React from 'react';
import { CheckCheck, ShieldCheck, Phone, Video, MoreVertical, Paperclip, Send, Smile } from 'lucide-react';

interface WhatsAppSimulatorProps {
  content: string;
  senderName?: string;
  senderPhone?: string;
  mediaUrl?: string;
  mediaType?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO';
  sampleData?: {
    nome?: string;
    empresa?: string;
    loja?: string;
    cidade?: string;
    produto?: string;
  };
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  content,
  senderName = 'SYNTECH DC - Oficial',
  senderPhone = '+55 11 99123-4567',
  mediaUrl,
  mediaType = 'TEXT',
  sampleData = {
    nome: 'Dr. Roberto Silva',
    empresa: 'Rede FarmaVida Brasil',
    loja: 'Unidade Jardins - SP',
    cidade: 'São Paulo',
    produto: 'Sérum Vitamina C 15ml',
  },
}) => {
  // Replace variables in real-time
  let renderedText = content || 'Digite sua mensagem para visualizar o simulador oficial em tempo real...';

  if (sampleData) {
    Object.keys(sampleData).forEach(key => {
      const val = (sampleData as any)[key] || '';
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      renderedText = renderedText.replace(regex, val);
    });
  }

  // Format WhatsApp bold, italic
  // Replace *bold* with <strong>
  const formatWhatsApp = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let formatted = line.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
      return (
        <span key={idx} className="block leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full max-w-sm mx-auto rounded-[36px] bg-slate-900 border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[520px]">
      {/* Top Phone Speaker / Notch */}
      <div className="bg-slate-950 py-1.5 flex justify-center items-center">
        <div className="w-16 h-3.5 bg-slate-800 rounded-full" />
      </div>

      {/* WhatsApp Corporate Header */}
      <div className="bg-[#075e54] text-white px-3.5 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow-xs">
              {senderName.charAt(0)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-400 rounded-full p-0.5 text-white">
              <ShieldCheck className="w-2.5 h-2.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h5 className="font-semibold text-xs leading-tight truncate max-w-[130px]">{senderName}</h5>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            </div>
            <p className="text-[10px] text-emerald-100/80">Conta Comercial Oficial</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-emerald-100">
          <Phone className="w-4 h-4 cursor-pointer hover:text-white" />
          <Video className="w-4 h-4 cursor-pointer hover:text-white" />
          <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
        </div>
      </div>

      {/* Chat Canvas (WhatsApp Background pattern feel) */}
      <div className="flex-1 bg-[#efeae2] dark:bg-[#0b141a] p-3 overflow-y-auto flex flex-col justify-end space-y-2 relative">
        {/* Encryption badge */}
        <div className="mx-auto my-1 bg-[#ffeecd] dark:bg-[#182229] border border-amber-200/40 dark:border-slate-700/50 rounded-lg px-2.5 py-1 text-[10px] text-amber-900 dark:text-amber-200/90 text-center max-w-[280px] shadow-xs">
          🔒 Mensagens protegidas e disparadas via <strong>WABA Oficial SYNTECH DC</strong>.
        </div>

        {/* Message Bubble */}
        <div className="self-start max-w-[85%] bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-xs p-3 shadow-md border border-black/5 dark:border-white/5 space-y-1.5 animate-in fade-in duration-200">
          {mediaUrl && (
            <div className="rounded-xl overflow-hidden mb-1 border border-slate-200 dark:border-slate-700">
              <img src={mediaUrl} alt="Mídia da mensagem" className="w-full h-32 object-cover" />
            </div>
          )}

          <div className="text-xs text-slate-800 dark:text-slate-100 break-words whitespace-pre-wrap">
            {formatWhatsApp(renderedText)}
          </div>

          <div className="flex items-center justify-end gap-1 pt-1 text-[10px] text-slate-400">
            <span>{currentTime}</span>
            <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
          </div>
        </div>
      </div>

      {/* WhatsApp Input Bar */}
      <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-3 py-2 flex items-center gap-2 border-t border-slate-200 dark:border-slate-800">
        <Smile className="w-5 h-5 text-slate-500 cursor-pointer" />
        <Paperclip className="w-5 h-5 text-slate-500 cursor-pointer" />
        <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-3 py-1.5 text-xs text-slate-400 border border-slate-200 dark:border-slate-700">
          Mensagem...
        </div>
        <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white cursor-pointer shadow-xs">
          <Send className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
