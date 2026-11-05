/**
 * Browser-side image helpers shared by tree photos and civic reports.
 * - readExif: GPS / capture time are read BEFORE re-encoding (moderation signals, never published).
 * - resizeImage: re-encodes to JPEG; canvas re-encoding drops all EXIF metadata from the uploaded copy.
 * - dHash: 64-bit difference hash ("perceptual fingerprint") to spot the same photo re-uploaded, even resized.
 */
export type Exif = { lat: number | null; lng: number | null; takenAt: string | null };

export async function readExif(file: File): Promise<Exif> {
  try {
    const exifr = (await import("exifr")).default;
    const d = await exifr.parse(file, { gps: true, pick: ["DateTimeOriginal", "latitude", "longitude"] });
    const dt = d?.DateTimeOriginal instanceof Date ? d.DateTimeOriginal.toISOString() : null;
    return { lat: typeof d?.latitude === "number" ? d.latitude : null, lng: typeof d?.longitude === "number" ? d.longitude : null, takenAt: dt };
  } catch { return { lat: null, lng: null, takenAt: null }; }
}

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  try { await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; }); } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
  return img;
}

export async function resizeImage(file: Blob, max = 1280, quality = 0.8): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", quality));
}

/** 9×8 grayscale difference hash → signed 64-bit integer as a decimal string (fits Postgres bigint). */
export async function dHash(file: Blob): Promise<string> {
  const img = await loadImage(file);
  const c = document.createElement("canvas"); c.width = 9; c.height = 8;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, 9, 8);
  const d = ctx.getImageData(0, 0, 9, 8).data;
  const gray = (x: number, y: number) => { const i = (y * 9 + x) * 4; return d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; };
  let h = BigInt(0);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << BigInt(1)) | (gray(x, y) > gray(x + 1, y) ? BigInt(1) : BigInt(0));
  return BigInt.asIntN(64, h).toString();
}

export async function blobToDataUrl(b: Blob): Promise<string> {
  return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b); });
}
