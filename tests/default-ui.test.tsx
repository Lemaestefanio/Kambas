import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, mock, setSystemTime, test } from 'bun:test';
import { installReadOnlyBrowser } from './mock-browser';

// CI restores .baseline/src from the approved original commit before this test.
// Firebase effects are intentionally excluded: this checks exact initial HTML,
// not database integration, animation timing, layout or screenshot equivalence.
const browser = installReadOnlyBrowser();
const unexpectedFirebaseCall = () => {
  throw new Error('Static UI comparison unexpectedly called Firebase');
};
const firebaseStub = {
  db: {}, auth: { currentUser: null },
  OperationType: { CREATE: 'create', UPDATE: 'update', DELETE: 'delete', LIST: 'list', GET: 'get', WRITE: 'write' },
  handleFirestoreError: unexpectedFirebaseCall,
  testConnection: unexpectedFirebaseCall,
  subscribeToCreators: unexpectedFirebaseCall,
  seedInitialCreatorsIfEmpty: unexpectedFirebaseCall,
  updateCreatorAvatarInFirestore: unexpectedFirebaseCall,
  saveCreatorToFirestore: unexpectedFirebaseCall,
  batchUpdateAvatarsInFirestore: unexpectedFirebaseCall,
  signInWithGoogle: unexpectedFirebaseCall,
  signInAnonymouslyWithNickname: unexpectedFirebaseCall,
  signOutUser: unexpectedFirebaseCall,
  onAuthChange: unexpectedFirebaseCall,
  onAdminAuthChange: unexpectedFirebaseCall,
  subscribeToSiteSettings: unexpectedFirebaseCall,
  saveSiteSettings: unexpectedFirebaseCall,
  publishInitialContent: unexpectedFirebaseCall,
  deleteCreatorFromFirestore: unexpectedFirebaseCall,
  uploadAdminMedia: unexpectedFirebaseCall,
};

mock.module(new URL('../src/firebase.ts', import.meta.url).pathname, () => firebaseStub);
mock.module(new URL('../.baseline/src/firebase.ts', import.meta.url).pathname, () => firebaseStub);

const original = (path: string) => import(new URL(`../.baseline/src/${path}`, import.meta.url).href);
const current = (path: string) => import(new URL(`../src/${path}`, import.meta.url).href);
let OriginalApp: React.ComponentType;
let CurrentApp: React.ComponentType;
let Provider: React.ComponentType<React.PropsWithChildren>;
let creators: any[];
const originalRandom = Math.random;

beforeAll(async () => {
  setSystemTime(new Date('2026-10-19T18:00:00.000Z'));
  Math.random = () => 0.5;
  [OriginalApp, CurrentApp, Provider, creators] = await Promise.all([
    original('App.tsx').then(module => module.default),
    current('App.tsx').then(module => module.default),
    current('cms/SiteContent.tsx').then(module => module.SiteContentProvider),
    original('data/content.ts').then(module => module.CREATORS),
  ]);
});

afterAll(() => {
  browser.restore();
  Math.random = originalRandom;
  setSystemTime();
});

function expectSameMarkup(label: string, actual: string, expected: string) {
  if (actual !== expected) {
    let offset = 0;
    while (offset < Math.min(actual.length, expected.length) && actual[offset] === expected[offset]) offset++;
    const start = Math.max(0, offset - 100);
    throw new Error(
      `${label}: initial markup differs at character ${offset}. ` +
      `Original length ${expected.length}; current length ${actual.length}.\n` +
      `Original: ${JSON.stringify(expected.slice(start, offset + 220))}\n` +
      `Current:  ${JSON.stringify(actual.slice(start, offset + 220))}`,
    );
  }
  expect(actual).toBe(expected);
}

describe('approved public pages retain exact default initial markup', () => {
  for (const route of ['/', '/perfil-3', '/promo-3', '/mensagens', '/comentarios']) {
    test(route, () => {
      browser.setRoute(route);
      const expected = renderToStaticMarkup(<OriginalApp />);
      browser.setRoute(route);
      const actual = renderToStaticMarkup(<Provider><CurrentApp /></Provider>);
      expectSameMarkup(route, actual, expected);
    });
  }

  test('global CSS is unchanged from the approved source', async () => {
    const [expected, actual] = await Promise.all([
      Bun.file(new URL('../.baseline/src/index.css', import.meta.url)).text(),
      Bun.file(new URL('../src/index.css', import.meta.url)).text(),
    ]);
    expect(actual).toBe(expected);
  });
});

// These open states are not visible in an initial App render. Their text was
// also moved into the CMS, so compare them without invoking a browser event.
describe('public dialogs retain their approved default markup', () => {
  const names = [
    'PlansModal', 'PaymentModal', 'StoryViewerModal', 'CreatorChatDrawer',
    'CreatorsDirectoryModal', 'PostCommentsModal', 'TipModal', 'AuthModal',
    'InternalCheckoutPage',
  ];
  for (const name of names) {
    test(name, async () => {
      const [baseline, updated] = await Promise.all([
        original(`components/${name}.tsx`), current(`components/${name}.tsx`),
      ]);
      const noop = () => {};
      const props = {
        isOpen: true, creator: creators[0], creatorName: creators[0].shortName,
        creators, initialStoryIndex: 0, plan: creators[0].plans[0],
        postCaption: creators[0].posts[0].text, user: null,
        onClose: noop, onBack: noop, onSuccess: noop, onUnlockClick: noop,
        onSelectCreator: noop, onSelectPlan: noop, onProceedToPayment: noop,
      };
      browser.setRoute('/');
      const expected = renderToStaticMarkup(React.createElement(baseline[name], props));
      browser.setRoute('/');
      const actual = renderToStaticMarkup(
        <Provider>{React.createElement(updated[name], props)}</Provider>,
      );
      expectSameMarkup(name, actual, expected);
    });
  }
});
