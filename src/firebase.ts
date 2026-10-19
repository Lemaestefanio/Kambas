import { initializeApp } from 'firebase/app';
import {
  collection, deleteDoc, doc, getDocFromServer, getFirestore, onSnapshot,
  runTransaction, serverTimestamp, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, onIdTokenChanged,
  signInAnonymously, signInWithPopup, signOut as fbSignOut, updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import type { Creator } from './types';
import type { SiteSettings } from './cms/types';

const app = initializeApp(firebaseConfig);
// This project uses a named database. Never silently switch to (default).
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
const creatorsCollection = 'creators';
const publicSettingsRef = doc(db, 'settings', 'public');

export enum OperationType {
  CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list',
  GET = 'get', WRITE = 'write',
}

/** Preserve the underlying error without logging user emails or auth tokens. */
export function handleFirestoreError(error: unknown, operation: OperationType, path: string | null): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Não foi possível ${operation} ${path || 'conteúdo'}: ${message}`);
}

/** No startup probe or visitor-side writes; permission errors are real failures. */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(publicSettingsRef);
    return true;
  } catch {
    return false;
  }
}

function assertDocumentId(id: string): void {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw new Error('O identificador do perfil é inválido.');
  }
}

/** Local blobs/IndexedDB references cannot be resolved on another visitor's device. */
function cleanPublicValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Existe um número inválido no conteúdo.');
    return value;
  }
  if (typeof value === 'string') {
    if (/^(?:idb|blob|data|javascript|vbscript|file):/i.test(value.trim())) {
      throw new Error('Há um ficheiro guardado apenas neste dispositivo. Envia-o novamente pelo painel antes de publicar.');
    }
    return value;
  }
  if (Array.isArray(value)) return value.filter((item) => item !== undefined).map(cleanPublicValue);
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value)
      .filter(([key, item]) => item !== undefined && key !== '__proto__' && key !== 'constructor')
      .map(([key, item]) => [key, cleanPublicValue(item)]));
  }
  throw new Error('O conteúdo contém um formato que não pode ser publicado.');
}

function creatorDocument(creator: Creator): Record<string, unknown> {
  assertDocumentId(creator.id);
  // Timestamps are owned by this persistence layer, not by form inputs.
  const { createdAt: _created, updatedAt: _updated, ...content } = creator as Creator & {
    createdAt?: unknown; updatedAt?: unknown;
  };
  const cleaned = cleanPublicValue(content) as Record<string, unknown>;
  if (new TextEncoder().encode(JSON.stringify(cleaned)).length > 900_000) {
    throw new Error('O perfil é demasiado grande. Guarda os ficheiros pelo envio de media.');
  }
  return { ...cleaned, updatedAt: serverTimestamp() };
}

function settingsDocument(settings: SiteSettings): Record<string, unknown> {
  if (settings.version !== 1 || !Array.isArray(settings.faqs) || settings.faqs.length > 100) {
    throw new Error('A configuração das perguntas frequentes é inválida.');
  }
  if (!settings.copy || Object.keys(settings.copy).length > 1000
      || Object.values(settings.copy).some((value) => typeof value !== 'string' || value.length > 20000)) {
    throw new Error('Existe um texto inválido na configuração da página.');
  }
  if (settings.faqs.some((item) => typeof item.question !== 'string' || typeof item.answer !== 'string'
      || item.question.length > 2000 || item.answer.length > 20000)) {
    throw new Error('Existe uma pergunta ou resposta inválida.');
  }
  const bankKeys = ['bankName', 'beneficiary', 'iban', 'accountNumber', 'unitelMoney', 'multicaixaEntity'] as const;
  if (!settings.bankDetails || bankKeys.some((key) => typeof settings.bankDetails[key] !== 'string'
      || settings.bankDetails[key].length > 500)) {
    throw new Error('Os dados de pagamento estão incompletos ou inválidos.');
  }
  const cleaned = cleanPublicValue({
    version: 1, copy: settings.copy, faqs: settings.faqs, bankDetails: settings.bankDetails,
  }) as Record<string, unknown>;
  if (new TextEncoder().encode(JSON.stringify(cleaned)).length > 900_000) {
    throw new Error('A configuração é demasiado grande para publicar.');
  }
  return { ...cleaned, updatedAt: serverTimestamp() };
}

async function requireAdmin(): Promise<FirebaseUser> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Entra com a conta autorizada de administrador.');
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin !== true) throw new Error('Esta conta ainda não tem permissão de administrador.');
  return user;
}

export function subscribeToCreators(onData: (creators: Creator[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(collection(db, creatorsCollection), (snapshot) => {
    onData(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Creator));
  }, (error) => onError?.(error));
}

export function subscribeToSiteSettings(
  onData: (settings: Partial<SiteSettings> | null) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(publicSettingsRef, (snapshot) => {
    onData(snapshot.exists() ? snapshot.data() as Partial<SiteSettings> : null);
  }, (error) => onError?.(error));
}

export async function saveCreatorToFirestore(creator: Creator): Promise<boolean> {
  await requireAdmin();
  const reference = doc(db, creatorsCollection, creator.id);
  const content = creatorDocument(creator);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference);
    // The creation date belongs to the stored document, never to a form draft.
    // Reading inside the transaction also preserves the latest value on a retry.
    const createdAt = existing.exists() ? existing.get('createdAt') : undefined;
    // Full replacement still persists removed optional fields.
    transaction.set(reference, {
      ...content,
      createdAt: createdAt === undefined ? serverTimestamp() : createdAt,
    });
  });
  return true;
}

export async function deleteCreatorFromFirestore(creatorId: string): Promise<void> {
  assertDocumentId(creatorId);
  await requireAdmin();
  await deleteDoc(doc(db, creatorsCollection, creatorId));
}

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  await requireAdmin();
  await setDoc(publicSettingsRef, settingsDocument(settings));
}

/** Explicit admin action only. Existing documents are never overwritten during bootstrap. */
export async function publishInitialContent(creators: Creator[], settings: SiteSettings): Promise<void> {
  await requireAdmin();
  if (creators.length > 400 || new Set(creators.map((item) => item.id)).size !== creators.length) {
    throw new Error('A importação deve ter até 400 perfis com identificadores únicos.');
  }
  const documents = creators.map((creator) => ({
    reference: doc(db, creatorsCollection, creator.id), data: creatorDocument(creator),
  }));
  const publicSettings = settingsDocument(settings);
  await runTransaction(db, async (transaction) => {
    // Complete every read before issuing writes; the transaction retries safely on a concurrent edit.
    const existing = await Promise.all(documents.map(({ reference }) => transaction.get(reference)));
    const existingSettings = await transaction.get(publicSettingsRef);
    documents.forEach(({ reference, data }, index) => {
      if (!existing[index].exists()) transaction.set(reference, { ...data, createdAt: serverTimestamp() });
    });
    if (!existingSettings.exists()) transaction.set(publicSettingsRef, publicSettings);
  });
}

export async function updateCreatorAvatarInFirestore(creatorId: string, avatarUrl: string): Promise<void> {
  assertDocumentId(creatorId);
  const avatar = cleanPublicValue(avatarUrl);
  await requireAdmin();
  await updateDoc(doc(db, creatorsCollection, creatorId), { avatar, updatedAt: serverTimestamp() });
}

export async function batchUpdateAvatarsInFirestore(avatars: Record<string, string>): Promise<void> {
  await requireAdmin();
  const entries = Object.entries(avatars);
  if (entries.length > 400) throw new Error('Atualiza até 400 avatares de cada vez.');
  const batch = writeBatch(db);
  entries.forEach(([creatorId, url]) => {
    assertDocumentId(creatorId);
    batch.update(doc(db, creatorsCollection, creatorId), { avatar: cleanPublicValue(url), updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

const mediaTypes = /^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|wav|x-wav|ogg|webm))$/;

export async function uploadAdminMedia(file: File): Promise<string> {
  const user = await requireAdmin();
  if (!mediaTypes.test(file.type)) throw new Error('Envia uma imagem JPG, PNG, WebP, GIF ou AVIF, um vídeo MP4/WebM/MOV, ou áudio MP3/M4A/WAV/OGG/WebM.');
  const maxSize = (file.type.startsWith('image/') ? 20 : 100) * 1024 * 1024;
  if (file.size === 0 || file.size > maxSize) {
    throw new Error(`O limite é ${maxSize / 1024 / 1024} MB por ficheiro.`);
  }
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-100) || 'media';
  const object = ref(storage, `public/${user.uid}/${crypto.randomUUID()}-${safeName}`);
  await uploadBytes(object, file, { contentType: file.type, customMetadata: { uploadedBy: user.uid } });
  return getDownloadURL(object);
}

async function saveOwnUserProfile(user: FirebaseUser, displayName: string): Promise<void> {
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid, email: user.email || '', displayName: displayName.slice(0, 200),
    photoURL: user.photoURL || '', isAnonymous: user.isAnonymous,
    lastLoginAt: new Date().toISOString(),
  }, { merge: true });
}

export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  const { user } = await signInWithPopup(auth, googleProvider);
  await saveOwnUserProfile(user, user.displayName || 'Fã VIP');
  return user;
}

export async function signInAnonymouslyWithNickname(nickname: string): Promise<FirebaseUser | null> {
  const { user } = await signInAnonymously(auth);
  const displayName = (nickname.trim() || 'Fã VIP Anónimo').slice(0, 200);
  await updateProfile(user, { displayName });
  await saveOwnUserProfile(user, displayName);
  return user;
}

export async function signOutUser(): Promise<void> { await fbSignOut(auth); }

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/** Role comes only from a signed Firebase ID token, never localStorage or a public user document. */
export function onAdminAuthChange(callback: (isAdmin: boolean, user: FirebaseUser | null) => void) {
  let sequence = 0;
  let active = true;
  const unsubscribe = onIdTokenChanged(auth, async (user) => {
    const current = ++sequence;
    let isAdmin = false;
    if (user && !user.isAnonymous) {
      try { isAdmin = (await user.getIdTokenResult()).claims.admin === true; } catch { /* fail closed */ }
    }
    if (active && current === sequence) callback(isAdmin, user);
  });
  return () => { active = false; unsubscribe(); };
}

