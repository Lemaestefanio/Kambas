import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Creator } from './types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID (CRITICAL: Database will break without this)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Error Handling conformant to FirestoreErrorInfo specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Mandatory test connection check
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    // Any permission or missing doc response confirms server reached
    return true;
  }
}
testConnection();

const CREATORS_COLLECTION = 'creators';

/**
 * Listen in real-time to creators in Firestore.
 */
export function subscribeToCreators(
  onData: (creators: Creator[]) => void,
  onError?: (err: Error) => void
) {
  const collRef = collection(db, CREATORS_COLLECTION);
  return onSnapshot(
    collRef,
    (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }
      const loaded: Creator[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Creator;
        loaded.push(data);
      });
      onData(loaded);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, CREATORS_COLLECTION);
      } catch (wrapped) {
        onError?.(wrapped as Error);
      }
    }
  );
}

/**
 * Seed initial creators if collection is empty
 */
export async function seedInitialCreatorsIfEmpty(defaultCreators: Creator[]): Promise<boolean> {
  const path = CREATORS_COLLECTION;
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      console.log('Seeding initial agency creators to Firestore database...');
      const batch = writeBatch(db);
      for (const creator of defaultCreators) {
        const docRef = doc(db, path, creator.id);
        batch.set(docRef, {
          ...creator,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      console.log('Successfully seeded agency models to Firestore!');
      return true;
    }
    return false;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Update a model's avatar in Firestore
 */
export async function updateCreatorAvatarInFirestore(
  creatorId: string,
  avatarDataUrl: string
): Promise<void> {
  const path = `${CREATORS_COLLECTION}/${creatorId}`;
  try {
    const docRef = doc(db, CREATORS_COLLECTION, creatorId);
    await updateDoc(docRef, {
      avatar: avatarDataUrl,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Save an entire creator profile to Firestore
 */
export async function saveCreatorToFirestore(creator: Creator): Promise<void> {
  const path = `${CREATORS_COLLECTION}/${creator.id}`;
  try {
    const docRef = doc(db, CREATORS_COLLECTION, creator.id);
    await setDoc(
      docRef,
      {
        ...creator,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Batch update avatars for multiple creators in Firestore
 */
export async function batchUpdateAvatarsInFirestore(
  avatarsMap: Record<string, string>
): Promise<void> {
  const path = CREATORS_COLLECTION;
  try {
    const batch = writeBatch(db);
    for (const [creatorId, avatarUrl] of Object.entries(avatarsMap)) {
      const docRef = doc(db, CREATORS_COLLECTION, creatorId);
      batch.update(docRef, {
        avatar: avatarUrl,
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
