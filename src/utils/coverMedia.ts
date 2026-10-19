import type { Creator, MediaPreviewSettings } from '../types';
import { previewBlurAmount } from './mediaPreview';

export type CoverState = 'image' | 'video' | 'scheduled' | 'premiere' | 'replay';

export interface ResolvedCoverMedia {
  type: 'image' | 'video';
  source: string;
  poster?: string;
  objectPosition: string;
  settings: MediaPreviewSettings;
  state: CoverState;
  startsAt?: number;
  endsAt?: number;
  viewerCount?: number;
}

export function isLegacyVideoCover(source: string): boolean {
  let value = source;
  try { value = decodeURIComponent(source); } catch { /* Keep malformed legacy paths readable. */ }
  return /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(value) || /(?:^data:video\/|\/video\/)/i.test(value);
}

function position(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
}

/** Dates without an explicit timezone are not safe scheduling inputs. */
export function coverTimestamp(value?: string): number | undefined {
  if (!value || value.length > 40 || !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/.test(value)) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

/** A recorded premiere starts immediately unless the administrator already set a schedule. */
export function withCoverPresentation(
  cover: NonNullable<Creator['cover']>,
  presentation: NonNullable<Creator['cover']>['presentation'],
  now = Date.now(),
): NonNullable<Creator['cover']> {
  return {
    ...cover,
    presentation,
    ...(presentation === 'premiere' && !cover.startsAt ? { startsAt: new Date(now).toISOString() } : {}),
  };
}

export function resolveCoverMedia(
  creator: Pick<Creator, 'banner' | 'bannerVideo' | 'cover'>,
  now = Date.now(),
): ResolvedCoverMedia {
  const cover = creator.cover;
  const banner = creator.banner?.trim() || '';
  const video = creator.bannerVideo?.trim() || '';
  const legacyVideo = isLegacyVideoCover(banner);
  const type = cover?.type || (video || legacyVideo ? 'video' : 'image');
  const source = type === 'video' ? video || (legacyVideo ? banner : '') : legacyVideo ? '' : banner;
  const visibility = cover?.visibility === 'blurred' ? 'blurred' : 'public';
  const startsAt = coverTimestamp(cover?.startsAt);
  const proposedEnd = coverTimestamp(cover?.endsAt);
  const endsAt = proposedEnd !== undefined && (startsAt === undefined || proposedEnd > startsAt) ? proposedEnd : undefined;
  let state: CoverState = type;
  if (type === 'video' && cover?.presentation === 'premiere') {
    if (startsAt !== undefined && now < startsAt) state = 'scheduled';
    else if (endsAt !== undefined && now >= endsAt) state = 'replay';
    else state = 'premiere';
  }
  const count = cover?.viewerCount;
  return {
    type,
    source,
    // Posters are only displayed by the scheduled premiere screen, never over normal video.
    poster: !legacyVideo && banner ? banner : undefined,
    objectPosition: `${position(cover?.positionX)}% ${position(cover?.positionY)}%`,
    settings: {
      visibility,
      blurAmount: previewBlurAmount(cover || {}),
      previewAudio: cover?.previewAudio ?? visibility === 'public',
    },
    state,
    startsAt,
    endsAt,
    viewerCount: typeof count === 'number' && Number.isFinite(count) && count >= 0 ? Math.floor(count) : undefined,
  };
}
