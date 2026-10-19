import React, { useState } from 'react';
import { X, ShieldCheck, Sparkles, CheckCircle2, ArrowRight, User, EyeOff } from 'lucide-react';
import { signInWithGoogle, signInAnonymouslyWithNickname } from '../firebase';
import { AppUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AppUser) => void;
  creatorName?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  creatorName = 'Criadoras VIP',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'choice' | 'anonymous'>('choice');
  const [nickname, setNickname] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await signInWithGoogle();
      if (user) {
        const appUser: AppUser = {
          uid: user.uid,
          displayName: user.displayName || 'Membro VIP',
          photoURL: user.photoURL || undefined,
          email: user.email || undefined,
          isAnonymous: false,
        };
        sessionStorage.setItem('luanda_prive_user', JSON.stringify(appUser));
        onSuccess(appUser);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível ligar à conta Google. Podes entrar como anónimo abaixo.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nickname.trim() || 'Fã VIP';

    try {
      setLoading(true);
      setError(null);

      // Try firebase anonymous auth if possible
      let uid = `anon-${Date.now()}`;
      try {
        const fbUser = await signInAnonymouslyWithNickname(clean);
        if (fbUser) uid = fbUser.uid;
      } catch (fbErr) {
        console.warn('Anonymous firebase fallback to session:', fbErr);
      }

      const anonUser: AppUser = {
        uid,
        displayName: clean,
        isAnonymous: true,
      };

      // Stored in browser session - when session resets, it clears
      sessionStorage.setItem('luanda_prive_user', JSON.stringify(anonUser));
      onSuccess(anonUser);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Erro ao entrar. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col relative animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Banner */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-[#00aff0]/80 p-6 text-white text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#00aff0] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Luanda Privé · Área de Membros</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
            {view === 'choice' ? 'Como preferes entrar?' : 'Entrar como Anónimo'}
          </h2>
          <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
            {view === 'choice'
              ? 'Queres criar conta com Conta Google ou queres entrar como anónimo?'
              : 'Coloca só um nome ou pseudónimo para te identificares. Pode ser um nome falso.'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-center">
              {error}
            </div>
          )}

          {view === 'choice' ? (
            <div className="space-y-3">
              {/* Option 1: Google Account */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#00aff0] text-slate-800 hover:text-[#00aff0] font-bold text-sm shadow-sm hover:shadow transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'A ligar...' : 'Entrar com Conta Google'}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  ou 100% anónimo
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Option 2: Anonymous Mode */}
              <button
                type="button"
                onClick={() => setView('anonymous')}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <EyeOff className="w-4 h-4 text-[#00aff0]" />
                <span>Entrar como Anónimo (Sem Email)</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAnonymousSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Como queres ser chamado? (Pode ser nome falso)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Edson, FãVIP_Luanda, Anónimo..."
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={25}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#00aff0] focus:ring-1 focus:ring-[#00aff0] text-sm font-medium"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Fica gravado apenas na sessão atual do navegador para te sentires dentro da plataforma.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00aff0] to-[#009ed9] hover:from-[#009ed9] hover:to-[#008cc0] text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? 'A entrar...' : 'Entrar Agora na Plataforma'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setView('choice')}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
              >
                ← Voltar às opções
              </button>
            </form>
          )}

          {/* Privacy Note */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% Discreto · Pagamentos sem registo de nome no extrato</span>
          </div>
        </div>
      </div>
    </div>
  );
};
