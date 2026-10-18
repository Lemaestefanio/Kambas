import React from 'react';
import { Lock } from 'lucide-react';

interface SubscribeBarProps {
  onSubscribeClick: () => void;
}

export const SubscribeBar: React.FC<SubscribeBarProps> = ({ onSubscribeClick }) => {
  return (
    <div className="bg-white border-t border-b border-slate-200/80">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          🇦🇴 Assinatura
        </h2>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={onSubscribeClick}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-gradient-to-r from-[#00aff0] to-[#0088cc] hover:from-[#009fd9] hover:to-[#007ab8] text-white font-bold text-sm uppercase tracking-wide transition-all shadow-md shadow-[#00aff0]/25 active:scale-[0.98]"
        >
          <Lock className="h-4 w-4" />
          <span>Assinar</span>
        </button>
      </div>
    </div>
  );
};
