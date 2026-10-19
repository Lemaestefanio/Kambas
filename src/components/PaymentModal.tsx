import { useSiteContent } from '../cms/SiteContent';
import React, { useState } from 'react';
import { X, Check, Copy, Smartphone, Building, ExternalLink, ShieldCheck, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Plan, Creator } from '../types';

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
  const { copy, settings } = useSiteContent();

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

  if (!isOpen || !plan) return null;

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
                {copy("overlay.payment-modal.029", { name: creator.shortName })}
              </h3>
              <p className="text-xs text-[#00aff0] font-bold font-mono">
                {plan.duration} · {plan.price} 🇦🇴
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            aria-label={copy("overlay.payment-modal.025")}
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
                <h4 className="text-lg font-bold text-slate-900">{copy("overlay.payment-modal.001")}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{copy("overlay.payment-modal.002")}</p>
              </div>

              <div className="w-full bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>{copy("overlay.payment-modal.003")}</span>
                  <span className="font-bold text-slate-900">{creator.name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{copy("overlay.payment-modal.004")}</span>
                  <span className="font-bold text-slate-900">{plan.duration}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{copy("overlay.payment-modal.005")}</span>
                  <span className="font-mono font-bold text-emerald-600">{creator.whatsappNumber}</span>
                </div>
              </div>

              <a
                href={`https://wa.me/${rawPhone}?text=${encodeURIComponent(
                  copy("overlay.payment-modal.027", { name: creator.shortName, duration: plan.duration })
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs rounded-full transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Smartphone className="w-4 h-4" />
                <span>{copy("overlay.payment-modal.030", { name: creator.shortName })}</span>
              </a>

              <button
                onClick={onClose}
                className="w-full py-2 text-slate-500 text-xs font-semibold hover:text-slate-800"
              >{copy("overlay.payment-modal.006")}</button>
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
                  <span>{copy("overlay.payment-modal.007")}</span>
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
                  <span>{copy("overlay.payment-modal.008")}</span>
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
                  <span>{copy("overlay.payment-modal.009")}</span>
                </button>
              </div>

              {/* Multicaixa Express Form */}
              {paymentMethod === 'express' && (
                <form onSubmit={handleExpressSubmit} className="space-y-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                    <p className="font-semibold text-slate-900 mb-1">{copy("overlay.payment-modal.010")}</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-500 text-[11px]">
                      <li>{copy("overlay.payment-modal.011")}</li>
                      <li>{copy("overlay.payment-modal.012")}</li>
                      <li>{copy("overlay.payment-modal.013")}</li>
                    </ol>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{copy("overlay.payment-modal.014")}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                        +244
                      </div>
                      <input
                        type="tel"
                        placeholder={copy("overlay.payment-modal.026")}
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
                        <span>{copy("overlay.payment-modal.015")}</span>
                      </>
                    ) : (
                      <>
                        <span>{copy("overlay.payment-modal.031", { price: plan.price })}</span>
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
                      <span className="text-slate-500">{copy("overlay.payment-modal.016")}</span>
                      <span className="font-bold text-slate-900">{settings.bankDetails.bankName}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">{copy("overlay.payment-modal.017")}</span>
                      <span className="font-medium text-slate-900">{settings.bankDetails.beneficiary}</span>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">{copy("overlay.payment-modal.018")}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#00aff0] text-[11px]">
                          {settings.bankDetails.iban}
                        </span>
                        <button
                          onClick={() => handleCopy(settings.bankDetails.iban, 'iban')}
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
                      <span className="text-slate-500">{copy("overlay.payment-modal.019")}</span>
                      <span className="font-bold text-slate-900 font-mono">{plan.price}</span>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/${rawPhone}?text=${encodeURIComponent(
                      copy("overlay.payment-modal.028", { price: plan.price, duration: plan.duration, name: creator.shortName })
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs rounded-full transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>{copy("overlay.payment-modal.020")}</span>
                  </a>
                </div>
              )}

              {/* Direct Link */}
              {paymentMethod === 'direct' && (
                <div className="space-y-3 text-center">
                  <p className="text-xs text-slate-500 text-left bg-slate-50 p-3 rounded-xl border border-slate-200">{copy("overlay.payment-modal.021")}</p>

                  <a
                    href={plan.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-[#00aff0] hover:bg-[#009ed9] text-white font-bold text-xs sm:text-sm rounded-full transition-all flex items-center justify-center gap-2 shadow-md shadow-[#00aff0]/25"
                  >
                    <span>{copy("overlay.payment-modal.022")}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Security info */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{copy("overlay.payment-modal.023")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#00aff0]" />
                  <span>{copy("overlay.payment-modal.024")}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
