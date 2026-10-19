import React, { act } from 'react';
import type { Root } from 'react-dom/client';
import type { Creator } from '../src/types';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { installTestDOM } from './dom-environment';

// Separate Bun process: these listeners model independent server arrivals,
// while real React components decide when and which profile may be displayed.
const dom = installTestDOM();
type Listener = { next: (value: any) => void; fail: (error: Error) => void };
const creatorsListeners = new Set<Listener>();
const settingsListeners = new Set<Listener>();
function subscribe(listeners: Set<Listener>, next: Listener['next'], fail: Listener['fail']) {
  const listener = { next, fail };
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
const unexpected = () => { throw new Error('Unexpected Firebase mutation in readiness test'); };
mock.module(new URL('../src/firebase.ts', import.meta.url).pathname, () => ({
  db: {}, auth: { currentUser: null },
  OperationType: { CREATE: 'create', UPDATE: 'update', DELETE: 'delete', LIST: 'list', GET: 'get', WRITE: 'write' },
  subscribeToCreators: (next: Listener['next'], fail: Listener['fail']) => subscribe(creatorsListeners, next, fail),
  subscribeToSiteSettings: (next: Listener['next'], fail: Listener['fail']) => subscribe(settingsListeners, next, fail),
  onAuthChange: (next: (value: null) => void) => { next(null); return () => {}; },
  onAdminAuthChange: () => () => {},
  handleFirestoreError: unexpected, testConnection: unexpected,
  seedInitialCreatorsIfEmpty: unexpected, updateCreatorAvatarInFirestore: unexpected,
  saveCreatorToFirestore: unexpected, batchUpdateAvatarsInFirestore: unexpected,
  signInWithGoogle: unexpected, signInAnonymouslyWithNickname: unexpected,
  signOutUser: unexpected, saveSiteSettings: unexpected, publishInitialContent: unexpected,
  deleteCreatorFromFirestore: unexpected, uploadAdminMedia: unexpected,
}));

let PlatformApp: React.ComponentType;
let createRoot: typeof import('react-dom/client').createRoot;
let profilePageUrl: typeof import('../src/cms/AdminPageLinks').profilePageUrl;
let root: Root | undefined;
let container: HTMLElement;
const publishedCreator = (id: string): Creator => ({
  id, name: `Perfil publicado ${id}`, shortName: `Publicado ${id}`, handle: `@${id}`, age: 25,
  city: 'Luanda', neighborhood: 'Centro', verified: true, isOnline: false,
  avatar: `/assets/current-${id}.webp`, banner: '', stats: { photos: 0, videos: 0, likes: '0' },
  bio: `Biografia actualizada do perfil ${id}.`, postCount: 0, mediaCount: 0,
  highlights: [], galleryPhotos: [], voiceNotes: [], posts: [], incomingMessage: '',
  whatsappNumber: '', plans: [], managedComments: [],
});
const published = [publishedCreator('one'), publishedCreator('two')];

beforeAll(async () => {
  ({ createRoot } = await import('react-dom/client'));
  PlatformApp = (await import('../src/PlatformApp')).default;
  ({ profilePageUrl } = await import('../src/cms/AdminPageLinks'));
});
beforeEach(() => {
  dom.window.sessionStorage.clear();
  dom.window.localStorage.clear();
  dom.window.history.replaceState(null, '', '/');
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  root = undefined;
  container.remove();
  expect(creatorsListeners.size).toBe(0);
  expect(settingsListeners.size).toBe(0);
});
afterAll(() => dom.restore());

async function renderPlatform(route = '/') {
  dom.window.history.replaceState(null, '', route);
  root = createRoot(container);
  await act(async () => { root!.render(<PlatformApp />); });
}
async function sendCreators(value = published) {
  await act(async () => { [...creatorsListeners].forEach(listener => listener.next(value)); });
}
async function sendSettings() {
  await act(async () => { [...settingsListeners].forEach(listener => listener.next(null)); });
}
function expectNeutral() {
  expect(container.querySelector('[role="status"]')).not.toBeNull();
  expect(container.querySelector('video, audio')).toBeNull();
  expect(container.textContent).not.toContain('Perfil publicado');
  const images = Array.from(container.querySelectorAll('img'));
  expect(images).toHaveLength(1);
  expect(images[0].getAttribute('src')).toBe('/assets/platform-logo.png');
}

describe('current published profile readiness', () => {
  test('creator data arriving first cannot reveal a profile before site settings arrive', async () => {
    await renderPlatform('/?creator=two');
    expectNeutral();
    await sendCreators();
    expectNeutral();
    await sendSettings();
    expect(container.textContent).toContain(published[1].bio);
    expect(container.querySelector(`img[src="${published[1].avatar}"]`)).not.toBeNull();
    expect(container.querySelector('img[src="/assets/profile.jpg"]')).toBeNull();
  });

  test('settings arriving first cannot briefly reveal the bundled fallback profile', async () => {
    await renderPlatform();
    await sendSettings();
    expectNeutral();
    await sendCreators();
    expect(container.textContent).toContain(published[0].bio);
    expect(container.querySelector('img[src="/assets/profile.jpg"]')).toBeNull();
  });

  test('a failed subscription shows a retry action and restarts both listeners', async () => {
    await renderPlatform();
    const oldCreators = [...creatorsListeners][0];
    const oldSettings = [...settingsListeners][0];
    await act(async () => { oldCreators.fail(new Error('Connection unavailable')); });
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector('video, audio')).toBeNull();
    const retry = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Tentar novamente');
    expect(retry).not.toBeUndefined();
    await act(async () => { retry!.click(); });
    expect(creatorsListeners.has(oldCreators)).toBe(false);
    expect(settingsListeners.has(oldSettings)).toBe(false);
    expectNeutral();
    await sendCreators();
    await sendSettings();
    expect(container.textContent).toContain(published[0].bio);
  });
});

describe('administrative sharing resolves after the live catalogue arrives', () => {
  for (const path of ['/', '/perfil-3', '/promo-3', '/mensagens']) {
    test(path, async () => {
      const selected = published[1];
      const url = new URL(profilePageUrl('https://preview.example', path, selected.id));
      await renderPlatform(url.pathname + url.search);
      expectNeutral();
      await sendSettings();
      await sendCreators();
      expect(container.textContent).toContain(path === '/mensagens' ? selected.name : selected.bio);
    });
  }
  test('an unknown creator falls back to the published catalogue', async () => {
    await renderPlatform('/?creator=deleted-profile');
    await sendCreators();
    await sendSettings();
    expect(container.textContent).toContain(published[0].bio);
    expect(container.querySelector('img[src="/assets/profile.jpg"]')).toBeNull();
  });
});
