import type { Creator, PageVariant } from '../types';
import { safeActionUrl } from './actionLinks';

export type PageVariantKey = 'a' | 'b';

export const DEFAULT_PAGE_VARIANTS: Record<PageVariantKey, PageVariant> = {
  a: { label: 'Compra sem conta', checkoutMode: 'guest' },
  b: { label: 'Compra com conta', checkoutMode: 'account' },
};

const overrideFields = ['bio', 'customPaymentButtonText', 'checkoutUrl', 'avatar', 'banner'] as const;
const allowedKeys = new Set(['label', 'checkoutMode', ...overrideFields]);

/** Media paths follow the same allowed public asset locations as Firestore rules. */
export function safeVariantMediaUrl(value: unknown): string | null {
  const candidate = typeof value === 'string' && value.trim().startsWith('assets/') ? `/${value.trim()}` : value;
  const url = safeActionUrl(candidate);
  return url && (url.startsWith('https://') || url.startsWith('/assets/')) ? url : null;
}

export function validatePageVariants(value: unknown): string | null {
  if (value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some((key) => key !== 'a' && key !== 'b')) return 'As versões do perfil devem ser A e B.';
  for (const [key, item] of Object.entries(value)) {
    const label = `Versão ${key.toUpperCase()}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)
        || Object.keys(item).some((field) => !allowedKeys.has(field))) return `${label}: formato inválido.`;
    if (typeof item.label !== 'string' || item.label.length > 120) return `${label}: o nome deve ter até 120 caracteres.`;
    if (item.checkoutMode !== 'guest' && item.checkoutMode !== 'account') return `${label}: escolhe como a pessoa segue para o pagamento.`;
    for (const [field, limit, name] of [['bio', 20000, 'apresentação'], ['customPaymentButtonText', 200, 'texto do botão']] as const) {
      if (item[field] !== undefined && (typeof item[field] !== 'string' || item[field].length > limit)) return `${label}: o campo ${name} deve ter até ${limit.toLocaleString('pt-AO')} caracteres.`;
    }
    for (const field of ['checkoutUrl', 'avatar', 'banner'] as const) {
      const content = item[field];
      if (content === undefined || content === '') continue;
      const name = field === 'checkoutUrl' ? 'pagamento' : field === 'avatar' ? 'fotografia' : 'capa';
      if (typeof content !== 'string' || content.length > 4096 || content !== content.trim()) return `${label}: verifica o endereço de ${name} e remove espaços no início ou no fim.`;
      const valid = field === 'checkoutUrl' ? safeActionUrl(content) : safeVariantMediaUrl(content);
      if (!valid) return `${label}: o endereço de ${name} deve usar HTTPS${field === 'checkoutUrl' ? ' ou um caminho interno que começa por /' : ' ou /assets/'}.`;
    }
  }
  return null;
}

/** Only known string fields are accepted from the persisted variant configuration. */
export function getPageVariant(creator: Creator, variant: PageVariantKey): PageVariant {
  const defaults = DEFAULT_PAGE_VARIANTS[variant];
  const saved = creator.pageVariants?.[variant];
  const result: PageVariant = { ...defaults };
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return result;
  if (typeof saved.label === 'string') result.label = saved.label;
  if (saved.checkoutMode === 'guest' || saved.checkoutMode === 'account') result.checkoutMode = saved.checkoutMode;
  for (const field of overrideFields) {
    if (typeof saved[field] === 'string') result[field] = saved[field];
  }
  return result;
}

/** An explicit URL chooses the version; there is no random assignment or stored audience. */
export function resolvePageVariant(creator: Creator, search: string | URLSearchParams) {
  const params = new URLSearchParams(search);
  const variant: PageVariantKey = params.get('version') === 'b' ? 'b' : 'a';
  const configuration = getPageVariant(creator, variant);
  const resolved: Creator = { ...creator };
  for (const field of ['bio', 'customPaymentButtonText'] as const) {
    const value = configuration[field]?.trim();
    if (value) resolved[field] = value;
  }
  for (const field of ['checkoutUrl', 'avatar', 'banner'] as const) {
    const value = field === 'checkoutUrl' ? safeActionUrl(configuration[field]) : safeVariantMediaUrl(configuration[field]);
    if (value) resolved[field] = value;
    // A variant's image cover must replace, rather than sit behind, the base video.
    if (field === 'banner' && value) {
      resolved.bannerVideo = '';
      if (creator.cover) resolved.cover = { ...creator.cover, type: 'image' };
    }
  }
  return { creator: resolved, variant, checkoutMode: configuration.checkoutMode };
}

export function pageVariantHref(creatorId: string, variant: PageVariantKey): string {
  return `/?${new URLSearchParams({ creator: creatorId, version: variant }).toString()}`;
}
