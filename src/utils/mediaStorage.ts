/**
 * IndexedDB Media Storage Engine
 * Enables storage and instant playback of large videos and images (up to 100MB+)
 * directly in persistent browser storage without hitting LocalStorage (5MB) or Firestore (1MB) limits.
 */

const DB_NAME = 'LuandaPriveMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

let dbInstance: IDBDatabase | null = null;
const blobUrlCache = new Map<string, string>();

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a File or Blob up to 100MB in IndexedDB
 * Returns a media reference key "idb://<mediaId>"
 */
export async function saveMediaBlob(mediaId: string, fileOrBlob: Blob): Promise<string> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(fileOrBlob, mediaId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Create and cache an object URL for instant UI display
    const url = URL.createObjectURL(fileOrBlob);
    blobUrlCache.set(mediaId, url);
    return `idb://${mediaId}`;
  } catch (err) {
    console.error('Failed to save to IndexedDB:', err);
    throw err;
  }
}

/**
 * Retrieve a Blob URL from IndexedDB or return the external URL as-is
 */
export async function getMediaUrl(refOrUrl: string): Promise<string> {
  if (!refOrUrl) return '';
  if (!refOrUrl.startsWith('idb://')) {
    return refOrUrl;
  }

  const mediaId = refOrUrl.replace('idb://', '');
  if (blobUrlCache.has(mediaId)) {
    return blobUrlCache.get(mediaId)!;
  }

  try {
    const db = await getDB();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(mediaId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (blob) {
      const url = URL.createObjectURL(blob);
      blobUrlCache.set(mediaId, url);
      return url;
    }
  } catch (err) {
    console.warn('Could not load blob from IndexedDB:', err);
  }

  return refOrUrl;
}

/**
 * Delete a media file from IndexedDB
 */
export async function deleteMediaBlob(mediaId: string): Promise<void> {
  try {
    const cleanId = mediaId.replace('idb://', '');
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(cleanId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    if (blobUrlCache.has(cleanId)) {
      URL.revokeObjectURL(blobUrlCache.get(cleanId)!);
      blobUrlCache.delete(cleanId);
    }
  } catch (err) {
    console.warn('Failed to delete blob from IndexedDB:', err);
  }
}
