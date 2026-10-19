import { useSiteContent } from '../cms/SiteContent';
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Lock, Volume2, VolumeX, Gift, CheckCircle2, Share2 } from 'lucide-react';
import { Creator, CreatorPost } from '../types';
import { getMediaUrl } from '../utils/mediaStorage';

interface FeedPostMediaProps {
  post: CreatorPost;
  creatorBanner: string;
  isMuted: boolean;
  onUnlockClick: () => void;
  onToggleMute: (e: React.MouseEvent) => void;
}

const FeedPostMedia: React.FC<FeedPostMediaProps> = ({
  post,
  creatorBanner,
  isMuted,
  onUnlockClick,
  onToggleMute,
}) => {
  const { copy } = useSiteContent();
  const [resolvedVideo, setResolvedVideo] = useState(post.video || '');
  const [resolvedImage, setResolvedImage] = useState(post.image || creatorBanner);

  useEffect(() => {
    let active = true;
    if (post.video) {
      getMediaUrl(post.video).then((url) => {
        if (active) setResolvedVideo(url);
      });
    }
    if (post.image) {
      getMediaUrl(post.image).then((url) => {
        if (active) setResolvedImage(url);
      });
    } else {
      getMediaUrl(creatorBanner).then((url) => {
        if (active) setResolvedImage(url);
      });
    }
    return () => {
      active = false;
    };
  }, [post.video, post.image, creatorBanner]);

  return (
    <div
      onClick={post.unlocked ? undefined : onUnlockClick}
      className={`relative aspect-[4/5] bg-slate-100 overflow-hidden select-none ${
        post.unlocked ? '' : 'cursor-pointer group'
      }`}
    >
      {post.video ? (
        <video
          src={resolvedVideo || post.video}
          autoPlay={post.unlocked}
          loop
          muted={isMuted}
          playsInline
          draggable={false}
          preload={post.unlocked ? 'metadata' : 'none'}
          className={`w-full h-full object-cover ${post.unlocked ? '' : 'scale-110'}`}
          style={post.unlocked ? undefined : { filter: 'blur(12px) brightness(0.72)' }}
        />
      ) : (
        <img
          src={resolvedImage || post.image || creatorBanner}
          alt={copy('home.feed.mediaAlt')}
          draggable={false}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover ${post.unlocked ? '' : 'scale-110'}`}
          style={post.unlocked ? undefined : { filter: 'blur(12px) brightness(0.72)' }}
        />
      )}

      {/* Locked frosted glass overlay */}
      {!post.unlocked && (
        <>
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center z-10">
            <div className="w-14 h-14 rounded-full bg-white/95 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/40 group-hover:scale-105 transition-transform text-[#00aff0]">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="inline-block text-xs font-bold text-white bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full tracking-wide shadow-md">
                {copy('home.feed.lockedTitle')}
              </span>
              <p className="text-[11px] text-white/80 max-w-[240px]">
                {copy('home.feed.lockedDescription')}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Mute button for unlocked video */}
      {post.unlocked && post.video && (
        <button
          onClick={onToggleMute}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
          aria-label={copy('home.feed.sound')}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};

interface FeedSectionProps {
  creator: Creator;
  onUnlockClick: () => void;
  onOpenComments?: (postCaption: string) => void;
  onOpenTip?: () => void;
}

export const FeedSection: React.FC<FeedSectionProps> = ({
  creator,
  onUnlockClick,
  onOpenComments,
  onOpenTip,
}) => {
  const { copy } = useSiteContent();
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<number, number>>(
    creator.posts.reduce((acc, p, idx) => ({ ...acc, [idx]: p.likes }), {})
  );
  const [bookmarked, setBookmarked] = useState<Record<number, boolean>>({});
  const [isMuted, setIsMuted] = useState(true);

  const toggleLike = (index: number) => {
    setLikedPosts((prev) => {
      const isLiked = !prev[index];
      setLikesCount((prevCounts) => ({
        ...prevCounts,
        [index]: (prevCounts[index] || 0) + (isLiked ? 1 : -1),
      }));
      return { ...prev, [index]: isLiked };
    });
  };

  const toggleBookmark = (index: number) => {
    setBookmarked((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="px-3 sm:px-4 py-3 space-y-3.5">
      {creator.posts.map((post, idx) => {
        const isLiked = !!likedPosts[idx];
        const isSaved = !!bookmarked[idx];
        const currentLikes = likesCount[idx] !== undefined ? likesCount[idx] : post.likes;

        return (
          <article
            key={idx}
            className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden"
          >
            {/* Post Header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="relative">
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00aff0]/20"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {creator.name}
                  </p>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white fill-[#00aff0] shrink-0" />
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {creator.handle} · {post.time}
                </p>
              </div>

              <button
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                aria-label={copy('home.feed.options')}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>

            {/* Post Caption */}
            <p className="px-4 pb-3 text-xs sm:text-[13px] text-slate-800 leading-relaxed">
              {post.text}
            </p>

            {/* Media Box */}
            <FeedPostMedia
              post={post}
              creatorBanner={creator.banner}
              isMuted={isMuted}
              onUnlockClick={onUnlockClick}
              onToggleMute={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
            />

            {/* Post Actions Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100">
              <div className="flex items-center gap-4">
                {/* Like Button */}
                <button
                  onClick={() => toggleLike(idx)}
                  className={`flex items-center gap-1.5 transition-colors ${
                    isLiked ? 'text-rose-500 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-label={copy('home.feed.like')}
                >
                  <Heart className={`h-[18px] w-[18px] ${isLiked ? 'fill-rose-500' : ''}`} />
                  <span className="text-xs font-mono">{currentLikes}</span>
                </button>

                {/* Comment Button */}
                <button
                  onClick={() => (onOpenComments ? onOpenComments(post.text) : onUnlockClick())}
                  className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
                  aria-label={copy('home.feed.comments')}
                >
                  <MessageCircle className="h-[18px] w-[18px]" />
                  <span className="text-xs font-mono">{post.comments}</span>
                </button>

                {/* Tip / Mimo Button */}
                {onOpenTip && (
                  <button
                    onClick={onOpenTip}
                    className="flex items-center gap-1 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors"
                    title={copy('home.feed.tipTitle')}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>{copy('home.feed.tip')}</span>
                  </button>
                )}
              </div>

              {/* Save / Bookmark Button */}
              <button
                onClick={() => toggleBookmark(idx)}
                className={`transition-colors p-1 ${
                  isSaved ? 'text-[#00aff0]' : 'text-slate-400 hover:text-slate-700'
                }`}
                aria-label={copy('home.feed.save')}
              >
                <Bookmark className={`h-[18px] w-[18px] ${isSaved ? 'fill-[#00aff0]' : ''}`} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
};
