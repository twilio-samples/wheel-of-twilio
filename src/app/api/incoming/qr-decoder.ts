import axios from "axios";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Jimp } = require("jimp") as { Jimp: any };
import { createRequire } from "module";

const require2 = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsQR = require2("jsqr") as typeof import("jsqr").default;

function decode(image: { bitmap: { data: Buffer; width: number; height: number } }): string | null {
  const { data, width, height } = image.bitmap;
  const code = jsQR(new Uint8ClampedArray(data), width, height);
  return code?.data ?? null;
}

export async function decodeQrFromUrl(
  imageUrl: string,
  accountSid: string,
  authToken: string,
): Promise<string | null> {
  let rawBuffer: Buffer;
  try {
    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: "arraybuffer",
      auth: { username: accountSid, password: authToken },
    });
    rawBuffer = Buffer.from(response.data);
  } catch {
    return null;
  }

  let base: any;
  try {
    base = await Jimp.fromBuffer(rawBuffer);
  } catch {
    return null;
  }

  // Pass 1: original
  try { const r = decode(base.clone()); if (r) return r; } catch { /* */ }

  // Pass 2: normalize contrast
  try { const r = decode(base.clone().normalize()); if (r) return r; } catch { /* */ }

  // Pass 3: greyscale + normalize
  try { const r = decode(base.clone().greyscale().normalize()); if (r) return r; } catch { /* */ }

  const width: number = base.bitmap.width;

  // Pass 4: resize to 1200px + normalize
  if (width > 1200) {
    try { const r = decode(base.clone().resize({ w: 1200 }).normalize()); if (r) return r; } catch { /* */ }
  }

  // Pass 5: resize to 800px + greyscale + normalize
  if (width > 800) {
    try { const r = decode(base.clone().resize({ w: 800 }).greyscale().normalize()); if (r) return r; } catch { /* */ }
  }

  return null;
}
