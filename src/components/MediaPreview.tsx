import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { MediaPreviewSettings } from '../types';
import { getMediaUrl } from '../utils/mediaStorage';
import { isMediaPublic, isPreviewAudioAllowed, mediaPreviewSource, previewBlurAmount } from '../utils/mediaPreview';

interface MediaPreviewProps {
  kind: 'image' | 'video';
  src: string;
  poster?: string;
  alt: string;
  settings?: MediaPreviewSettings;
  defaultPublic?: boolean;
  className?: string;
  children?: React.ReactNode;
  onPlaybackChange?: (playing: boolean) => void;
}

const EMPTY_SETTINGS: MediaPreviewSettings = {};

function useResolvedSource(source: string, enabled: boolean) {
  const [resolved, setResolved] = useState<{ source: string; url: string } | null>(null);
  useEffect(() => {
    if (!enabled || !source.startsWith('idb://')) return;
    let active = true;
    void getMediaUrl(source).then((url) => {
      if (active) setResolved({ source, url });
    }).catch(() => { if (active) setResolved(null); });
    return () => { active = false; };
  }, [source, enabled]);
  if (!enabled || !source) return undefined;
  return source.startsWith('idb://') ? resolved?.source === source ? resolved.url : undefined : source;
}

/** Images wait until near the viewport. Video bytes wait for an explicit play. */
export const MediaPreview: React.FC<MediaPreviewProps> = ({
  kind, src, poster, alt, settings = EMPTY_SETTINGS, defaultPublic = false, className = '', children, onPlaybackChange,
}) => {
  const container = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [visible, setVisible] = useState(false);
  const [requestedSource, setRequestedSource] = useState<string | null>(null);
  const [wantsPlayback, setWantsPlayback] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const publicMedia = isMediaPublic(settings, defaultPublic);
  const audioAllowed = isPreviewAudioAllowed(settings, defaultPublic);
  const source = mediaPreviewSource(src, settings, defaultPublic);
  const imageSource = useResolvedSource(kind === 'image' ? source : settings.posterUrl || poster || '', nearViewport);
  const videoSource = useResolvedSource(source, kind === 'video' && nearViewport && requestedSource === source);
  const visualStyle: React.CSSProperties | undefined = publicMedia ? undefined : {
    filter: `blur(${previewBlurAmount(settings)}px) brightness(0.9)`, transform: 'scale(1.055)',
  };

  useEffect(() => {
    const node = container.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true); setVisible(true); return;
    }
    const nearObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearViewport(true); nearObserver.disconnect(); }
    }, { rootMargin: '300px 0px' });
    const visibleObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    nearObserver.observe(node); visibleObserver.observe(node);
    return () => { nearObserver.disconnect(); visibleObserver.disconnect(); };
  }, []);

  useEffect(() => {
    if (!visible) setWantsPlayback(false);
  }, [visible]);

  useEffect(() => {
    setRequestedSource(null); setWantsPlayback(false); setPlaying(false); setMuted(true); setFailed(false);
  }, [source, kind]);

  useEffect(() => {
    const video = player.current;
    if (!video) return;
    if (!wantsPlayback || !visible) {
      video.pause(); setBuffering(false); return;
    }
    if (!videoSource) return;
    setBuffering(true);
    let active = true;
    void video.play().catch(() => {
      if (active) { setWantsPlayback(false); setBuffering(false); }
    });
    return () => { active = false; };
  }, [wantsPlayback, visible, videoSource]);

  useEffect(() => {
    if (kind !== 'video') return;
    const pauseWhenHidden = () => {
      if (document.hidden) { player.current?.pause(); setWantsPlayback(false); }
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, [kind]);

  useEffect(() => { onPlaybackChange?.(playing); }, [playing, onPlaybackChange]);

  const togglePlayback = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (failed) player.current?.load();
    setFailed(false);
    setNearViewport(true);
    setRequestedSource(source);
    setWantsPlayback((wanted) => !wanted);
  };

  return <div ref={container} className={`relative overflow-hidden bg-slate-900 ${className}`} data-media-visibility={publicMedia ? 'public' : 'blurred'}>
    {kind === 'image' ? <img
      src={imageSource} alt={alt} loading="lazy" decoding="async" draggable={false}
      className="absolute inset-0 h-full w-full object-cover" style={visualStyle}
    /> : <>
      {imageSource && !playing && <img src={imageSource} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" style={visualStyle} />}
      <video
        ref={player} src={videoSource} poster={imageSource} preload="none" muted={!audioAllowed || muted}
        playsInline loop aria-label={alt} draggable={false}
        className="absolute inset-0 h-full w-full object-cover" style={visualStyle}
        onPlay={() => setPlaying(true)} onPlaying={() => setBuffering(false)}
        onPause={() => setPlaying(false)} onWaiting={() => setBuffering(true)}
        onError={() => { setFailed(true); setBuffering(false); setWantsPlayback(false); }}
      />
      <div className="absolute inset-x-3 bottom-3 z-30 flex items-center justify-between gap-2">
        <button type="button" onClick={togglePlayback} disabled={!source} aria-label={!source ? 'Vídeo indisponível' : wantsPlayback ? 'Pausar vídeo' : 'Reproduzir prévia'}
          className="flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-black/85 disabled:opacity-60">
          {buffering ? <LoaderCircle className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span>{!source ? 'Vídeo indisponível' : failed ? 'Tentar novamente' : buffering ? 'A carregar…' : playing ? 'Pausar' : 'Ver prévia'}</span>
        </button>
        {audioAllowed ? <button type="button" aria-label={muted ? 'Ativar som da prévia' : 'Desativar som da prévia'} aria-pressed={!muted}
          onClick={(event) => { event.stopPropagation(); setMuted((current) => !current); }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-lg hover:bg-black/85">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button> : <span className="rounded-full bg-black/70 px-3 py-2 text-[10px] font-medium text-white/85">Prévia sem som</span>}
      </div>
      {failed && <p role="status" className="absolute inset-x-3 top-3 z-30 rounded-lg bg-black/75 p-2 text-center text-xs text-white">Não foi possível carregar o vídeo.</p>}
    </>}
    {children}
  </div>;
};
