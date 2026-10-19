import React, { useEffect, useRef, useState } from 'react';
import { rememberAgeConsent } from '../utils/ageConsent';

interface AgeVerificationModalProps {
  onVerified: () => void;
}

/** The same entry screen is shown on every route, regardless of visitor identity. */
export const AgeVerificationModal: React.FC<AgeVerificationModalProps> = ({ onVerified }) => {
  const [declined, setDeclined] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [declined]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    if (!buttons?.length) {
      event.preventDefault();
      headingRef.current?.focus();
      return;
    }
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleConfirm = () => {
    rememberAgeConsent();
    onVerified();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-start justify-center overflow-y-auto bg-slate-950 p-5 text-white">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        aria-describedby="age-gate-description"
        onKeyDown={handleKeyDown}
        className="my-auto w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-7 text-center shadow-2xl sm:p-8"
      >
        <div className="mx-auto mb-6 flex h-28 items-center justify-center">
          <img src="/assets/platform-logo.png" alt="Luanda Privé" width="280" height="112" className="h-full w-full object-contain" fetchPriority="high" decoding="async" />
        </div>
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-lg font-bold text-cyan-200" aria-hidden="true">18+</div>
        <h1 ref={headingRef} id="age-gate-title" tabIndex={-1} className="mb-3 text-xl font-bold outline-none">
          {declined ? 'Acesso reservado a adultos' : 'Tens 18 anos ou mais?'}
        </h1>
        <p id="age-gate-description" className="text-sm leading-relaxed text-slate-300">
          {declined
            ? 'Esta plataforma não está disponível para menores de 18 anos. Podes fechar esta página.'
            : 'Esta plataforma contém conteúdo destinado exclusivamente a maiores de 18 anos. Confirma a tua idade para continuar.'}
        </p>
        {!declined && (
          <div className="mt-7 space-y-3">
            <button type="button" onClick={handleConfirm} className="w-full rounded-full bg-cyan-400 px-4 py-3.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">
              Sim, tenho 18 anos ou mais
            </button>
            <button type="button" onClick={() => setDeclined(true)} className="w-full rounded-full border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-300">
              Não, tenho menos de 18 anos
            </button>
            <p className="pt-2 text-xs leading-relaxed text-slate-400">A tua confirmação é guardada apenas durante esta sessão.</p>
          </div>
        )}
      </div>
    </div>
  );
};

