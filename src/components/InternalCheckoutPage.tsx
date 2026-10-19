import { useSiteContent } from '../cms/SiteContent';
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Smartphone,
  Building,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Sparkles,
  Flame,
  MessageCircle,
  ExternalLink,
  Crown,
} from 'lucide-react';
import { Plan, Creator, AppUser } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { LuandaPriveLogo } from './LuandaPriveLogo';

interface OrderBump {
  id: string;
  title: string;
  description: string;
  priceRaw: number;
  priceFormatted: string;
  badge: string;
  icon: string;
}

interface InternalCheckoutPageProps {
  plan: Plan;
  creator: Creator;
  user?: AppUser | FirebaseUser | null;
  onBack: () => void;
  onSuccess: () => void;
}

export const InternalCheckoutPage: React.FC<InternalCheckoutPageProps> = ({
  plan,
  creator,
  user,
  onBack,
  onSuccess,
}) => {
  const { copy, settings } = useSiteContent();
  const [selectedMethod, setSelectedMethod] = useState<'express' | 'referencia' | 'iban'>('express');
  const [mcxPhone, setMcxPhone] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [mcxRequested, setMcxRequested] = useState(false);

  // Countdown timer for urgency (10 minutes)
  const [secondsLeft, setSecondsLeft] = useState(599);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 599));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 3 High-Converting Order Bumps
  const availableBumps: OrderBump[] = [
    {
      id: 'bump-whatsapp',
      title: copy("overlay.internal-checkout-page.048", { name: creator.shortName }),
      description: copy("overlay.internal-checkout-page.049", { name: creator.shortName }),
      priceRaw: 3500,
      priceFormatted: copy("overlay.internal-checkout-page.038"),
      badge: copy("overlay.internal-checkout-page.039"),
      icon: '📱',
    },
    {
      id: 'bump-secret-pack',
      title: copy("overlay.internal-checkout-page.040"),
      description: copy("overlay.internal-checkout-page.041"),
      priceRaw: 4900,
      priceFormatted: copy("overlay.internal-checkout-page.042"),
      badge: copy("overlay.internal-checkout-page.043"),
      icon: '🔒',
    },
    {
      id: 'bump-vip-speed',
      title: copy("overlay.internal-checkout-page.044"),
      description: copy("overlay.internal-checkout-page.045"),
      priceRaw: 1500,
      priceFormatted: copy("overlay.internal-checkout-page.046"),
      badge: copy("overlay.internal-checkout-page.047"),
      icon: '⚡',
    },
  ];

  const [selectedBumps, setSelectedBumps] = useState<Record<string, boolean>>({
    'bump-whatsapp': true, // Pre-checked for highest conversion
  });

  const toggleBump = (id: string) => {
    setSelectedBumps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculate Total Price
  const basePlanPrice = plan.rawPrice || 10000;
  const bumpsTotal = availableBumps.reduce((acc, bump) => {
    return selectedBumps[bump.id] ? acc + bump.priceRaw : acc;
  }, 0);
  const finalTotalRaw = basePlanPrice + bumpsTotal;
  const finalTotalFormatted = `${finalTotalRaw.toLocaleString('pt-AO')} Kz`;

  // Bank & Reference Details
  const entidadeCode = copy("overlay.internal-checkout-page.057");
  const referenciaCode = copy("overlay.internal-checkout-page.058");
  const ibanCode = settings.bankDetails.iban;
  const beneficiaryName = copy("overlay.internal-checkout-page.059");

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleMcxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcxPhone || mcxPhone.length < 9) {
      alert(copy("overlay.internal-checkout-page.056"));
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setMcxRequested(true);
    }, 1400);
  };

  const handleConfirmPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      onSuccess();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#080d17] text-white flex flex-col font-sans antialiased selection:bg-[#00aff0]">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#0c1424]/95 backdrop-blur-md border-b border-slate-800/80 px-3.5 py-3 flex items-center justify-between shadow-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-full"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{copy("overlay.internal-checkout-page.001")}</span>
        </button>

        <LuandaPriveLogo size="sm" variant="compact" />

        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTimer(secondsLeft)}</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-xl mx-auto w-full px-3.5 py-4 space-y-4 pb-36">
        {/* Security Guarantee Notice */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider">{copy("overlay.internal-checkout-page.002")}</h4>
            <p className="text-[11px] text-slate-300 leading-snug">{copy("overlay.internal-checkout-page.003")}</p>
          </div>
        </div>

        {/* Success Screen */}
        {isCompleted ? (
          <div className="bg-[#0f172a] rounded-3xl p-6 border border-emerald-500/40 text-center space-y-4 shadow-2xl animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">{copy("overlay.internal-checkout-page.004")}</h3>
              <p className="text-xs text-slate-300 mt-1">
                {copy("overlay.internal-checkout-page.052", { name: creator.name })}
              </p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>{copy("overlay.internal-checkout-page.005")}</span>
                <span className="font-bold text-white">{creator.name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{copy("overlay.internal-checkout-page.006")}</span>
                <span className="font-bold text-emerald-400">{plan.duration}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{copy("overlay.internal-checkout-page.007")}</span>
                <span className="font-mono font-bold text-white">{finalTotalFormatted}</span>
              </div>
              {selectedBumps['bump-whatsapp'] && (
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>{copy("overlay.internal-checkout-page.008")}</span>
                  <span className="font-mono font-bold text-emerald-400">{creator.whatsappNumber}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              {selectedBumps['bump-whatsapp'] && (
                <a
                  href={`https://wa.me/${creator.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    copy("overlay.internal-checkout-page.050", { name: creator.shortName })
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{copy("overlay.internal-checkout-page.053", { name: creator.shortName })}</span>
                </a>
              )}

              <button
                onClick={onBack}
                className="w-full py-3 bg-gradient-to-r from-[#00aff0] to-[#0070ba] text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >{copy("overlay.internal-checkout-page.009")}</button>
            </div>
          </div>
        ) : (
          <>
            {/* Selected Plan Summary Card */}
            <div className="bg-[#0f192d] rounded-2xl p-4 border border-[#00aff0]/30 shadow-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={creator.avatar}
                    alt={creator.name}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-[#00aff0]/40"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 text-[8px] font-black px-1 rounded-sm">{copy("overlay.internal-checkout-page.010")}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="text-xs sm:text-sm font-black text-white">{creator.name}</h3>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white fill-[#00aff0]" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">{copy("overlay.internal-checkout-page.061", { duration: plan.duration })}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block line-through">
                  {(basePlanPrice * 1.5).toLocaleString('pt-AO')} Kz
                </span>
                <span className="text-sm sm:text-base font-black text-[#00aff0] font-mono">
                  {plan.price}
                </span>
              </div>
            </div>

            {/* ORDER BUMPS SECTION (Aumenta o Ticket Médio) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{copy("overlay.internal-checkout-page.011")}</span>
                </h4>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">{copy("overlay.internal-checkout-page.012")}</span>
              </div>

              {availableBumps.map((bump) => {
                const isChecked = !!selectedBumps[bump.id];
                return (
                  <label
                    key={bump.id}
                    onClick={() => toggleBump(bump.id)}
                    className={`block p-3.5 rounded-2xl border transition-all cursor-pointer relative select-none ${
                      isChecked
                        ? 'bg-[#132238] border-[#00aff0] shadow-md ring-1 ring-[#00aff0]/40'
                        : 'bg-[#0c1424] border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // controlled by wrapper
                          className="w-4 h-4 rounded text-[#00aff0] focus:ring-0 cursor-pointer accent-[#00aff0]"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-black text-white">
                            {bump.icon} {bump.title}
                          </span>
                          <span className="text-[9px] uppercase font-black text-amber-300 bg-amber-400/20 border border-amber-400/30 px-1.5 py-0.2 rounded">
                            {bump.badge}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-snug">
                          {bump.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-emerald-400 font-mono">
                          +{bump.priceFormatted}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* PAYMENT METHOD SELECTOR */}
            <div className="bg-[#0c1424] rounded-2xl p-4 border border-slate-800 space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>{copy("overlay.internal-checkout-page.013")}</span>
                <span className="text-[10px] text-slate-400 font-normal">{copy("overlay.internal-checkout-page.014")}</span>
              </h4>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('express')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    selectedMethod === 'express'
                      ? 'bg-[#00aff0] text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{copy("overlay.internal-checkout-page.015")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('referencia')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    selectedMethod === 'referencia'
                      ? 'bg-[#00aff0] text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>{copy("overlay.internal-checkout-page.016")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('iban')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    selectedMethod === 'iban'
                      ? 'bg-[#00aff0] text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{copy("overlay.internal-checkout-page.017")}</span>
                </button>
              </div>

              {/* METHOD 1: MULTICAIXA EXPRESS */}
              {selectedMethod === 'express' && (
                <div className="space-y-3 pt-1">
                  {!mcxRequested ? (
                    <form onSubmit={handleMcxSubmit} className="space-y-3">
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                        <p className="font-bold text-white">{copy("overlay.internal-checkout-page.018")}</p>
                        <ol className="list-decimal list-inside text-slate-400 space-y-0.5">
                          <li>{copy("overlay.internal-checkout-page.019")}</li>
                          <li>{copy("overlay.internal-checkout-page.020")}</li>
                          <li>{copy("overlay.internal-checkout-page.021")}</li>
                        </ol>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">{copy("overlay.internal-checkout-page.022")}</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-black text-slate-400">
                            +244
                          </div>
                          <input
                            type="tel"
                            placeholder={copy("overlay.internal-checkout-page.037")}
                            value={mcxPhone}
                            onChange={(e) => setMcxPhone(e.target.value.replace(/[^0-9]/g, ''))}
                            maxLength={9}
                            className="w-full pl-14 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00aff0]"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-3 bg-gradient-to-r from-[#00aff0] to-[#0070ba] hover:from-[#009ed9] hover:to-[#005fa0] text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>
                          {isProcessing
                            ? copy("overlay.internal-checkout-page.062")
                            : copy("overlay.internal-checkout-page.051", { total: finalTotalFormatted })}
                        </span>
                      </button>
                    </form>
                  ) : (
                    <div className="bg-slate-900 p-4 rounded-xl border border-[#00aff0]/40 space-y-3 text-center animate-fadeIn">
                      <div className="w-10 h-10 rounded-full bg-[#00aff0]/20 text-[#00aff0] flex items-center justify-center mx-auto animate-pulse">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-white">
                          {copy("overlay.internal-checkout-page.054", { phone: mcxPhone })}
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {copy("overlay.internal-checkout-page.060")}
                          <strong className="text-emerald-400">{finalTotalFormatted}</strong>.
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleConfirmPayment}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
                        >{copy("overlay.internal-checkout-page.023")}</button>

                        <button
                          type="button"
                          onClick={() => setMcxRequested(false)}
                          className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                        >{copy("overlay.internal-checkout-page.024")}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* METHOD 2: REFERÊNCIA BANCÁRIA */}
              {selectedMethod === 'referencia' && (
                <div className="space-y-3 pt-1">
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                    <p className="text-[11px] text-slate-400">{copy("overlay.internal-checkout-page.025")}<strong>{copy("overlay.internal-checkout-page.026")}</strong>:
                    </p>

                    <div className="bg-black/50 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{copy("overlay.internal-checkout-page.027")}</span>
                        <span className="font-mono font-black text-sm text-white">{entidadeCode}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(entidadeCode, 'entidade')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'entidade' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'entidade' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{copy("overlay.internal-checkout-page.028")}</span>
                        <span className="font-mono font-black text-sm text-[#00aff0]">{referenciaCode}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(referenciaCode, 'referencia')}
                        className="px-2.5 py-1 bg-[#00aff0] hover:bg-[#009ed9] text-xs font-bold rounded text-white flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'referencia' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'referencia' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{copy("overlay.internal-checkout-page.029")}</span>
                        <span className="font-mono font-black text-sm text-emerald-400">{finalTotalFormatted}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(finalTotalRaw.toString(), 'montante')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'montante' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'montante' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{copy("overlay.internal-checkout-page.030")}</span>
                  </button>
                </div>
              )}

              {/* METHOD 3: IBAN DIRETO */}
              {selectedMethod === 'iban' && (
                <div className="space-y-3 pt-1">
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{copy("overlay.internal-checkout-page.031")}</span>
                      <span className="font-bold text-white">{beneficiaryName}</span>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] text-slate-400 block">{copy("overlay.internal-checkout-page.032")}</span>
                        <span className="font-mono font-bold text-xs text-[#00aff0] truncate block">
                          {ibanCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(ibanCode, 'iban')}
                        className="px-2.5 py-1 bg-[#00aff0] hover:bg-[#009ed9] text-xs font-bold rounded text-white flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedKey === 'iban' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'iban' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">{copy("overlay.internal-checkout-page.033")}</span>
                      <span className="font-mono font-black text-sm text-emerald-400">{finalTotalFormatted}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{copy("overlay.internal-checkout-page.034")}</span>
                  </button>
                </div>
              )}
            </div>

            {/* ORDER TOTAL STICKY FOOTER */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0b1220]/95 backdrop-blur-md border-t border-slate-800 p-3 max-w-[600px] mx-auto shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{copy("overlay.internal-checkout-page.035")}</span>
                  <span className="text-base font-black text-white font-mono">
                    {finalTotalFormatted}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{copy("overlay.internal-checkout-page.036")}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={selectedMethod === 'express' ? () => {} : handleConfirmPayment}
                className="w-full py-3 bg-gradient-to-r from-[#00aff0] to-[#0070ba] hover:from-[#009ed9] hover:to-[#005fa0] text-white font-black text-xs rounded-xl shadow-lg shadow-[#00aff0]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Lock className="w-4 h-4" />
                <span>{copy("overlay.internal-checkout-page.055", { total: finalTotalFormatted })}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
