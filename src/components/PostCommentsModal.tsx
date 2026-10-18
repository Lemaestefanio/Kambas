import React, { useState } from 'react';
import { X, Send, Heart, CheckCircle2 } from 'lucide-react';
import { Creator } from '../types';

interface Comment {
  id: string;
  author: string;
  handle: string;
  avatar: string;
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
      author: 'Mauro Sebastião',
      handle: '@mauro_seb',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      text: 'Sandra você é uma tentação de mulher! Já renovei o meu acesso VIP pelo Multicaixa Express 🔥',
      time: 'há 18 min',
      likes: 14,
    },
    {
      id: 'c2',
      author: 'Edvaldo Banza',
      handle: '@edvaldo_luanda',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      text: 'A chamada de vídeo de ontem no WhatsApp foi surreal... valeu cada Kwanza 😍👏',
      time: 'há 42 min',
      likes: 29,
    },
    {
      id: 'c3',
      author: 'Carlos Alberto',
      handle: '@carlos_talatona',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
      text: 'Linda demais! Quando é que vais publicar o próximo vídeo?',
      time: 'há 1h',
      likes: 8,
    },
    {
      id: 'c4',
      author: 'Gelson Mendes',
      handle: '@gelson_m',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80',
      text: 'Melhor criadora de Luanda sem dúvidas! Discreta e atenciosa no chat privado 🇦🇴✨',
      time: 'há 2h',
      likes: 19,
    },
  ]);

  const [newComment, setNewComment] = useState('');

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const added: Comment = {
      id: `c-${Date.now()}`,
      author: 'Você (Assinante)',
      handle: '@voce_vip',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
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

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3 text-left">
              <img
                src={comment.avatar}
                alt={comment.author}
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-900">
                      {comment.author}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {comment.time}
                    </span>
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
                <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
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
