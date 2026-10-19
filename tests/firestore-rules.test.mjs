import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, getMetadata, ref, uploadBytes } from 'firebase/storage';

// Never run these tests against real Firebase resources, even with operator credentials present.
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  throw new Error('Inicia os emuladores Firestore e Storage com --project demo-kambas-cms.');
}
let environment;
const google = { sign_in_provider: 'google.com', identities: {} };
const adminContext = () => environment.authenticatedContext('administrator', { admin: true, firebase: google });
const memberContext = () => environment.authenticatedContext('member', { firebase: google });
const visitorContext = () => environment.unauthenticatedContext();
const anonymousContext = () => environment.authenticatedContext('guest', {
  firebase: { sign_in_provider: 'anonymous', identities: {} },
});
const creator = (id = 'sandra') => ({
  id, name: 'Perfil de teste', avatar: '/assets/avatar.jpg', age: 24,
  bio: 'Conteúdo de teste', plans: [], posts: [], updatedAt: Timestamp.now(),
});
const settings = () => ({
  version: 1, copy: { title: 'Portal' }, faqs: [{ question: 'Pergunta?', answer: 'Resposta' }],
  bankDetails: { bankName: '', beneficiary: '', iban: '', accountNumber: '', unitelMoney: '', multicaixaEntity: '' },
  updatedAt: Timestamp.now(),
});
const ownProfile = (uid, isAnonymous = false) => ({
  uid, displayName: 'Teste', email: '', photoURL: '', isAnonymous, lastLoginAt: new Date().toISOString(),
});

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-kambas-cms',
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
    storage: { rules: await readFile(new URL('../storage.rules', import.meta.url), 'utf8') },
  });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.clearStorage();
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'creators', 'sandra'), creator());
    await setDoc(doc(context.firestore(), 'settings', 'public'), settings());
    await setDoc(doc(context.firestore(), 'users', 'member'), ownProfile('member'));
    await setDoc(doc(context.firestore(), 'settings', 'private'), { secret: 'test-only' });
  });
});
after(async () => { await environment?.cleanup(); });

test('deployment configuration retains the existing named database', async () => {
  const config = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8'));
  const client = JSON.parse(await readFile(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
  assert.equal(config.firestore[0].database, client.firestoreDatabaseId);
  assert.notEqual(config.firestore[0].database, '(default)');
});

test('public visitors can read creators and only the public settings document', async () => {
  const database = visitorContext().firestore();
  await assertSucceeds(getDoc(doc(database, 'creators', 'sandra')));
  await assertSucceeds(getDocs(collection(database, 'creators')));
  await assertSucceeds(getDoc(doc(database, 'settings', 'public')));
  await assertFails(getDoc(doc(database, 'settings', 'private')));
  await assertFails(getDocs(collection(database, 'settings')));
  await assertFails(getDoc(doc(database, 'users', 'member')));
});

test('unauthenticated, anonymous and ordinary users cannot create, update or delete public content', async () => {
  for (const context of [visitorContext(), anonymousContext(), memberContext()]) {
    const database = context.firestore();
    await assertFails(setDoc(doc(database, 'creators', 'new-model'), creator('new-model')));
    await assertFails(updateDoc(doc(database, 'creators', 'sandra'), { name: 'Alteração' }));
    await assertFails(deleteDoc(doc(database, 'creators', 'sandra')));
    await assertFails(setDoc(doc(database, 'settings', 'public'), settings()));
  }
});

test('only a boolean custom admin claim on a non-anonymous identity grants content access', async () => {
  for (const context of [
    environment.authenticatedContext('claim-string', { admin: 'true', firebase: google }),
    environment.authenticatedContext('anon-admin', { admin: true, firebase: { sign_in_provider: 'anonymous', identities: {} } }),
  ]) {
    await assertFails(setDoc(doc(context.firestore(), 'creators', 'new-model'), creator('new-model')));
  }
});

test('administrator can publish, edit and delete profiles and edit global content', async () => {
  const database = adminContext().firestore();
  await assertSucceeds(setDoc(doc(database, 'creators', 'new-model'), creator('new-model')));
  await assertSucceeds(updateDoc(doc(database, 'creators', 'new-model'), { name: 'Nome atualizado', updatedAt: Timestamp.now() }));
  assert.equal((await getDoc(doc(database, 'creators', 'new-model'))).data().name, 'Nome atualizado');
  await assertSucceeds(deleteDoc(doc(database, 'creators', 'new-model')));
  await assertSucceeds(setDoc(doc(database, 'settings', 'public'), settings()));
  await assertFails(deleteDoc(doc(database, 'settings', 'public')));
});

test('validation applies equally to administrator creates and updates', async () => {
  const database = adminContext().firestore();
  await assertFails(setDoc(doc(database, 'creators', 'wrong-id'), creator('different-id')));
  await assertFails(updateDoc(doc(database, 'creators', 'sandra'), { age: 17 }));
  await assertFails(updateDoc(doc(database, 'creators', 'sandra'), { avatar: 'idb://local-only' }));
  await assertFails(updateDoc(doc(database, 'creators', 'sandra'), { avatar: 'data:image/png;base64,AA' }));
  await assertFails(updateDoc(doc(database, 'creators', 'sandra'), { avatar: 'blob:https://local/123' }));
  await assertFails(updateDoc(doc(database, 'creators', 'sandra'), { unexpectedSecret: 'secret' }));
  await assertFails(setDoc(doc(database, 'settings', 'public'), { ...settings(), secretKey: 'secret' }));
  await assertFails(setDoc(doc(database, 'settings', 'public'), { ...settings(), bankDetails: { ...settings().bankDetails, iban: 123 } }));
});

test('users can maintain only their own limited profile; self-escalation is denied', async () => {
  const database = memberContext().firestore();
  await assertSucceeds(getDoc(doc(database, 'users', 'member')));
  await assertSucceeds(setDoc(doc(database, 'users', 'member'), ownProfile('member')));
  await assertSucceeds(updateDoc(doc(database, 'users', 'member'), { displayName: 'Novo nome' }));
  await assertFails(updateDoc(doc(database, 'users', 'member'), { admin: true }));
  await assertFails(updateDoc(doc(database, 'users', 'member'), { role: 'admin' }));
  await assertFails(updateDoc(doc(database, 'users', 'member'), { uid: 'administrator' }));
  await assertFails(updateDoc(doc(database, 'users', 'member'), { email: 'owner@example.com' }));
  await assertFails(setDoc(doc(database, 'users', 'other'), ownProfile('other')));
  await assertFails(getDoc(doc(database, 'users', 'other')));
  await assertFails(getDocs(collection(database, 'users')));
  await assertFails(setDoc(doc(database, 'creators', 'new-model'), creator('new-model')));
  await assertSucceeds(setDoc(doc(anonymousContext().firestore(), 'users', 'guest'), ownProfile('guest', true)));
});

test('only an administrator can manage creator comments and button destinations', async () => {
  const managedComments = [{ id: 'example-1', name: 'Exemplo', text: 'Texto demonstrativo', time: 'Hoje', kind: 'demonstration' }];
  const actionLinks = {
    subscribe: 'https://checkout.example/plan', message: '/mensagens?creator=sandra', tip: '',
    signup: '/registo', login: '/', explore: '/perfis', notifications: '/avisos',
  };
  const patch = { managedComments, actionLinks, updatedAt: Timestamp.now() };
  const admin = adminContext().firestore();
  await assertSucceeds(setDoc(doc(admin, 'creators', 'configured'), { ...creator('configured'), ...patch }));
  await assertSucceeds(updateDoc(doc(admin, 'creators', 'sandra'), patch));
  const published = (await getDoc(doc(visitorContext().firestore(), 'creators', 'sandra'))).data();
  assert.deepEqual(published.managedComments, managedComments);
  assert.deepEqual(published.actionLinks, actionLinks);
  for (const context of [visitorContext(), anonymousContext(), memberContext()]) {
    await assertFails(updateDoc(doc(context.firestore(), 'creators', 'sandra'), { managedComments: [] }));
    await assertFails(updateDoc(doc(context.firestore(), 'creators', 'sandra'), { actionLinks: { login: '/alterado' } }));
  }
});

test('managed comments enforce list type and the 100-item limit on create and update', async () => {
  const database = adminContext().firestore();
  const comments = Array.from({ length: 100 }, (_, index) => ({
    id: `example-${index}`, name: 'Exemplo', text: 'Texto demonstrativo', time: 'Hoje', kind: 'demonstration',
  }));
  await assertSucceeds(updateDoc(doc(database, 'creators', 'sandra'), { managedComments: comments }));
  for (const managedComments of [{}, 'invalid', [...comments, comments[0]]]) {
    await assertFails(setDoc(doc(database, 'creators', 'invalid-comments'), { ...creator('invalid-comments'), managedComments }));
    await assertFails(updateDoc(doc(database, 'creators', 'sandra'), { managedComments }));
  }
});

test('button configuration rejects unknown keys, non-strings and unsafe URL schemes', async () => {
  const database = adminContext().firestore();
  for (const actionLinks of [
    [], 'invalid', { extra: '/route' }, { login: 7 }, { login: null },
    { login: 'javascript:alert(1)' }, { message: '//outside.example' },
    { subscribe: 'http://checkout.example' }, { tip: 'https://checkout.example/with space' },
    { login: '/'.padEnd(4097, 'a') },
  ]) {
    await assertFails(setDoc(doc(database, 'creators', 'invalid-links'), { ...creator('invalid-links'), actionLinks }));
    await assertFails(updateDoc(doc(database, 'creators', 'sandra'), { actionLinks }));
  }
});

test('Storage allows public media reads and only administrator media writes', async () => {
  const objectPath = 'public/administrator/photo.jpg';
  const adminStorage = adminContext().storage();
  await assertSucceeds(uploadBytes(ref(adminStorage, objectPath), new Uint8Array([1, 2]), { contentType: 'image/jpeg' }));
  await assertSucceeds(getMetadata(ref(visitorContext().storage(), objectPath)));
  for (const context of [visitorContext(), anonymousContext(), memberContext()]) {
    await assertFails(uploadBytes(ref(context.storage(), objectPath), new Uint8Array([1]), { contentType: 'image/jpeg' }));
    await assertFails(deleteObject(ref(context.storage(), objectPath)));
  }
  await assertSucceeds(deleteObject(ref(adminStorage, objectPath)));
});

test('Storage rejects executable formats, oversized images and writes outside the public media path', async () => {
  const storage = adminContext().storage();
  await assertFails(uploadBytes(ref(storage, 'public/administrator/page.html'), new Uint8Array([1]), { contentType: 'text/html' }));
  await assertFails(uploadBytes(ref(storage, 'public/administrator/vector.svg'), new Uint8Array([1]), { contentType: 'image/svg+xml' }));
  await assertFails(uploadBytes(ref(storage, 'public/administrator/large.jpg'), new Uint8Array(20 * 1024 * 1024 + 1), { contentType: 'image/jpeg' }));
  await assertFails(uploadBytes(ref(storage, 'public/someone-else/photo.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
  await assertFails(uploadBytes(ref(storage, 'private/photo.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
});

