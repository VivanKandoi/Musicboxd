import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// User uploads are stored outside public/: Next.js only serves public/ files that existed
// at build time, so they're written here and served by /api/covers and /api/avatars.
export type UploadKind = "covers" | "avatars";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
// Avatars uploaded before this change live in public/uploads/avatars and are still served.
const LEGACY_AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const RANDOM_NAME = /^[a-f0-9]{32}\.(png|jpg|webp|gif)$/;
const LEGACY_AVATAR_NAME = /^[a-z0-9]+-\d+\.(png|jpg|webp|gif)$/;

export const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

// Trust the bytes, not the browser-supplied MIME type.
export function sniffImage(bytes: Buffer): "png" | "jpg" | "webp" | "gif" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes.subarray(1, 4).toString("ascii") === "PNG") return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }
  const head = bytes.subarray(0, 6).toString("ascii");
  if (head === "GIF87a" || head === "GIF89a") return "gif";
  return null;
}

export async function saveImage(kind: UploadKind, bytes: Buffer, ext: string) {
  const dir = path.join(UPLOAD_ROOT, kind);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), bytes);
  return `/api/${kind}/${name}`;
}

function fileNameFromUrl(kind: UploadKind, url: string) {
  const prefix = `/api/${kind}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

export async function deleteImage(kind: UploadKind, url: string | null | undefined) {
  const name = url ? fileNameFromUrl(kind, url) : null;
  if (!name) return;
  if (RANDOM_NAME.test(name)) {
    await unlink(path.join(UPLOAD_ROOT, kind, name)).catch(() => {});
  } else if (kind === "avatars" && LEGACY_AVATAR_NAME.test(name)) {
    await unlink(path.join(LEGACY_AVATAR_DIR, name)).catch(() => {});
  }
}

export async function readImage(kind: UploadKind, name: string) {
  const file = RANDOM_NAME.test(name)
    ? path.join(UPLOAD_ROOT, kind, name)
    : kind === "avatars" && LEGACY_AVATAR_NAME.test(name)
      ? path.join(LEGACY_AVATAR_DIR, name)
      : null;
  if (!file) return null;
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}

export async function imageResponse(kind: UploadKind, name: string, cacheControl: string) {
  const bytes = await readImage(kind, name);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPES[name.split(".").pop()!],
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
