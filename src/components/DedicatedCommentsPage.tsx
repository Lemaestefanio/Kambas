import { useSiteContent } from '../cms/SiteContent';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Heart, Lock, Send, MessageCircle, Sparkles, UserRound } from 'lucide-react';
import type { Creator, AppUser } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';
import { LuandaPriveLogo } from './LuandaPriveLogo';
import { areCommentsRestricted, getManagedComments, resolveCommentPostId } from '../utils/managedComments';

interface DedicatedCommentsPageProps {
  creator: Creator;
  postCaption?: string;
  postId?: string;
  onBack: () => void;
  user?: AppUser | FirebaseUser | null;
  onUnlockClick: () => void;
}
interface LocalComment { id: string; name: string; text: string; }

export const DedicatedCommentsPage: React.FC<DedicatedCommentsPageProps> = ({ creator, postCaption, postId, onBack, user, onUnlockClick }) => {
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
    const name = user?.displayName?.trim() || 'Tu';
    setLocalState({ scope, comments: [{ id: crypto.randomUUID(), name, text }, ...localComments] });
    setNewComment('');
  };

  return <div className="mobile-screen fixed inset-x-0 z-50 mx-auto flex max-w-[600px] flex-col overflow-hidden bg-slate-50">
    <header className="mobile-safe-top z-50 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-3 shadow-2xs backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-2.5"><button type="button" onClick={onBack} aria-label={copy('overlay.dedicated-comments-page.011')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200"><ArrowLeft size={20} /></button><div className="min-w-0"><h1 className="truncate text-sm font-black text-slate-900">{copy('overlay.dedicated-comments-page.001')} {!restricted && <span className="text-xs font-bold text-slate-400">({comments.length})</span>}</h1><p className="truncate text-[11px] text-slate-500">{creator.shortName}</p></div></div>
      <div className="flex shrink-0 items-center gap-2"><LuandaPriveLogo size="sm" variant="compact" className="hidden sm:inline-flex" /><button type="button" onClick={onUnlockClick} className="flex min-h-11 items-center gap-1 rounded-full bg-[#00aff0] px-2.5 py-1 text-[11px] font-extrabold text-white shadow-xs hover:bg-[#009ed9]"><Sparkles size={12} /><span>{copy('overlay.dedicated-comments-page.003')}</span></button></div>
    </header>
    <main className="mobile-scroll mx-auto w-full max-w-xl flex-1 space-y-4 px-3 py-4">
      {restricted && <section aria-label="Comentários premium" className="space-y-3 rounded-2xl border border-slate-200 bg-white px-5 py-9 text-center shadow-2xs"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600"><Lock size={22} /></span><h2 className="text-base font-bold text-slate-900">Comentários só para premium</h2><p className="mx-auto max-w-xs text-xs leading-relaxed text-slate-500">O acesso aos comentários premium ainda não está ativo.</p><button type="button" onClick={onUnlockClick} className="rounded-full bg-[#00aff0] px-5 py-2 text-xs font-semibold text-white hover:bg-[#009ed9]">Ver planos</button></section>}
      {postCaption && <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"><div className="flex items-center gap-2"><span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound size={18} /></span><div><p className="text-xs font-bold text-slate-900">{creator.name}</p><p className="text-[10px] text-slate-500">Publicação</p></div></div><p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">{postCaption}</p></section>}
      {!restricted && comments.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center"><MessageCircle size={28} className="mx-auto mb-3 text-slate-300" /><p className="text-sm font-medium text-slate-600">Ainda não há comentários publicados.</p></div>}
      <div className="space-y-3">{comments.map((comment) => <article key={comment.key} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs"><div className="flex items-start gap-2.5"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound size={17} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-xs font-bold text-slate-900">{comment.name}</p>{comment.label && <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{comment.label}</span>}{comment.time && <p className="mt-1 text-[10px] text-slate-400">{comment.time}</p>}</div><button type="button" aria-label={likes[comment.key] ? 'Retirar gosto nesta sessão' : 'Gostar nesta sessão'} aria-pressed={Boolean(likes[comment.key])} onClick={() => setLikes((previous) => ({ ...previous, [comment.key]: !previous[comment.key] }))} className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-400 hover:text-rose-500"><Heart size={16} className={likes[comment.key] ? 'fill-rose-500 text-rose-500' : ''} /></button></div><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">{comment.text}</p></div></div></article>)}</div>
    </main>
    {!restricted && <footer className="mobile-composer border-t border-slate-200 bg-white p-3 shadow-xl"><p className="mb-3 text-[11px] leading-relaxed text-slate-500">O que escreveres aqui fica apenas nesta sessão e não é publicado para outras pessoas.</p><form onSubmit={handleAddComment} className="flex items-center gap-2"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound size={17} /></span><input type="text" aria-label="Escrever comentário nesta sessão" maxLength={2000} placeholder="Escreve um comentário…" value={newComment} onChange={(event) => setNewComment(event.target.value)} className="min-w-0 flex-1 rounded-full border border-transparent bg-slate-100 px-3 py-2.5 text-base text-slate-800 outline-none focus:border-[#00aff0]" /><button type="submit" aria-label="Adicionar nesta sessão" disabled={!newComment.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00aff0] text-white hover:bg-[#009ed9] disabled:bg-slate-200 disabled:text-slate-400"><Send size={16} /></button></form></footer>}
  </div>;
};
