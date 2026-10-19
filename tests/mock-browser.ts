/** Minimal read-only browser state for server-rendered markup comparisons.
 * This deliberately does not emulate a DOM or run browser effects.
 */
class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(String(key)) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(String(key)); }
  setItem(key: string, value: string) { this.values.set(String(key), String(value)); }
}

export function installReadOnlyBrowser() {
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  const location = new URL('https://preview.example/');
  const fail = () => { throw new Error('Unexpected browser side effect during static rendering'); };
  const browser = {
    location,
    localStorage: local,
    sessionStorage: session,
    innerWidth: 390,
    innerHeight: 844,
    addEventListener() {},
    removeEventListener() {},
    scrollTo: fail,
    open: fail,
    setTimeout: fail,
    clearTimeout() {},
    requestAnimationFrame: fail,
    cancelAnimationFrame() {},
    matchMedia: () => ({
      matches: false, media: '', onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
    }),
  };
  const replacements: Record<string, unknown> = {
    window: browser,
    navigator: { userAgent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36', language: 'pt-AO' },
    localStorage: local,
    sessionStorage: session,
    fetch: fail,
  };
  for (const [key, value] of Object.entries(replacements)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }

  return {
    setRoute(path: string) {
      location.href = new URL(path, 'https://preview.example/').href;
      local.clear();
      session.clear();
    },
    restore() {
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

