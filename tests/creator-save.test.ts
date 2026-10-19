// Run separately: bun test tests/creator-save.test.ts
// This uses the real saveCreatorToFirestore entry point with isolated transport mocks.
import { beforeEach, expect, mock, test } from 'bun:test';
import type { Creator } from '../src/types';

const firestore = await import('firebase/firestore');
const firebaseAuth = await import('firebase/auth');
const serverTime = Object.freeze({ testServerTimestamp: true });
let allowed = true;
let currentDocuments: Array<Record<string, unknown> | undefined>;
let writes: Array<Record<string, unknown>>;
let failure: Error | undefined;

mock.module('firebase/auth', () => ({
  ...firebaseAuth,
  getAuth: () => ({
    authStateReady: async () => {},
    currentUser: { isAnonymous: false, getIdTokenResult: async () => ({ claims: { admin: allowed } }) },
  }),
}));
mock.module('firebase/firestore', () => ({
  ...firestore,
  getFirestore: () => ({}),
  doc: (_database: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  serverTimestamp: () => serverTime,
  setDoc: async () => { throw new Error('The profile save must use the transaction.'); },
  runTransaction: async (_database: unknown, callback: (transaction: unknown) => Promise<unknown>) => {
    for (const current of currentDocuments) {
      // More than one snapshot models a transaction retry after a concurrent change.
      await callback({
        get: async () => ({ exists: () => current !== undefined, get: (key: string) => current?.[key] }),
        set: (reference: { path: string }, value: Record<string, unknown>) => {
          expect(reference.path).toBe('creators/test-profile');
          writes.push(value);
        },
      });
    }
    if (failure) throw failure;
  },
}));
const { saveCreatorToFirestore } = await import('../src/firebase');

const draft = (extra: Record<string, unknown> = {}) => ({
  id: 'test-profile', name: 'Test profile', avatar: '/assets/test.jpg', ...extra,
}) as unknown as Creator;

beforeEach(() => {
  allowed = true;
  currentDocuments = [undefined];
  writes = [];
  failure = undefined;
});

test('existing creation timestamp survives a save and forged form timestamps are ignored', async () => {
  const createdAt = new firestore.Timestamp(100, 123456789);
  currentDocuments = [{ createdAt, obsoleteOptionalField: 'remove me' }];
  expect(await saveCreatorToFirestore(draft({ createdAt: 'forged', updatedAt: 'forged' }))).toBe(true);
  expect(writes).toHaveLength(1);
  expect(writes[0].createdAt).toBe(createdAt);
  expect(writes[0].updatedAt).toBe(serverTime);
  expect(writes[0]).not.toHaveProperty('obsoleteOptionalField');
});

test('new profiles and legacy profiles with no creation date receive a server timestamp', async () => {
  for (const current of [undefined, { name: 'Legacy profile without createdAt' }]) {
    currentDocuments = [current];
    writes = [];
    await saveCreatorToFirestore(draft({ createdAt: 'forged' }));
    expect(writes[0].createdAt).toBe(serverTime);
    expect(writes[0].updatedAt).toBe(serverTime);
  }
});

test('a transaction retry preserves the newer stored creation date', async () => {
  const earlier = new firestore.Timestamp(100, 1);
  const later = new firestore.Timestamp(200, 2);
  currentDocuments = [{ createdAt: earlier }, { createdAt: later }];
  await saveCreatorToFirestore(draft());
  expect(writes.map((value) => value.createdAt)).toEqual([earlier, later]);
});

test('a rejected transaction cannot report a successful save', async () => {
  failure = new Error('transaction rejected');
  await expect(saveCreatorToFirestore(draft())).rejects.toThrow('transaction rejected');
});

test('an account without the admin claim cannot write a profile', async () => {
  allowed = false;
  await expect(saveCreatorToFirestore(draft())).rejects.toThrow('permissão de administrador');
  expect(writes).toHaveLength(0);
});
