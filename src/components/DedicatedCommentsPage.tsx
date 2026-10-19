import React, { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Send,
  CheckCircle2,
  Share2,
  Sparkles,
  MessageCircle,
  MoreVertical,
  Lock,
  Smile,
  ShieldCheck,
} from 'lucide-react';
import { Creator, AppUser } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { LuandaPriveLogo } from './LuandaPriveLogo';

interface CommentItem {
  id: string;
  userName: string;
  userAvatar?: string;
  isCreator?: boolean;
  isVip?: boolean;
  time: string;
  text: string;
  likes: number;
  isLiked?: boolean;
}

interface DedicatedCommentsPageProps {
  creator: Creator;
  postCaption?: string;
  onBack: () => void;
  user?: AppUser | FirebaseUser | null;
  onUnlockClick: () => void;
}

export const DedicatedCommentsPage: React.FC<DedicatedCommentsPageProps> = ({
  creator,
  postCaption,
  onBack,
  user,
  onUnlockClick,
}) => {
  const defaultCaption =
    postCaption ||
    'Sessão privada de hoje em Luanda... 🔥 O que acharam deste conteúdo? Deixem aqui os vossos comentários amor 💋';

  const [postAsCreator, setPostAsCreator] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: 'c1',
      userName: 'Membro VIP Luanda',
      isVip: true,
      time: 'há 6 min',
      text: `Olha ${creator.shortName} acabei de pagar o VIP agora pelo Express! Quero marcar uma chamada de vídeo contigo hoje 🔥🇦🇴`,
      likes: 18,
      isLiked: false,
    },
    {
      id: 'c2',
      userName: creator.name,
      isCreator: true,
      isVip: true,
      time: 'há 4 min',
      text: 'Acabei de confirmar aqui amor! Já te mandei mensagem no WhatsApp, atende lá que já estou online na chamada 💋',
      likes: 38,
      isLiked: true,
    },
    {
      id: 'c3',
      userName: 'Fã Secreto Maianga',
      isVip: true,
      time: 'há 18 min',
      text: `Deixei uma mensagem no privado ${creator.shortName}, confirma lá o comprovativo do plano de 3 meses pfvr`,
      likes: 14,
      isLiked: false,
    },
    {
      id: 'c4',
      userName: creator.name,
      isCreator: true,
      isVip: true,
      time: 'há 15 min',
      text: 'Confirmadíssimo gato! Acesso liberado no Telegram e no feed sem censura 😈🔥',
      likes: 29,
      isLiked: true,
    },
    {
      id: 'c5',
      userName: 'Kota VIP Talatona',
      isVip: true,
      time: 'há 32 min',
      text: 'Mano o VIP vale bué a pena, a dança que ela postou ontem no quarto me matou 🤤🇦🇴',
      likes: 21,
      isLiked: false,
    },
    {
      id: 'c6',
      userName: creator.name,
      isCreator: true,
      isVip: true,
      time: 'há 26 min',
      text: 'Obrigada meu rei! Hoje à noite tem mais um exclusivo só pra quem é VIP 👀💋',
      likes: 45,
      isLiked: true,
    },
    {
      id: 'c7',
      userName: 'Assinante Anónimo',
      isVip: true,
      time: 'há 50 min',
      text: 'Mandei um mimo de champanhe pra ti amor no Multicaixa, você merece tudo ❤️',
      likes: 12,
      isLiked: false,
    },
    {
      id: 'c8',
      userName: creator.name,
      isCreator: true,
      isVip: true,
      time: 'há 42 min',
      text: 'Recebi aqui amorzinho! Muito obrigada pelo mimo, deixei um agrado especial na tua caixa de mensagens privativa ❤️',
      likes: 36,
      isLiked: true,
    },
  ]);

  const [newCommentText, setNewCommentText] = useState('');
  const [quickEmoji, setQuickEmoji] = useState(['🔥', '❤️', '😍', '💋', '👏', '🍑', '👑']);

  const handleToggleLike = (id: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const isLiked = !c.isLiked;
          return {
            ...c,
            isLiked,
            likes: isLiked ? c.likes + 1 : c.likes - 1,
          };
        }
        return c;
      })
    );
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const currentUserName =
      postAsCreator
        ? creator.name
        : user?.displayName || (user as any)?.name || 'Membro VIP Anónimo';

    const newComment: CommentItem = {
      id: `comment-${Date.now()}`,
      userName: currentUserName,
      isCreator: postAsCreator,
      isVip: true,
      time: 'Agora mesmo',
      text: newCommentText.trim(),
      likes: 0,
      isLiked: false,
    };

    setComments((prev) => [newComment, ...prev]);
    setNewCommentText('');
  };

  const handleInsertEmoji = (emoji: string) => {
    setNewCommentText((prev) => `${prev}${emoji}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header estilo Instagram / OnlyFans */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Voltar ao Feed"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Comentários</span>
              <span className="text-xs text-slate-400 font-bold">({comments.length})</span>
            </h1>
            <p className="text-[11px] text-slate-500">
              Publicação de <strong className="text-slate-800">{creator.shortName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LuandaPriveLogo size="sm" variant="compact" />
          <button
            onClick={onUnlockClick}
            className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#00aff0] to-[#008cc0] text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3 h-3" />
            <span>Assinar VIP</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-xl mx-auto w-full px-3 py-3 space-y-4 pb-36">
        {/* Original Post Snippet Card */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={creator.avatar}
                alt={creator.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00aff0]/30"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-900 truncate">{creator.name}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-white fill-[#00aff0] shrink-0" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {creator.handle} · há pouco
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-800 leading-relaxed font-medium">
            {defaultCaption}
          </p>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">❤️ 412 gostos</span>
              <span>·</span>
              <span className="font-semibold text-slate-700">💬 {comments.length} comentários</span>
            </div>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-bold">
              Feed Luanda Privé
            </span>
          </div>
        </div>

        {/* Notice of Anonymous & Safe Participation */}
        <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl px-3 py-2 flex items-center gap-2 text-slate-600 text-xs">
          <ShieldCheck className="w-4 h-4 text-[#00aff0] shrink-0" />
          <span className="text-[11px]">
            Os teus comentários são 100% confidenciais e protegidos. Apenas o teu apelido é exibido.
          </span>
        </div>

        {/* Comments Thread (Feed de Comentários) */}
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-2xl border transition-all ${
                comment.isCreator
                  ? 'bg-blue-50/50 border-[#00aff0]/30 ring-1 ring-[#00aff0]/20'
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {/* Avatar: Total anonimato para fãs (sem fotos); criadora verificada tem a sua foto oficial */}
                  {comment.isCreator ? (
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-[#00aff0]/40 shrink-0"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold shrink-0 border border-slate-600 shadow-2xs"
                      title="100% Confidencial · Sem foto exposta"
                    >
                      <Lock className="w-3.5 h-3.5 text-[#00aff0]" />
                    </div>
                  )}

                  {/* Comment Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {comment.userName}
                      </span>

                      {comment.isCreator && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#00aff0] text-white text-[9px] font-black tracking-wide">
                          CRIADORA
                        </span>
                      )}

                      {comment.isVip && !comment.isCreator && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-800 border border-amber-300 text-[9px] font-extrabold">
                          VIP
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400">{comment.time}</span>
                    </div>

                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                </div>

                {/* Like Button */}
                <button
                  type="button"
                  onClick={() => handleToggleLike(comment.id)}
                  className="flex flex-col items-center gap-0.5 pt-0.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      comment.isLiked ? 'fill-rose-500 text-rose-500' : ''
                    }`}
                  />
                  {comment.likes > 0 && (
                    <span className="text-[10px] font-bold text-slate-500 font-mono">
                      {comment.likes}
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Comment Bar (Estilo Instagram / TikTok) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-xl p-2.5 sm:p-3 max-w-[600px] mx-auto">
        {/* Quick Emoji Bar */}
        <div className="flex items-center justify-around pb-2 px-1">
          {quickEmoji.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleInsertEmoji(emoji)}
              className="text-lg hover:scale-125 transition-transform active:scale-95 cursor-pointer p-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Creator Reply Mode Selector */}
        <div className="flex items-center justify-between pb-2 px-1 text-[11px]">
          <span className="text-slate-500 font-bold flex items-center gap-1">
            <Lock className="w-3 h-3 text-[#00aff0]" />
            <span>Identidade no comentário:</span>
          </span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPostAsCreator(false)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                !postAsCreator
                  ? 'bg-white text-slate-800 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Fã Anónimo
            </button>
            <button
              type="button"
              onClick={() => setPostAsCreator(true)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 ${
                postAsCreator
                  ? 'bg-[#00aff0] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{creator.shortName} (Criadora)</span>
              <CheckCircle2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Form Input */}
        <form onSubmit={handleAddComment} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              postAsCreator
                ? 'bg-[#00aff0] text-white ring-2 ring-[#00aff0]/30'
                : 'bg-slate-900 text-white'
            }`}
          >
            {postAsCreator ? creator.shortName.charAt(0).toUpperCase() : 'VIP'}
          </div>

          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              placeholder={
                postAsCreator
                  ? `Responder como ${creator.shortName} (Criadora Verificada)...`
                  : 'Escreve um comentário anónimo...'
              }
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-100 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00aff0]/50 border border-transparent focus:border-[#00aff0]"
            />
          </div>

          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              newCommentText.trim()
                ? 'bg-[#00aff0] hover:bg-[#009ed9] text-white shadow-md active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
