import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';

interface ProofNotification {
  name: string;
  action: string;
  time: string;
}

// 100% Anónimo: Sem apelidos de família e SEM qualquer localização!
const NOTIFICATIONS: ProofNotification[] = [
  { name: 'Edson', action: 'desbloqueou o plano VIP via Multicaixa', time: 'há 1 min' },
  { name: 'Membro Anónimo', action: 'ativou acesso privado exclusivo', time: 'há 2 min' },
  { name: 'Paulo', action: 'desbloqueou fotos e vídeos VIP', time: 'há 4 min' },
  { name: 'Valter', action: 'assinou o plano de 30 dias', time: 'há 6 min' },
  { name: 'Fã VIP', action: 'iniciou conversa no WhatsApp da criadora', time: 'há 8 min' },
  { name: 'Edson', action: 'desbloqueou acesso total aos conteúdos', time: 'há 3 min' },
];

export const LiveSocialProofToast: React.FC = () => {
  const [current, setCurrent] = useState<ProofNotification | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let index = 0;

    const showNext = () => {
      setCurrent(NOTIFICATIONS[index % NOTIFICATIONS.length]);
      setVisible(true);

      // Hide after 3.8 seconds
      setTimeout(() => {
        setVisible(false);
      }, 3800);

      index++;
    };

    // First popup after 8 seconds, then every 20 seconds
    const initialTimer = setTimeout(() => {
      showNext();
      const interval = setInterval(showNext, 20000);
      return () => clearInterval(interval);
    }, 8000);

    return () => clearTimeout(initialTimer);
  }, []);

  if (!visible || !current) return null;

  return (
    <div className="fixed top-14 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-xs z-50 animate-slide-down pointer-events-none">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-2.5 shadow-xl shadow-black/10 flex items-center gap-2.5 pointer-events-auto">
        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-800 leading-snug">
            <span className="font-bold text-slate-900">{current.name}</span> {current.action}
          </p>
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Transação 100% Discreta & Anónima · {current.time}</span>
          </div>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="text-slate-400 hover:text-slate-600 p-1"
          aria-label="Fechar"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
