import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ImageIcon, Plus, Trash2, Upload, Video, X } from 'lucide-react';
import type { CreatorPost } from '../types';

export interface EditorField {
  label: string;
  kind?: 'text' | 'long' | 'number' | 'range' | 'boolean' | 'object' | 'array' | 'select' | 'visibility' | 'posts';
  fields?: Record<string, EditorField>;
  item?: EditorField;
  template?: () => unknown;
  options?: Array<{ value: string; label: string }>;
  media?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  videoOnly?: boolean;
  defaultValue?: string | number | boolean;
}

const inputClass = 'w-full rounded-lg border border-white/15 bg-[#11131d] px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400 disabled:opacity-50';
const actionClass = 'rounded-md border border-white/15 p-2 text-slate-300 hover:bg-white/10 disabled:opacity-30';

interface EditorProps {
  field: EditorField;
  value: any;
  onChange: (value: any) => void;
  onUpload: (file: File, accept: (url: string) => void) => Promise<void>;
  path: string;
}

export function StructuredField({ field, value, onChange, onUpload, path }: EditorProps) {
  value = value ?? field.defaultValue;
  const id = `cms-${path.replace(/[^a-zA-Z0-9-]/g, '-')}`;
  if (field.kind === 'posts') return <PublicationsEditor value={value || []} onChange={onChange} onUpload={onUpload} path={path} />;
  if (field.kind === 'object') return <fieldset className="space-y-4 rounded-xl border border-white/10 p-4"><legend className="px-2 text-sm font-semibold text-pink-200">{field.label}</legend><StructuredFields fields={field.fields || {}} value={value || {}} onChange={onChange} onUpload={onUpload} path={path} /></fieldset>;
  if (field.kind === 'array') {
    const items: any[] = Array.isArray(value) ? value : [];
    const move = (from: number, to: number) => { const next = [...items]; [next[from], next[to]] = [next[to], next[from]]; onChange(next); };
    return <section className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-pink-200">{field.label} ({items.length})</h3><button type="button" className="inline-flex items-center gap-2 rounded-lg border border-pink-400/30 px-3 py-2 text-xs text-pink-200 hover:bg-pink-400/10" onClick={() => onChange([...items, field.template ? field.template() : ''])}><Plus size={15} /> Adicionar</button></div>
      {field.hint && <p className="text-xs leading-relaxed text-slate-400">{field.hint}</p>}
      {items.length === 0 && <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-slate-500">Nenhum item. Usa “Adicionar” para criar o primeiro.</p>}
      {items.map((item, index) => <div key={item && typeof item === 'object' && item.id ? item.id : index} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><span className="min-w-0 truncate text-xs font-medium text-slate-400">{index + 1}. {typeof item === 'object' && item ? item.title || item.duration || item.question || item.caption || 'Item' : 'Item'}</span><div className="flex shrink-0 gap-1">
          <button type="button" aria-label={`Mover item ${index + 1} para cima`} className={actionClass} disabled={index === 0} onClick={() => move(index, index - 1)}><ArrowUp size={14} /></button>
          <button type="button" aria-label={`Mover item ${index + 1} para baixo`} className={actionClass} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}><ArrowDown size={14} /></button>
          <button type="button" aria-label={`Remover item ${index + 1}`} className={`${actionClass} text-rose-300`} onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 size={14} /></button>
        </div></div>
        <StructuredField field={field.item || { label: 'Texto' }} value={item} onChange={(next) => onChange(items.map((existing, i) => i === index ? next : existing))} onUpload={onUpload} path={`${path}-${index}`} />
      </div>)}
    </section>;
  }
  if (field.kind === 'visibility') return <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium text-slate-200">{field.label}</legend><div className="grid gap-2 sm:grid-cols-2">{[{ value: 'public', label: 'Conteúdo aberto' }, { value: 'blurred', label: 'Prévia com desfoque' }].map((option) => <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${value === option.value ? 'border-pink-400/60 bg-pink-500/10 text-pink-100' : 'border-white/10 text-slate-300'}`}><input type="radio" name={id} checked={value === option.value} onChange={() => onChange(option.value)} className="accent-pink-500" />{option.label}</label>)}</div>{field.hint && <p className="text-xs leading-relaxed text-slate-400">{field.hint}</p>}</fieldset>;
  if (field.kind === 'boolean') return <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 text-sm text-slate-200"><input id={id} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-pink-500" /><span>{field.label}{field.hint && <span className="mt-1 block text-xs text-slate-400">{field.hint}</span>}</span></label>;
  if (field.kind === 'range') {
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const current = typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : Number(field.defaultValue ?? min);
    return <div className="space-y-2 rounded-xl border border-white/10 p-4"><div className="flex items-center justify-between gap-3"><label htmlFor={id} className="text-sm font-medium text-slate-200">{field.label}</label><output htmlFor={id} className="rounded-full bg-pink-500/15 px-2.5 py-1 text-xs font-semibold text-pink-200">{current} px</output></div><input id={id} type="range" min={min} max={max} step={field.step ?? 1} value={current} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-pink-500" /><div className="flex justify-between text-[10px] text-slate-500"><span>Leve</span><span>Mais intenso</span></div>{field.hint && <p className="text-xs leading-relaxed text-slate-400">{field.hint}</p>}</div>;
  }
  return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-medium text-slate-200">{field.label}</label>
    {field.kind === 'long' ? <textarea id={id} className={inputClass} rows={4} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
      : field.kind === 'select' ? <select id={id} className={inputClass} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>{!field.options?.some((option) => option.value === (value ?? '')) && <option value="">Sem seleção</option>}{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        : <input id={id} className={inputClass} type={field.kind === 'number' ? 'number' : 'text'} min={field.min} step={field.kind === 'number' ? 'any' : undefined} value={value ?? ''} onChange={(event) => onChange(field.kind === 'number' ? (event.target.value === '' ? 0 : Number(event.target.value)) : event.target.value)} />}
    {field.hint && <p className="text-xs leading-relaxed text-slate-400">{field.hint}</p>}
    {field.media && <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"><Upload size={14} /> Enviar ficheiro<input aria-label={`Enviar ficheiro: ${field.label}`} type="file" accept={field.media} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void onUpload(file, onChange); }} /></label>}
  </div>;
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime';

/** Keep the caption and audience settings, never reuse a file as another media type. */
export function changePublicationType(post: CreatorPost, type: CreatorPost['type']): CreatorPost {
  if (post.type === type) return post;
  const { image: _image, video: _video, previewUrl: _preview, posterUrl: _poster, previewAudio: _audio, duration: _duration, ...shared } = post;
  return { ...shared, type, ...(type === 'video' ? { video: '', previewAudio: false } : { image: '' }) };
}

function incompatibleMediaUrl(value: string | undefined, kind: 'photo' | 'video'): boolean {
  if (!value) return false;
  let path = value.split(/[?#]/)[0];
  try { path = decodeURIComponent(path); } catch { /* A malformed encoded URL is handled by the upload/storage validation. */ }
  const extension = path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return kind === 'photo' ? ['mp4', 'webm', 'mov', 'm4v', 'avi'].includes(extension || '')
    : ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg', 'heic'].includes(extension || '');
}

export function validatePublications(posts: readonly CreatorPost[], previousPosts: readonly CreatorPost[] = []): string | null {
  for (const [index, post] of posts.entries()) {
    const previous = previousPosts.find((item) => item.id === post.id);
    // Legacy posts can depend on a profile-banner fallback. Only enforce a new
    // media selection when the owner creates a post or changes its media/type.
    if (previous && JSON.stringify([post.type, post.image, post.video, post.previewUrl, post.posterUrl]) === JSON.stringify([previous.type, previous.image, previous.video, previous.previewUrl, previous.posterUrl])) continue;
    const label = `Publicação ${index + 1}`;
    const source = post.type === 'video' ? post.video : post.image;
    if (!source?.trim()) return `${label}: envia ${post.type === 'video' ? 'o vídeo' : 'a foto'} antes de guardar.`;
    if (incompatibleMediaUrl(source, post.type) || incompatibleMediaUrl(post.previewUrl, post.type)) {
      return `${label}: o ficheiro ou a prévia não corresponde ao tipo ${post.type === 'video' ? 'Vídeo' : 'Foto'}. Envia o formato correto.`;
    }
    if (post.type === 'video' && incompatibleMediaUrl(post.posterUrl || post.image, 'photo')) return `${label}: a capa do vídeo deve ser uma imagem.`;
  }
  return null;
}

export function PublicationMediaInput({ label, kind, value, onChange, onUpload, path, optional = false, showPreview = true }: {
  label: string; kind: 'photo' | 'video'; value?: string; onChange: (url: string) => void;
  onUpload: EditorProps['onUpload']; path: string; optional?: boolean; showPreview?: boolean;
}) {
  const [error, setError] = useState('');
  const isVideo = kind === 'video';
  const accept = isVideo ? VIDEO_ACCEPT : IMAGE_ACCEPT;
  return <div className="space-y-3 rounded-xl border border-white/10 bg-black/15 p-4">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-white">{label}{optional && <span className="ml-2 font-normal text-slate-500">Opcional</span>}</p>{value && <button type="button" onClick={() => { setError(''); onChange(''); }} className="text-xs text-rose-300 hover:underline">Remover ficheiro</button>}</div>
    {showPreview && value && !incompatibleMediaUrl(value, kind) && <div className="overflow-hidden rounded-lg bg-black">{isVideo ? <video key={value} controls preload="none" playsInline src={value} className="mx-auto max-h-60 w-full" aria-label="Rever vídeo enviado" /> : <img src={value} alt="Imagem selecionada para esta publicação" loading="lazy" decoding="async" className="mx-auto max-h-60 object-contain" />}</div>}
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-pink-400/40 bg-pink-500/5 px-4 py-4 text-sm font-medium text-pink-200 hover:bg-pink-500/10"><Upload size={18} />{value ? 'Substituir ficheiro' : isVideo ? 'Enviar vídeo' : 'Enviar foto'}<input aria-label={`Enviar ficheiro: ${label}`} type="file" accept={accept} className="sr-only" onChange={(event) => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      if (!accept.split(',').includes(file.type.toLowerCase())) { setError(isVideo ? 'Seleciona um vídeo MP4, WebM ou MOV.' : 'Seleciona uma imagem JPG, PNG, WebP, GIF ou AVIF.'); return; }
      setError(''); void onUpload(file, onChange);
    }} /></label>
    <p className="text-[11px] text-slate-500">{isVideo ? 'MP4, WebM ou MOV · até 100 MB' : 'JPG, PNG, WebP, GIF ou AVIF · até 20 MB'}</p>
    <details className="text-xs text-slate-400"><summary className="cursor-pointer">Usar uma ligação {isVideo ? 'de vídeo' : 'de imagem'}</summary><label className="mt-3 block space-y-1.5"><span>Ligação do ficheiro</span><input aria-label={`Ligação: ${label}`} id={`cms-${path}-url`} type="url" className={inputClass} value={value || ''} placeholder="https://…" onChange={(event) => { const next = event.target.value; onChange(next); setError(incompatibleMediaUrl(next, kind) ? `Esta ligação aponta para ${isVideo ? 'uma imagem; escolhe um vídeo' : 'um vídeo; escolhe uma foto'}.` : ''); }} /></label></details>
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
  </div>;
}

export function PublicationsEditor({ value, onChange, onUpload, path }: Omit<EditorProps, 'field'>) {
  const posts: CreatorPost[] = Array.isArray(value) ? value : [];
  const [choosingType, setChoosingType] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<{ id: string; type: CreatorPost['type'] } | null>(null);
  const update = (id: string, next: CreatorPost) => onChange(posts.map((post) => post.id === id ? next : post));
  const add = (type: CreatorPost['type']) => {
    const post: CreatorPost = { id: itemId(), type, time: 'Agora', text: '', likes: 0, comments: 0, visibility: 'blurred', unlocked: false, blurAmount: 4,
      ...(type === 'video' ? { video: '', previewAudio: false } : { image: '' }) };
    onChange([post, ...posts]); setExpandedId(post.id); setChoosingType(false); setPendingType(null);
  };
  const move = (from: number, to: number) => { const next = [...posts]; [next[from], next[to]] = [next[to], next[from]]; onChange(next); };
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-semibold">Publicações ({posts.length})</h3><p className="mt-1 text-xs text-slate-400">A primeira da lista aparece primeiro na página.</p></div><button type="button" onClick={() => setChoosingType(true)} className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-500"><Plus size={17} /> Adicionar publicação</button></div>
    {choosingType && <div className="space-y-3 rounded-2xl border border-pink-400/30 bg-pink-500/5 p-4"><div className="flex items-center justify-between"><h4 className="text-sm font-semibold">O que queres publicar?</h4><button type="button" aria-label="Cancelar nova publicação" onClick={() => setChoosingType(false)} className={actionClass}><X size={16} /></button></div><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => add('photo')} className="flex flex-col items-center gap-2 rounded-xl border border-white/15 bg-[#11131d] px-4 py-5 text-sm font-semibold hover:border-pink-400"><ImageIcon size={26} className="text-pink-300" /> Foto</button><button type="button" onClick={() => add('video')} className="flex flex-col items-center gap-2 rounded-xl border border-white/15 bg-[#11131d] px-4 py-5 text-sm font-semibold hover:border-pink-400"><Video size={26} className="text-pink-300" /> Vídeo</button></div></div>}
    {posts.length === 0 && !choosingType && <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-slate-400">Ainda não há publicações. Usa “Adicionar publicação” e escolhe Foto ou Vídeo.</p>}
    {posts.map((post, index) => {
      const expanded = expandedId === post.id;
      const isVideo = post.type === 'video';
      const visibility = post.visibility || (post.unlocked ? 'public' : 'blurred');
      const base = `${path}-${post.id}`;
      return <article key={post.id} className={`overflow-hidden rounded-2xl border ${expanded ? 'border-pink-400/40' : 'border-white/10'}`}>
        <div className="flex items-center gap-2 bg-white/[0.025] p-3"><button type="button" aria-expanded={expanded} aria-controls={`publication-${post.id}`} onClick={() => { setExpandedId(expanded ? null : post.id); setPendingType(null); }} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-200">{isVideo ? <Video size={20} /> : <ImageIcon size={20} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{index + 1}. {isVideo ? 'Vídeo' : 'Foto'}{post.text ? ` · ${post.text}` : ''}</span><span className="mt-0.5 block text-[11px] text-slate-400">{visibility === 'public' ? 'Conteúdo aberto' : 'Prévia com desfoque'} · {expanded ? 'A editar' : 'Toca para editar'}</span></span><ChevronDown size={16} className={`shrink-0 text-slate-400 ${expanded ? 'rotate-180' : ''}`} /></button><div className="flex shrink-0 gap-1"><button type="button" aria-label={`Mover publicação ${index + 1} para cima`} disabled={index === 0} onClick={() => move(index, index - 1)} className={actionClass}><ArrowUp size={14} /></button><button type="button" aria-label={`Mover publicação ${index + 1} para baixo`} disabled={index === posts.length - 1} onClick={() => move(index, index + 1)} className={actionClass}><ArrowDown size={14} /></button><button type="button" aria-label={`Eliminar publicação ${index + 1}`} onClick={() => { onChange(posts.filter((item) => item.id !== post.id)); if (expanded) setExpandedId(null); }} className={`${actionClass} text-rose-300`}><Trash2 size={14} /></button></div></div>
        {expanded && <div id={`publication-${post.id}`} className="space-y-5 border-t border-white/10 p-4 sm:p-5">
          <fieldset><legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">1. Tipo de publicação</legend><div className="grid grid-cols-2 gap-2">{(['photo', 'video'] as const).map((type) => <button key={type} type="button" aria-pressed={post.type === type} onClick={() => { if (post.type !== type) { if (post.image || post.video || post.previewUrl || post.posterUrl) setPendingType({ id: post.id, type }); else update(post.id, changePublicationType(post, type)); } }} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${post.type === type ? 'border-pink-400/60 bg-pink-500/10 text-pink-100' : 'border-white/10 text-slate-400'}`}>{type === 'photo' ? 'Foto' : 'Vídeo'}</button>)}</div></fieldset>
          {pendingType?.id === post.id && <div role="alert" className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4"><p className="text-sm text-amber-100">Mudar para {pendingType.type === 'video' ? 'Vídeo' : 'Foto'}? O ficheiro atual, a capa e a prévia serão retirados deste rascunho. Depois envia o novo ficheiro.</p><div className="flex gap-2"><button type="button" onClick={() => { update(post.id, changePublicationType(post, pendingType.type)); setPendingType(null); }} className="rounded-lg bg-amber-200 px-3 py-2 text-xs font-semibold text-amber-950">Mudar tipo</button><button type="button" onClick={() => setPendingType(null)} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Cancelar</button></div></div>}
          <div className="space-y-3"><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">2. {isVideo ? 'Vídeo e legenda' : 'Foto e legenda'}</h4><PublicationMediaInput key={`${post.id}-${post.type}`} label={isVideo ? 'Vídeo da publicação' : 'Foto da publicação'} kind={post.type} value={isVideo ? post.video : post.image} onChange={(url) => update(post.id, { ...post, [isVideo ? 'video' : 'image']: url })} onUpload={onUpload} path={`${base}-main`} /><StructuredField field={{ label: 'Legenda', kind: 'long' }} value={post.text} onChange={(text) => update(post.id, { ...post, text })} onUpload={onUpload} path={`${base}-caption`} /></div>
          <div className="space-y-3"><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">3. O que o visitante pode ver</h4><StructuredField field={{ label: 'Visibilidade', kind: 'visibility' }} value={visibility} onChange={(next) => update(post.id, { ...post, visibility: next, unlocked: next === 'public' })} onUpload={onUpload} path={`${base}-visibility`} />{visibility === 'blurred' && <StructuredField field={previewFields().blurAmount} value={post.blurAmount} onChange={(blurAmount) => update(post.id, { ...post, blurAmount })} onUpload={onUpload} path={`${base}-blur`} />}{isVideo && <StructuredField field={{ label: 'Permitir áudio', kind: 'boolean', hint: 'Ligado: o visitante pode ativar o som. Desligado: o vídeo fica sem áudio.' }} value={post.previewAudio ?? visibility === 'public'} onChange={(previewAudio) => update(post.id, { ...post, previewAudio })} onUpload={onUpload} path={`${base}-audio`} />}</div>
          <details className="rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm font-medium text-slate-300">Opções adicionais{isVideo ? ' · capa, prévia e duração' : ' · prévia e data'}</summary><div className="mt-4 space-y-4">{isVideo && <PublicationMediaInput label="Capa do vídeo" kind="photo" value={post.posterUrl || post.image} onChange={(posterUrl) => { const { image: _legacyPoster, ...rest } = post; update(post.id, { ...rest, posterUrl }); }} onUpload={onUpload} path={`${base}-poster`} optional />}{visibility === 'blurred' && <><PublicationMediaInput label={isVideo ? 'Vídeo de prévia separado' : 'Foto de prévia separada'} kind={post.type} value={post.previewUrl} onChange={(previewUrl) => update(post.id, { ...post, previewUrl })} onUpload={onUpload} path={`${base}-preview`} optional /><p className="text-xs leading-relaxed text-slate-400">Deixa vazio para usar o ficheiro principal com desfoque. O desfoque é visual: envia apenas ficheiros preparados para acesso público.</p></>}<StructuredFields fields={{ time: text('Data apresentada'), ...(isVideo ? { duration: text('Duração apresentada (por exemplo: 0:45)') } : {}), likes: number('Contagem de gostos'), comments: number('Contagem de comentários') }} value={post} onChange={(next) => update(post.id, next)} onUpload={onUpload} path={`${base}-extra`} /></div></details>
          <button type="button" onClick={() => setExpandedId(null)} className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">Concluir edição desta publicação</button><p className="text-center text-[11px] text-slate-500">No fim, usa “Guardar perfil” para publicar as alterações.</p>
        </div>}
      </article>;
    })}
  </section>;
}

export function StructuredFields({ fields, value, onChange, onUpload, path }: Omit<EditorProps, 'field'> & { fields: Record<string, EditorField> }) {
  // Existing documents retain their unlocked setting until the owner edits it.
  const currentVisibility = value?.visibility === 'public' || value?.visibility === 'blurred' ? value.visibility
    : typeof value?.unlocked === 'boolean' ? value.unlocked ? 'public' : 'blurred' : fields.visibility?.defaultValue ?? 'blurred';
  return <div className="space-y-4">{Object.entries(fields).filter(([, field]) => !field.videoOnly || value?.type === 'video').map(([key, field]) => {
    const current = key === 'visibility' && field.kind === 'visibility' ? currentVisibility
      : key === 'previewAudio' ? value?.[key] ?? (currentVisibility === 'public') : value?.[key];
    const renderedField = key === 'previewUrl' && field.media && value?.type
      ? { ...field, media: value.type === 'video' ? 'video/*' : 'image/*' } : field;
    return <StructuredField key={key} field={renderedField} value={current} onChange={(next) => onChange(key === 'visibility' && field.kind === 'visibility'
      ? { ...value, visibility: next, unlocked: next === 'public' } : { ...value, [key]: next })} onUpload={onUpload} path={`${path}-${key}`} />;
  })}</div>;
}

export const itemId = () => crypto.randomUUID();
const text = (label: string, extra: Partial<EditorField> = {}): EditorField => ({ label, ...extra });
const number = (label: string, min = 0): EditorField => ({ label, kind: 'number', min });
const bool = (label: string): EditorField => ({ label, kind: 'boolean' });
const image = (label: string): EditorField => ({ label, media: 'image/*' });
const video = (label: string): EditorField => ({ label, media: 'video/*' });
const object = (label: string, fields: Record<string, EditorField>): EditorField => ({ label, kind: 'object', fields });
const array = (label: string, item: EditorField, template: () => unknown): EditorField => ({ label, kind: 'array', item, template });

const previewFields = (defaultPublic = false, imageOnly = false): Record<string, EditorField> => ({
  visibility: { label: 'Visibilidade do conteúdo', kind: 'visibility', defaultValue: defaultPublic ? 'public' : 'blurred', hint: 'O botão para desbloquear aparece abaixo da prévia.' },
  blurAmount: { label: 'Intensidade do desfoque', kind: 'range', min: 2, max: 12, step: 1, defaultValue: 4, hint: 'O nível 4 mantém contornos e movimento visíveis. Aplica-se apenas às prévias com desfoque.' },
  ...(!imageOnly ? { previewAudio: { label: 'Permitir som na prévia', kind: 'boolean' as const, videoOnly: true, hint: 'O visitante toca no botão de som para ouvir. Desliga para apresentar a prévia em silêncio.' } } : {}),
  previewUrl: text('Ficheiro de prévia separado (opcional)', { media: imageOnly ? 'image/*' : 'image/*,video/*', hint: 'Usado nas prévias com desfoque. Envia um ficheiro preparado para acesso público; se deixares vazio, será usado o ficheiro acima.' }),
  ...(!imageOnly ? { posterUrl: { ...image('Capa leve do vídeo (opcional)'), videoOnly: true, hint: 'Imagem mostrada antes de o visitante reproduzir o vídeo.' } } : {}),
});

export const PROFILE_SECTIONS: Record<string, { label: string; hint?: string; fields: Record<string, EditorField> }> = {
  profile: { label: 'Dados do perfil', fields: {
    name: text('Nome completo'), shortName: text('Nome curto'), handle: text('Nome de utilizador (@)'), age: number('Idade', 18), city: text('Cidade'), neighborhood: text('Bairro'), bio: text('Biografia', { kind: 'long' }),
    avatar: image('Fotografia de perfil (avatar)'), whatsappNumber: text('Número de WhatsApp'), incomingMessage: text('Mensagem que aparece ao visitante', { kind: 'long' }), verified: bool('Mostrar selo de verificação'), isOnline: bool('Mostrar estado online'),
    stats: object('Números apresentados no perfil', { photos: number('Fotografias'), videos: number('Vídeos'), likes: text('Gostos (texto apresentado)') }), postCount: number('Contagem de publicações'), mediaCount: number('Contagem de média'),
  } },
  feed: { label: 'Publicações', hint: 'Adiciona uma foto ou um vídeo, escolhe a visibilidade e guarda o perfil.', fields: {
    posts: { label: 'Publicações', kind: 'posts' },
  } },
  gallery: { label: 'Galeria de fotos', hint: 'Estas fotos aparecem na galeria do perfil, separadas das publicações.', fields: {
    galleryPhotos: array('Fotografias da galeria', object('Fotografia', { url: image('Imagem pública'), caption: text('Legenda'), likes: number('Gostos apresentados'), ...previewFields(false, true) }), () => ({ id: itemId(), url: '', caption: '', likes: 0, unlocked: false })),
  } },
  audio: { label: 'Áudios', hint: 'Adiciona e organiza as notas de voz do perfil.', fields: {
    voiceNotes: array('Notas de voz', object('Nota de voz', { title: text('Título'), duration: text('Duração apresentada'), date: text('Data'), url: text('Ficheiro de áudio', { media: 'audio/*' }), unlocked: bool('Mostrar como prévia aberta') }), () => ({ id: itemId(), title: 'Novo áudio', duration: '', date: '', url: '', unlocked: false })),
  } },
  paywall: { label: 'Vídeo de apresentação', hint: 'Configura o vídeo de apresentação e o momento em que aparece o pedido de pagamento.', fields: {
    previewVideo: video('Vídeo teaser / apresentação'), videoPaywallSeconds: { ...number('Segundos antes de pausar o vídeo'), defaultValue: 4.5, hint: 'Por exemplo: 3 ou 4.5 segundos.' },
    checkoutUrl: text('Link de pagamento principal'), customPaymentButtonText: text('Texto personalizado do botão de pagamento'), preferInternalCheckout: { ...bool('Usar a página interna de pagamento'), defaultValue: true },
  } },
  stories: { label: 'Stories', hint: 'Envia apenas ficheiros de acesso público. Usa uma prévia separada quando o original tiver de ficar protegido.', fields: {
    highlights: array('Stories e destaques', object('Destaque', {
      title: text('Título'), coverImage: image('Capa do destaque'), mediaUrl: text('Fotografia ou vídeo público do story', { media: 'image/*,video/*' }), type: { label: 'Tipo', kind: 'select', options: [{ value: 'image', label: 'Fotografia' }, { value: 'video', label: 'Vídeo' }] }, caption: text('Legenda', { kind: 'long' }), time: text('Data / texto do tempo'), ...previewFields(true),
    }), () => ({ id: itemId(), title: 'Novo destaque', coverImage: '', mediaUrl: '', type: 'image', caption: '', time: '' })),
  } },
  plans: { label: 'Planos e preços', fields: {
    plans: array('Planos em Kwanzas', object('Detalhes do plano', {
      duration: text('Nome / duração'), price: text('Preço apresentado (Kz)'), rawPrice: number('Preço numérico em Kwanzas'), periodLabel: text('Período apresentado'), savings: text('Texto da poupança'), badge: text('Texto do destaque'),
      badgeType: { label: 'Estilo do destaque', kind: 'select', options: [{ value: '', label: 'Sem destaque' }, { value: 'primary', label: 'Principal' }, { value: 'accent', label: 'Alternativo' }, { value: 'popular', label: 'Popular' }] },
      isPopular: bool('Marcar como popular'), checkoutUrl: text('Link de checkout externo'), features: array('Benefícios', text('Benefício'), () => ''),
    }), () => ({ id: itemId(), duration: 'Novo plano', price: '0 Kz', rawPrice: 0, periodLabel: '', checkoutUrl: '', features: [], isPopular: false })),
    checkoutUrl: text('Link de pagamento principal'), tipCheckoutUrl: text('Link para enviar gorjeta'), preferInternalCheckout: { ...bool('Usar a página interna de pagamento'), defaultValue: true },
    mimoPrices: { ...array('Valores dos mimos em Kwanzas', number('Valor em Kz'), () => 0), hint: 'Mantém a mesma ordem dos links abaixo: o primeiro valor corresponde ao primeiro link.' },
    mimoCheckoutUrls: array('Links de checkout dos mimos', text('Link de pagamento'), () => ''),
  } },
  links: { label: 'Páginas e botões', hint: 'Os links abaixo definem o destino dos botões deste perfil. Deixa vazio para manter a ação padrão. Usa um endereço https:// ou um caminho interno iniciado por /.', fields: {
    actionLinks: object('Destino dos botões', {
      subscribe: text('Assinar / desbloquear conteúdo'), message: text('Enviar mensagem'), tip: text('Enviar mimo / gorjeta'), signup: text('Criar conta'), login: text('Entrar'), explore: text('Explorar perfis'), notifications: text('Notificações'),
    }),
  } },
  comments: { label: 'Comentários', hint: 'Gere os comentários apresentados no perfil e nas publicações.', fields: {} },
  variants: { label: 'Versões A/B', hint: 'Gere as versões de apresentação deste perfil.', fields: {} },
  cover: { label: 'Capa do perfil', hint: 'Escolhe uma foto ou um vídeo e ajusta a apresentação no topo da página.', fields: {} },
};

export const FAQ_FIELD: EditorField = array('Perguntas frequentes', object('Pergunta e resposta', { question: text('Pergunta'), answer: text('Resposta', { kind: 'long' }) }), () => ({ question: '', answer: '' }));

export const BANK_FIELDS: Record<string, EditorField> = {
  bankName: text('Banco'), beneficiary: text('Beneficiário'), iban: text('IBAN'), accountNumber: text('Número de conta'), unitelMoney: text('Unitel Money / telefone'), multicaixaEntity: text('Entidade Multicaixa'),
};

