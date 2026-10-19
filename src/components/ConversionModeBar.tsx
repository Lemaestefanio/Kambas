import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, ShieldCheck, Zap, Lock, ArrowRight, UserCheck } from 'lucide-react';

export type PageMode = 'login-first' | 'direct-pay' | 'teaser-promo';

interface ConversionModeBarProps {
  currentMode: PageMode;
  onModeChange: (mode: PageMode) => void;
  onOpenAdmin: () => void;
  onClaimPromo: () => void;
}

export const ConversionModeBar: React.FC<ConversionModeBarProps> = ({
  currentMode,
  onModeChange,
  onOpenAdmin,
  onClaimPromo,
}) => {
  // 15-minute countdown for Variant C (Teaser Promo)
  const [timeLeft, setTimeLeft] = useState(14 * 60 + 59);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 14 * 60 + 59));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      {/* Teste A/B/C Selector Tabs */}
      <div className="px-3 py-1.5 bg-slate-950 flex items-center justify-between text-[11px] border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-bold text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">Teste A/B/C:</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onModeChange('login-first')}
            className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
              currentMode === 'login-first'
                ? 'bg-[#00aff0] text-white shadow-2xs font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Página 1: Necessário login antes de pagar"
          >
            1. Com Login
          </button>

          <button
            onClick={() => onModeChange('direct-pay')}
            className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
              currentMode === 'direct-pay'
                ? 'bg-[#00aff0] text-white shadow-2xs font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Página 2: Pagamento direto sem login"
          >
            2. Sem Login
          </button>

          <button
            onClick={() => onModeChange('teaser-promo')}
            className={`px-2 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 ${
              currentMode === 'teaser-promo'
                ? 'bg-rose-600 text-white shadow-2xs font-bold'
                : 'text-rose-400 hover:text-rose-300 hover:bg-slate-800'
            }`}
            title="Página 3: Teaser VIP + 50% OFF (Alta Conversão)"
          >
            <Zap className="w-3 h-3 fill-rose-300" />
            <span>3. Teaser VIP</span>
          </button>
        </div>

        {/* Secret Admin Shortcut */}
        <button
          onClick={onOpenAdmin}
          className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1 pl-1"
          title="Abrir Painel Secreto de Gestão"
        >
          <Lock className="w-2.5 h-2.5" />
          <span className="hidden sm:inline">Admin</span>
        </button>
      </div>

      {/* Mode-Specific conversion banners */}
      {currentMode === 'login-first' && (
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 px-3 py-1.5 flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#00aff0]" />
            <span className="font-medium text-[11px] sm:text-xs">
              Modo 1: <strong className="text-white">Cria conta de fã</strong> para aceder às prévias e assinar via MCX.
            </span>
          </div>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
            Fidelização
          </span>
        </div>
      )}

      {currentMode === 'direct-pay' && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 px-3 py-1.5 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-[11px] sm:text-xs">
              Modo 2: <strong className="text-white">Checkout Expresso</strong> sem registo nem palavras-passe.
            </span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
            Zero Atrito
          </span>
        </div>
      )}

      {currentMode === 'teaser-promo' && (
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 px-3 py-2 flex items-center justify-between text-xs text-rose-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-white">
              🔥 Oferta de Boas-Vindas Luanda: <span className="text-rose-400">50% OFF</span> termina em:
            </span>
            <div className="flex items-center gap-1 font-mono font-black text-rose-300 bg-black/40 px-2 py-0.5 rounded-md text-[11px]">
              <Clock className="w-3 h-3 text-rose-400" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>

          <button
            onClick={onClaimPromo}
            className="px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-[10px] shadow-xs active:scale-95 flex items-center gap-1"
          >
            <span>Aproveitar</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
