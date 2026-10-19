import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'bun:test';
import type { Creator } from '../src/types';
import { CoverEditor, coverEditorSettings, toLocalDateInput, validateCover } from '../src/cms/CoverEditor';

const creator = (extra: Partial<Creator> = {}): Creator => ({
  id: 'cover-profile', name: 'Perfil', avatar: '', banner: '/assets/previous-photo.jpg',
  ...extra,
} as Creator);
const config = (extra: Partial<NonNullable<Creator['cover']>> = {}): NonNullable<Creator['cover']> => ({
  type: 'image', positionX: 50, positionY: 50, visibility: 'public', blurAmount: 4, previewAudio: true, presentation: 'video', ...extra,
});
const render = (value: Creator) => renderToStaticMarkup(<CoverEditor creator={value} onChange={() => {}} onUpload={async () => { throw new Error('Unexpected upload'); }} />);

describe('cover editor', () => {
  test('preserves legacy inference and respects an explicit image selection', () => {
    expect(coverEditorSettings(creator()).type).toBe('image');
    expect(coverEditorSettings(creator({ bannerVideo: '/assets/video.mp4' })).type).toBe('video');
    expect(coverEditorSettings(creator({ bannerVideo: '/assets/video.mp4', cover: config() })).type).toBe('image');
  });
  test('video mode never renders the old photo as a cover or video poster', () => {
    const html = render(creator({ bannerVideo: '/assets/current-video.mp4', cover: config({ type: 'video' }) }));
    expect(html).toContain('Enviar ficheiro: Vídeo da capa');
    expect(html).not.toContain('Enviar ficheiro: Foto da capa');
    expect(html).not.toContain('/assets/previous-photo.jpg');
    expect(html).not.toContain('poster=');
    expect(html).toContain('Posição horizontal');
    expect(html).toContain('Posição vertical');
  });
  test('empty video selection shows a neutral placeholder without the saved photo', () => {
    const html = render(creator({ cover: config({ type: 'video' }) }));
    expect(html).not.toContain('/assets/previous-photo.jpg');
    expect(html).toContain('um vídeo');
  });
  test('converts an ISO schedule to local form without changing the instant', () => {
    const iso = '2026-10-19T12:30:00.000Z';
    expect(new Date(toLocalDateInput(iso)).toISOString()).toBe(iso);
    expect(toLocalDateInput('invalid')).toBe('');
  });
  test('validates premiere timing, crop bounds and explicitly supplied audience', () => {
    const base = creator({ bannerVideo: '/assets/clip.mp4', cover: config({ type: 'video', presentation: 'premiere' }) });
    expect(validateCover(base)).toContain('início');
    expect(validateCover({ ...base, cover: { ...base.cover!, startsAt: '2026-10-19T12:00:00.000Z', endsAt: '2026-10-19T11:00:00.000Z' } })).toContain('posterior');
    expect(validateCover({ ...base, cover: { ...base.cover!, startsAt: '2026-10-19T12:00:00.000Z', viewerCount: -1 } })).toContain('audiência');
    expect(validateCover(creator({ cover: config({ positionX: 101 }) }))).toContain('posição');
    expect(validateCover({ ...base, cover: { ...base.cover!, startsAt: '2026-10-19T12:00:00.000Z', endsAt: '2026-10-19T13:00:00.000Z', viewerCount: 50 } })).toBeNull();
  });
});
