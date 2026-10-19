import { useSiteContent } from '../cms/SiteContent';
import React from 'react';
import { Lock, ShieldCheck, EyeOff } from 'lucide-react';
import { Creator } from '../types';

interface StickyBottomBarProps {
  creator: Creator;
  onUnlockClick: () => void;
}

export const StickyBottomBar: React.FC<StickyBottomBarProps> = ({ creator, onUnlockClick }) => {
  const { copy } = useSiteContent();
  const entryPlan = creator.plans.find((p) => p.id === '30-days') || creator.plans[0];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#001824]/95 backdrop-blur-md px-4 pt-3 pb-2 safe-bottom border-t border-white/10 shadow-2xl">
      <div className="max-w-[600px] mx-auto">
        <button
          onClick={onUnlockClick}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-gradient-to-r from-[#00aff0] to-[#0088cc] hover:from-[#009fd9] hover:to-[#007ab8] text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#00aff0]/30 active:scale-[0.98]"
        >
          <Lock className="h-4 w-4" />
          <span>{copy('home.sticky.button', { price: entryPlan.price })}</span>
        </button>

        <div className="flex items-center justify-center gap-3 mt-2 pb-1">
          <div className="flex items-center gap-1 text-white/50">
            <ShieldCheck className="h-3 w-3" />
            <span className="text-[9px] font-medium uppercase tracking-wider">{copy('home.sticky.ssl')}</span>
          </div>

          <div className="w-px h-3 bg-white/20" />

          <div className="flex items-center gap-1 text-white/50">
            <Lock className="h-3 w-3" />
            <span className="text-[9px] font-medium uppercase tracking-wider">{copy('home.sticky.data')}</span>
          </div>

          <div className="w-px h-3 bg-white/20" />

          <div className="flex items-center gap-1 text-white/50">
            <EyeOff className="h-3 w-3" />
            <span className="text-[9px] font-medium uppercase tracking-wider">{copy('home.sticky.billing')}</span>
          </div>
        </div>

        <p className="text-center text-[8px] text-white/40 leading-tight">
          {copy('home.sticky.discretion')}
        </p>
      </div>
    </div>
  );
};
