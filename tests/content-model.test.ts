import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'bun:test';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, resolveCopy } from '../src/cms/defaults';
import type { SiteSettings } from '../src/cms/types';

describe('published site settings', () => {
  test('unpublished content retains every original default', () => {
    expect(mergeSiteSettings(null)).toEqual(DEFAULT_SITE_SETTINGS);
  });

  test('partial documents preserve untouched copy and bank fields', () => {
    const result = mergeSiteSettings({
      copy: { 'site.title': 'Título editado' },
      bankDetails: { bankName: 'Banco editado' } as SiteSettings['bankDetails'],
    });
    expect(result.copy['site.title']).toBe('Título editado');
    expect(result.copy['site.footerNotice']).toBe(DEFAULT_SITE_SETTINGS.copy['site.footerNotice']);
    expect(result.bankDetails.bankName).toBe('Banco editado');
    expect(result.bankDetails.iban).toBe(DEFAULT_SITE_SETTINGS.bankDetails.iban);
    expect(DEFAULT_SITE_SETTINGS.copy['site.title']).not.toBe('Título editado');
  });

  test('intentional empty strings stay empty after publishing and loading', () => {
    const result = mergeSiteSettings({
      copy: { 'site.title': '' },
      bankDetails: { unitelMoney: '' } as SiteSettings['bankDetails'],
    });
    expect(resolveCopy(result, 'site.title')).toBe('');
    expect(result.bankDetails.unitelMoney).toBe('');
  });

  test('an empty published FAQ list does not restore deleted defaults', () => {
    expect(mergeSiteSettings({ faqs: [] }).faqs).toEqual([]);
  });

  test('FAQ replacements preserve order and remove unlisted questions', () => {
    const faqs = [
      { question: 'Segunda pergunta editada', answer: '' },
      { question: 'Primeira pergunta editada', answer: 'Resposta nova' },
    ];
    expect(mergeSiteSettings({ faqs }).faqs).toEqual(faqs);
  });

  test('malformed remote values do not turn into visible objects or numbers', () => {
    const result = mergeSiteSettings({
      copy: { 'site.title': { html: 'invalid' } },
      faqs: [null, { question: 'incomplete' }, { question: 'Válida', answer: 'Sim' }],
    } as unknown as Partial<SiteSettings>);
    expect(result.copy['site.title']).toBe(DEFAULT_SITE_SETTINGS.copy['site.title']);
    expect(result.faqs).toEqual([{ question: 'Válida', answer: 'Sim' }]);
  });
});

describe('editable text interpolation', () => {
  test('substitution runs once and retains literal dollar signs and braces in values', () => {
    const settings = mergeSiteSettings({ copy: { example: 'Olá {name}, total {count}. {missing}' } });
    expect(resolveCopy(settings, 'example', { name: '$& {count}', count: 0 }))
      .toBe('Olá $& {count}, total 0. {missing}');
  });

  test('inherited object properties cannot become interpolation parameters', () => {
    const settings = mergeSiteSettings({ copy: { example: '{name} {constructor}' } });
    const params = Object.create({ name: 'not supplied' });
    expect(resolveCopy(settings, 'example', params)).toBe('{name} {constructor}');
  });

  test('edited text and interpolated names are rendered as text, not HTML', () => {
    const settings = mergeSiteSettings({
      copy: { example: '<script>alert(1)</script> Olá {name}' },
    });
    const content = resolveCopy(settings, 'example', { name: '<img src=x onerror=alert(1)>' });
    const html = renderToStaticMarkup(React.createElement('p', null, content));
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
  });
});
