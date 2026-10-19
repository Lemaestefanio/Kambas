import { useSiteContent } from '../cms/SiteContent';
import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

interface AgeVerificationModalProps {
  onVerified: () => void;
}

export const AgeVerificationModal: React.FC<AgeVerificationModalProps> = ({ onVerified }) => {
  const { copy } = useSiteContent();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('sandra_vip_age_verified');
    if (!verified) {
      setIsOpen(true);
    } else {
      onVerified();
    }
  }, [onVerified]);

  const handleConfirm = () => {
    localStorage.setItem('sandra_vip_age_verified', 'true');
    setIsOpen(false);
    onVerified();
  };

  const handleExit = () => {
    window.location.replace('https://google.com');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200/50">
        <div className="w-16 h-16 rounded-full bg-[#00aff0]/10 flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="h-8 w-8 text-[#00aff0]" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">{copy("overlay.age-verification-modal.001")}</h2>

        <p className="text-sm text-slate-600 mb-1">{copy("overlay.age-verification-modal.002")}</p>

        <p className="text-xs text-slate-400 mb-6">{copy("overlay.age-verification-modal.003")}</p>

        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-full bg-[#00aff0] hover:bg-[#009ed9] text-white font-bold text-sm tracking-wide transition-colors shadow-lg shadow-[#00aff0]/25 active:scale-[0.98]"
          >{copy("overlay.age-verification-modal.004")}</button>

          <button
            onClick={handleExit}
            className="w-full py-3 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-xs transition-colors"
          >{copy("overlay.age-verification-modal.005")}</button>
        </div>
      </div>
    </div>
  );
};
