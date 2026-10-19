import { useSiteContent } from '../cms/SiteContent';
import React from 'react';
import { Lock, Sparkles, Check, ChevronRight, ShieldCheck, MessageCircle, Star } from 'lucide-react';
import { Creator } from '../types';

interface PlansSectionProps {
  creator: Creator;
  onOpenPlansModal: () => void;
}

export const PlansSection: React.FC<PlansSectionProps> = ({ creator, onOpenPlansModal }) => {
  const { copy } = useSiteContent();
  return (
    <div
      id="plans-section"
      className="bg-white mx-4 mt-3 rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 scroll-mt-20"
    >
      {/* Title */}
      <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-[#00aff0] fill-[#00aff0]" />
          <span>{copy('home.plans.title', { name: creator.shortName })}</span>
        </h2>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          {copy('home.plans.immediate')}
        </span>
      </div>

      <div className="p-5">
        {/* VIP Preview Hero Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white shadow-md relative overflow-hidden mb-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00aff0]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <img
                src={creator.avatar}
                alt={creator.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-[#00aff0]"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white truncate">
                  {creator.name}
                </span>
                <span className="w-4 h-4 rounded-full bg-[#00aff0] text-white text-[10px] flex items-center justify-center font-bold">
                  ✓
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium truncate">
                {copy('home.plans.location', { handle: creator.handle })}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            {copy('home.plans.description')}
          </p>

          {/* Value Perks */}
          <div className="space-y-2 mb-4 bg-white/5 rounded-lg p-3 border border-white/10 text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <Check className="w-4 h-4 text-[#00aff0] shrink-0" />
              <span>{copy('home.plans.mediaBenefit')}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <Check className="w-4 h-4 text-[#00aff0] shrink-0" />
              <span>{copy('home.plans.whatsappBenefit')}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <Check className="w-4 h-4 text-[#00aff0] shrink-0" />
              <span>{copy('home.plans.telegramBenefit')}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <Check className="w-4 h-4 text-[#00aff0] shrink-0" />
              <span>{copy('home.plans.paymentBenefit')}</span>
            </div>
          </div>

          {/* Primary Action Button to Open Plans Modal */}
          <button
            onClick={onOpenPlansModal}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#00aff0] to-[#0088cc] hover:from-[#009fd9] hover:to-[#007ab8] text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#00aff0]/30 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{copy('home.plans.viewPlans')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* WhatsApp Personal Benefit Box (Sem 'promoção', apenas benefício exclusivo) */}
        <div
          onClick={onOpenPlansModal}
          className="flex items-center gap-3 bg-[#22c55e]/10 rounded-xl px-4 py-3 border border-[#22c55e]/25 cursor-pointer hover:bg-[#22c55e]/15 transition-colors mb-3"
        >
          <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 shadow-sm text-white">
            <MessageCircle className="w-5 h-5 fill-white text-[#25D366]" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-[#15803d]">{copy('home.plans.specialBenefit')}</p>
            <p className="text-xs font-semibold text-slate-800 truncate">
              {copy('home.plans.whatsappPersonal', { name: creator.shortName })}
            </p>
          </div>

          <span className="text-[11px] font-bold text-[#15803d] flex items-center gap-0.5">
            <span>{copy('home.plans.view')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00aff0]" />
            <span>{copy('home.plans.securePayment')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#00aff0]" />
            <span>{copy('home.plans.activation')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
