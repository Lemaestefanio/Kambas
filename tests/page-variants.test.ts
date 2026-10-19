import { describe, expect, test } from 'bun:test';
import type { Creator } from '../src/types';
import { getPageVariant, pageVariantHref, resolvePageVariant, safeVariantMediaUrl, validatePageVariants } from '../src/utils/pageVariants';

const original = {
  id: 'profile-one',
  name: 'Original name',
  bio: 'Original presentation',
  avatar: 'https://images.example/avatar.webp',
  banner: '/assets/banner.webp',
  checkoutUrl: 'https://pay.example/original',
  customPaymentButtonText: 'Original button',
  plans: [{ id: 'monthly', checkoutUrl: 'https://pay.example/monthly' }],
  posts: [{ id: 'post-one', type: 'video' }],
} as Creator;

describe('explicit profile variants', () => {
  test('the main experience permits checkout without an account', () => {
    const result = resolvePageVariant(original, '');
    expect(result.variant).toBe('a');
    expect(result.checkoutMode).toBe('guest');
    expect(result.creator).toEqual(original);
  });

  test('only an explicit version=b selects the account-first comparison', () => {
    expect(resolvePageVariant(original, '?creator=profile-one&version=b').checkoutMode).toBe('account');
    for (const search of ['?version=a', '?version=B', '?version=other', '?mode=login-first', '?variant=b']) {
      expect(resolvePageVariant(original, search).variant).toBe('a');
    }
    expect(resolvePageVariant(original, new URLSearchParams('version=b')).variant).toBe('b');
  });

  test('each version can use either checkout flow', () => {
    const creator = { ...original, pageVariants: {
      a: { label: 'Account first', checkoutMode: 'account' as const },
      b: { label: 'Guest comparison', checkoutMode: 'guest' as const },
    } };
    expect(resolvePageVariant(creator, '?version=a').checkoutMode).toBe('account');
    expect(resolvePageVariant(creator, '?version=b').checkoutMode).toBe('guest');
  });

  test('overrides only the selected version without modifying shared content or the source', () => {
    const creator = { ...original, pageVariants: {
      a: { label: 'Main', checkoutMode: 'guest' as const, bio: 'Version A' },
      b: { label: 'Comparison', checkoutMode: 'account' as const, bio: 'Version B', customPaymentButtonText: 'New button', checkoutUrl: 'https://pay.example/b?campaign=two', avatar: 'https://images.example/b.webp', banner: '/assets/b.webp' },
    } };
    const before = JSON.stringify(creator);
    const result = resolvePageVariant(creator, '?version=b');
    expect(result.creator.bio).toBe('Version B');
    expect(result.creator.customPaymentButtonText).toBe('New button');
    expect(result.creator.checkoutUrl).toBe('https://pay.example/b?campaign=two');
    expect(result.creator.avatar).toBe('https://images.example/b.webp');
    expect(result.creator.banner).toBe('/assets/b.webp');
    expect(result.creator.plans).toBe(creator.plans);
    expect(result.creator.posts).toBe(creator.posts);
    expect(result.creator).not.toBe(creator);
    expect(JSON.stringify(creator)).toBe(before);
    expect(resolvePageVariant(creator, '?version=a').creator.bio).toBe('Version A');
  });

  test('blank optional fields inherit the current profile values', () => {
    const creator = { ...original, pageVariants: { a: { label: '', checkoutMode: 'guest' as const, bio: '  ', customPaymentButtonText: '', checkoutUrl: '', avatar: '', banner: '' } } };
    const result = resolvePageVariant(creator, '');
    for (const field of ['bio', 'customPaymentButtonText', 'checkoutUrl', 'avatar', 'banner'] as const) expect(result.creator[field]).toBe(original[field]);
  });

  test('a variant cover image replaces a base video without changing the original configuration', () => {
    const creator = { ...original, bannerVideo: 'https://video.example/cover.mp4', cover: { type: 'video' as const, positionX: 35, positionY: 60, visibility: 'public' as const, blurAmount: 4, previewAudio: false, presentation: 'video' as const }, pageVariants: { b: { label: 'Image comparison', checkoutMode: 'guest' as const, banner: '/assets/comparison.webp' } } };
    const result = resolvePageVariant(creator, '?version=b').creator;
    expect(result.banner).toBe('/assets/comparison.webp');
    expect(result.bannerVideo).toBe('');
    expect(result.cover).toEqual({ ...creator.cover, type: 'image' });
    expect(creator.cover.type).toBe('video');
    expect(creator.bannerVideo).toBe('https://video.example/cover.mp4');
    expect(resolvePageVariant(creator, '?version=a').creator.cover).toBe(creator.cover);
    expect(resolvePageVariant(creator, '?version=a').creator.bannerVideo).toBe(creator.bannerVideo);
  });

  test('unsafe links never replace the current media or checkout', () => {
    for (const unsafe of ['javascript:alert(1)', 'data:text/html,test', '//untrusted.example', 'http://untrusted.example', 'https://user:password@example.com', '/\\untrusted.example']) {
      const creator = { ...original, pageVariants: { b: { label: 'B', checkoutMode: 'account' as const, avatar: unsafe, banner: unsafe, checkoutUrl: unsafe } } };
      const result = resolvePageVariant(creator, '?version=b');
      expect(result.creator.avatar).toBe(original.avatar);
      expect(result.creator.banner).toBe(original.banner);
      expect(result.creator.checkoutUrl).toBe(original.checkoutUrl);
    }
  });

  test('unknown fields and malformed persisted values cannot override the profile', () => {
    const creator = { ...original, pageVariants: { b: { label: 42, checkoutMode: 'bad-flow', bio: {}, avatar: ['https://example.com'], name: 'Unexpected name', posts: [], actionLinks: { subscribe: 'https://elsewhere.example' } } } } as unknown as Creator;
    expect(getPageVariant(creator, 'b')).toEqual({ label: 'Compra com conta', checkoutMode: 'account' });
    expect(resolvePageVariant(creator, '?version=b').creator.name).toBe(original.name);
    expect(resolvePageVariant(creator, '?version=b').creator.posts).toBe(original.posts);
    expect(resolvePageVariant(creator, '?version=b').creator.actionLinks).toBeUndefined();
  });

  test('share links preserve the selected profile and encode the complete identifier', () => {
    const href = pageVariantHref('profile & second=other/á', 'b');
    const url = new URL(href, 'https://platform.example');
    expect(url.pathname).toBe('/');
    expect(url.searchParams.get('creator')).toBe('profile & second=other/á');
    expect(url.searchParams.get('version')).toBe('b');
    expect([...url.searchParams.keys()]).toEqual(['creator', 'version']);
  });

  test('only HTTPS or public asset locations can override media', () => {
    expect(safeVariantMediaUrl('assets/profile.webp')).toBe('/assets/profile.webp');
    expect(safeVariantMediaUrl('/assets/profile.webp')).toBe('/assets/profile.webp');
    expect(safeVariantMediaUrl('https://images.example/profile.webp')).toBe('https://images.example/profile.webp');
    expect(safeVariantMediaUrl('/arbitrary/private/path')).toBeNull();
  });

  test('draft validation permits inherited values and all supported overrides', () => {
    expect(validatePageVariants(undefined)).toBeNull();
    expect(validatePageVariants({})).toBeNull();
    expect(validatePageVariants({ a: { label: '', checkoutMode: 'guest', bio: '', checkoutUrl: '', avatar: '', banner: '' } })).toBeNull();
    expect(validatePageVariants({ b: { label: 'Comparison', checkoutMode: 'account', bio: 'New presentation', customPaymentButtonText: 'Buy', checkoutUrl: 'https://pay.example/b', avatar: 'https://images.example/b.webp', banner: '/assets/b.webp' } })).toBeNull();
  });

  test('draft validation catches incomplete, unknown and unsafe configuration before save', () => {
    for (const input of [null, [], { c: {} }, { a: {} }, { a: { label: 'A', checkoutMode: 'other' } },
      { b: { label: 'B', checkoutMode: 'guest', unexpected: true } },
      { b: { label: 'B', checkoutMode: 'guest', bio: 'x'.repeat(20001) } },
      { b: { label: 'B', checkoutMode: 'guest', checkoutUrl: 'javascript:alert(1)' } },
      { b: { label: 'B', checkoutMode: 'guest', avatar: '//images.example/b.webp' } },
      { b: { label: 'B', checkoutMode: 'guest', banner: '/not-public-assets/b.webp' } },
      { b: { label: 'B', checkoutMode: 'guest', checkoutUrl: ' https://pay.example/b ' } },
    ]) expect(validatePageVariants(input)).toBeString();
  });
});
