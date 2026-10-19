import React, { useState } from 'react';
import { X, Gift, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Creator, Plan } from '../types';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: Creator;
  onProceedToPayment: (plan: Plan) => void;
}

export const TipModal: React.FC<TipModalProps> = ({
  isOpen,
  onClose,
  creator,
  onProceedToPayment,
}) => {
  if (!isOpen) return null;

  const mimos = creator.mimoPrices && creator.mimoPrices.length === 4
    ? creator.mimoPrices
    : [2000, 5000, 10000, 20000];

  const presetAmounts = [
    { label: `${mimos[0].toLocaleString('pt-AO')} Kz`, value: mimos[0], desc: 'Agradecimento rápido' },
    { label: `${mimos[1].toLocaleString('pt-AO')} Kz`, value: mimos[1], desc: 'Mimo especial 💋', popular: true },
    { label: `${mimos[2].toLocaleString('pt-AO')} Kz`, value: mimos[2], desc: 'Atenção prioritária no WhatsApp 🔥' },
    { label: `${mimos[3].toLocaleString('pt-AO')} Kz`, value: mimos[3], desc: 'Mimo VIP exclusivo com chamada' },
  ];

  const [selectedAmount, setSelectedAmount] = useState<number>(mimos[1]);
  const [message, setMessage] = useState<string>('');

  const handleSendTip = () => {
    const mimoIndex = mimos.indexOf(selectedAmount);
    const specificMimoUrl =
      creator.mimoCheckoutUrls && creator.mimoCheckoutUrls[mimoIndex]
        ? creator.mimoCheckoutUrls[mimoIndex]
        : '';

    const targetUrl =
      specificMimoUrl ||
      creator.tipCheckoutUrl ||
      creator.checkoutUrl ||
      'https://pay.meuskambas.online/checkout/sandra-gomes-chat-privado-30-dias';

    window.location.href = targetUrl;
  };

  return (
    <div className="fixed inset-0 z-[10005] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Enviar Mimo / Gorjeta
              </h3>
              <p className="text-[11px] text-slate-500">
                Para {creator.name} (Multicaixa Express)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Escolhe o valor da gorjeta em Kwanzas (Kz):
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {presetAmounts.map((p) => {
                const isSelected = selectedAmount === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setSelectedAmount(p.value)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-[#00aff0] bg-[#00aff0]/5 ring-1 ring-[#00aff0]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-900 block font-mono">
                      {p.label}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {p.desc}
                    </span>
                    {p.popular && (
                      <span className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">
                        Top
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Mensagem personalizada para a {creator.shortName} (opcional):
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreve uma mensagem carinhosa ou o teu WhatsApp..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00aff0]"
            />
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-center gap-2.5 text-emerald-800">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <p className="text-[11px] leading-tight">
              A {creator.shortName} recebe 100% da gorjeta e vê o teu nome e mensagem de imediato no privado.
            </p>
          </div>
        </div>

        {/* Footer Button */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleSendTip}
            className="w-full py-3 px-4 rounded-full bg-[#00aff0] hover:bg-[#009ed9] text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>
              {creator.customPaymentButtonText
                ? `${creator.customPaymentButtonText} (${selectedAmount.toLocaleString('pt-AO')} Kz)`
                : `Confirmar e Pagar ${selectedAmount.toLocaleString('pt-AO')} Kz`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
