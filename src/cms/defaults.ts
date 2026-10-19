import { BANK_DETAILS, FAQ_ITEMS } from '../data/content';
import { HOME_COPY } from './copy-home';
import { OVERLAY_COPY } from './copy-overlays';
import type { CopyField, SiteSettings } from './types';

export const ROOT_COPY: Record<string, CopyField> = {
  'site.title': { section: 'Identidade e rodapé', label: 'Título no navegador', value: 'Luanda Privé · Portal Exclusivo VIP' },
  'site.footerBrand': { section: 'Identidade e rodapé', label: 'Nome e localização', value: 'Luanda Privé · Luanda, Angola' },
  'site.footerNotice': { section: 'Identidade e rodapé', label: 'Aviso do rodapé', value: 'Acesso exclusivo para maiores de 18 anos. Pagamentos discretos e seguros via Multicaixa Express.' },
  'site.footerCopyright': { section: 'Identidade e rodapé', label: 'Direitos reservados', value: '© 2026 Luanda Privé · Todos os direitos reservados' },
  'site.promoBrand': { section: 'Página de promoção', label: 'Nome na promoção', value: 'Luanda Privé · ' },
  'site.promoOffer': { section: 'Página de promoção', label: 'Oferta', value: '50% DE DESCONTO VIP' },
  'site.promoExpiry': { section: 'Página de promoção', label: 'Texto do prazo', value: 'Oferta de boas-vindas expira em:' },
  'site.promoButton': { section: 'Página de promoção', label: 'Botão', value: 'Aproveitar' },
};

export const COPY_FIELDS: Record<string, CopyField> = { ...ROOT_COPY, ...HOME_COPY, ...OVERLAY_COPY };

/** These are the approved original values, used until content is published. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  version: 1,
  copy: Object.fromEntries(Object.entries(COPY_FIELDS).map(([key, field]) => [key, field.value])),
  faqs: FAQ_ITEMS.map(item => ({ ...item })),
  bankDetails: { ...BANK_DETAILS },
};

export function mergeSiteSettings(remote: Partial<SiteSettings> | null): SiteSettings {
  const copy = { ...DEFAULT_SITE_SETTINGS.copy };
  for (const [key, value] of Object.entries(remote?.copy ?? {})) {
    if (typeof value === 'string') copy[key] = value;
  }
  const bankDetails = { ...DEFAULT_SITE_SETTINGS.bankDetails };
  for (const key of Object.keys(bankDetails) as Array<keyof typeof bankDetails>) {
    if (typeof remote?.bankDetails?.[key] === 'string') bankDetails[key] = remote.bankDetails[key];
  }
  return {
    version: 1,
    copy,
    bankDetails,
    faqs: Array.isArray(remote?.faqs)
      ? remote.faqs.filter(item => typeof item?.question === 'string' && typeof item?.answer === 'string')
      : DEFAULT_SITE_SETTINGS.faqs,
  };
}

export function resolveCopy(settings: SiteSettings, key: string, params: Record<string, string | number> = {}): string {
  const value = settings.copy[key] ?? COPY_FIELDS[key]?.value ?? '';
  return value.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}
