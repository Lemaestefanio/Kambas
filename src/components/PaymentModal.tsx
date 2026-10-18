import React, { useState } from 'react';
import { X, Check, Copy, Smartphone, Building, ExternalLink, ShieldCheck, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Plan, Creator } from '../types';
import { BANK_DETAILS } from '../data/content';

interface PaymentModalProps {
  plan: Plan | null;
  creator: Creator;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  plan,
  creator,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !plan) return null;

  const [paymentMethod, setPaymentMethod] = useState<'express' | 'bank' | 'direct'>('express');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExpressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 9) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsPaid(true);
      onSuccess();
    }, 2000);
  };

  const rawPhone = creator.whatsappNumber.replace(/[^0-9]/g, '');

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00aff0]/30"
            />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Desbloquear Acesso · {creator.shortName}
              </h3>
              <p className="text-xs text-[#00aff0] font-bold font-mono">
                {plan.duration} · {plan.price} 🇦🇴
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {isPaid ? (
            <div className="flex flex-col items-center text-center py-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900">Acesso Desbloqueado!</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  O teu pagamento foi confirmado com sucesso.
                </p>
              </div>

              <div className="w-full bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Criadora:</span>
                  <span className="font-bold text-slate-900">{creator.name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Plano:</span>
                  <span className="font-bold text-slate-900">{plan.duration}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>WhatsApp Pessoal:</span>
                  <span className="font-mono font-bold text-emerald-600">{creator.whatsappNumber}</span>
                </div>
              </div>

              <a
                href={`https://wa.me/${rawPhone}?text=${encodeURIComponent(
                  `Olá ${creator.shortName}! Acabei de ativar o meu acesso ${plan.duration}. Como faço para agendar a nossa chamada de vídeo?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs rounded-full transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Smartphone className="w-4 h-4" />
                <span>Conversar no WhatsApp da {creator.shortName}</span>
              </a>

              <button
                onClick={onClose}
                className="w-full py-2 text-slate-500 text-xs font-semibold hover:text-slate-800"
              >
                Voltar às publicações
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('express')}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'express'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Multicaixa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank')}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'bank'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Transferência</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('direct')}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'direct'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>MeusKambas</span>
                </button>
              </div>

              {/* Multicaixa Express Form */}
              {paymentMethod === 'express' && (
                <form onSubmit={handleExpressSubmit} className="space-y-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                    <p className="font-semibold text-slate-900 mb-1">Pagamento Multicaixa Express:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-500 text-[11px]">
                      <li>Digita o teu número associado ao Multicaixa.</li>
                      <li>Recebes a notificação no teu telefone.</li>
                      <li>Aprova a operação com o teu PIN secreto.</li>
                    </ol>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número do Telemóvel (Angola)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                        +244
                      </div>
                      <input
                        type="tel"
                        placeholder="9xx xxx xxx"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={9}
                        required
                        className="w-full pl-14 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00aff0] focus:ring-1 focus:ring-[#00aff0]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing || phoneNumber.length < 9}
                    className="w-full py-3 bg-[#00aff0] hover:bg-[#009ed9] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-full transition-all shadow-md shadow-[#00aff0]/25 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {isProcessing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>A processar no Multicaixa...</span>
                      </>
                    ) : (
                      <>
                        <span>Pagar {plan.price} via Multicaixa</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Bank Transfer Details */}
              {paymentMethod === 'bank' && (
                <div className="space-y-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Banco:</span>
                      <span className="font-bold text-slate-900">{BANK_DETAILS.bankName}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Beneficiário:</span>
                      <span className="font-medium text-slate-900">{BANK_DETAILS.beneficiary}</span>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">IBAN:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#00aff0] text-[11px]">
                          {BANK_DETAILS.iban}
                        </span>
                        <button
                          onClick={() => handleCopy(BANK_DETAILS.iban, 'iban')}
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          {copiedField === 'iban' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Valor exato:</span>
                      <span className="font-bold text-slate-900 font-mono">{plan.price}</span>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/${rawPhone}?text=${encodeURIComponent(
                      `Olá! Fiz o pagamento de ${plan.price} para o plano ${plan.duration} da ${creator.shortName}. Segue o comprovativo para ativar o meu acesso.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs rounded-full transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Enviar Comprovativo no WhatsApp</span>
                  </a>
                </div>
              )}

              {/* Direct Link */}
              {paymentMethod === 'direct' && (
                <div className="space-y-3 text-center">
                  <p className="text-xs text-slate-500 text-left bg-slate-50 p-3 rounded-xl border border-slate-200">
                    Podes também realizar o pagamento seguro diretamente na página parceira meuskambas.online.
                  </p>

                  <a
                    href={plan.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-[#00aff0] hover:bg-[#009ed9] text-white font-bold text-xs sm:text-sm rounded-full transition-all flex items-center justify-center gap-2 shadow-md shadow-[#00aff0]/25"
                  >
                    <span>Ir para Checkout Oficial</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Security info */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>SSL Seguro</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#00aff0]" />
                  <span>Ativação Instantânea</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
