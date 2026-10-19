import React, { useState } from 'react';
import { Search, Bell, Users, CheckCircle2, X, Share2, Sparkles, MapPin, User, LogOut, Crown } from 'lucide-react';
import { Creator, AppUser } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface OnlyFansHeaderProps {
  currentCreator: Creator;
  allCreators: Creator[];
  onSelectCreator: (creator: Creator) => void;
  onOpenDirectory: () => void;
  user?: AppUser | FirebaseUser | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const OnlyFansHeader: React.FC<OnlyFansHeaderProps> = ({
  currentCreator,
  allCreators,
  onSelectCreator,
  onOpenDirectory,
  user,
  onOpenAuth,
  onSignOut,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfilesDrawerOpen, setIsProfilesDrawerOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  const filteredCreators = allCreators.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.neighborhood.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${currentCreator.name} - Luanda Privé`,
        text: `Acede ao perfil oficial de ${currentCreator.shortName} na Luanda Privé!`,
        url: window.location.href,
      }).catch(() => {
        // Fallback
      });
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2600);
    }
  };

  return (
    <>
      {/* Top Brand Banner: Luanda Privé Official Logo */}
      <div className="bg-[#090d14] text-white px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800/90 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#00aff0] to-[#0070ba] flex items-center justify-center text-white shadow-md shadow-[#00aff0]/25 font-black text-xs tracking-tighter">
            LP
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm tracking-tight text-white">
              LUANDA <span className="text-[#00aff0]">PRIVÉ</span>
            </span>
            <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#00aff0] bg-[#00aff0]/15 px-1.5 py-0.5 rounded border border-[#00aff0]/30 flex items-center gap-0.5">
              <Crown className="w-2.5 h-2.5" />
              <span>VIP</span>
            </span>
          </div>
        </div>

        {/* User Account / Login Button */}
        {user ? (
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 pl-1.5 pr-2.5 py-1 rounded-full text-white text-xs">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Utilizador'}
                className="w-5 h-5 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#00aff0] text-white flex items-center justify-center text-[10px] font-bold">
                {(user.displayName || 'U')[0].toUpperCase()}
              </div>
            )}
            <span className="font-bold text-slate-200 max-w-[85px] sm:max-w-[120px] truncate text-xs">
              {user.displayName?.split(' ')[0] || 'Membro'}
            </span>
            <button
              onClick={onSignOut}
              title="Terminar sessão"
              className="text-slate-400 hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#00aff0] to-[#0090d0] hover:brightness-110 text-white transition-all text-xs font-bold shadow-sm active:scale-95 cursor-pointer"
            title="Entrar na área VIP"
          >
            <User className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
        )}
      </div>

      {/* Sticky Creator Navigation Sub-Header */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 py-2 flex items-center justify-between sticky top-0 z-40 transition-shadow duration-200">
        {/* Left: Brand mark & Creator Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Loanda Privé Icon Button that opens creator directory */}
          <button
            onClick={onOpenDirectory}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 text-[#00aff0] hover:scale-105 transition-all shrink-0 shadow-xs"
            title="Loanda Privé - Explorar todas as criadoras"
          >
            <span className="font-extrabold text-[12px] tracking-tighter text-white">
              LP<span className="text-[#00aff0]">.</span>
            </span>
          </button>

          {/* Current Creator Identity */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[13px] sm:text-sm font-bold text-slate-900 truncate tracking-tight">
                {currentCreator.shortName}
              </span>
              <CheckCircle2 className="h-3.5 w-3.5 text-white fill-[#00aff0] shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <span>{currentCreator.stats.photos} fotos</span>
              <span>·</span>
              <span>{currentCreator.stats.videos} vídeos</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline text-emerald-600 font-semibold">Online</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Quick Profile Switcher Trigger */}
          <button
            onClick={() => setIsProfilesDrawerOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs font-semibold"
            title="Trocar de criadora"
          >
            <Users className="w-3.5 h-3.5 text-[#00aff0]" />
            <span className="hidden sm:inline">Perfis</span>
            <span className="w-4 h-4 rounded-full bg-[#00aff0] text-white text-[9px] font-bold flex items-center justify-center">
              {allCreators.length}
            </span>
          </button>

          {/* Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Pesquisar criadoras"
          >
            <Search className="h-[17px] w-[17px]" />
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Partilhar perfil"
          >
            <Share2 className="h-[17px] w-[17px]" />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
            aria-label="Notificações"
          >
            <Bell className="h-[17px] w-[17px]" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#00aff0] ring-2 ring-white" />
          </button>
        </div>
      </header>

      {/* Share Toast Feedback */}
      {showShareToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl border border-white/10 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#00aff0]" />
          <span>Link do perfil copiado com sucesso!</span>
        </div>
      )}

      {/* Quick Profiles Drawer */}
      {isProfilesDrawerOpen && (
        <div
          onClick={() => setIsProfilesDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 pt-12 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[85vh] flex flex-col"
          >
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00aff0]" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Criadoras Disponíveis em Luanda ({allCreators.length})
                </h3>
              </div>
              <button
                onClick={() => setIsProfilesDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 space-y-1.5 overflow-y-auto">
              {allCreators.map((c) => {
                const isCurrent = c.id === currentCreator.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCreator(c);
                      setIsProfilesDrawerOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all text-left ${
                      isCurrent
                        ? 'bg-[#00aff0]/10 border border-[#00aff0]/40'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {c.name}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white fill-[#00aff0] shrink-0" />
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span>{c.neighborhood}</span>
                        <span>·</span>
                        <span>{c.age} anos</span>
                        <span>·</span>
                        <span className="text-slate-400">{c.stats.photos} fotos</span>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="text-[10px] font-bold text-[#00aff0] bg-white px-2 py-0.5 rounded-full border border-[#00aff0]/30 shadow-xs">
                        Ativa
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-[#00aff0] hover:text-white px-2.5 py-1 rounded-full transition-colors">
                        Ver
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
              <button
                onClick={() => {
                  setIsProfilesDrawerOpen(false);
                  onOpenDirectory();
                }}
                className="text-xs font-bold text-[#00aff0] hover:underline"
              >
                Abrir directório completo com filtros de bairros →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Drawer */}
      {isSearchOpen && (
        <div
          onClick={() => setIsSearchOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center p-3 pt-12 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="p-3 border-b border-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
              <input
                type="text"
                placeholder="Pesquisar criadora por nome ou bairro (ex: Maianga, Talatona)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
              {filteredCreators.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">
                  Nenhuma criadora encontrada para "{searchQuery}"
                </p>
              ) : (
                filteredCreators.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCreator(c);
                      setIsSearchOpen(false);
                    }}
                    className="w-full p-2.5 flex items-center gap-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00aff0]/30"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {c.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {c.handle} · {c.city}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-[#00aff0] bg-[#00aff0]/10 px-2 py-0.5 rounded-full">
                      Ver Perfil
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Drawer */}
      {isNotificationsOpen && (
        <div
          onClick={() => setIsNotificationsOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center p-3 pt-12 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-900">Notificações Recentes</span>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 space-y-1">
              {allCreators.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCreator(c);
                    setIsNotificationsOpen(false);
                  }}
                  className="p-2.5 flex items-center gap-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="text-slate-800 leading-snug">
                      <span className="font-bold">{c.shortName}</span> publicou uma nova fotografia exclusiva no feed VIP!
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">há {i * 12 + 6} min</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
