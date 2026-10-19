import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Lock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Eye,
  Heart,
  FileText,
} from 'lucide-react';
import { LuandaPriveLogo } from './LuandaPriveLogo';

interface SafeBridgePageProps {
  onEnterPlatform: () => void;
}

export const SafeBridgePage: React.FC<SafeBridgePageProps> = ({ onEnterPlatform }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isHumanConfirmed, setIsHumanConfirmed] = useState(false);

  const handleFirstClick = () => {
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSecondClick = () => {
    setIsHumanConfirmed(true);
    // Mark human verified in session
    sessionStorage.setItem('luanda_prive_human_verified', 'true');
    localStorage.setItem('sandra_vip_age_verified', 'true');
    onEnterPlatform();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between antialiased selection:bg-[#0099ff]/30">
      {/* Top Compliant Header */}
      <header className="w-full border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <LuandaPriveLogo size="md" variant="full" />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verificado Oficial</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Bridge Content */}
      <main className="w-full max-w-xl mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        {step === 1 ? (
          /* STEP 1: 100% Compliant Lifestyle Agency Presell (Facebook Bot Safe) */
          <div className="space-y-6 text-center animate-fadeIn">
            {/* Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/15 text-slate-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#0099ff]" />
              <span>Portal Editorial & Comunidade VIP · Luanda</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
              O Portal Privado das Maiores{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00c6ff] to-[#0072ff]">
                Criadoras Digitais
              </span>{' '}
              de Angola
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto">
              Acesso exclusivo a ensaios privados, bastidores em alta definição, chat directo e actualizações diárias das personalidades mais requisitadas de Luanda.
            </p>

            {/* Visual Teaser Cards (Fashion & Agency Presentation) */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-[#0099ff]/20 flex items-center justify-center text-[#0099ff]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-white">100% Exclusivo</span>
                <span className="text-[9px] text-slate-400">Conteúdo sem censura</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-white">100% Discreto</span>
                <span className="text-[9px] text-slate-400">Sem registo em banco</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Heart className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-white">Multicaixa AO</span>
                <span className="text-[9px] text-slate-400">Express e Referência</span>
              </div>
            </div>

            {/* Primary Action Button (1st CLICK) */}
            <div className="pt-4 space-y-3">
              <button
                type="button"
                onClick={handleFirstClick}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#00c6ff] via-[#0099ff] to-[#0072ff] hover:opacity-95 text-white font-extrabold text-base tracking-wide shadow-xl shadow-[#0099ff]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>Aceder ao Espaço Exclusivo VIP</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-[11px] text-slate-400">
                🔒 Conexão encriptada e anónima · 1 clique para confirmar acesso
              </p>
            </div>
          </div>
        ) : (
          /* STEP 2: 2nd CLICK (Human Verification & Discretion Access) */
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 text-center animate-scaleUp">
            <div className="w-14 h-14 rounded-full bg-[#0099ff]/15 text-[#0099ff] flex items-center justify-center mx-auto border border-[#0099ff]/30">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0099ff]">
                Passo 2 de 2 · Confirmação de Acesso
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                Aceder ao Luanda Privé
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
                Este portal reúne conteúdos autênticos e reservados para maiores de idade. Clica abaixo para entrar diretamente no feed e conhecer as criadoras.
              </p>
            </div>

            <div className="bg-black/40 rounded-2xl p-4 text-left border border-white/5 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Nenhum registo público obrigatório</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Acesso anónimo instantâneo ao feed</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Compatível com telemóvel e computador</span>
              </div>
            </div>

            {/* 2nd CLICK TO ENTER PLATFORM */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleSecondClick}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-[#0099ff] text-white font-extrabold text-base tracking-wide shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>Entrar Agora na Plataforma</span>
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-white transition-colors py-1"
              >
                ← Voltar à página anterior
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 100% Compliant Footer with Terms, Privacy & Disclaimer */}
      <footer className="w-full border-t border-white/10 bg-black/40 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="hover:text-slate-200 cursor-pointer">Termos de Uso</span>
            <span>·</span>
            <span className="hover:text-slate-200 cursor-pointer">Política de Privacidade</span>
            <span>·</span>
            <span className="hover:text-slate-200 cursor-pointer">Protecção de Dados 256-Bit</span>
            <span>·</span>
            <span className="hover:text-slate-200 cursor-pointer">Contacto: apoio@luandaprive.com</span>
          </div>
          <p className="text-[10px] text-slate-600 max-w-md mx-auto">
            © {new Date().getFullYear()} Luanda Privé AO · Todos os direitos reservados. Plataforma de media digital independente em Angola.
          </p>
        </div>
      </footer>
    </div>
  );
};
