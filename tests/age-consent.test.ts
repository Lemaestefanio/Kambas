import React, { act } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Root } from 'react-dom/client';
import { installTestDOM } from './dom-environment';
import { AGE_CONSENT_KEY, hasAgeConsent, rememberAgeConsent } from '../src/utils/ageConsent';

// Run this file in its own Bun process: the lazy platform is a sentinel module.
const dom = installTestDOM();
let platformImports = 0;
let platformRenders = 0;
mock.module(new URL('../src/PlatformApp.tsx', import.meta.url).pathname, () => {
  platformImports++;
  return { default: () => {
    platformRenders++;
    return React.createElement('main', { 'data-platform': 'ready' }, 'Catalogue sentinel');
  } };
});
let App: React.ComponentType;
let createRoot: typeof import('react-dom/client').createRoot;
let root: Root | undefined;
let container: HTMLElement;
const session = dom.window.sessionStorage;

beforeAll(async () => {
  ({ createRoot } = await import('react-dom/client'));
  App = (await import('../src/App')).default;
});
beforeEach(() => {
  Object.defineProperty(dom.window, 'sessionStorage', { configurable: true, value: session });
  session.clear();
  dom.window.localStorage.clear();
  dom.window.history.replaceState(null, '', '/');
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  root = undefined;
  container.remove();
});
afterAll(() => dom.restore());

async function renderApp() {
  root = createRoot(container);
  await act(async () => { root!.render(React.createElement(App)); });
}
function expectOnlyGate() {
  expect(container.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
  expect(container.textContent).toContain('Tens 18 anos ou mais?');
  expect(container.querySelector('[data-platform]')).toBeNull();
  expect(container.querySelector('video, audio, source, iframe')).toBeNull();
  const images = Array.from(container.querySelectorAll('img'));
  expect(images).toHaveLength(1);
  expect(images[0].getAttribute('src')).toBe('/assets/platform-logo.png');
  expect(images[0].getAttribute('alt')).toBe('Luanda Privé');
}
function confirmationButton() {
  return Array.from(container.querySelectorAll('button')).find(button =>
    button.textContent?.startsWith('Sim, tenho 18 anos'))!;
}

describe('age declaration precedes every route and platform module', () => {
  for (const route of ['/', '/perfil-3', '/promo-3', '/mensagens', '/comentarios', '/checkout', '/admin-luanda-prive']) {
    test(`no catalogue, player or Firebase import before consent on ${route}`, async () => {
      dom.window.history.replaceState(null, '', route);
      await renderApp();
      expectOnlyGate();
      expect(platformImports).toBe(0);
    });
  }

  test('a remembered login or an old local-storage age flag does not bypass the declaration', async () => {
    session.setItem('luanda_prive_user', JSON.stringify({ uid: 'existing-member', displayName: 'Member' }));
    dom.window.localStorage.setItem(AGE_CONSENT_KEY, 'confirmed');
    dom.window.localStorage.setItem('ageVerified', 'true');
    await renderApp();
    expectOnlyGate();
  });

  test('declining keeps the platform inaccessible and does not save consent', async () => {
    await renderApp();
    const no = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.startsWith('Não, tenho menos'))!;
    await act(async () => { no.click(); });
    expect(container.textContent).toContain('Acesso reservado a adultos');
    expect(container.querySelector('[data-platform], video, audio')).toBeNull();
    expect(session.getItem(AGE_CONSENT_KEY)).toBeNull();
    expect(platformImports).toBe(0);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  test('explicit confirmation opens the platform and remembers only the current session', async () => {
    await renderApp();
    await act(async () => { confirmationButton().click(); });
    expect(container.querySelector('[data-platform="ready"]')).not.toBeNull();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(session.getItem(AGE_CONSENT_KEY)).toBe('confirmed');
    expect(dom.window.localStorage.getItem(AGE_CONSENT_KEY)).toBeNull();
  });

  test('a previously confirmed tab can reopen without another declaration', async () => {
    session.setItem(AGE_CONSENT_KEY, 'confirmed');
    await renderApp();
    expect(container.querySelector('[data-platform="ready"]')).not.toBeNull();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  test('blocked storage fails closed, but a fresh explicit click still opens the mounted page', async () => {
    Object.defineProperty(dom.window, 'sessionStorage', {
      configurable: true,
      get() { throw new Error('Storage blocked'); },
    });
    expect(hasAgeConsent()).toBe(false);
    expect(() => rememberAgeConsent()).not.toThrow();
    const before = platformRenders;
    await renderApp();
    expectOnlyGate();
    expect(platformRenders).toBe(before);
    await act(async () => { confirmationButton().click(); });
    expect(container.querySelector('[data-platform="ready"]')).not.toBeNull();
    expect(hasAgeConsent()).toBe(false);
  });
});

describe('consent storage rejects malformed and legacy values', () => {
  for (const value of ['', 'true', 'false', '1', 'CONFIRMED', ' confirmed ', 'null', '{}', '{broken', '"confirmed"']) {
    test(JSON.stringify(value), () => {
      session.setItem(AGE_CONSENT_KEY, value);
      expect(hasAgeConsent()).toBe(false);
    });
  }
  test('the exact confirmation is accepted and a cleared session resets consent', () => {
    rememberAgeConsent();
    expect(hasAgeConsent()).toBe(true);
    session.clear();
    expect(hasAgeConsent()).toBe(false);
  });
});
