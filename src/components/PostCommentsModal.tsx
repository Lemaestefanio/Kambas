import { useSiteContent } from '../cms/SiteContent';
import React, { useState } from 'react';
import { X, Send, Heart, CheckCircle2 } from 'lucide-react';
import { Creator } from '../types';

interface Comment {
  id: string;
  author: string;
  handle: string;
  isCreator?: boolean;
  isVip?: boolean;
  text: string;
  time: string;
  likes: number;
  isLiked?: boolean;
}

interface PostCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: Creator;
  postCaption: string;
}

export const PostCommentsModal: React.FC<PostCommentsModalProps> = ({
  isOpen,
  onClose,
  creator,
  postCaption,
}) => {
  const { copy } = useSiteContent();

  const initialComments: Comment[] = [
    {
      id: 'c1',
      author: copy("overlay.post-comments-modal.007"),
      handle: copy("overlay.post-comments-modal.008"),
      isVip: true,
      text: copy("overlay.post-comments-modal.024", { name: creator.shortName }),
      time: copy("overlay.post-comments-modal.009"),
      likes: 18,
    },
    {
      id: 'c2',
      author: creator.name,
      handle: creator.handle,
      isCreator: true,
      isVip: true,
      text: copy("overlay.post-comments-modal.010"),
      time: copy("overlay.post-comments-modal.011"),
      likes: 38,
      isLiked: true,
    },
    {
      id: 'c3',
      author: copy("overlay.post-comments-modal.012"),
      handle: copy("overlay.post-comments-modal.013"),
      isVip: true,
      text: copy("overlay.post-comments-modal.025", { name: creator.shortName }),
      time: copy("overlay.post-comments-modal.014"),
      likes: 14,
    },
    {
      id: 'c4',
      author: creator.name,
      handle: creator.handle,
      isCreator: true,
      isVip: true,
      text: copy("overlay.post-comments-modal.015"),
      time: copy("overlay.post-comments-modal.016"),
      likes: 29,
      isLiked: true,
    },
    {
      id: 'c5',
      author: copy("overlay.post-comments-modal.017"),
      handle: copy("overlay.post-comments-modal.018"),
      isVip: true,
      text: copy("overlay.post-comments-modal.019"),
      time: copy("overlay.post-comments-modal.020"),
      likes: 22,
    },
  ];
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const displayedComments = comments.map((entry) => {
    const original = initialComments.find((item) => item.id === entry.id);
    return original ? { ...entry, ...original, likes: entry.likes, isLiked: entry.isLiked } : entry;
  });

  const [newComment, setNewComment] = useState('');

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const added: Comment = {
      id: `c-${Date.now()}`,
      author: copy("overlay.post-comments-modal.021"),
      handle: copy("overlay.post-comments-modal.022"),
      isVip: true,
      text: newComment.trim(),
      time: copy("overlay.post-comments-modal.023"),
      likes: 1,
      isLiked: true,
    };

    setComments((prev) => [added, ...prev]);
    setNewComment('');
  };

  const handleToggleLike = (id: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextLiked = !c.isLiked;
          return {
            ...c,
            isLiked: nextLiked,
            likes: c.likes + (nextLiked ? 1 : -1),
          };
        }
        return c;
      })
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10005] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{copy("overlay.post-comments-modal.001")}</h3>
            <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
              {postCaption}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Discreet Notice */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200/50 text-[11px] text-slate-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span>{copy("overlay.post-comments-modal.002")}</span>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayedComments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3 text-left">
              {/* Creator has verified photo, fans are anonymous without photo */}
              {comment.isCreator ? (
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-[#00aff0]/40"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0 border border-slate-700 shadow-2xs"
                  title={copy("overlay.post-comments-modal.005")}
                >{copy("overlay.post-comments-modal.003")}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      {comment.author}
                    </span>
                    {comment.isCreator && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white fill-[#00aff0] shrink-0" />
                    )}
                    {comment.isVip && !comment.isCreator && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">{copy("overlay.post-comments-modal.004")}</span>
                    )}
                    <span className="text-[10px] text-slate-400">· {comment.time}</span>
                  </div>
                  <button
                    onClick={() => handleToggleLike(comment.id)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        comment.isLiked ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                    <span>{comment.likes}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {comment.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* New Comment Input */}
        <form onSubmit={handleAddComment} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
          <input
            type="text"
            placeholder={copy("overlay.post-comments-modal.006")}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00aff0]"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="w-9 h-9 rounded-full bg-[#00aff0] hover:bg-[#009ed9] disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
