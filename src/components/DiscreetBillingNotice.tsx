import React from 'react';
import { ShieldCheck, EyeOff, Lock, Smartphone } from 'lucide-react';

export const DiscreetBillingNotice: React.FC = () => {
  return (
    <div className="mx-4 my-4 p-4 rounded-xl bg-slate-900 text-white shadow-md space-y-2.5 border border-slate-800">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <h4 className="text-xs sm:text-sm font-bold tracking-tight">
          Garantia de Sigilo Absoluto em Angola 🇦🇴
        </h4>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        O teu anonimato é 100% protegido. No extrato do teu banco ou no aplicativo Multicaixa Express a transação surge de forma neutra como:
      </p>

      <div className="bg-black/50 p-2.5 rounded-lg border border-white/10 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400">Descrição no Extrato:</span>
        <span className="text-emerald-400 font-bold">SDM SERVICOS DIGITAIS</span>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
          <span>Sem nomes de criadoras</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ativação em 30 segundos</span>
        </div>
      </div>
    </div>
  );
};
