import React, { useState } from 'react';
import { X, Check, Lock, Sparkles, ShieldCheck, ChevronRight, Zap } from 'lucide-react';
import { Plan, Creator } from '../types';

interface PlansModalProps {
  creator: Creator;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: Plan) => void;
}

export const PlansModal: React.FC<PlansModalProps> = ({
  creator,
  isOpen,
  onClose,
  onSelectPlan,
}) => {
  if (!isOpen) return null;

  // Default to 30 days plan or first plan
  const defaultPlan = creator.plans.find((p) => p.id === '30-days') || creator.plans[0];
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlan.id);

  const activePlan = creator.plans.find((p) => p.id === selectedPlanId) || defaultPlan;

  const handleContinue = () => {
    const targetUrl =
      activePlan.checkoutUrl ||
      creator.checkoutUrl ||
      'https://pay.meuskambas.online/checkout/sandra-gomes-chat-privado-30-dias';
    window.location.href = targetUrl;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Handle on Mobile */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={creator.avatar}
                alt={creator.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-[#00aff0]"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {creator.name}
                </h3>
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#00aff0] text-white text-[10px]">
                  ✓
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">
                Planos de Acesso VIP Exclusivo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* VIP Benefits Box */}
          <div className="bg-[#00aff0]/5 rounded-xl p-3.5 border border-[#00aff0]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00aff0]">
              <Sparkles className="w-4 h-4 text-[#00aff0]" />
              <span>O que está incluso na sua assinatura VIP:</span>
            </div>

            <ul className="space-y-1.5 text-[11px] text-slate-700 font-medium">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#00aff0] shrink-0" />
                <span>Acesso ilimitado a todas as postagens, fotos íntimas e vídeos 4K</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#00aff0] shrink-0" />
                <span>WhatsApp pessoal da {creator.shortName} para mensagens e áudios</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#00aff0] shrink-0" />
                <span>Canal VIP privado com atualizações diárias exclusivas</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#00aff0] shrink-0" />
                <span>Sigilo bancário total garantido no extrato Multicaixa</span>
              </li>
            </ul>
          </div>

          {/* Section title */}
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Escolha seu período de acesso:
            </p>

            {/* Plan Cards */}
            <div className="space-y-2.5">
              {creator.plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-[#00aff0] bg-[#00aff0]/5 shadow-md shadow-[#00aff0]/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-[#00aff0] bg-[#00aff0]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {plan.duration}
                            </span>
                            {plan.badge && !plan.badge.toLowerCase().includes('oferta') && !plan.badge.toLowerCase().includes('promoc') && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00aff0]/15 text-[#0088cc]">
                                {plan.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {plan.periodLabel || 'Acesso VIP completo'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-base font-extrabold text-slate-900 font-mono-nums">
                            {plan.price}
                          </span>
                          <span className="text-sm">🇦🇴</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Multicaixa Express
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discreet Security notice */}
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-[#00aff0] shrink-0" />
            <p className="text-[11px] leading-tight">
              <strong>Cobrança anônima:</strong> No extrato bancário aparece apenas como serviço de tecnologia neutro.
            </p>
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="p-4 border-t border-slate-100 bg-white shadow-lg space-y-2">
          <button
            onClick={handleContinue}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#00aff0] to-[#0088cc] hover:from-[#009fd9] hover:to-[#007ab8] text-white font-bold text-sm uppercase tracking-wide transition-all shadow-lg shadow-[#00aff0]/30 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>
              {creator.customPaymentButtonText
                ? `${creator.customPaymentButtonText} (${activePlan.price})`
                : `Confirmar e Pagar ${activePlan.duration} (${activePlan.price})`}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[10px] text-slate-400">
            Acesso liberado instantaneamente após confirmação no Multicaixa
          </p>
        </div>
      </div>
    </div>
  );
};
