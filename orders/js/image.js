export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 6000;

export function detectImageMime(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  return "";
}

export function validateImageFileBytes(bytes, declaredMime = "") {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (!b.length) return { ok: false, error: "Файл порожній." };
  if (b.length > MAX_IMAGE_BYTES) return { ok: false, error: "Файл перевищує 2 МБ." };
  const detectedMime = detectImageMime(b);
  if (!detectedMime) return { ok: false, error: "Дозволені лише справжні PNG або JPEG." };
  if (declaredMime && declaredMime !== detectedMime) return { ok: false, error: "Тип файлу не відповідає його вмісту." };
  return { ok: true, mime: detectedMime };
}

export async function decodeImageDimensions(bytes, mime) {
  const blob = new Blob([bytes], { type: mime });
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(blob);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    validateDimensions(result.width, result.height);
    return result;
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        validateDimensions(img.naturalWidth, img.naturalHeight);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Не вдалося декодувати зображення.")); };
    img.src = url;
  });
}

function validateDimensions(width, height) {
  if (!width || !height) throw new Error("Зображення має некоректні розміри.");
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) throw new Error(`Розмір зображення завеликий. Максимум ${MAX_IMAGE_DIMENSION} px по стороні.`);
}
