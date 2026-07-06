import { Buffer } from "buffer";

export function setup() {
  // jsdom doesn't set Buffer globally; jwa (used by twilio JWT) reads Buffer.prototype at module eval time
  if (typeof globalThis.Buffer === "undefined") {
    globalThis.Buffer = Buffer;
  }
}
