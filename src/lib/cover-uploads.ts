import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Stored outside public/: Next.js only serves public/ files that existed at build time,
// so uploads are written here and served by /api/covers/[file].
export const COVER_DIR = path.join(process.cwd(), "uploads", "covers");
export const MAX_COVER_BYTES = 3 * 1024 * 1024;

const FILE_NAME = /^[a-f0-9]{32}\.(png|jpg|webp)$/;
export const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

// Trust the bytes, not the browser-supplied MIME type.
export function sniffImage(bytes: Buffer): "png" | "jpg" | "webp" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes.subarray(1, 4).toString("ascii") === "PNG") return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }
  return null;
}

export async function saveCover(bytes: Buffer, ext: string) {
  await mkdir(COVER_DIR, { recursive: true });
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await writeFile(path.join(COVER_DIR, name), bytes);
  return `/api/covers/${name}`;
}

export function coverFileName(url: string) {
  const name = url.startsWith("/api/covers/") ? url.slice("/api/covers/".length) : null;
  return name && FILE_NAME.test(name) ? name : null;
}

export async function deleteCover(url: string) {
  const name = coverFileName(url);
  if (name) await unlink(path.join(COVER_DIR, name)).catch(() => {});
}

export async function readCover(name: string) {
  if (!FILE_NAME.test(name)) return null;
  try {
    return await readFile(path.join(COVER_DIR, name));
  } catch {
    return null;
  }
}
