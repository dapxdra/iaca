/**
 * Compresión de fotos en el dispositivo, antes de guardarlas en la cola y
 * subirlas. Una foto de celular pesa 3–12 MB; a 1920 px y JPEG 0.8 queda en
 * ~300–600 KB y sigue siendo legible para documentar el trabajo de campo.
 * Con datos móviles es la diferencia entre que la subida termine o no.
 *
 * Se conservan los metadatos EXIF del original (fecha, GPS, cámara): pueden
 * servir como respaldo de dónde y cuándo se tomó la foto, y re-codificar con
 * canvas los borra. Se copia el bloque EXIF tal cual, salvo la orientación,
 * que pasa a 1 porque la rotación ya quedó aplicada en los píxeles.
 *
 * Si algo falla (formato que el navegador no decodifica, como HEIC fuera de
 * Safari; memoria), se devuelve el original: comprimir es una mejora, no un
 * requisito.
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;
/** Por debajo de esto no vale la pena re-codificar (y se perdería calidad). */
const SKIP_BELOW_BYTES = 500 * 1024;

const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
const ORIENTATION_TAG = 0x0112;

/**
 * Segmento APP1/EXIF completo (marcador incluido) de un JPEG, o `null`. Solo
 * se leen los primeros 128 KB: el EXIF va al principio y mide como mucho 64 KB.
 */
export async function readExifSegment(file: Blob): Promise<Uint8Array | null> {
  const bytes = new Uint8Array(await file.slice(0, 128 * 1024).arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const end = offset + 2 + length;
    if (marker === 0xda || end > bytes.length) return null; // empieza la imagen: no hay EXIF
    if (marker === 0xe1 && EXIF_HEADER.every((b, i) => bytes[offset + 4 + i] === b)) {
      return bytes.slice(offset, end);
    }
    offset = end;
  }
  return null;
}

/** Pone la orientación del IFD0 en 1 ("normal"), en el lugar. */
export function resetOrientation(segment: Uint8Array): void {
  const tiff = 10; // FFE1 + longitud (4 bytes) + "Exif\0\0" (6)
  const view = new DataView(segment.buffer, segment.byteOffset, segment.byteLength);
  if (tiff + 8 > segment.length) return;
  const little = view.getUint16(tiff) === 0x4949; // "II" = little endian, "MM" = big
  const ifd0 = tiff + view.getUint32(tiff + 4, little);
  if (ifd0 + 2 > segment.length) return;

  const count = view.getUint16(ifd0, little);
  for (let i = 0; i < count; i++) {
    const entry = ifd0 + 2 + i * 12;
    if (entry + 12 > segment.length) return;
    if (view.getUint16(entry, little) === ORIENTATION_TAG) {
      view.setUint16(entry + 8, 1, little);
      return;
    }
  }
}

/** Inserta un segmento EXIF justo después del inicio (SOI) de un JPEG. */
export function insertExif(jpeg: Uint8Array, segment: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(jpeg.length + segment.length);
  out.set(jpeg.subarray(0, 2), 0);
  out.set(segment, 2);
  out.set(jpeg.subarray(2), 2 + segment.length);
  return out;
}

async function encodeJpeg(bitmap: ImageBitmap, width: number, height: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", JPEG_QUALITY)
  );
}

async function compress(file: File): Promise<File> {
  if (file.size < SKIP_BELOW_BYTES || !file.type.startsWith("image/")) return file;

  try {
    // `from-image` aplica la orientación EXIF al decodificar (fotos verticales
    // del celular), por eso después la etiqueta se resetea a 1.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    let encoded: Blob;
    try {
      encoded = await encodeJpeg(bitmap, width, height);
    } finally {
      bitmap.close(); // un bitmap de 48 MP ocupa ~190 MB: liberarlo ya
    }

    let bytes = new Uint8Array(await encoded.arrayBuffer());
    const exif = file.type === "image/jpeg" ? await readExifSegment(file) : null;
    if (exif) {
      resetOrientation(exif);
      bytes = insertExif(bytes, exif);
    }
    if (bytes.length >= file.size) return file;

    const name = file.name.replace(/\.[^.]*$/, "") + ".jpg";
    return new File([bytes], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}

// El mismo original devuelve siempre el mismo `File` comprimido: los ids de
// adjunto se asignan por objeto `File` (ver `idFor` en bitacora-sync.ts), y un
// objeto nuevo en cada reintento del formulario subiría la foto dos veces.
const compressed = new WeakMap<File, Promise<File>>();

export function compressPhoto(file: File): Promise<File> {
  let result = compressed.get(file);
  if (!result) {
    result = compress(file);
    compressed.set(file, result);
  }
  return result;
}
