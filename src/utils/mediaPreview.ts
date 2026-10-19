import type { MediaPreviewSettings } from '../types';

/** Legacy posts/gallery use unlocked; story highlights were public by default. */
export function isMediaPublic(settings: MediaPreviewSettings, defaultPublic = false): boolean {
  if (settings.visibility === 'public') return true;
  if (settings.visibility === 'blurred') return false;
  return settings.unlocked ?? defaultPublic;
}

export function previewBlurAmount(settings: MediaPreviewSettings): number {
  const value = settings.blurAmount;
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(12, Math.max(2, value)) : 4;
}

export function isPreviewAudioAllowed(settings: MediaPreviewSettings, defaultPublic = false): boolean {
  return isMediaPublic(settings, defaultPublic) ? settings.previewAudio !== false : settings.previewAudio === true;
}

export function mediaPreviewSource(original: string, settings: MediaPreviewSettings, defaultPublic = false): string {
  return !isMediaPublic(settings, defaultPublic) && settings.previewUrl?.trim()
    ? settings.previewUrl.trim()
    : original;
}
