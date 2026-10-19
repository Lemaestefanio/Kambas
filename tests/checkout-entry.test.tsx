import React, { act } from 'react';
import type { Root } from 'react-dom/client';
import type { Creator } from '../src/types';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { installTestDOM } from './dom-environment';

// Run separately: Firebase and the authentication UI are controlled, while the
// real route, subscription button and plan modal exercise checkout decisions.
const dom = installTestDOM();
type AuthUser = { uid: string; displayName: string; isAnonymous: boolean };
type Listener = { next: (value: any) => void; fail: (error: Error) => void };
const account: AuthUser = { uid: 'verified-account', displayName: 'Conta confirmada', isAnonymous: false };
const anonymous: AuthUser = { uid: 'anonymous-user', displayName: 'Apelido', isAnonymous: true };
const creatorsListeners = new Set<Listener>();
const settingsListeners = new Set<Listener>();
const authListeners = new Set<(value: AuthUser | null) => void>();
let initialUser: AuthUser | null = null;
let emitInitialAuth = true;
function subscribe(listeners: Set<Listener>, next: Listener['next'], fail: Listener['fail']) {
  const listener = { next, fail };
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
const unexpected = () => { throw new Error('Unexpected Firebase mutation in checkout test'); };
mock.module(new URL('../src/firebase.ts', import.meta.url).pathname, () => ({
  db: {}, auth: { currentUser: null },
  OperationType: { CREATE: 'create', UPDATE: 'update', DELETE: 'delete', LIST: 'list', GET: 'get', WRITE: 'write' },
  subscribeToCreators: (next: Listener['next'], fail: Listener['fail']) => subscribe(creatorsListeners, next, fail),
  subscribeToSiteSettings: (next: Listener['next'], fail: Listener['fail']) => subscribe(settingsListeners, next, fail),
  onAuthChange: (next: (value: AuthUser | null) => void) => {
    authListeners.add(next);
    if (emitInitialAuth) next(initialUser);
    return () => { authListeners.delete(next); };
  },
  onAdminAuthChange: () => () => {},
  handleFirestoreError: unexpected, testConnection: unexpected,
  seedInitialCreatorsIfEmpty: unexpected, updateCreatorAvatarInFirestore: unexpected,
  saveCreatorToFirestore: unexpected, batchUpdateAvatarsInFirestore: unexpected,
  signInWithGoogle: unexpected, signInAnonymouslyWithNickname: unexpected,
  signOutUser: unexpected, saveSiteSettings: unexpected, publishInitialContent: unexpected,
  deleteCreatorFromFirestore: unexpected, uploadAdminMedia: unexpected,
}));
mock.module(new URL('../src/components/AuthModal.tsx', import.meta.url).pathname, () => ({
  AuthModal: ({ isOpen, allowAnonymous, onSuccess, onClose }: {
    isOpen: boolean; allowAnonymous?: boolean; onSuccess: (user: AuthUser) => void; onClose: () => void;
  }) => isOpen ? <div role="dialog" data-checkout-auth data-allow-anonymous={String(allowAnonymous)}>
    <button data-auth-account onClick={() => { onSuccess(account); onClose(); }}>Confirmar conta de teste</button>
    <button data-auth-anonymous onClick={() => { onSuccess(anonymous); }}>Simular resposta anónima</button>
    <button data-auth-close onClick={onClose}>Fechar autenticação de teste</button>
  </div> : null,
}));

const navigate = mock((_url: string) => {});
const previousAssign = Object.getOwnPropertyDescriptor(dom.window.location, 'assign');
Object.defineProperty(dom.window.location, 'assign', { configurable: true, value: navigate });
let PlatformApp: React.ComponentType;
let PlansModal: typeof import('../src/components/PlansModal').PlansModal;
let createRoot: typeof import('react-dom/client').createRoot;
let defaultSignInLabel: string;
let root: Root | undefined;
let container: HTMLElement;
const creatorFixture = (): Creator => ({
  id: 'checkout-profile', name: 'Perfil de checkout', shortName: 'Checkout', handle: '@checkout', age: 25,
  city: 'Luanda', neighborhood: 'Centro', verified: true, isOnline: false,
  avatar: '/assets/test-profile.webp', banner: '', stats: { photos: 0, videos: 0, likes: '0' },
  bio: 'Perfil de teste de entrada no checkout.', postCount: 0, mediaCount: 0,
  highlights: [], galleryPhotos: [], voiceNotes: [], posts: [], incomingMessage: '',
  whatsappNumber: '', managedComments: [], customPaymentButtonText: 'Confirmar plano de teste',
  plans: [{ id: '30-days', duration: '30 dias', price: '100 Kz', rawPrice: 100, periodLabel: 'Mensal', checkoutUrl: '', features: [] }],
});

beforeAll(async () => {
  ({ createRoot } = await import('react-dom/client'));
  PlatformApp = (await import('../src/PlatformApp')).default;
  const { DEFAULT_SITE_SETTINGS, resolveCopy } = await import('../src/cms/defaults');
  defaultSignInLabel = resolveCopy(DEFAULT_SITE_SETTINGS, 'home.header.signIn');
});
beforeEach(() => {
  initialUser = null;
  emitInitialAuth = true;
  navigate.mockClear();
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
  expect(authListeners.size).toBe(0);
});
afterAll(() => {
  if (previousAssign) Object.defineProperty(dom.window.location, 'assign', previousAssign);
  else Reflect.deleteProperty(dom.window.location, 'assign');
  dom.restore();
});

async function renderPlatform(route = '/', creator = creatorFixture()) {
  dom.window.history.replaceState(null, '', route);
  root = createRoot(container);
  await act(async () => { root!.render(<PlatformApp />); });
  await act(async () => {
    [...settingsListeners].forEach(listener => listener.next(null));
    [...creatorsListeners].forEach(listener => listener.next([creator]));
  });
}
async function click(element: HTMLElement | null | undefined) {
  expect(element).not.toBeNull();
  expect(element).not.toBeUndefined();
  await act(async () => { element!.click(); });
}
async function enterCheckout() { await click(container.querySelector<HTMLButtonElement>('#plans-section button')); }
function planButton() {
  return Array.from(container.querySelectorAll('button')).find(button => button.textContent?.startsWith('Confirmar plano de teste'));
}
function expectPlans() {
  expect(planButton()).not.toBeUndefined();
  expect(container.querySelector('[data-checkout-auth]')).toBeNull();
}
function expectAccountRequired() {
  expect(container.querySelector('[data-checkout-auth]')?.getAttribute('data-allow-anonymous')).toBe('false');
  expect(planButton()).toBeUndefined();
  expect(navigate).not.toHaveBeenCalled();
}

describe('explicit guest and account checkout versions', () => {
  test('the first guest checkout click opens plans without waiting for another module', async () => {
    await renderPlatform();
    const button = container.querySelector<HTMLButtonElement>('#plans-section button');
    expect(button).not.toBeNull();
    // Deliberately synchronous: a Suspense fallback must not replace this CTA.
    act(() => { button!.click(); });
    expectPlans();
    expect(container.querySelector('[aria-label="A preparar janela"]')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
  for (const route of ['/', '/?version=a', '/checkout', '/perfil-3', '/promo-3', '/perfil-3?version=b', '/promo-3?version=b']) {
    test(`${route} offers plans without requiring an account`, async () => {
      await renderPlatform(route);
      await enterCheckout();
      expectPlans();
      expect(navigate).not.toHaveBeenCalled();
    });
  }
  for (const route of ['/?version=b', '/?mode=login-first']) {
    test(`${route} requests a real account before opening plans`, async () => {
      await renderPlatform(route);
      await enterCheckout();
      expectAccountRequired();
      await click(container.querySelector('[data-auth-account]'));
      expectPlans();
    });
  }
  test('a confirmed account can enter version B directly', async () => {
    initialUser = account;
    await renderPlatform('/?version=b');
    await enterCheckout();
    expectPlans();
  });
  test('an anonymous login does not satisfy version B, even if returned by the authentication UI', async () => {
    initialUser = anonymous;
    await renderPlatform('/?version=b');
    await enterCheckout();
    expectAccountRequired();
    await click(container.querySelector('[data-auth-anonymous]'));
    expectAccountRequired();
  });
  test('a forged session profile cannot replace a confirmed Firebase account', async () => {
    emitInitialAuth = false;
    dom.window.sessionStorage.setItem('luanda_prive_user', JSON.stringify(account));
    await renderPlatform('/?version=b');
    await enterCheckout();
    expectAccountRequired();
  });
  test('version settings can explicitly change each checkout mode', async () => {
    const creator = creatorFixture();
    creator.pageVariants = { b: { label: 'B sem conta', checkoutMode: 'guest' } };
    await renderPlatform('/?version=b', creator);
    await enterCheckout();
    expectPlans();
  });
  test('version A can be configured to require an account', async () => {
    const creator = creatorFixture();
    creator.pageVariants = { a: { label: 'A com conta', checkoutMode: 'account' } };
    await renderPlatform('/?version=a', creator);
    await enterCheckout();
    expectAccountRequired();
  });
  test('a configured subscription URL cannot bypass version B authentication', async () => {
    const creator = creatorFixture();
    creator.actionLinks = { subscribe: 'https://checkout.example/approved' };
    await renderPlatform('/?version=b', creator);
    await enterCheckout();
    expectAccountRequired();
    expect(dom.window.location.pathname).toBe('/');
    await click(container.querySelector('[data-auth-account]'));
    expect(navigate.mock.calls).toEqual([['https://checkout.example/approved']]);
    expect(planButton()).toBeUndefined();
  });
  test('version A still honours a configured subscription destination', async () => {
    const creator = creatorFixture();
    creator.actionLinks = { subscribe: 'https://checkout.example/approved' };
    await renderPlatform('/?version=a', creator);
    await enterCheckout();
    expect(navigate.mock.calls).toEqual([['https://checkout.example/approved']]);
    expect(container.querySelector('[data-checkout-auth]')).toBeNull();
  });
  test('signing in without a checkout request does not open plans', async () => {
    await renderPlatform();
    const signIn = Array.from(container.querySelectorAll('button')).find(button => button.textContent === defaultSignInLabel);
    await click(signIn);
    await click(container.querySelector('[data-auth-account]'));
    expect(planButton()).toBeUndefined();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('plan selection stays inside the controlled checkout flow', () => {
  for (const version of ['a', 'b'] as const) {
    test(`version ${version} checkout takes priority over shared plan and subscription links`, async () => {
      const creator = creatorFixture();
      creator.checkoutUrl = 'https://checkout.example/profile';
      creator.plans[0].checkoutUrl = 'https://checkout.example/plan';
      creator.actionLinks = { subscribe: 'https://checkout.example/shared-subscription' };
      creator.pageVariants = {
        [version]: { label: `Versão ${version}`, checkoutMode: version === 'b' ? 'account' : 'guest', checkoutUrl: `https://checkout.example/${version}` },
      };
      await renderPlatform(`/?version=${version}`, creator);
      await enterCheckout();
      if (version === 'b') {
        expectAccountRequired();
        await click(container.querySelector('[data-auth-account]'));
      }
      expectPlans();
      expect(navigate).not.toHaveBeenCalled();
      await click(planButton());
      expect(navigate.mock.calls).toEqual([[`https://checkout.example/${version}`]]);
    });
  }
  test('an invalid variant URL is ignored in favour of the valid plan destination', async () => {
    const creator = creatorFixture();
    creator.plans[0].checkoutUrl = 'https://checkout.example/valid-plan';
    creator.pageVariants = { a: { label: 'Versão A', checkoutMode: 'guest', checkoutUrl: 'javascript:alert(1)' } };
    await renderPlatform('/?version=a', creator);
    await enterCheckout();
    await click(planButton());
    expect(navigate.mock.calls).toEqual([['https://checkout.example/valid-plan']]);
  });
  test('the plan modal delegates to its caller without navigating on its own', async () => {
    ({ PlansModal } = await import('../src/components/PlansModal'));
    const creator = creatorFixture();
    creator.plans[0].checkoutUrl = 'https://checkout.example/plan';
    const selected = mock((_plan: Creator['plans'][number]) => {});
    root = createRoot(container);
    await act(async () => { root!.render(<PlansModal creator={creator} isOpen onClose={() => {}} onSelectPlan={selected} />); });
    await click(planButton());
    expect(selected.mock.calls).toEqual([[creator.plans[0]]]);
    expect(navigate).not.toHaveBeenCalled();
    expect(dom.window.location.href).toBe('https://preview.example/');
  });
  test('a profile with no configured checkout shows an error instead of another profile\'s payment page', async () => {
    await renderPlatform();
    await enterCheckout();
    await click(planButton());
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(dom.window.location.href).toBe('https://preview.example/');
  });
});
