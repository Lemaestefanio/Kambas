import { useSiteContent } from '../cms/SiteContent';
import React, { useState } from 'react';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Lock, Gift, CheckCircle2 } from 'lucide-react';
import { Creator, CreatorPost } from '../types';
import { MediaPreview } from './MediaPreview';
import { isMediaPublic } from '../utils/mediaPreview';

interface FeedPostMediaProps {
  post: CreatorPost;
  creatorBanner: string;
  onUnlockClick: () => void;
}

const FeedPostMedia: React.FC<FeedPostMediaProps> = ({ post, creatorBanner, onUnlockClick }) => {
  const { copy } = useSiteContent();
  const publicMedia = isMediaPublic(post);
  return <div><MediaPreview
    kind={post.type === 'video' ? 'video' : 'image'}
    src={post.type === 'video' ? post.video || '' : post.image || creatorBanner}
    poster={post.image || creatorBanner}
    alt={copy('home.feed.mediaAlt')}
    settings={post}
    className="aspect-[4/5] select-none"
  />
    {!publicMedia && <div className="space-y-2 border-t border-slate-100 bg-slate-50 p-3 text-center">
      <button type="button" onClick={onUnlockClick}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#00aff0] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#009ed9]">
        <Lock className="h-4 w-4" /><span>{copy('home.feed.lockedTitle')}</span>
      </button>
      <p className="text-[11px] leading-relaxed text-slate-500">{copy('home.feed.lockedDescription')}</p>
    </div>}
  </div>;
};

interface FeedSectionProps {
  creator: Creator;
  onUnlockClick: () => void;
  onOpenComments?: (postCaption: string, postId?: string) => void;
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
            key={post.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden"
          >
            {/* Post Header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="relative">
                <img
                  src={creator.avatar}
                  loading="lazy" decoding="async" width={40} height={40}
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
              onUnlockClick={onUnlockClick}
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
                  onClick={() => (onOpenComments ? onOpenComments(post.text, post.id) : onUnlockClick())}
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

