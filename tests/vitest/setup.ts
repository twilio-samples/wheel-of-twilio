import { Buffer } from "buffer";

// jsdom doesn't expose Buffer globally; polyfill for twilio JWT deps (jwa, buffer-equal-constant-time)
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}
