import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeToSiteSettings } from '../firebase';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, resolveCopy } from './defaults';
import type { SiteSettings } from './types';

interface SiteContentValue {
  settings: SiteSettings;
  copy: (key: string, params?: Record<string, string | number>) => string;
  loading: boolean;
  error: string | null;
}

const SiteContext = createContext<SiteContentValue>({
  settings: DEFAULT_SITE_SETTINGS,
  copy: (key, params) => resolveCopy(DEFAULT_SITE_SETTINGS, key, params),
  loading: true,
  error: null,
});

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => subscribeToSiteSettings(data => {
    setSettings(mergeSiteSettings(data));
    setLoading(false);
    setError(null);
  }, () => {
    setLoading(false);
    setError('Não foi possível carregar o conteúdo do banco. A página mantém os valores originais.');
  }), []);
  useEffect(() => {
    document.title = resolveCopy(settings, 'site.title');
  }, [settings]);
  const value = useMemo(() => ({
    settings, loading, error,
    copy: (key: string, params?: Record<string, string | number>) => resolveCopy(settings, key, params),
  }), [settings, loading, error]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSiteContent = () => useContext(SiteContext);
