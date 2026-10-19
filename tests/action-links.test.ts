import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { Creator } from '../src/types';
import { openConfiguredAction, safeActionUrl } from '../src/utils/actionLinks';

const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
afterEach(() => {
  if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

describe('configured destinations permit only deliberate HTTPS and same-origin paths', () => {
  test('valid destinations keep path, query and fragment', () => {
    expect(safeActionUrl('https://checkout.example/plan?creator=one#pay')).toBe('https://checkout.example/plan?creator=one#pay');
    expect(safeActionUrl(' https://example.com ')).toBe('https://example.com/');
    expect(safeActionUrl('/')).toBe('/');
    expect(safeActionUrl('/mensagens?creator=one')).toBe('/mensagens?creator=one');
  });
  for (const value of [
    undefined, null, 42, {}, '', ' ', 'javascript:alert(1)', 'data:text/html,test',
    'http://example.com', 'mailto:owner@example.com', '//outside.example', '///outside.example',
    '/\\outside.example', 'https://outside.example\\evil', '/path\nnext', '/path\u0000next',
    'https://outside.example/with space', 'https://user@example.com', 'https://user:password@example.com',
    'relative/path', '#only-fragment', '/'.padEnd(4097, 'a'),
  ]) {
    test(`rejects ${JSON.stringify(value)?.slice(0, 80)}`, () => {
      expect(safeActionUrl(value)).toBeNull();
    });
  }
  test('unsafe or missing configuration leaves the built-in action available', () => {
    const assign = mock(() => {});
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { assign } } });
    expect(openConfiguredAction({ actionLinks: { message: '//outside.example' } } as Creator, 'message')).toBe(false);
    expect(openConfiguredAction({} as Creator, 'login')).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
  test('only the requested valid action navigates', () => {
    const assign = mock(() => {});
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { assign } } });
    const creator = { actionLinks: { message: '/mensagens?creator=one', tip: 'https://checkout.example/tip' } } as Creator;
    expect(openConfiguredAction(creator, 'message')).toBe(true);
    expect(assign.mock.calls).toEqual([['/mensagens?creator=one']]);
  });
});
