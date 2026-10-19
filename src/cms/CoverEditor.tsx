import React from 'react';
import { ImageIcon, RotateCcw, Video } from 'lucide-react';
import type { Creator } from '../types';
import { PublicationMediaInput, StructuredField } from './editor';

type CoverSettings = NonNullable<Creator['cover']>;
interface CoverEditorProps {
  creator: Creator;
  onChange: (creator: Creator) => void;
  onUpload: (file: File, accept: (url: string) => void) => Promise<void>;
  disabled?: boolean;
}

function looksLikeVideo(url: string | undefined) {
  return Boolean(url && /(?:\.(?:mp4|webm|mov|m4v)(?:[?#]|$)|video%2f|video\/)/i.test(url));
}

export function coverEditorSettings(creator: Creator): CoverSettings {
  return creator.cover || {
    type: creator.bannerVideo || looksLikeVideo(creator.banner) ? 'video' : 'image',
    positionX: 50, positionY: 50, visibility: 'public', blurAmount: 4,
    previewAudio: true, presentation: 'video',
  };
}

export function toLocalDateInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function validateCover(creator: Creator): string | null {
  if (!creator.cover) return null;
  const cover = creator.cover;
  const source = cover.type === 'video' ? creator.bannerVideo || (looksLikeVideo(creator.banner) ? creator.banner : '') : creator.banner;
  if (!source?.trim()) return `Capa: envia ${cover.type === 'video' ? 'um vídeo' : 'uma foto'} antes de guardar.`;
  if (cover.type === 'image' && looksLikeVideo(source)) return 'Capa: escolhe uma imagem para a capa em formato Foto.';
  if (cover.type === 'video' && /\.(?:jpe?g|png|webp|gif|avif|svg)(?:[?#]|$)/i.test(source)) return 'Capa: escolhe um ficheiro de vídeo, não uma imagem.';
  if (![cover.positionX, cover.positionY].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) return 'Capa: a posição deve estar entre 0 e 100.';
  if (!Number.isFinite(cover.blurAmount) || cover.blurAmount < 2 || cover.blurAmount > 12) return 'Capa: o desfoque deve estar entre 2 e 12.';
  if (cover.viewerCount !== undefined && (!Number.isInteger(cover.viewerCount) || cover.viewerCount < 0 || cover.viewerCount > 10000000)) return 'Capa: a audiência indicada deve ser um número inteiro entre 0 e 10.000.000.';
  if (cover.type === 'video' && cover.presentation === 'premiere' && !cover.startsAt) return 'Capa: escolhe a data e a hora de início da estreia gravada.';
  if ((cover.startsAt && !Number.isFinite(Date.parse(cover.startsAt))) || (cover.endsAt && !Number.isFinite(Date.parse(cover.endsAt)))) return 'Capa: a data da estreia é inválida.';
  if (cover.endsAt && (!cover.startsAt || Date.parse(cover.endsAt) <= Date.parse(cover.startsAt))) return 'Capa: o fim da estreia tem de ser posterior ao início.';
  return null;
}

const inputClass = 'w-full rounded-xl border border-white/15 bg-[#11131d] px-3 py-2.5 text-sm text-white outline-none focus:border-pink-400';

export function CoverEditor({ creator, onChange, onUpload, disabled = false }: CoverEditorProps) {
  const cover = coverEditorSettings(creator);
  const isVideo = cover.type === 'video';
  const image = looksLikeVideo(creator.banner) ? '' : creator.banner;
  const video = creator.bannerVideo || (looksLikeVideo(creator.banner) ? creator.banner : '');
  const patch = (changes: Partial<CoverSettings>, media: Partial<Creator> = {}) => {
    const next = { ...cover, ...changes };
    if (next.startsAt === undefined) delete next.startsAt;
    if (next.endsAt === undefined) delete next.endsAt;
    if (next.viewerCount === undefined) delete next.viewerCount;
    onChange({ ...creator, ...media, cover: next });
  };
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const coverStyle: React.CSSProperties = {
    objectPosition: `${cover.positionX}% ${cover.positionY}%`,
    ...(cover.visibility === 'blurred' ? { filter: `blur(${cover.blurAmount}px)`, transform: 'scale(1.05)' } : {}),
  };
  const setSchedule = (key: 'startsAt' | 'endsAt', value: string) => {
    if (!value) { patch({ [key]: undefined }); return; }
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) patch({ [key]: date.toISOString() });
  };

  return <fieldset disabled={disabled} className="min-w-0 space-y-5">
    <fieldset><legend className="mb-2 text-sm font-semibold">Tipo de capa</legend><div className="grid grid-cols-2 gap-3">{([{ type: 'image', label: 'Foto', icon: ImageIcon }, { type: 'video', label: 'Vídeo', icon: Video }] as const).map(({ type, label, icon: Icon }) => <button key={type} type="button" aria-pressed={cover.type === type} onClick={() => patch({ type }, type === 'image' && looksLikeVideo(creator.banner) ? { banner: '' } : {})} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${cover.type === type ? 'border-pink-400/60 bg-pink-500/10 text-pink-100' : 'border-white/10 text-slate-400'}`}><Icon size={20} />{label}</button>)}</div></fieldset>

    <PublicationMediaInput key={cover.type} label={isVideo ? 'Vídeo da capa' : 'Foto da capa'} kind={isVideo ? 'video' : 'photo'} value={isVideo ? video : image} onChange={(url) => patch({}, isVideo ? { bannerVideo: url, ...(looksLikeVideo(creator.banner) ? { banner: '' } : {}) } : { banner: url })} onUpload={onUpload} path={`cover-${creator.id}-main`} showPreview={false} />

    <section className="space-y-4 rounded-xl border border-white/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Enquadramento da capa</h3><p className="mt-1 text-xs text-slate-400">Ajusta a área da capa que fica visível no recorte.</p></div><button type="button" onClick={() => patch({ positionX: 50, positionY: 50 })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300"><RotateCcw size={14} /> Centrar</button></div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141620]"><div className="relative h-[190px] w-full overflow-hidden sm:h-[220px]">{isVideo && video ? <video key={video} src={video} controls playsInline preload="none" muted={!cover.previewAudio} style={coverStyle} className="h-full w-full object-cover" aria-label="Prévia da capa de vídeo" /> : !isVideo && image ? <img src={image} alt="Prévia do enquadramento da capa" style={coverStyle} className="h-full w-full object-cover" /> : <p className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-500">Envia {isVideo ? 'um vídeo' : 'uma foto'} para ajustar a capa.</p>}</div><div className="flex items-center gap-3 border-t border-white/10 bg-[#10121d] px-4 py-3"><div className="-mt-8 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#10121d] bg-pink-950 text-pink-200">{creator.avatar ? <img src={creator.avatar} alt="" className="h-full w-full object-cover" /> : creator.name.slice(0, 1)}</div><p className="min-w-0 truncate text-sm font-semibold">{creator.name}</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2">{([{ key: 'positionX', label: 'Posição horizontal', start: 'Esquerda', end: 'Direita' }, { key: 'positionY', label: 'Posição vertical', start: 'Cima', end: 'Baixo' }] as const).map(({ key, label, start, end }) => <label key={key} className="block space-y-2"><span className="flex justify-between gap-2 text-xs text-slate-300"><span>{label}</span><span>{cover[key]}%</span></span><input aria-label={label} type="range" min="0" max="100" step="1" value={cover[key]} onChange={(event) => patch({ [key]: Number(event.target.value) })} className="w-full accent-pink-500" /><span className="flex justify-between text-[10px] text-slate-500"><span>{start}</span><span>{end}</span></span></label>)}</div>
      <p className="text-[11px] leading-relaxed text-slate-500">O recorte adapta-se à largura do ecrã, mantendo o ponto escolhido.</p>
    </section>

    <StructuredField field={{ label: 'Visibilidade da capa', kind: 'visibility' }} value={cover.visibility} onChange={(visibility) => patch({ visibility })} onUpload={onUpload} path="cover-visibility" />
    {cover.visibility === 'blurred' && <StructuredField field={{ label: 'Intensidade do desfoque', kind: 'range', min: 2, max: 12, defaultValue: 4 }} value={cover.blurAmount} onChange={(blurAmount) => patch({ blurAmount })} onUpload={onUpload} path="cover-blur" />}
    {isVideo && <>
      <StructuredField field={{ label: 'Permitir áudio no vídeo da capa', kind: 'boolean', hint: 'O visitante escolhe quando ativar o som.' }} value={cover.previewAudio} onChange={(previewAudio) => patch({ previewAudio })} onUpload={onUpload} path="cover-audio" />
      <section className="space-y-4 rounded-xl border border-white/10 p-4"><label className="block space-y-2"><span className="text-sm font-semibold">Apresentação do vídeo</span><select aria-label="Apresentação do vídeo da capa" className={inputClass} value={cover.presentation} onChange={(event) => patch({ presentation: event.target.value as CoverSettings['presentation'] })}><option value="video">Vídeo normal</option><option value="premiere">Estreia gravada</option></select></label>
        {cover.presentation === 'premiere' && <><p className="rounded-lg bg-pink-500/5 p-3 text-xs leading-relaxed text-slate-300">A capa será identificada como “Estreia gravada”. Esta opção apresenta um vídeo previamente gravado, com um horário definido.</p><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-2 text-sm text-slate-200"><span className="block">Início da estreia</span><input aria-label="Início da estreia" type="datetime-local" className={inputClass} value={toLocalDateInput(cover.startsAt)} onChange={(event) => setSchedule('startsAt', event.target.value)} /></label><label className="space-y-2 text-sm text-slate-200"><span className="block">Fim da estreia <span className="text-xs text-slate-500">Opcional</span></span><input aria-label="Fim da estreia" type="datetime-local" className={inputClass} value={toLocalDateInput(cover.endsAt)} onChange={(event) => setSchedule('endsAt', event.target.value)} /></label></div><p className="text-xs text-slate-400">Introduz no teu horário local ({timezone}). A página apresenta a programação no horário de Luanda.</p><label className="block space-y-2"><span className="text-sm text-slate-200">Audiência indicada <span className="text-xs text-slate-500">Opcional</span></span><input aria-label="Audiência indicada" type="number" min="0" max="10000000" step="1" className={inputClass} value={cover.viewerCount ?? ''} onChange={(event) => patch({ viewerCount: event.target.value === '' ? undefined : Number(event.target.value) })} /><span className="block text-xs leading-relaxed text-slate-400">Valor introduzido por ti. A página identifica-o como audiência indicada, não como contagem medida de pessoas a assistir.</span></label></>}
      </section>
    </>}
    <p className="text-xs leading-relaxed text-slate-500">Guarda o perfil para publicar a capa. O desfoque controla a apresentação; usa apenas ficheiros preparados para acesso público.</p>
  </fieldset>;
}
