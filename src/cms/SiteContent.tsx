import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeToSiteSettings } from '../firebase';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, resolveCopy } from './defaults';
import type { SiteSettings } from './types';

interface SiteContentValue {
  settings: SiteSettings;
  copy: (key: string, params?: Record<string, string | number>) => string;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const SiteContext = createContext<SiteContentValue>({
  settings: DEFAULT_SITE_SETTINGS,
  copy: (key, params) => resolveCopy(DEFAULT_SITE_SETTINGS, key, params),
  loading: true,
  error: null,
  retry: () => {},
});

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt(value => value + 1);
  }, []);
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const fail = () => {
      if (!active) return;
      setLoading(false);
      setError('A página está temporariamente indisponível. Verifica a ligação e tenta novamente.');
    };
    const timeout = window.setTimeout(fail, 12_000);
    try {
      unsubscribe = subscribeToSiteSettings(data => {
        if (!active) return;
        window.clearTimeout(timeout);
        setSettings(mergeSiteSettings(data));
        setLoading(false);
        setError(null);
      }, () => {
        window.clearTimeout(timeout);
        fail();
      });
    } catch {
      window.clearTimeout(timeout);
      fail();
    }
    return () => {
      active = false;
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [attempt]);
  useEffect(() => {
    if (!loading && !error) document.title = resolveCopy(settings, 'site.title');
  }, [settings, loading, error]);
  const value = useMemo(() => ({
    settings, loading, error, retry,
    copy: (key: string, params?: Record<string, string | number>) => resolveCopy(settings, key, params),
  }), [settings, loading, error, retry]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSiteContent = () => useContext(SiteContext);
