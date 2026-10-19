import React, { act } from 'react';
import type { Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { installTestDOM } from './dom-environment';
import { useMobileViewport } from '../src/hooks/useMobileViewport';

// This models viewport events, not CSS layout. Real 320/390px layout, computed
// input sizes and keyboard visibility are verified in the browser preview.
const dom = installTestDOM();
const viewportListeners = new Map<string, Set<() => void>>();
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;
let mobile = true;
const viewport = {
  height: 844, offsetTop: 0, scale: 1,
  addEventListener(type: string, callback: () => void) {
    if (!viewportListeners.has(type)) viewportListeners.set(type, new Set());
    viewportListeners.get(type)!.add(callback);
  },
  removeEventListener(type: string, callback: () => void) { viewportListeners.get(type)?.delete(callback); },
  emit(type: string) { viewportListeners.get(type)?.forEach(callback => callback()); },
};
Object.defineProperties(dom.window, {
  visualViewport: { configurable: true, value: viewport },
  innerHeight: { configurable: true, writable: true, value: 844 },
  innerWidth: { configurable: true, writable: true, value: 390 },
  matchMedia: { configurable: true, value: () => ({ get matches() { return mobile; } }) },
  requestAnimationFrame: { configurable: true, value: (callback: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  } },
  cancelAnimationFrame: { configurable: true, value: (id: number) => { frames.delete(id); } },
});

let root: Root | undefined;
let createRoot: typeof import('react-dom/client').createRoot;
let container: HTMLElement;
const page = dom.window.document.documentElement;
function Probe() {
  useMobileViewport();
  return <><input aria-label="Editar" /><input aria-label="Só leitura" readOnly /><button>Acção</button><textarea aria-label="Mensagem" /></>;
}
beforeAll(async () => { ({ createRoot } = await import('react-dom/client')); });
beforeEach(() => {
  viewport.height = 844; viewport.offsetTop = 0; viewport.scale = 1;
  dom.window.innerHeight = 844; dom.window.innerWidth = 390;
  mobile = true;
  frames.clear();
  page.removeAttribute('style');
  page.removeAttribute('data-keyboard-open');
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  root = undefined;
  container.remove();
  expect([...viewportListeners.values()].every(listeners => listeners.size === 0)).toBe(true);
  expect(frames.size).toBe(0);
});
afterAll(() => dom.restore());
async function mount() {
  root = createRoot(container);
  await act(async () => { root!.render(<Probe />); });
}
function flushFrames() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(0));
}
function focus(selector: string) { container.querySelector<HTMLElement>(selector)!.focus(); }
function resize(height: number, offsetTop = 0) {
  viewport.height = height; viewport.offsetTop = offsetTop;
  viewport.emit('resize'); flushFrames();
}

describe('mobile keyboard viewport lifecycle', () => {
  test('a focused editable control tracks the available height and clears keyboard state on blur', async () => {
    await mount();
    expect(page.style.getPropertyValue('--app-viewport-height')).toBe('844px');
    focus('input:not([readonly])');
    resize(430, 18);
    expect(page.style.getPropertyValue('--app-viewport-height')).toBe('430px');
    expect(page.style.getPropertyValue('--app-viewport-top')).toBe('18px');
    expect(page.getAttribute('data-keyboard-open')).toBe('true');
    container.querySelector<HTMLInputElement>('input:not([readonly])')!.blur();
    flushFrames();
    expect(page.hasAttribute('data-keyboard-open')).toBe(false);
  });

  test('browser chrome, read-only fields and desktop resizing do not count as an open keyboard', async () => {
    await mount();
    resize(430);
    expect(page.hasAttribute('data-keyboard-open')).toBe(false);
    focus('input[readonly]'); resize(430);
    expect(page.hasAttribute('data-keyboard-open')).toBe(false);
    focus('input:not([readonly])'); resize(750);
    expect(page.hasAttribute('data-keyboard-open')).toBe(false);
    mobile = false; resize(430);
    expect(page.hasAttribute('data-keyboard-open')).toBe(false);
  });

  test('pinch zoom does not resize overlays or falsely hide the navigation', async () => {
    await mount();
    focus('textarea'); flushFrames();
    viewport.scale = 2;
    resize(300, 40);
    expect(page.style.getPropertyValue('--app-viewport-height')).toBe('844px');
    expect(page.style.getPropertyValue('--app-viewport-top')).toBe('0px');
    expect(page.hasAttribute('data-keyboard-open')).toBe(false);
    viewport.scale = 1;
    resize(430);
    expect(page.getAttribute('data-keyboard-open')).toBe('true');
  });

  test('rotation resets the height baseline instead of keeping a false keyboard state', async () => {
    await mount();
    focus('textarea'); resize(430);
    expect(page.getAttribute('data-keyboard-open')).toBe('true');
    dom.window.innerWidth = 844;
    dom.window.innerHeight = 390;
    resize(390);
    expect(page.style.getPropertyValue('--app-viewport-height')).toBe('390px');
    expect(page.hasAttribute('data-keyboard-open')).toBe(false);
  });

  test('cleanup cancels queued updates and restores the pre-existing page state', async () => {
    page.style.setProperty('--app-viewport-height', '600px');
    page.style.setProperty('--app-viewport-top', '8px');
    page.setAttribute('data-keyboard-open', 'previous');
    await mount();
    focus('textarea');
    viewport.emit('resize');
    expect(frames.size).toBe(1);
    await act(async () => { root!.unmount(); });
    root = undefined;
    expect(page.style.getPropertyValue('--app-viewport-height')).toBe('600px');
    expect(page.style.getPropertyValue('--app-viewport-top')).toBe('8px');
    expect(page.getAttribute('data-keyboard-open')).toBe('previous');
    viewport.emit('scroll');
    dom.window.dispatchEvent(new dom.window.Event('resize'));
    document.dispatchEvent(new Event('focusin'));
    expect(frames.size).toBe(0);
  });
});
