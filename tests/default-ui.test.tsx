import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, mock, setSystemTime, test } from 'bun:test';
import { installReadOnlyBrowser } from './mock-browser';
import { LuandaPriveLogo } from '../src/components/LuandaPriveLogo';

// CI restores .baseline/src from the approved original commit before this test.
// Exact comparisons still protect the unchanged dialogs and global styles.
// The requested age gate, live-data readiness, branding, media and comments are
// intentional UX changes, covered by behavior assertions here and the isolated
// age-consent, media-preview and platform-readiness interaction suites.
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
// The supplied brand artwork is an intentional shared change. Render that same
// component in baseline dialogs so their remaining markup stays fully compared.
mock.module(new URL('../.baseline/src/components/LuandaPriveLogo.tsx', import.meta.url).pathname, () => ({ LuandaPriveLogo }));

const original = (path: string) => import(new URL(`../.baseline/src/${path}`, import.meta.url).href);
const current = (path: string) => import(new URL(`../src/${path}`, import.meta.url).href);
let PlatformContent: React.ComponentType;
let Provider: React.ComponentType<React.PropsWithChildren>;
let creators: any[];
const originalRandom = Math.random;

beforeAll(async () => {
  setSystemTime(new Date('2026-10-19T18:00:00.000Z'));
  Math.random = () => 0.5;
  [PlatformContent, Provider, creators] = await Promise.all([
    current('PlatformApp.tsx').then(module => module.PlatformContent),
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

describe('public pages wait for current published content', () => {
  for (const route of ['/', '/perfil-3', '/promo-3', '/mensagens', '/comentarios', '/checkout']) {
    test(`${route} does not flash the previous creator before live snapshots`, () => {
      browser.setRoute(route);
      const html = renderToStaticMarkup(<Provider><PlatformContent /></Provider>);
      expect(html).toContain('role="status"');
      expect(html).toContain('/assets/platform-logo.png');
      expect(html).not.toContain('<video');
      for (const creator of creators) {
        expect(html).not.toContain(creator.avatar);
        expect(html).not.toContain(renderToStaticMarkup(<>{creator.name}</>));
      }
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

test('the shared brand uses the supplied image with accessible text and stable proportions', () => {
  const html = renderToStaticMarkup(<LuandaPriveLogo />);
  const images = html.match(/<img\b[^>]*>/g);
  expect(images).toHaveLength(1);
  expect(images![0]).toContain('src="/assets/platform-logo.png"');
  expect(images![0]).toContain('alt="Luanda Privé"');
  expect(images![0]).toContain('width="900"');
  expect(images![0]).toContain('height="300"');
  expect(html).not.toContain('<svg');
});

// These open states are not visible in an initial App render. Their text was
// also moved into the CMS, so compare them without invoking a browser event.
describe('public dialogs retain their approved default markup', () => {
  const names = [
    'PlansModal', 'PaymentModal', 'CreatorChatDrawer',
    'CreatorsDirectoryModal', 'TipModal', 'AuthModal',
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

describe('administrative sharing links retain route and creator selection', () => {
  for (const path of ['/', '/perfil-3', '/promo-3', '/mensagens', '/comentarios']) {
    test(path, async () => {
      const [{ profilePageUrl }, { getRequestedCreatorId }] = await Promise.all([
        current('cms/AdminPageLinks.tsx'), current('utils/creatorRoute.ts'),
      ]);
      const selected = creators[1];
      const url = new URL(profilePageUrl('https://preview.example', path, selected.id));
      expect(url.origin).toBe('https://preview.example');
      expect(url.pathname).toBe(path);
      expect(getRequestedCreatorId(url.search)).toBe(selected.id);
    });
  }

  test('a story opens with controls but does not fetch its video before play', async () => {
    const { StoryViewerModal } = await current('components/StoryViewerModal.tsx');
    const creator = {
      ...creators[0],
      highlights: [{ id: 'test-story', type: 'video', mediaUrl: 'https://media.example/story.mp4', coverImage: 'https://media.example/story.webp', title: 'Story de teste', caption: 'Legenda de teste', time: 'Hoje' }],
    };
    const html = renderToStaticMarkup(<Provider><StoryViewerModal creator={creator} initialStoryIndex={0} isOpen onClose={() => {}} onUnlockClick={() => {}} /></Provider>);
    expect(html).toContain('Legenda de teste');
    expect(html).toContain('aria-label="Reproduzir prévia"');
    expect(html).toContain('preload="none"');
    expect(html).not.toContain('https://media.example/story.mp4');
    expect(html).not.toContain('https://media.example/story.webp');
  });
});

describe('published comments have an explicit source and post association', () => {
  for (const name of ['PostCommentsModal', 'DedicatedCommentsPage']) {
    test(`${name} shows an empty state without inventing testimonials`, async () => {
      const component = (await current(`components/${name}.tsx`))[name];
      const creator = { ...creators[0], managedComments: [] };
      const html = renderToStaticMarkup(<Provider>{React.createElement(component, {
        creator, isOpen: true, postCaption: '', user: null,
        onClose() {}, onBack() {}, onUnlockClick() {},
      })}</Provider>);
      expect(html).toContain('Ainda não há comentários publicados.');
      expect(html).not.toContain('<article');
      expect(html).toContain('não é publicado para outras pessoas');
    });

    test(`${name} identifies examples and shows only the selected post's comments`, async () => {
      const component = (await current(`components/${name}.tsx`))[name];
      const creator = {
        ...creators[0],
        posts: [{ id: 'first', text: 'Primeira publicação' }, { id: 'second', text: 'Outra publicação' }],
        managedComments: [
          { id: 'example', name: 'Exemplo autorizado', text: 'Exemplo visível', kind: 'demonstration', postId: 'first' },
          { id: 'real', name: 'Comentador autorizado', text: 'Comentário autorizado visível', kind: 'real', postId: 'first' },
          { id: 'other', name: 'Outro comentador', text: 'Comentário de outra publicação', kind: 'real', postId: 'second' },
        ],
      };
      const html = renderToStaticMarkup(<Provider>{React.createElement(component, {
        creator, isOpen: true, postId: 'first', postCaption: 'Primeira publicação', user: null,
        onClose() {}, onBack() {}, onUnlockClick() {},
      })}</Provider>);
      expect(html).toContain('Exemplo visível');
      expect(html).toContain('Comentário autorizado visível');
      expect(html).not.toContain('Comentário de outra publicação');
      expect(html.match(/Comentário demonstrativo/g)).toHaveLength(1);
      expect(html.match(/<article\b/g)).toHaveLength(2);
    });
  }
});

