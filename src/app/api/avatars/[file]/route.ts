import { imageResponse } from "@/lib/image-uploads";

// Avatars are public (they appear on profiles, feeds and messages). A new upload gets a new
// random file name, so long-lived caching is safe.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  return imageResponse("avatars", file, "public, max-age=31536000, immutable");
}
