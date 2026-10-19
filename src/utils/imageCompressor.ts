const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.82;

/** Constrain a photograph without stretching it or enlarging small originals. */
export function fitImageDimensions(width: number, height: number, maxDimension = DEFAULT_MAX_DIMENSION) {
  if (![width, height, maxDimension].every((value) => Number.isFinite(value) && value >= 1)) {
    throw new Error('As dimensões da imagem são inválidas.');
  }
  const scale = Math.min(1, Math.floor(maxDimension) / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** APNG uses the PNG MIME type. Its animation must not become a single frame. */
async function isAnimatedPng(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value)) return false;
  const view = new DataView(bytes.buffer);
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = view.getUint32(offset);
    if (length > bytes.length - offset - 12) return false;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type === 'acTL') return true;
    // The animation control chunk must precede the first image-data chunk.
    if (type === 'IDAT' || type === 'IEND') return false;
    offset += length + 12;
  }
  return false;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(resolve, type, quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Optimise still JPEG/PNG uploads before sending any bytes to Storage.
 * GIF, WebP, AVIF and APNG are preserved because they may contain animation.
 * PNG falls back to PNG when WebP encoding is unavailable, preserving alpha.
 */
export async function optimizeImageFile(
  file: File, maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_QUALITY,
): Promise<File> {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') return file;
  if (file.type === 'image/png' && await isAnimatedPng(file)) return file;
  if (!Number.isFinite(quality) || quality <= 0 || quality > 1) {
    throw new Error('A qualidade da imagem deve estar entre 0 e 1.');
  }

  const sourceUrl = URL.createObjectURL(file);
  const image = new Image();
  let canvas: HTMLCanvasElement | undefined;
  try {
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não foi possível abrir esta imagem. Envia um JPG ou PNG válido.'));
      image.src = sourceUrl;
    });
    const dimensions = fitImageDimensions(image.naturalWidth, image.naturalHeight, maxDimension);
    canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador não conseguiu preparar a imagem. Tenta novamente noutro navegador.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

    let encoded = await canvasBlob(canvas, 'image/webp', quality);
    // Unsupported canvas formats can silently produce PNG instead.
    if (!encoded || encoded.type !== 'image/webp') {
      encoded = await canvasBlob(canvas, file.type, quality);
    }
    if (!encoded || encoded.size === 0 || !['image/webp', 'image/jpeg', 'image/png'].includes(encoded.type)) {
      throw new Error('Não foi possível otimizar a imagem. Tenta enviá-la novamente em JPG ou PNG.');
    }
    if (encoded.size >= file.size) return file;
    const extension = encoded.type === 'image/jpeg' ? 'jpg' : encoded.type.split('/')[1];
    const name = `${file.name.replace(/\.[^.]*$/, '') || 'imagem'}.${extension}`;
    return new File([encoded], name, { type: encoded.type, lastModified: file.lastModified });
  } finally {
    image.onload = null;
    image.onerror = null;
    image.src = '';
    URL.revokeObjectURL(sourceUrl);
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

/** Legacy local-preview API; published content must use uploadAdminMedia URLs. */
export async function compressImageFile(file: File, maxDimension = 850, quality = 0.78): Promise<string> {
  const optimized = await optimizeImageFile(file, maxDimension, quality);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(optimized);
  });
}

