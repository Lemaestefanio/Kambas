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
  if (!isOpen) return null;

  const [comments, setComments] = useState<Comment[]>([
    {
      id: 'c1',
      author: 'Membro VIP Luanda',
      handle: '@membro_vip',
      isVip: true,
      text: `Olha ${creator.shortName} acabei de pagar o VIP agora pelo Express! Quero marcar uma chamada de vídeo contigo hoje 🔥🇦🇴`,
      time: 'há 6 min',
      likes: 18,
    },
    {
      id: 'c2',
      author: creator.name,
      handle: creator.handle,
      isCreator: true,
      isVip: true,
      text: 'Acabei de confirmar aqui amor! Já te mandei mensagem no WhatsApp, atende lá que já estou online na chamada 💋',
      time: 'há 4 min',
      likes: 38,
      isLiked: true,
    },
    {
      id: 'c3',
      author: 'Fã Secreto Maianga',
      handle: '@fa_maianga',
      isVip: true,
      text: `Deixei uma mensagem no privado ${creator.shortName}, confirma lá o comprovativo do plano de 3 meses pfvr`,
      time: 'há 18 min',
      likes: 14,
    },
    {
      id: 'c4',
      author: creator.name,
      handle: creator.handle,
      isCreator: true,
      isVip: true,
      text: 'Confirmadíssimo gato! Acesso liberado no Telegram e no feed sem censura 😈🔥',
      time: 'há 15 min',
      likes: 29,
      isLiked: true,
    },
    {
      id: 'c5',
      author: 'Kota VIP Talatona',
      handle: '@talatona_vip',
      isVip: true,
      text: 'Mano o VIP vale bué a pena, a chamada de ontem à noite foi surreal... 🔥🤤',
      time: 'há 35 min',
      likes: 22,
    },
  ]);

  const [newComment, setNewComment] = useState('');

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const added: Comment = {
      id: `c-${Date.now()}`,
      author: 'Você (Anónimo)',
      handle: '@assinante_anonimo',
      isVip: true,
      text: newComment.trim(),
      time: 'agora mesmo',
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

  return (
    <div className="fixed inset-0 z-[10005] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Comentários da Publicação</h3>
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
          <span>100% Confidencial: a tua foto de perfil nunca é exibida nos comentários.</span>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.map((comment) => (
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
                  title="Confidencial · Sem foto"
                >
                  VIP
                </div>
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
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                        VIP
                      </span>
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
            placeholder="Escreve um comentário..."
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
