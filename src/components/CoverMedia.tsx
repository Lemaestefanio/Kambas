import React, { useEffect, useState } from 'react';
import type { Creator } from '../types';
import { getMediaUrl } from '../utils/mediaStorage';
import { resolveCoverMedia } from '../utils/coverMedia';
import { MediaPreview } from './MediaPreview';

interface CoverMediaProps {
  creator: Creator;
  alt: string;
}

function useImageSource(source: string) {
  const [resolved, setResolved] = useState<{ source: string; url: string } | null>(null);
  useEffect(() => {
    if (!source.startsWith('idb://')) return;
    let active = true;
    void getMediaUrl(source).then(url => { if (active) setResolved({ source, url }); }).catch(() => {});
    return () => { active = false; };
  }, [source]);
  return source.startsWith('idb://') ? resolved?.source === source ? resolved.url : undefined : source || undefined;
}

export const CoverMedia: React.FC<CoverMediaProps> = ({ creator, alt }) => {
  const [now, setNow] = useState(Date.now);
  const cover = resolveCoverMedia(creator, now);
  const scheduled = cover.state === 'scheduled';
  const imageSource = useImageSource(cover.type === 'image' ? cover.source : scheduled ? cover.poster || '' : '');

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    let timeout: number | undefined;
    const scheduleNext = () => {
      const current = Date.now();
      const nextBoundary = [cover.startsAt, cover.endsAt]
        .filter((value): value is number => value !== undefined && value > current)
        .sort((a, b) => a - b)[0];
      if (nextBoundary !== undefined) {
        timeout = window.setTimeout(() => {
          refresh();
          scheduleNext();
        }, Math.min(nextBoundary - current + 50, 2_147_483_647));
      }
    };
    if (cover.type === 'video' && creator.cover?.presentation === 'premiere') scheduleNext();
    document.addEventListener('visibilitychange', refresh);
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [cover.startsAt, cover.endsAt, cover.state, cover.type, creator.cover?.presentation]);

  const imageStyle: React.CSSProperties = {
    objectPosition: cover.objectPosition,
    ...(cover.settings.visibility === 'blurred' ? {
      filter: `blur(${cover.settings.blurAmount}px) brightness(0.9)`,
      transform: 'scale(1.055)',
    } : {}),
  };
  const startLabel = cover.startsAt === undefined ? '' : new Intl.DateTimeFormat('pt-AO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Luanda',
  }).format(cover.startsAt);

  return (
    <div className="relative h-[190px] w-full overflow-hidden bg-slate-900 sm:h-[220px]" data-cover-type={cover.type} data-cover-state={cover.state}>
      {cover.type === 'image' || scheduled ? (
        imageSource ? <img key={imageSource} src={imageSource} alt={alt} loading="eager" fetchPriority="high" decoding="async" draggable={false}
          className="h-full w-full select-none object-cover" style={imageStyle} /> : <div className="h-full w-full bg-slate-800" />
      ) : (
        <MediaPreview key={`${creator.id}:${cover.source}:${cover.state}`} kind="video" src={cover.source} alt={alt}
          settings={cover.settings} defaultPublic autoPlay objectPosition={cover.objectPosition} className="h-full w-full" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
      {cover.type === 'video' && (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex flex-wrap items-start justify-between gap-2 text-[10px] font-semibold text-white">
          {cover.state !== 'video' && <span className="rounded-full border border-white/20 bg-black/70 px-3 py-1.5">{cover.state === 'replay' ? 'Reprise' : 'Estreia gravada'}</span>}
          {cover.viewerCount !== undefined && <span className="ml-auto rounded-full border border-white/20 bg-black/70 px-3 py-1.5">Audiência indicada: {cover.viewerCount.toLocaleString('pt-AO')}</span>}
        </div>
      )}
      {scheduled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 px-5 text-center text-white">
          <p className="text-sm font-semibold">Estreia programada</p>
          {cover.startsAt !== undefined && <time dateTime={new Date(cover.startsAt).toISOString()} className="mt-2 text-xs">{startLabel} · Luanda</time>}
        </div>
      )}
    </div>
  );
};
