import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDataMedia, inspectCreator, replaceValues, encodeBackup, sha256 } from './legacy-media-core.mjs';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 1, 2, 3]);
const dataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
const base = () => ({ id: 'profile-1', avatar: dataUrl, createdAt: '2026-10-18T23:04:28.636Z', updatedAt: '2026-10-19T14:52:45.071Z' });

test('preserves bytes and produces the same hash for repeated media', () => {
  const first = parseDataMedia(dataUrl);
  assert.deepEqual(first.bytes, jpeg);
  assert.equal(first.hash, sha256(jpeg));
  assert.equal(first.hash, parseDataMedia(dataUrl).hash);
  assert.equal(first.mime, 'image/jpeg');
  assert.equal(first.extension, 'jpg');
});

test('rejects malformed or non-canonical base64 without decoding it silently', () => {
  for (const value of ['data:image/jpeg;base64,', 'data:image/jpeg;base64,%%%=', 'data:image/jpeg;base64,/9j/4A=', 'data:image/jpeg,hello']) {
    assert.throws(() => parseDataMedia(value));
  }
});

test('rejects active media and mismatched signatures', () => {
  assert.throws(() => parseDataMedia(`data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}`));
  assert.throws(() => parseDataMedia(`data:image/png;base64,${jpeg.toString('base64')}`));
  assert.throws(() => parseDataMedia(`data:image/jpeg;base64,${Buffer.from('<html>test</html>').toString('base64')}`));
});

test('inventories all supported creator media fields and dates', () => {
  const document = { ...base(), banner: dataUrl, previewVideo: dataUrl, bannerVideo: dataUrl,
    posts: [{ image: dataUrl, video: dataUrl }], highlights: [{ coverImage: dataUrl, mediaUrl: dataUrl }],
    galleryPhotos: [{ url: dataUrl }], voiceNotes: [{ url: dataUrl }], bio: 'Existing text' };
  const result = inspectCreator(document, 'profile-1');
  assert.equal(result.issues.length, 0);
  assert.equal(result.media.length, 10);
  assert.equal(result.timestamps.length, 2);
  assert.equal(result.timestamps[0].milliseconds, Date.parse(document.createdAt));
});

test('reports local and unknown data references instead of discarding them', () => {
  const document = { ...base(), banner: 'idb://existing', previewVideo: 'blob:https://example.test/1', extra: dataUrl };
  const before = JSON.stringify(document);
  const result = inspectCreator(document, 'profile-1');
  assert.deepEqual(result.issues.map(item => item.path), [['banner'], ['previewVideo'], ['extra']]);
  assert.equal(JSON.stringify(document), before);
});

test('rejects wrong identity and impossible or absent timestamps', () => {
  const result = inspectCreator({ ...base(), id: 'other', createdAt: '2026-02-30T12:00:00Z', updatedAt: undefined }, 'profile-1');
  assert.deepEqual(result.issues.map(item => item.path), [['id'], ['createdAt'], ['updatedAt']]);
});

test('accepts ISO precision variants without inventing time', () => {
  for (const value of ['2026-10-19T14:52:45Z', '2026-10-19T14:52:45.1Z', '2026-10-19T14:52:45.01Z', '2026-10-19T14:52:45.001Z']) {
    const result = inspectCreator({ id: 'profile-1', updatedAt: value }, 'profile-1');
    assert.equal(result.issues.length, 0);
    assert.equal(result.timestamps[0].milliseconds, Date.parse(value));
  }
});

test('preserves an existing Timestamp and permits absent optional createdAt', () => {
  const timestamp = { seconds: 100, nanoseconds: 123, toMillis: () => 100000 };
  const result = inspectCreator({ id: 'profile-1', updatedAt: timestamp }, 'profile-1');
  assert.equal(result.timestamps.length, 0);
  assert.equal(result.issues.length, 0);
});

test('replacement preserves unrelated fields, array order and original object', () => {
  const original = { ...base(), posts: [{ image: dataUrl, text: 'Keep this', unlocked: false }], plans: [{ price: 2750 }], extra: { preserved: true } };
  const before = JSON.stringify(original);
  const replacements = new Map([[JSON.stringify(['posts', 0, 'image']), 'https://example.test/media.jpg']]);
  const result = replaceValues(original, replacements);
  assert.equal(result.posts[0].image, 'https://example.test/media.jpg');
  assert.equal(result.posts[0].text, 'Keep this');
  assert.equal(result.posts[0].unlocked, false);
  assert.deepEqual(result.plans, original.plans);
  assert.deepEqual(result.extra, original.extra);
  assert.equal(result.avatar, dataUrl);
  assert.equal(JSON.stringify(original), before);
});

test('backup preserves SDK values and cannot confuse user maps with type markers', () => {
  class Timestamp { constructor() { this.seconds = 10; this.nanoseconds = 123; } }
  class GeoPoint { constructor() { this.latitude = 1.5; this.longitude = -2.5; } }
  class DocumentReference { constructor() { this.path = 'creators/profile-1'; } }
  const sdk = { Timestamp, GeoPoint, DocumentReference };
  const source = { timestamp: new Timestamp(), point: new GeoPoint(), reference: new DocumentReference(),
    bytes: Buffer.from([1, 2, 3]), custom: { type: 'timestamp', seconds: 999 }, values: [null, true, Infinity, NaN] };
  const encoded = encodeBackup(source, sdk);
  assert.equal(encoded.type, 'map');
  const fields = Object.fromEntries(encoded.value);
  assert.deepEqual(fields.timestamp, { type: 'timestamp', seconds: 10, nanoseconds: 123 });
  assert.deepEqual(fields.reference, { type: 'reference', path: 'creators/profile-1' });
  assert.equal(fields.custom.type, 'map');
  assert.deepEqual(fields.bytes, { type: 'bytes', value: 'AQID' });
  assert.equal(fields.point.latitude, 1.5);
  assert.equal(fields.values.value[2].value, 'Infinity');
  assert.equal(fields.values.value[3].value, 'NaN');
  assert.throws(() => encodeBackup(new Date(), sdk));
});
