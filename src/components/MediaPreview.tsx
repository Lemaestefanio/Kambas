import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { LoaderCircle, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { MediaPreviewSettings } from '../types';
import { getMediaUrl } from '../utils/mediaStorage';
import { isMediaPublic, isPreviewAudioAllowed, mediaPreviewSource, previewBlurAmount } from '../utils/mediaPreview';
import { browserMediaConnection, mediaPlaybackCoordinator, permitsAutomaticVideo } from '../utils/mediaPlayback';

interface MediaPreviewProps {
  kind: 'image' | 'video';
  src: string;
  poster?: string;
  alt: string;
  settings?: MediaPreviewSettings;
  defaultPublic?: boolean;
  autoPlay?: boolean;
  objectPosition?: string;
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

/** Posters load nearby; videos start silently only while visible in an active tab. */
export const MediaPreview: React.FC<MediaPreviewProps> = ({
  kind, src, poster, alt, settings = EMPTY_SETTINGS, defaultPublic = false, autoPlay = true, objectPosition, className = '', children, onPlaybackChange,
}) => {
  const container = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const [playbackId] = useState(() => Symbol('media-player'));
  const lease = useSyncExternalStore(mediaPlaybackCoordinator.subscribe, () => mediaPlaybackCoordinator.lease(playbackId), () => 0);
  const manualIntent = useRef(false);
  const [manualPriority, setManualPriority] = useState(false);
  const [automaticVideoAllowed, setAutomaticVideoAllowed] = useState(() => permitsAutomaticVideo());
  const [nearViewport, setNearViewport] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
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
  const videoSource = useResolvedSource(source, kind === 'video' && lease > 0 && visible && pageVisible && requestedSource === source);
  const visualStyle: React.CSSProperties = {
    objectPosition,
    ...(!publicMedia ? { filter: `blur(${previewBlurAmount(settings)}px) brightness(0.9)`, transform: 'scale(1.055)' } : {}),
  };

  useEffect(() => {
    const node = container.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      let frame = 0;
      const checkViewport = () => {
        const rect = node.getBoundingClientRect();
        const height = window.innerHeight;
        const width = window.innerWidth;
        const visibleHeight = Math.max(0, Math.min(rect.bottom, height) - Math.max(rect.top, 0));
        const visibleWidth = Math.max(0, Math.min(rect.right, width) - Math.max(rect.left, 0));
        setVisible(rect.width > 0 && rect.height > 0 && visibleHeight * visibleWidth / (rect.width * rect.height) >= 0.2);
        if (rect.bottom > -300 && rect.top < height + 300 && rect.right > 0 && rect.left < width) setNearViewport(true);
      };
      const scheduleCheck = () => {
        if (!frame) frame = window.requestAnimationFrame(() => { frame = 0; checkViewport(); });
      };
      checkViewport();
      window.addEventListener('scroll', scheduleCheck, { passive: true, capture: true });
      window.addEventListener('resize', scheduleCheck);
      return () => {
        if (frame) window.cancelAnimationFrame(frame);
        window.removeEventListener('scroll', scheduleCheck, true);
        window.removeEventListener('resize', scheduleCheck);
      };
    }
    const nearObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearViewport(true); nearObserver.disconnect(); }
    }, { rootMargin: '300px 0px' });
    const visibleObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.2), { threshold: 0.2 });
    nearObserver.observe(node); visibleObserver.observe(node);
    return () => { nearObserver.disconnect(); visibleObserver.disconnect(); };
  }, []);

  useEffect(() => {
    if (kind !== 'video') return;
    const connection = browserMediaConnection();
    const update = () => setAutomaticVideoAllowed(permitsAutomaticVideo(connection));
    update();
    connection?.addEventListener?.('change', update);
    return () => connection?.removeEventListener?.('change', update);
  }, [kind]);

  useEffect(() => {
    manualIntent.current = false; setManualPriority(false);
    setRequestedSource(null); setWantsPlayback(false); setPlaying(false); setMuted(true); setFailed(false);
  }, [source, kind]);

  useEffect(() => {
    if (kind !== 'video') return;
    if (!visible || !pageVisible || !source) {
      manualIntent.current = false; setManualPriority(false);
      setWantsPlayback(false); setBuffering(false); setMuted(true);
      return;
    }
    // Connection changes never cancel a clip that the visitor explicitly chose.
    if (manualIntent.current) return;
    if (!autoPlay || !automaticVideoAllowed) { setWantsPlayback(false); return; }
    setNearViewport(true);
    setRequestedSource(source);
    setMuted(true);
    setFailed(false);
    setWantsPlayback(true);
  }, [visible, pageVisible, source, kind, autoPlay, automaticVideoAllowed]);

  useEffect(() => {
    if (kind !== 'video' || !wantsPlayback || !visible || !pageVisible || !source || requestedSource !== source) return;
    // Capture the element: React clears refs before passive unmount cleanup.
    const video = player.current;
    return mediaPlaybackCoordinator.request(playbackId, manualPriority, () => {
      if (video) {
        video.pause(); video.muted = true;
        video.removeAttribute('src');
        video.load();
      }
      setPlaying(false); setBuffering(false); setMuted(true);
    });
  }, [playbackId, manualPriority, kind, source, requestedSource, wantsPlayback, visible, pageVisible]);

  useEffect(() => {
    const video = player.current;
    if (!video) return;
    if (!wantsPlayback || !visible || !pageVisible || !lease) {
      video.pause(); setBuffering(false); return;
    }
    if (!videoSource) return;
    // A lease can be revoked and restored before React commits; restore its URL.
    if (video.getAttribute('src') !== videoSource) video.src = videoSource;
    setBuffering(true);
    let active = true;
    void video.play().catch(() => {
      if (active && mediaPlaybackCoordinator.lease(playbackId) === lease) { setWantsPlayback(false); setPlaying(false); setBuffering(false); }
    });
    return () => { active = false; };
  }, [wantsPlayback, visible, pageVisible, videoSource, lease, playbackId]);

  useEffect(() => {
    if (kind !== 'video') return;
    const pauseWhenHidden = () => {
      setPageVisible(!document.hidden);
      if (document.hidden) { player.current?.pause(); setWantsPlayback(false); setMuted(true); }
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, [kind]);

  const activePlayback = playing && !buffering && visible && pageVisible && wantsPlayback && lease > 0 && Boolean(videoSource);
  useEffect(() => { onPlaybackChange?.(activePlayback); }, [activePlayback, onPlaybackChange]);

  const togglePlayback = (event: React.MouseEvent) => {
    event.stopPropagation();
    const pauseRequested = wantsPlayback && mediaPlaybackCoordinator.lease(playbackId) > 0;
    manualIntent.current = !pauseRequested;
    setManualPriority(!pauseRequested);
    if (failed) player.current?.load();
    setFailed(false);
    setNearViewport(true);
    setRequestedSource(source);
    setWantsPlayback(!pauseRequested);
  };

  const acceptPlaybackEvent = (video: HTMLVideoElement) => {
    if (visible && pageVisible && wantsPlayback && videoSource && lease > 0 && mediaPlaybackCoordinator.lease(playbackId) === lease) return true;
    // A pending play event may arrive after a scroll, manual pause or tab change.
    video.pause(); setPlaying(false); setBuffering(false);
    return false;
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
        onPlay={(event) => { if (acceptPlaybackEvent(event.currentTarget)) setPlaying(true); }}
        onPlaying={(event) => { if (acceptPlaybackEvent(event.currentTarget)) { setPlaying(true); setBuffering(false); } }}
        onPause={() => setPlaying(false)}
        onWaiting={() => { if (visible && pageVisible && wantsPlayback && videoSource && mediaPlaybackCoordinator.lease(playbackId) === lease && lease > 0) setBuffering(true); }}
        onError={() => { if (visible && pageVisible && videoSource && mediaPlaybackCoordinator.lease(playbackId) === lease && lease > 0) { setFailed(true); setBuffering(false); setWantsPlayback(false); } }}
      />
      <div className="absolute inset-x-3 bottom-3 z-30 flex items-center justify-between gap-2">
        <button type="button" onClick={togglePlayback} disabled={!source} aria-busy={buffering} aria-label={!source ? 'Vídeo indisponível' : wantsPlayback && lease > 0 ? 'Pausar vídeo' : 'Reproduzir vídeo'}
          className="flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-black/85 disabled:opacity-60">
          {buffering ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : wantsPlayback && lease > 0 ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
          <span>{!source ? 'Vídeo indisponível' : failed ? 'Tentar novamente' : wantsPlayback && lease > 0 ? 'Pausar' : 'Reproduzir'}</span>
        </button>
        {audioAllowed ? <button type="button" aria-label={muted ? 'Ativar som' : 'Desativar som'} aria-pressed={!muted}
          onClick={(event) => { event.stopPropagation(); setMuted((current) => !current); }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-lg hover:bg-black/85">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button> : <span className="rounded-full bg-black/70 px-3 py-2 text-[10px] font-medium text-white/85">Sem som</span>}
      </div>
      {failed && <p role="status" className="absolute inset-x-3 top-3 z-30 rounded-lg bg-black/75 p-2 text-center text-xs text-white">Vídeo indisponível. Tenta novamente.</p>}
    </>}
    {children}
  </div>;
};
