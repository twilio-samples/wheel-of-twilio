import axios from "axios";
import sharp from "sharp";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsQR = require("jsqr") as typeof import("jsqr").default;

async function tryDecode(imageBuffer: Buffer): Promise<string | null> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const code = jsQR(new Uint8ClampedArray(data.buffer), info.width, info.height);
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

  const meta = await sharp(rawBuffer).metadata();

  // Pass 1: original image
  try {
    const result = await tryDecode(rawBuffer);
    if (result) return result;
  } catch { /* continue */ }

  // Pass 2: normalize contrast
  try {
    const result = await tryDecode(await sharp(rawBuffer).normalize().toBuffer());
    if (result) return result;
  } catch { /* continue */ }

  // Pass 3: greyscale + sharpen + normalize — best for small QR in large photo
  try {
    const result = await tryDecode(
      await sharp(rawBuffer).greyscale().sharpen().normalize().toBuffer(),
    );
    if (result) return result;
  } catch { /* continue */ }

  // Pass 4: resize to 1200px wide
  if (meta.width && meta.width > 1200) {
    try {
      const result = await tryDecode(
        await sharp(rawBuffer).resize(1200).normalize().toBuffer(),
      );
      if (result) return result;
    } catch { /* continue */ }
  }

  // Pass 5: resize to 800px wide
  if (meta.width && meta.width > 800) {
    try {
      const result = await tryDecode(
        await sharp(rawBuffer).resize(800).greyscale().normalize().toBuffer(),
      );
      if (result) return result;
    } catch { /* continue */ }
  }

  return null;
}
