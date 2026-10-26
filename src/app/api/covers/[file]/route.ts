import { CONTENT_TYPES, readCover } from "@/lib/cover-uploads";

// File names are random 128-bit tokens, only ever shown in the uploader's own views.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const bytes = await readCover(file);
  if (!bytes) return new Response("Not found", { status: 404 });

  const ext = file.split(".").pop()!;
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext],
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
