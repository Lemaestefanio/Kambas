import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';

interface ProofNotification {
  name: string;
  city: string;
  action: string;
  time: string;
}

const NOTIFICATIONS: ProofNotification[] = [
  { name: 'Adilson M.', city: 'Talatona', action: 'desbloqueou acesso VIP via Multicaixa', time: 'há 1 min' },
  { name: 'Carlos D.', city: 'Maianga', action: 'agendou vídeo chamada no WhatsApp', time: 'há 3 min' },
  { name: 'Mateus K.', city: 'Luanda Centro', action: 'assinou o plano de 3 Meses', time: 'há 5 min' },
  { name: 'Kelson B.', city: 'Benguela', action: 'recebeu o link privado no Telegram', time: 'há 7 min' },
  { name: 'Edson T.', city: 'Miramar', action: 'desbloqueou fotos e vídeos exclusivos', time: 'há 2 min' },
];

export const LiveSocialProofToast: React.FC = () => {
  const [current, setCurrent] = useState<ProofNotification | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let index = 0;

    const showNext = () => {
      setCurrent(NOTIFICATIONS[index % NOTIFICATIONS.length]);
      setVisible(true);

      // Hide after 4 seconds
      setTimeout(() => {
        setVisible(false);
      }, 4000);

      index++;
    };

    // First popup after 6 seconds, then every 16 seconds
    const initialTimer = setTimeout(() => {
      showNext();
      const interval = setInterval(showNext, 16000);
      return () => clearInterval(interval);
    }, 6000);

    return () => clearTimeout(initialTimer);
  }, []);

  if (!visible || !current) return null;

  return (
    <div className="fixed top-12 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-xs z-50 animate-slide-down pointer-events-none">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-2.5 shadow-xl shadow-black/10 flex items-center gap-2.5 pointer-events-auto">
        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-800 leading-snug">
            <span className="font-bold">{current.name}</span> ({current.city}) {current.action}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Confirmado em Angola 🇦🇴</span>
            <span>·</span>
            <span className="font-mono">{current.time}</span>
          </div>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
