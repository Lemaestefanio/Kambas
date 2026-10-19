import { useSiteContent } from '../cms/SiteContent';
import React, { useEffect, useState } from 'react';
import { X, Send, Heart, Lock, UserRound, MessageCircle } from 'lucide-react';
import type { Creator } from '../types';
import { areCommentsRestricted, getManagedComments, resolveCommentPostId } from '../utils/managedComments';

interface PostCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: Creator;
  postCaption: string;
  postId?: string;
  onUnlockClick?: () => void;
}
interface LocalComment { id: string; name: string; text: string; }

export const PostCommentsModal: React.FC<PostCommentsModalProps> = ({ isOpen, onClose, creator, postCaption, postId, onUnlockClick }) => {
  const { copy } = useSiteContent();
  const restricted = areCommentsRestricted(creator);
  const scope = `${creator.id}:${resolveCommentPostId(creator, postId, postCaption) || 'profile'}`;
  const [localState, setLocalState] = useState<{ scope: string; comments: LocalComment[] }>({ scope, comments: [] });
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState('');
  useEffect(() => { setNewComment(''); setLikes({}); }, [scope, restricted]);
  const localComments = localState.scope === scope ? localState.comments : [];
  const managed = getManagedComments(creator, postId, postCaption);
  const comments = restricted ? [] : [
    ...localComments.map((comment) => ({ ...comment, key: `local:${comment.id}`, time: 'Agora', label: 'Apenas nesta sessão' })),
    ...managed.map((comment) => ({ ...comment, key: `managed:${comment.id}`, label: comment.kind === 'real' ? '' : 'Comentário demonstrativo' })),
  ];

  const handleAddComment = (event: React.FormEvent) => {
    event.preventDefault();
    const text = newComment.trim();
    if (!text || restricted) return;
    setLocalState({ scope, comments: [{ id: crypto.randomUUID(), name: 'Tu', text }, ...localComments] });
    setNewComment('');
  };
  if (!isOpen) return null;

  return <div role="dialog" aria-modal="true" aria-label="Comentários da publicação" className="mobile-overlay fixed inset-0 z-[10005] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
    <div className="mobile-dialog-panel flex h-[min(600px,85dvh)] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4"><div className="min-w-0"><h3 className="text-sm font-bold text-slate-900">{copy('overlay.post-comments-modal.001')} {!restricted && <span className="text-slate-400">({comments.length})</span>}</h3>{postCaption && <p className="mt-1 truncate text-[11px] text-slate-500">{postCaption}</p>}</div><button type="button" aria-label="Fechar comentários" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200"><X size={20} /></button></header>
      <div className="mobile-scroll flex-1 space-y-4 p-4">
        {restricted && <section aria-label="Comentários premium" className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600"><Lock size={22} /></span><h4 className="text-sm font-bold text-slate-900">Comentários só para premium</h4><p className="text-xs leading-relaxed text-slate-500">O acesso aos comentários premium ainda não está ativo.</p>{onUnlockClick && <button type="button" onClick={onUnlockClick} className="rounded-full bg-[#00aff0] px-5 py-2 text-xs font-semibold text-white hover:bg-[#009ed9]">Ver planos</button>}</section>}
        {!restricted && comments.length === 0 && <div className="py-7 text-center text-slate-500"><MessageCircle size={25} className="mx-auto mb-2 text-slate-300" /><p className="text-sm">Ainda não há comentários publicados.</p></div>}
        {comments.map((comment) => <article key={comment.key} className="flex items-start gap-3 text-left">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound size={17} /></span>
          <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-xs font-bold text-slate-900">{comment.name}</p>{comment.label && <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{comment.label}</span>}{comment.time && <p className="mt-1 text-[10px] text-slate-400">{comment.time}</p>}</div><button type="button" aria-label={likes[comment.key] ? 'Retirar gosto nesta sessão' : 'Gostar nesta sessão'} aria-pressed={Boolean(likes[comment.key])} onClick={() => setLikes((previous) => ({ ...previous, [comment.key]: !previous[comment.key] }))} className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-400 hover:text-rose-500"><Heart size={15} className={likes[comment.key] ? 'fill-rose-500 text-rose-500' : ''} /></button></div><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">{comment.text}</p></div>
        </article>)}
      </div>
      {!restricted && <footer className="mobile-composer border-t border-slate-100 bg-white p-3"><p className="mb-2 text-[10px] leading-relaxed text-slate-500">O que escreveres aqui fica apenas nesta sessão e não é publicado para outras pessoas.</p><form onSubmit={handleAddComment} className="flex items-center gap-2"><input aria-label="Escrever comentário nesta sessão" type="text" maxLength={2000} placeholder="Escreve um comentário…" value={newComment} onChange={(event) => setNewComment(event.target.value)} className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#00aff0]" /><button aria-label="Adicionar nesta sessão" type="submit" disabled={!newComment.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00aff0] text-white hover:bg-[#009ed9] disabled:opacity-40"><Send size={16} /></button></form></footer>}
    </div>
  </div>;
};
