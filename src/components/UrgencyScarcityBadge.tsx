import { useSiteContent } from '../cms/SiteContent';
import React, { useState, useEffect } from 'react';
import { Flame, Clock, Eye, ShieldCheck, Zap } from 'lucide-react';

interface UrgencyScarcityBadgeProps {
  creatorShortName: string;
  onUnlockClick: () => void;
}

export const UrgencyScarcityBadge: React.FC<UrgencyScarcityBadgeProps> = ({
  creatorShortName,
  onUnlockClick,
}) => {
  const { copy } = useSiteContent();
  const [viewers, setViewers] = useState(7);
  const [secondsLeft, setSecondsLeft] = useState(864); // ~14 min countdown

  useEffect(() => {
    // Dynamic small fluctuations in viewers
    const viewerInterval = setInterval(() => {
      setViewers((v) => Math.min(14, Math.max(5, v + (Math.random() > 0.5 ? 1 : -1))));
    }, 6000);

    // Countdown timer
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 900));
    }, 1000);

    return () => {
      clearInterval(viewerInterval);
      clearInterval(timer);
    };
  }, []);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="mx-4 my-2.5 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-500/25 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-amber-700 font-bold">
          <Flame className="w-4 h-4 text-[#f97316] fill-[#f97316] animate-pulse" />
          <span>{copy('home.urgency.title')}</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span><strong className="text-slate-900 font-mono">{copy('home.urgency.viewers', { count: viewers })}</strong>{copy('home.urgency.viewing')}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-700 pt-1.5 border-t border-amber-500/15">
        <div className="flex items-center gap-1 text-rose-600 font-semibold">
          <Zap className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span>{copy('home.urgency.availability')}</span>
        </div>

        <div className="flex items-center gap-1 font-mono text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
          <Clock className="w-3 h-3 text-amber-500" />
          <span className="font-bold">{mins}:{secs}</span>
        </div>
      </div>
    </div>
  );
};
