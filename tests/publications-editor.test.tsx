import React, { act, useState } from 'react';
import type { Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import type { CreatorPost } from '../src/types';
import { changePublicationType, PublicationsEditor, validatePublications } from '../src/cms/editor';
import { installTestDOM } from './dom-environment';

const dom = installTestDOM();
let createRoot: typeof import('react-dom/client').createRoot;
let root: Root | undefined;
let container: HTMLElement;
let current: CreatorPost[] = [];
const fixture = (extra: Partial<CreatorPost> = {}): CreatorPost => ({
  id: 'publication-one', type: 'photo', image: '/assets/example.jpg', time: 'Hoje', text: 'Legenda de teste',
  likes: 0, comments: 0, visibility: 'blurred', blurAmount: 6, unlocked: false, ...extra,
});
beforeAll(async () => { ({ createRoot } = await import('react-dom/client')); });
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); });
afterEach(async () => { if (root) await act(async () => { root!.unmount(); }); root = undefined; container.remove(); });
afterAll(() => dom.restore());

async function renderEditor(initial: CreatorPost[] = []) {
  current = initial;
  function Harness() {
    const [posts, setPosts] = useState(initial);
    current = posts;
    return <PublicationsEditor value={posts} onChange={setPosts} onUpload={async () => { throw new Error('Unexpected upload'); }} path="posts" />;
  }
  root = createRoot(container);
  await act(async () => { root!.render(<Harness />); });
}
async function clickText(text: string) {
  const button = [...container.querySelectorAll('button')].find((element) => element.textContent?.trim() === text);
  expect(button).toBeDefined();
  await act(async () => { button!.click(); });
}

describe('publication creation flow', () => {
  test('asks for the type before creating a photo and only shows image controls', async () => {
    await renderEditor();
    await clickText('Adicionar publicação');
    expect(current).toHaveLength(0);
    await clickText('Foto');
    expect(current[0].type).toBe('photo');
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Enviar ficheiro: Foto da publicação"]');
    expect(input?.accept).toContain('image/jpeg');
    expect(input?.accept).not.toContain('video/');
    expect(container.querySelector('input[aria-label="Enviar ficheiro: Vídeo da publicação"]')).toBeNull();
    expect(container.textContent).not.toContain('Permitir áudio');
    expect(container.textContent).not.toContain('Capa do vídeo');
  });
  test('video creation exposes video upload and audio, with a separate optional image cover', async () => {
    await renderEditor();
    await clickText('Adicionar publicação');
    await clickText('Vídeo');
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Enviar ficheiro: Vídeo da publicação"]');
    expect(input?.accept).toContain('video/mp4');
    expect(input?.accept).not.toContain('image/');
    expect(container.textContent).toContain('Permitir áudio');
    expect(container.querySelector<HTMLInputElement>('input[aria-label="Enviar ficheiro: Capa do vídeo"]')?.accept).toContain('image/jpeg');
    expect(container.querySelector('input[aria-label="Enviar ficheiro: Foto da publicação"]')).toBeNull();
  });
  test('changing type confirms before removing incompatible files and preserves audience settings', async () => {
    await renderEditor([fixture({ type: 'video', video: '/assets/example.mp4', image: '/assets/poster.jpg', previewUrl: '/assets/preview.mp4', posterUrl: '/assets/poster.webp', previewAudio: true, duration: '0:30' })]);
    await act(async () => { container.querySelector<HTMLButtonElement>('button[aria-controls="publication-publication-one"]')!.click(); });
    await clickText('Foto');
    expect(current[0].type).toBe('video');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Mudar para Foto');
    await clickText('Mudar tipo');
    expect(current[0]).toMatchObject({ type: 'photo', image: '', text: 'Legenda de teste', visibility: 'blurred', blurAmount: 6 });
    for (const key of ['video', 'previewUrl', 'posterUrl', 'previewAudio', 'duration']) expect(current[0]).not.toHaveProperty(key);
  });
});

describe('publication media validation', () => {
  test('does not mutate the original when switching format', () => {
    const original = fixture();
    const next = changePublicationType(original, 'video');
    expect(original.image).toBe('/assets/example.jpg');
    expect(next).toMatchObject({ type: 'video', video: '', previewAudio: false, blurAmount: 6 });
    expect(next).not.toHaveProperty('image');
  });
  test('rejects new empty media and mismatched original/preview formats', () => {
    expect(validatePublications([fixture({ image: '' })])).toContain('envia a foto');
    expect(validatePublications([fixture({ image: '/assets/wrong.mp4' })])).toContain('formato correto');
    expect(validatePublications([fixture({ type: 'video', video: '/assets/clip.mp4', previewUrl: '/assets/wrong.jpg' })])).toContain('formato correto');
    expect(validatePublications([fixture({ type: 'video', video: '/assets/clip.mp4', posterUrl: '/assets/wrong.webm' })])).toContain('capa');
  });
  test('preserves untouched legacy banner fallbacks while validating newly selected media', () => {
    const original = fixture({ image: '' });
    expect(validatePublications([original], [original])).toBeNull();
    expect(validatePublications([{ ...original, text: 'Legenda atualizada' }], [original])).toBeNull();
    expect(validatePublications([{ ...original, image: '/assets/new.mp4' }], [original])).not.toBeNull();
  });
});
