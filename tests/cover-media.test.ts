import { describe, expect, test } from 'bun:test';
import type { Creator } from '../src/types';
import { coverTimestamp, isLegacyVideoCover, resolveCoverMedia } from '../src/utils/coverMedia';

const cover = (updates: Partial<NonNullable<Creator['cover']>> = {}): NonNullable<Creator['cover']> => ({
  type: 'video', positionX: 50, positionY: 50, visibility: 'public',
  blurAmount: 4, previewAudio: true, presentation: 'video', ...updates,
});

describe('profile cover selection and presentation', () => {
  test('an explicit image choice ignores a leftover video field', () => {
    const result = resolveCoverMedia({ banner: '/new-cover.jpg', bannerVideo: '/old-cover.mp4', cover: cover({ type: 'image' }) });
    expect(result.type).toBe('image');
    expect(result.source).toBe('/new-cover.jpg');
    expect(result.state).toBe('image');
  });

  test('legacy video fields and encoded MP4 paths remain supported', () => {
    expect(resolveCoverMedia({ banner: '/poster.jpg', bannerVideo: '/cover.mp4' }).type).toBe('video');
    expect(resolveCoverMedia({ banner: 'https://cdn.example/public%2Fcover.mp4?token=x' }).source).toBe('https://cdn.example/public%2Fcover.mp4?token=x');
    expect(isLegacyVideoCover('/photo.jpg')).toBe(false);
  });

  test('video mode never treats an old photograph as the video source', () => {
    const result = resolveCoverMedia({ banner: '/old-photo.jpg', cover: cover() });
    expect(result.source).toBe('');
    expect(result.type).toBe('video');
  });

  test('positions and blur are bounded without changing visibility or audio policy', () => {
    const result = resolveCoverMedia({ banner: '/cover.jpg', cover: cover({ positionX: -8, positionY: 145, visibility: 'blurred', blurAmount: 50, previewAudio: false }) });
    expect(result.objectPosition).toBe('0% 100%');
    expect(result.settings).toEqual({ visibility: 'blurred', blurAmount: 12, previewAudio: false });
  });

  test('nonfinite positions fall back to the centre', () => {
    expect(resolveCoverMedia({ banner: '/cover.jpg', cover: cover({ positionX: Number.NaN, positionY: Infinity }) }).objectPosition).toBe('50% 50%');
  });

  test('timezone-qualified schedule transitions at the real start and end instants', () => {
    const creator = {
      banner: '/poster.jpg', bannerVideo: '/premiere.mp4',
      cover: cover({ presentation: 'premiere', startsAt: '2026-10-20T20:00:00+01:00', endsAt: '2026-10-20T21:00:00+01:00' }),
    };
    expect(resolveCoverMedia(creator, Date.parse('2026-10-20T18:59:59Z')).state).toBe('scheduled');
    expect(resolveCoverMedia(creator, Date.parse('2026-10-20T19:00:00Z')).state).toBe('premiere');
    expect(resolveCoverMedia(creator, Date.parse('2026-10-20T20:00:00Z')).state).toBe('replay');
  });

  test('timezone-free dates are not silently interpreted in a visitor timezone', () => {
    expect(coverTimestamp('2026-10-20T20:00')).toBeUndefined();
    expect(coverTimestamp('not-a-date')).toBeUndefined();
    expect(coverTimestamp('2026-10-20T20:00:00+01:00')).toBe(Date.parse('2026-10-20T19:00:00Z'));
  });

  test('an end before the start does not turn a scheduled recording into a replay', () => {
    const result = resolveCoverMedia({ banner: '', bannerVideo: '/clip.mp4', cover: cover({
      presentation: 'premiere', startsAt: '2026-10-20T20:00:00Z', endsAt: '2026-10-20T19:00:00Z',
    }) }, Date.parse('2026-10-20T19:30:00Z'));
    expect(result.state).toBe('scheduled');
    expect(result.endsAt).toBeUndefined();
  });

  test('audience is only the administrator supplied nonnegative integer', () => {
    expect(resolveCoverMedia({ banner: '', cover: cover({ viewerCount: 123.9 }) }).viewerCount).toBe(123);
    expect(resolveCoverMedia({ banner: '', cover: cover({ viewerCount: -5 }) }).viewerCount).toBeUndefined();
    expect(resolveCoverMedia({ banner: '' }).viewerCount).toBeUndefined();
  });
});
