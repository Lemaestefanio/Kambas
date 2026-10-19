import { useSiteContent } from '../cms/SiteContent';
import React from 'react';
import { Home, Compass, MessageCircle, Lock, User } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { AppUser } from '../types';

interface BottomNavOnlyFansProps {
  onHomeClick: () => void;
  onExploreClick: () => void;
  onChatClick: () => void;
  onNotificationsClick: () => void;
  onUnlockClick: () => void;
  user?: AppUser | FirebaseUser | null;
  onOpenAuth?: () => void;
}

export const BottomNavOnlyFans: React.FC<BottomNavOnlyFansProps> = ({
  onHomeClick,
  onExploreClick,
  onChatClick,
  onNotificationsClick,
  onUnlockClick,
  user,
  onOpenAuth,
}) => {
  const { copy } = useSiteContent();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-2 safe-bottom shadow-lg">
      <div className="max-w-[600px] mx-auto flex items-center justify-around">
        <button
          onClick={onHomeClick}
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-[#00aff0] transition-colors p-1"
          aria-label={copy('home.navigation.home')}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{copy('home.navigation.home')}</span>
        </button>

        <button
          onClick={onExploreClick}
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-[#00aff0] transition-colors p-1"
          aria-label={copy('home.navigation.exploreTitle')}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{copy('home.navigation.explore')}</span>
        </button>

        <button
          onClick={onChatClick}
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-[#00aff0] transition-colors p-1 relative"
          aria-label={copy('home.navigation.chatTitle')}
        >
          <MessageCircle className="w-5 h-5 text-[#00aff0]" />
          <span className="text-[10px] font-semibold text-[#00aff0]">{copy('home.navigation.chat')}</span>
          <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#00aff0]" />
        </button>

        <button
          onClick={onNotificationsClick}
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-[#00aff0] transition-colors p-1"
          aria-label={copy('home.navigation.newsTitle')}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{copy('home.navigation.neighborhoods')}</span>
        </button>

        {/* Member Account / Login button */}
        <button
          onClick={onOpenAuth || onUnlockClick}
          className="flex flex-col items-center gap-1 transition-colors p-1"
          aria-label={user ? copy('home.navigation.memberArea') : copy('home.navigation.createAccount')}
        >
          {user ? (
            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || copy('home.navigation.user')}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-[#00aff0]" />
            </div>
          )}
          <span className={`text-[10px] font-bold ${user ? 'text-emerald-600' : 'text-slate-800'}`}>
            {user ? copy('home.navigation.member') : copy('home.navigation.signIn')}
          </span>
        </button>

        <button
          onClick={onUnlockClick}
          className="flex flex-col items-center gap-1 text-rose-600 hover:text-rose-700 transition-colors p-1"
          aria-label={copy('home.navigation.unlock')}
        >
          <div className="w-6 h-6 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <span className="text-[10px] font-bold text-rose-600">{copy('home.navigation.plans')}</span>
        </button>
      </div>
    </div>
  );
};
