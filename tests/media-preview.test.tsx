import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { installTestDOM } from './dom-environment';
import { isMediaPublic, isPreviewAudioAllowed, mediaPreviewSource, previewBlurAmount } from '../src/utils/mediaPreview';

const dom = installTestDOM();
const resolveMedia = mock(async (source: string) => source.startsWith('idb://')
  ? `blob:https://preview.example/${source.slice(6)}` : source);
mock.module(new URL('../src/utils/mediaStorage.ts', import.meta.url).pathname, () => ({ getMediaUrl: resolveMedia }));

class ObservedViewport {
  static instances: ObservedViewport[] = [];
  targets = new Set<Element>();
  constructor(public callback: IntersectionObserverCallback, public options: IntersectionObserverInit = {}) {
    ObservedViewport.instances.push(this);
  }
  observe(target: Element) { this.targets.add(target); }
  unobserve(target: Element) { this.targets.delete(target); }
  disconnect() { this.targets.clear(); }
  takeRecords() { return []; }
  emit(isIntersecting: boolean, intersectionRatio = isIntersecting ? 1 : 0) {
    const entries = [...this.targets].map(target => ({ target, isIntersecting, intersectionRatio }));
    if (entries.length) this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
}
const previousObserver = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
Object.defineProperty(globalThis, 'IntersectionObserver', { configurable: true, value: ObservedViewport });
let MediaPreview: typeof import('../src/components/MediaPreview').MediaPreview;
let createRoot: typeof import('react-dom/client').createRoot;
let root: Root | undefined;
let container: HTMLElement;
const play = mock(function (this: HTMLMediaElement) {
  this.dispatchEvent(new Event('play'));
  this.dispatchEvent(new Event('playing'));
  return Promise.resolve();
});
const pause = mock(function (this: HTMLMediaElement) { this.dispatchEvent(new Event('pause')); });
Object.defineProperty(dom.window.HTMLMediaElement.prototype, 'play', { configurable: true, value: play });
Object.defineProperty(dom.window.HTMLMediaElement.prototype, 'pause', { configurable: true, value: pause });

beforeAll(async () => {
  ({ createRoot } = await import('react-dom/client'));
  ({ MediaPreview } = await import('../src/components/MediaPreview'));
});
beforeEach(() => {
  resolveMedia.mockClear(); play.mockClear(); pause.mockClear();
  ObservedViewport.instances = [];
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  root = undefined;
  container.remove();
});
afterAll(() => {
  if (previousObserver) Object.defineProperty(globalThis, 'IntersectionObserver', previousObserver);
  else Reflect.deleteProperty(globalThis, 'IntersectionObserver');
  dom.restore();
});

const mediaUrl = 'https://media.example/paid-original.mp4';
const previewUrl = 'https://media.example/preview.mp4';
const posterUrl = 'https://media.example/poster.webp';
async function renderPreview(settings: React.ComponentProps<typeof MediaPreview>['settings'] = {}, kind: 'image' | 'video' = 'video', autoPlay: boolean | 'default' = false) {
  root = createRoot(container);
  await act(async () => { root!.render(<MediaPreview kind={kind} src={mediaUrl} poster={posterUrl} alt="Media de teste" settings={settings} autoPlay={autoPlay === 'default' ? undefined : autoPlay} />); });
}
async function enterViewport() {
  await act(async () => { [...ObservedViewport.instances].forEach(observer => observer.emit(true)); });
}
async function click(label: string) {
  const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  expect(button).not.toBeNull();
  await act(async () => { button!.click(); });
}

describe('administrator media visibility and audio policy', () => {
  test('explicit visibility takes priority over legacy unlocked flags', () => {
    expect(isMediaPublic({ visibility: 'public', unlocked: false })).toBe(true);
    expect(isMediaPublic({ visibility: 'blurred', unlocked: true }, true)).toBe(false);
    expect(isMediaPublic({ unlocked: true })).toBe(true);
    expect(isMediaPublic({})).toBe(false);
    expect(isMediaPublic({}, true)).toBe(true);
  });
  test('blur remains within 2–12px and invalid values use the subtle 4px default', () => {
    for (const blurAmount of [undefined, NaN, Infinity, -Infinity]) expect(previewBlurAmount({ blurAmount })).toBe(4);
    expect(previewBlurAmount({ blurAmount: -10 })).toBe(2);
    expect(previewBlurAmount({ blurAmount: 2 })).toBe(2);
    expect(previewBlurAmount({ blurAmount: 7 })).toBe(7);
    expect(previewBlurAmount({ blurAmount: 50 })).toBe(12);
  });
  test('blurred previews require an explicit audio grant; public media can explicitly mute', () => {
    expect(isPreviewAudioAllowed({})).toBe(false);
    expect(isPreviewAudioAllowed({ visibility: 'blurred', previewAudio: true })).toBe(true);
    expect(isPreviewAudioAllowed({ visibility: 'blurred', previewAudio: false })).toBe(false);
    expect(isPreviewAudioAllowed({ visibility: 'public' })).toBe(true);
    expect(isPreviewAudioAllowed({ visibility: 'public', previewAudio: false })).toBe(false);
    expect(isPreviewAudioAllowed({}, true)).toBe(true);
  });
  test('a configured blurred preview replaces the original source without affecting public media', () => {
    expect(mediaPreviewSource(mediaUrl, { visibility: 'blurred', previewUrl: ` ${previewUrl} ` })).toBe(previewUrl);
    expect(mediaPreviewSource(mediaUrl, { visibility: 'public', previewUrl })).toBe(mediaUrl);
    expect(mediaPreviewSource(mediaUrl, { previewUrl: ' ' })).toBe(mediaUrl);
  });
});

describe('preview network and playback boundaries', () => {
  test('initial HTML exposes neither video nor poster sources before viewport observation', () => {
    const html = renderToStaticMarkup(<MediaPreview kind="video" src={mediaUrl} poster={posterUrl} alt="Teste" settings={{ previewUrl }} />);
    expect(html).toContain('preload="none"');
    expect(html).not.toContain('src=');
    expect(html).not.toContain(mediaUrl);
    expect(html).not.toContain(previewUrl);
    expect(html).not.toContain(posterUrl);
    expect(html.toLowerCase()).not.toContain('autoplay');
  });

  test('entering the viewport loads a poster, but video bytes wait for a play click', async () => {
    await renderPreview({ visibility: 'public' });
    expect(resolveMedia).not.toHaveBeenCalled();
    expect(container.querySelector('video')!.getAttribute('src')).toBeNull();
    await enterViewport();
    expect(container.querySelector('video')!.getAttribute('poster')).toBe(posterUrl);
    expect(container.querySelector('img')!.getAttribute('src')).toBe(posterUrl);
    expect(container.querySelector('video')!.getAttribute('src')).toBeNull();
    expect(play).not.toHaveBeenCalled();
    await click('Reproduzir prévia');
    expect(container.querySelector('video')!.getAttribute('src')).toBe(mediaUrl);
    expect(play).toHaveBeenCalledTimes(1);
  });

  test('blurred preview uses its configured clip and keeps sound unavailable by default', async () => {
    await renderPreview({ visibility: 'blurred', previewUrl });
    await enterViewport();
    await click('Reproduzir prévia');
    const video = container.querySelector('video')!;
    expect(video.getAttribute('src')).toBe(previewUrl);
    expect(video.style.filter).toContain('blur(4px)');
    expect(video.muted).toBe(true);
    expect(container.querySelector('[aria-label="Ativar som da prévia"]')).toBeNull();
    expect(container.textContent).toContain('Prévia sem som');
    expect(resolveMedia.mock.calls.map(([source]) => source)).not.toContain(mediaUrl);
  });

  test('public media starts muted and the visitor can deliberately enable allowed audio', async () => {
    await renderPreview({ visibility: 'public' });
    const video = container.querySelector('video')!;
    expect(video.style.filter).toBe('');
    expect(video.muted).toBe(true);
    await click('Ativar som da prévia');
    expect(video.muted).toBe(false);
    expect(resolveMedia).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });

  test('an explicit public audio override removes the sound button', async () => {
    await renderPreview({ visibility: 'public', previewAudio: false });
    expect(container.querySelector('[aria-label="Ativar som da prévia"]')).toBeNull();
    expect(container.querySelector('video')!.muted).toBe(true);
  });

  test('playback pauses after leaving the viewport and when the document is hidden', async () => {
    await renderPreview({ visibility: 'public' });
    await enterViewport();
    await click('Reproduzir prévia');
    const visibleObserver = ObservedViewport.instances.find(observer => !observer.options.rootMargin)!;
    const beforeExit = pause.mock.calls.length;
    await act(async () => { visibleObserver.emit(false); });
    expect(pause.mock.calls.length).toBeGreaterThan(beforeExit);
    expect(container.querySelector('[aria-label="Reproduzir prévia"]')).not.toBeNull();
    await act(async () => { visibleObserver.emit(true); });
    expect(play).toHaveBeenCalledTimes(1);
    await click('Reproduzir prévia');
    const beforeHide = pause.mock.calls.length;
    await act(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(pause.mock.calls.length).toBeGreaterThan(beforeHide);
    expect(container.querySelector('[aria-label="Reproduzir prévia"]')).not.toBeNull();
  });

  test('images also wait for proximity to the viewport before resolving their source', async () => {
    await renderPreview({ visibility: 'public' }, 'image');
    expect(container.querySelector('img')!.getAttribute('src')).toBeNull();
    expect(resolveMedia).not.toHaveBeenCalled();
    await enterViewport();
    expect(container.querySelector('img')!.getAttribute('src')).toBe(mediaUrl);
    expect(container.querySelector('img')!.getAttribute('loading')).toBe('lazy');
  });

  test('local video blobs are not read from IndexedDB until play is requested', async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(<MediaPreview kind="video" src="idb://local-video" alt="Prévia local" settings={{ visibility: 'public' }} autoPlay={false} />);
    });
    await enterViewport();
    expect(resolveMedia).not.toHaveBeenCalled();
    expect(container.querySelector('video')!.getAttribute('src')).toBeNull();
    await click('Reproduzir prévia');
    expect(resolveMedia.mock.calls.map(([source]) => source)).toEqual(['idb://local-video']);
    expect(container.querySelector('video')!.getAttribute('src')).toBe('blob:https://preview.example/local-video');
    expect(play).toHaveBeenCalledTimes(1);
  });
});

describe('silent previews in the visible viewport', () => {
  for (const visibility of ['public', 'blurred'] as const) {
    test(`${visibility} starts silently only after at least 20 percent is visible`, async () => {
      await renderPreview({ visibility, previewUrl }, 'video', 'default');
      const video = container.querySelector('video')!;
      const near = ObservedViewport.instances.find(observer => !!observer.options.rootMargin)!;
      const visible = ObservedViewport.instances.find(observer => !observer.options.rootMargin)!;
      expect(visible.options.threshold).toBe(0.2);
      await act(async () => { near.emit(true); visible.emit(true, 0.19); });
      expect(video.getAttribute('poster')).toBe(posterUrl);
      expect(video.getAttribute('src')).toBeNull();
      expect(play).not.toHaveBeenCalled();
      await act(async () => { visible.emit(true, 0.2); });
      expect(video.getAttribute('src')).toBe(visibility === 'public' ? mediaUrl : previewUrl);
      expect(video.muted).toBe(true);
      expect(play).toHaveBeenCalledTimes(1);
    });
  }

  test('leaving the viewport or hiding the tab removes the source; every automatic return is muted', async () => {
    await renderPreview({ visibility: 'public' }, 'video', 'default');
    await enterViewport();
    const video = container.querySelector('video')!;
    const visible = ObservedViewport.instances.find(observer => !observer.options.rootMargin)!;
    await click('Ativar som da prévia');
    expect(video.muted).toBe(false);
    await act(async () => { visible.emit(false); });
    expect(video.getAttribute('src')).toBeNull();
    expect(video.muted).toBe(true);
    await act(async () => { visible.emit(true); });
    expect(video.getAttribute('src')).toBe(mediaUrl);
    expect(video.muted).toBe(true);
    expect(play).toHaveBeenCalledTimes(2);
    await act(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(video.getAttribute('src')).toBeNull();
    await act(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(video.getAttribute('src')).toBe(mediaUrl);
    expect(video.muted).toBe(true);
    expect(play).toHaveBeenCalledTimes(3);
  });

  test('a manual pause remains paused while the same preview stays visible', async () => {
    await renderPreview({ visibility: 'public' }, 'video', 'default');
    await enterViewport();
    await click('Pausar vídeo');
    await enterViewport();
    expect(container.querySelector('[aria-label="Reproduzir prévia"]')).not.toBeNull();
    expect(play).toHaveBeenCalledTimes(1);
  });

  test('blocked automatic playback offers a play action without a false media error', async () => {
    play.mockImplementationOnce(() => Promise.reject(new Error('Autoplay blocked')));
    await renderPreview({ visibility: 'public' }, 'video', 'default');
    await enterViewport();
    expect(container.querySelector('[aria-label="Reproduzir prévia"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Vídeo indisponível');
    await click('Reproduzir prévia');
    expect(play).toHaveBeenCalledTimes(2);
  });

  test('buffering uses an accessible busy state without loading copy', async () => {
    await renderPreview({ visibility: 'public' }, 'video', 'default');
    await enterViewport();
    await act(async () => { container.querySelector('video')!.dispatchEvent(new Event('waiting')); });
    expect(container.querySelector('button[aria-busy="true"]')).not.toBeNull();
    expect(container.textContent?.toLowerCase()).not.toContain('carregar');
    expect(container.textContent?.toLowerCase()).not.toContain('loading');
  });

  test('late media events cannot restart a preview after it leaves the viewport', async () => {
    const playbackChanged = mock((_playing: boolean) => {});
    root = createRoot(container);
    await act(async () => {
      root!.render(<MediaPreview kind="video" src={mediaUrl} alt="Prévia" settings={{ visibility: 'public' }} onPlaybackChange={playbackChanged} />);
    });
    await enterViewport();
    const visible = ObservedViewport.instances.find(observer => !observer.options.rootMargin)!;
    const video = container.querySelector('video')!;
    await act(async () => { visible.emit(false); });
    await act(async () => { video.dispatchEvent(new Event('play')); video.dispatchEvent(new Event('playing')); });
    expect(video.getAttribute('src')).toBeNull();
    expect(container.querySelector('[aria-label="Reproduzir prévia"]')).not.toBeNull();
    expect(playbackChanged.mock.calls.at(-1)).toEqual([false]);
    expect(play).toHaveBeenCalledTimes(1);
  });
});
