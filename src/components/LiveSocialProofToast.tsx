import { useSiteContent } from '../cms/SiteContent';
import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';

interface ProofNotification {
  name: string;
  action: string;
  time: string;
}

// 100% Anónimo: Sem apelidos de família e SEM qualquer localização!


export const LiveSocialProofToast: React.FC = () => {
  const { copy } = useSiteContent();
  const NOTIFICATIONS: ProofNotification[] = [
    { name: copy("overlay.live-social-proof-toast.009"), action: copy("overlay.live-social-proof-toast.010"), time: copy("overlay.live-social-proof-toast.002") },
    { name: copy("overlay.live-social-proof-toast.011"), action: copy("overlay.live-social-proof-toast.012"), time: copy("overlay.live-social-proof-toast.003") },
    { name: copy("overlay.live-social-proof-toast.013"), action: copy("overlay.live-social-proof-toast.014"), time: copy("overlay.live-social-proof-toast.004") },
    { name: copy("overlay.live-social-proof-toast.015"), action: copy("overlay.live-social-proof-toast.016"), time: copy("overlay.live-social-proof-toast.005") },
    { name: copy("overlay.live-social-proof-toast.017"), action: copy("overlay.live-social-proof-toast.018"), time: copy("overlay.live-social-proof-toast.006") },
    { name: copy("overlay.live-social-proof-toast.019"), action: copy("overlay.live-social-proof-toast.020"), time: copy("overlay.live-social-proof-toast.007") },
  ];
  const [current, setCurrent] = useState<ProofNotification | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let index = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const showNext = () => {
      setCurrent(NOTIFICATIONS[index % NOTIFICATIONS.length]);
      setVisible(true);

      // Hide after 3.8 seconds
      hideTimer = setTimeout(() => {
        setVisible(false);
      }, 3800);

      index++;
    };

    // First popup after 8 seconds, then every 20 seconds
    const initialTimer = setTimeout(() => {
      showNext();
      interval = setInterval(showNext, 20000);
    }, 8000);

    return () => {
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [copy]);

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
            <span>{copy("overlay.live-social-proof-toast.008", { time: current.time })}</span>
          </div>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="text-slate-400 hover:text-slate-600 p-1"
          aria-label={copy("overlay.live-social-proof-toast.001")}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
