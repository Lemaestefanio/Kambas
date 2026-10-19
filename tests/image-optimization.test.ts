import { describe, expect, test } from 'bun:test';
import { fitImageDimensions, optimizeImageFile } from '../src/utils/imageCompressor';

describe('image upload sizing', () => {
  test('constrains landscape and portrait photographs to 1600 px', () => {
    expect(fitImageDimensions(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitImageDimensions(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });

  test('does not enlarge a small source or collapse a narrow source to zero', () => {
    expect(fitImageDimensions(640, 480)).toEqual({ width: 640, height: 480 });
    expect(fitImageDimensions(1, 40000)).toEqual({ width: 1, height: 1600 });
  });

  test('rejects unusable source dimensions', () => {
    for (const value of [0, -1, NaN, Infinity]) {
      expect(() => fitImageDimensions(value, 100)).toThrow();
      expect(() => fitImageDimensions(100, value)).toThrow();
      expect(() => fitImageDimensions(100, 100, value)).toThrow();
    }
  });
});

describe('image upload format preservation', () => {
  test('preserves possible animation and non-image media without decoding', async () => {
    for (const type of ['image/gif', 'image/webp', 'image/avif', 'video/mp4', 'audio/mpeg']) {
      const file = new File(['unchanged media bytes'], 'original', { type });
      expect(await optimizeImageFile(file)).toBe(file);
    }
  });

  test('preserves APNG even though its MIME type is image/png', async () => {
    // The PNG signature plus an animation-control chunk must bypass canvas.
    const file = new File([new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10,
      0, 0, 0, 8, 97, 99, 84, 76,
      0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0,
    ])], 'animated.png', { type: 'image/png' });
    expect(await optimizeImageFile(file)).toBe(file);
  });
});
