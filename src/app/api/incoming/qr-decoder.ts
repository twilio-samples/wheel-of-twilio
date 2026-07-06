import axios from "axios";
import { createRequire } from "module";

const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Jimp } = _require("jimp") as { Jimp: any };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsQR = _require("jsqr") as typeof import("jsqr").default;

function decode(image: { bitmap: { data: Buffer; width: number; height: number } }): string | null {
  const { data, width, height } = image.bitmap;
  const code = jsQR(new Uint8ClampedArray(data), width, height);
  return code?.data ?? null;
}

function extractTicketId(raw: string): string {
  // Badge QR may encode a URL with ticket ID in a query param: ...?id=ti_xxx
  if (raw.includes("=")) {
    const qs = raw.includes("?") ? raw.split("?")[1] : raw;
    return new URLSearchParams(qs).get("id") ?? raw;
  }
  return raw;
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

  const width: number = base.bitmap.width;
  const attempts: Array<() => any> = [
    () => base.clone(),
    () => base.clone().normalize(),
    () => base.clone().greyscale().normalize(),
    ...(width > 1200 ? [() => base.clone().resize({ w: 1200 }).normalize()] : []),
    ...(width > 800 ? [() => base.clone().resize({ w: 800 }).greyscale().normalize()] : []),
    ...(width > 400 ? [() => base.clone().resize({ w: 400 }).greyscale().normalize()] : []),
    ...(width > 300 ? [() => base.clone().resize({ w: 300 }).greyscale().normalize()] : []),
  ];

  for (const prepare of attempts) {
    try {
      const raw = decode(prepare());
      if (raw) return extractTicketId(raw);
    } catch { /* try next */ }
  }

  return null;
}
