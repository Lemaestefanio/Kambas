import React from 'react';
import { ArrowDown, ArrowUp, MessageCircle, Plus, Trash2, UserRound } from 'lucide-react';
import type { Creator, ManagedComment } from '../types';
import { MANAGED_COMMENT_LIMIT } from '../utils/managedComments';

interface CommentsEditorProps {
  creator: Creator;
  onChange: (creator: Creator) => void;
  disabled?: boolean;
}

const inputClass = 'w-full rounded-lg border border-white/15 bg-[#11131d] px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400';
const actionClass = 'rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30';

export function CommentsEditor({ creator, onChange, disabled = false }: CommentsEditorProps) {
  const comments = Array.isArray(creator.managedComments) ? creator.managedComments : [];
  const update = (next: ManagedComment[]) => onChange({ ...creator, managedComments: next });
  const edit = (index: number, patch: Partial<ManagedComment>) => update(comments.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const move = (from: number, to: number) => {
    const next = [...comments];
    [next[from], next[to]] = [next[to], next[from]];
    update(next);
  };

  return <fieldset disabled={disabled} className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 text-lg font-semibold"><MessageCircle size={19} /> Comentários do perfil</h3><p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">Publica, organiza e elimina os comentários apresentados neste perfil. Todos aparecem sem fotografia.</p></div>
      <button type="button" disabled={comments.length >= MANAGED_COMMENT_LIMIT} className="inline-flex items-center gap-2 rounded-lg border border-pink-400/40 px-3 py-2 text-sm text-pink-200 hover:bg-pink-500/10 disabled:opacity-40" onClick={() => update([...comments, { id: crypto.randomUUID(), name: '', text: '', time: '', kind: 'demonstration' }])}><Plus size={16} /> Adicionar comentário</button>
    </div>
    <p className="rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3 text-xs leading-relaxed text-slate-300">Comentários demonstrativos apresentam a indicação “Comentário demonstrativo”. Marca como real apenas um comentário recebido e autorizado para publicação.</p>
    {comments.length === 0 && <div className="rounded-xl border border-dashed border-white/15 p-7 text-center"><MessageCircle size={24} className="mx-auto mb-3 text-slate-500" /><p className="text-sm text-slate-300">Ainda não adicionaste comentários.</p><p className="mt-1 text-xs text-slate-500">Usa “Adicionar comentário”. As alterações só ficam públicas depois de guardares o perfil.</p></div>}
    <div className="space-y-4">{comments.map((comment, index) => {
      const prefix = `managed-comment-${comment.id}`;
      const missingPost = comment.postId && !(creator.posts || []).some((post) => post.id === comment.postId);
      return <section key={comment.id} className="space-y-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-400"><UserRound size={17} /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{comment.name || `Comentário ${index + 1}`}</p><p className="text-[11px] text-slate-400">{comment.kind === 'real' ? 'Real, com autorização' : 'Comentário demonstrativo'}</p></div></div><div className="flex shrink-0 gap-1">
          <button type="button" aria-label={`Mover comentário ${index + 1} para cima`} className={actionClass} disabled={index === 0} onClick={() => move(index, index - 1)}><ArrowUp size={15} /></button>
          <button type="button" aria-label={`Mover comentário ${index + 1} para baixo`} className={actionClass} disabled={index === comments.length - 1} onClick={() => move(index, index + 1)}><ArrowDown size={15} /></button>
          <button type="button" aria-label={`Eliminar comentário ${index + 1}`} className={`${actionClass} text-rose-300`} onClick={() => update(comments.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
        </div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor={`${prefix}-name`} className="space-y-1.5 text-sm text-slate-200"><span className="block">Nome apresentado</span><input id={`${prefix}-name`} className={inputClass} value={comment.name} maxLength={120} onChange={(event) => edit(index, { name: event.target.value })} placeholder="Nome ou pseudónimo" /></label>
          <label htmlFor={`${prefix}-kind`} className="space-y-1.5 text-sm text-slate-200"><span className="block">Origem do comentário</span><select id={`${prefix}-kind`} className={inputClass} value={comment.kind} onChange={(event) => edit(index, { kind: event.target.value as ManagedComment['kind'] })}><option value="demonstration">Demonstrativo — identificado como exemplo</option><option value="real">Real — recebido e autorizado</option></select></label>
        </div>
        <label htmlFor={`${prefix}-text`} className="block space-y-1.5 text-sm text-slate-200"><span className="block">Comentário</span><textarea id={`${prefix}-text`} className={inputClass} value={comment.text} maxLength={2000} rows={3} onChange={(event) => edit(index, { text: event.target.value })} placeholder="Escreve o comentário a apresentar" /><span className="block text-right text-[11px] text-slate-500">{comment.text.length}/2000</span></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor={`${prefix}-time`} className="space-y-1.5 text-sm text-slate-200"><span className="block">Data apresentada <span className="text-xs text-slate-500">(opcional)</span></span><input id={`${prefix}-time`} className={inputClass} value={comment.time} maxLength={80} onChange={(event) => edit(index, { time: event.target.value })} placeholder="Por exemplo: 19/10/2026" /></label>
          <label htmlFor={`${prefix}-post`} className="space-y-1.5 text-sm text-slate-200"><span className="block">Onde apresentar</span><select id={`${prefix}-post`} className={inputClass} value={comment.postId || ''} onChange={(event) => edit(index, { postId: event.target.value })}><option value="">Geral do perfil — em todas as publicações</option>{missingPost && <option value={comment.postId}>Publicação removida — escolhe outra</option>}{(creator.posts || []).map((post, postIndex) => <option key={post.id} value={post.id}>{postIndex + 1}. {post.text.slice(0, 90) || 'Publicação sem legenda'}</option>)}</select></label>
        </div>
      </section>;
    })}</div>
    {comments.length > 0 && <p className="text-xs text-slate-500">{comments.length}/{MANAGED_COMMENT_LIMIT} comentários. Guarda o perfil para publicar as alterações.</p>}
  </fieldset>;
}
