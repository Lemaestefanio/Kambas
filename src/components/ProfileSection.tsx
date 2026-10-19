import { useSiteContent } from '../cms/SiteContent';
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Star, MessageCircle, Share2, MapPin, Sparkles } from 'lucide-react';
import { Creator } from '../types';
import { StoryHighlightsBar } from './StoryHighlightsBar';
import { getMediaUrl } from '../utils/mediaStorage';

interface ProfileSectionProps {
  creator: Creator;
  onOpenStory: (index: number) => void;
  onOpenChat: () => void;
  onSelectTab: (tab: 'posts' | 'photos' | 'videos' | 'audio') => void;
  onShare?: () => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  creator,
  onOpenStory,
  onOpenChat,
  onSelectTab,
  onShare,
}) => {
  const { copy } = useSiteContent();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShareNotification, setShowShareNotification] = useState(false);
  const [resolvedBanner, setResolvedBanner] = useState(creator.banner);
  const [resolvedBannerVideo, setResolvedBannerVideo] = useState(creator.bannerVideo || '');
  const [resolvedAvatar, setResolvedAvatar] = useState(creator.avatar);

  useEffect(() => {
    let active = true;
    getMediaUrl(creator.banner).then((u) => active && setResolvedBanner(u));
    if (creator.bannerVideo) {
      getMediaUrl(creator.bannerVideo).then((u) => active && setResolvedBannerVideo(u));
    } else {
      setResolvedBannerVideo('');
    }
    getMediaUrl(creator.avatar).then((u) => active && setResolvedAvatar(u));
    return () => {
      active = false;
    };
  }, [creator.banner, creator.bannerVideo, creator.avatar]);

  const handleShareClick = () => {
    if (onShare) {
      onShare();
      return;
    }
    if (navigator.share) {
      navigator.share({
        title: copy('home.profile.shareTitle', { name: creator.name }),
        text: copy('home.profile.shareText', { name: creator.shortName }),
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setShowShareNotification(true);
      setTimeout(() => setShowShareNotification(false), 2400);
    }
  };

  const isVideoCover =
    Boolean(resolvedBannerVideo) ||
    resolvedBanner.includes('.mp4') ||
    resolvedBanner.includes('video/');

  return (
    <section className="bg-white border-b border-slate-200/80">
      {/* Cover Banner (Supports Photo or Looping Video Cover) */}
      <div className="relative h-[190px] sm:h-[220px] w-full overflow-hidden bg-slate-200">
        {isVideoCover ? (
          <video
            src={resolvedBannerVideo || resolvedBanner}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        ) : (
          <img
            src={resolvedBanner}
            alt={copy('home.profile.cover', { name: creator.name })}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
      </div>

      {/* Profile Details Container */}
      <div className="px-4 pb-4 relative">
        {/* Top Row: Avatar on Left, Action Buttons on Right */}
        <div className="flex items-end justify-between -mt-12 mb-3">
          {/* Avatar with Ring & Online Status */}
          <div className="relative group">
            <div className="w-[96px] h-[96px] rounded-full border-[4px] border-white overflow-hidden bg-white shadow-lg relative">
              <img
                src={resolvedAvatar}
                alt={creator.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
              />
            </div>
            {/* Green Online Dot */}
            {creator.isOnline && (
              <span
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-[2.5px] border-white shadow-xs"
                title={copy('home.profile.online')}
              />
            )}
          </div>

          {/* Quick Actions (Mensagem Privada, Favorito, Partilhar) */}
          <div className="flex items-center gap-2 pb-1">
            <button
              onClick={onOpenChat}
              className="h-9 px-3.5 rounded-full bg-[#00aff0] hover:bg-[#009ed9] text-white flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm active:scale-95"
              title={copy('home.profile.chat')}
            >
              <MessageCircle className="h-4 w-4" />
              <span>{copy('home.profile.message')}</span>
            </button>

            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all shadow-xs ${
                isFavorite
                  ? 'bg-amber-50 text-amber-500 border-amber-300 ring-1 ring-amber-300'
                  : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              aria-label={copy('home.profile.favorite')}
              title={isFavorite ? copy('home.profile.favorited') : copy('home.profile.favorite')}
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            <button
              onClick={handleShareClick}
              className="w-9 h-9 rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-xs"
              aria-label={copy('home.profile.share')}
              title={copy('home.profile.share')}
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Feedback toast when copying link */}
        {showShareNotification && (
          <div className="mb-2 p-2 rounded-lg bg-slate-900 text-white text-xs font-medium text-center animate-fade-in">
            {copy('home.profile.copied')}
          </div>
        )}

        {/* Name and Verified Badge */}
        <div className="flex items-center gap-1.5">
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
            {creator.name}
          </h1>
          <CheckCircle2 className="h-5 w-5 text-white fill-[#00aff0] shrink-0" />
        </div>

        {/* Handle and Location */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 mb-3 flex-wrap">
          <span className="font-semibold text-slate-700">{creator.handle}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <MapPin className="w-3 h-3 text-slate-400" />
            {creator.city}
          </span>
          <span>·</span>
          <span className="text-emerald-600 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {copy('home.profile.available')}
          </span>
        </div>

        {/* Organized 4-Column Stats Bar */}
        <div className="grid grid-cols-4 divide-x divide-slate-100 bg-slate-50/80 rounded-xl border border-slate-200/80 p-2.5 mb-3">
          <button
            onClick={() => onSelectTab('posts')}
            className="flex flex-col items-center hover:opacity-80 transition-opacity"
          >
            <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
              {creator.postCount}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              {copy('home.profile.posts')}
            </span>
          </button>

          <button
            onClick={() => onSelectTab('photos')}
            className="flex flex-col items-center hover:opacity-80 transition-opacity"
          >
            <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
              {creator.stats.photos}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              {copy('home.profile.photos')}
            </span>
          </button>

          <button
            onClick={() => onSelectTab('videos')}
            className="flex flex-col items-center hover:opacity-80 transition-opacity"
          >
            <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
              {creator.stats.videos}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              {copy('home.profile.videos')}
            </span>
          </button>

          <div className="flex flex-col items-center">
            <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
              {creator.stats.likes}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              {copy('home.profile.likes')}
            </span>
          </div>
        </div>

        {/* Bio Text */}
        <div className="text-xs sm:text-sm text-slate-800 leading-relaxed space-y-1 mb-3">
          <p>
            {isExpanded ? creator.bio : `${creator.bio.slice(0, 160)}`}
            {!isExpanded && creator.bio.length > 160 && (
              <span className="text-slate-400">...</span>
            )}
          </p>

          {creator.bio.length > 160 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#00aff0] text-xs font-bold hover:underline inline-block pt-0.5"
            >
              {isExpanded ? copy('home.profile.less') : copy('home.profile.more')}
            </button>
          )}
        </div>

        {/* Story Highlights Bar */}
        <div className="pt-1">
          <StoryHighlightsBar creator={creator} onOpenStory={onOpenStory} />
        </div>
      </div>
    </section>
  );
};
