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
  emit(isIntersecting: boolean) {
    const entries = [...this.targets].map(target => ({ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 }));
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
async function renderPreview(settings: React.ComponentProps<typeof MediaPreview>['settings'] = {}, kind: 'image' | 'video' = 'video') {
  root = createRoot(container);
  await act(async () => { root!.render(<MediaPreview kind={kind} src={mediaUrl} poster={posterUrl} alt="Media de teste" settings={settings} />); });
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
  test('initial HTML exposes neither video nor poster sources and never autoplays', () => {
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
      root!.render(<MediaPreview kind="video" src="idb://local-video" alt="Prévia local" settings={{ visibility: 'public' }} />);
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
