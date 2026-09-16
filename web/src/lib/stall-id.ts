import { createHash } from "node:crypto";
import type { StallKind } from "@/lib/packs";

/** RFC 4122 URL namespace as used by Python/libuuid (`uuid.NAMESPACE_URL`). */
export const STALL_ID_URL_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "");
  return Buffer.from(hex, "hex");
}

function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function uuidv5(
  name: string,
  namespace: string = STALL_ID_URL_NAMESPACE,
): string {
  const hash = createHash("sha1");
  hash.update(uuidToBytes(namespace));
  hash.update(name, "utf8");
  const bytes = Buffer.from(hash.digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

/** Stable stall id for catalog/seed agents and teams (not seller listings). */
export function catalogStallId(kind: StallKind, slug: string): string {
  const path = kind === "team" ? "teams" : "agents";
  return uuidv5(`https://mybot.farm/${path}/${slug}`);
}
