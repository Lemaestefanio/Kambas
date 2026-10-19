import { createHash } from 'node:crypto';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const formats = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
  ['image/gif', 'gif'], ['image/avif', 'avif'], ['video/mp4', 'mp4'],
  ['video/webm', 'webm'], ['video/quicktime', 'mov'], ['audio/mpeg', 'mp3'],
  ['audio/mp4', 'm4a'], ['audio/wav', 'wav'], ['audio/x-wav', 'wav'],
  ['audio/ogg', 'ogg'], ['audio/webm', 'webm'],
]);
const mediaPaths = [
  /^(avatar|banner|previewVideo|bannerVideo)$/,
  /^posts\.\d+\.(image|video)$/,
  /^highlights\.\d+\.(coverImage|mediaUrl)$/,
  /^galleryPhotos\.\d+\.url$/,
  /^voiceNotes\.\d+\.url$/,
];
const plainObject = (value) => value !== null && typeof value === 'object'
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

export function parseDataMedia(value) {
  const match = /^data:([^;,]+);base64,([\s\S]*)$/i.exec(value.trim());
  if (!match) throw new Error('Data URL fora do formato MIME;base64.');
  const mime = match[1].toLowerCase();
  const extension = formats.get(mime);
  if (!extension) throw new Error('Tipo de media não suportado.');
  const encoded = match[2].replace(/[\r\n\t ]/g, '');
  if (!encoded || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error('Base64 inválido; o valor original será preservado.');
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.toString('base64') !== encoded) throw new Error('Base64 não canónico.');
  const maximum = (mime.startsWith('image/') ? 20 : 100) * 1024 * 1024;
  if (!bytes.length || bytes.length > maximum) throw new Error('Tamanho de media inválido.');
  // Conservatively check the container signature; never re-encode original media.
  const ascii = (from, to) => bytes.subarray(from, to).toString('ascii');
  const hex = (count) => bytes.subarray(0, count).toString('hex');
  const isIsoMedia = ascii(4, 8) === 'ftyp';
  const valid = mime === 'image/jpeg' ? hex(3) === 'ffd8ff'
    : mime === 'image/png' ? hex(8) === '89504e470d0a1a0a'
    : mime === 'image/gif' ? /^GIF8[79]a$/.test(ascii(0, 6))
    : mime === 'image/webp' ? ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    : mime === 'image/avif' ? isIsoMedia && /avif|avis/.test(ascii(8, 64))
    : /^(video\/(mp4|quicktime)|audio\/mp4)$/.test(mime) ? isIsoMedia
    : /^(video|audio)\/webm$/.test(mime) ? hex(4) === '1a45dfa3'
    : /audio\/(x-)?wav/.test(mime) ? ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE'
    : mime === 'audio/ogg' ? ascii(0, 4) === 'OggS'
    : mime === 'audio/mpeg' ? ascii(0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
    : false;
  if (!valid) throw new Error('A assinatura do ficheiro não corresponde ao MIME; revisão manual necessária.');
  return { bytes, mime, extension, hash: sha256(bytes) };
}

export function inspectCreator(data, documentId) {
  const media = [], timestamps = [], issues = [];
  const issue = (path, reason) => issues.push({ path, reason });
  if (data.id !== documentId) issue(['id'], 'O id guardado não corresponde ao documento.');
  function walk(value, path) {
    if (typeof value === 'string') {
      if (/^(idb|blob):/i.test(value.trim())) {
        issue(path, 'Referência local: recuperar o ficheiro no dispositivo original.');
      } else if (/^data:/i.test(value.trim())) {
        if (!mediaPaths.some((rule) => rule.test(path.join('.')))) {
          issue(path, 'Data URL num campo não reconhecido como media; revisão manual necessária.');
        } else {
          try { media.push({ path, ...parseDataMedia(value) }); }
          catch (error) { issue(path, error.message); }
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, index]));
    } else if (plainObject(value)) {
      Object.entries(value).forEach(([key, item]) => walk(item, [...path, key]));
    }
  }
  walk(data, []);
  for (const field of ['createdAt', 'updatedAt']) {
    const value = data[field];
    if (value === undefined && field === 'createdAt') continue;
    if (value && typeof value.toMillis === 'function' && Number.isInteger(value.seconds)) continue;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
      issue([field], 'Data ausente ou fora do formato ISO UTC esperado.');
      continue;
    }
    const milliseconds = Date.parse(value);
    const canonical = value.replace(/Z$/, '.000Z').replace(/(\.\d{1,3})\.000Z$/, (_, fraction) => `${fraction.padEnd(4, '0')}Z`);
    if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== canonical) {
      issue([field], 'Data ISO inválida; não será substituída por uma data inventada.');
      continue;
    }
    timestamps.push({ path: [field], milliseconds });
  }
  return { media, timestamps, issues };
}

export function replaceValues(value, replacements, path = []) {
  const key = JSON.stringify(path);
  if (replacements.has(key)) return replacements.get(key);
  if (Array.isArray(value)) return value.map((item, index) => replaceValues(item, replacements, [...path, index]));
  if (plainObject(value)) return Object.fromEntries(Object.entries(value)
    .map(([name, item]) => [name, replaceValues(item, replacements, [...path, name])]));
  return value;
}

// Every node is tagged, including maps: existing user keys cannot collide with type markers.
export function encodeBackup(value, sdk) {
  if (value === null) return { type: 'null' };
  if (typeof value === 'string' || typeof value === 'boolean') return { type: typeof value, value };
  if (typeof value === 'number') return { type: 'number', value: Number.isFinite(value) ? value : String(value) };
  if (value instanceof sdk.Timestamp) return { type: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (value instanceof sdk.GeoPoint) return { type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  if (value instanceof sdk.DocumentReference) return { type: 'reference', path: value.path };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { type: 'bytes', value: Buffer.from(value).toString('base64') };
  if (Array.isArray(value)) return { type: 'array', value: value.map((item) => encodeBackup(item, sdk)) };
  if (plainObject(value)) return { type: 'map', value: Object.keys(value).sort().map((key) => [key, encodeBackup(value[key], sdk)]) };
  throw new Error('Tipo desconhecido no backup; operação interrompida antes de escrever no Firebase.');
}
