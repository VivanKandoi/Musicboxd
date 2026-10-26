import { imageResponse } from "@/lib/image-uploads";

// File names are random 128-bit tokens, only ever shown in the uploader's own views.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  return imageResponse("covers", file, "private, max-age=31536000, immutable");
}
