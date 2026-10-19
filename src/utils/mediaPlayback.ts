export interface MediaConnection extends EventTarget {
  saveData?: boolean;
  effectiveType?: string;
}

export function browserMediaConnection(): MediaConnection | undefined {
  return typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { connection?: MediaConnection }).connection;
}

export function permitsAutomaticVideo(connection = browserMediaConnection()): boolean {
  return !connection?.saveData && connection?.effectiveType !== 'slow-2g' && connection?.effectiveType !== '2g';
}

/** One visible clip owns the network/player slot; a deliberate play takes priority. */
export function createMediaPlaybackCoordinator() {
  const requests = new Map<symbol, { manual: boolean; order: number; revoke: () => void }>();
  const listeners = new Set<() => void>();
  let owner: symbol | undefined;
  let generation = 0;
  let order = 0;

  const select = (removedOwner?: { revoke: () => void }) => {
    let next: symbol | undefined;
    let latestManual = -1;
    for (const [id, request] of requests) {
      if (request.manual && request.order > latestManual) { next = id; latestManual = request.order; }
    }
    if (!next) next = owner && requests.has(owner) ? owner : requests.keys().next().value;
    if (next === owner) return;
    const previous = removedOwner || (owner && requests.get(owner));
    owner = next;
    generation++;
    // Stop the previous download before notifying the new owner to attach its URL.
    previous?.revoke();
    listeners.forEach(listener => listener());
  };

  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    lease(id: symbol) { return owner === id ? generation : 0; },
    request(id: symbol, manual: boolean, revoke: () => void) {
      const request = { manual, revoke, order: order++ };
      requests.set(id, request);
      select();
      return () => {
        if (requests.get(id) !== request) return;
        const removedOwner = owner === id ? request : undefined;
        requests.delete(id);
        select(removedOwner);
      };
    },
  };
}

export const mediaPlaybackCoordinator = createMediaPlaybackCoordinator();
